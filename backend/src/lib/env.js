if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const optional = ['RESEND_API_KEY', 'APP_URL'];
for (const key of optional) {
  if (!process.env[key]) {
    console.warn(`[env] Optional variable not set: ${key}`);
  }
}

module.exports = {};
