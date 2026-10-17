"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function settingsMarkup(lang="en"){
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
 return win.NOVA_VIEWS.settings();
}
test("four existing independent account/cloud/sync modules are grouped under one settings panel",()=>{
 const html=settingsMarkup();
 assert.equal((html.match(/class="panel settings-account-suite"/g)||[]).length,1);
 assert.match(html,/<section class="panel settings-account-suite" aria-labelledby="settingsAccountTitle">/);
 assert.match(html,/id="settingsAccountTitle" class="panel-title">Account & Cloud Services/);
 assert.match(html,/<div class="settings-account-modules">/);
 const tags=["google-auth-panel",'aria-label="Cloud Backup"','aria-label="Smart Sync"','aria-label="Automatic Sync"'];
 const positions=tags.map(x=>html.indexOf(x));
 assert.ok(positions.every(x=>x>=0));
 assert.ok(positions.every((x,i)=>i===0||x>positions[i-1]),"Four modules should appear in existing order");
 assert.ok(html.indexOf("settings-account-modules")<positions[0]);
 assert.ok(positions[3]<html.indexOf("Academic profile"));
 assert.equal((html.match(/class="settings-account-modules"/g)||[]).length,1);
});
test("all existing action IDs stay wired and are not copied into new actions",()=>{
 const html=settingsMarkup();
 for(const action of ["google-signin","cloud-refresh","sync-review","auto-toggle"])
  assert.equal((html.match(new RegExp('data-action="'+action+'"','g'))||[]).length,1);
 for(const panel of ["NOVA_AUTH","NOVA_CLOUD","NOVA_SYNC","NOVA_AUTO"])
  assert.match(read("views.js"),new RegExp('window\\.'+panel+'\\.panel\\(\\)'));
 assert.match(html,/Reminder preferences preserved/);
 assert.match(html,/Appearance preferences preserved/);
});
test("consolidated panel styling removes internal card boundaries but retains section separators and mobile layout",()=>{
 const css=read("settings-tools.css"),html=read("index.html");
 assert.match(css,/settings-account-modules>\.panel\+\.panel/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/border-top:1px solid/);
 assert.match(css,/@media\(max-width:660px\)/);
 assert.match(html,/href="\.\/settings-tools\.css"/);
});
test("combined account panel has Bangla title and changes no app storage keys",()=>{
 assert.match(settingsMarkup("bn"),/অ্যাকাউন্ট ও ক্লাউড সার্ভিসেস/);
 assert.match(read("i18n.js"),/"Account & Cloud Services":"অ্যাকাউন্ট ও ক্লাউড সার্ভিসেস"/);
 assert.doesNotMatch(read("views.js"),/localStorage\.setItem|sessionStorage\.setItem/);
});
