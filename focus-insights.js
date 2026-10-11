/* NovaStudy v2.6 Focus & Productivity Insights.
   Separate local-only log. Focus timer, routine schema and sync sources stay unchanged. */
(function(){
"use strict";
const F=window.NOVA_FOCUS,N=window.NOVA,I=window.NOVA_I18N,E=N.escape;
const KEY="novastudy_focus_insights_v1",MAX_EVENTS=180,MAX_DISTRACTIONS=120;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const reasons={phone:["Phone","ফোন"],social:["Social media","সোশ্যাল মিডিয়া"],noise:["Noise","শব্দ"],fatigue:["Fatigue","ক্লান্তি"],other:["Other","অন্যান্য"]};
const fresh=()=>({version:1,events:[],distractions:[],longBreakEvery:4});
const iso=x=>N.date(new Date(x));
const validEntry=e=>e&&typeof e.id==="string"&&e.id.length>0&&e.id.length<=90
 &&["focus","short","long"].includes(e.mode)&&Number.isFinite(e.finishedAt)&&e.finishedAt>=0
 &&Number.isInteger(e.minutes)&&e.minutes>=1&&e.minutes<=180;
const validDistraction=d=>d&&typeof d.id==="string"&&d.id.length>0&&d.id.length<=90
 &&Number.isFinite(d.at)&&d.at>=0&&Object.hasOwn(reasons,d.reason)
 &&typeof d.note==="string"&&d.note.length<=120;
const unique=a=>new Set(a.map(x=>x.id)).size===a.length;
const valid=s=>!!s&&s.version===1&&Array.isArray(s.events)&&Array.isArray(s.distractions)
 &&s.events.length<=MAX_EVENTS&&s.distractions.length<=MAX_DISTRACTIONS
 &&s.events.every(validEntry)&&s.distractions.every(validDistraction)
 &&unique(s.events)&&unique(s.distractions)
 &&Number.isInteger(s.longBreakEvery)&&s.longBreakEvery>=2&&s.longBreakEvery<=6;
let state=fresh(),raw=null,locked=false,issue="",refresh=()=>{},toast=()=>{};
try{raw=localStorage.getItem(KEY);if(raw!==null){const data=JSON.parse(raw);
 if(!valid(data))throw Error("invalid focus insights");state=data;}}
catch{locked=true;issue=tr("Focus Insights storage is damaged. Existing bytes were preserved; export a backup before resetting.","Focus Insights-এর Storage নষ্ট। পুরোনো তথ্য অপরিবর্তিত আছে; Reset করার আগে Backup রাখো।");}
const copy=x=>JSON.parse(JSON.stringify(x));
function adopt(nextRaw){
 if(nextRaw===null)return false;
 try{const next=JSON.parse(nextRaw);if(!valid(next))return false;state=next;raw=nextRaw;locked=false;issue="";refresh();return true}
 catch{return false}
}
function persist(next,replace=false){
 if(!valid(next)){issue=tr("Invalid insight data. Nothing changed.","Invalid Insight Data। কিছু বদলায়নি।");refresh();return false}
 if(locked&&!replace){issue=tr("Insight log is locked to protect the existing record.","পুরোনো Log নিরাপদ রাখতে Lock করা হয়েছে।");refresh();return false}
 try{
  const latest=localStorage.getItem(KEY);
  if(!replace&&latest!==raw){adopt(latest);issue=tr("Another tab updated Focus Insights. Review and retry.","অন্য Tab-এ Focus Insights বদলেছে। দেখে আবার চেষ্টা করো।");refresh();return false}
  const value=JSON.stringify(next);localStorage.setItem(KEY,value);state=next;raw=value;locked=false;issue="";refresh();return true
 }catch{issue=tr("Focus Insights could not be saved. Existing records are protected.","Focus Insights Save হয়নি। পুরোনো তথ্য নিরাপদ আছে।");refresh();return false}
}
function recordCompletion({mode,finishedAt,minutes}){
 if(!["focus","short","long"].includes(mode)||!Number.isFinite(finishedAt)||!Number.isInteger(minutes)||minutes<1||minutes>180)return false;
 const id=mode+":"+finishedAt;
 if(state.events.some(e=>e.id===id))return true;
 const next=copy(state);next.events.push({id,mode,finishedAt,minutes});next.events=next.events.slice(-MAX_EVENTS);
 return persist(next);
}
function addDistraction(form){
 const data=new FormData(form),reason=String(data.get("reason")||""),note=String(data.get("note")||"").trim().slice(0,120);
 if(!Object.hasOwn(reasons,reason)){issue=tr("Choose a distraction category.","Distraction Category নির্বাচন করো।");refresh();return false}
 const at=Date.now(),entry={id:"d:"+at+":"+Math.random().toString(36).slice(2,9),at,reason,note};
 const next=copy(state);next.distractions.push(entry);next.distractions=next.distractions.slice(-MAX_DISTRACTIONS);
 const ok=persist(next);if(ok)toast(tr("Distraction recorded.","মনোযোগ নষ্ট হওয়ার ঘটনা রেকর্ড হয়েছে।"));return ok;
}
function removeDistraction(id){
 if(!state.distractions.some(d=>d.id===id)||!window.confirm(tr("Remove this distraction entry?","এই Distraction Record মুছে ফেলবে?")))return false;
 const next=copy(state);next.distractions=next.distractions.filter(d=>d.id!==id);
 return persist(next);
}
function setLongBreakEvery(value){
 const n=Number(value);if(!Number.isInteger(n)||n<2||n>6)return false;
 const next=copy(state);next.longBreakEvery=n;return persist(next);
}
function recommendedBreak(){
 const completed=F.get().completed;
 return completed>0&&completed%state.longBreakEvery===0?"long":"short";
}
function startRecommendedBreak(){
 const mode=recommendedBreak(),current=F.get();
 if(current.running&&!window.confirm(tr("A timer is running. Switch to a break and discard the current countdown?","Timer চলছে। বর্তমান Countdown বাতিল করে Break শুরু করবে?")))return false;
 if(!F.mode(mode)){toast(F.status()||"Could not change timer");return false}
 if(!F.start()){toast(F.status()||"Could not start break");return false}
 toast(mode==="long"?tr("Long break started.","লম্বা বিরতি শুরু।"):tr("Short break started.","ছোট বিরতি শুরু।"));
 refresh();return true;
}
function stats(now=new Date()){
 const current=iso(now),week=Array.from({length:7},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-6+i,12);
 return {day:iso(d),date:d,focus:0,blocks:0,distractions:0};});
 const index=new Map(week.map(d=>[d.day,d]));
 for(const e of state.events){const d=index.get(iso(e.finishedAt));if(d&&e.mode==="focus"){d.focus+=e.minutes;d.blocks++}}
 for(const d of state.distractions){const day=index.get(iso(d.at));if(day)day.distractions++}
 const today=week[6],weeklyMinutes=week.reduce((n,d)=>n+d.focus,0),weeklyBlocks=week.reduce((n,d)=>n+d.blocks,0),
 distractions=week.reduce((n,d)=>n+d.distractions,0);
 return{todayMinutes:today.focus,todayBlocks:today.blocks,weeklyMinutes,weeklyBlocks,weeklyDistractions:distractions,week,
 totalLogged:state.events.filter(e=>e.mode==="focus").length,
 counts:Object.keys(reasons).map(k=>({reason:k,count:state.distractions.filter(d=>d.reason===k).length})).sort((a,b)=>b.count-a.count)};
}
function download(){
 const data={exportedAt:new Date().toISOString(),focusInsights:copy(state),focusTimer:F.get()};
 try{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="NovaStudy-Focus-Insights-"+N.date(new Date())+".json";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);return true
 }catch{issue=tr("Could not export focus insights.","Focus Insights Export করা যায়নি।");refresh();return false}
}
function clearHistory(){
 if(!window.confirm(tr("Delete v2.6 session history and distraction log? Existing focus timer totals and routine data will NOT be deleted.","v2.6 Session History ও Distraction Log মুছবে? পুরোনো Focus Timer Totals ও Routine Data থাকবে।")))return false;
 const next=fresh();next.longBreakEvery=state.longBreakEvery;
 return persist(next,true);
}
const card=(en,bn,value)=>'<div class="focus-insight-kpi"><small>'+tr(en,bn)+'</small><strong>'+E(I.number(value))+'</strong></div>';
function panel(){
 const x=stats(),max=Math.max(1,...x.week.map(d=>d.focus));
 const rows=x.week.map(d=>{
  const short=d.date.toLocaleDateString(I.language==="bn"?"bn-BD":"en-US",{weekday:"short"});
  const pct=Math.round(100*d.focus/max);
  return '<div class="focus-insight-day"><span>'+E(I.number(d.focus))+'</span><div class="focus-insight-track" role="img" aria-label="'+
   E(d.day+": "+d.focus+" focus minutes")+'"><div style="height:'+pct+'%"></div></div><small>'+E(short)+'</small></div>';
 }).join("");
 const history=state.events.slice(-8).reverse().map(e=>'<li><span>'+E(new Date(e.finishedAt).toLocaleString(I.language==="bn"?"bn-BD":"en-US"))+
 '</span><strong>'+E(I.number(e.minutes))+' '+tr("min","মিনিট")+' · '+
 E(tr(e.mode==="focus"?"Focus":e.mode==="short"?"Short break":"Long break",
 e.mode==="focus"?"ফোকাস":e.mode==="short"?"ছোট বিরতি":"লম্বা বিরতি"))+'</strong></li>').join("");
 const distractions=state.distractions.slice(-6).reverse().map(d=>'<li><div><strong>'+E(tr(...reasons[d.reason]))+'</strong>'+
 (d.note?' · '+E(d.note):"")+'<small>'+E(new Date(d.at).toLocaleString(I.language==="bn"?"bn-BD":"en-US"))+'</small></div>'+
 '<button type="button" class="tiny-btn" data-action="insights-remove" data-id="'+E(d.id)+'">'+tr("Remove","মুছো")+'</button></li>').join("");
 return '<section class="panel focus-insights" aria-label="Focus Productivity Insights">'+
 '<div class="panel-header"><div><span class="eyebrow">'+tr("FOCUS INTELLIGENCE / 2.0","ফোকাস ইন্টেলিজেন্স / ২.০")+'</span><h2>'+
 tr("Focus & productivity insights","ফোকাস ও প্রোডাক্টিভিটি")+'</h2><small class="panel-sub">'+
 tr("New detailed session history starts from v2.6; previous timer totals remain intact.","বিস্তারিত History শুরু v2.6 থেকে; আগের Timer Totals অক্ষত আছে।")+'</small></div></div>'+
 '<div class="focus-insight-kpis">'+card("Today","আজ",x.todayMinutes)+card("Last 7 days (minutes)","শেষ ৭ দিন (মিনিট)",x.weeklyMinutes)+
 card("Sessions logged","রেকর্ড করা সেশন",x.totalLogged)+card("7-day distractions","৭ দিনের Distraction",x.weeklyDistractions)+'</div>'+
 '<div class="focus-insight-layout"><div><h3>'+tr("Recorded focus minutes · past 7 days","শেষ ৭ দিনের Focus Minutes")+'</h3>'+
 '<div class="focus-insight-chart">'+rows+'</div><h3>'+tr("Session history","সেশনের ইতিহাস")+'</h3>'+
 '<ol class="focus-insight-history">'+(history||'<li>'+tr("New completions will appear here.","নতুন সম্পন্ন Session এখানে আসবে।")+'</li>')+'</ol></div>'+
 '<div><h3>'+tr("Break planning","বিরতির পরিকল্পনা")+'</h3><p class="focus-insight-hint">'+
 tr("Recommended next break: ","পরবর্তী বিরতি: ")+
 (recommendedBreak()==="long"?tr("Long (15 min)","লম্বা (১৫ মিনিট)"):tr("Short (5 min)","ছোট (৫ মিনিট)"))+'</p>'+
 '<label class="focus-insight-setting">'+tr("Long break after how many focus blocks?","কতটি Focus Block-এর পরে Long Break?")+
 '<select id="insightsBreakEvery">'+[2,3,4,5,6].map(n=>'<option value="'+n+'"'+(n===state.longBreakEvery?' selected':'')+'>'+E(I.number(n))+'</option>').join("")+'</select></label>'+
 '<button type="button" class="secondary-btn" data-action="insights-start-break">'+tr("Start recommended break","প্রস্তাবিত বিরতি শুরু")+'</button>'+
 '<h3>'+tr("Distraction log","Distraction Log")+'</h3>'+
 '<form id="insightsDistractionForm" class="focus-insight-form"><label>'+tr("Category","ধরন")+
 '<select name="reason">'+Object.entries(reasons).map(([k,v])=>'<option value="'+k+'">'+E(tr(...v))+'</option>').join("")+'</select></label>'+
 '<label>'+tr("Note (optional)","নোট (ঐচ্ছিক)")+'<input name="note" type="text" maxlength="120" placeholder="'+tr("Short personal note","ছোট নোট")+'"></label>'+
 '<button type="submit" class="primary-btn">'+tr("Log distraction","Distraction রেকর্ড")+'</button></form>'+
 '<ul class="focus-insight-distractions">'+(distractions||'<li>'+tr("No distractions logged.","কোনো Distraction নেই।")+'</li>')+'</ul></div></div>'+
 (issue?'<p class="focus-error" role="alert">'+E(issue)+'</p>':"")+
 '<div class="focus-insight-footer"><button type="button" data-action="insights-export" class="secondary-btn">'+tr("Export focus insights","Focus Insights Export")+'</button>'+
 '<button type="button" data-action="insights-clear" class="danger-btn">'+tr("Clear v2.6 history","v2.6 History মুছো")+'</button></div>'+
 '<p class="focus-help">'+tr("History and distraction notes are stored on this browser only, separately from routine JSON backups. If the app closes, completed timers are settled on return but alerts are not guaranteed.","History ও Distraction Note শুধু এই Browser-এ থাকে, Routine JSON Backup থেকে আলাদা। App বন্ধ থাকলে ফিরে এলে Timer সম্পন্ন হবে, তবে Alert নিশ্চিত নয়।")+'</p></section>';
}
function handle(action,button){
 if(action==="insights-start-break"){startRecommendedBreak();return true}
 if(action==="insights-export"){download();return true}
 if(action==="insights-clear"){clearHistory();return true}
 if(action==="insights-remove"){removeDistraction(button?.dataset?.id);return true}
 return false;
}
function handleChange(target){
 if(target?.id!=="insightsBreakEvery")return false;
 if(!setLongBreakEvery(target.value))toast(issue||tr("Could not save preference.","Preference Save হয়নি।"));
 return true;
}
function init(opts={}){toast=opts.toast||(()=>{});refresh=opts.refresh||(()=>{})}
window.NOVA_FOCUS_INSIGHTS={KEY,init,handle,handleChange,addDistraction,recordCompletion,stats,panel,adopt,
 get:()=>copy(state),getIssue:()=>issue,download,clearHistory,recommendedBreak,startRecommendedBreak,setLongBreakEvery};
})();