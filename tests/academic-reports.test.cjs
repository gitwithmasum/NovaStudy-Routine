const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const key=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
function sample(){
 return {profile:{name:"Student",weekStart:0},
  subjects:[{id:"s1",name:"Networking"},{id:"s2",name:"Programming"}],
  sessions:[
   {id:"class1",subjectId:"s1",day:0,start:"09:00",end:"10:30",repeat:"weekly",type:"Class"},
   {id:"study",subjectId:"s2",day:0,start:"14:00",end:"15:00",repeat:"once",date:"2026-10-11",type:"Study"},
   {id:"monday",subjectId:"s2",day:1,start:"10:00",end:"11:00",repeat:"weekly",type:"Class"}],
  attendance:[
   {id:"a1",date:"2026-10-11",sessionId:"class1",subjectId:"s1",status:"present"},
   {id:"a2",date:"2026-10-10",sessionId:"",subjectId:"s2",status:"late"},
   {id:"a3",date:"2026-10-09",sessionId:"",subjectId:"s2",status:"absent"},
   {id:"a4",date:"2026-10-08",sessionId:"",subjectId:"s1",status:"excused"}],
  tasks:[{id:"t1",subjectId:"s1",title:"Do one",done:true},{id:"t2",subjectId:"s1",title:"Do two",done:false},
    {id:"t3",subjectId:"s2",title:"Complete",done:true}],
  exams:[{id:"e",subjectId:"s1",date:"2026-10-11",title:"Test"}],challenge:{items:[],startDate:""}}
}
function boot(state=sample(),history=null){
 let printed=0,downloaded=0,rendered=0;
 const win={
  NOVA:{get:()=>state,date:key,
   min:t=>{const [h,m]=t.split(":").map(Number);return h*60+m},
   escape:x=>String(x).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),
   validDate:v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v||""))return false;const [y,m,d]=v.split("-").map(Number),x=new Date(y,m-1,d);return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d},
   occursOn:(s,d)=>s.repeat==="once"?s.date===key(d):s.day===d.getDay()&&(!s.repeatUntil||key(d)<=s.repeatUntil)},
  NOVA_I18N:{language:"en",number:x=>String(x),displayDate:s=>s},
  NOVA_FOCUS_INSIGHTS:{get:()=>history||{version:1,events:[],distractions:[],longBreakEvery:4}},
  print:()=>{printed++}
 };
 const doc={body:{appendChild(){}},createElement:()=>({click(){downloaded++},remove(){}})};
 vm.runInNewContext(read("academic-reports.js"),{window:win,document:doc,Date,JSON,Object,Array,Number,String,Math,Map,Set,
 Blob:class{constructor(parts){this.parts=parts}},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},
 setTimeout:()=>{}},{filename:"academic-reports.js"});
 const reports=win.NOVA_ACADEMIC_REPORTS;reports.init({toast:()=>{},refresh:()=>rendered++});
 return{reports,state,win,printed:()=>printed,downloaded:()=>downloaded,rendered:()=>rendered}
}
const today=new Date(2026,9,11,12,0,0);
test("7-day reporting range respects local calendar and never reads future days",()=>{
 const a=boot(),d=a.reports.windowDates("week",today);
 assert.deepEqual(Array.from(d),["2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09","2026-10-10","2026-10-11"]);
 assert.throws(()=>a.reports.windowDates("year",today));
});
test("month-to-date includes only dates from 1st through local today",()=>{
 const a=boot(),dates=a.reports.windowDates("month",today);
 assert.equal(dates.length,11);assert.equal(dates[0],"2026-10-01");assert.equal(dates.at(-1),"2026-10-11");
 const feb=a.reports.windowDates("month",new Date(2028,1,29,10));
 assert.equal(feb.length,29);assert.equal(feb.at(-1),"2028-02-29");
});
test("subject planned minutes and attendance rate are actual records, not fabricated study time",()=>{
 const a=boot(),r=a.reports.summarize(a.state,"week",today,{events:[]});
 const net=r.subjects.find(x=>x.id==="s1"),prog=r.subjects.find(x=>x.id==="s2");
 assert.equal(net.scheduledMinutes,90);assert.equal(prog.scheduledMinutes,120);
 assert.equal(r.scheduledMinutes,210);assert.equal(r.scheduledSessions,3);
 assert.equal(net.marked,2);assert.equal(net.attended,1);assert.equal(net.excused,1);
 assert.equal(prog.attended,1);assert.equal(prog.absent,1);
 assert.equal(r.attendanceRate,67);assert.equal(r.marked,4);
 assert.equal(r.focusMinutes,0);
});
test("focus sums completed v2.6+ local session entries only; breaks excluded",()=>{
 const a=boot(),data={events:[
 {mode:"focus",finishedAt:new Date(2026,9,11,12).getTime(),minutes:25},
 {mode:"focus",finishedAt:new Date(2026,9,10,12).getTime(),minutes:40},
 {mode:"short",finishedAt:new Date(2026,9,11,14).getTime(),minutes:5},
 {mode:"focus",finishedAt:new Date(2026,8,28,11).getTime(),minutes:100}
 ]};
 const r=a.reports.summarize(a.state,"week",today,data);
 assert.equal(r.focusMinutes,65);assert.equal(r.focusSessions,2);
 assert.equal(r.days.at(-1).focusMinutes,25);
});
test("task completion is all-time because the task schema lacks completion dates",()=>{
 const a=boot(),r=a.reports.summarize(a.state,"week",today);
 assert.equal(r.tasksCompleted,2);assert.equal(r.tasksTotal,3);
 assert.equal(r.examsInPeriod,1);
});
test("empty records display truthful zero statistics and no attendance percentage",()=>{
 const s={subjects:[],sessions:[],tasks:[],attendance:[],exams:[],profile:{}};
 const a=boot(s),r=a.reports.summarize(s,"week",today);
 assert.equal(r.attendanceRate,null);
 assert.equal(r.scheduledMinutes,0);assert.equal(r.days.length,7);
 assert.equal(r.subjects.length,0);
});
test("CSV quotes text and neutralizes formula injection in subjects",()=>{
 const a=boot();
 a.state.subjects[0].name='=HYPERLINK("evil","click")';
 const r=a.reports.summarize(a.state,"week",today);
 const csv=a.reports.csv(r);
 assert.match(csv,/^\uFEFF/);
 assert.match(csv,/'=HYPERLINK\(""evil"",""click""\)/);
 assert.ok(csv.includes('"Date","Planned Minutes"'));
 assert.ok(csv.includes('"Task completion (all time)"'));
 assert.equal(a.reports.csvCell("  @SUM(1,1)").includes("'"),true);
});
test("render is read-only, HTML escapes untrusted names, and supports Bengali",()=>{
 const a=boot();a.state.subjects[0].name="<script>oops()</script>";
 const before=JSON.stringify(a.state);
 let html=a.reports.page();
 assert.match(html,/academic-chart-scroll/);assert.match(html,/academic-table-scroll/);
 assert.match(html,/&lt;script&gt;oops\(\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>oops/);
 a.win.NOVA_I18N.language="bn";
 html=a.reports.page();assert.match(html,/একাডেমিক অ্যানালিটিক্স/);
 assert.equal(JSON.stringify(a.state),before);
});
test("weekly/monthly selection changes presentation only and print goes to browser print",()=>{
 const a=boot();const input={id:"academicPeriod",value:"month"};
 assert.equal(a.reports.handleChange(input),true);
 assert.equal(a.reports.getRange(),"month");
 assert.equal(a.rendered(),1);
 assert.equal(a.reports.handle("academic-pdf"),true);assert.equal(a.printed(),1);
 assert.equal(a.state.tasks.length,3);
});
test("v2.8 nav scrollbar loaded after legacy CSS with desktop and mobile scrolling",()=>{
 const html=read("index.html"),nav=read("navigation-scroll.css"),sw=read("sw.js");
 const ci=read(".github/workflows/novastudy-tests.yml"),app=read("app.js");
 assert.match(html,/data-nav="reports"/);
 assert.match(html,/src="\.\/academic-reports\.js"/);
 assert.match(html,/href="\.\/academic-reports\.css"/);
 assert.ok(html.indexOf("navigation-scroll.css")>html.indexOf("learning-hub.css"));
 assert.match(nav,/\.sidebar \.nav-list\{[\s\S]*overflow-y:auto/);
 assert.match(nav,/\.mobile-nav\{[\s\S]*overflow-x:auto/);
 assert.match(nav,/scrollbar-width:thin/);
 assert.match(sw,/novastudy-v3\.5\.6/);
 assert.match(sw,/'\.\/navigation-scroll\.css'/);
 assert.match(app,/page==="reports"\?Reports\.page/);
 assert.match(app,/Reports\.handleChange/);
 assert.match(ci,/node --check academic-reports\.js/);
 assert.match(html,/NOVASTUDY OS <b>3\.5\.6<\/b>/);
 for(const file of ["academic-reports.js","app.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
});
