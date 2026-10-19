const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function boot(initial){
 let saved=initial?JSON.stringify(initial):null,serial=0,fail=false,toasts=[],renders=0;
 const values=new Map(initial?[["novastudy_state_v1",saved]]:[]);
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(fail)throw Error("quota");values.set(k,String(v))}};
 const win={NOVA_COLORS:["#22aabb"],NOVA_CATALOG:{university:{tracks:{"CSE / Software Engineering":["Math","Programming"]}}},
 NOVA_I18N:{language:"en",t:s=>s,number:x=>String(x),displayDate:x=>x,time:x=>x},
 NOVA_VIEWS:{button:(text,action,cls,id)=>'<button data-action="'+action+'" data-id="'+id+'">'+text+'</button>',heading:(...v)=>v.join(" ")}};
 const FormData=class{constructor(form){this.fields=form}get(k){return this.fields[k]}};
 const ctx={window:win,localStorage:storage,Date,Math,JSON,Set,Object,Array,Number,String,crypto:{randomUUID:()=>String(++serial)},FormData,
 document:{querySelectorAll:()=>[]}};
 for(const p of ["core.js","exam-prep.js","exams.js"])vm.runInNewContext(read(p),ctx,{filename:p});
 const N=win.NOVA,Prep=win.NOVA_EXAM_PREP,Exams=win.NOVA_EXAMS;
 Prep.init({changed:()=>N.save(),toast:msg=>toasts.push(msg),refresh:()=>renders++});
 return{N,Prep,Exams,storage,win,getToasts:()=>toasts,setFail:x=>fail=x,getRenders:()=>renders};
}
function addExam(N,params={}){
 const exam={id:N.uid(),title:"Networking Midterm",subjectId:N.get().subjects[0].id,
 date:"2026-10-17",start:"10:00",end:"11:00",place:"",notes:"",done:false,...params};
 N.get().exams.push(exam);assert.equal(N.save(),true);return exam;
}
function topicForm(title){return{title}}
function mockForm(score,total=100,date="2026-10-10",notes=""){return{score:String(score),total:String(total),date,notes}}
test("legacy exams load with no prep and do not fabricate readiness",()=>{
 const b=boot(),e=addExam(b.N);
 assert.deepEqual(b.Prep.metrics(e).indicator,null);
 assert.equal(b.N.valid(b.N.get()),true);
 assert.equal(Object.hasOwn(e,"prep"),false);
});
test("topic checklist toggles and weak-topic flags persist in the original local backup",()=>{
 const b=boot(),e=addExam(b.N);
 b.Prep.selectExam(e.id);
 assert.equal(b.Prep.addTopic(topicForm("Normal forms")),true);
 assert.equal(b.Prep.addTopic(topicForm("SQL joins")),true);
 let p=b.Prep.getPrep(e);assert.equal(p.topics.length,2);
 assert.equal(b.Prep.handle("prep-toggle-topic",p.topics[0].id),true);
 assert.equal(b.Prep.handle("prep-weak-topic",p.topics[1].id),true);
 p=b.Prep.getPrep(e);
 assert.equal(b.Prep.metrics(e).topicsPct,50);
 assert.equal(b.Prep.metrics(e).weak.length,1);
 assert.equal(b.N.valid(b.N.get()),true);
 const raw=JSON.parse(b.storage.getItem(b.N.KEY));
 assert.equal(raw.exams[0].prep.topics[0].done,true);
 assert.equal(raw.exams[0].prep.topics[1].weak,true);
});
test("mock tests calculate indicator only after real checklist and mock data",()=>{
 const b=boot(),e=addExam(b.N);b.Prep.selectExam(e.id);
 b.Prep.addTopic(topicForm("One"));b.Prep.addTopic(topicForm("Two"));
 let m=b.Prep.metrics(e);assert.equal(m.indicator,null);
 assert.equal(b.Prep.addMock(mockForm(40,50)),true);
 m=b.Prep.metrics(e);assert.equal(m.mockPct,80);assert.equal(m.indicator,32);
 const topic=b.Prep.getPrep(e).topics[0];
 b.Prep.handle("prep-toggle-topic",topic.id);
 m=b.Prep.metrics(e);assert.equal(m.topicsPct,50);assert.equal(m.indicator,62);
});
test("latest dated mock is selected even when older attempt is entered afterward",()=>{
 const b=boot(),e=addExam(b.N);b.Prep.selectExam(e.id);
 b.Prep.addMock(mockForm(85,100,"2026-10-10"));
 b.Prep.addMock(mockForm(17,100,"2026-10-09"));
 const m=b.Prep.metrics(e);
 assert.equal(m.latest.date,"2026-10-10");assert.equal(m.mockPct,85);
});
test("invalid mock scores or future dates never write data",()=>{
 const b=boot(),e=addExam(b.N);b.Prep.selectExam(e.id);const raw=b.storage.getItem(b.N.KEY);
 for(const data of [mockForm(-1,10),mockForm(11,10),mockForm(10,0),mockForm(10,201),
 mockForm("1.2",10),mockForm(8,10,"2035-01-01"),mockForm(8,10,"2026-02-30")]){
  assert.equal(b.Prep.addMock(data),false);
 }
 assert.equal(b.storage.getItem(b.N.KEY),raw);
});
test("duplicate and empty topics are rejected without altering exam",()=>{
 const b=boot(),e=addExam(b.N);b.Prep.selectExam(e.id);
 assert.equal(b.Prep.addTopic(topicForm("  ")),false);
 assert.equal(b.Prep.addTopic(topicForm("Networks")),true);
 assert.equal(b.Prep.addTopic(topicForm(" NETWORKS ")),false);
 assert.equal(b.Prep.getPrep(e).topics.length,1);
});
test("prep metadata is bounded and legacy payload remains import-compatible",()=>{
 const b=boot(),e=addExam(b.N);
 assert.equal(b.N.valid(b.N.get()),true);
 e.prep={topics:[{id:"same",title:"One",done:false,weak:false},{id:"same",title:"Two",done:false,weak:false}],mocks:[]};
 assert.equal(b.N.valid(b.N.get()),false);
 e.prep={topics:[],mocks:[{id:"1",score:100,total:10,date:"2026-10-10",notes:""}]};
 assert.equal(b.N.valid(b.N.get()),false);
 e.prep={topics:[],mocks:[]};
 assert.equal(b.N.valid(b.N.get()),true);
});
test("storage error rolls back prep write and keeps previously saved exam",()=>{
 const b=boot(),e=addExam(b.N);b.Prep.selectExam(e.id);
 const before=b.storage.getItem(b.N.KEY);
 b.setFail(true);
 assert.equal(b.Prep.addTopic(topicForm("Failed write")),false);
 assert.equal(b.storage.getItem(b.N.KEY),before);
 assert.equal(b.N.get().exams[0].prep,undefined);
});
test("per-exam preparation records stay separate and exam editor shape is unaffected",()=>{
 const b=boot(),a=addExam(b.N),c=addExam(b.N,{title:"Math Final"});
 b.Prep.selectExam(a.id);b.Prep.addTopic(topicForm("OSI model"));
 b.Prep.selectExam(c.id);b.Prep.addMock(mockForm(78));
 assert.equal(b.Prep.getPrep(a).topics.length,1);
 assert.equal(b.Prep.getPrep(a).mocks.length,0);
 assert.equal(b.Prep.getPrep(c).topics.length,0);
 assert.equal(b.Prep.getPrep(c).mocks.length,1);
});
test("exam page offers preparation entry point and bilingual escaped panel",()=>{
 const b=boot(),e=addExam(b.N,{title:"<script>bad</script>"});b.Prep.selectExam(e.id);
 b.Prep.addTopic(topicForm("<img onerror=alert(1)>"));
 const en=b.Exams.page();
 assert.match(en,/data-action="exam-prep"/);
 assert.match(en,/exam-prep-center/);
 assert.match(en,/&lt;script&gt;bad&lt;\/script&gt;/);
 assert.match(en,/&lt;img onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(en,/<script>bad/);
 b.win.NOVA_I18N.language="bn";
 assert.match(b.Exams.page(),/প্রিপারেশন সেন্টার/);
});
test("v2.5 PWA, CSS, app, and CI include new preparation module without sync edits",()=>{
 const h=read("index.html"),a=read("app.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(h,/src="\.\/exam-prep\.js"/);assert.match(h,/href="\.\/exam-prep\.css"/);
 assert.match(h,/NOVASTUDY OS <b>3\.6\.1<\/b>/);
 assert.match(a,/Prep\.handle\(action,id\)/);assert.match(a,/Prep\.handleChange/);
 assert.match(sw,/novastudy-v3\.6\.1/);assert.match(sw,/'\.\/exam-prep\.js'/);
 assert.match(ci,/node --check exam-prep\.js/);
 for(const f of ["core.js","exams.js","exam-prep.js","app.js"])
  assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
});
