import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Keep AGENTS.md as the product contract; do not let next dev rewrite it.
  agentRules: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
};

export default nextConfig;
