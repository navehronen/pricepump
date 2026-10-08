import type { NextConfig } from 'next';
const config: NextConfig = {
  // Optional LAN hostname for physical-device testing; no production effect.
  allowedDevOrigins: ['127.0.0.1', ...(process.env.PRICE_PUMP_DEV_HOST ? [process.env.PRICE_PUMP_DEV_HOST] : [])],
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
    ] }];
  },
};
export default config;
