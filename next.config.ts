import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // public/people is read at build time to know which photos exist.
  outputFileTracingIncludes: { '/**': ['./public/people/**'] },
  // The simulation is a static export served from public/sim; its directory URLs need its index.html.
  async rewrites() {
    return [
      { source: '/sim', destination: '/sim/index.html' },
      { source: '/sim/', destination: '/sim/index.html' },
    ];
  },
};

export default config;
