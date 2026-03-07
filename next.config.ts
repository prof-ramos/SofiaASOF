import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tiktoken requer arquivos WASM que não funcionam bem com Turbopack
  // Marcar como pacote externo para que o Node.js resolva nativamente
  serverExternalPackages: ['tiktoken'],
};

export default nextConfig;
