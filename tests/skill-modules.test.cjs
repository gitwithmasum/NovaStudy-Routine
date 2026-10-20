"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
let counter=0;
function boot(initial){
 const key="novastudy_learning_hub_v1",records=new Map(initial?[[key,initial]]:[]);
 let blocked=false,confirm=true,renderCount=0;
 const localStorage={getItem:k=>records.get(k)??null,setItem(k,v){if(blocked)throw Error("quota");records.set(k,String(v))}};
 const w={NOVA_CATALOG:{university:{tracks:{"CSE / Software Engineering":["Python","Mathematics"]}}},NOVA_COLORS:["#12aaab"],NOVA_I18N:{language:"en",number:v=>String(v),displayDate:v=>v,t:x=>x},confirm:()=>confirm};
 const ctx={window:w,localStorage,Date,JSON,Math,Set,Map,Number,String,Array,Object,URL,
 crypto:{randomUUID:()=>String(++counter)},
 queueMicrotask:()=>{},
 FormData:class{constructor(form){this.form=form}get(key){return this.form.fields?.[key]??null}}};
 for(const file of ["challenge-data.js","core.js","challenge.js","learning-hub.js"])
  vm.runInNewContext(read(file),ctx,{filename:file});
 const hub=w.NOVA_LEARNING_HUB;
 hub.init({toast:()=>{},refresh:()=>renderCount++});
 return {hub,w,records,key,setConfirm:x=>confirm=x,setBlocked:x=>blocked=x,get renders(){return renderCount}};
}
const form=(id,fields={},dataset={})=>({id,fields,dataset});
const skill=(name="Cybersecurity")=>form("hubSkillForm",{title:name,description:"Networks and defensive engineering"});
const moduleForm=(skillId,title="Module 01 — Fundamentals",moduleId="")=>form("hubModuleForm",{title,description:"Theory and practice"},{skill:skillId,module:moduleId});
const itemForm=(skillId,moduleId,{title="Intro",kind="topic",body="Lesson",url="",pdf_file=null}={},itemId="")=>
 form("hubItemForm",{title,kind,body,url,pdf_file},{skill:skillId,module:moduleId,item:itemId});
