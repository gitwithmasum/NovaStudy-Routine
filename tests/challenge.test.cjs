const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
let seq=0;
function storage(seed=null){
 const values=new Map(seed===null?[]:[["novastudy_state_v1",seed]]);
 return {values,fail:false,
 getItem(key){if(this.fail)throw Error("read blocked");return values.get(key)??null},
 setItem(key,value){if(this.fail)throw Error("quota exceeded");values.set(key,String(value))}};
}
function boot(store=storage()){
 const w={NOVA_COLORS:["#22aabb"],NOVA_CATALOG:{university:{tracks:{"CSE / Software Engineering":["Math","Programming"]}}},
 NOVA_I18N:{language:"en",t:s=>s,number:x=>String(x),displayDate:s=>s}};
 const ctx={window:w,localStorage:store,Date,Math,JSON,Set,Object,String,Number,Array,crypto:{randomUUID:()=>String(++seq)}};
 for(const file of ["challenge-data.js","core.js","challenge.js"])vm.runInNewContext(read(file),ctx,{filename:file});
 const N=w.NOVA,C=w.NOVA_CHALLENGE;
 C.init({changed:()=>N.save(),toast:()=>{},refresh:()=>{}});
 return {w,N,C,store};
}
test("catalog contains exactly 10 curated blocks and 100 topic/practical task pairs",()=>{
 const {C}=boot();
 assert.equal(C.catalog.blocks.length,10);
 assert.equal(C.catalog.topics.length,100);
 assert.deepEqual(Array.from(C.catalog.topics,x=>x.id),Array.from({length:100},(_,i)=>i+1));
 for(const b of C.catalog.blocks)assert.equal(b.topics.length,10);
 for(const t of C.catalog.topics){
   assert.ok(t.title.length>5);assert.ok(t.learn.length>15);
   assert.ok(t.practice.length>15);assert.ok(t.practiceBn.length>15);
 }
 assert.equal(C.catalog.topics[0].title,"Computational Thinking & Logic");
 assert.equal(C.catalog.topics[99].title,"Future Research & Engineering Capstone");
});
test("exact 60-day schedule is local calendar-based and includes revision days",()=>{
 const {C}=boot();
 assert.equal(C.offset(1),0);assert.equal(C.offset(2),0);
 assert.equal(C.offset(8),3);assert.equal(C.offset(9),4);
 assert.equal(C.offset(10),5);assert.equal(C.offset(11),6);
 assert.equal(C.offset(99),58);assert.equal(C.offset(100),59);
 assert.equal(C.scheduled("2026-10-11",1),"2026-10-11");
 assert.equal(C.scheduled("2026-10-11",100),"2026-12-09");
 assert.equal(C.scheduled("invalid",1),"");
});
test("100 topic import is additive and repeated import is idempotent",()=>{
 const {N,C}=boot();
 N.get().tasks.push({id:"existing",title:"Do not remove",subjectId:"",due:"",done:false});
 N.get().sessions.push({id:"class",day:1,start:"09:00",end:"10:00",subjectId:""});
 assert.equal(N.save(),true);
 assert.equal(C.importBatch(1),10);
 assert.equal(C.setStatus(1,"completed"),true);
 assert.equal(C.importBatch(0),90);
 assert.equal(C.importBatch(0),0);
 assert.equal(C.importBatch(1),0);
 assert.equal(N.get().challenge.items.length,100);
 assert.equal(N.get().challenge.items.find(x=>x.topicId===1).status,"completed");
 assert.equal(N.get().tasks.length,1);
 assert.equal(N.get().sessions.length,1);
 assert.equal(C.summary().completed,1);
});
test("all four statuses and percent reflect real progress",()=>{
 const {C}=boot();
 C.importBatch(1);
 assert.equal(C.setStatus(1,"learning"),true);
 assert.equal(C.setStatus(2,"practiced"),true);
 assert.equal(C.setStatus(3,"completed"),true);
 assert.equal(C.setStatus(4,"unknown"),false);
 assert.equal(C.setStatus(100,"completed"),false);
 const s=C.summary();assert.equal(s.imported,10);
 assert.equal(s.learning,1);assert.equal(s.practiced,1);
 assert.equal(s.completed,1);assert.equal(s.pending,7);
 assert.equal(s.percent,10);
});
test("legacy backup without challenge imports and normalizes safely",()=>{
 const {N}=boot(),old=JSON.parse(JSON.stringify(N.get()));
 delete old.challenge;
 old.tasks.push({id:"legacy",title:"Past task",due:"",done:false});
 assert.equal(N.valid(old),true);
 const restored=boot(storage(JSON.stringify(old)));
 assert.equal(restored.N.get().tasks[0].id,"legacy");
 assert.equal(restored.N.get().challenge.items.length,0);
 assert.equal(restored.C.importBatch(1),10);
});
test("backup roundtrip contains learning statuses and start date",()=>{
 const source=boot();
 source.C.importBatch(0);
 source.C.setStartDate("2026-10-11");
 source.C.setStatus(100,"completed");
 const backup=JSON.parse(JSON.stringify(source.N.get()));
 const fresh=boot();
 assert.equal(fresh.N.setState(backup),true);
 assert.equal(fresh.N.get().challenge.items.length,100);
 assert.equal(fresh.N.get().challenge.startDate,"2026-10-11");
 assert.equal(fresh.N.get().challenge.items.find(x=>x.topicId===100).status,"completed");
});
test("corrupt challenge records, duplicate IDs and invalid dates are rejected",()=>{
 const {N}=boot();
 const good=JSON.parse(JSON.stringify(N.get()));
 good.challenge.items=[{topicId:1,status:"learning"},{topicId:1,status:"completed"}];
 assert.equal(N.valid(good),false);
 good.challenge.items.pop();good.challenge.items[0].status="hacked";
 assert.equal(N.valid(good),false);
 good.challenge.items[0].status="learning";good.challenge.startDate="2026-02-30";
 assert.equal(N.valid(good),false);
 good.challenge.startDate="";good.challenge.items[0].topicId=101;
 assert.equal(N.valid(good),false);
});
test("storage quota failure rolls back challenge edits and preserves saved bytes",()=>{
 const st=storage(),{N,C}=boot(st);
 assert.equal(C.importBatch(1),10);
 const before=st.getItem(N.KEY);
 st.fail=true;
 assert.equal(C.setStatus(1,"completed"),false);
 st.fail=false;
 assert.equal(st.getItem(N.KEY),before);
 assert.equal(N.get().challenge.items[0].status,"not_started");
});
test("Bangla and English views render statuses, tasks and safe controls",()=>{
 const {C,w}=boot();
 C.importBatch(1);
 let h=C.view();
 assert.match(h,/Not Started/);assert.match(h,/Practical task:/);
 assert.match(h,/data-challenge-status/);
 assert.match(h,/type="date"/);
 w.NOVA_I18N.language="bn";
 h=C.view();
 assert.match(h,/শিখছি/);
 assert.match(h,/প্র্যাকটিক্যাল কাজ:/);
 assert.match(h,/ATM থেকে টাকা তোলার/);
});
test("PWA shell, sidebar, mobile nav and GitHub Actions include challenge",()=>{
 const html=read("index.html"),sw=read("sw.js"),app=read("app.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/data-nav="challenge"/);
 assert.match(html,/src="\.\/challenge-data\.js"/);
 assert.match(html,/src="\.\/challenge\.js"/);
 assert.match(html,/href="\.\/challenge\.css"/);
 assert.match(sw,/novastudy-v1\.9\.0/);
 assert.match(sw,/'\.\/challenge-data\.js'/);
 assert.match(app,/CSE\.handleChange/);
 assert.match(ci,/node --check challenge\.js/);
 for(const file of ["challenge-data.js","challenge.js","core.js","app.js","views.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
});
