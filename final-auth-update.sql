
-- Update Site URL
UPDATE auth.config 
SET value = 'https://deal-desk.netlify.app'
WHERE key = 'site_url';

-- Update URI Allow List
UPDATE auth.config
SET value = jsonb_build_array(
    'https://deal-desk.netlify.app',
    'https://deal-desk.netlify.app/',
    'https://deal-desk.netlify.app/*',
    'https://deal-desk.netlify.app/auth/callback',
    'https://deal-desk.netlify.app/auth/confirm',
    'http://localhost:5173',
    'http://localhost:5173/',
    'http://localhost:5173/*',
    'http://localhost:5173/auth/callback'
)::text
WHERE key = 'uri_allow_list';

-- Return the updated values
SELECT key, value FROM auth.config 
WHERE key IN ('site_url', 'uri_allow_list');
