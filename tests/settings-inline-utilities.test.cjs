"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function boot(){
 const profile={name:"Learner",institution:"University",category:"university",level:"1",track:"CSE",weekStart:6};
 const stub={
  NOVA:{C:{university:{name:"University",levels:["1"],tracks:{CSE:{}}}},DAYS:[],escape:s=>String(s),get:()=>({profile}),name:()=>"",color:()=>"",hour:()=>"",date:()=>""},
  NOVA_I18N:{language:"en",t:s=>s},
  NOVA_AUTH:{panel:()=>'<div>Auth panel</div>'},
  NOVA_CLOUD:{panel:()=>'<div>Cloud panel</div>'},
  NOVA_SYNC:{panel:()=>'<div>Sync panel</div>'},
  NOVA_AUTO:{panel:()=>'<div>Auto sync panel</div>'},
  NOVA_REMINDERS:{page:()=>'<div class="reminder-root"><button data-action="reminder-read-all">Mark all read</button><p>Reminder preferences and history</p></div>'},
  NOVA_DIAGNOSTICS:{page:()=>'<div class="diag-root"><button data-action="diagnostics-run">Run diagnostics</button></div>'},
  NOVA_PORTABILITY:{page:()=>'<div class="port-root"><input id="portabilityFile" type="file"><button data-action="portability-export">Download backup</button></div>'},
  NOVA_UI:{settingsPanel:()=>"<div>Accessibility settings</div>"}
 };
 vm.runInNewContext(read("views.js"),{window:stub},{filename:"views.js"});
 return {view:stub.NOVA_VIEWS,render:()=>stub.NOVA_VIEWS.settings()};
}
test("all four utility cards expand directly below Tools, without old navigation links",()=>{
 const {render}=boot(),html=render();
 const buttons=html.slice(html.indexOf('class="settings-tool-grid"'),html.indexOf('class="settings-data-content'));
 const routes=["notifications","diagnostics","portability","data"];
 for(const id of routes){
  assert.equal((buttons.match(new RegExp('data-settings-utility="'+id+'"','g'))||[]).length,1);
  assert.doesNotMatch(buttons,new RegExp('data-nav="'+id+'"'));
 }
 assert.equal((buttons.match(/aria-expanded="false"/g)||[]).length,4);
 assert.match(html,/id="settingsUtilityContent" role="region" aria-label="Tools & utilities" hidden/);
 assert.doesNotMatch(html,/reminder-root|diag-root|port-root|class="settings-data-panel"/);
});
test("clicking same card again closes its content; switching cards closes previous content",()=>{
 const {view,render}=boot();
 const specs=[
  ["notifications","reminder-root","reminder-read-all"],
  ["diagnostics","diag-root","diagnostics-run"],
  ["portability","port-root","portability-export"],
  ["data","settings-data-panel","theme-select"]
 ];
 for(const [id,root,action] of specs){
  assert.equal(view.toggleSettingsUtility(id),true);
  let html=render();
  assert.match(html,new RegExp('data-settings-utility="'+id+'" aria-expanded="true"'));
  assert.match(html,new RegExp(root));
  assert.match(html,new RegExp('data-action="'+action+'"'));
  assert.equal((html.match(/aria-expanded="true"/g)||[]).length,1);
  for(const [otherId,otherRoot] of specs){
   if(otherId!==id)assert.doesNotMatch(html,new RegExp('class="'+otherRoot+'"'));
  }
  assert.equal(view.toggleSettingsUtility(id),false);
  html=render();
  assert.match(html,/id="settingsUtilityContent" role="region" aria-label="Tools & utilities" hidden/);
  assert.doesNotMatch(html,/class="reminder-root"|class="diag-root"|class="port-root"|class="panel settings-data-panel"/);
 }
 assert.equal(view.toggleSettingsUtility("notifications"),true);
 assert.equal(view.toggleSettingsUtility("portability"),true);
 assert.doesNotMatch(render(),/class="reminder-root"/);
 assert.match(render(),/class="port-root"/);
 assert.equal(view.toggleSettingsUtility("malicious"),false);
});
test("Personalization legacy toggle remains compatible and reminder settings stay in Reminders card",()=>{
 const {view,render}=boot();
 assert.equal(view.toggleDataNotifications(),true);
 const open=render();
 assert.match(open,/data-settings-utility="data" aria-expanded="true"/);
 assert.match(open,/id="settingsUtilityContent"/);
 assert.match(open,/theme-preview-halftone/);
 assert.doesNotMatch(open,/Reminder preferences and history/);
 assert.equal(view.toggleDataNotifications(),false);
 assert.equal(view.toggleSettingsUtility("notifications"),true);
 assert.match(render(),/Reminder preferences and history/);
});
test("click event uses local section replacement, not route hash changes or global render",()=>{
 const app=read("app.js"),css=read("settings-tools.css"),views=read("views.js");
 assert.match(app,/case"settings-utility-toggle":/);
 assert.match(app,/case"settings-data-toggle":/);
 assert.match(app,/V\.toggleSettingsUtility\(utility\)/);
 assert.match(app,/section\.outerHTML=V\.settingsTools\(\)/);
 assert.match(app,/focus\(\{preventScroll:true\}\)/);
 assert.match(app,/refreshSettingsTools\(utility\)/);
 assert.doesNotMatch(views,/data-nav="\'+item\.route/);
 assert.match(css,/settings-utility-content\[hidden\]/);
 assert.match(css,/\.settings-utility-content \.page-head/);
 assert.match(views,/window\.NOVA_REMINDERS\.page\(\)/);
 assert.match(views,/window\.NOVA_DIAGNOSTICS\.page\(\)/);
 assert.match(views,/window\.NOVA_PORTABILITY\.page\(\)/);
});
test("navigation, the 5 account-service cards and stored academic records are untouched",()=>{
 const html=read("index.html"),src=read("views.js");
 assert.match(html,/data-nav="settings"/);
 assert.match(html,/data-nav="subjects"/);
 assert.match(src,/data-account-service/);
 assert.match(src,/id="profileForm"/);
 assert.doesNotMatch(src,/localStorage\.clear\(|localStorage\.removeItem\(/);
});
