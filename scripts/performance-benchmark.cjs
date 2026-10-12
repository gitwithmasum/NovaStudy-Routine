/* Node-only rendering microbenchmark. Numbers are not browser frame rates or Web Vitals. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const assert=require("node:assert/strict");
const {performance}=require("node:perf_hooks");
const htmlEsc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const students={profile:{category:"university",track:"CSE / Software Engineering",weekStart:6},
 subjects:[{id:"py",name:"Python"},{id:"ml",name:"Machine Learning"}],
 sessions:[],tasks:Array.from({length:1200},(_,i)=>({
  id:"task-"+i,subjectId:i%2?"py":"ml",title:(i%7===0?"Python algorithms ":"Read chapter ")+i,
  done:i%3===0,priority:i%4===0?"high":"medium",
  due:"2026-10-"+String(i%28+1).padStart(2,"0")
 }))};
const C={university:{name:"University",tracks:{"CSE / Software Engineering":[]}}};
const N={
 get:()=>students,escape:htmlEsc,C,DAYS:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
 colors:["#67bbaa"],name:id=>students.subjects.find(s=>s.id===id)?.name||"General",
 color:()=>"#67bbaa",hour:x=>x,date:d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join("-"),
 subjectPreset:()=>[]};
const I={language:"en",t:x=>x,displayDate:x=>x,time:x=>x};
const win={NOVA:N,NOVA_I18N:I};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","views.js"),"utf8"),
 {window:win,Date,Array,Number,String},{filename:"views.js"});
const V=win.NOVA_VIEWS;
const samples=fn=>{
 const durations=[];
 for(let n=0;n<25;n++){
  const t=performance.now();const result=fn();
  assert.ok(typeof result==="string"&&result.length>100,"Benchmark generated no markup");
  durations.push(performance.now()-t);
 }
 durations.sort((a,b)=>a-b);
 return {medianMs:durations[12],p95Ms:durations[23]};
};
for(let i=0;i<4;i++){V.tasks("all","python");V.taskResults("all","python")}
const all=samples(()=>V.tasks("all","python"));
const filtered=samples(()=>V.taskResults("all","python"));
console.log("NovaStudy v3.3 Node markup microbenchmark | tasks=1200 | iterations=25 | med/p95 ms");
console.log("Full task page: "+all.medianMs.toFixed(2)+" / "+all.p95Ms.toFixed(2));
console.log("Results-only update: "+filtered.medianMs.toFixed(2)+" / "+filtered.p95Ms.toFixed(2));
console.log("Indicative Node string-rendering numbers only; not mobile FPS, Web Vitals, or a guaranteed speed-up.");
