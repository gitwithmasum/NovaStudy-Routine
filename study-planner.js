/* NovaStudy v2.4 · Preview-first Smart Study Planner.
   Study records are not written until the user explicitly confirms a validated preview. */
(function smartPlanner(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape,V=()=>window.NOVA_VIEWS;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const defaults={days:5,blocks:2,start:"16:00",end:"21:00",length:50,breakTime:10,preferred:"",mode:"balanced"};
let opts={...defaults},proposal=null,message="",error="",refresh=()=>{},toast=()=>{};
const copy=x=>JSON.parse(JSON.stringify(x));
const atNoon=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
const addDays=(d,i)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+i,12);
const isTime=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));
const time=n=>N.stamp(n);
function validate(o,state){
 if(!o||!Number.isInteger(o.days)||o.days<1||o.days>7||
 !Number.isInteger(o.blocks)||o.blocks<1||o.blocks>5||
 !Number.isInteger(o.length)||o.length<25||o.length>120||
 !Number.isInteger(o.breakTime)||o.breakTime<0||o.breakTime>60||
 !isTime(o.start)||!isTime(o.end)||N.min(o.end)-N.min(o.start)<o.length||
 !["balanced","deadlines"].includes(o.mode)||typeof o.preferred!=="string"||
 (o.preferred&&!state.subjects.some(s=>s.id===o.preferred)))throw Error("Invalid planning options.");
}
function entries(state,day,used,preferred,mode,now){
 const dayKey=N.date(day),taskEntries=[];
 for(const t of state.tasks){
  if(t.done)continue;
  const deadline=t.due&&N.validDate(t.due)?t.due:"";
  const delta=deadline?Math.round((Date.UTC(...deadline.split("-").map((x,i)=>i===1?Number(x)-1:Number(x)))-
   Date.UTC(day.getFullYear(),day.getMonth(),day.getDate()))/86400000):999;
  const base={high:115,medium:77,low:52}[t.priority||"medium"]||70;
  const urgency=delta<0?65:delta<=1?75:delta<=3?50:delta<=7?24:0;
  const id="task:"+t.id;
  taskEntries.push({key:id,title:"Task: "+t.title,subjectId:t.subjectId||"",priority:base+urgency+(mode==="deadlines"?urgency:0)});
 }
 for(const x of state.exams||[]){
  if(x.done||!N.validDate(x.date)||x.date<=dayKey)continue;
  const exam=new Date(x.date+"T12:00:00");
  const days=Math.round((Date.UTC(exam.getFullYear(),exam.getMonth(),exam.getDate())-
    Date.UTC(day.getFullYear(),day.getMonth(),day.getDate()))/86400000);
  const urgency=days<=2?110:days<=5?80:days<=14?40:10;
  taskEntries.push({key:"exam:"+x.id,title:"Exam prep: "+x.title,subjectId:x.subjectId||"",priority:90+urgency+(mode==="deadlines"?urgency:0)});
 }
 for(const x of state.subjects){
  taskEntries.push({key:"subject:"+x.id,title:"Study: "+x.name,subjectId:x.id,priority:38});
 }
 const existing=new Set((state.sessions||[]).filter(s=>s.repeat==="once"&&s.date===dayKey&&s.revisionFor?.startsWith("smart-v2:")).map(x=>x.revisionFor.slice(9)));
 return taskEntries.filter(x=>!existing.has(x.key)&&!used.has(x.key)&&(!x.subjectId||state.subjects.some(s=>s.id===x.subjectId)))
  .map(x=>({...x,score:x.priority+(preferred&&x.subjectId===preferred?110:0)}))
  .sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}
