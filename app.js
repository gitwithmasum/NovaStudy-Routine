(function boot(){
"use strict";
const N=window.NOVA,V=window.NOVA_VIEWS,I=window.NOVA_I18N,S=N.get,$=N.$;
const confirm=message=>window.confirm(I.t(message));
let page=["dashboard","schedule","planner","tasks","challenge","learning","subjects","exams","focus","attendance","reports","notifications","settings"].includes(location.hash.slice(1))?location.hash.slice(1):"dashboard";
let day=new Date().getDay(),filter="all",query="",promptInstall=null,toastTimer=null,taskSearchTimer=null;
function toast(s){const e=$("toast");e.textContent=I.t(s);e.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("visible"),3300)}
function updateReminderBadge(){const count=Reminders.badge(),bell=$("reminderBadge");if(bell){bell.hidden=count===0;bell.textContent=count>99?"99+":I.number(count)}}
function render(){clearTimeout(taskSearchTimer);document.querySelectorAll("[data-nav]").forEach(x=>{const current=x.dataset.nav===page||(page==="challenge"&&x.dataset.nav==="learning");x.classList.toggle("active",current);x.setAttribute("aria-current",current?"page":"false")});$("pageLabel").textContent=I.language==="bn"?I.t({dashboard:"Dashboard",schedule:"Weekly routine",planner:"Smart study planner",tasks:"Tasks & goals",challenge:"CSE Learning Hub",learning:"CSE Learning Hub",subjects:"Subjects",exams:"Exams & revision",focus:"Focus timer",attendance:"Attendance & analytics",reports:"Academic reports",notifications:"Reminders & notifications",settings:"Settings"}[page]):page.toUpperCase();$("view").innerHTML=page==="notifications"?Reminders.page():page==="reports"?Reports.page():(page==="learning"||page==="challenge")?Hub.page():page==="planner"?Planner.page():page==="schedule"?V.schedule(day):page==="tasks"?V.tasks(filter,query):page==="exams"?X.page():page==="focus"?F.page():page==="attendance"?T.page():page==="challenge"?CSE.view():V[page]();updateThemeControls();updateLanguageControls();I.apply(document);updateReminderBadge()}
function showRecovery(message){
 const box=$("recoveryNotice"),detail=$("recoveryMessage");
 detail.textContent=I.t(message);box.hidden=false;
}
function changed(){
 const saved=N.save();
 if(!saved){
   showRecovery(N.getIssue()||"Save failed. Your last saved data is preserved.");
   if(N.getIssue().startsWith("Another tab")&&$("modal").open)Ed.close();
 }else {$("recoveryNotice").hidden=true;window.NOVA_SYNC?.markLocalChange?.();Auto.onLocalChange()}
 render();return saved;
}
function revealActiveNav(){const b=document.querySelector(".mobile-nav [data-nav].active");if(!b||!window.matchMedia?.("(max-width:660px)").matches)return;b.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:document.documentElement.dataset.uiReducedMotion==="on"?"auto":"smooth"})}
function nav(p){if(page===p&&location.hash==="#"+p){revealActiveNav();return}if(!["dashboard","schedule","planner","tasks","challenge","learning","subjects","exams","focus","attendance","reports","notifications","settings"].includes(p))return;page=p;if(p==="challenge")Hub.selectTab("challenge",true);else if(p==="learning")Hub.selectTab("overview",true);history.replaceState(null,"","#"+p);render();revealActiveNav();window.scrollTo({top:0,behavior:document.documentElement.dataset.uiReducedMotion==="on"?"auto":"smooth"})}
const A={toast,changed,day:()=>day,setDay:n=>day=n,installPrompt:()=>promptInstall,clearInstallPrompt:()=>promptInstall=null};
const Ed=window.NOVA_EDIT(A),X=window.NOVA_EXAMS,F=window.NOVA_FOCUS,T=window.NOVA_ATTENDANCE;
const CSE=window.NOVA_CHALLENGE,Auth=window.NOVA_AUTH,Cloud=window.NOVA_CLOUD,Sync=window.NOVA_SYNC,Auto=window.NOVA_AUTO,Planner=window.NOVA_SMART_PLANNER,Prep=window.NOVA_EXAM_PREP,Insights=window.NOVA_FOCUS_INSIGHTS,Hub=window.NOVA_LEARNING_HUB,Reports=window.NOVA_ACADEMIC_REPORTS,Reminders=window.NOVA_REMINDERS,UI=window.NOVA_UI;
CSE.init({changed,toast,refresh:render});
const THEME_KEY = "novastudy_theme_v1";
function themeName(){return document.documentElement.dataset.theme==="gold"?"gold":"cyber"}
function updateThemeControls(){
  const gold=themeName()==="gold";
  const top=$("themeToggle"),label=$("themeLabel");
  if(top){
    top.setAttribute("aria-pressed",String(gold));
    top.setAttribute("aria-label",gold?"Switch to Futuristic Cyber theme":"Switch to Black and Gold theme");
    top.title=gold?"Current: Black & Gold. Activate Cyber theme.":"Current: Cyber. Activate Black & Gold theme.";
  }
  if(label)label.textContent=gold?"Black Gold":"Cyber";
  document.querySelectorAll("[data-theme-value]").forEach(el=>{
    const active=el.dataset.themeValue===(gold?"gold":"cyber");
    el.classList.toggle("is-selected",active);
    el.setAttribute("aria-pressed",String(active));
  });
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content=gold?"#100c07":"#080e20";
}
function setTheme(next){
  if(next!=="cyber"&&next!=="gold")return;
  if(themeName()===next){updateThemeControls();return}
  document.documentElement.dataset.theme=next;
  try{localStorage.setItem(THEME_KEY,next)}catch{}
  render();
  toast(next==="gold"?"Black & Gold theme enabled.":"Futuristic Cyber theme enabled.");
}
function toggleTheme(){setTheme(themeName()==="gold"?"cyber":"gold")}
function updateLanguageControls(){
 const label=$("langLabel"),btn=$("langToggle");
 if(label)label.textContent=I.language==="bn"?"EN":"বাংলা";
 if(btn){btn.setAttribute("aria-label","Switch interface language");btn.title="Switch interface language"}
}
function switchLanguage(next){
 if(next===I.language)return;
 I.setLanguage(next);render();clock();X.refreshCountdowns();
 toast(next==="bn"?"ভাষা বাংলা করা হয়েছে।":"Interface language set to English.");
}

