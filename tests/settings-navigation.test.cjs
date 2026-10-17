"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const matchNav=(html,selector)=>html.match(new RegExp('<nav class="'+selector+'"[^>]*>[\\s\\S]*?<\\/nav>'))?.[0]||"";
function settingsMarkup(lang="en"){
 const profile={name:"Student",institution:"BUBT",category:"university",level:"1",track:"CSE",weekStart:6};
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const i18n={language:lang,t:s=>lang==="bn"&&s==="Tools & utilities"?"টুলস ও ইউটিলিটিস":s};
 const w={
  NOVA:{C:{university:{name:"University",levels:["1"],tracks:{CSE:{}}}},DAYS:["Sun","Mon"],escape,get:()=>({profile}),name:()=>"",color:()=>"",hour:()=>"",date:()=>""},
  NOVA_I18N:i18n,
  NOVA_AUTH:{panel:()=>"<section>Google login preserved</section>"},
  NOVA_CLOUD:{panel:()=>"<section>Cloud backup preserved</section>"},
  NOVA_SYNC:{panel:()=>"<section>Sync preserved</section>"},
  NOVA_AUTO:{panel:()=>"<section>Auto sync preserved</section>"},
  NOVA_REMINDERS:{panel:()=>"<section>Reminder preferences preserved</section>"},
  NOVA_UI:{settingsPanel:()=>"<section>Accessibility preserved</section>"}
 };
 vm.runInNewContext(read("views.js"),{window:w},{filename:"views.js"});
 return w.NOVA_VIEWS.settings();
}
test("desktop and mobile navigation show Course Manager and Profile Settings, not three utility pages",()=>{
 const html=read("index.html");
 const desktop=matchNav(html,"nav-list"),mobile=matchNav(html,"mobile-nav");
 for(const nav of [desktop,mobile]){
  assert.ok(nav,"navigation exists");
  assert.match(nav,/data-nav="subjects"/);
  assert.match(nav,/data-nav="settings"/);
  for(const route of ["notifications","diagnostics","portability"])
   assert.doesNotMatch(nav,new RegExp('data-nav="'+route+'"'),route+" must not be a navbar item");
 }
 assert.match(desktop,/Course &amp; Notes Manager/);
});
test("Profile Settings groups four utility cards, including Personalization",()=>{
 const html=settingsMarkup();
 const cards=html.slice(html.indexOf('class="settings-tool-grid"'),html.indexOf('</section>',html.indexOf('class="settings-tool-grid"')));
 assert.match(html,/id="settingsToolsTitle"/);
 assert.ok(html.indexOf('class="settings-tools"')<html.indexOf('class="settings-grid"'));
 for(const route of ["notifications","diagnostics","portability"])
  assert.equal((cards.match(new RegExp('data-nav="'+route+'"','g'))||[]).length,1);
 assert.match(cards,/Reminders & notifications/);
 assert.match(cards,/App diagnostics/);
 assert.match(cards,/Backup & data portability/);
 assert.match(cards,/Personalization/);
 assert.equal((cards.match(/data-action="settings-data-toggle"/g)||[]).length,1);
 assert.match(cards,/aria-expanded="false" aria-controls="settingsDataNotifications"/);
 assert.equal((cards.match(/class="settings-tool-link/g)||[]).length,4);
 assert.ok(cards.indexOf('data-nav="notifications"')<cards.indexOf('data-nav="diagnostics"'));
 assert.ok(cards.indexOf('data-nav="diagnostics"')<cards.indexOf('data-nav="portability"'));
 for(const text of ["Google login preserved"])
  assert.match(html,new RegExp(text));
 assert.match(html,/data-account-service="cloud"/);
 assert.match(read("views.js"),/window\.NOVA_CLOUD\.panel\(\)/);
});
test("Bangla settings navigation keeps all utility shortcuts and translated title",()=>{
 const html=settingsMarkup("bn");
 assert.match(html,/টুলস ও ইউটিলিটিস/);
 assert.match(html,/পড়াশোনার রিমাইন্ডার/);
 assert.match(html,/অ্যাপের অবস্থা/);
 assert.match(html,/ডেটা এক্সপোর্ট/);
 assert.match(html,/Personalization/);
 for(const route of ["notifications","diagnostics","portability"])
  assert.match(html,new RegExp('data-nav="'+route+'"'));
});
test("legacy utility routes remain loadable from Settings without touching course navigation",()=>{
 const app=read("app.js"),sw=read("sw.js"),html=read("index.html");
 for(const page of ["notifications","diagnostics","portability"]){
  assert.match(app,new RegExp('page==="'+page+'"'));
  assert.match(app,new RegExp('"'+page+'"'));
 }
 assert.match(app,/\["notifications","diagnostics","portability"\]\.includes\(page\)&&x\.dataset\.nav==="settings"/);
 assert.match(html,/href="\.\/settings-tools\.css"/);
 assert.match(sw,/'\.\/settings-tools\.css'/);
 assert.match(html,/src="\.\/course-manager\.js"/);
});