test("six existing skills are available as modular cards, without replacing roadmap tabs or CSE 100",()=>{
 const b=boot(),orig=b.w.NOVA.get();
 const skills=b.hub.activeSkills();
 assert.equal(skills.length,6);
 for(const id of ["skill-programming","skill-dsa","skill-ai","skill-fullstack","skill-projects","skill-resources"])
  assert.ok(skills.some(x=>x.id===id),id);
 assert.ok(b.hub.TABS.includes("skills"));
 b.hub.selectTab("skills");
 const markup=b.hub.page();
 assert.match(markup,/data-action="hub-skill-open"/);
 assert.match(markup,/data-action="hub-skill-add"/);
 assert.match(markup,/Skills & Modules/);
 assert.ok(b.hub.TABS.includes("challenge"));
 assert.equal(b.hub.TABS.includes("fullstack"),false);
 for(const old of ["ai","projects","resources"])assert.equal(b.hub.TABS.includes(old),false);
 assert.equal(b.hub.TABS.includes("dsa"),false);
 const dsa=skills.find(s=>s.id==="skill-dsa");
 assert.equal(dsa.modules.length,24);
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-dsa"}});
 assert.match(b.hub.page(),/data-hub-progress="dsa"/);
 assert.equal(JSON.stringify(b.w.NOVA.get()),JSON.stringify(orig));
});
test("add/edit/delete user Skill; old six remain and edited text is escaped",async()=>{
 const b=boot();
 b.hub.selectTab("skills");
 b.hub.handle("hub-skill-add",{dataset:{}});
 assert.match(b.hub.page(),/id="hubSkillForm"/);
 assert.equal(await b.hub.submit(skill("Cybersecurity")),true);
 let skills=b.hub.activeSkills();assert.equal(skills.length,7);
 const s=skills.find(x=>x.title==="Cybersecurity");assert.ok(s);
 b.hub.handle("hub-skill-open",{dataset:{id:s.id}});
 assert.match(b.hub.page(),/Course Modules/);
 b.hub.handle("hub-skill-edit",{dataset:{id:s.id}});
 assert.match(b.hub.page(),/data-skill="[^"]+"/);
 assert.equal(await b.hub.submit(form("hubSkillForm",{title:"Cybersecurity & Safety",description:"<img src=x onerror=alert(1)>"},{skill:s.id})),true);
 let html=b.hub.page();
 assert.match(html,/Cybersecurity &amp; Safety/);
 assert.match(html,/&lt;img src=x/);
 assert.doesNotMatch(html,/<img src=x/);
 b.setConfirm(false);
 b.hub.handle("hub-skill-delete",{dataset:{id:s.id}});
 assert.equal(b.hub.activeSkills().length,7);
 b.setConfirm(true);
 b.hub.handle("hub-skill-delete",{dataset:{id:s.id}});
 assert.equal(b.hub.activeSkills().length,6);
 assert.ok(b.hub.activeSkills().some(x=>x.id==="skill-ai"));
});
test("built-in skill supports module CRUD and expandable Ostad-style resource list",async()=>{
 const b=boot();b.hub.selectTab("skills");
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-fullstack"}});
 b.hub.handle("hub-module-add",{dataset:{skill:"skill-fullstack"}});
 assert.match(b.hub.page(),/id="hubModuleForm"/);
 assert.equal(await b.hub.submit(moduleForm("skill-fullstack")),true);
 const m=b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules.at(-1);
 assert.ok(m);
 let html=b.hub.page();assert.match(html,/data-action="hub-module-toggle"/);
 b.hub.handle("hub-module-toggle",{dataset:{id:m.id}});
 html=b.hub.page();
 assert.match(html,/aria-expanded="true"/);
 assert.match(html,/Add Topic \/ Code \/ PDF/);
 b.hub.handle("hub-module-edit",{dataset:{id:m.id,skill:"skill-fullstack"}});
 assert.equal(await b.hub.submit(moduleForm("skill-fullstack","Module 01 — Advanced",m.id)),true);
 assert.match(b.hub.page(),/Module 01 — Advanced/);
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules.length,15);
 b.hub.handle("hub-module-delete",{dataset:{id:m.id,skill:"skill-fullstack"}});
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules.length,14);
});
test("add topic, safe code and PDF URL; edit progress; all stay in validated Learning Hub backup",async()=>{
 const b=boot();b.hub.selectTab("skills");
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-programming"}});
 await b.hub.submit(moduleForm("skill-programming","Python Week 1"));
 const mod=b.hub.activeSkills().find(x=>x.id==="skill-programming").modules[0];
 assert.equal(await b.hub.submit(itemForm("skill-programming",mod.id,{title:"Variables",kind:"topic",body:"Variables and types"})),true);
 assert.equal(await b.hub.submit(itemForm("skill-programming",mod.id,{title:"Hello world",kind:"code",body:"print('<script>')"})),true);
 assert.equal(await b.hub.submit(itemForm("skill-programming",mod.id,{title:"Python PDF",kind:"pdf",url:"https://example.org/python.pdf"})),true);
 const m=b.hub.activeSkills().find(x=>x.id==="skill-programming").modules[0];
 assert.deepEqual(Array.from(m.items,x=>x.kind),["topic","code","pdf"]);
 b.hub.handle("hub-module-toggle",{dataset:{id:mod.id}});
 const markup=b.hub.page();
 assert.match(markup,/&lt;script&gt;/);
 assert.match(markup,/rel="noopener noreferrer"/);
 assert.doesNotMatch(markup,/<script>/);
 const code=m.items.find(x=>x.kind==="code");
 b.hub.handle("hub-item-done",{dataset:{id:code.id,skill:"skill-programming",module:mod.id}});
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-programming").modules[0].items[1].done,true);
 const saved=b.hub.get();
 assert.equal(b.hub.valid(saved),true);
 const restored=boot(b.records.get(b.key));
 assert.equal(restored.hub.activeSkills().find(x=>x.id==="skill-programming").modules[0].items.length,3);
});
test("reject malicious PDFs, oversized local uploads and invalid nested skill data",async()=>{
 const b=boot();await b.hub.submit(moduleForm("skill-ai","Machine Learning"));
 const mod=b.hub.activeSkills().find(x=>x.id==="skill-ai").modules.at(-1);
 assert.equal(await b.hub.submit(itemForm("skill-ai",mod.id,{title:"Unsafe",kind:"pdf",url:"javascript:alert(1)"})),false);
 assert.equal(await b.hub.submit(itemForm("skill-ai",mod.id,{title:"Missing",kind:"pdf"})),false);
 assert.equal(await b.hub.submit(itemForm("skill-ai",mod.id,{title:"Big",kind:"pdf",pdf_file:{size:9000000,type:"application/pdf",name:"test.pdf"}})),false);
 assert.equal(await b.hub.submit(itemForm("skill-ai",mod.id,{title:"Local",kind:"pdf",pdf_file:{size:123,type:"application/pdf",name:"notes.pdf"}})),false);
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-ai").modules[0].items.length,0);
 const copy=b.hub.get();copy.skills[0].modules.push({id:"m",title:"Bad",description:"",items:[{id:"i",kind:"pdf",title:"bad",body:"",url:"javascript:evil()",fileName:"",localId:"",done:false}]});
 assert.equal(b.hub.valid(copy),false);
});
test("browser quota conflict preserves previous saved lessons and old backups with no skills are compatible",async()=>{
 const b=boot();await b.hub.submit(skill("Security"));
 const before=b.records.get(b.key);
 b.setBlocked(true);
 assert.equal(await b.hub.submit(skill("Data Engineering")),false);
 assert.equal(b.records.get(b.key),before);
 assert.equal(b.hub.activeSkills().length,7);
 const base=b.hub.get();
 delete base.skills;
 assert.equal(b.hub.valid(base),true);
 const previous=boot(JSON.stringify(base));
 assert.equal(previous.hub.activeSkills().length,6);
});
test("app submission delegation, PWA shell and combined JSON include validated learning skill metadata",()=>{
 const app=read("app.js"),sw=read("sw.js"),port=read("portability.js");
 assert.match(app,/hub\(\?:Practice\|Project\|Milestone\|Resource\|Skill\|Module\|Item\)Form/);
 assert.match(sw,/'\.\/learning-hub\.js'/);
 assert.match(port,/learning:H\.KEY/);
 assert.match(port,/if\(k==="learning"\)return H\.valid\(x\)/);
 const css=read("learning-hub.css");
 assert.match(css,/hub-skill-grid/);
 assert.match(css,/hub-skill-module-toggle/);
 assert.match(css,/hub-code/);
});

