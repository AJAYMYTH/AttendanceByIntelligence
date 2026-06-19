const validateEnv = () => {
  const required = ['SUPABASE_URL', 'SUPABASE_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    console.error(`[ABI] Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
};

module.exports = { validateEnv };
