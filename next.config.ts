import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Webpack 配置
  webpack: (config, { webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // 使用 IgnorePlugin 忽略 node_modules 中的测试文件和开发文件
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/test\/|^\.\/bench\.js$|^\.\/README\.md$|^\.\/LICENSE$/,
        contextRegExp: /thread-stream/,
      })
    );

    // 忽略其他测试相关的模块
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(tap|desm|fastbench|pino-elasticsearch|tape|why-is-node-running)$/,
      })
    );

    // 忽略可选依赖（React Native 和开发工具）
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@react-native-async-storage\/async-storage$/,
      })
    );

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pino-pretty$/,
      })
    );

    return config;
  },
};

export default nextConfig;