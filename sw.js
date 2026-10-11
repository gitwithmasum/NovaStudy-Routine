/* NovaStudy v3.2 — atomic offline shell install, user-confirmed upgrades. */
const CACHE='novastudy-v3.2.0';
const FILES=['./','./index.html','./styles.css','./themes.css','./planner.css','./exam-prep.js','./exam-prep.css','./presets.js','./i18n.js','./core.js','./views.js','./editors.js','./exams.js','./focus.js','./focus-insights.js','./focus-insights.css','./attendance.js','./challenge-data.js','./challenge.js','./challenge.css','./learning-hub.js','./learning-hub.css','./academic-reports.js','./academic-reports.css','./navigation-scroll.css','./reminders.js','./reminders.css','./ui-personalization.js','./premium-ui.css','./performance-mobile.css','./auth-config.js','./auth.js','./auth.css','./cloud.js','./cloud.css','./sync.js','./sync.css','./auto-sync.js','./auto-sync.css','./dashboard.js','./dashboard.css','./study-planner.js','./study-planner.css','./app.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png','./assets/icon.svg'];
const REQUIRED=['./index.html','./app.js','./core.js','./styles.css'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  try{
   const cache=await caches.open(CACHE);
   await cache.addAll(FILES);
  }catch(err){
   // Remove partially populated NEW cache only; existing active caches stay intact.
   await caches.delete(CACHE).catch(()=>{});
   throw err;
  }
  const old=await caches.keys();
  if(!self.registration.active||old.includes('novastudy-v1.3.1'))await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const checks=await Promise.all(REQUIRED.map(x=>cache.match(x)));
  if(checks.some(x=>!x))throw Error('Offline shell incomplete: retaining prior caches');
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('novastudy-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(request).catch(async()=>{
   const cached=await caches.match('./index.html');
   return cached||new Response('NovaStudy is offline; load the app once online before using it offline.',
    {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
  return;
 }
 if(new URL(request.url).pathname.endsWith('/auth-config.js')){
  event.respondWith(fetch(request).then(res=>{
   if(res.ok){const clone=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,clone)).catch(()=>{}));}
   return res;
  }).catch(()=>caches.match(request)));return;
 }
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(res=>{
  if(res.ok){const clone=res.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,clone)).catch(()=>{}));}
  return res;
 }).catch(()=>new Response('Resource unavailable while offline',{status:503}))));
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING'){
  event.waitUntil(self.skipWaiting());
 }
});
