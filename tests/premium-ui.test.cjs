const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const KEY="novastudy_ui_v3_v1";
function boot(initial=null){
 let storageBlocked=false,allow=true,refreshes=0;
 const values=new Map(initial===null?[]:[[KEY,initial]]);
 const localStorage={getItem:k=>values.get(k)??null,setItem(k,v){if(storageBlocked)throw Error("quota");values.set(k,String(v));},removeItem:k=>values.delete(k)};
 const attrs={},html={dataset:attrs},document={documentElement:html};
 const window={NOVA:{escape:x=>String(x).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")},NOVA_I18N:{language:"en"},confirm:()=>allow};
 vm.runInNewContext(read("ui-personalization.js"),{window,document,localStorage,JSON,Map,Set,Object,Array,Number,String,Error},{filename:"ui-personalization.js"});
 const ui=window.NOVA_UI;
 ui.init({refresh:()=>refreshes++,toast:()=>{}});
 return {ui,attrs,values,setBlocked:v=>storageBlocked=v,setAllow:v=>allow=v,renderCount:()=>refreshes,window};
}
const items=[
{id:"weekly",html:"<section>Week</section>"},
{id:"exams",html:"<section>Exams</section>"},
{id:"today",html:"<section>Today</section>"},
{id:"tasks",html:"<section>Tasks</section>"},
{id:"actions",html:"<section>Actions</section>"}];
test("default v3.0 UI shows all existing dashboard widgets in their original order",()=>{
 const {ui}=boot(),s=ui.get();
 assert.equal(s.version,1);
 assert.deepEqual(Array.from(s.order),["weekly","exams","today","tasks","actions"]);
 const html=ui.widgets(items);
 assert.match(html,/data-ui-widget="weekly"/);
 assert.ok(html.indexOf("Week")<html.indexOf("Exams"));
 assert.ok(html.indexOf("Tasks")<html.indexOf("Actions"));
});
test("widget reorder persists and only rearranges HTML presentation",()=>{
 const b=boot(),before=JSON.stringify(items);
 assert.equal(b.ui.shift("exams",-1),true);
 assert.deepEqual(Array.from(b.ui.get().order),["exams","weekly","today","tasks","actions"]);
 assert.ok(b.ui.widgets(items).indexOf("Exams")<b.ui.widgets(items).indexOf("Week"));
 assert.equal(JSON.stringify(items),before);
 assert.deepEqual(Array.from(JSON.parse(b.values.get(KEY)).order),Array.from(b.ui.get().order));
});
test("visibility controls hide and show widget but never remove underlying records",()=>{
 const b=boot();
 assert.equal(b.ui.hiddenToggle("tasks"),true);
 assert.doesNotMatch(b.ui.widgets(items),/data-ui-widget="tasks"/);
 assert.equal(b.ui.get().hidden.includes("tasks"),true);
 assert.equal(b.ui.hiddenToggle("tasks"),true);
 assert.match(b.ui.widgets(items),/data-ui-widget="tasks"/);
});
test("at least one widget must remain visible",()=>{
 const b=boot();
 for(const id of ["weekly","exams","today","tasks"])assert.equal(b.ui.hiddenToggle(id),true);
 assert.equal(b.ui.hiddenToggle("actions"),false);
 assert.match(b.ui.widgets(items),/data-ui-widget="actions"/);
});
test("compact, high contrast and reduced-motion are independently persisted",()=>{
 const b=boot();
 assert.equal(b.ui.option("compact",true),true);
 assert.equal(b.ui.option("contrast",true),true);
 assert.equal(b.ui.option("reduceMotion",true),true);
 assert.equal(b.attrs.uiCompact,"on");assert.equal(b.attrs.uiContrast,"on");assert.equal(b.attrs.uiReducedMotion,"on");
 assert.equal(b.ui.option("bad",true),false);
 assert.equal(JSON.parse(b.values.get(KEY)).reduceMotion,true);
});
test("widget controls are keyboard-friendly buttons with explicit labels",()=>{
 const b=boot(),initial=b.ui.toolbar();
 assert.match(initial,/data-action="ui-customize"/);
 b.ui.handle("ui-customize");
 const h=b.ui.toolbar();
 assert.match(h,/data-action="ui-move-up"/);assert.match(h,/data-action="ui-move-down"/);
 assert.match(h,/data-action="ui-toggle-widget"/);assert.match(h,/aria-label=/);
 assert.equal(b.ui.handle("ui-move-down",{dataset:{id:"weekly"}}),true);
 assert.equal(b.ui.get().order[0],"exams");
});
test("settings panel controls are available in English and Bengali",()=>{
 const b=boot();
 assert.match(b.ui.settingsPanel(),/Display &amp; accessibility|Display & accessibility/);
 assert.match(b.ui.settingsPanel(),/data-ui-option="compact"/);
 assert.match(b.ui.settingsPanel(),/data-ui-option="contrast"/);
 b.window.NOVA_I18N.language="bn";
 assert.match(b.ui.settingsPanel(),/অ্যাক্সেসিবিলিটি/);
 assert.equal(b.ui.handleChange({dataset:{uiOption:"contrast"},checked:true}),true);
});
test("reset requires confirmation and preserves unrelated student keys",()=>{
 const b=boot();b.values.set("novastudy_state_v1","original-routine");
 b.ui.hiddenToggle("weekly");b.ui.option("compact",true);
 b.setAllow(false);assert.equal(b.ui.reset(),false);assert.equal(b.ui.get().compact,true);
 b.setAllow(true);assert.equal(b.ui.reset(),true);
 assert.equal(b.ui.get().compact,false);assert.equal(b.ui.get().hidden.length,0);
 assert.equal(b.values.get("novastudy_state_v1"),"original-routine");
});
test("malformed saved preferences are protected until explicit reset",()=>{
 const b=boot("{corrupted");const before=b.values.get(KEY);
 assert.notEqual(b.ui.getIssue(),"");
 assert.equal(b.ui.option("contrast",true),false);
 assert.equal(b.values.get(KEY),before);
 assert.equal(b.ui.reset(),true);
 assert.deepEqual(Array.from(b.ui.get().hidden),[]);
});
test("quota failure and concurrent-tab edits do not overwrite the newer saved layout",()=>{
 const b=boot();
 b.ui.option("compact",true);
 const raw=b.values.get(KEY);
 b.setBlocked(true);assert.equal(b.ui.option("contrast",true),false);
 assert.equal(b.values.get(KEY),raw);assert.equal(b.ui.get().contrast,false);
 b.setBlocked(false);
 const external=JSON.parse(raw);external.contrast=true;
 b.values.set(KEY,JSON.stringify(external));
 assert.equal(b.ui.option("reduceMotion",true),false);
 assert.equal(b.ui.get().contrast,true);assert.equal(b.ui.get().reduceMotion,false);
});
test("invalid order, unknown keys and excessive hidden widgets are rejected",()=>{
 const b=boot(),base=b.ui.get();
 base.order=["weekly","weekly","today","tasks","actions"];
 assert.equal(b.ui.valid(base),false);
 base.order=["weekly","exams","today","tasks","actions"];base.hidden=["weekly","exams","today","tasks","actions"];
 assert.equal(b.ui.valid(base),false);
 base.hidden=[];base.extra="ignored";
 assert.equal(b.ui.valid(base),true);
});
test("v3.0 integration includes dashboard, PWA cache, skip access and mobile keyboard nav",()=>{
 const html=read("index.html"),app=read("app.js"),dash=read("dashboard.js"),views=read("views.js"),sw=read("sw.js");
 const css=read("premium-ui.css"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/data-action="focus-content"/);
 assert.match(html,/id="view" class="view" tabindex="-1"/);
 assert.match(html,/src="\.\/ui-personalization\.js"/);
 assert.match(html,/href="\.\/premium-ui\.css"/);
 assert.match(html,/NOVASTUDY OS <b>3\.5\.3<\/b>/);
 assert.match(app,/UI\.handle\(action,b\)/);assert.match(app,/UI\.handleChange\(e\.target\)/);
 assert.match(app,/revealActiveNav/);assert.match(app,/aria-current/);
 assert.match(app,/ArrowRight/);assert.match(app,/ArrowLeft/);
 assert.match(dash,/window\.NOVA_UI\?\.widgets/);
 assert.match(views,/window\.NOVA_UI\?\.settingsPanel/);
 assert.match(sw,/novastudy-v3\.5\.3/);
 assert.match(sw,/'\.\/ui-personalization\.js'/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/data-ui-contrast="on"/);
 assert.match(ci,/node --check ui-personalization\.js/);
 for(const file of ["ui-personalization.js","dashboard.js","app.js","sw.js","views.js"])
  assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
});
