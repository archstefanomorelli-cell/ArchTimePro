// Arch Time Pro - runtime configuration template
// Copy this file to 00-runtime-config.js for each environment.
window.ARCH_TIME_CONFIG = {
    environment: 'production',
    supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
    supabaseKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
    stripeLinks: {
        starter: 'https://buy.stripe.com/YOUR_STARTER_PRICE_LINK',
        premium: 'https://buy.stripe.com/YOUR_PREMIUM_PRICE_LINK',
        customerPortal: 'https://billing.stripe.com/p/login/YOUR_CUSTOMER_PORTAL_LINK'
    }
};
