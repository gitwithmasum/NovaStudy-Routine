const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
function study(){
 return {
  profile:{reminders:false},subjects:[{id:"a",name:"Programming"}],
  tasks:[{id:"td",title:"Submit assignment",due:"2026-10-11",done:false},{id:"done",title:"Done Task",due:"2026-10-11",done:true}],
  exams:[{id:"exam",title:"Math Midterm",date:"2026-10-11",start:"10:00",end:"12:00",done:false}],
  sessions:[{id:"ss",title:"Python coding",subjectId:"a",day:0,repeat:"weekly",start:"09:00",end:"10:00"}]};
}
function boot({seed=null,permission="default",secure=true,legacy=false}={}){
 const S=study();S.profile.reminders=legacy;
 const data=new Map(seed===null?[]:[["novastudy_reminders_v1",seed]]),notices=[],events={},docs={};
 let deniedStorage=false,confirmed=true,visible=false,prompted=0,rendered=0,now=0;
 class FakeNotification{
  constructor(title,options){notices.push({title,options})}
  static get permission(){return permission}
  static async requestPermission(){prompted++;permission="granted";return "granted"}
 }
 const storage={getItem:k=>data.get(k)??null,setItem(k,v){if(deniedStorage)throw Error("Storage quota");data.set(k,String(v));},removeItem:k=>data.delete(k)};
 const w={NOVA:{get:()=>S,date,escape:s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),
 validDate:x=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(x||""))return false;const[y,m,d]=x.split("-").map(Number),v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d},
 occursOn:(s,d)=>s.repeat==="once"?s.date===date(d):s.day===d.getDay(),
 name:id=>"Programming"},NOVA_I18N:{language:"en",number:x=>String(x)},
 Notification:FakeNotification,isSecureContext:secure,confirm:()=>confirmed,
 addEventListener:(event,cb)=>{events[event]=cb}};
 const doc={get hidden(){return !visible},addEventListener:(event,cb)=>{docs[event]=cb}};
 const ctx={window:w,document:doc,localStorage:storage,Notification:FakeNotification,
 Date,Math,JSON,Array,Number,String,Set,Map,Object,Error,Promise,setInterval:()=>{},console};
 vm.runInNewContext(read("reminders.js"),ctx,{filename:"reminders.js"});
 const reminders=w.NOVA_REMINDERS;
 reminders.init({toast:()=>{},refresh:()=>rendered++});
 visible=true;
 return {reminders,w,S,storage,data,notices,events,docs,setVisible:x=>visible=x,
 setDenied:x=>deniedStorage=x,setConfirm:x=>confirmed=x,permission:()=>permission,prompted:()=>prompted,rendered:()=>rendered};
}
function time(hour,min){return new Date(2026,9,11,hour,min,0,0)}
test("derives only open tasks, exams and sessions with correct trigger times",()=>{
 const b=boot(),list=b.reminders.derive(b.S,time(8,0));
 const t=list.find(x=>x.type==="task"),x=list.find(x=>x.type==="exam"),s=list.find(x=>x.type==="session"&&x.eventAt===time(9,0).getTime());
 assert.equal(t.dueAt,time(9,0).getTime());assert.equal(x.dueAt,time(9,0).getTime());
 assert.equal(s.dueAt,time(8,50).getTime());
 assert.equal(list.filter(x=>x.title==="Done Task").length,0);
});
test("new reminders are delivered only when due and are stored exactly once",()=>{
 const b=boot();
 assert.equal(b.reminders.tick(time(8,30)),0);
 assert.equal(b.reminders.tick(time(9,2)),3);
 assert.equal(b.reminders.get().entries.length,3);
 assert.equal(b.reminders.tick(time(9,3)),0);
 assert.equal(b.reminders.badge(),3);
 assert.equal(b.notices.length,0); // OS permission not granted and popups not opted in
});
test("app hidden never raises notification, then handles eligible recent missed alerts on return",()=>{
 const b=boot();b.setVisible(false);
 assert.equal(b.reminders.tick(time(9,5)),0);
 b.setVisible(true);
 assert.equal(b.reminders.tick(time(9,6)),3);
});
test("browser pop-up permission requires user click; enabling is persisted and future alerts show",async()=>{
 const b=boot();assert.equal(b.prompted(),0);
 assert.equal(await b.reminders.enableBrowser(),true);
 assert.equal(b.prompted(),1);assert.equal(b.reminders.get().browser,true);
 assert.equal(b.reminders.tick(time(9,0)),3);
 assert.equal(b.notices.length,3);
});
test("legacy previously granted browser reminder preference is respected without new permission prompt",()=>{
 const b=boot({legacy:true,permission:"granted"});
 assert.equal(b.reminders.get().browser,true);assert.equal(b.prompted(),0);
 b.reminders.tick(time(9,0));assert.equal(b.notices.length,3);
});
test("disabled browser popup prevents OS notification, inbox remains active",()=>{
 const b=boot({legacy:true,permission:"granted"});
 assert.equal(b.reminders.preference("browser",false),true);
 assert.equal(b.reminders.tick(time(9,0)),3);
 assert.equal(b.notices.length,0);assert.equal(b.reminders.get().entries.length,3);
});
test("snoozed reminder keeps record, and dismiss does not erase history",()=>{
 const b=boot();b.reminders.tick(time(9,0));
 const k=b.reminders.get().entries[0].key;
 assert.equal(b.reminders.updateEntry(k,"reminder-snooze"),true);
 assert.equal(b.reminders.get().entries[0].read,true);
 assert.ok(b.reminders.get().entries[0].snoozedUntil>Date.now());
 assert.equal(b.reminders.updateEntry(k,"reminder-dismiss"),true);
 assert.equal(b.reminders.get().entries[0].dismissed,true);
 assert.equal(b.reminders.get().entries.length,3);
});
test("mark read and clear history never modifies core routine data",()=>{
 const b=boot(),original=JSON.stringify(b.S);
 b.reminders.tick(time(9,0));
 assert.equal(b.reminders.markAllRead(),true);assert.equal(b.reminders.badge(),0);
 b.setConfirm(false);assert.equal(b.reminders.clearHistory(),false);
 b.setConfirm(true);assert.equal(b.reminders.clearHistory(),true);
 assert.equal(b.reminders.get().entries.length,0);
 assert.equal(JSON.stringify(b.S),original);
});
test("invalid preferences and malformed records are rejected",()=>{
 const b=boot();
 assert.equal(b.reminders.preference("sessionLead",900),false);
 assert.equal(b.reminders.preference("taskHour",25),false);
 assert.equal(b.reminders.preference("badField",true),false);
 assert.equal(b.reminders.get().sessionLead,10);
 const obj=b.reminders.get();obj.entries=[{key:"t",type:"task",title:"A",dueAt:10,firedAt:10,read:false,dismissed:false,snoozedUntil:null},
 {key:"t",type:"task",title:"A",dueAt:10,firedAt:10,read:false,dismissed:false,snoozedUntil:null}];
 assert.equal(b.reminders.valid(obj),false);
});
test("damaged reminder storage remains untouched rather than being overwritten",()=>{
 const b=boot({seed:"{broken"});
 assert.notEqual(b.reminders.getIssue(),"");
 assert.equal(b.reminders.preference("enabled",false),false);
 assert.equal(b.data.get(b.reminders.KEY),"{broken");
});
test("failed browser storage write leaves previously saved reminders unchanged",()=>{
 const b=boot();b.reminders.tick(time(9,0));
 const saved=b.data.get(b.reminders.KEY);
 b.setDenied(true);
 assert.equal(b.reminders.preference("tasks",false),false);
 assert.equal(b.data.get(b.reminders.KEY),saved);
 assert.equal(b.reminders.get().tasks,true);
});
test("stale browser tab does not overwrite newer recorded alerts",()=>{
 const b=boot();
 b.reminders.preference("examLead",30);
 const newer=b.reminders.get();newer.taskHour=11;
 const recent=JSON.stringify(newer);
 b.data.set(b.reminders.KEY,recent);
 assert.equal(b.reminders.preference("tasks",false),false);
 assert.equal(b.data.get(b.reminders.KEY),recent);
 assert.equal(b.reminders.get().taskHour,11);
});
test("old incomplete tasks that were due many days ago do not flood the inbox",()=>{
 const b=boot();b.S.tasks[0].due="2026-01-01";
 assert.equal(b.reminders.tick(time(9,0)),2);
 assert.equal(b.reminders.get().entries.some(x=>x.type==="task"),false);
});
test("in-app reminders can be turned off without changing the student's old preferences",()=>{
 const b=boot();
 const profile=JSON.stringify(b.S.profile);
 b.reminders.preference("enabled",false);
 assert.equal(b.reminders.tick(time(9,0)),0);
 assert.equal(b.reminders.upcoming(time(8,30)).length,0);
 assert.equal(JSON.stringify(b.S.profile),profile);
});
test("center and settings render English and Bengali and escape untrusted titles",()=>{
 const b=boot();b.S.tasks[0].title="<img onerror=alert(1)>";
 b.reminders.tick(time(9,0));
 const html=b.reminders.page();
 assert.match(html,/Reminder & Notification Center/);
 assert.match(html,/data-reminder-pref="sessionLead"/);
 assert.match(html,/data-action="reminder-browser"/);
 assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img onerror/);
 b.w.NOVA_I18N.language="bn";
 assert.match(b.reminders.page(),/রিমাইন্ডার ও নোটিফিকেশন সেন্টার/);
});
test("v2.9 route, notification bell and PWA cache integration without background push",()=>{
 const html=read("index.html"),app=read("app.js"),views=read("views.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/data-nav="notifications"/);
 assert.match(html,/id="reminderBadge"/);
 assert.match(html,/src="\.\/reminders\.js"/);
 assert.match(html,/href="\.\/reminders\.css"/);
 assert.match(html,/NOVASTUDY OS <b>3\.6\.2<\/b>/);
 assert.match(app,/Reminders\.handle\(action,b\)/);
 assert.match(app,/Reminders\.init/);
 assert.doesNotMatch(app,/setInterval\(remind,25000\)/);
 assert.doesNotMatch(views,/NOVA_REMINDERS\.panel/);
 assert.match(read("reminders.js"),/function panel\(\)/);
 assert.match(sw,/novastudy-v3\.6\.2/);
 assert.match(sw,/'\.\/reminders\.js'/);
 assert.doesNotMatch(sw,/push['"]/);
 assert.match(ci,/node --check reminders\.js/);
 for(const file of ["reminders.js","app.js","views.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
});
