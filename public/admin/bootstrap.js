(async () => {
  const status = document.getElementById('status');
  try {
    const read = async url => { const r = await fetch(url, {cache:'no-store'}); if (!r.ok) throw new Error('后台配置加载失败'); return r.json(); };
    const [config, auth] = await Promise.all([read('./config.json'), read('./auth.json')]);
    if (!auth.base_url) { status.textContent = '后台文件已就绪，正在完成 GitHub 登录配置。请稍后再来。'; return; }
    config.backend.base_url = auth.base_url;
    window.CMS_MANUAL_INIT = true;
    const script = document.createElement('script');
    script.src = './vendor/decap-cms.js';
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error('编辑器加载失败，请刷新重试')); document.head.append(script); });
    window.CMS.init({config}); status.remove();
  } catch (error) { status.textContent = error.message; }
})();
