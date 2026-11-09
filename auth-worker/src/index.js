const encoder = new TextEncoder();
const cookieName = '__Host-cms-state';
const headers = {'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff'};
const base64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return base64(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))));
}
export async function stateCookie(state, secret, now = Date.now()) {
  const value = `${state}.${now}`;
  return `${value}.${await sign(value,secret)}`;
}
export async function validState(state, cookie, secret, now = Date.now()) {
  if (!state || !cookie) return false;
  const parts = cookie.split('.');
  if (parts.length !== 3 || parts[0] !== state || !/^\d+$/.test(parts[1])) return false;
  const age = now - Number(parts[1]);
  if (age < 0 || age > 600000) return false;
  const expected = await sign(`${parts[0]}.${parts[1]}`,secret);
  if (expected.length !== parts[2].length) return false;
  let diff = 0;
  for (let i=0;i<expected.length;i++) diff |= expected.charCodeAt(i) ^ parts[2].charCodeAt(i);
  return diff === 0;
}
function text(message, status=400) { return new Response(message,{status,headers}); }
function popup(origin, result, success) {
  const nonce = base64(crypto.getRandomValues(new Uint8Array(18)));
  const safe = value => JSON.stringify(value).replaceAll('<','\\u003c');
  const message = `authorization:github:${success?'success':'error'}:${JSON.stringify(result)}`;
  return new Response(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>博客登录</title><p>正在完成登录，请保留此窗口。</p><script nonce="${nonce}">
const origin=${safe(origin)};
window.addEventListener('message', event => {
 if(event.origin !== origin || event.source !== window.opener || event.data !== 'authorizing:github') return;
 window.opener.postMessage(${safe(message)},origin);
});
if(window.opener) window.opener.postMessage('authorizing:github',origin);
else document.querySelector('p').textContent='请从博客管理后台重新登录。';
</script></html>`,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`,'Set-Cookie':`${cookieName}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`}});
}
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if(request.method !== 'GET') return text('Method not allowed',405);
  if(url.pathname === '/health') return Response.json({service:'blog-cms-auth',configured:!!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)}, {headers});
  if(!['/auth','/callback'].includes(url.pathname)) return text('Not found',404);
  if(!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return text('GitHub OAuth 尚未配置完成。',503);
  if(url.pathname === '/auth') {
   if(url.searchParams.get('provider') !== 'github' || url.searchParams.get('site_id') !== new URL(env.SITE_ORIGIN).hostname) return text('Invalid provider or site');
   const state = base64(crypto.getRandomValues(new Uint8Array(32)));
   const redirect = new URL('https://github.com/login/oauth/authorize');
   redirect.search = new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${url.origin}/callback`,scope:'public_repo',state}).toString();
   return new Response(null,{status:302,headers:{...headers,Location:redirect.href,'Set-Cookie':`${cookieName}=${await stateCookie(state,env.GITHUB_CLIENT_SECRET)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`}});
  }
  const cookie = (request.headers.get('Cookie') || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
  if(!await validState(url.searchParams.get('state'),cookie,env.GITHUB_CLIENT_SECRET)) return text('登录校验已失效，请关闭此窗口并从后台重试。',403);
  const fail = message => popup(env.SITE_ORIGIN,{message},false);
  if(url.searchParams.has('error')) return fail('你取消了 GitHub 授权，请重新登录。');
  const code = url.searchParams.get('code');
  if(!code) return fail('缺少 GitHub 授权码。');
  try {
   const response = await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','User-Agent':'blog-cms-auth'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,redirect_uri:`${url.origin}/callback`})});
   const data = await response.json();
   if(!response.ok || !data.access_token) return fail('GitHub 授权失败，请重新登录。');
   const ghHeaders = {Authorization:`Bearer ${data.access_token}`,Accept:'application/vnd.github+json','User-Agent':'blog-cms-auth'};
   const userResponse = await fetch('https://api.github.com/user',{headers:ghHeaders});
   const user = await userResponse.json();
   if(!userResponse.ok || user.login?.toLowerCase() !== env.ALLOWED_USER.toLowerCase()) return fail('此后台仅允许博客所有者登录。');
   const repoResponse = await fetch(`https://api.github.com/repos/${env.REPOSITORY}`,{headers:ghHeaders});
   const repo = await repoResponse.json();
   if(!repoResponse.ok || !repo.permissions?.push) return fail('当前账号没有博客仓库的写入权限。');
   return popup(env.SITE_ORIGIN,{token:data.access_token,provider:'github'},true);
  } catch { return fail('认证服务暂时无法连接 GitHub，请稍后重试。'); }
 }
};
