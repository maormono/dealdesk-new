-- Example: How to add a new Sales user to DealDesk
-- Run this after the implement-user-roles.sql script

-- Step 1: First, the user needs to sign up through the app
-- They will receive a magic link to confirm their email

-- Step 2: After they've signed up, run this to set them as a Sales user
-- Replace 'sales@monogoto.io' with the actual email address

-- Option A: Update existing user to Sales role
UPDATE public.user_profiles
SET 
    role = 'sales',
    can_see_costs = FALSE,
    can_edit_pricing = FALSE,
    markup_percentage = 50.0  -- 50% markup means prices are multiplied by 1.5
WHERE email = 'sales@monogoto.io';

-- Option B: Or use the helper function
SELECT public.add_sales_user('sales@monogoto.io');

-- Step 3: Verify the user's role and permissions
SELECT 
    up.email,
    up.role,
    up.can_see_costs,
    up.can_edit_pricing,
    up.markup_percentage,
    CASE 
        WHEN up.markup_percentage > 0 THEN 
            'Prices shown at ' || (1 + up.markup_percentage/100) || 'x cost'
        ELSE 'Shows actual costs'
    END as pricing_display
FROM public.user_profiles up
WHERE up.email = 'sales@monogoto.io';

-- Step 4: Test what pricing they would see
-- This shows the difference between admin and sales pricing views
WITH admin_view AS (
    SELECT 
        tadig,
        network_name,
        imsi_price_cents as admin_cost,
        data_price_cents_per_mb as admin_data_cost
    FROM public.get_role_based_pricing(
        (SELECT user_id FROM public.user_profiles WHERE email = 'israel@monogoto.io')
    )
    LIMIT 5
),
sales_view AS (
    SELECT 
        tadig,
        network_name,
        imsi_price_cents as sales_price,
        data_price_cents_per_mb as sales_data_price
    FROM public.get_role_based_pricing(
        (SELECT user_id FROM public.user_profiles WHERE email = 'sales@monogoto.io')
    )
    LIMIT 5
)
SELECT 
    av.tadig,
    av.network_name,
    av.admin_cost as "Admin Sees (Cost)",
    sv.sales_price as "Sales Sees (Price)",
    ROUND((sv.sales_price::DECIMAL / av.admin_cost) * 100 - 100, 1) || '%' as "Markup"
FROM admin_view av
JOIN sales_view sv ON av.tadig = sv.tadig
WHERE av.admin_cost > 0;