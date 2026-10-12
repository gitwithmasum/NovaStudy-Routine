const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const now=()=>new Date(2026,9,11,14,0,0);
function fake(state){
 const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
 const w={
  NOVA:{get:()=>state,escape:esc,date,
   validDate:x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x||""))return false;const [y,m,d]=x.split("-").map(Number),a=new Date(y,m-1,d);return a.getFullYear()===y&&a.getMonth()===m-1&&a.getDate()===d},
   min:x=>{const a=x.split(":").map(Number);return a[0]*60+a[1]},
   occursOn:(s,d)=>s.repeat==="once"?s.date===date(d):s.day===d.getDay()&&(!s.repeatUntil||date(d)<=s.repeatUntil),
   name:id=>"Subject "+id,DAYS:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},
  NOVA_I18N:{language:"en",number:x=>String(x),time:s=>s,displayDate:s=>s,t:s=>s},
  NOVA_VIEWS:{
   heading:(...a)=>'<header>'+a.join("|")+'</header>',
   button:(t,a)=>'<button data-action="'+a+'">'+t+'</button>',
   empty:s=>'<p>'+s+'</p>',
   session:s=>'<article>'+esc(s.title||s.id)+'</article>',
   task:t=>'<article>'+esc(t.title)+'</article>'},
  NOVA_EXAMS:{dashboardPreview:()=>'<div id="existing-exams">old preview</div>'},
  NOVA_CHALLENGE:{dashboardPreview:()=>'<div id="existing-challenge">old preview</div>'},
  NOVA_ATTENDANCE:{stats:()=>({marked:2,rate:75})}
 };
 const context={window:w,Date,Intl,Math,Set,Map,Object,Array,JSON,Number,String,Symbol};
 vm.runInNewContext(read("dashboard.js"),context,{filename:"dashboard.js"});
 return {model:w.NOVA_DASHBOARD,w,state};
}
function fixture(){
 return{
  profile:{name:"Test Student",weekStart:6},
  sessions:[
   {id:"sun1",day:0,start:"09:00",end:"10:00",subjectId:"a",repeat:"weekly"},
   {id:"sun2",day:0,start:"13:00",end:"13:30",subjectId:"a",repeat:"once",date:"2026-10-11"},
   {id:"sat1",day:6,start:"08:00",end:"09:00",subjectId:"b",repeat:"weekly"},
   {id:"later",day:1,start:"10:00",end:"11:00",subjectId:"b",repeat:"once",date:"2026-10-12"}],
  tasks:[
   {id:"done",title:"finished",done:true,due:"2026-10-02"},
   {id:"overdue",title:"Overdue",done:false,due:"2026-10-05",priority:"high"},
   {id:"today",title:"Today",done:false,due:"2026-10-11",priority:"medium"},
   {id:"future",title:"Future",done:false,due:"2026-10-13",priority:"low"}],
  exams:[
   {id:"past",title:"Past exam",date:"2026-10-04",start:"09:00",done:false},
   {id:"nearest",title:"Tomorrow exam",date:"2026-10-12",start:"14:00",done:false},
   {id:"done",title:"Done exam",date:"2026-10-12",start:"10:00",done:true},
   {id:"far",title:"Next exam",date:"2026-10-22",start:"08:00",done:false}],
  attendance:[
   {date:"2026-10-11",sessionId:"sun1",status:"present"},
   {date:"2026-10-10",sessionId:"sat1",status:"late"},
   {date:"2026-10-09",sessionId:"manual",status:"present"},
   {date:"2026-10-08",sessionId:"manual",status:"absent"}],
  challenge:{startDate:"2026-10-01",items:[{topicId:1,status:"completed"},{topicId:2,status:"learning"}]}
 }
}
test("daily overview counts scheduled minutes, pending/overdue tasks and CSE completion",()=>{
 const f=fake(fixture()),m=f.model.summarize(f.state,now());
 assert.deepEqual(Array.from(m.todaySessions,s=>s.id),["sun1","sun2"]);
 assert.equal(m.plannedMinutes,90);
 assert.equal(m.pending.length,3);assert.equal(m.overdue,1);assert.equal(m.dueToday,1);
 assert.equal(m.taskRate,25);assert.equal(m.cseCompleted,1);
 assert.equal(m.nextSession,null);
 assert.deepEqual(Array.from(m.upcoming,e=>e.id),["nearest","far"]);
 assert.equal(f.model.daysUntil("2026-10-12",now()),1);
});
test("weekly graph only credits attendance that matches a scheduled session",()=>{
 const f=fake(fixture()),m=f.model.summarize(f.state,now());
 assert.equal(m.week[0].key,"2026-10-10");
 const sat=m.week.find(d=>d.key==="2026-10-10"),sun=m.week.find(d=>d.key==="2026-10-11");
 assert.equal(sat.scheduled,1);assert.equal(sat.attended,1);assert.equal(sat.rate,100);
 assert.equal(sun.scheduled,2);assert.equal(sun.attended,1);assert.equal(sun.rate,50);
 assert.equal(m.attendedWeek,2);
 assert.equal(m.streak,3);
});
test("attendance streak counts only date-stamped present/late and anchors today or yesterday",()=>{
 const f=fake(fixture()),t=now();
 assert.equal(f.model.attendanceStreak([{date:"2026-10-09",status:"present"}],t),0);
 assert.equal(f.model.attendanceStreak([{date:"2026-10-10",status:"late"}],t),1);
 assert.equal(f.model.attendanceStreak([{date:"2026-10-11",status:"absent"},{date:"2026-10-10",status:"present"}],t),1);
});
test("empty legacy-compatible records are read-only and chart gracefully handles no sessions",()=>{
 const data={profile:{name:"Student",weekStart:0},sessions:[],tasks:[],exams:[],attendance:[],challenge:{startDate:"",items:[]}};
 const before=JSON.stringify(data);
 const f=fake(data),m=f.model.summarize(data,now());
 assert.equal(m.plannedMinutes,0);assert.equal(m.streak,0);assert.equal(m.taskRate,0);
 assert.equal(m.week.length,7);assert.equal(m.week[0].day.getDay(),0);
 assert.equal(JSON.stringify(data),before);
});
test("dashboard HTML keeps existing previews, navigation, two-language rendering, and escapes names",()=>{
 const data=fixture();data.profile.name="<img onerror=alert(1)> Student";
 data.exams[1].title="<script>alert(1)</script>";
 const f=fake(data),before=JSON.stringify(data);
 const html=f.model.render();
 assert.match(html,/insight-chart-grid/);assert.match(html,/insight-stats/);
 assert.match(html,/id="existing-exams"/);assert.match(html,/id="existing-challenge"/);
 assert.match(html,/data-action="go-focus"/);assert.match(html,/data-action="go-attendance"/);
 assert.match(html,/data-action="go-tasks"/);assert.match(html,/data-action="go-exams"/);
 assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
 assert.doesNotMatch(html,/<img onerror/);assert.doesNotMatch(html,/<script>alert/);
 f.w.NOVA_I18N.language="bn";
 const bn=f.model.render();
 assert.match(bn,/সাপ্তাহিক অগ্রগতি/);assert.match(bn,/দ্রুত কাজ/);
 assert.equal(JSON.stringify(data),before);
});
test("dashboard code and cache integrated without editing sync modules",()=>{
 const index=read("index.html"),views=read("views.js"),sw=read("sw.js");
 const ci=read(".github/workflows/novastudy-tests.yml"),css=read("dashboard.css");
 assert.match(index,/src="\.\/dashboard\.js"/);
 assert.match(index,/href="\.\/dashboard\.css"/);
 assert.match(index,/NOVASTUDY OS <b>3\.3\.0<\/b>/);
 assert.match(views,/function dashboard\(\)\{return window\.NOVA_DASHBOARD\.render\(\)\}/);
 assert.match(sw,/novastudy-v3\.3\.0/);
 assert.match(sw,/'\.\/dashboard\.js'/);
 assert.match(sw,/'\.\/dashboard\.css'/);
 assert.match(ci,/node --check dashboard\.js/);
 assert.match(css,/\@media\(max-width:420px\)/);
 assert.match(css,/html\[data-theme="gold"\]/);
 assert.doesNotThrow(()=>new vm.Script(read("dashboard.js"),{filename:"dashboard.js"}));
});