function build(state,options,now=new Date()){
 validate(options,state);
 if(!N.valid(state))throw Error("Saved study data is invalid. No plan created.");
 const today=atNoon(now),plans=[],days=[],taskIds=new Set();
 let conflicts=0,slotsUnavailable=0;
 for(let d=0;d<options.days;d++){
  const day=addDays(today,d),dayKey=N.date(day),used=new Set(),blocks=[];
  const occupied=(state.sessions||[]).filter(s=>N.occursOn(s,day))
   .map(s=>[N.min(s.start),N.min(s.end)]);
  // Exams are unavailable time slots. Neither their records nor existing sessions are changed.
  for(const exam of state.exams||[])if(exam.date===dayKey)occupied.push([N.min(exam.start),N.min(exam.end)]);
  let cursor=N.min(options.start),stop=N.min(options.end);
  if(d===0)cursor=Math.max(cursor,Math.ceil((now.getHours()*60+now.getMinutes()+1)/5)*5);
  for(let b=0;b<options.blocks;b++){
   const entriesForDay=entries(state,day,used,options.preferred,options.mode,now);
   const candidate=entriesForDay[0];
   if(!candidate){slotsUnavailable++;continue}
   let found=false;
   for(let start=cursor;start+options.length<=stop;start+=5){
    if(occupied.some(([a,z])=>start<z&&start+options.length>a)){conflicts++;continue}
    const slot={date:dayKey,day:day.getDay(),start:time(start),end:time(start+options.length),
     title:candidate.title.slice(0,100),subjectId:candidate.subjectId,
     revisionFor:"smart-v2:"+candidate.key,repeat:"once",type:"Study",place:"Smart Study Planner"};
    plans.push(slot);blocks.push(slot);occupied.push([start,start+options.length]);
    used.add(candidate.key);taskIds.add(candidate.key);
    cursor=start+options.length+options.breakTime;found=true;break;
   }
   if(!found){slotsUnavailable++;break}
  }
  days.push({date:dayKey,items:blocks});
 }
 return {items:plans,days,conflicts,skipped:slotsUnavailable,uniqueTargets:taskIds.size,
   minutes:plans.length*options.length,options:copy(options)};
}
function fromForm(form){
 const data=new FormData(form);
 const next={days:Number(data.get("days")),blocks:Number(data.get("blocks")),start:String(data.get("start")||""),
  end:String(data.get("end")||""),length:Number(data.get("length")),breakTime:Number(data.get("breakTime")),
  preferred:String(data.get("preferred")||""),mode:String(data.get("mode")||"balanced")};
 validate(next,N.get());return next;
}
function review(form){
 try{
  const next=fromForm(form),raw=JSON.stringify(N.get());
  const savedRaw=localStorage.getItem(N.KEY),now=new Date(),result=build(copy(N.get()),next,now);
  opts=next;proposal={...result,raw,savedRaw,created:now.getTime()};
  error="";message=result.items.length?tr("Preview ready. Nothing has been added yet.","প্রিভিউ তৈরি। এখনো কোনো সেশন যোগ হয়নি।"):
   tr("No suitable free slots found. Adjust hours, days or subjects.","খালি সময় পাওয়া যায়নি। সময় বা দিন পরিবর্তন করো।");
  refresh();return true;
 }catch(e){proposal=null;error=String(e?.message||e);message="";refresh();return false}
}
function apply(){
 if(!proposal||!proposal.items.length)return false;
 const saved=proposal;
 if(JSON.stringify(N.get())!==saved.raw||localStorage.getItem(N.KEY)!==saved.savedRaw){
  proposal=null;error=tr("Routine changed in another tab or editor. Preview again.","অন্য Tab বা Editor-এ রুটিন বদলেছে। আবার Preview করো।");refresh();return false;
 }
 if(Date.now()-saved.created>10*60*1000){
  proposal=null;error=tr("Preview is older than ten minutes. Refresh first.","প্রিভিউ দশ মিনিটের বেশি পুরোনো। আবার তৈরি করো।");refresh();return false;
 }
 const now=new Date(),currentMinute=now.getHours()*60+now.getMinutes();
 if(saved.items.some(s=>s.date===N.date(now)&&N.min(s.start)<=currentMinute)){
  proposal=null;error=tr("Some start times have passed. Generate an updated preview.","শুরুর কিছু সময় পেরিয়ে গেছে। নতুন Preview করো।");refresh();return false;
 }
 if(N.get().sessions.length+saved.items.length>3000){
  error=tr("Session limit reached. No changes applied.","সেশন Limit শেষ। কিছু যোগ হয়নি।");refresh();return false;
 }
 if(!window.confirm(tr("Add ","যোগ করবে ")+saved.items.length+
 tr(" study blocks to your existing routine? No existing records will be deleted.","টি Study Block? পুরোনো রুটিন বা Task মুছবে না।")))return false;
 const additions=saved.items.map(s=>({id:N.uid(),...s}));
 const data=N.get();data.sessions.push(...additions);
 // N.save guards validity, browser storage failures, and stale-tab writes.
 if(!N.save()){
  proposal=null;error=N.getIssue()||tr("Could not save; old data restored.","Save হয়নি; পুরোনো ডেটা ফিরেছে।");
  refresh();return false;
 }
 proposal=null;error="";message=tr("Study blocks added. Check your routine.","Study Block যোগ হয়েছে। রুটিন দেখো।");
 toast(message);refresh();return true;
}
function clear(){proposal=null;error="";message="";refresh()}
function changed(el){
 if(!el?.closest?.("#smartPlannerForm"))return false;
 if(proposal){proposal=null;message=tr("Options changed. Generate a fresh preview.","Option বদলেছে। আবার Preview করো.");
  document.querySelector(".study-preview")?.remove();}
 return true;
}
const field=(label,name,options,value)=>'<label class="study-option"><span>'+label+'</span><select name="'+name+'">'+
 options.map(([v,t])=>'<option value="'+E(v)+'"'+(String(value)===String(v)?" selected":"")+'>'+E(t)+'</option>').join("")+'</select></label>';