test("DSA migration preserves statuses and old custom module data",()=>{
 const fresh=boot(),legacy=fresh.hub.get(),dsa=legacy.skills.find(s=>s.id==="skill-dsa");
 dsa.modules=[{id:"custom",title:"My Notes",description:"",items:[]}];
 legacy.roadmaps.dsa={arrays:"completed",hash:"review"};
 delete legacy.dsaModulesV1;
 const b=boot(JSON.stringify(legacy));
 const saved=b.hub.get(),mods=saved.skills.find(s=>s.id==="skill-dsa").modules;
 assert.equal(mods.length,25);
 assert.equal(saved.dsaModulesV1,true);
 assert.equal(saved.roadmaps.dsa.arrays,"completed");
 assert.equal(saved.roadmaps.dsa.hash,"review");
 b.hub.selectTab("skills");
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-dsa"}});
 assert.match(b.hub.page(),/data-topic-id="arrays"/);
 assert.equal(b.hub.handleChange({dataset:{hubProgress:"dsa",topicId:"hash"},value:"practiced"}),true);
 assert.equal(b.hub.get().roadmaps.dsa.hash,"practiced");
 b.hub.handle("hub-module-delete",{dataset:{id:"dsa-arrays",skill:"skill-dsa"}});
 const reloaded=boot(b.records.get(b.key)),after=reloaded.hub.activeSkills().find(s=>s.id==="skill-dsa").modules;
 assert.equal(after.length,24);
 assert.equal(after.some(m=>m.id==="dsa-arrays"),false);
 assert.equal(after.some(m=>m.id==="custom"),true);
});
test("older backups without a skills field get all DSA topics on import",()=>{
 const b=boot(),old=b.hub.get();
 delete old.skills;delete old.dsaModulesV1;
 old.roadmaps.dsa.arrays="learning";
 assert.equal(b.hub.save(old,{replace:true}),true);
 assert.equal(b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.length,24);
 assert.equal(b.hub.get().roadmaps.dsa.arrays,"learning");
});

