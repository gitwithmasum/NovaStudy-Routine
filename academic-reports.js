/* NovaStudy v2.8 — read-only Academic Analytics and Reports.
   Uses existing routine/attendance/focus history, without changing their storage schema. */
(function(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape;
const tr=(en,bn)=>I.language==="bn"?bn:en;
let range="week",notice="",toast=()=>{},refresh=()=>{};
const atNoon=(y,m,d)=>new Date(y,m,d,12);
const key=d=>N.date(d);
const toDay=x=>{if(!N.validDate(x))return null;const [y,m,d]=x.split("-").map(Number);return atNoon(y,m-1,d)};
const formatMinutes=n=>I.number(Math.floor(n/60))+"h "+I.number(n%60)+"m";
const windowDates=(period="week",now=new Date())=>{
 if(period!=="week"&&period!=="month")throw Error("Invalid reporting period");
 const last=atNoon(now.getFullYear(),now.getMonth(),now.getDate());
 const first=period==="month"?atNoon(last.getFullYear(),last.getMonth(),1):atNoon(last.getFullYear(),last.getMonth(),last.getDate()-6);
 const out=[];for(let d=first;d<=last;d=atNoon(d.getFullYear(),d.getMonth(),d.getDate()+1))out.push(key(d));
 return out;
};
function summarize(state,period="week",now=new Date(),focusHistory=null){
 const days=windowDates(period,now),today=key(now),daySet=new Set(days);
 const subjects=new Map((state.subjects||[]).map(s=>[s.id,{
  id:s.id,name:s.name,scheduledMinutes:0,scheduledSessions:0,
  marked:0,attended:0,absent:0,excused:0,tasks:0,completedTasks:0,exams:0
 }]));
 const fallback={id:"",name:tr("Personal / Other","ব্যক্তিগত / অন্যান্য"),scheduledMinutes:0,scheduledSessions:0,marked:0,attended:0,absent:0,excused:0,tasks:0,completedTasks:0,exams:0};
 const subject=id=>subjects.get(id)||fallback;
 const series=days.map(date=>{
  const d=toDay(date),sessions=(state.sessions||[]).filter(x=>N.occursOn(x,d));
  let planned=0;
  for(const s of sessions){
   const mins=Math.max(0,N.min(s.end)-N.min(s.start));planned+=mins;
   const entry=subject(s.subjectId);entry.scheduledMinutes+=mins;entry.scheduledSessions++;
  }
  return {date,plannedMinutes:planned,plannedSessions:sessions.length,marked:0,attended:0,focusMinutes:0};
 });
 const byDate=new Map(series.map(x=>[x.date,x]));
 let marked=0,attended=0,absent=0,excused=0;
 for(const a of state.attendance||[]){
  const x=byDate.get(a.date);if(!x)continue;
  const sb=subject(a.subjectId);
  marked++;x.marked++;sb.marked++;
  if(a.status==="present"||a.status==="late"){attended++;x.attended++;sb.attended++}
  else if(a.status==="absent"){absent++;sb.absent++}
  else if(a.status==="excused"){excused++;sb.excused++}
 }
 // Tasks have no completion timestamp; counts below are all-time, not period-specific.
 const tasks=state.tasks||[];
 let allCompleted=0;
 for(const t of tasks){const x=subject(t.subjectId||"");x.tasks++;if(t.done){x.completedTasks++;allCompleted++}}
 // Future exams are counted only when their scheduled date lies inside the selected range.
 const exams=(state.exams||[]).filter(e=>daySet.has(e.date));
 for(const e of exams)subject(e.subjectId).exams++;
 const focus=focusHistory&&Array.isArray(focusHistory.events)?focusHistory.events:[];
 let loggedFocusMinutes=0,loggedFocusSessions=0;
 for(const e of focus){
  if(e?.mode!=="focus"||!Number.isFinite(e.finishedAt)||!Number.isFinite(e.minutes)||e.minutes<0)continue;
  const d=key(new Date(e.finishedAt));const x=byDate.get(d);
  if(!x)continue;
  x.focusMinutes+=e.minutes;loggedFocusMinutes+=e.minutes;loggedFocusSessions++;
 }
 const rows=[...subjects.values(),fallback].filter(x=>x.scheduledSessions||x.marked||x.tasks||x.exams)
  .sort((a,b)=>b.scheduledMinutes-a.scheduledMinutes||b.attended-a.attended||a.name.localeCompare(b.name));
 const totalPlanned=series.reduce((s,x)=>s+x.plannedMinutes,0),plannedSessions=series.reduce((s,x)=>s+x.plannedSessions,0);
 const counted=attended+absent;
 return {period,start:days[0],end:days.at(-1),days:series,subjects:rows,marked,attended,absent,excused,
  attendanceRate:counted?Math.round(attended/counted*100):null,
  scheduledMinutes:totalPlanned,scheduledSessions:plannedSessions,
  focusMinutes:loggedFocusMinutes,focusSessions:loggedFocusSessions,
  tasksCompleted:allCompleted,tasksTotal:tasks.length,examsInPeriod:exams.length,
  caveat:"Attendance counts all recorded statuses; excused excludes the attendance denominator. Task completion is all-time because tasks have no completed-at timestamp."};
}
const number=x=>E(I.number(x));
const percent=x=>x===null?"—":number(x)+"%";
const rateOf=s=>{const n=s.attended+s.absent;return n?Math.round(s.attended/n*100):null};
const metric=(label,v,desc)=>'<div class="panel academic-metric"><small>'+label+'</small><strong>'+v+'</strong><span>'+desc+'</span></div>';
function graph(report){
 const max=Math.max(1,...report.days.map(d=>d.plannedMinutes));
 return '<section class="panel academic-chart"><div class="panel-header"><div><b class="panel-title">'+tr("Planned study time trend","পরিকল্পিত পড়ার সময়ের গ্রাফ")+'</b>'+
 '<small class="panel-sub">'+tr("Scheduled minutes per day, not verified focused study.","প্রতিদিনের নির্ধারিত মিনিট; প্রকৃত পড়ার সময় নয়।")+'</small></div></div>'+
 '<div class="academic-chart-scroll" role="group" aria-label="'+tr("Daily planned study minutes","প্রতিদিনের পরিকল্পিত সময়")+'">'+report.days.map(d=>{
 const h=Math.round(100*d.plannedMinutes/max);
 return '<div class="academic-chart-item"><small>'+number(d.plannedMinutes)+'</small><div class="academic-chart-track" role="img" aria-label="'+
 E(I.displayDate(d.date)+": "+d.plannedMinutes+" planned minutes")+'"><span style="height:'+h+'%"></span></div>'+
 '<small>'+E(I.displayDate(d.date).slice(0,11))+'</small></div>';
 }).join("")+'</div></section>';
}
function subjectTable(report){
 return '<section class="panel academic-subjects"><div class="panel-header"><b class="panel-title">'+tr("Subject-wise overview","বিষয়ভিত্তিক বিশ্লেষণ")+'</b>'+
 '<small class="panel-sub">'+tr("Tasks are lifetime totals","Task-এর সংখ্যা সব সময়ের")+'</small></div>'+
 '<div class="academic-table-scroll"><table><thead><tr>'+
 [tr("Subject","বিষয়"),tr("Planned time","পরিকল্পিত সময়"),tr("Attended / marked","উপস্থিত / রেকর্ড"),tr("Attendance rate","উপস্থিতির হার"),tr("Tasks done","সম্পন্ন Task")].map(h=>'<th scope="col">'+h+'</th>').join("")+
 '</tr></thead><tbody>'+(report.subjects.length?report.subjects.map(s=>
 '<tr><th scope="row">'+E(s.name)+'</th><td>'+E(formatMinutes(s.scheduledMinutes))+'</td><td>'+number(s.attended)+' / '+number(s.marked)+
 '</td><td>'+percent(rateOf(s))+'</td><td>'+number(s.completedTasks)+' / '+number(s.tasks)+'</td></tr>').join(""):
 '<tr><td colspan="5">'+tr("No recorded subjects or study data yet.","এখনো কোনো Subject বা Study Record নেই।")+'</td></tr>')+
 '</tbody></table></div></section>';
}
function csvCell(value){
 const s=String(value??"");
 // Avoid spreadsheet formula execution when opened in Excel/Sheets.
 const neutral=/^\s*[=+\-@]/.test(s)?"'"+s:s;
 return '"'+neutral.replaceAll('"','""')+'"';
}
function csv(report){
 const rows=[
 ["NovaStudy Academic Analytics","Period",report.period,"Start",report.start,"End",report.end],
 ["Metric","Value","Meaning"],
 ["Planned minutes",report.scheduledMinutes,"Scheduled, not actual study"],
 ["Recorded focus minutes",report.focusMinutes,"Only v2.6+ completed focus sessions on this browser"],
 ["Attendance rate",report.attendanceRate===null?"":report.attendanceRate+"%","Present + Late / Present + Late + Absent"],
 ["Task completion (all time)",report.tasksCompleted+"/"+report.tasksTotal,"No task-completion dates saved"],
 [],
 ["Date","Planned Minutes","Scheduled Sessions","Attendance Marked","Attendance Attended","Focus Minutes"],
 ...report.days.map(d=>[d.date,d.plannedMinutes,d.plannedSessions,d.marked,d.attended,d.focusMinutes]),
 [],
 ["Subject","Scheduled Minutes","Scheduled Sessions","Attendance Marked","Attended","Absent","Excused","Tasks Done","Tasks Total","Exams in Range"],
 ...report.subjects.map(s=>[s.name,s.scheduledMinutes,s.scheduledSessions,s.marked,s.attended,s.absent,s.excused,s.completedTasks,s.tasks,s.exams])
 ];
 return "\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")+"\r\n";
}
function downloadCsv(){
 const r=summarize(N.get(),range,new Date(),window.NOVA_FOCUS_INSIGHTS?.get?.());
 const blob=new Blob([csv(r)],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="NovaStudy-Academic-Report-"+r.period+"-"+r.end+".csv";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);toast(tr("Academic CSV downloaded.","Academic CSV ডাউনলোড হয়েছে।"));
 return true;
}
function printReport(){
 if(typeof window.print!=="function")return false;
 window.print();return true;
}
function page(){
 const r=summarize(N.get(),range,new Date(),window.NOVA_FOCUS_INSIGHTS?.get?.());
 return '<div class="academic-root"><div class="page-head"><div><span class="eyebrow">'+tr("STUDENT PERFORMANCE / 08","স্টুডেন্ট পারফরম্যান্স / ০৮")+'</span>'+
 '<h1 class="view-title">'+tr("Academic Analytics & Reports","একাডেমিক অ্যানালিটিক্স ও রিপোর্ট")+'</h1><p class="subheading">'+
 tr("Use recorded routines, attendance and focus sessions to understand your study plan.","রুটিন, উপস্থিতি ও রেকর্ড করা Focus Session থেকে পড়াশোনার বিশ্লেষণ দেখো।")+
 '</p></div></div><section class="panel academic-filters"><label>'+tr("Reporting period","রিপোর্টের সময়সীমা")+
 '<select id="academicPeriod" aria-label="'+tr("Reporting period","রিপোর্টের সময়সীমা")+'"><option value="week"'+(range==="week"?' selected':'')+'>'+
 tr("Last 7 days","গত ৭ দিন")+'</option><option value="month"'+(range==="month"?' selected':'')+'>'+
 tr("Current month to today","মাসের শুরু থেকে আজ")+'</option></select></label>'+
 '<div class="academic-export-actions"><button class="secondary-btn" type="button" data-action="academic-csv">'+tr("Export CSV","CSV ডাউনলোড")+'</button>'+
 '<button class="primary-btn" type="button" data-action="academic-pdf">'+tr("Print / Save as PDF","প্রিন্ট / PDF সেভ")+'</button></div></section>'+
 '<p class="academic-dates">'+E(I.displayDate(r.start))+' — '+E(I.displayDate(r.end))+'</p>'+
 '<div class="academic-metrics">'+
 metric(tr("Planned study hours","পরিকল্পিত পড়ার সময়"),E(formatMinutes(r.scheduledMinutes)),number(r.scheduledSessions)+' '+tr("scheduled sessions","টি সেশন নির্ধারিত"))+
 metric(tr("Recorded focus","রেকর্ড করা ফোকাস"),E(formatMinutes(r.focusMinutes)),number(r.focusSessions)+' '+tr("new sessions (since v2.6)","টি নতুন সেশন (v2.6 থেকে)"))+
 metric(tr("Attendance rate","উপস্থিতির হার"),percent(r.attendanceRate),number(r.marked)+' '+tr("recorded entries","টি রেকর্ড"))+
 metric(tr("Tasks completed","Task সম্পন্ন"),number(r.tasksCompleted)+' / '+number(r.tasksTotal),tr("All-time count","সব সময়ের সংখ্যা"))+
 '</div>'+graph(r)+subjectTable(r)+
 '<section class="panel academic-explain"><b class="panel-title">'+tr("How these reports are calculated","এই রিপোর্ট কীভাবে হিসাব করা হয়")+'</b>'+
 '<p>'+tr("Study hours come from your planned sessions, not tracked actual studying. Subject attendance includes manual and scheduled records. Excused is excluded from the attendance-rate denominator. Focus minutes use only local v2.6+ completed session history; missing focus data is not estimated. Tasks completed are all-time because dates of completion are not stored.","পড়ার সময় পরিকল্পিত সেশন থেকে পাওয়া; বাস্তবে কতটুকু পড়েছ তা নয়। Subject Attendance-এ Manual এবং Scheduled Record দুটোই আছে। Excused উপস্থিতির হারের হিসাবে ধরা হয় না। Focus Minutes শুধু এই Browser-এর v2.6+ Completed Session History থেকে আসে; পুরোনো সময় অনুমান করা হয় না। Task Completion সব সময়ের, কারণ Completion Date সংরক্ষিত হয় না।")+'</p>'+
 '<p>'+tr("For PDF, choose Print / Save as PDF and select your browser’s Save as PDF destination. CSV is exported locally. No cloud or sync data is changed.","PDF-এর জন্য Print / Save as PDF চাপো এবং Browser-এ Save as PDF নির্বাচন করো। CSV এই Device থেকেই ডাউনলোড হয়। Cloud বা Sync Data বদলায় না।")+'</p></section></div>';
}
function handle(action){
 if(action==="academic-csv"){try{downloadCsv()}catch{toast(tr("Unable to download CSV.","CSV ডাউনলোড করা যায়নি।"))}return true}
 if(action==="academic-pdf"){printReport();return true}
 return false;
}
function handleChange(target){
 if(target?.id!=="academicPeriod")return false;
 if(["week","month"].includes(target.value)){range=target.value;refresh()}
 return true;
}
function init(opts={}){toast=opts.toast||(()=>{});refresh=opts.refresh||(()=>{})}
window.NOVA_ACADEMIC_REPORTS={page,init,handle,handleChange,summarize,windowDates,csv,csvCell,getRange:()=>range};
})();