function page(){
 const state=N.get(),VIEWS=V(),subjectOptions=[["",tr("Balanced / all subjects","সব Subject")],
  ...state.subjects.map(s=>[s.id,s.name])];
 const dayOptions=Array.from({length:7},(_,i)=>[i+1,I.number(i+1)]);
 const blocksOptions=Array.from({length:5},(_,i)=>[i+1,I.number(i+1)]);
 const selectNum=a=>a.map(v=>[v,I.number(v)]);
 const controls='<section class="panel study-planner-card">'+
 '<div class="panel-header"><div><b class="panel-title">'+tr("Build your next study plan","পরবর্তী স্টাডি প্ল্যান তৈরি করো")+'</b>'+
 '<small class="panel-sub">'+tr("Preview first; add blocks only after confirmation.","আগে Preview; Confirm করলে তবেই Routine-এ যোগ হবে।")+'</small></div></div>'+
 '<form id="smartPlannerForm" class="study-options">'+
 field(tr("Days","দিন"),"days",dayOptions,opts.days)+
 field(tr("Blocks / day","প্রতিদিন সেশন"),"blocks",blocksOptions,opts.blocks)+
 '<label class="study-option"><span>'+tr("Available from","শুরু")+'</span><input name="start" type="time" required value="'+E(opts.start)+'"></label>'+
 '<label class="study-option"><span>'+tr("Available until","শেষ")+'</span><input name="end" type="time" required value="'+E(opts.end)+'"></label>'+
 field(tr("Block minutes","সেশনের মিনিট"),"length",selectNum([25,30,40,45,50,60,75,90,120]),opts.length)+
 field(tr("Break minutes","বিরতির মিনিট"),"breakTime",selectNum([0,5,10,15,20,30,45,60]),opts.breakTime)+
 field(tr("Subject priority","Subject অগ্রাধিকার"),"preferred",subjectOptions,opts.preferred)+
 field(tr("Planning strategy","প্ল্যানের ধরন"),"mode",[
 ["balanced",tr("Balanced study","Balanced Study")],["deadlines",tr("Deadlines first","Deadline আগে")]],opts.mode)+
 '<div class="study-form-action"><button type="submit" class="primary-btn">'+tr("Generate preview","প্রিভিউ তৈরি করো")+'</button></div></form></section>';
 const info='<div class="hint-banner">'+tr(
  "Uses pending tasks, exam dates, priorities and your available hours. Avoids existing class/exam time clashes, skips past slots, and generates one-off sessions. Existing sessions, tasks, exams and progress stay untouched until confirmation.",
  "Pending Task, Exam Date, Priority ও খালি সময় বিবেচনা করে। ক্লাস/পরীক্ষার সময় এড়িয়ে চলে, অতীতের সময় বাদ দেয় এবং একবারের Session তৈরি করে। Confirm না করলে কিছু বদলায় না।")+'</div>';
 let preview="";
 if(proposal){
  const summary='<div class="study-preview-stats"><span><strong>'+I.number(proposal.items.length)+'</strong> '+tr("new blocks","নতুন সেশন")+'</span>'+
   '<span><strong>'+I.number(proposal.minutes)+'</strong> '+tr("planned minutes","পরিকল্পিত মিনিট")+'</span>'+
   '<span><strong>'+I.number(proposal.skipped)+'</strong> '+tr("unfilled slots","খালি Slot")+'</span></div>';
  const rows=proposal.days.map(d=>'<div class="study-preview-day"><b>'+E(I.displayDate(d.date))+'</b><div>'+
   (d.items.length?d.items.map(x=>'<div class="study-preview-row"><span>'+E(I.time(x.start))+'–'+E(I.time(x.end))+'</span><strong>'+E(x.title)+'</strong></div>').join(""):
    '<small>'+tr("No available study block","কোনো Study Block নেই")+'</small>')+'</div></div>').join("");
  preview='<section class="panel study-preview" aria-live="polite"><div class="panel-header"><b class="panel-title">'+
   tr("Study plan preview","স্টাডি প্ল্যান প্রিভিউ")+'</b><span class="chip">'+tr("Not saved yet","এখনো Save হয়নি")+'</span></div>'+
   summary+'<div class="study-preview-list">'+rows+'</div><div class="study-preview-actions">'+
   (proposal.items.length?'<button type="button" class="primary-btn" data-action="smart-apply">'+tr("Confirm & add to routine","Confirm করে রুটিনে যোগ")+'</button>':"")+
   '<button type="button" class="secondary-btn" data-action="smart-cancel">'+tr("Discard preview","প্রিভিউ বাতিল")+'</button></div></section>';
 }
 return VIEWS.heading("STUDY INTELLIGENCE / 02",tr("Smart Study Planner","স্মার্ট স্টাডি প্ল্যানার"),
 tr("Plan around classes, deadlines and real available hours.","ক্লাস, Deadline ও খালি সময় অনুযায়ী রুটিন সাজাও।"),
 VIEWS.button(tr("View weekly routine →","সাপ্তাহিক রুটিন →"),"go-schedule","secondary-btn"))+
 controls+(error?'<p class="study-planner-error" role="alert">'+E(error)+'</p>':"")+
 (message?'<p class="study-planner-message" role="status">'+E(message)+'</p>':"")+preview+info;
}
function init(options={}){refresh=options.refresh||(()=>{});toast=options.toast||(()=>{})}
function handle(action){
 if(action==="smart-apply"){apply();return true}
 if(action==="smart-cancel"){clear();return true}
 return false;
}
window.NOVA_SMART_PLANNER={init,handle,page,review,apply,clear,changed,build,validate,getPreview:()=>proposal};
})();