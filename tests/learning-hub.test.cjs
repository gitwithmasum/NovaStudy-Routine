const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const HUB="novastudy_learning_hub_v1";
let serial=0;
function boot(stored=null){
 const values=new Map(stored===null?[]:[[HUB,stored]]);
 let blocked=false,confirm=true,notices=[],renders=0;
 const storage={getItem:k=>values.get(k)??null,setItem(k,v){if(blocked)throw Error("quota exceeded");values.set(k,String(v));},removeItem:k=>values.delete(k)};
 const w={NOVA_CATALOG:{university:{tracks:{"CSE / Software Engineering":["Python","Math"]}}},NOVA_COLORS:["#12aaab"],
 NOVA_I18N:{language:"en",number:v=>String(v),displayDate:v=>v,t:s=>s},
 confirm:()=>confirm};
 const ctx={window:w,localStorage:storage,Date,JSON,Math,Set,Map,Number,String,Array,Object,
 crypto:{randomUUID:()=>String(++serial)},URL,
 FormData:class{constructor(o){this.fields=o}get(k){return this.fields[k]??null}}};
 for(const p of ["challenge-data.js","core.js","challenge.js","learning-hub.js"])vm.runInNewContext(read(p),ctx,{filename:p});
 const N=w.NOVA,C=w.NOVA_CHALLENGE,Hub=w.NOVA_LEARNING_HUB;
 C.init({changed:()=>N.save(),toast:()=>{},refresh:()=>{renders++}});
 Hub.init({toast:m=>notices.push(m),refresh:()=>{renders++}});
 return {Hub,N,C,values,storage,w,notices,rendered:()=>renders,setBlocked:b=>blocked=b,setConfirm:b=>confirm=b};
}
const practice=(changes={})=>({title:"Two Sum",language:"Python",difficulty:"easy",platform:"LeetCode",url:"https://leetcode.com/problems/two-sum",notes:"Hash map",date:"2026-10-11",...changes});
const project=(changes={})=>({name:"Portfolio",stack:"React, TypeScript",repo:"https://github.com/test/repo",live:"",...changes});
const resource=(changes={})=>({title:"Python docs",url:"https://docs.python.org/3/",category:"general",...changes});
test("valid fresh Hub and independent key do not touch routine or CSE 100",()=>{
 const b=boot();const routine=JSON.stringify(b.N.get());
 assert.ok(b.Hub.valid(b.Hub.get()));
 assert.equal(b.Hub.createPractice(practice()),true);
 assert.equal(b.Hub.get().practice.length,1);
 assert.equal(JSON.stringify(b.N.get()),routine);
 assert.equal(b.values.has(b.N.KEY),false);
 assert.equal(JSON.parse(b.values.get(HUB)).practice[0].language,"Python");
});
test("CSE 100 uses old imported topics and completed statuses after navigation",()=>{
 const b=boot();
 assert.equal(b.C.importBatch(1),10);
 assert.equal(b.C.setStatus(1,"completed"),true);
 b.Hub.selectTab("challenge");
 const html=b.Hub.page();
 assert.match(html,/CSE 100 Learning Challenge/);
 assert.match(html,/10\s*\/?\s*100|10\/100|100 topics/i);
 assert.equal(b.Hub.analytics().cse.completed,1);
 assert.equal(b.N.get().challenge.items.length,10);
 assert.equal(b.Hub.get().practice.length,0);
});
test("programming problems validate duplicate, fields, statuses and safe URLs",()=>{
 const b=boot();
 assert.equal(b.Hub.createPractice(practice()),true);
 assert.equal(b.Hub.createPractice(practice()),false);
 assert.equal(b.Hub.createPractice(practice({title:"Bad",url:"javascript:alert(1)"})),false);
 assert.equal(b.Hub.get().practice.length,1);
 let id=b.Hub.get().practice[0].id;
 assert.equal(b.Hub.handleChange({dataset:{hubPractice:id},value:"completed"}),true);
 assert.equal(b.Hub.analytics().solved,1);
 assert.equal(b.Hub.handleChange({dataset:{hubPractice:id},value:"incorrect"}),true);
 assert.equal(b.Hub.get().practice[0].status,"completed");
});
test("three roadmaps preserve independent statuses, review flags, and completed-only analytics",()=>{
 const b=boot(),topics=b.Hub.ROADMAPS;
 assert.ok(topics.dsa.length>=12&&topics.ai.length>=12&&topics.fullstack.length>=12);
 for(const [kind,record] of [["dsa","completed"],["ai","learning"],["fullstack","review"]]){
  const id=topics[kind][0][0];
  assert.equal(b.Hub.handleChange({dataset:{hubProgress:kind,topicId:id},value:record}),true);
 }
 let a=b.Hub.analytics();
 assert.equal(a.roadmaps.dsa.completed,1);
 assert.equal(a.roadmaps.ai.completed,0);
 assert.equal(a.roadmaps.fullstack.review,1);
 assert.equal(b.Hub.get().roadmaps.fullstack[topics.fullstack[0][0]],"review");
});
test("project and milestones track completion without changing original student projects/routine",()=>{
 const b=boot(),original=JSON.stringify(b.N.get());
 assert.equal(b.Hub.createProject(project()),true);
 const id=b.Hub.get().projects[0].id;
 assert.equal(b.Hub.addMilestone({projectId:id,title:"Deploy frontend"}),true);
 const milestone=b.Hub.get().projects[0].milestones[0].id;
 assert.equal(b.Hub.handleChange({dataset:{hubMilestone:milestone,section:id},checked:true}),true);
 assert.equal(b.Hub.get().projects[0].milestones[0].done,true);
 assert.equal(b.Hub.handleChange({dataset:{hubProject:id},value:"completed"}),true);
 assert.equal(b.Hub.analytics().completedProjects,1);
 assert.equal(JSON.stringify(b.N.get()),original);
});
test("resource link validation rejects malicious protocols and escapes text",()=>{
 const b=boot();
 assert.equal(b.Hub.createResource(resource()),true);
 assert.equal(b.Hub.createResource(resource({title:"Bad",url:"data:text/html,hi"})),false);
 assert.equal(b.Hub.createResource(resource({title:"<script>alert(1)</script>",url:"https://example.com"})),true);
 b.Hub.selectTab("resources");
 let html=b.Hub.page();assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);
 assert.match(html,/rel="noopener noreferrer"/);
});
test("legacy routine backup roundtrip preserves CSE 100 and separate Learning Hub",()=>{
 const a=boot();
 a.C.importBatch(1);a.C.setStatus(1,"completed");
 a.Hub.createPractice(practice());
 const old=JSON.parse(JSON.stringify(a.N.get()));
 assert.equal(a.N.setState(old),true);
 assert.equal(a.N.get().challenge.items.find(x=>x.topicId===1).status,"completed");
 assert.equal(a.Hub.get().practice.length,1);
 const b=boot(a.values.get(HUB));
 assert.equal(b.Hub.get().practice.length,1);
 assert.equal(b.N.get().challenge.items.length,0); // must restore routine JSON separately
});
test("Learning Hub JSON validation rejects unsafe or damaged backups",()=>{
 const b=boot();b.Hub.createPractice(practice());
 const original=b.Hub.get();original.practice.push({...original.practice[0]});
 assert.equal(b.Hub.valid(original),false);
 original.practice.pop();original.practice[0].url="javascript:alert(1)";
 assert.equal(b.Hub.valid(original),false);
 assert.equal(b.Hub.valid({version:1,practice:[],projects:[],resources:[],roadmaps:{dsa:{},ai:{},fullstack:{}}}),true);
});
test("quota failure protects prior bytes and does not mutate in-memory records",()=>{
 const b=boot();b.Hub.createPractice(practice());
 const saved=b.values.get(HUB);
 b.setBlocked(true);
 assert.equal(b.Hub.createProject(project()),false);
 assert.equal(b.values.get(HUB),saved);
 assert.equal(b.Hub.get().projects.length,0);
});
test("concurrent browser tab change prevents overwrite and adopts latest valid records",()=>{
 const b=boot();b.Hub.createPractice(practice());
 const latest=JSON.parse(b.values.get(HUB));
 latest.projects.push({id:"remote",name:"Remote",stack:"",repo:"",live:"",status:"idea",milestones:[]});
 const text=JSON.stringify(latest);
 b.values.set(HUB,text);
 assert.equal(b.Hub.createProject(project()),false);
 assert.equal(b.values.get(HUB),text);
 assert.equal(b.Hub.get().projects[0].name,"Remote");
});
test("malformed stored data protected; explicit valid local reset is possible",()=>{
 const b=boot("{corrupted");
 assert.equal(b.Hub.createPractice(practice()),false);
 assert.equal(b.values.get(HUB),"{corrupted");
 assert.equal(b.Hub.save({version:1,practice:[],roadmaps:{dsa:{},ai:{},fullstack:{}},projects:[],resources:[]},{replace:true}),true);
 assert.equal(b.Hub.get().practice.length,0);
});
test("Bengali tabs, legacy CSE tab, dashboards and mobile-friendly markup",()=>{
 const b=boot();
 const en=b.Hub.page();assert.match(en,/CSE Learning Hub/);
 assert.match(en,/data-tab="challenge"/);
 assert.match(en,/data-tab="dsa"/);
 b.w.NOVA_I18N.language="bn";
 assert.match(b.Hub.page(),/সিএসই লার্নিং হাব/);
 b.Hub.selectTab("ai");assert.match(b.Hub.page(),/এআই ও এমএল/);
 b.Hub.selectTab("projects");assert.match(b.Hub.page(),/প্রজেক্ট/);
});
test("existing #challenge bookmark maps into learning navigation and CSE remains in old catalog",()=>{
 const html=read("index.html"),app=read("app.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/data-nav="learning"/);
 assert.doesNotMatch(html,/data-nav="challenge"/);
 assert.match(html,/href="\.\/learning-hub\.css"/);
 assert.match(html,/src="\.\/learning-hub\.js"/);
 assert.match(html,/NOVASTUDY OS <b>3\.5\.14<\/b>/);
 assert.match(app,/Hub\.selectTab\("challenge",true\)/);
 assert.match(app,/Hub\.page\(\)/);
 assert.match(app,/Hub\.handleChange/);
 assert.match(sw,/novastudy-v3\.5\.14/);
 assert.match(sw,/'\.\/learning-hub\.js'/);
 assert.match(ci,/node --check learning-hub\.js/);
 for(const f of ["learning-hub.js","app.js","core.js","challenge.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(f),{filename:f}));
});
