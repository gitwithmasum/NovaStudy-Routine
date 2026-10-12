const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const FIXED=new Date(2026,9,11,12,0,0);
const TestDate=class extends Date{constructor(...a){super(...(a.length?a:[2026,9,11,12,0,0]))}static now(){return FIXED.getTime()}};
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const fmt=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const mint=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
const escape=v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function fixture(){
 return {version:1,profile:{name:"Student",category:"university",weekStart:6},subjects:[{id:"a",name:"Math"},{id:"b",name:"Programming"}],
  sessions:[{id:"existing",day:0,start:"16:00",end:"17:00",subjectId:"a",repeat:"weekly"}],
  tasks:[{id:"urgent",title:"Exam assignment",subjectId:"a",priority:"high",done:false,due:"2026-10-12"},
   {id:"later",title:"Coding exercise",subjectId:"b",priority:"medium",done:false,due:"2026-10-15"}],
  exams:[{id:"exam1",title:"Midterm",date:"2026-10-13",start:"17:00",end:"17:30",subjectId:"b",done:false}],
  attendance:[],challenge:{startDate:"",items:[]},demo:false}
}
const options={days:3,blocks:2,start:"16:00",end:"20:00",length:50,breakTime:10,preferred:"",mode:"balanced"};
function boot(){
 let state=fixture(),snapshot=JSON.stringify(state),write=snapshot,locked=false,saves=0,allows=true,serial=0,updates=0;
 const storage={getItem:k=>k==="novastudy_state_v1"?write:null,setItem(k,v){if(locked)throw Error("storage full");write=String(v)}};
 const N={
  KEY:"novastudy_state_v1",get:()=>state,date,escape,
  valid:x=>!!x&&x.version===1&&Array.isArray(x.subjects)&&Array.isArray(x.tasks)&&Array.isArray(x.sessions)&&x.sessions.every(s=>mint(s.end)>mint(s.start)),
  validDate:x=>/^\d{4}-\d{2}-\d{2}$/.test(x||""),
  uid:()=>String(++serial),
  min:mint,stamp:fmt,
  occursOn:(s,d)=>s.repeat==="once"?s.date===date(d):s.day===d.getDay()&&(!s.repeatUntil||date(d)<=s.repeatUntil),
  save(){saves++;if(locked||write!==snapshot){state=JSON.parse(snapshot);return false}
    snapshot=JSON.stringify(state);storage.setItem(this.KEY,snapshot);return true},
  getIssue:()=>"Local storage unavailable"
 };
 const I={language:"en",number:x=>String(x),time:s=>s,displayDate:s=>s};
 const V={heading:()=>"<header>Planner</header>",button:(title,action)=>'<button data-action="'+action+'">'+title+'</button>'};
 const W={NOVA:N,NOVA_I18N:I,NOVA_VIEWS:V,confirm:()=>allows};
 const D={querySelector:()=>null},ctx={window:W,document:D,localStorage:storage,Date:TestDate,FormData:class{constructor(form){this.data=form}get(k){return this.data[k]}},
  JSON,Math,Object,Number,String,Set,Map,Array,Error,Promise};
 vm.runInNewContext(read("study-planner.js"),ctx,{filename:"study-planner.js"});
 const planner=W.NOVA_SMART_PLANNER;planner.init({refresh:()=>updates++,toast:()=>{}});
 return {planner,N,I,options:{...options},state:()=>state,raw:()=>write,counts:()=>({saves,updates}),setLocked:v=>locked=v,
  setAllow:v=>allows=v,changeState:s=>{state=s},concurrentRaw:v=>{write=v}};
}
test("preview-only scheduling avoids weekly classes and exact exam-time conflicts",()=>{
 const x=boot(),f=x.state();
 const before=JSON.stringify(f);
 const result=x.planner.build(f,x.options,FIXED);
 assert.ok(result.items.length>=3);
 assert.equal(JSON.stringify(f),before);
 for(const block of result.items){
  assert.equal(block.repeat,"once");
  assert.equal(block.type,"Study");
  assert.ok(mint(block.start)>=mint(x.options.start));
  assert.ok(mint(block.end)<=mint(x.options.end));
  assert.ok(block.revisionFor.startsWith("smart-v2:"));
  const d=new Date(block.date+"T12:00:00");
  for(const old of f.sessions)if(x.N.occursOn(old,d)){
   assert.ok(mint(block.end)<=mint(old.start)||mint(block.start)>=mint(old.end));
  }
  for(const exam of f.exams)if(exam.date===block.date)
   assert.ok(mint(block.end)<=mint(exam.start)||mint(block.start)>=mint(exam.end));
 }
});
test("no study blocks in the past today, all dates start today and only within seven days",()=>{
 const x=boot(),opt={...x.options,days:7,start:"09:00",end:"23:00"};
 const now=new Date(2026,9,11,18,1,0),plan=x.planner.build(x.state(),opt,now);
 assert.equal(plan.days.length,7);
 assert.equal(plan.days[0].date,"2026-10-11");
 assert.equal(plan.days[6].date,"2026-10-17");
 for(const b of plan.items)if(b.date==="2026-10-11")assert.ok(mint(b.start)>18*60+1);
});
test("preferred subject influences scheduling for otherwise equally ranked targets",()=>{
 const x=boot(),f=x.state();
 f.tasks=[];f.exams=[];f.sessions=[];
 const opt={...x.options,blocks:1,days:1,preferred:"b"};
 const p=x.planner.build(f,opt,FIXED);
 assert.equal(p.items[0].subjectId,"b");
});
test("exam preparation never scheduled on exam day, even when exam is future day",()=>{
 const x=boot(),f=x.state();f.tasks=[];f.subjects=[];f.sessions=[];
 const p=x.planner.build(f,x.options,FIXED);
 assert.ok(p.items.some(y=>y.revisionFor==="smart-v2:exam:exam1"));
 assert.ok(!p.items.some(y=>y.date==="2026-10-13"&&y.revisionFor==="smart-v2:exam:exam1"));
});
test("hard limits reject malformed options before any changes",()=>{
 const x=boot();
 for(const bad of [{...options,days:8},{...options,blocks:0},{...options,start:"28:00"},
  {...options,end:"16:15"},{...options,preferred:"missing"},{...options,mode:"destroy"}]){
  assert.throws(()=>x.planner.build(x.state(),bad,FIXED));
 }
 assert.equal(x.counts().saves,0);
});
test("preview requires explicit confirm; cancelling preserves original data",()=>{
 const x=boot(),form={...options};
 const before=x.raw();
 assert.equal(x.planner.review(form),true);
 assert.equal(x.counts().saves,0);assert.equal(x.raw(),before);
 x.setAllow(false);assert.equal(x.planner.apply(),false);
 assert.equal(x.raw(),before);
});
test("confirmed preview adds one-time blocks only and persists existing tasks",()=>{
 const x=boot();const prior=JSON.stringify(x.state().tasks);
 assert.equal(x.planner.review({...options}),true);
 const n=x.planner.getPreview().items.length;
 assert.ok(n>0);
 assert.equal(x.planner.apply(),true);
 assert.equal(x.state().sessions.length,1+n);
 assert.equal(JSON.stringify(x.state().tasks),prior);
 assert.equal(x.counts().saves,1);
 assert.equal(x.planner.getPreview(),null);
});
test("already-generated targets on a given date are excluded on subsequent plans",()=>{
 const x=boot(),plan=x.planner.build(x.state(),x.options,FIXED);
 x.state().sessions.push(...plan.items.map((b,i)=>({id:"smart"+i,...b})));
 const later=x.planner.build(x.state(),x.options,FIXED);
 const keys=new Set(plan.items.map(b=>b.date+"/"+b.revisionFor));
 assert.ok(later.items.every(b=>!keys.has(b.date+"/"+b.revisionFor)));
});
test("concurrent storage change and quota failure never overwrite original local backup",()=>{
 const x=boot();x.planner.review({...options});
 const fresh='{"version":1,"newer":"other tab"}';x.concurrentRaw(fresh);
 assert.equal(x.planner.apply(),false);assert.equal(x.raw(),fresh);
 const y=boot(),before=y.raw();
 y.planner.review({...options});y.setLocked(true);
 assert.equal(y.planner.apply(),false);assert.equal(y.raw(),before);
 assert.equal(y.state().sessions.length,1);
});
test("read-only planner page is bilingual and HTML-escapes task titles",()=>{
 const x=boot();x.state().tasks[0].title='<script>unsafe()</script>';
 let html=x.planner.page();assert.match(html,/smartPlannerForm/);
 x.planner.review({...options});html=x.planner.page();
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>unsafe/);
 assert.match(html,/Confirm & add to routine/);
 x.I.language="bn";html=x.planner.page();
 assert.match(html,/স্টাডি প্ল্যান/);assert.match(html,/প্রিভিউ/);
});
test("integration includes standalone planner, PWA, route and no sync source modifications",()=>{
 const index=read("index.html"),app=read("app.js"),v=read("views.js"),sw=read("sw.js");
 const ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(index,/src="\.\/study-planner\.js"/);
 assert.match(index,/href="\.\/study-planner\.css"/);
 assert.match(index,/data-nav="planner"/);
 assert.match(index,/3\.3\.0/);
 assert.match(app,/Planner\.page\(\)/);assert.match(app,/Planner\.review/);assert.match(app,/Planner\.handle/);
 assert.match(v,/go-planner/);
 assert.match(sw,/novastudy-v3\.3\.0/);
 assert.match(sw,/'\.\/study-planner\.js'/);
 assert.match(ci,/node --check study-planner\.js/);
 for(const f of ["study-planner.js","app.js","dashboard.js","views.js","sw.js"]){
  assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
 }
});