# User Roles Implementation for DealDesk

## Overview
Implemented a role-based access control system that shows different pricing to Admin vs Sales users. Sales users see customer pricing (with markup) while Admins see actual costs.

## Architecture Decision
**Chosen Approach: Database-Level Role Management with Frontend Display Logic**

### Why This Architecture?
1. **Single source of truth** - Actual costs remain in database, markup is calculated dynamically
2. **Security** - Sales users never receive actual costs in API responses  
3. **Flexibility** - Easy to adjust markup percentage or add new roles
4. **Auditability** - All users and their roles are tracked in database

## Implementation Components

### 1. Database Schema (`implement-user-roles.sql`)
- **user_profiles table**: Stores user roles and permissions
  - `role`: admin, sales, or viewer
  - `markup_percentage`: Default 50% (1.5x multiplier) for sales
  - `can_see_costs`: Boolean flag for cost visibility
  - `can_edit_pricing`: Boolean flag for editing permissions
  
- **RLS Policies**: Row-level security ensures users can only see appropriate data
- **Database Functions**:
  - `get_role_based_pricing()`: Returns pricing with automatic markup for sales users
  - `get_user_role_info()`: Returns user's role and permissions
  - `handle_new_user()`: Automatically creates profile on signup

### 2. Frontend Components

#### UserContext (`frontend/src/contexts/UserContext.tsx`)
- Manages user role state
- Provides helper functions:
  - `getPriceLabel()`: Returns "Cost" for admins, "Customer Price" for sales
  - `formatPrice()`: Applies markup for sales users
  - `isAdmin`, `isSales`: Boolean flags for role checking

#### UI Updates
- **App.tsx**: Shows role badge next to user email
- **PricingTable.tsx**: 
  - Uses role-based pricing from database
  - Shows lock icon for sales users indicating customer pricing
  - Displays pricing notice for sales users

## How to Add a Sales User

1. **User signs up through the app** (they'll receive a magic link)

2. **Run the SQL to set their role** (`add-sales-user-example.sql`):
```sql
-- Set user as Sales role
UPDATE public.user_profiles
SET 
    role = 'sales',
    can_see_costs = FALSE,
    can_edit_pricing = FALSE,
    markup_percentage = 50.0  -- 50% markup = 1.5x multiplier
WHERE email = 'newsales@monogoto.io';
```

3. **Verify the setup**:
```sql
SELECT email, role, can_see_costs, markup_percentage
FROM public.user_profiles
WHERE email = 'newsales@monogoto.io';
```

## Current User Roles

### Admin Users (can see costs)
- israel@monogoto.io
- maor@monogoto.io  
- asaf@monogoto.io
- itamar@monogoto.io

### Sales Users (see customer pricing with 1.5x markup)
- To be added as needed

## Pricing Display Logic

### For Admin Users
- See actual costs from database
- Badge shows "ADMIN" with shield icon
- No pricing notices displayed

### For Sales Users  
- All prices multiplied by 1.5 (50% markup)
- Badge shows "SALES" 
- Blue notice: "Customer Pricing Mode: All prices shown include standard markup"
- Lock icons on price columns indicate customer pricing

## Future Enhancements

1. **Configurable Markup**: Allow different markup percentages per user
2. **Deal Discounts**: Sales can offer discounts up to a maximum percentage
3. **Approval Workflow**: Require admin approval for deals below certain margins
4. **Audit Trail**: Track all pricing views and deal proposals
5. **Multiple Price Lists**: Different pricing tiers for different customer segments

## Testing

1. **Create a test sales user**:
   - Sign up with a test email
   - Run the SQL to set as sales role
   - Login and verify prices are 1.5x higher

2. **Verify role switching**:
   - Change a user from sales to admin in database
   - Refresh and confirm they now see actual costs

3. **Check RLS policies**:
   - Ensure sales users can't directly query actual costs
   - Verify user_profiles access is restricted appropriately