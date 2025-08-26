-- Implementation of User Roles for DealDesk
-- This adds role-based access control with different pricing visibility

-- 1. Create user_profiles table to store user roles and preferences
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'viewer')),
    markup_percentage DECIMAL(5,2) DEFAULT 50.0, -- Default 50% markup for sales (1.5x)
    can_see_costs BOOLEAN DEFAULT FALSE,
    can_edit_pricing BOOLEAN DEFAULT FALSE,
    can_export_data BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);

-- 2. Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for user_profiles
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can insert/update/delete profiles
CREATE POLICY "Admins can manage profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    user_role TEXT;
    can_see_costs_flag BOOLEAN;
    can_edit_flag BOOLEAN;
BEGIN
    -- Determine role based on email or default rules
    -- Currently: all existing users are admin, new users default to sales
    IF NEW.email IN (
        'israel@monogoto.io',
        'maor@monogoto.io',
        'asaf@monogoto.io',
        'itamar@monogoto.io'
    ) THEN
        user_role := 'admin';
        can_see_costs_flag := TRUE;
        can_edit_flag := TRUE;
    ELSE
        user_role := 'sales';
        can_see_costs_flag := FALSE;
        can_edit_flag := FALSE;
    END IF;

    INSERT INTO public.user_profiles (
        user_id,
        email,
        role,
        can_see_costs,
        can_edit_pricing
    ) VALUES (
        NEW.id,
        NEW.email,
        user_role,
        can_see_costs_flag,
        can_edit_flag
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Create function to get pricing with role-based markup
CREATE OR REPLACE FUNCTION public.get_role_based_pricing(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    id UUID,
    network_id UUID,
    source_id UUID,
    tadig TEXT,
    network_name TEXT,
    country TEXT,
    imsi_price_cents INTEGER,
    data_price_cents_per_mb INTEGER,
    sms_price_cents INTEGER,
    is_actual_cost BOOLEAN,
    markup_applied DECIMAL(5,2)
) AS $$
DECLARE
    user_role TEXT;
    markup DECIMAL(5,2);
    can_see_costs BOOLEAN;
BEGIN
    -- Get user's role and permissions
    SELECT 
        up.role, 
        up.markup_percentage,
        up.can_see_costs
    INTO user_role, markup, can_see_costs
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid;

    -- If user not found or is admin, return actual costs
    IF user_role IS NULL OR user_role = 'admin' OR can_see_costs = TRUE THEN
        RETURN QUERY
        SELECT 
            np.id,
            np.network_id,
            np.source_id,
            n.tadig,
            n.network_name,
            n.country,
            np.imsi_price_cents,
            np.data_price_cents_per_mb,
            np.sms_price_cents,
            TRUE as is_actual_cost,
            0.0 as markup_applied
        FROM network_pricing np
        JOIN networks n ON np.network_id = n.id;
    ELSE
        -- For sales role, apply markup
        RETURN QUERY
        SELECT 
            np.id,
            np.network_id,
            np.source_id,
            n.tadig,
            n.network_name,
            n.country,
            ROUND(np.imsi_price_cents * (1 + markup/100))::INTEGER as imsi_price_cents,
            ROUND(np.data_price_cents_per_mb * (1 + markup/100))::INTEGER as data_price_cents_per_mb,
            ROUND(np.sms_price_cents * (1 + markup/100))::INTEGER as sms_price_cents,
            FALSE as is_actual_cost,
            markup as markup_applied
        FROM network_pricing np
        JOIN networks n ON np.network_id = n.id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get user's role and permissions
CREATE OR REPLACE FUNCTION public.get_user_role_info(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    role TEXT,
    can_see_costs BOOLEAN,
    can_edit_pricing BOOLEAN,
    can_export_data BOOLEAN,
    markup_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.role,
        up.can_see_costs,
        up.can_edit_pricing,
        up.can_export_data,
        up.markup_percentage
    FROM public.user_profiles up
    WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_role_based_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_info TO authenticated;

-- 9. Migrate existing users to have profiles
INSERT INTO public.user_profiles (user_id, email, role, can_see_costs, can_edit_pricing)
SELECT 
    id,
    email,
    CASE 
        WHEN email IN ('israel@monogoto.io', 'maor@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
        THEN 'admin'
        ELSE 'sales'
    END as role,
    CASE 
        WHEN email IN ('israel@monogoto.io', 'maor@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
        THEN TRUE
        ELSE FALSE
    END as can_see_costs,
    CASE 
        WHEN email IN ('israel@monogoto.io', 'maor@monogoto.io', 'asaf@monogoto.io', 'itamar@monogoto.io') 
        THEN TRUE
        ELSE FALSE
    END as can_edit_pricing
FROM auth.users
WHERE email LIKE '%@monogoto.io'
ON CONFLICT (user_id) DO NOTHING;

-- 10. Create view for easy access to pricing with user context
CREATE OR REPLACE VIEW public.v_user_pricing AS
SELECT * FROM public.get_role_based_pricing(auth.uid());

-- Grant access to the view
GRANT SELECT ON public.v_user_pricing TO authenticated;

-- 11. Function to add a sales user
CREATE OR REPLACE FUNCTION public.add_sales_user(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    -- This function can be called after a user signs up to set them as sales
    UPDATE public.user_profiles
    SET 
        role = 'sales',
        can_see_costs = FALSE,
        can_edit_pricing = FALSE,
        markup_percentage = 50.0  -- 50% markup = 1.5x multiplier
    WHERE email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to admins only (through RLS)
GRANT EXECUTE ON FUNCTION public.add_sales_user TO authenticated;

-- 12. Verify the setup
SELECT 
    up.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    up.markup_percentage
FROM public.user_profiles up
ORDER BY up.role, up.email;