function exportBackup(){const file=new Blob([JSON.stringify({...S(),demo:false},null,2)],{type:"application/json"}),url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download="NovaStudy-Backup-"+N.date(new Date())+".json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);toast("Backup exported. Keep a copy.")}
async function importBackup(file){if(!file)return;if(file.size>1000000){toast("Backups must be under 1 MB.");return}try{const v=JSON.parse(await file.text());if(!N.valid(v))throw Error("Unsupported or invalid backup.");if(!confirm("Replace ALL current profile, subjects, routine, tasks, exams, attendance AND CSE 100 challenge progress?"))return;if(!N.setState(v)){showRecovery(N.getIssue());return}$("recoveryNotice").hidden=true;nav("dashboard");toast("Backup restored.")}catch(e){showRecovery("Backup was rejected; existing data is unchanged. "+(e.message||"Invalid file."));toast("Import failed: no data was replaced.")}}
function refreshChoices(){const cat=$("profileCategory")?.value;if(!N.C[cat])return;const lev=$("profileLevel"),track=$("profileTrack"),oldL=lev.value,oldT=track.value;lev.innerHTML=V.option(N.C[cat].levels,N.C[cat].levels.includes(oldL)?oldL:N.C[cat].levels[0]);track.innerHTML=V.option(Object.keys(N.C[cat].tracks),N.C[cat].tracks[oldT]?oldT:Object.keys(N.C[cat].tracks)[0])}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.nav){nav(b.dataset.nav);return}const {action,id,day:d,filter:f}=b.dataset;if(UI.handle(action,b)||Reminders.handle(action,b)||Reports.handle(action)||Hub.handle(action,b)||Insights.handle(action,b)||F.handle(action,b)||T.handle(action,b)||CSE.handle(action,b)||Auth.handle(action)||Cloud.handle(action)||Sync.handle(action)||Auto.handle(action)||Planner.handle(action)||Prep.handle(action,id))return;switch(action){
case"focus-content":$("view").focus();break;case"add-subject":Ed.subject();break;case"edit-subject":Ed.subject(id);break;
case"add-session":Ed.session();break;case"edit-session":Ed.session(id);break;
case"add-exam":Ed.exam();break;case"edit-exam":Ed.exam(id);break;
case"plan-revision":Ed.revision(id);break;
case"toggle-exam":{const exam=S().exams.find(x=>x.id===id);if(exam){exam.done=!exam.done;changed();}}break;
case"delete-exam":if(confirm("Delete exam? Its revision sessions and tasks will remain intact.")){
  S().exams=S().exams.filter(x=>x.id!==id);changed();}break;
case"add-task":Ed.task();break;case"edit-task":Ed.task(id);break;case"auto-plan":Ed.planner();break;case"go-planner":nav("planner");break;
case"delete-session":if(confirm("Delete session?")){S().sessions=S().sessions.filter(x=>x.id!==id);changed()}break;
case"delete-task":if(confirm("Delete task?")){S().tasks=S().tasks.filter(x=>x.id!==id);changed()}break;
case"suggestions":{const count=N.addSuggestions();if(changed())toast(count+" suggested subjects added.");break;}
case"day":day=Number(d);render();break;case"filter":filter=f;render();break;
case"go-challenge":nav("challenge");break;case"go-attendance":nav("attendance");break;case"go-focus":nav("focus");break;case"go-exams":nav("exams");break;case"go-schedule":nav("schedule");break;case"go-tasks":nav("tasks");break;
case"toggle-language":switchLanguage(I.language==="bn"?"en":"bn");break;case"language-select":switchLanguage(b.dataset.lang);break;
case"apply-update":applyUpdate();break;case"update-later":postponeUpdate();break;case"retry-update":retryUpdate();break;case"export-recovery":exportRawRecovery();break;case"dismiss-recovery":$("recoveryNotice").hidden=true;break;case"toggle-theme":toggleTheme();break;case"theme-select":setTheme(b.dataset.themeValue);break;case"install":Ed.install();break;case"export":exportBackup();break;case"close":Ed.close();break;
}});
document.addEventListener("submit",e=>{if(/^hub(?:Practice|Project|Milestone|Resource)Form$/.test(e.target.id)){e.preventDefault();Hub.submit(e.target)}else if(e.target.id==="insightsDistractionForm"){e.preventDefault();Insights.addDistraction(e.target)}else if(e.target.id==="examPrepTopicForm"){e.preventDefault();Prep.addTopic(e.target)}else if(e.target.id==="examPrepMockForm"){e.preventDefault();Prep.addMock(e.target)}else if(e.target.id==="smartPlannerForm"){e.preventDefault();Planner.review(e.target)}else if(e.target.id==="editorForm"){e.preventDefault();Ed.save(e.target)}else if(e.target.id==="profileForm"){e.preventDefault();const form=new FormData(e.target),cat=String(form.get("category")),level=String(form.get("level")),track=String(form.get("track"));if(!N.C[cat]||!N.C[cat].levels.includes(level)||!N.C[cat].tracks[track])return toast("Invalid class/department.");S().profile={...S().profile,name:String(form.get("name")||"Student").trim().slice(0,80)||"Student",institution:String(form.get("institution")||"").trim().slice(0,100),category:cat,level,track,weekStart:Number(form.get("weekStart")||0)};if(changed())toast("Profile saved. Existing routine preserved.")}});
document.addEventListener("change",e=>{if(UI.handleChange(e.target))return;if(Reminders.handleChange(e.target))return;if(Reports.handleChange(e.target))return;if(e.target.id==="hubImportFile"){Hub.importData(e.target.files?.[0]);return}if(Hub.handleChange(e.target))return;if(Insights.handleChange(e.target))return;if(Prep.handleChange(e.target))return;if(Planner.changed(e.target))return;if(CSE.handleChange(e.target))return;if(e.target.id==="attendanceDate"){T.dateChanged(e.target.value);return}if(e.target.id==="focusMinutes"){F.handleMinutes(e.target.value);return}if(e.target.id==="profileCategory")refreshChoices();if(e.target.id==="importFile")importBackup(e.target.files?.[0]);if(e.target.dataset.taskCheck){const t=S().tasks.find(x=>x.id===e.target.dataset.taskCheck);if(t){t.done=e.target.checked;changed()}}});
document.addEventListener("input",e=>{if(CSE.handleInput(e.target))return;if(e.target.id==="taskSearch"){query=e.target.value;const input=e.target;clearTimeout(taskSearchTimer);taskSearchTimer=setTimeout(()=>{const results=$("taskResults");if(page!=="tasks"||$("taskSearch")!==input||!results)return;results.innerHTML=V.taskResults(filter,query)},120)}});
$("installBtn").addEventListener("click",()=>Ed.install());
document.addEventListener("keydown",e=>{if(!["ArrowRight","ArrowLeft"].includes(e.key))return;const target=e.target.closest?.(".mobile-nav button[data-nav]");if(!target)return;const buttons=Array.from(document.querySelectorAll(".mobile-nav button[data-nav]"));const i=buttons.indexOf(target),direction=e.key==="ArrowRight"?1:-1;const next=buttons[i+direction];if(!next)return;e.preventDefault();next.focus();nav(next.dataset.nav)});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();promptInstall=e});window.addEventListener("appinstalled",()=>{promptInstall=null;toast("NovaStudy installed!")});
window.addEventListener("storage",e=>{
  if(e.key===UI.KEY){if(!UI.adopt(e.newValue))toast("UI preference change could not be validated.");return}
  if(e.key===Reminders.KEY){if(!Reminders.adopt(e.newValue))toast("Reminder state changed but could not be verified.");return}
  if(e.key===Hub.KEY){if(!Hub.adopt(e.newValue))toast("Learning Hub data changed but could not be verified.");if(page==="learning"||page==="challenge")render();return}
  if(e.key===Insights.KEY){if(!Insights.adopt(e.newValue)){toast("Focus Insights changed but could not be verified.")}if(page==="focus")render();return}
  if(e.key===F.KEY){if(!F.adopt(e.newValue)){toast("Unable to synchronize the focus timer from another tab.")}if(page==="focus")render();return}
  if(e.key===I.KEY){I.useExternal(e.newValue);render();clock();X.refreshCountdowns();return}
  if(e.key===N.KEY){
    if(!N.acceptExternal(e.newValue)){
      showRecovery("Storage changed in another tab, but the incoming data could not be verified. No changes were loaded.");
      return;
    }
    if($("modal").open){Ed.close();toast("Updated in another tab. Editor closed to prevent overwriting newer data.")}
    $("recoveryNotice").hidden=true;render();toast("Routine updated from another tab.");
    return;
  }
  if(e.key!==THEME_KEY)return;
  const next=e.newValue==="gold"?"gold":"cyber";
  if(next!==themeName()){
    document.documentElement.dataset.theme=next;
    render();
  }
});
window.addEventListener("hashchange",()=>{const p=location.hash.slice(1);if(["dashboard","schedule","planner","tasks","challenge","learning","subjects","exams","focus","attendance","reports","notifications","settings"].includes(p)){page=p;if(p==="challenge")Hub.selectTab("challenge",true);else if(p==="learning")Hub.selectTab("overview",true);render();revealActiveNav()}});
let updateRegistration=null,updateAccepted=false,updateReloaded=false,updatePostponed=false,updateAttemptTimer=null;
function updateMessage(message,retry=false){
 const text=$("updateNoticeText"),button=$("updateRetry");
 if(text)text.textContent=message;
 if(button)button.hidden=!retry;
 $("updateNotice").hidden=false;
}
function offerUpdate(reg){
 if(reg.waiting&&navigator.serviceWorker.controller){
  updateRegistration=reg;
  if(updatePostponed||updateAccepted)return;
  updateMessage("A newer NovaStudy version is ready. Save open edits before updating.");
 }
}
function postponeUpdate(){
 updatePostponed=true;updateAccepted=false;
 clearTimeout(updateAttemptTimer);
 $("updateNotice").hidden=true;
 toast("Update postponed. It will be offered again on a future visit.");
}
function applyUpdate(){
 const worker=updateRegistration?.waiting;
 if(!worker){updateMessage("The downloaded update is no longer waiting. Try checking again.",true);return false}
 if($("modal").open){
  if(!confirm("An editor is open. Close it without saving unfinished edits and update now?"))return false;
  Ed.close();
 }else if(!confirm("Reload to install the new app version? Saved routines stay on this device."))return false;
 updateAccepted=true;updatePostponed=false;
 updateMessage("Installing update… keep NovaStudy open until it reloads.");
 try{worker.postMessage({type:"SKIP_WAITING"})}
 catch{updateAccepted=false;updateMessage("Update could not be started. Retry when online.",true);return false}
 clearTimeout(updateAttemptTimer);
 updateAttemptTimer=setTimeout(()=>{
  if(updateAccepted&&!updateReloaded){
   updateAccepted=false;
   updateMessage("Update is taking longer than expected. Your current version and saved data remain available. Retry when ready.",true);
  }
 },12000);
 return true;
}
function retryUpdate(){
 updatePostponed=false;updateAccepted=false;
 if(updateRegistration?.waiting){applyUpdate();return}
 if(updateRegistration){
  updateMessage("Checking for an updated version…");
  updateRegistration.update().then(reg=>offerUpdate(reg)).catch(()=>updateMessage("Cannot check for updates right now. Check your connection and retry.",true));
 }else updateMessage("Service worker has not registered. Reload the app online and try again.",true);
}
if("serviceWorker" in navigator&&location.protocol!=="file:"){
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
  if(updateAccepted&&!updateReloaded){updateReloaded=true;clearTimeout(updateAttemptTimer);location.reload()}
 });
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").then(reg=>{
  updateRegistration=reg;offerUpdate(reg);
  reg.addEventListener("updatefound",()=>{
   const worker=reg.installing;
   if(worker)worker.addEventListener("statechange",()=>{if(worker.state==="installed")offerUpdate(reg)});
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update().then(()=>offerUpdate(reg)).catch(()=>{})});
  setInterval(()=>reg.update().then(()=>offerUpdate(reg)).catch(()=>{}),60*60*1000);
 }).catch(()=>toast("Offline caching unavailable. Reopen online to retry.")));
}
function exportRawRecovery(){
 const raw=N.rawRecovery();
 if(raw===null){toast("No damaged data snapshot is available.");return}
 const blob=new Blob([raw],{type:"text/plain"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="NovaStudy-recovery-raw-"+N.date(new Date())+".txt";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);toast("Original data snapshot downloaded. Do not import it directly.");
}
function clock(){const d=new Date();$("liveClock").textContent=I.clock(d)}
Insights.init({toast,refresh:()=>{if(page==="focus")render()}});
F.init({toast,refresh:()=>{if(page==="focus")render()},onComplete:mode=>{if(page==="focus")render();toast(mode==="focus"?"Focus session completed!":"Break completed!")}});
T.init({changed,toast,refresh:()=>{if(page==="attendance")render()}});
Auth.init({toast,refresh:()=>{if(page==="settings")render();Auto.onAuthChange()}});
Cloud.init({toast,refresh:()=>{if(page==="settings")render()}});
Sync.init({toast,refresh:()=>{if(page==="settings")render()}});
Auto.init({toast,refresh:()=>{if(page==="settings")render()}});
Planner.init({toast,refresh:()=>{if(page==="planner")render()}});
Prep.init({changed,toast,refresh:()=>{if(page==="exams")render()}});
Hub.init({toast,refresh:()=>{if(page==="learning"||page==="challenge")render()}});
Reports.init({toast,refresh:()=>{if(page==="reports")render()}});
UI.init({toast,refresh:render});
Reminders.init({toast,refresh:()=>{if(page==="notifications")render();else updateReminderBadge()}});
if(page==="challenge")Hub.selectTab("challenge",true);
if(N.getIssue())showRecovery(N.getIssue());render();revealActiveNav();clock();setInterval(clock,15000);setInterval(()=>X.refreshCountdowns(),15000)
})();