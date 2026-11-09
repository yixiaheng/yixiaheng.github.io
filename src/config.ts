import type { SiteConfig, NavBarConfig, ProfileConfig, LicenseConfig, ExpressiveCodeConfig } from './types/config';
import { LinkPreset } from './types/config';
export const siteConfig: SiteConfig = {
  title: 'yixiaheng', subtitle: '记录所学，也记录创造。', lang: 'zh_CN',
  themeColor: { hue: 250, fixed: false },
  banner: { enable: true, src: 'assets/images/demo-banner.png', position: 'center', credit: { enable: false, text: '' } },
  toc: { enable: true, depth: 3 }, favicon: [],
};
export const navBarConfig: NavBarConfig = { links: [
  LinkPreset.Home, { name: '项目', url: '/projects/' },
  { name: '随笔', url: '/archive/' }, LinkPreset.About,
  { name: 'GitHub', url: 'https://github.com/yixiaheng', external: true },
] };
export const profileConfig: ProfileConfig = {
  avatar: 'assets/images/demo-avatar.png', name: 'yixiaheng',
  bio: '记录知识、分享项目，把想法慢慢变成作品。',
  links: [{ name: 'GitHub', icon: 'fa6-brands:github', url: 'https://github.com/yixiaheng' }],
};
// 尚未指定文章授权协议，因此默认不显示主题自带的 CC 授权声明。
export const licenseConfig: LicenseConfig = { enable: false, name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' };
export const expressiveCodeConfig: ExpressiveCodeConfig = { theme: 'github-dark' };
