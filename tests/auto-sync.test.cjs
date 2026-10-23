const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function setup({hasBaseline=true,connected=true,online=true,conflicts=[],allow=true}={}){
 const store=new Map(),messages=[],events={},docEvents={};
 let auth=connected?"alice":null,baseline=hasBaseline,network=online,downloads=0,reviews=0,applies=0,syncOpts=null,ask=allow;
 let lastPreview=null,refreshed=0,downloaded=0,brokenKey="";
 const N={KEY:"novastudy_state_v1",valid:s=>s?.version===1,date:()=>"2026-10-11",escape:x=>String(x)};
 const cloud={getBaseline:()=>baseline?{revision:2,snapshot:{version:1}}:null,
  async review(options={}){reviews++;syncOpts=options;lastPreview={account:auth,manual:false,conflicts:conflicts.slice()};return true},
  getPreview:()=>lastPreview,async apply(choice,options){applies++;syncOpts=options;return true},
 };
 const w={NOVA:N,NOVA_SYNC:cloud,NOVA_AUTH:{getStatus:()=>auth?"connected":"guest",getUser:()=>auth?{id:auth}:null},
 NOVA_I18N:{language:"en"},confirm:()=>ask,
 addEventListener:(type,cb)=>{events[type]=cb}};
 const doc={hidden:false,addEventListener:(name,cb)=>{docEvents[name]=cb},body:{appendChild(){}},
 createElement:()=>({click(){downloads++},remove(){}})};
 const localStorage={getItem:k=>store.get(k)||null,setItem(k,v){if(k===brokenKey)throw Error("quota");store.set(k,String(v))},removeItem:k=>store.delete(k)};
 const ctx={window:w,document:doc,localStorage,navigator:{get onLine(){return network}},console,
 Blob:class{constructor(x){this.size=x.join("").length}},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},
 setInterval:()=>{},setTimeout:()=>3,clearTimeout:()=>{},Date,JSON,Promise,String,Number,Error,Object};
 vm.runInNewContext(read("auto-sync.js"),ctx,{filename:"auto-sync.js"});
 const auto=w.NOVA_AUTO;auto.init({toast:m=>messages.push(m),refresh:()=>refreshed++});
 return {auto,store,events,docEvents,doc,cloud,hasReview:()=>reviews,applied:()=>applies,options:()=>syncOpts,
 setOnline:v=>network=v,setAccount:v=>auth=v,setBaseline:v=>baseline=v,setConflict:c=>conflicts=c,
 setAsk:v=>ask=v,breakStore:k=>brokenKey=k,messages,downloads:()=>downloads,rerenders:()=>refreshed};
}
test("auto sync OFF by default; starts only after opt-in and trusted baseline",()=>{
 const d=setup({hasBaseline:false});
 assert.equal(d.auto.enabled(),false);
 assert.equal(d.auto.toggle(),false);
 d.setBaseline(true);assert.equal(d.auto.toggle(),true);
 assert.equal(d.auto.enabled(),true);
 assert.equal(d.auto.toggle(),true);assert.equal(d.auto.enabled(),false);
});
test("explicit opt-in is cancelled without confirmation",()=>{
 const d=setup({allow:false});
 assert.equal(d.auto.toggle(),false);assert.equal(d.auto.enabled(),false);
});
test("on local changes write account-scoped offline pending marker",async()=>{
 const d=setup({online:false});d.auto.toggle();
 d.auto.onLocalChange();
 assert.ok(d.store.has("novastudy_auto_pending_v1_alice"));
 assert.equal(await d.auto.run(),false);assert.equal(d.hasReview(),0);
 d.setOnline(true);
 assert.equal(await d.auto.run(),true);
 assert.equal(d.hasReview(),1);assert.equal(d.applied(),1);
 assert.equal(d.options().auto,true);
});
test("conflicts pause further automation until user manually resolves",async()=>{
 const d=setup({conflicts:["tasks.123"]});d.auto.toggle();
 assert.equal(await d.auto.run(),false);
 assert.equal(d.store.get("novastudy_auto_conflict_v1_alice"),"1");
 assert.equal(d.applied(),0);
 assert.equal(await d.auto.run(),false);
 assert.equal(d.hasReview(),1);
 assert.match(d.auto.panel(),/Paused/);
 d.auto.markSynced("alice");
 assert.equal(d.store.has("novastudy_auto_conflict_v1_alice"),false);
});
test("safety snapshot is account specific, downloaded only by explicit action",()=>{
 const d=setup();d.auto.toggle();
 const snap={version:1,task:"keep"};
 assert.equal(d.auto.saveRecovery(snap,"alice"),true);
 assert.equal(d.auto.recovery().snapshot.task,"keep");
 assert.equal(d.downloads(),0);
 assert.equal(d.auto.downloadRecovery(),true);assert.equal(d.downloads(),1);
 d.setAccount("bob");
 assert.equal(d.auto.recovery(),null);
 assert.equal(d.auto.saveRecovery(snap,"alice"),false);
});
test("failed safety storage blocks saving the recovery snapshot",()=>{
 const d=setup();d.breakStore("novastudy_auto_recovery_v1_alice");
 assert.equal(d.auto.saveRecovery({version:1},"alice"),false);
});
test("automatic sync does not run after Google sign-out, even if previously enabled",async()=>{
 const d=setup();d.auto.toggle();d.setAccount(null);
 assert.equal(await d.auto.run(),false);assert.equal(d.applied(),0);
});
test("offline queue survives module boot without changing the original study records",()=>{
 const d=setup({online:false});d.auto.toggle();d.auto.onLocalChange();
 assert.ok(d.store.get("novastudy_auto_pending_v1_alice"));
 assert.equal(d.store.has("novastudy_state_v1"),false);
});
test("v2.2 auto-sync module is wired into app, PWA and source validation",()=>{
 const html=read("index.html"),app=read("app.js"),views=read("views.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/src="\.\/auto-sync\.js"/);
 assert.match(html,/href="\.\/auto-sync\.css"/);
 assert.match(html,/NOVASTUDY OS <b>3\.6\.5<\/b>/);
 assert.match(app,/Auto\.handle\(action\)/);
 assert.match(views,/NOVA_AUTO\.panel/);
 assert.match(sw,/novastudy-v3\.6\.5/);
 assert.match(sw,/'\.\/auto-sync\.js'/);
 assert.match(ci,/node --check auto-sync\.js/);
 for(const file of ["auto-sync.js","sync.js","app.js","cloud.js","auth.js"]){
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
 }
});