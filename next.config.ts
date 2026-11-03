import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // public/people is read at build time to know which photos exist.
  outputFileTracingIncludes: { '/**': ['./public/people/**'] },
};

export default config;
