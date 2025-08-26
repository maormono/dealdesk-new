# ✅ Test Your Invitation Flow

Now that you've updated the Supabase settings, let's test it:

## Test Steps:

1. **Go to User Management**
   - Open: https://deal-desk.netlify.app/user-management
   - You should see the user list

2. **Send a Test Invitation**
   - Enter a test email (must be @monogoto.io)
   - Click "Send Invitation"
   - You should see a success message

3. **Check the Email**
   - The invitation email should arrive
   - The link should look like:
     `https://deal-desk.netlify.app/auth/callback?token_hash=...&type=invite`
   - NOT the old dealdesk-monogoto URL

4. **Click the Link**
   - It should open the DealDesk app
   - Show a password setup form
   - After setting password, user should be redirected to the app

## If It Works ✅
Congratulations! Your invitation system is fully functional:
- Users can be invited via email
- They can set up their accounts
- They'll be added to the system with the correct role

## If It Doesn't Work ❌
Check:
1. Is the Site URL in Supabase set to exactly: `https://deal-desk.netlify.app`
2. Are all email templates using: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=...`
3. Is the email being sent to a valid @monogoto.io address?
4. Check browser console for any errors

## Quick Verification Commands:
```bash
# Check if auth callback route works
curl -I https://deal-desk.netlify.app/auth/callback

# Check if main site is accessible  
curl -I https://deal-desk.netlify.app/
```

## Success Indicators:
- ✅ Email arrives with correct URL
- ✅ Link opens without 404 error
- ✅ Password form appears
- ✅ User can complete registration
- ✅ User appears in User Management list