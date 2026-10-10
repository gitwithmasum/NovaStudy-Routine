const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function boot(){
 let remote=null,uid="alice",writes=0,restores=0,confirms=true,downloads=0;
 const local={version:1,profile:{name:"Student"},subjects:[],sessions:[],tasks:[{id:"local",title:"keep"}],exams:[],attendance:[],challenge:{startDate:"",items:[]}};
 const mkrow=(data)=>data&&JSON.parse(JSON.stringify(data));
 const query=(operation,values)=>({
  eq(k,v){this.filters=(this.filters||[]).concat([[k,v]]);return this},
  select(){this.wantSelect=true;return this},
  async maybeSingle(){
   if(operation==="select")return {data:remote?mkrow(remote):null,error:null};
   if(operation==="update"){
    const revision=(this.filters||[]).find(x=>x[0]==="revision")?.[1];
    if(!remote||remote.revision!==revision)return {data:null,error:null};
    remote={...remote,...mkrow(values),updated_at:"2026-10-11T00:00:00Z"};writes++;return {data:mkrow(remote),error:null}
   }
   return {data:null,error:null};
  },
  async single(){
   if(remote)return {error:{code:"23505",message:"duplicate"},data:null};
   remote={...mkrow(values),updated_at:"2026-10-11T00:00:00Z"};writes++;return {data:mkrow(remote),error:null};
  },
  then(resolve,reject){
   const finish=()=>{if(operation==="delete"){
     const revision=(this.filters||[]).find(x=>x[0]==="revision")?.[1],found=remote&&revision===remote.revision;
     if(found){remote=null;writes++}return{data:found?[{user_id:uid}]:[],error:null}}
   };
   return Promise.resolve(finish()).then(resolve,reject);
  }
 });
 const api={from(){return{select(){return query("select")},insert:v=>query("insert",v),update:v=>query("update",v),delete(){return query("delete")}}}};
 const N={get:()=>local,valid:s=>s?.version===1&&Array.isArray(s.tasks),setState(s){if(!this.valid(s))return false;Object.assign(local,JSON.parse(JSON.stringify(s)));restores++;return true},date:()=> "2026-10-11",getIssue:()=>"",escape:s=>String(s)};
 const w={NOVA:N,NOVA_I18N:{language:"en"},NOVA_AUTH:{getUser:()=>uid?{id:uid}:null,getStatus:()=>uid?"connected":"guest",getClient:()=>api},confirm:()=>confirms};
 const doc={createElement:()=>({click(){downloads++},remove(){}}),body:{appendChild(){}},getElementById:()=>null};
 const ctx={window:w,document:doc,Blob:class{},URL:{createObjectURL:()=>"blob:ok",revokeObjectURL(){}},setTimeout:()=>{},JSON,String,Error,Promise};
 vm.runInNewContext(read("cloud.js"),ctx);
 const C=w.NOVA_CLOUD;C.init({toast:()=>{},refresh:()=>{}});
 return {C,N,local,setRemote:x=>{remote=x},getRemote:()=>remote,setUser:x=>{uid=x},getWrites:()=>writes,getRestores:()=>restores,getDownloads:()=>downloads,confirm:x=>{confirms=x}};
}
test("cloud module parses and exposes explicit-only actions",()=>{const b=boot();assert.match(b.C.panel(),/Refresh preview/);assert.equal(b.getWrites(),0);assert.doesNotThrow(()=>new vm.Script(read("cloud.js")))});
test("account scoped upload and preview require confirmation",async()=>{
 const b=boot();b.confirm(false);assert.equal(await b.C.upload(),false);assert.equal(b.getWrites(),0);
 b.confirm(true);assert.equal(await b.C.upload(),true);assert.equal(b.getWrites(),1);assert.equal(b.getRemote().snapshot.tasks[0].id,"local");
 assert.equal(await b.C.readCloud(),true);assert.match(b.C.panel(),/Cloud snapshot/);
});
test("restore backs up locally and requires confirmation",async()=>{
 const b=boot();b.setRemote({revision:2,updated_at:"2026-10-11T00:00:00Z",snapshot:{version:1,tasks:[{id:"cloud",title:"stored"}]}});
 assert.equal(await b.C.readCloud(),true);b.confirm(false);assert.equal(await b.C.restore(),false);assert.equal(b.getRestores(),0);
 b.confirm(true);assert.equal(await b.C.restore(),true);assert.equal(b.local.tasks[0].id,"cloud");assert.equal(b.getDownloads(),1);assert.equal(b.getRestores(),1);
});
test("changed cloud revision blocks restore without changing local data",async()=>{
 const b=boot();b.setRemote({revision:1,snapshot:{version:1,tasks:[{id:"old",title:"old"}]}});
 await b.C.readCloud();b.setRemote({revision:2,snapshot:{version:1,tasks:[{id:"new",title:"new"}]}});
 assert.equal(await b.C.restore(),false);assert.equal(b.getRestores(),0);assert.equal(b.local.tasks[0].id,"local");
});
test("sign-out hides account backup and prevents access",async()=>{
 const b=boot();b.setRemote({revision:1,snapshot:{version:1,tasks:[]}});await b.C.readCloud();
 b.setUser(null);assert.doesNotMatch(b.C.panel(),/Cloud snapshot:/);assert.equal(await b.C.restore(),false);
});
test("manual cloud delete does not delete local records",async()=>{
 const b=boot();b.setRemote({revision:1,snapshot:{version:1,tasks:[]}});await b.C.readCloud();
 assert.equal(await b.C.remove(),true);assert.equal(b.getRemote(),null);assert.equal(b.local.tasks[0].id,"local");
});
test("cloud UI is wired into existing profile and versioned offline cache",()=>{
 const h=read("index.html"),a=read("app.js"),v=read("views.js"),sw=read("sw.js");
 assert.match(h,/src="\.\/cloud\.js"/);assert.match(h,/href="\.\/cloud\.css"/);
 assert.match(a,/Cloud\.handle\(action\)/);assert.match(v,/NOVA_CLOUD\.panel/);
 assert.match(sw,/novastudy-v2\.0\.0/);assert.match(sw,/'\.\/cloud\.js'/);
});
