const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
const CACHE='novastudy-v3.6.4';
const LEGACY='novastudy-v3.2.0';
function fixture({failAdd=false,active=true,offline=false,partial=false}={}){
 const handlers={},maps=new Map(),events=[];
 const old=new Map([['./index.html',{ok:true,body:'old app'}]]);
 maps.set(LEGACY,old);
 const keyOf=value=>{const v=typeof value==='string'?value:value.url;return v.startsWith('https://novastudy.example/')?'./'+v.slice('https://novastudy.example/'.length):v};
 const cacheApi={
  async open(key){if(!maps.has(key))maps.set(key,new Map());
   const m=maps.get(key);return {
    async addAll(files){for(let i=0;i<files.length;i++){
     if(failAdd&&i===4)throw Error('network failure');
     m.set(files[i],{ok:true,status:200,body:files[i],clone(){return this}});
    }},
    async match(key){return m.get(keyOf(key))||null},
    async put(key,v){m.set(keyOf(key),v)}
   }},
  async match(req){let name=keyOf(req);
   for(const m of Array.from(maps.values()).reverse())if(m.has(name))return m.get(name);
   return null},
  async keys(){return Array.from(maps.keys())},
  async delete(key){return maps.delete(key)}
 };
 const self={
  location:{origin:'https://novastudy.example'},
  registration:{active:active?{}:null},
  clients:{claim:async()=>{events.push('claim')}},
  skipWaiting:async()=>{events.push('skipWaiting')},
  addEventListener:(name,handler)=>{handlers[name]=handler}
 };
 class FakeResponse{constructor(body,opt={}){this.body=body;this.status=opt.status||200;this.ok=this.status<400;this.headers=opt.headers||{}}
 clone(){return new FakeResponse(this.body,{status:this.status,headers:this.headers})}}
 const ctx={self,caches:cacheApi,URL,Response:FakeResponse,fetch:async req=>{
  if(offline)throw Error('offline');
  return new FakeResponse(req.url)},
  Promise,Error,console};
 vm.runInNewContext(source,ctx,{filename:'sw.js'});
 const wait=(type,value={})=>{
  let promise=null,reply=null;
  handlers[type]({...value,waitUntil:p=>promise=p,respondWith:p=>reply=p});
  return {promise,reply};
 };
 return{wait,maps,events,setOffline:v=>offline=v,handlers,cacheApi};
}
test('install populates v3.2 cache without automatically activating over active v3.1',async()=>{
 const f=fixture(),op=f.wait('install');
 await op.promise;
 assert.ok(f.maps.get(CACHE).has('./index.html'));
 assert.ok(f.maps.get(CACHE).has('./app.js'));
 assert.ok(f.maps.has(LEGACY));
 assert.equal(f.events.includes('skipWaiting'),false);
});
test('first install activates automatically and staged update activates only with explicit message',async()=>{
 const first=fixture({active:false});await first.wait('install').promise;
 assert.deepEqual(first.events,['skipWaiting']);
 const staged=fixture();await staged.wait('install').promise;
 assert.equal(staged.events.includes('skipWaiting'),false);
 await staged.wait('message',{data:{type:'UNKNOWN'}}).promise;
 assert.equal(staged.events.includes('skipWaiting'),false);
 await staged.wait('message',{data:{type:'SKIP_WAITING'}}).promise;
 assert.equal(staged.events.includes('skipWaiting'),true);
});
test('failed install deletes only incomplete NEW cache, preserving old offline app',async()=>{
 const f=fixture({failAdd:true});
 await assert.rejects(f.wait('install').promise,/network failure/);
 assert.equal(f.maps.has(CACHE),false);
 assert.equal(f.maps.has(LEGACY),true);
 assert.ok(f.maps.get(LEGACY).get('./index.html'));
});
test('activate retains existing cached version if required new shell is missing',async()=>{
 const f=fixture();await f.wait('install').promise;
 f.maps.get(CACHE).delete('./app.js');
 await assert.rejects(f.wait('activate').promise,/incomplete/);
 assert.equal(f.maps.has(LEGACY),true);
});
test('successful activate prunes old version only after new shell verifies',async()=>{
 const f=fixture();await f.wait('install').promise;
 await f.wait('activate').promise;
 assert.equal(f.maps.has(LEGACY),false);
 assert.equal(f.maps.has(CACHE),true);
 assert.equal(f.events.includes('claim'),true);
});
test('offline navigation falls back to cached app shell',async()=>{
 const f=fixture({offline:true});await f.wait('install').promise;
 const request={url:'https://novastudy.example/#tasks',method:'GET',mode:'navigate',destination:'document'};
 const reply=f.wait('fetch',{request}).reply;
 const result=await reply;
 assert.equal(result.body,'./index.html');
});
test('cached assets remain usable offline and missing assets show an explicit 503',async()=>{
 const f=fixture({offline:true});await f.wait('install').promise;
 const asset={url:'https://novastudy.example/app.js',method:'GET',mode:'no-cors',destination:'script'};
 // Relative cache URL matching in this mock is simplified to the app's configured root.
 const scriptReply=f.wait('fetch',{request:asset}).reply;
 assert.equal((await scriptReply).status,200);
 // The service worker does not substitute HTML for an unavailable JS asset.
 const wrong={url:'https://novastudy.example/missing.js',method:'GET',mode:'no-cors',destination:'script'};
 const result=await f.wait('fetch',{request:wrong}).reply;
 assert.equal(result.status,503);
 assert.doesNotMatch(result.body,/<html/i);
});
test('cross-origin and non-GET requests are not intercepted',()=>{
 const f=fixture();
 assert.equal(f.wait('fetch',{request:{url:'https://other.example/data',method:'GET',mode:'cors'}}).reply,null);
 assert.equal(f.wait('fetch',{request:{url:'https://novastudy.example/api',method:'POST',mode:'cors'}}).reply,null);
});
test('PWA update controls protect open editor and offer postpone and retry',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(html,/id="updateNoticeText"/);
 for(const action of ['apply-update','update-later','retry-update','export'])
  assert.match(html,new RegExp('data-action="'+action+'"'));
 assert.match(app,/function applyUpdate\(\)/);
 assert.match(app,/if\(\$\("modal"\)\.open\)/);
 assert.match(app,/if\(!confirm\("An editor is open/);
 assert.match(app,/function postponeUpdate\(\)/);
 assert.match(app,/function retryUpdate\(\)/);
 assert.match(app,/updateAttemptTimer=setTimeout\(/);
 assert.match(app,/if\(updateAccepted&&!updateReloaded\)/);
 assert.match(app,/if\(updatePostponed\|\|updateAccepted\)return/);
});
