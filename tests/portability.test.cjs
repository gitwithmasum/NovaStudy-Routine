const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const esc=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const validRecord=v=>v&&v.version===1;
function boot(options={}){
 const keys={study:"novastudy_state_v1",learning:"novastudy_learning_hub_v1",focus:"novastudy_focus_insights_v1",
 reminders:"novastudy_reminders_v1",ui:"novastudy_ui_v3_v1",theme:"novastudy_theme_v1",language:"novastudy_language_v1"};
 const values=new Map([[keys.study,JSON.stringify({version:1,title:"Old routine"})],
 [keys.learning,JSON.stringify({version:1,title:"Old learning"})],
 [keys.focus,JSON.stringify({version:1,title:"Old focus"})],
 [keys.reminders,JSON.stringify({version:1,title:"Old reminders"})],
 [keys.ui,JSON.stringify({version:1,title:"Old UI"})],
 [keys.theme,"gold"],[keys.language,"bn"],["private_auth_token","DO_NOT_EXPORT"]]);
 let writeNumber=0,failAt=Infinity,reloads=0,confirmed=true,busyEditor=false,downloaded=0;
 const storage={
  getItem:k=>values.get(k)??null,
  setItem(k,value){writeNumber++;if(writeNumber===failAt)throw Error("quota error");values.set(k,String(value))},
  removeItem:k=>values.delete(k)
 };
 const w={NOVA:{KEY:keys.study,get:()=>({version:1,title:"Current routine"}),valid:validRecord,escape:esc,
 date:()=> "2026-10-12"},NOVA_LEARNING_HUB:{KEY:keys.learning,valid:validRecord},
 NOVA_FOCUS_INSIGHTS:{KEY:keys.focus,valid:validRecord},
 NOVA_REMINDERS:{KEY:keys.reminders,valid:validRecord},
 NOVA_UI:{KEY:keys.ui,valid:validRecord},
 NOVA_I18N:{KEY:keys.language,language:"en"},
 confirm:()=>confirmed,location:{reload:()=>{reloads++}}};
 const doc={getElementById:()=>({open:busyEditor}),body:{appendChild:()=>{}},createElement:()=>({click:()=>downloaded++,remove:()=>{}})};
 const url={createObjectURL:()=> "blob:export",revokeObjectURL:()=>{}};
 vm.runInNewContext(read("portability.js"),{window:w,document:doc,localStorage:storage,Blob,URL:url,
 Date,JSON,Math,Map,Set,Number,Array,Object,String,Error,Promise,setTimeout:()=>{}},{filename:"portability.js"});
 const mod=w.NOVA_PORTABILITY;
 mod.init({refresh:()=>{}});
 return{mod,w,keys,values,storage,reloads:()=>reloads,downloaded:()=>downloaded,
 setFail:n=>{failAt=n;writeNumber=0},setConfirm:v=>confirmed=v,setEditor:v=>busyEditor=v};
}
const jsonFile=(v)=>{const s=JSON.stringify(v);return {size:s.length,text:async()=>s}};
const imported=(b)=>{
 const bundle=b.mod.makeBackup(new Date("2026-10-12T00:00:00Z"));
 for(const k of ["study","learning","focus","reminders","ui"])bundle.modules[k]={version:1,title:"Imported "+k};
 bundle.modules.theme="cyber";bundle.modules.language="en";
 return bundle;
};
test("combined export reads only known academic keys, not auth/cloud secrets",()=>{
 const b=boot();const payload=b.mod.makeBackup();
 assert.equal(payload.version,1);assert.equal(payload.format,"novastudy-portability");
 assert.equal(payload.modules.study.title,"Old routine");
 assert.equal(payload.modules.focus.title,"Old focus");
 assert.equal(b.mod.validateBundle(payload),true);
 assert.doesNotMatch(JSON.stringify(payload),/DO_NOT_EXPORT|private_auth_token/);
 assert.equal(b.mod.download(),true);assert.equal(b.downloaded(),1);
});
test("missing optional modules are null and never replaced on import",async()=>{
 const b=boot(),p=imported(b);
 p.modules.focus=null;p.modules.learning=null;
 assert.equal(b.mod.validateBundle(p),true);
 assert.equal(await b.mod.prepare(jsonFile(p)),true);
 assert.equal(b.mod.preview().selected.includes("focus"),false);
 assert.equal(b.mod.preview().selected.includes("study"),true);
 assert.equal(b.mod.replaceSelection(),true);
 assert.equal(b.reloads(),1);
 assert.equal(JSON.parse(b.values.get(b.keys.focus)).title,"Old focus");
});
test("import validates every module and rejects malicious or damaged files",async()=>{
 const b=boot(),p=imported(b);
 p.modules.focus={version:2,title:"invalid"};
 assert.equal(b.mod.validateBundle(p),false);
 assert.equal(await b.mod.prepare(jsonFile(p)),false);
 assert.equal(b.mod.getPending(),null);
 assert.equal(JSON.parse(b.values.get(b.keys.study)).title,"Old routine");
 const missing={...imported(b)};delete missing.modules.study;
 assert.equal(b.mod.validateBundle(missing),false);
});
test("selective restore only replaces checked modules and preserves others",async()=>{
 const b=boot(),p=imported(b);
 assert.equal(await b.mod.prepare(jsonFile(p)),true);
 for(const key of b.mod.ORDER)if(key!=="study"&&key!=="focus")b.mod.select(key,false);
 assert.deepEqual(Array.from(b.mod.preview().selected),["study","focus"]);
 assert.equal(b.mod.replaceSelection(),true);
 assert.equal(JSON.parse(b.values.get(b.keys.study)).title,"Imported study");
 assert.equal(JSON.parse(b.values.get(b.keys.focus)).title,"Imported focus");
 assert.equal(JSON.parse(b.values.get(b.keys.learning)).title,"Old learning");
 assert.equal(b.values.get(b.keys.theme),"gold");
});
test("cancel and declined confirmation never overwrite student data",async()=>{
 const b=boot(),p=imported(b);
 assert.equal(await b.mod.prepare(jsonFile(p)),true);
 b.setConfirm(false);assert.equal(b.mod.replaceSelection(),false);
 assert.equal(JSON.parse(b.values.get(b.keys.study)).title,"Old routine");
 b.setConfirm(true);assert.equal(b.mod.cancel(),true);
 assert.equal(b.mod.getPending(),null);
});
test("open unsaved editor blocks restore even if user confirms",async()=>{
 const b=boot();await b.mod.prepare(jsonFile(imported(b)));b.setEditor(true);
 assert.equal(b.mod.replaceSelection(),false);assert.equal(b.reloads(),0);
 assert.equal(JSON.parse(b.values.get(b.keys.study)).title,"Old routine");
});
test("write failure restores all previously written values and avoids reload",async()=>{
 const b=boot();await b.mod.prepare(jsonFile(imported(b)));
 b.setFail(3);assert.equal(b.mod.replaceSelection(),false);
 assert.equal(JSON.parse(b.values.get(b.keys.study)).title,"Old routine");
 assert.equal(JSON.parse(b.values.get(b.keys.learning)).title,"Old learning");
 assert.equal(JSON.parse(b.values.get(b.keys.focus)).title,"Old focus");
 assert.equal(b.reloads(),0);
});
test("an invalid existing module prevents misleading combined export",()=>{
 const b=boot();b.values.set(b.keys.learning,"{corrupt");
 assert.throws(()=>b.mod.makeBackup(),/Cannot export/);
 assert.equal(b.mod.download(),false);
});
test("combined backup accepts Mint Halftone without weakening enum validation",()=>{
 const b=boot(),bundle=imported(b);
 for(const theme of ["cyber","gold","halftone"]){
  bundle.modules.theme=theme;
  assert.equal(b.mod.validateBundle(bundle),true,theme+" must be accepted");
 }
 bundle.modules.theme="javascript:alert(1)";
 assert.equal(b.mod.validateBundle(bundle),false);
});
test("theme and language enums are restricted",()=>{
 const b=boot(),p=imported(b);p.modules.theme="javascript:alert(1)";
 assert.equal(b.mod.validateBundle(p),false);
 p.modules.theme="gold";p.modules.language="xx";
 assert.equal(b.mod.validateBundle(p),false);
});
test("invalid oversized JSON file is rejected before JSON parse",async()=>{
 const b=boot();
 assert.equal(await b.mod.prepare({size:4000000,text:async()=> "{}"}),false);
 assert.equal(b.mod.getPending(),null);
});
test("backup UI escapes records and includes explicit preview controls",async()=>{
 const b=boot(),p=imported(b);
 await b.mod.prepare(jsonFile(p));
 const h=b.mod.page();
 assert.match(h,/data-action="portability-export"/);
 assert.match(h,/data-action="portability-restore"/);
 assert.match(h,/data-portability-module="focus"/);
 assert.match(h,/id="portabilityFile"/);
 b.w.NOVA_I18N.language="bn";
 assert.match(b.mod.page(),/ব্যাকআপ/);
});
test("v3.4 scripts, app routes, offline cache, static audits and validation hooks are wired",()=>{
 const html=read("index.html"),app=read("app.js"),sw=read("sw.js"),focus=read("focus-insights.js"),
 audit=read("scripts/release-audit.cjs"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(html,/NOVASTUDY OS <b>3\.6\.1<\/b>/);
 assert.doesNotMatch(html,/data-nav="portability"/);
 assert.match(read("views.js"),/route:"portability"/);
 assert.match(html,/src="\.\/portability\.js"/);
 assert.match(html,/href="\.\/portability\.css"/);
 assert.match(app,/Portability\.page\(\)/);assert.match(app,/Portability\.change/);
 assert.match(app,/Portability\.init/);
 assert.match(focus,/NOVA_FOCUS_INSIGHTS=\{KEY,valid/);
 assert.match(sw,/novastudy-v3\.6\.1/);
 assert.match(sw,/'\.\/portability\.js'/);
 assert.match(audit,/novastudy-v3\\\.6\\\.0/);
 assert.match(ci,/node --check portability\.js/);
 for(const p of ["portability.js","app.js","sw.js"])assert.doesNotThrow(()=>new vm.Script(read(p),{filename:p}));
});
