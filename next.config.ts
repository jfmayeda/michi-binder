import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep AGENTS.md as the product contract; do not let next dev rewrite it.
  agentRules: false,
};

export default nextConfig;
