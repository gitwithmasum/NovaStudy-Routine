const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const code=fs.readFileSync(path.join(__dirname,"..","sync.js"),"utf8");
function task(id,title){return{id,title,done:false}}
function sample(tasks=[task("a","Original")]){return{version:1,profile:{name:"Student",track:"CSE",reminders:false},subjects:[],sessions:[],tasks,exams:[],attendance:[],challenge:{startDate:"",items:[]},demo:false}}
function server(){return {row:{user_id:"person",snapshot:sample(),revision:1,updated_at:"2026-10-11"},writes:0}}
function device(srv,{initial=sample(),account="person"}={}){
 let local=JSON.parse(JSON.stringify(initial)),uid=account,confirmed=true,downloadCount=0,restoreCount=0,notice=[],storage=new Map();
 const clone=x=>JSON.parse(JSON.stringify(x));
 const client={from(){
  return{
   select(){return query("select")},insert(value){return query("insert",value)},
   update(value){return query("update",value)}
  };
  function query(action,value){
   return{
    filters:[],eq(k,v){this.filters.push([k,v]);return this},
    select(){return this},async maybeSingle(){
     if(action==="select")return{data:srv.row&&srv.row.user_id===uid?clone(srv.row):null,error:null};
     if(action==="update"){
      const revision=this.filters.find(x=>x[0]==="revision")?.[1];
      if(!srv.row||srv.row.revision!==revision)return{data:null,error:null};
      srv.row={...srv.row,...clone(value),updated_at:"2026-10-12"};srv.writes++;
      return{data:clone(srv.row),error:null};
     }
    },
    async single(){
     if(srv.row)return{data:null,error:{code:"23505",message:"duplicate"}};
     srv.row={...clone(value),updated_at:"2026-10-12"};srv.writes++;return{data:clone(srv.row),error:null};
    }
   };
  }
 }};
 const N={KEY:"novastudy_state_v1",get:()=>local,valid:x=>x?.version===1&&Array.isArray(x.tasks)&&Array.isArray(x.subjects)&&x.tasks.every(t=>typeof t.id==="string"&&typeof t.title==="string"),setState:x=>{if(!N.valid(x))return false;local=clone(x);restoreCount++;return true},getIssue:()=>"",date:()=>"2026-10-11",escape:x=>String(x)};
 const W={NOVA:N,NOVA_I18N:{language:"en"},NOVA_AUTH:{getStatus:()=>uid?"connected":"guest",getUser:()=>uid?{id:uid}:null,getClient:()=>client},confirm:()=>confirmed};
 const doc={body:{appendChild(){}},createElement:()=>({click(){downloadCount++},remove(){}})};
 const ctx={window:W,document:doc,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  Blob:class{constructor(parts){this.size=Buffer.byteLength(parts.join(""))}},URL:{createObjectURL:()=>"blob:x",revokeObjectURL(){}},
  setTimeout:()=>{},Object,JSON,Array,Promise,Error,Symbol,Number,Map,Set,String,Buffer};
 vm.runInNewContext(code,ctx,{filename:"sync.js"});
 const sync=W.NOVA_SYNC;sync.init({refresh:()=>{},toast:m=>notice.push(m)});
 return{sync,N,setLocal:s=>{local=clone(s)},local:()=>local,setAccount:v=>{uid=v},setConfirm:v=>{confirmed=v},downloads:()=>downloadCount,restores:()=>restoreCount,notifications:()=>notice,storage};
}
test("smart sync merge combines independent per-id changes",()=>{
 const d=device(server());
 const base=sample();
 const left=sample([task("a","Original"),task("l","Laptop")]);
 const right=sample([task("a","Original"),task("m","Mobile")]);
 const r=d.sync.merge(base,left,right);
 assert.equal(r.conflicts.length,0);
 assert.deepEqual(Array.from(r.merged.tasks,x=>x.id),["a","l","m"]);
});
test("same item edits and edit-versus-delete surface conflicts",()=>{
 const d=device(server()),base=sample(),left=sample([task("a","Laptop")]),right=sample([task("a","Mobile")]);
 const r=d.sync.merge(base,left,right);
 assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0],"tasks.a");
 assert.equal(d.sync.merge(base,left,right,"local").merged.tasks[0].title,"Laptop");
 assert.equal(d.sync.merge(base,left,right,"cloud").merged.tasks[0].title,"Mobile");
 const deleted=d.sync.merge(base,sample([]),right);
 assert.equal(deleted.conflicts.length,1);
 assert.equal(d.sync.merge(base,sample([]),right,"local").merged.tasks.length,0);
 assert.equal(d.sync.merge(base,sample([]),right,"cloud").merged.tasks[0].title,"Mobile");
});
test("independent CSE progress topic IDs and profile fields merge",()=>{
 const d=device(server()),base=sample(),left=sample(),right=sample();
 left.challenge.items=[{topicId:1,status:"completed"}];
 right.challenge.items=[{topicId:2,status:"practiced"}];
 left.profile.name="Laptop";right.profile.track="AI";
 const m=d.sync.merge(base,left,right);
 assert.equal(m.conflicts.length,0);
 assert.equal(m.merged.challenge.items.length,2);
 assert.equal(m.merged.profile.name,"Laptop");assert.equal(m.merged.profile.track,"AI");
});
test("no automatic upload or restore and review never mutates either copy",async()=>{
 const srv=server(),d=device(srv,{initial:sample([task("a","Local")])});
 assert.equal(srv.writes,0);assert.equal(d.restores(),0);
 assert.equal(await d.sync.review(),true);
 assert.equal(srv.writes,0);assert.equal(d.restores(),0);
 assert.ok(d.sync.getPreview().conflicts.length>0);
 assert.equal(await d.sync.apply(null),false);
 assert.equal(srv.writes,0);
});
test("explicit local choice confirms and syncs, leaving JSON recovery copy",async()=>{
 const srv=server(),d=device(srv,{initial:sample([task("a","Local")])});
 await d.sync.review();
 assert.equal(await d.sync.apply("local"),true);
 assert.equal(srv.row.revision,2);
 assert.equal(srv.row.snapshot.tasks[0].title,"Local");
 assert.equal(d.downloads(),1);
 assert.equal(d.sync.getBaseline().revision,2);
});
test("reject changed cloud revision from another device after preview",async()=>{
 const srv=server(),d=device(srv);
 await d.sync.review();
 srv.row={...srv.row,revision:2};
 assert.equal(await d.sync.apply(null),false);
 assert.equal(srv.writes,0);
});
test("reject local edits after preview, keep unmodified cloud",async()=>{
 const srv=server(),d=device(srv);
 await d.sync.review();
 d.setLocal(sample([task("a","Changed after review")]));
 assert.equal(await d.sync.apply(null),false);assert.equal(srv.writes,0);
});
test("require review and confirmation for first cloud copy",async()=>{
 const srv=server();srv.row=null;
 const d=device(srv,{initial:sample([task("a","My task")])});
 assert.equal(await d.sync.review(),true);
 d.setConfirm(false);assert.equal(await d.sync.apply(null),false);assert.equal(srv.row,null);
 d.setConfirm(true);assert.equal(await d.sync.apply(null),true);
 assert.equal(srv.row.revision,1);assert.equal(srv.row.snapshot.tasks[0].title,"My task");
});
test("stale another-tab browser storage blocks sync even if in-memory state is unchanged",async()=>{
 const srv=server(),d=device(srv);
 await d.sync.review();
 d.storage.set("novastudy_state_v1","another-tab-updated-data");
 assert.equal(await d.sync.apply(null),false);
 assert.equal(srv.writes,0);
});
test("account changes forbid uploading and clear preview",async()=>{
 const srv=server(),d=device(srv);
 await d.sync.review();d.setAccount("other-person");
 assert.equal(await d.sync.apply(null),false);assert.equal(srv.writes,0);
 assert.doesNotMatch(d.sync.panel(),/Same item conflict/);
});
test("unchanged copies sync without cloud revision churn",async()=>{
 const srv=server(),d=device(srv);
 await d.sync.review();
 assert.equal(await d.sync.apply(null),true);assert.equal(srv.writes,0);
 assert.equal(d.sync.getBaseline().revision,1);
});
test("manual backup and restore can refresh sync baseline",()=>{
 const d=device(server());
 assert.equal(d.sync.acceptSnapshot(sample(),4),true);
 assert.equal(d.sync.getBaseline().revision,4);
 d.sync.clearBaseline();
 assert.equal(d.sync.getBaseline(),null);
});
test("new device without baseline never drops one-sided entries",()=>{
 const d=device(server());
 const m=d.sync.merge(null,sample([task("local","here")]),sample([task("cloud","there")]));
 assert.deepEqual(Array.from(m.merged.tasks,x=>x.id),["local","cloud"]);
});
test("v2.1 registered in UI, service worker and CI",()=>{
 const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
 const html=read("index.html"),views=read("views.js"),app=read("app.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/src="\.\/sync\.js"/);assert.match(html,/href="\.\/sync\.css"/);
 assert.match(html,/NOVASTUDY OS <b>2\.8\.0<\/b>/);
 assert.match(views,/NOVA_SYNC\.panel/);assert.match(app,/Sync\.handle\(action\)/);
 assert.match(sw,/novastudy-v2\.8\.0/);assert.match(sw,/'\.\/sync\.js'/);
 assert.match(ci,/node --check sync\.js/);
 for(const f of ["sync.js","app.js","auth.js","cloud.js","views.js"])
   assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
});
