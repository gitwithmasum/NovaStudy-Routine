/* NovaStudy v2.3 — Advanced Dashboard: read-only analytics over existing local data.
   No changes to the saved state schema, authentication, backups or sync. */
(function novaDashboard(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,esc=N.escape;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const dateKey=d=>N.date(d);
const atNoon=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),12);
const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n,12);
const minutes=session=>Math.max(0,N.min(session.end)-N.min(session.start));
const fullDay=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate(),0,0,0,0);
function dateInfo(value){
 if(!N.validDate(value))return null;
 const [y,m,d]=value.split("-").map(Number);
 return new Date(y,m-1,d,12);
}
function daysUntil(value,today){
 const parsed=dateInfo(value);
 return parsed?Math.round((Date.UTC(parsed.getFullYear(),parsed.getMonth(),parsed.getDate())-
 Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000):null;
}
function weekDays(today,weekStart){
 const base=atNoon(today),first=Number(weekStart)===6?6:0;
 const offset=(base.getDay()-first+7)%7;
 return Array.from({length:7},(_,i)=>addDays(base,i-offset));
}
function attendanceStreak(records,today){
 const studied=new Set((records||[]).filter(a=>["present","late"].includes(a.status)&&N.validDate(a.date)&&daysUntil(a.date,today)<=0).map(a=>a.date));
 let cursor=atNoon(today),count=0;
 if(!studied.has(dateKey(cursor)))cursor=addDays(cursor,-1);
 while(studied.has(dateKey(cursor))&&count<3660){count++;cursor=addDays(cursor,-1)}
 return count;
}
function summarize(state,today=new Date()){
 const reference=atNoon(today),todayKey=dateKey(reference);
 const sessions=state.sessions||[],tasks=state.tasks||[],exams=state.exams||[],attendance=state.attendance||[];
 const todaySessions=sessions.filter(x=>N.occursOn(x,reference)).slice().sort((a,b)=>a.start.localeCompare(b.start));
 const week=weekDays(reference,state.profile?.weekStart);
 const attendanceKeys=new Map(attendance.filter(x=>x.sessionId).map(x=>[x.date+"|"+x.sessionId,x.status]));
 const days=week.map(d=>{
  const key=dateKey(d),items=sessions.filter(x=>N.occursOn(x,d)),hours=items.reduce((s,x)=>s+minutes(x),0);
  const attended=items.filter(x=>["present","late"].includes(attendanceKeys.get(key+"|"+x.id))).length;
  const marked=items.filter(x=>attendanceKeys.has(key+"|"+x.id)).length;
  return {key,day:d,scheduled:items.length,attended,marked,plannedMinutes:hours,
   rate:items.length?Math.round(attended/items.length*100):null};
 });
 const pending=tasks.filter(x=>!x.done).slice().sort((a,b)=>(a.due||"9999-12-31").localeCompare(b.due||"9999-12-31")||
  ({high:0,medium:1,low:2}[a.priority]??1)-({high:0,medium:1,low:2}[b.priority]??1));
 const overdue=pending.filter(t=>t.due&&t.due<todayKey).length;
 const dueToday=pending.filter(t=>t.due===todayKey).length;
 const upcoming=exams.filter(x=>!x.done&&N.validDate(x.date)&&x.date>=todayKey)
  .slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)).slice(0,4);
 const nowMinutes=today.getHours()*60+today.getMinutes();
 const nextSession=todaySessions.find(x=>N.min(x.end)>nowMinutes)||null;
 const done=tasks.length-pending.length;
 return {todayKey,today:reference,todaySessions,nextSession,
  plannedMinutes:todaySessions.reduce((s,x)=>s+minutes(x),0),
  pending,overdue,dueToday,upcoming,week:days,
  markedWeek:days.reduce((n,x)=>n+x.marked,0),attendedWeek:days.reduce((n,x)=>n+x.attended,0),
  scheduledWeek:days.reduce((n,x)=>n+x.scheduled,0),
  streak:attendanceStreak(attendance,reference),
  completedTasks:done,taskRate:tasks.length?Math.round(done/tasks.length*100):0,
  cseCompleted:(state.challenge?.items||[]).filter(x=>x.status==="completed").length};
}
function duration(m){return I.number(Math.floor(m/60))+"h "+I.number(m%60)+"m"}
function stat(icon,num,label,desc,extra=""){
 return '<div class="panel insight-stat'+(extra?" "+extra:"")+'"><span class="insight-stat-icon" aria-hidden="true">'+icon+'</span>'+
 '<strong class="insight-stat-number">'+esc(num)+'</strong><span class="insight-stat-label">'+label+
 '</span><small>'+desc+'</small></div>';
}
function progressChart(model){
 const list=model.week;
 const heading=tr("Weekly progress","সাপ্তাহিক অগ্রগতি");
 const sub=tr("Attendance-marked sessions / scheduled sessions (not actual study hours).","উপস্থিতি দেওয়া সেশন / নির্ধারিত সেশন (বাস্তব পড়ার সময় নয়)।");
 const bars=list.map(x=>{
  const day=I.language==="bn"?new Intl.DateTimeFormat("bn-BD",{weekday:"short"}).format(x.day):
   new Intl.DateTimeFormat("en-US",{weekday:"short"}).format(x.day);
  const label=day+" "+esc(I.number(x.day.getDate()));
  const rate=x.rate===null?0:Math.max(0,Math.min(100,x.rate));
  const tip=tr("attended","উপস্থিত")+" "+I.number(x.attended)+" / "+tr("planned","নির্ধারিত")+" "+I.number(x.scheduled);
  return '<div class="insight-chart-day"><span class="insight-chart-value">'+
   (x.scheduled?esc(I.number(rate))+"%":"—")+'</span>'+
   '<div class="insight-chart-track" role="img" aria-label="'+esc(label+": "+tip)+'">'+
   '<span class="insight-chart-fill" style="height:'+rate+'%"></span></div>'+
   '<small class="insight-chart-daylabel">'+label+'</small><span class="insight-chart-count">'+
   esc(I.number(x.attended))+'/'+esc(I.number(x.scheduled))+'</span></div>';
 }).join("");
 return '<section class="panel insight-chart"><div class="panel-header"><div><b class="panel-title">'+heading+'</b>'+
  '<small class="panel-sub">'+sub+'</small></div><span class="insight-chart-tag">'+
  esc(I.number(model.attendedWeek))+'/'+esc(I.number(model.scheduledWeek))+' '+tr("attended","উপস্থিত")+'</span></div>'+
  '<div class="insight-chart-grid" role="group" aria-label="'+heading+'">'+bars+'</div>'+
  '<p class="insight-chart-note">'+tr("A blank day means no sessions were scheduled. Only attendance records count as attended; this does not infer study time.","ফাঁকা দিনে কোনো সেশন নির্ধারিত ছিল না। শুধু রেকর্ড করা Attendance গণনা করা হয়; পড়ার সময় অনুমান করা হয় না।")+'</p></section>';
}
function examCard(exam,model){
 const days=daysUntil(exam.date,model.today);
 const due=days===0?tr("Today","আজ"):days===1?tr("Tomorrow","আগামীকাল"):
 tr("In ","আর ")+esc(I.number(days))+tr(" days"," দিন");
 return '<div class="insight-exam-item"><div><b>'+esc(exam.title)+'</b>'+
  '<small>'+esc(I.displayDate(exam.date))+' · '+esc(I.time(exam.start))+'</small></div>'+
  '<span class="insight-exam-due">'+due+'</span></div>';
}
function render(){
 const V=window.NOVA_VIEWS,state=N.get(),now=new Date(),m=summarize(state,now);
 const firstName=String(state.profile?.name||"Student").trim().split(/\s+/)[0]||"Student";
 const next=m.nextSession;
 const nextLabel=next?esc(next.title||N.name(next.subjectId))+" · "+esc(I.time(next.start)):
  tr("No more scheduled sessions today.","আজ আর কোনো নির্ধারিত সেশন নেই।");
 const taskSummary=tr("completed tasks","টি Task সম্পন্ন");
 const top=V.heading("MISSION CONTROL / 01",tr("Your student dashboard","তোমার স্টুডেন্ট ড্যাশবোর্ড"),
  tr("Today's priorities, weekly attendance and deadlines at a glance.","আজকের অগ্রাধিকার, সাপ্তাহিক উপস্থিতি এবং Deadline এক নজরে।"),
  V.button(tr("+ New task","+ নতুন Task"),"add-task"));
 const hero='<section class="hero insight-hero"><div class="hero-copy"><span class="eyebrow">'+
 tr("DAILY MISSION CONTROL","দৈনিক স্টাডি কন্ট্রোল")+'</span><h2>'+
 (I.language==="bn"?"আবার স্বাগতম, ":"Welcome back, ")+esc(firstName)+' ✦</h2><p>'+
 tr("Keep your classes, goals, and revision in view. You decide what gets done next.","ক্লাস, লক্ষ্য এবং রিভিশন এক জায়গায় দেখো। পরবর্তী কাজ তুমি ঠিক করবে।")+'</p>'+
 '<div class="insight-next"><span class="insight-next-label">'+tr("UP NEXT","পরবর্তী সেশন")+'</span><strong>'+nextLabel+'</strong></div>'+
 '<div class="hero-actions">'+V.button(tr("+ Study session","+ স্টাডি সেশন"),"add-session")+
 V.button(tr("Focus timer","ফোকাস টাইমার"),"go-focus","secondary-btn")+
 V.button(tr("CSE 100 challenge","CSE 100 চ্যালেঞ্জ"),"go-challenge","secondary-btn")+
 '</div></div><div class="orbit" aria-hidden="true"><div class="orbit-core">N<small>✦</small></div></div></section>';
 const stats='<div class="insight-stats">'+
  stat("◷",I.number(m.todaySessions.length),tr("Sessions today","আজকের সেশন"),
    tr("Scheduled, not completed","নির্ধারিত; সম্পন্ন নয়"))+
  stat("◈",duration(m.plannedMinutes),tr("Planned study time","পরিকল্পিত পড়ার সময়"),
    tr("Based on today's timetable","আজকের রুটিন অনুযায়ী"))+
  stat("☑",I.number(m.pending.length),tr("Pending tasks","বাকি Task"),
    m.overdue?I.number(m.overdue)+" "+tr("overdue","টির সময় পেরিয়েছে"):tr("No overdue deadline counted","Overdue Deadline নেই"))+
  stat("◎",I.number(m.taskRate)+"%",tr("Task completion","Task সম্পন্ন"),
    I.number(m.completedTasks)+" "+taskSummary)+
  stat("⌁",I.number(m.streak),tr("Attendance streak","উপস্থিতির ধারাবাহিকতা"),
    tr("Consecutive days with recorded attendance","যেসব দিনে Attendance রেকর্ড আছে"))+
  stat("✧",I.number(m.cseCompleted)+"/100",tr("CSE topics completed","CSE Topic সম্পন্ন"),
    tr("Recorded CSE 100 progress","সংরক্ষিত CSE 100 Progress"))+
  '</div>';
 const overdue=m.overdue?'<p class="insight-warning" role="status">'+
 esc(I.number(m.overdue))+" "+tr("overdue task(s) need attention.","টি Overdue Task-এর দিকে নজর দেওয়া দরকার।")+'</p>':"";
 const timeline='<section class="panel insight-today"><div class="panel-header"><div><b class="panel-title">'+
 tr("Today's timeline","আজকের সময়সূচি")+'</b><small class="panel-sub">'+
 esc(I.t(N.DAYS[now.getDay()]))+' · '+esc(I.displayDate(m.todayKey))+'</small></div>'+
 V.button(tr("Full routine →","সম্পূর্ণ রুটিন →"),"go-schedule","tiny-btn")+'</div>'+
 (m.todaySessions.length?m.todaySessions.slice(0,7).map(x=>V.session(x)).join(""):
 V.empty(tr("No scheduled sessions today.","আজ কোনো নির্ধারিত সেশন নেই।")))+
 (m.todaySessions.length>7?'<small class="insight-more">'+esc(I.number(m.todaySessions.length-7))+' '+tr("more on your routine page","টি আরও রুটিন পেজে আছে")+'</small>':"")+'</section>';
 const tasks='<section class="panel insight-tasks"><div class="panel-header"><div><b class="panel-title">'+
 tr("Priority tasks","অগ্রাধিকারভিত্তিক Task")+'</b><small class="panel-sub">'+
 I.number(m.dueToday)+' '+tr("due today","টি আজ Deadline")+'</small></div>'+
 V.button(tr("All tasks →","সব Task →"),"go-tasks","tiny-btn")+'</div>'+overdue+
 (m.pending.length?m.pending.slice(0,6).map(x=>V.task(x)).join(""):
 V.empty(tr("You're all caught up!","সব Task সম্পন্ন!")))+'</section>';
 const exams='<section class="panel insight-exams"><div class="panel-header"><div><b class="panel-title">'+
 tr("Upcoming exams","আসন্ন পরীক্ষা")+'</b><small class="panel-sub">'+
 tr("Nearest upcoming deadlines","নিকটবর্তী পরীক্ষার তারিখ")+'</small></div>'+
 V.button(tr("Exam center →","পরীক্ষা কেন্দ্র →"),"go-exams","tiny-btn")+'</div>'+
 (m.upcoming.length?m.upcoming.map(e=>examCard(e,m)).join(""):
 V.empty(tr("No upcoming exams recorded.","আসন্ন কোনো পরীক্ষা রেকর্ড করা নেই।")))+'</section>';
 const quick='<section class="panel insight-actions"><div class="panel-header"><div><b class="panel-title">'+
 tr("Quick actions","দ্রুত কাজ")+'</b><small class="panel-sub">'+
 tr("Jump straight into your next task","সরাসরি প্রয়োজনীয় কাজে যাও")+'</small></div></div>'+
 '<div class="insight-action-grid">'+[
 [tr("Add task","Task যোগ"),"add-task","＋"],
 [tr("Smart study planner","স্মার্ট স্টাডি প্ল্যানার"),"go-planner","◷"],
 [tr("Focus mode","ফোকাস মোড"),"go-focus","◎"],
 [tr("Exam planner","পরীক্ষা প্ল্যান"),"go-exams","▣"],
 [tr("Attendance","উপস্থিতি"),"go-attendance","▤"],
 [tr("CSE 100","CSE 100"),"go-challenge","✧"]].map(([label,action,icon])=>
 '<button type="button" class="insight-action" data-action="'+action+'"><span aria-hidden="true">'+icon+
 '</span>'+label+'</button>').join("")+'</div></section>';
 const attendance=(()=>{const a=window.NOVA_ATTENDANCE.stats();
 const rate=a.rate===null?"—":I.number(a.rate)+"%";
 return '<section class="attendance-dashboard-preview"><div><span class="eyebrow">'+
 tr("ATTENDANCE / 08","উপস্থিতি / ০৮")+'</span><h3>'+tr("Attendance overview","উপস্থিতির সারসংক্ষেপ")+'</h3><p>'+
 (a.marked?I.number(a.marked)+" "+tr("recorded classes","টি ক্লাস রেকর্ড করা হয়েছে"):tr("No attendance records yet","এখনো Attendance রেকর্ড নেই"))+
 '</p></div><div class="exam-dashboard-actions"><span class="exam-countdown">'+esc(rate)+'</span>'+
 V.button(tr("Open attendance →","উপস্থিতি দেখো →"),"go-attendance","secondary-btn")+
 '</div></section>'})();
 return top+hero+stats+'<div class="insight-dashboard-grid">'+
  progressChart(m)+exams+timeline+tasks+quick+'</div>'+
 window.NOVA_EXAMS.dashboardPreview()+window.NOVA_CHALLENGE.dashboardPreview()+attendance;
}
window.NOVA_DASHBOARD={summarize,attendanceStreak,daysUntil,weekDays,render};
})();