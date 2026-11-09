# 博客登录认证服务

此 Cloudflare Worker 将 Decap CMS 的 GitHub OAuth 登录接入自己的账号。博客仍部署于 GitHub Pages。

- Worker: https://blog-cms-auth.yixiaheng-blog.workers.dev
- OAuth callback: https://blog-cms-auth.yixiaheng-blog.workers.dev/callback
- CMS: https://yixiaheng.github.io/admin/
- `/health` 只返回服务名称和是否已配置凭据，不返回密钥。

在 GitHub Settings → Developer settings → OAuth Apps 创建自己的 OAuth App。Homepage URL 填博客地址，Authorization callback URL 填上方回调地址。无需开启 Device Flow。

在此目录执行 `npx wrangler login`，然后 `npx wrangler deploy`。使用 `npx wrangler secret put GITHUB_CLIENT_ID` 和 `npx wrangler secret put GITHUB_CLIENT_SECRET` 通过终端提示输入凭据，或在 Cloudflare 控制台的 Worker 设置中添加同名加密 Secret。不得把密钥写到 wrangler 配置、前端文件、Git 仓库或聊天中。

`wrangler.jsonc` 中的 SITE_ORIGIN、ALLOWED_USER、REPOSITORY 为非敏感固定配置。修改域名时同步更新这三个配置、OAuth callback 和 `public/admin/auth.json`，再部署。

安全校验：签名、10 分钟有效的 state cookie；HttpOnly/Secure/SameSite=Lax；限定 GitHub 用户及仓库 push 权限；OAuth 返回页采用精确 origin 和 opener 校验、CSP nonce；不记录令牌、不将令牌放入 URL。

测试：在仓库根目录运行 `node --test auth-worker/test/auth.test.mjs`。这些测试模拟 GitHub，真实授权需在浏览器验证。

前端使用固定版本 Decap CMS 3.17.3，浏览器分发文件及依赖许可证在 `public/admin/vendor/`，来源 https://www.npmjs.com/package/decap-cms/v/3.17.3 。离线托管，后台不依赖第三方 CDN。