test("AI and Full Stack seed fourteen modules with original milestone dropdowns",()=>{
 const b=boot(),skills=b.hub.activeSkills();
 for(const [id,roadmap] of [["skill-ai","ai"],["skill-fullstack","fullstack"]]){
  const skill=skills.find(x=>x.id===id);assert.equal(skill.modules.length,14);
  b.hub.handle("hub-skill-open",{dataset:{id}});
  const html=b.hub.page();
  assert.match(html,new RegExp('data-hub-progress="'+roadmap+'"'));
  assert.match(html,/data-action="hub-module-edit"/);
  assert.match(html,/data-action="hub-module-delete"/);
  assert.equal(b.hub.handleChange({dataset:{hubProgress:roadmap,topicId:b.hub.ROADMAPS[roadmap][0][0]},value:"completed"}),true);
  assert.equal(b.hub.get().roadmaps[roadmap][b.hub.ROADMAPS[roadmap][0][0]],"completed");
 }
});
test("Projects and Resources are modules that retain functional legacy data managers",()=>{
 const b=boot();
 for(const [name,module,formId] of [["skill-projects","projects-workspace","hubProjectForm"],["skill-resources","resources-library","hubResourceForm"]]){
  b.hub.handle("hub-skill-open",{dataset:{id:name}});
  assert.ok(b.hub.activeSkills().find(s=>s.id===name).modules.some(m=>m.id===module));
  assert.match(b.hub.page(),new RegExp('id="'+formId+'"'));
 }
 assert.equal(b.hub.submit(form("hubProjectForm",{name:"Existing software",stack:"Python",repo:"",live:""})),true);
 assert.equal(b.hub.submit(form("hubResourceForm",{title:"Existing docs",url:"https://docs.python.org",category:"general"})),true);
 assert.equal(b.hub.get().projects[0].name,"Existing software");
 assert.equal(b.hub.get().resources[0].title,"Existing docs");
 const copy=boot(b.records.get(b.key));
 copy.hub.handle("hub-skill-open",{dataset:{id:"skill-projects"}});
 assert.match(copy.hub.page(),/Existing software/);
 copy.hub.handle("hub-skill-open",{dataset:{id:"skill-resources"}});
 assert.match(copy.hub.page(),/Existing docs/);
});
test("older v3.6.1 backups migrate once without losing progress or custom AI modules",()=>{
 const b=boot(),legacy=b.hub.get();
 legacy.skills.find(s=>s.id==="skill-ai").modules=[{id:"my-ai",title:"Personal AI",description:"",items:[]}];
 for(const name of ["skill-fullstack","skill-projects","skill-resources"])legacy.skills.find(s=>s.id===name).modules=[];
 legacy.roadmaps.ai.math="review";legacy.roadmaps.fullstack.js="completed";
 delete legacy.skillModulesV2;
 const updated=boot(JSON.stringify(legacy)),state=updated.hub.get();
 assert.equal(state.skillModulesV2,true);
 assert.equal(state.skills.find(s=>s.id==="skill-ai").modules.length,15);
 assert.equal(state.skills.find(s=>s.id==="skill-fullstack").modules.length,14);
 assert.equal(state.skills.find(s=>s.id==="skill-projects").modules.length,1);
 assert.equal(state.skills.find(s=>s.id==="skill-resources").modules.length,1);
 assert.equal(state.roadmaps.ai.math,"review");
 assert.equal(state.roadmaps.fullstack.js,"completed");
 updated.hub.handle("hub-module-delete",{dataset:{skill:"skill-ai",id:"ai-python"}});
 const restored=boot(updated.records.get(updated.key));
 assert.equal(restored.hub.activeSkills().find(s=>s.id==="skill-ai").modules.length,14);
 assert.equal(restored.hub.activeSkills().find(s=>s.id==="skill-ai").modules.some(m=>m.id==="ai-python"),false);
});

