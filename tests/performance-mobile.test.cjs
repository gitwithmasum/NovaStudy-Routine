const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function boot(){
 const state={profile:{name:"Student",category:"university",level:"Undergraduate",track:"CSE"},
 subjects:[{id:"a",name:"Programming"},{id:"b",name:"Math"}],sessions:[],tasks:[
  {id:"1",subjectId:"a",title:"Write Python loops",done:false,priority:"high",due:"2026-10-12"},
  {id:"2",subjectId:"b",title:"Complete algebra",done:true,priority:"medium",due:"2026-10-13"},
  {id:"3",subjectId:"a",title:"Build <script>unsafe()</script>",done:false,priority:"low",due:"2026-10-15"},
  {id:"4",subjectId:"a",title:"Python recursion",done:false,priority:"medium",due:"2026-10-14"}
 ]};
 const esc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
 const N={get:()=>state,escape:esc,
  name:id=>state.subjects.find(s=>s.id===id)?.name||"General",
  C:{university:{name:"University",tracks:{"CSE":["Programming","Math"]}}},
  DAYS:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  colors:["#12ffaa"],hour:x=>x,date:d=>[d.getFullYear(),d.getMonth()+1,d.getDate()].join("-"),
  color:id=>"#12ffaa",subjectPreset:()=>[]};
 const I={language:"en",t:s=>s,displayDate:s=>s,time:s=>s};
 const window={NOVA:N,NOVA_I18N:I};
 vm.runInNewContext(read("views.js"),{window,Date,Array,String,Number},{filename:"views.js"});
 return {V:window.NOVA_VIEWS,state};
}
test("v3.1 task results preserve current sorting and pending/done filters",()=>{
 const {V}=boot();
 const all=V.taskResults("all","");
 assert.ok(all.indexOf("Write Python loops")<all.indexOf("Complete algebra"));
 const pending=V.taskResults("pending","");
 assert.match(pending,/Write Python loops/);
 assert.doesNotMatch(pending,/Complete algebra/);
 const done=V.taskResults("done","");
 assert.match(done,/Complete algebra/);
 assert.doesNotMatch(done,/Python recursion/);
});
test("search case folding includes subject names and does not mutate the tasks",()=>{
 const {V,state}=boot(),before=JSON.stringify(state);
 const html=V.taskResults("all","pYtHoN");
 assert.match(html,/Write Python loops/);
 assert.match(html,/Python recursion/);
 assert.doesNotMatch(html,/Complete algebra/);
 assert.match(V.taskResults("all","mAtH"),/Complete algebra/);
 assert.equal(JSON.stringify(state),before);
});
test("task results are escaped, task IDs and checkbox actions remain usable",()=>{
 const {V}=boot(),html=V.taskResults("all","unsafe");
 assert.match(html,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
 assert.doesNotMatch(html,/<script>unsafe/);
 assert.match(html,/data-task-check="3"/);
 assert.match(html,/data-action="edit-task"/);
 assert.match(html,/data-action="delete-task"/);
});
test("task page exposes a stable results-only container and keeps input in a separate toolbar",()=>{
 const {V}=boot(),html=V.tasks("all","Rec");
 assert.match(html,/id="taskResults"/);assert.match(html,/id="taskSearch"/);
 assert.ok(html.indexOf('id="taskSearch"')<html.indexOf('id="taskResults"'));
 assert.match(html,/Python recursion/);
 assert.doesNotMatch(html,/Write Python loops/);
});
test("search event uses short debounce and updates results without re-rendering entire page",()=>{
 const app=read("app.js");
 assert.match(app,/taskSearchTimer=setTimeout\(\(\)=>/);
 assert.match(app,/\,120\)/);
 assert.match(app,/results\.innerHTML=V\.taskResults\(filter,query\)/);
 assert.match(app,/if\(page!=="tasks"\|\|\$\("taskSearch"\)!==input\|\|!results\)return/);
 assert.doesNotMatch(app,/query=e\.target\.value;const i=e\.target\.selectionStart;render\(\)/);
 assert.match(app,/function render\(\)\{clearTimeout\(taskSearchTimer\)/);
});
test("reminder updates on other pages change badge rather than rebuilding their view",()=>{
 const app=read("app.js");
 assert.match(app,/function updateReminderBadge\(\)/);
 assert.match(app,/Reminders\.init\(\{toast,refresh:\(\)=>\{if\(page==="notifications"\)render\(\);else updateReminderBadge\(\)\}\}\)/);
 assert.match(app,/if\(page===p&&location\.hash==="#"\+p\)\{revealActiveNav\(\);return\}/);
});
test("CSS marks offscreen paint optimizations as optional and uses reasonable intrinsic dimensions",()=>{
 const css=read("performance-mobile.css");
 assert.match(css,/@supports \(content-visibility:auto\)/);
 assert.match(css,/\.task-row\{content-visibility:auto;contain-intrinsic-size:auto 82px\}/);
 assert.match(css,/\.subject-card\{content-visibility:auto/);
 assert.match(css,/\.hub-record\{content-visibility:auto/);
 assert.doesNotMatch(css,/display:none/);
});
test("mobile touch targets, iOS inputs, safe areas and reduced-motion settings are supported",()=>{
 const css=read("performance-mobile.css");
 assert.match(css,/\.mobile-nav button\{min-height:56px!important\}/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/min-height:42px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-ui-reduced-motion="on"/);
});
test("v3.1 cache, version and offline assets are consistent without modifying sync sources",()=>{
 const html=read("index.html"),sw=read("sw.js"),views=read("views.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/NOVASTUDY OS <b>3\.5\.0<\/b>/);
 assert.match(html,/href="\.\/performance-mobile\.css"/);
 assert.match(sw,/novastudy-v3\.5\.0/);
 assert.match(sw,/'\.\/performance-mobile\.css'/);
 assert.match(sw,/event\.request\.mode==='navigate'/);
 assert.match(views,/taskResults\(filter,search\)/);
 assert.match(views,/tasks,taskResults,subjects,settings/);
 assert.match(ci,/node --test tests\/\*\.test\.cjs/);
 for(const path of ["app.js","views.js","sw.js"])
  assert.doesNotThrow(()=>new vm.Script(read(path),{filename:path}));
});
