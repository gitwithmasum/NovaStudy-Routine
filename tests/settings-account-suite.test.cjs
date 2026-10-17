"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function boot(lang="en"){
 const profile={name:"Student",institution:"",category:"university",level:"1",track:"CSE",weekStart:6};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const panels={
  NOVA_AUTH:{panel:()=>'<section class="panel google-auth-panel" aria-label="Google Account"><button data-action="google-signin">Continue with Google</button></section>'},
  NOVA_CLOUD:{panel:()=>'<section class="panel cloud-panel" aria-label="Cloud Backup"><button data-action="cloud-refresh">Refresh preview</button></section>'},
  NOVA_SYNC:{panel:()=>'<section class="panel cloud-panel" aria-label="Smart Sync"><button data-action="sync-review">Compare & review</button></section>'},
  NOVA_AUTO:{panel:()=>'<section class="panel cloud-panel" aria-label="Automatic Sync"><button data-action="auto-toggle">Enable automatic sync</button></section>'}
 };
 const win={...panels,NOVA:{C:{university:{name:"University",levels:["1"],tracks:{CSE:{}}}},DAYS:[],escape:esc,get:()=>({profile}),name:()=>"",color:()=>"",hour:()=>"",date:()=>""},
 NOVA_I18N:{language:lang,t:s=>lang==="bn"&&s==="Account & Cloud Services"?"অ্যাকাউন্ট ও ক্লাউড সার্ভিসেস":s},
 NOVA_REMINDERS:{panel:()=>'<section>Reminder preferences preserved</section>'},
 NOVA_UI:{settingsPanel:()=>'<section>Appearance preferences preserved</section>'}};
 vm.runInNewContext(read("views.js"),{window:win},{filename:"views.js"});
 return {views:win.NOVA_VIEWS,markup:()=>win.NOVA_VIEWS.settings()};
}
test("Account & Cloud Services shows five side-by-side selectable cards including Academic Profile",()=>{
 const {markup}=boot();
 const html=markup();
 assert.equal((html.match(/class="panel settings-account-suite"/g)||[]).length,1);
 assert.match(html,/id="settingsAccountTitle" class="panel-title">Account & Cloud Services/);
 assert.match(html,/class="settings-account-menu" role="group"/);
 const ids=["auth","cloud","sync","auto","profile"];
 for(const id of ids)
  assert.equal((html.match(new RegExp('data-action="account-service-select" data-account-service="'+id+'"','g'))||[]).length,1);
 assert.equal((html.match(/class="settings-tool-link settings-account-option/g)||[]).length,5);
 assert.match(html,/5 services/);
 assert.match(html,/data-account-service="profile"/);
 const positions=ids.map(id=>html.indexOf('data-account-service="'+id+'"'));
 assert.ok(positions.every((pos,i)=>i===0||pos>positions[i-1]));
 assert.match(html,/data-account-service="auth" aria-pressed="true"/);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
});
test("only selected module details render below cards while all original action IDs work",()=>{
 const {views,markup}=boot();
 const specs=[
  ["auth","google-signin"],
  ["cloud","cloud-refresh"],
  ["sync","sync-review"],
  ["auto","auto-toggle"],
  ["profile","profileForm"]
 ];
 for(const [name,action] of specs){
  assert.equal(views.selectAccountService(name),true);
  const html=markup();
  assert.match(html,new RegExp('data-account-service="'+name+'" aria-pressed="true"'));
  assert.match(html,name==="profile"?/id="profileForm"/:new RegExp('data-action="'+action+'"'));
  for(const other of specs.filter(v=>v[0]!==name))
   assert.doesNotMatch(html,other[0]==="profile"?/id="profileForm"/:new RegExp('data-action="'+other[1]+'"'));
  assert.match(html,/id="accountServiceContent" role="region"/);
 }
 assert.equal(views.selectAccountService("unknown"),false);
 assert.match(markup(),/data-account-service="profile" aria-pressed="true"/);
});
test("cards use true 4/2/1-column grid and active state styling; original four panel functions are untouched",()=>{
 const css=read("settings-tools.css"),html=read("index.html"),views=read("views.js"),app=read("app.js");
 assert.match(css,/\.settings-account-menu\{\s*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1150px\)[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:620px\)[\s\S]*?grid-template-columns:1fr/);
 assert.match(css,/settings-account-option\.selected/);
 assert.match(html,/href="\.\/settings-tools\.css"/);
 assert.match(app,/case"account-service-select":if\(V\.selectAccountService\(b\.dataset\.accountService\)\)\{render\(\)\}break/);
 for(const panel of ["NOVA_AUTH","NOVA_CLOUD","NOVA_SYNC","NOVA_AUTO"])
  assert.match(views,new RegExp('window\\.'+panel+'\\.panel\\(\\)'));
});
test("Bangla header and other settings sections remain intact with no storage writes",()=>{
 const {markup}=boot("bn");
 const html=markup();
 assert.match(html,/অ্যাকাউন্ট ও ক্লাউড সার্ভিসেস/);
 assert.match(html,/Reminder preferences preserved/);
 assert.match(html,/Appearance preferences preserved/);
 assert.match(read("i18n.js"),/"Google Account Cloud Backup":"গুগল অ্যাকাউন্ট ক্লাউড ব্যাকআপ"/);
 assert.doesNotMatch(read("views.js"),/localStorage\.setItem|sessionStorage\.setItem/);
});

test("Academic Profile card exposes original editable form fields exactly once",()=>{
 const {views,markup}=boot();
 assert.equal(views.selectAccountService("profile"),true);
 const html=markup();
 assert.match(html,/data-account-service="profile" aria-pressed="true"/);
 assert.equal((html.match(/id="profileForm"/g)||[]).length,1);
 for(const field of [
  'name="name"','name="institution"','id="profileCategory"',
  'id="profileLevel"','id="profileTrack"','name="weekStart"'
 ])assert.match(html,new RegExp(field));
 assert.match(html,/Save profile →/);
 assert.match(html,/Changing class or subject group never deletes existing routines/);
 assert.doesNotMatch(html,/data-action="google-signin"/);
});
test("profile data remains visible in its own service card after in-app re-render",()=>{
 const {views,markup}=boot();
 views.selectAccountService("profile");
 const first=markup();
 assert.match(first,/name="name" required maxlength="80" value="Student"/);
 assert.match(first,/name="institution" maxlength="100"/);
 assert.match(first,/data-account-service="profile" aria-pressed="true"/);
 assert.match(markup(),/id="profileForm"/);
 const app=read("app.js");
 assert.match(app,/e.target.id==="profileForm"/);
 assert.match(app,/id==="profileCategory"/);
 assert.match(app,/Profile saved\. Existing routine preserved\./);
});
