## Contract Debugger

Next.js 16 + Wagmi + RainbowKit 的合约调试工具，已按 Vercel 部署优化。

## Getting Started

运行开发环境：

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

在本地 `.env.local` 或 Vercel 项目变量中配置：

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=你的walletconnect_project_id
```

> 可在 [WalletConnect Cloud](https://cloud.walletconnect.com) 创建 Project ID。

## Deploy To Vercel

1. 将仓库导入 Vercel
2. Framework 选择 `Next.js`
3. Build Command 使用默认（`pnpm build`）
4. 在 Vercel 项目变量中设置 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
5. 部署完成后访问分配域名

## Scripts

- `pnpm dev`: 本地开发
- `pnpm build`: 生产构建
- `pnpm start`: 本地启动生产包
- `pnpm lint`: 代码检查
