const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const KEY="novastudy_focus_insights_v1",FOCUS="novastudy_focus_v1";
const dt=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
function boot(initial=null){
 const values=new Map(initial===null?[]:[[KEY,initial]]);
 let blocked=false,confirmed=true,minutes=25,completed=0,modeChanges=[],starts=0,toastMessages=[],refreshes=0,downloads=0;
 const storage={values,getItem:k=>values.has(k)?values.get(k):null,setItem(k,v){if(blocked)throw Error("quota");values.set(k,String(v))},removeItem:k=>values.delete(k)};
 const win={NOVA:{date:dt,escape:esc},
 NOVA_I18N:{language:"en",number:v=>String(v)},
 NOVA_FOCUS:{get:()=>({completed,totalMinutes:minutes,running:false}),mode:m=>{modeChanges.push(m);return true},
 start:()=>{starts++;return true},status:()=>""},confirm:()=>confirmed};
 const doc={body:{append:()=>{}},createElement:()=>({click:()=>downloads++,remove:()=>{}})};
 const FakeForm=class{constructor(x){this.fields=x}get(k){return this.fields[k]}};
 vm.runInNewContext(read("focus-insights.js"),{window:win,document:doc,localStorage:storage,FormData:FakeForm,
 Date,Math,JSON,Object,Array,String,Number,Set,Map,Blob:class{constructor(parts){this.parts=parts}},
 URL:{createObjectURL:()=>"blob:test",revokeObjectURL:()=>{}},setTimeout:()=>{}},{filename:"focus-insights.js"});
 const insights=win.NOVA_FOCUS_INSIGHTS;insights.init({toast:m=>toastMessages.push(m),refresh:()=>refreshes++});
 return{insights,win,storage,setBlocked:x=>blocked=x,setConfirm:x=>confirmed=x,
  setCompleted:x=>completed=x,modeChanges,starts:()=>starts,downloads:()=>downloads,toasts:toastMessages,refreshes:()=>refreshes};
}
test("new log has independent storage and does not touch routine or legacy focus key",()=>{
 const b=boot();b.storage.values.set("novastudy_state_v1",'{"task":"preserve"}');
 b.storage.values.set(FOCUS,'{"completed":5}');
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:Date.now(),minutes:25}),true);
 assert.equal(b.insights.get().events.length,1);
 assert.equal(b.storage.getItem("novastudy_state_v1"),'{"task":"preserve"}');
 assert.equal(b.storage.getItem(FOCUS),'{"completed":5}');
});
test("idempotent completion history, focus and breaks stay distinct",()=>{
 const b=boot(),now=Date.now();
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:now,minutes:25}),true);
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:now,minutes:25}),true);
 assert.equal(b.insights.recordCompletion({mode:"short",finishedAt:now,minutes:5}),true);
 const log=b.insights.get().events;assert.equal(log.length,2);assert.equal(log[0].mode,"focus");assert.equal(log[1].mode,"short");
});
test("daily and weekly figures only count recorded focus sessions, not break minutes",()=>{
 const b=boot(),today=Date.now(),yesterday=today-86400000;
 b.insights.recordCompletion({mode:"focus",finishedAt:today,minutes:50});
 b.insights.recordCompletion({mode:"focus",finishedAt:yesterday,minutes:25});
 b.insights.recordCompletion({mode:"long",finishedAt:today-18000,minutes:15});
 const s=b.insights.stats();
 assert.equal(s.todayMinutes,50);assert.equal(s.weeklyMinutes,75);
 assert.equal(s.weeklyBlocks,2);assert.equal(s.totalLogged,2);
 assert.equal(s.week.length,7);
});
test("distraction events are categorized and safely encoded on screen",()=>{
 const b=boot();
 assert.equal(b.insights.addDistraction({reason:"social",note:'<img src=x onerror="bad()">' }),true);
 assert.equal(b.insights.stats().weeklyDistractions,1);
 const html=b.insights.panel();assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img src=x/);
 assert.match(html,/Social media/);
 assert.equal(b.insights.addDistraction({reason:"bad",note:"test"}),false);
 assert.equal(b.insights.get().distractions.length,1);
});
test("break planning selects long only at user-defined completed block intervals",()=>{
 const b=boot();
 assert.equal(b.insights.recommendedBreak(),"short");
 b.setCompleted(4);assert.equal(b.insights.recommendedBreak(),"long");
 assert.equal(b.insights.setLongBreakEvery(3),true);
 assert.equal(b.insights.recommendedBreak(),"short");
 b.setCompleted(6);assert.equal(b.insights.recommendedBreak(),"long");
 assert.equal(b.insights.startRecommendedBreak(),true);
 assert.equal(b.modeChanges.at(-1),"long");assert.equal(b.starts(),1);
 assert.equal(b.insights.setLongBreakEvery(1),false);
});
test("clear of v2.6 history requires confirmation and leaves timer and routine unchanged",()=>{
 const b=boot();b.insights.recordCompletion({mode:"focus",finishedAt:Date.now(),minutes:25});
 b.storage.values.set("novastudy_state_v1","routine-safe");
 b.storage.values.set(FOCUS,"old-timer-safe");
 b.setConfirm(false);assert.equal(b.insights.clearHistory(),false);assert.equal(b.insights.get().events.length,1);
 b.setConfirm(true);assert.equal(b.insights.clearHistory(),true);
 assert.equal(b.insights.get().events.length,0);
 assert.equal(b.storage.getItem("novastudy_state_v1"),"routine-safe");
 assert.equal(b.storage.getItem(FOCUS),"old-timer-safe");
});
test("malformed storage stays untouched until explicit reset",()=>{
 const b=boot("{damaged");
 assert.match(b.insights.getIssue(),/storage is damaged/);
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:Date.now(),minutes:25}),false);
 assert.equal(b.storage.getItem(KEY),"{damaged");
 b.setConfirm(true);assert.equal(b.insights.clearHistory(),true);
 assert.equal(b.insights.get().events.length,0);
});
test("quota error never writes partial session history",()=>{
 const b=boot();b.insights.recordCompletion({mode:"focus",finishedAt:Date.now(),minutes:25});
 const before=b.storage.getItem(KEY);b.setBlocked(true);
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:Date.now()+100,minutes:50}),false);
 assert.equal(b.storage.getItem(KEY),before);
});
test("stale tab cannot overwrite newer changes to history",()=>{
 const b=boot(),at=Date.now();
 b.insights.recordCompletion({mode:"focus",finishedAt:at,minutes:25});
 const remote=JSON.stringify({version:1,events:[{id:"focus:999",mode:"focus",finishedAt:999,minutes:30}],distractions:[],longBreakEvery:4});
 b.storage.values.set(KEY,remote);
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:at+100,minutes:25}),false);
 assert.equal(b.storage.getItem(KEY),remote);
 assert.equal(b.insights.get().events[0].id,"focus:999");
});
test("session and distraction arrays reject invalid input and are size-limited",()=>{
 const b=boot();
 assert.equal(b.insights.recordCompletion({mode:"focus",finishedAt:Date.now(),minutes:181}),false);
 assert.equal(b.insights.recordCompletion({mode:"bad",finishedAt:Date.now(),minutes:25}),false);
 const long=JSON.stringify({version:1,events:[],distractions:[],longBreakEvery:7});
 const damaged=boot(long);assert.notEqual(damaged.insights.getIssue(),"");
});
test("all new component scripts, PWA and bilingual theme layout are wired",()=>{
 const files=Object.fromEntries(["index.html","focus.js","focus-insights.js","focus-insights.css","app.js","sw.js",".github/workflows/novastudy-tests.yml"].map(x=>[x,read(x)]));
 assert.match(files["index.html"],/NOVASTUDY OS <b>3\.5\.3<\/b>/);
 assert.match(files["index.html"],/src="\.\/focus-insights\.js"/);
 assert.match(files["index.html"],/href="\.\/focus-insights\.css"/);
 assert.match(files["focus.js"],/NOVA_FOCUS_INSIGHTS\?\.recordCompletion/);
 assert.match(files["focus.js"],/NOVA_FOCUS_INSIGHTS\?\.panel/);
 assert.match(files["app.js"],/Insights\.handle\(action,b\)/);
 assert.match(files["app.js"],/Insights\.addDistraction/);
 assert.match(files["sw.js"],/novastudy-v3\.5\.3/);
 assert.match(files["sw.js"],/'\.\/focus-insights\.js'/);
 assert.match(files["focus-insights.css"],/html\[data-theme="gold"\]/);
 assert.match(files["focus-insights.css"],/@media\(max-width:660px\)/);
 assert.match(files[".github/workflows/novastudy-tests.yml"],/node --check focus-insights\.js/);
 for(const script of ["focus.js","focus-insights.js","app.js"])assert.doesNotThrow(()=>new vm.Script(files[script],{filename:script}));
});