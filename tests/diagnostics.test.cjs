const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),
 fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const esc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function boot(opts={}){
 const values=new Map([["novastudy_state_v1",JSON.stringify({subjects:[{name:"Confidential"}]})],["private_session_token","SECRET-SHOULD-NOT-LEAK"]]);
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(opts.blockStorage)throw Error("blocked");values.set(k,String(v))},removeItem:k=>values.delete(k)};
 const navButtons=[{getAttribute:()=>null,textContent:"Home"},{getAttribute:()=>null,textContent:"Tasks"}];
 const doc={documentElement:{dataset:{theme:"gold",uiReducedMotion:"on"}},
  querySelector:s=>s===".mobile-nav"?{scrollWidth:700,clientWidth:350}:
   s==='[data-action="focus-content"]'?{}:s==='#view[tabindex="-1"]'?{}:null,
  querySelectorAll:s=>s.includes("data-nav")?navButtons:[],
  body:{appendChild:()=>{}},createElement:()=>({click:()=>{},remove:()=>{}})};
 const printed=[],win={NOVA:{escape:esc},NOVA_I18N:{language:"en"},innerWidth:390,innerHeight:844,
  isSecureContext:true,location:{hostname:"example.org"},Notification:{permission:"default"},
  matchMedia:q=>({matches:q.includes("max-width")||q.includes("reduced-motion")}),
  Blob,URL,
  navigator:null};
 const nav={onLine:true,standalone:false,serviceWorker:{getRegistration:async()=>({active:{},waiting:null})},
  clipboard:{writeText:async text=>{printed.push(text)}}};
 win.navigator=nav;
 const cachesMock={keys:async()=>["novastudy-v3.4.0"],match:async()=>({ok:true})};
 const urlCalls=[];
 const URLMock={createObjectURL:()=>{urlCalls.push("create");return "blob:diag"},revokeObjectURL:()=>urlCalls.push("revoke")};
 const ctx={window:win,navigator:nav,document:doc,localStorage:storage,caches:cachesMock,
 Blob,URL:URLMock,JSON,Math,Date,Number,String,Array,Object,Set,Map,Promise,
 setTimeout:f=>f()};
 vm.runInNewContext(read("diagnostics.js"),ctx,{filename:"diagnostics.js"});
 const d=win.NOVA_DIAGNOSTICS;d.init({refresh:()=>{}});
 return{d,doc,win,nav,storage,values,printed,cachesMock,urlCalls};
}
test("fresh diagnostics are not collected automatically and contain no study records",()=>{
 const b=boot();assert.equal(b.d.get(),null);assert.equal(b.d.report(),null);
 assert.equal(b.values.get("private_session_token"),"SECRET-SHOULD-NOT-LEAK");
});
test("explicit checks report secure origin, cache, worker and keyboard readiness",async()=>{
 const b=boot();const data=await b.d.collect();
 assert.equal(data.version,"3.4.0");
 assert.equal(data.secureContext,true);
 for(const id of ["storage","worker","cache","keyboard","navlabels","notifications","viewport","installed","motion"])
  assert.ok(data.checks.some(c=>c.id===id),id);
 assert.equal(data.checks.find(c=>c.id==="cache").level,"pass");
 assert.equal(data.checks.find(c=>c.id==="worker").level,"pass");
});
test("temporary storage write is removed without changing any original local keys",async()=>{
 const b=boot(),before=Array.from(b.values.entries());
 await b.d.collect();
 assert.deepEqual(Array.from(b.values.entries()),before);
});
test("blocked storage and unsupported browser APIs show warnings, never fabricate a passing check",async()=>{
 const b=boot({blockStorage:true});
 b.nav.serviceWorker=undefined;b.win.isSecureContext=false;b.win.location.hostname="site.test";
 const bad=await b.d.collect();
 assert.equal(bad.checks.find(c=>c.id==="storage").level,"warn");
 assert.equal(bad.checks.find(c=>c.id==="worker").level,"warn");
 assert.equal(bad.checks.find(c=>c.id==="secure").level,"warn");
});
test("diagnostics stay honest about reported connectivity and notification limits",async()=>{
 const b=boot();b.nav.onLine=false;b.win.Notification.permission="denied";
 const data=await b.d.collect();
 assert.equal(data.checks.find(c=>c.id==="network").level,"warn");
 assert.equal(data.checks.find(c=>c.id==="notifications").level,"warn");
 assert.match(data.checks.find(c=>c.id==="network").detail,/offline/);
});
test("copy and exported JSON include entered issue but no student data or tokens",async()=>{
 const b=boot();
 b.d.setIssue("Mobile navigation feels slow");
 assert.equal(await b.d.run(),true);
 assert.equal(await b.d.copyReport(),true);
 assert.equal(b.printed.length,1);
 const parsed=JSON.parse(b.printed[0]);
 assert.equal(parsed.issueDescription,"Mobile navigation feels slow");
 assert.equal(parsed.product,"NovaStudy");
 assert.doesNotMatch(b.printed[0],/SECRET-SHOULD-NOT-LEAK|Confidential|private_session_token/);
 assert.doesNotMatch(b.printed[0],/novastudy_state_v1/);
});
test("report does not allow arbitrary length issue descriptions",async()=>{
 const b=boot();b.d.setIssue("X".repeat(10000));await b.d.run();
 assert.equal(b.d.report().issueDescription.length,500);
});
test("copy with denied or missing clipboard explains download alternative",async()=>{
 const b=boot();await b.d.run();b.nav.clipboard=undefined;
 assert.equal(await b.d.copyReport(),false);
 assert.match(b.d.page(),/Download JSON/);
});
test("render escapes user issue text and provides accessible run/export buttons",async()=>{
 const b=boot();b.d.setIssue('<img src=x onerror=alert(1)>');
 let html=b.d.page();
 assert.match(html,/data-action="diagnostics-run"/);
 assert.match(html,/data-action="diagnostics-download"/);
 assert.match(html,/id="diagnosticIssue"/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img src=x/);
 await b.d.run();html=b.d.page();
 assert.match(html,/diag-results/);
 assert.match(html,/data-action="diagnostics-copy"/);
});
test("English/Bangla switch changes labels without changing diagnosis",async()=>{
 const b=boot();await b.d.run();const original=b.d.report().diagnostics;
 b.win.NOVA_I18N.language="bn";
 assert.match(b.d.page(),/ডায়াগনস্টিকস/);
 assert.equal(b.d.report().diagnostics,original);
});
test("v3.3 integration keeps original data modules, adds diagnostics navigation and accessible editor",()=>{
 const html=read("index.html"),app=read("app.js"),views=read("views.js"),editors=read("editors.js"),
 sw=read("sw.js"),css=read("diagnostics.css"),audit=read("scripts/release-audit.cjs");
 assert.match(html,/data-nav="diagnostics"/);
 assert.match(html,/src="\.\/diagnostics\.js"/);
 assert.match(html,/href="\.\/diagnostics\.css"/);
 assert.match(html,/NOVASTUDY OS <b>3\.4\.0<\/b>/);
 assert.match(app,/Diagnostics\.page\(\)/);
 assert.match(app,/Diagnostics\.init/);
 assert.match(app,/Diagnostics\.setIssue/);
 assert.match(app,/Diagnostics\.onAction/);
 assert.match(views,/data-nav="diagnostics"/);
 assert.match(editors,/aria-label="Close editor"/);
 assert.match(editors,/previousFocus/);
 assert.match(editors,/\.focus\(\{preventScroll:true\}\)/);
 assert.match(sw,/novastudy-v3\.4\.0/);
 assert.match(sw,/'\.\/diagnostics\.js'/);
 assert.match(sw,/'\.\/diagnostics\.css'/);
 assert.match(css,/focus-visible/);
 assert.match(audit,/novastudy-v3\\\.3\\\.0/);
 for(const f of ["diagnostics.js","editors.js","app.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
});
