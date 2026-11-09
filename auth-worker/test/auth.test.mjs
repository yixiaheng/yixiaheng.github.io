import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker, {stateCookie, validState} from '../src/index.js';
const env={GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',SITE_ORIGIN:'https://yixiaheng.github.io',ALLOWED_USER:'yixiaheng',REPOSITORY:'yixiaheng/yixiaheng.github.io'};
const origin='https://auth.example.com';
test('OAuth state rejects missing, altered, mismatched, expired and future cookies', async()=>{
 const cookie=await stateCookie('random-state','secret',1000000);
 assert.equal(await validState('random-state',cookie,'secret',1001000),true);
 for(const [state,value,now] of [[null,cookie,1001000],['random-state',null,1001000],['wrong',cookie,1001000],['random-state',cookie+'x',1001000],['random-state',cookie,1600001],['random-state',cookie,999999]]) assert.equal(await validState(state,value,'secret',now),false);
 assert.equal(await validState('random-state',cookie,'other',1001000),false);
});
test('auth validates caller and pins scope, cookie security and redirect',async()=>{
 for(const query of ['provider=gitlab&site_id=yixiaheng.github.io','provider=github&site_id=evil.com']) assert.equal((await worker.fetch(new Request(`${origin}/auth?${query}`),env)).status,400);
 const r=await worker.fetch(new Request(`${origin}/auth?provider=github&site_id=yixiaheng.github.io&scope=repo`),env);
 assert.equal(r.status,302); const location=new URL(r.headers.get('Location'));
 assert.equal(location.searchParams.get('scope'),'public_repo');
 assert.equal(location.searchParams.get('redirect_uri'),`${origin}/callback`);
 assert.match(r.headers.get('Set-Cookie'),/Secure; HttpOnly; SameSite=Lax; Max-Age=600/);
});
test('callback refuses missing state before network requests', async()=>{
 assert.equal((await worker.fetch(new Request(`${origin}/callback?code=x`),env)).status,403);
});
test('callback checks owner and push permission, then uses exact-origin handshake',async()=>{
 const original=globalThis.fetch;
 const cookie=await stateCookie('state',env.GITHUB_CLIENT_SECRET);
 const request=()=>new Request(`${origin}/callback?state=state&code=test`,{headers:{Cookie:`__Host-cms-state=${cookie}`}});
 try {
  for(const [login,push,success] of [['stranger',true,false],['yixiaheng',false,false],['yixiaheng',true,true]]) {
   globalThis.fetch=async url=>Response.json(String(url).includes('access_token')?{access_token:'fixture-token'}:String(url).endsWith('/user')?{login}:{permissions:{push}});
   const response=await worker.fetch(request(),env); const html=await response.text();
   assert.match(html,success?/authorization:github:success/:/authorization:github:error/);
   assert.equal(html.includes('fixture-token'),success);
   assert.match(html,/event.origin !== origin/); assert.match(html,/event.source !== window.opener/);
   assert.match(html,/https:\/\/yixiaheng.github.io/); assert.ok(response.headers.get('Content-Security-Policy').includes("default-src 'none'"));
   assert.equal(response.headers.get('Location'),null); assert.match(response.headers.get('Set-Cookie'),/Max-Age=0/);
  }
 } finally {globalThis.fetch=original;}
});
