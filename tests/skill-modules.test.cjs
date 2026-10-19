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
 assert.ok(b.hub.TABS.includes("fullstack"));
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
 const m=b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules[0];
 assert.ok(m);
 let html=b.hub.page();assert.match(html,/data-action="hub-module-toggle"/);
 b.hub.handle("hub-module-toggle",{dataset:{id:m.id}});
 html=b.hub.page();
 assert.match(html,/aria-expanded="true"/);
 assert.match(html,/Add Topic \/ Code \/ PDF/);
 b.hub.handle("hub-module-edit",{dataset:{id:m.id,skill:"skill-fullstack"}});
 assert.equal(await b.hub.submit(moduleForm("skill-fullstack","Module 01 — Advanced",m.id)),true);
 assert.match(b.hub.page(),/Module 01 — Advanced/);
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules.length,1);
 b.hub.handle("hub-module-delete",{dataset:{id:m.id,skill:"skill-fullstack"}});
 assert.equal(b.hub.activeSkills().find(x=>x.id==="skill-fullstack").modules.length,0);
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
 const mod=b.hub.activeSkills().find(x=>x.id==="skill-ai").modules[0];
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
