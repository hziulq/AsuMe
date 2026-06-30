import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack のワークスペースルートをこのプロジェクトに固定。
  // 親ディレクトリや余分なロックファイルによるルート誤推定（dev で
  // "Next.js package not found" → / がリロードを繰り返す現象）の再発防止。
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