test("Codeforces Python CP phases retain original 14 DSA lessons and add 10 checked modules",()=>{
 const b=boot(),skill=b.hub.activeSkills().find(x=>x.id==="skill-dsa");
 const cp=skill.modules.filter(x=>x.id.startsWith("dsa-cp-"));
 assert.equal(skill.modules.length,24);assert.equal(cp.length,10);
 assert.equal(cp[0].id,"dsa-cp-basics");
 assert.ok(cp[0].items.some(x=>x.title.includes("sys.stdin.buffer")));
 assert.ok(cp[6].items.some(x=>x.title.includes("Knapsack")));
 assert.ok(cp.every(x=>x.items.length>0&&x.items.every(item=>item.kind==="topic"&&!item.done)));
 assert.equal(b.hub.ROADMAPS.dsa.length,24);
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-dsa"}});
 assert.match(b.hub.page(),/CP 01 — Python CP Basics/);
 assert.equal(b.hub.handleChange({dataset:{hubProgress:"dsa",topicId:"cp-basics"},value:"learning"}),true);
 assert.equal(b.hub.get().roadmaps.dsa["cp-basics"],"learning");
 b.hub.handle("hub-item-done",{dataset:{skill:"skill-dsa",module:cp[0].id,id:cp[0].items[0].id}});
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-dsa").modules.find(x=>x.id===cp[0].id).items[0].done,true);
});
test("Python CP one-time migration preserves old notes and does not recreate deleted phases",()=>{
 const old=boot().hub.get(),skill=old.skills.find(x=>x.id==="skill-dsa");
 skill.modules=skill.modules.filter(x=>!x.id.startsWith("dsa-cp-"));
 skill.modules[0].items.push({id:"old-note",kind:"topic",title:"My notes",body:"Keep me",url:"",fileName:"",localId:"",done:true});
 old.roadmaps.dsa.arrays="completed";delete old.cpRoadmapV1;
 const b=boot(JSON.stringify(old)),state=b.hub.get(),modules=state.skills.find(x=>x.id==="skill-dsa").modules;
 assert.equal(modules.length,24);
 assert.equal(modules[0].items[0].body,"Keep me");
 assert.equal(state.roadmaps.dsa.arrays,"completed");
 assert.equal(state.cpRoadmapV1,true);
 const reload=boot(b.records.get(b.key));
 assert.equal(reload.hub.activeSkills().find(x=>x.id==="skill-dsa").modules.length,24);
 reload.hub.handle("hub-module-delete",{dataset:{skill:"skill-dsa",id:"dsa-cp-basics"}});
 const again=boot(reload.records.get(reload.key));
 assert.equal(again.hub.activeSkills().find(x=>x.id==="skill-dsa").modules.length,23);
 assert.equal(again.hub.activeSkills().find(x=>x.id==="skill-dsa").modules.some(x=>x.id==="dsa-cp-basics"),false);
});
