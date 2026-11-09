import type { SiteConfig, NavBarConfig, ProfileConfig, LicenseConfig, ExpressiveCodeConfig } from './types/config';
import settings from './data/settings.json';
export const homeConfig = settings;
export const siteConfig: SiteConfig = {
  title: settings.title, subtitle: settings.subtitle, lang: 'zh_CN',
  themeColor: { hue: settings.hue, fixed: false },
  banner: { enable: settings.bannerEnabled, src: settings.banner, position: 'center', credit: { enable: false, text: '' } },
  toc: { enable: true, depth: 3 }, favicon: [],
};
export const navBarConfig: NavBarConfig = { links: settings.navigation };
export const profileConfig: ProfileConfig = {
  avatar: settings.avatar, name: settings.name, bio: settings.bio,
  links: settings.github ? [{ name: 'GitHub', icon: 'fa6-brands:github', url: settings.github }] : [],
};
// 尚未指定文章授权协议，因此默认不显示主题自带的 CC 授权声明。
export const licenseConfig: LicenseConfig = { enable: false, name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' };
export const expressiveCodeConfig: ExpressiveCodeConfig = { theme: 'github-dark' };

export const motionConfig = { enabled: settings.motion?.enabled ?? true, intensity: settings.motion?.intensity ?? "gentle" };
export const backgroundConfig = {
  enabled: settings.background?.enabled ?? true,
  image: settings.background?.image?.trim() || '',
  opacity: Math.max(0, Math.min(100, Number(settings.background?.opacity ?? 30) || 0)),
};
