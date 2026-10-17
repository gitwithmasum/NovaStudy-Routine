"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
function boot(language="en"){
 const profile={name:"Student",institution:"",category:"university",level:"1",track:"CSE",weekStart:6};
 const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
 const window={
  NOVA:{C:{university:{name:"University",levels:["1"],tracks:{CSE:{}}}},DAYS:[],escape:esc,get:()=>({profile}),name:()=>"",color:()=>"",hour:()=>"",date:()=>""},
  NOVA_I18N:{language,t:text=>language==="bn"&&text==="Tools & utilities"?"টুলস ও ইউটিলিটিস":text},
  NOVA_AUTH:{panel:()=>'<div class="mock-auth">Google Account retained</div>'},
  NOVA_CLOUD:{panel:()=>"<section>Cloud Backup retained</section>"},
  NOVA_SYNC:{panel:()=>"<section>Smart Sync retained</section>"},
  NOVA_AUTO:{panel:()=>"<section>Automatic Sync retained</section>"},
  NOVA_REMINDERS:{panel:()=>'<div class="mock-reminders">Reminder preferences retained</div>'},
  NOVA_UI:{settingsPanel:()=>'<div class="mock-ui">Accessibility preferences retained</div>'}
 };
 vm.runInNewContext(read("views.js"),{window},{filename:"views.js"});
 return {views:window.NOVA_VIEWS,html:()=>window.NOVA_VIEWS.settings()};
}
test("Tools & utilities has four visible cards in requested order; Personalization is initially closed",()=>{
 const {html}=boot(),markup=html();
 const tools=markup.slice(markup.indexOf('class="settings-tool-grid"'),markup.indexOf('class="settings-data-content settings-utility-content"'));
 const entries=['data-settings-utility="notifications"','data-settings-utility="diagnostics"','data-settings-utility="portability"','data-action="settings-data-toggle"'];
 let last=-1;
 for(const entry of entries){
  const current=tools.indexOf(entry);
  assert.ok(current>last,entry+" should follow previous card");
  last=current;
 }
 assert.equal((tools.match(/class="settings-tool-link/g)||[]).length,4);
 assert.match(tools,/Personalization/);
 assert.match(tools,/aria-expanded="false" aria-controls="settingsUtilityContent"/);
 assert.match(markup,/class="settings-data-content settings-utility-content" id="settingsUtilityContent" role="region" aria-label="Tools & utilities" hidden/);
 assert.doesNotMatch(markup,/<b class="panel-title">Personalization<\/b>/);
 assert.ok(markup.indexOf('id="settingsUtilityContent"')<markup.indexOf('class="settings-grid"'));
});
test("clicking Personalization reveals theme, language and display settings without duplicate backup controls",()=>{
 const {views,html}=boot();
 assert.equal(views.toggleDataNotifications(),true);
 const open=html();
 assert.match(open,/data-action="settings-data-toggle" data-settings-utility="data" aria-expanded="true"/);
 assert.match(open,/class="settings-data-content settings-utility-content" id="settingsUtilityContent" role="region" aria-label="Personalization"><section class="panel settings-data-panel"/);
 for(const name of ["cyber","gold","halftone"])
  assert.match(open,new RegExp('data-theme-value="'+name+'"'));
 assert.match(open,/data-action="language-select" data-lang="bn"/);
 assert.doesNotMatch(open,/data-action="export"/);
 assert.doesNotMatch(open,/id="importFile"/);
 assert.doesNotMatch(open,/Reminder preferences retained|Reminder preferences/i);
 assert.doesNotMatch(open,/Your routines are saved in THIS browser/);
 assert.doesNotMatch(open,/Export JSON backup|Import backup/);
 assert.match(open,/Accessibility preferences retained/);
 assert.equal((open.match(/<b class="panel-title">Personalization<\/b>/g)||[]).length,1);
 assert.equal(views.toggleDataNotifications(),false);
 assert.match(html(),/class="settings-data-content settings-utility-content" id="settingsUtilityContent" role="region" aria-label="Tools & utilities" hidden/);
});
test("theme selection handler and responsive 4/2/1 card layout stay functional",()=>{
 const {views,html}=boot();
 views.toggleDataNotifications();
 views.selectAccountService("cloud");
 assert.match(html(),/data-account-service="cloud" aria-pressed="true"/);
 assert.match(read("app.js"),/case"settings-data-toggle":\{/);
 assert.match(read("app.js"),/V\.toggleSettingsUtility\(utility\)/);
 assert.match(read("app.js"),/refreshSettingsTools\(utility\)/);
 const css=read("settings-tools.css");
 assert.match(css,/\.settings-tools \.settings-tool-grid\{\s*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:1150px\)[\s\S]*?\.settings-tools \.settings-tool-grid\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.settings-data-content\[hidden\]\{\s*display:none!important/);
 assert.match(css,/@media\(max-width:660px\)[\s\S]*?\.settings-tools \.settings-tool-grid\{grid-template-columns:1fr\}/);
 assert.match(read("i18n.js"),/"Personalization":"পার্সোনালাইজেশন"/);
});
test("Personalization move does not alter user data, original settings or primary navigation",()=>{
 const source=read("views.js"),app=read("app.js"),index=read("index.html");
 assert.doesNotMatch(source,/localStorage\.setItem|sessionStorage\.setItem/);
 assert.match(source,/Academic profile/);
 assert.match(source,/accountServicePanel\(\)/);
 assert.match(index,/data-nav="subjects"/);
 assert.match(index,/data-nav="settings"/);
 assert.match(app,/case"theme-select":setTheme\(b\.dataset\.themeValue\)/);
 assert.match(app,/case"language-select":switchLanguage\(b\.dataset\.lang\)/);
});
