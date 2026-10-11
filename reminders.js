/* NovaStudy v2.9 — foreground Reminder & Notification Center
   No service-worker push, no server, no modification to routine or sync data. */
(function novaReminders(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape;
const KEY="novastudy_reminders_v1";
const tr=(en,bn)=>I.language==="bn"?bn:en;
const fresh=()=>({version:1,enabled:true,browser:false,tasks:true,exams:true,sessions:true,
 sessionLead:10,examLead:60,taskHour:9,entries:[]});
const TYPES=["task","exam","session"],LEADS=[0,5,10,15,30,60];
const copy=x=>JSON.parse(JSON.stringify(x));
const isoDay=x=>N.date(x);
const eventDate=(date,time)=>{
 if(!N.validDate(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 const [y,m,d]=date.split("-").map(Number),[h,mm]=time.split(":").map(Number);
 const t=new Date(y,m-1,d,h,mm);
 return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d&&t.getHours()===h&&t.getMinutes()===mm?t:null;
};
const validEntry=e=>!!e&&typeof e.key==="string"&&e.key.length>0&&e.key.length<=280&&
 TYPES.includes(e.type)&&typeof e.title==="string"&&e.title.length<=180&&
 Number.isFinite(e.dueAt)&&e.dueAt>=0&&Number.isFinite(e.firedAt)&&e.firedAt>=0&&
 typeof e.read==="boolean"&&typeof e.dismissed==="boolean"&&
 (e.snoozedUntil===null||Number.isFinite(e.snoozedUntil)&&e.snoozedUntil>0);
const unique=rows=>new Set(rows.map(e=>e.key)).size===rows.length;
const valid=p=>!!p&&p.version===1&&typeof p.enabled==="boolean"&&typeof p.browser==="boolean"&&
 typeof p.tasks==="boolean"&&typeof p.exams==="boolean"&&typeof p.sessions==="boolean"&&
 LEADS.includes(p.sessionLead)&&[0,15,30,60,120,1440].includes(p.examLead)&&
 Number.isInteger(p.taskHour)&&p.taskHour>=6&&p.taskHour<=21&&
 Array.isArray(p.entries)&&p.entries.length<=120&&p.entries.every(validEntry)&&unique(p.entries);
let state=fresh(),raw=null,locked=false,issue="",toast=()=>{},refresh=()=>{},lastShown=new Set();
try{
 raw=localStorage.getItem(KEY);
 if(raw!==null){const incoming=JSON.parse(raw);if(!valid(incoming))throw Error("Invalid reminder storage");state=incoming}
 else if(N.get()?.profile?.reminders===true){ // respect existing browser notification opt-in
  state.browser=true;
 }
}catch{locked=true;issue=tr("Reminder storage could not be read safely. Original bytes were preserved.","Reminder Storage পড়া যায়নি। পুরোনো তথ্য অক্ষত আছে।")}
function notify(){refresh()}
function adopt(nextRaw){
 if(nextRaw===null)return false;
 try{
  const next=JSON.parse(nextRaw);if(!valid(next))return false;
  state=next;raw=nextRaw;locked=false;issue="";notify();return true
 }catch{return false}
}
function save(next,replace=false){
 if(!valid(next)){issue=tr("Reminder changes did not pass validation.","Reminder পরিবর্তন বৈধ নয়।");notify();return false}
 if(locked&&!replace){issue=tr("Reminder records protected. Export raw storage before resetting.","Reminder Record সুরক্ষিত। Reset-এর আগে Raw Data Export করো।");notify();return false}
 try{
  const latest=localStorage.getItem(KEY);
  if(!replace&&latest!==raw){if(latest!==null)adopt(latest);
   issue=tr("Another tab changed reminders. Review and retry.","অন্য Tab-এ Reminders বদলেছে। দেখে আবার চেষ্টা করো।");notify();return false}
  const payload=JSON.stringify(next);
  localStorage.setItem(KEY,payload);state=next;raw=payload;locked=false;issue="";notify();return true;
 }catch{issue=tr("Unable to save reminders. Your previous records remain.","Reminder Save হয়নি। আগের Record অক্ষত আছে।");notify();return false}
}
function preference(name,value){
 if(!["enabled","browser","tasks","exams","sessions","sessionLead","examLead","taskHour"].includes(name))return false;
 const next=copy(state);next[name]=value;
 return save(next);
}
function derive(study,now=new Date(),prefs=state){
 if(!prefs.enabled)return [];
 const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1,0,0);
 const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+8,23,59);
 const reminders=[];
 function add(type,id,title,when,lead=0,info=""){
  if(!when||when.getTime()<start.getTime()||when.getTime()>end.getTime())return;
  if(!id||!title)return;
  const trigger=when.getTime()-lead*60000;
  const key=type+":"+String(id)+":"+when.getTime()+":"+lead;
  reminders.push({key,type,title:String(title).slice(0,180),dueAt:trigger,eventAt:when.getTime(),info});
 }
 if(prefs.tasks)for(const t of study.tasks||[]){
  if(t.done||!t.due||!N.validDate(t.due))continue;
  add("task",t.id,t.title,eventDate(t.due,String(prefs.taskHour).padStart(2,"0")+":00"),0,
   tr("Task deadline day","Task Deadline-এর দিন"));
 }
 if(prefs.exams)for(const x of study.exams||[]){
  if(x.done||!N.validDate(x.date))continue;
  add("exam",x.id,x.title,eventDate(x.date,x.start),prefs.examLead,tr("Exam begins","পরীক্ষা শুরু"));
 }
 if(prefs.sessions)for(let n=-1;n<=8;n++){
  const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+n,12);
  const day=isoDay(d);
  for(const s of study.sessions||[]){
   if(!N.occursOn(s,d))continue;
   add("session",s.id,s.title||N.name(s.subjectId),
    eventDate(day,s.start),prefs.sessionLead,tr("Study session","Study Session"));
  }
 }
 return reminders.sort((a,b)=>a.dueAt-b.dueAt||a.key.localeCompare(b.key));
}
function visibleCandidate(r,now){
 // Grace windows catch alerts when the tab is reopened, but not ancient deadlines.
 const grace=r.type==="task"?12*3600000:r.type==="exam"?2*3600000:45*60000;
 return r.dueAt<=now&&now-r.dueAt<=grace;
}
function showBrowser(alert){
 if(!state.browser||typeof window.Notification!=="function"||window.Notification.permission!=="granted"||
 !window.isSecureContext||document.hidden)return;
 try{
  const n=new window.Notification(tr("NovaStudy reminder","NovaStudy Reminder"),{
   body:alert.title,icon:"./assets/icon-192.png",tag:alert.key
  });
  // No permanent listener, no background scheduling.
  return n;
 }catch{}
}
function tick(now=new Date()){
 if(!state.enabled||document.hidden)return 0;
 const ts=now.getTime(),events=derive(N.get(),now,state);
 const known=new Set(state.entries.map(x=>x.key)),newItems=[];
 for(const e of events){
  if(known.has(e.key)||!visibleCandidate(e,ts))continue;
  newItems.push({key:e.key,type:e.type,title:e.title,dueAt:e.dueAt,
    firedAt:ts,read:false,dismissed:false,snoozedUntil:null});
  known.add(e.key);
 }
 const realerts=state.entries.filter(e=>!e.dismissed&&e.snoozedUntil!==null&&e.snoozedUntil<=ts&&
 e.snoozedUntil>ts-30*60000&& !lastShown.has(e.key+":"+e.snoozedUntil));
 if(!newItems.length&&!realerts.length)return 0;
 const next=copy(state);
 next.entries.push(...newItems);
 next.entries=next.entries.slice(-120);
 for(const e of next.entries)if(realerts.some(x=>x.key===e.key)){e.snoozedUntil=null;e.read=false}
 if(!save(next))return 0;
 for(const e of newItems)showBrowser(e);
 for(const e of realerts){lastShown.add(e.key+":"+e.snoozedUntil);showBrowser(e)}
 return newItems.length+realerts.length;
}
function upcoming(now=new Date(),limit=12){
 return derive(N.get(),now,state).filter(x=>x.eventAt>=now.getTime()&&x.dueAt>=now.getTime()-60000)
  .slice(0,limit);
}
function updateEntry(key,action){
 const e=state.entries.find(x=>x.key===key);if(!e)return false;
 const next=copy(state),entry=next.entries.find(x=>x.key===key);
 if(action==="reminder-read")entry.read=true;
 else if(action==="reminder-dismiss"){entry.dismissed=true;entry.read=true;entry.snoozedUntil=null}
 else if(action==="reminder-snooze"){entry.read=true;entry.snoozedUntil=Date.now()+10*60000}
 else return false;
 return save(next);
}
function markAllRead(){const next=copy(state);next.entries.forEach(x=>x.read=true);return save(next)}
function clearHistory(){
 if(!window.confirm(tr("Clear reminder history? Routine, tasks, exams and other data remain unchanged.","Reminder History মুছবে? Routine, Tasks, Exams ও অন্য Data অক্ষত থাকবে।")))return false;
 const next=copy(state);next.entries=[];return save(next);
}
async function enableBrowser(){
 if(typeof window.Notification!=="function"||!window.isSecureContext){
  issue=tr("Browser notifications require a supported HTTPS browser.","Browser Notification-এর জন্য HTTPS ও Supported Browser দরকার।");notify();return false
 }
 if(window.Notification.permission==="denied"){issue=tr("Permission blocked in browser settings. In-app reminders still work.","Browser Settings-এ Permission বন্ধ। In-app Reminders চালু থাকবে।");notify();return false}
 let permission=window.Notification.permission;
 if(permission!=="granted"){
  try{permission=await window.Notification.requestPermission()}catch{permission="denied"}
 }
 if(permission==="granted")return preference("browser",true);
 issue=tr("Notification permission not granted. In-app reminders stay available.","Notification Permission দেওয়া হয়নি। In-app Reminder ব্যবহার করতে পারবে।");notify();return false;
}
function toggleBrowser(){if(state.browser)return preference("browser",false);void enableBrowser();return true}
const typeName=t=>({task:tr("Task","Task"),exam:tr("Exam","পরীক্ষা"),session:tr("Session","সেশন")}[t]||t);
function timeLabel(when){
 return new Date(when).toLocaleString(I.language==="bn"?"bn-BD":"en-US",
  {dateStyle:"medium",timeStyle:"short"});
}
function badge(){
 return state.entries.filter(e=>!e.read&&!e.dismissed).length;
}
const button=(label,action,key,cls="tiny-btn")=>'<button type="button" class="'+cls+'" data-action="'+action+'"'+
 (key?' data-reminder-key="'+E(key)+'"':'')+'>'+label+'</button>';
const selection=(field,values,current)=>'<select data-reminder-pref="'+field+'">'+values.map(([n,label])=>
 '<option value="'+n+'"'+(n===current?' selected':'')+'>'+label+'</option>').join("")+'</select>';
function panel(){
 const browser=typeof window.Notification==="function"?window.Notification.permission:"unsupported";
 return '<section class="panel reminder-settings"><div class="panel-header"><div><b class="panel-title">'+tr("Reminder preferences","Reminder Preferences")+'</b>'+
 '<small class="panel-sub">'+tr("Saved only on this browser. No cloud sync or background push.","শুধু এই Browser-এ Save হয়। Cloud Sync বা Background Push নয়।")+'</small></div></div>'+
 '<div class="reminder-pref-grid">'+
 ["enabled","tasks","exams","sessions"].map(field=>
 '<label class="reminder-toggle"><span>'+({
 enabled:tr("In-app reminder center","In-app Reminder Center"),tasks:tr("Task deadlines","Task Deadline"),
 exams:tr("Exam alerts","পরীক্ষার Alert"),sessions:tr("Study sessions","Study Session")
 })[field]+'</span><input type="checkbox" data-reminder-pref="'+field+'"'+(state[field]?' checked':'')+'></label>').join("")+
 '<label class="reminder-select">'+tr("Session reminder lead","Session-এর কত আগে")+
 selection("sessionLead",[0,5,10,15,30,60].map(n=>[n,I.number(n)+" "+tr("min","মিনিট")]),state.sessionLead)+'</label>'+
 '<label class="reminder-select">'+tr("Exam reminder lead","পরীক্ষার কত আগে")+
 selection("examLead",[0,15,30,60,120,1440].map(n=>[n,I.number(n)+" "+tr("min","মিনিট")]),state.examLead)+'</label>'+
 '<label class="reminder-select">'+tr("Task deadline reminder hour","Task Deadline Reminder-এর সময়")+
 selection("taskHour",Array.from({length:16},(_,i)=>[i+6,String(i+6).padStart(2,"0")+":00"]),state.taskHour)+'</label></div>'+
 '<div class="reminder-permission"><span>'+tr("System notification permission: ","System Notification Permission: ")+E(browser)+'</span>'+
 button(state.browser?tr("Disable browser pop-ups","Browser Pop-up বন্ধ"):tr("Enable browser pop-ups","Browser Pop-up চালু"),"reminder-browser",null,"secondary-btn")+'</div>'+
 (issue?'<p class="reminder-error" role="alert">'+E(issue)+'</p>':"")+
 '<p class="reminder-disclaimer">'+tr("Checks run about once a minute while NovaStudy is open and visible. The first eligible check can show recent missed alerts. No notifications are guaranteed while closed, asleep, or when offline background execution is restricted. A task has no due-time field, so its alert uses your selected hour on the deadline day.","NovaStudy খোলা ও দৃশ্যমান থাকলে প্রায় প্রতি মিনিটে Check হয়। সাম্প্রতিক মিস হওয়া Alert দেখাতে পারে। App বন্ধ/ঘুমন্ত থাকলে Alert নিশ্চিত নয়। Task-এর Due Time নেই, তাই Deadline দিনের নির্বাচিত সময়ে Reminder দেখাবে।")+'</p></section>';
}
function page(){
 const now=new Date(),future=upcoming(now),recent=state.entries.filter(x=>!x.dismissed).slice().reverse().slice(0,35);
 return '<div class="reminder-root"><div class="page-head"><div><span class="eyebrow">'+tr("STAY ON TRACK / 09","স্টাডি অ্যালার্ট / ০৯")+'</span>'+
 '<h1 class="view-title">'+tr("Reminder & Notification Center","রিমাইন্ডার ও নোটিফিকেশন সেন্টার")+'</h1>'+
 '<p class="subheading">'+tr("Keep deadlines, exams and sessions in sight—with privacy-first local reminders.","Task Deadline, Exam ও Study Session-এর Reminder এক জায়গায়।")+'</p>'+
 '</div></div><div class="reminder-metrics">'+
 '<div class="panel"><strong>'+E(I.number(badge()))+'</strong><small>'+tr("Unread alerts","না পড়া Alert")+'</small></div>'+
 '<div class="panel"><strong>'+E(I.number(future.length))+'</strong><small>'+tr("Upcoming reminders","আসন্ন Reminder")+'</small></div>'+
 '<div class="panel"><strong>'+E(I.number(state.entries.length))+'</strong><small>'+tr("Stored alerts","সংরক্ষিত Alert")+'</small></div></div>'+
 '<section class="panel reminder-inbox"><div class="panel-header"><b class="panel-title">'+tr("Recent alerts","সাম্প্রতিক Alert")+'</b>'+
 '<div class="reminder-actions">'+button(tr("Mark all read","সব পড়েছি"),"reminder-read-all")+
 button(tr("Clear history","History মুছো"),"reminder-clear")+'</div></div>'+
 (recent.length?recent.map(x=>'<article class="reminder-item'+(!x.read?' is-unread':'')+'"><div>'+
 '<span class="reminder-tag">'+typeName(x.type)+'</span><b>'+E(x.title)+'</b><small>'+
 E(timeLabel(x.dueAt))+(x.snoozedUntil?' · '+tr("Snoozed","Snoozed"):'')+'</small></div>'+
 '<div class="reminder-actions">'+(!x.read?button(tr("Read","পড়েছি"),"reminder-read",x.key):"")+
 button(tr("Snooze 10m","১০ মিনিট পরে"),"reminder-snooze",x.key)+
 button(tr("Dismiss","সরাও"),"reminder-dismiss",x.key)+'</div></article>').join(""):
 '<div class="empty-state">'+tr("No reminders yet. Leave this page open around a scheduled alert time.","এখনো কোনো Reminder নেই। নির্ধারিত সময়ের কাছাকাছি App খোলা রাখো।")+'</div>')+
 '</section><section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Upcoming alerts","আসন্ন Alert")+'</b></div>'+
 (future.length?future.map(e=>'<article class="reminder-item"><div><span class="reminder-tag">'+typeName(e.type)+
 '</span><b>'+E(e.title)+'</b><small>'+E(timeLabel(e.dueAt))+'</small></div></article>').join(""):
 '<div class="empty-state">'+tr("No upcoming reminders in the next eight days.","আগামী আট দিনে কোনো Reminder নেই।")+'</div>')+'</section>'+panel()+'</div>';
}
function handle(action,button){
 if(action==="reminder-browser"){toggleBrowser();return true}
 if(action==="reminder-read-all"){markAllRead();return true}
 if(action==="reminder-clear"){clearHistory();return true}
 if(["reminder-read","reminder-snooze","reminder-dismiss"].includes(action)){
  updateEntry(button?.dataset?.reminderKey,action);return true}
 return false;
}
function handleChange(target){
 const prop=target?.dataset?.reminderPref;
 if(!prop)return false;
 const bools=["enabled","tasks","exams","sessions"];
 const value=bools.includes(prop)?Boolean(target.checked):Number(target.value);
 preference(prop,value);return true;
}
function init(opts={}){
 toast=opts.toast||(()=>{});refresh=opts.refresh||(()=>{});
 window.addEventListener("focus",()=>tick());
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)tick()});
 window.addEventListener("online",()=>tick());
 setInterval(()=>tick(),60000);
 // Scan after boot, but without asking for notification permission.
 tick();
}
window.NOVA_REMINDERS={KEY,init,page,panel,handle,handleChange,derive,tick,upcoming,adopt,valid,save,
 badge,markAllRead,clearHistory,preference,enableBrowser,updateEntry,get:()=>copy(state),getIssue:()=>issue};
})();
