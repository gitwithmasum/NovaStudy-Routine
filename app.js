(function boot(){
"use strict";
const N=window.NOVA,V=window.NOVA_VIEWS,I=window.NOVA_I18N,S=N.get,$=N.$;
const confirm=message=>window.confirm(I.t(message));
let page=["dashboard","schedule","tasks","subjects","exams","settings"].includes(location.hash.slice(1))?location.hash.slice(1):"dashboard";
let day=new Date().getDay(),filter="all",query="",promptInstall=null,toastTimer=null;
function toast(s){const e=$("toast");e.textContent=I.t(s);e.classList.add("visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("visible"),3300)}
function render(){document.querySelectorAll("[data-nav]").forEach(x=>x.classList.toggle("active",x.dataset.nav===page));$("pageLabel").textContent=I.language==="bn"?I.t({dashboard:"Dashboard",schedule:"Weekly routine",tasks:"Tasks & goals",subjects:"Subjects",exams:"Exams & revision",settings:"Settings"}[page]):page.toUpperCase();$("view").innerHTML=page==="schedule"?V.schedule(day):page==="tasks"?V.tasks(filter,query):page==="exams"?X.page():V[page]();updateThemeControls();updateLanguageControls();I.apply(document)}
function showRecovery(message){
 const box=$("recoveryNotice"),detail=$("recoveryMessage");
 detail.textContent=I.t(message);box.hidden=false;
}
function changed(){
 const saved=N.save();
 if(!saved){
   showRecovery(N.getIssue()||"Save failed. Your last saved data is preserved.");
   if(N.getIssue().startsWith("Another tab")&&$("modal").open)Ed.close();
 }else $("recoveryNotice").hidden=true;
 render();return saved;
}
function nav(p){if(!["dashboard","schedule","tasks","subjects","exams","settings"].includes(p))return;page=p;history.replaceState(null,"","#"+p);render();window.scrollTo({top:0,behavior:"smooth"})}
const A={toast,changed,day:()=>day,setDay:n=>day=n,installPrompt:()=>promptInstall,clearInstallPrompt:()=>promptInstall=null};
const Ed=window.NOVA_EDIT(A),X=window.NOVA_EXAMS;
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
async function importBackup(file){if(!file)return;if(file.size>1000000){toast("Backups must be under 1 MB.");return}try{const v=JSON.parse(await file.text());if(!N.valid(v))throw Error("Unsupported or invalid backup.");if(!confirm("Replace all current profile, subjects, routine, tasks and exams?"))return;if(!N.setState(v)){showRecovery(N.getIssue());return}$("recoveryNotice").hidden=true;nav("dashboard");toast("Backup restored.")}catch(e){showRecovery("Backup was rejected; existing data is unchanged. "+(e.message||"Invalid file."));toast("Import failed: no data was replaced.")}}
function refreshChoices(){const cat=$("profileCategory")?.value;if(!N.C[cat])return;const lev=$("profileLevel"),track=$("profileTrack"),oldL=lev.value,oldT=track.value;lev.innerHTML=V.option(N.C[cat].levels,N.C[cat].levels.includes(oldL)?oldL:N.C[cat].levels[0]);track.innerHTML=V.option(Object.keys(N.C[cat].tracks),N.C[cat].tracks[oldT]?oldT:Object.keys(N.C[cat].tracks)[0])}
document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.nav){nav(b.dataset.nav);return}const {action,id,day:d,filter:f}=b.dataset;switch(action){
case"add-subject":Ed.subject();break;case"edit-subject":Ed.subject(id);break;
case"add-session":Ed.session();break;case"edit-session":Ed.session(id);break;
case"add-exam":Ed.exam();break;case"edit-exam":Ed.exam(id);break;
case"plan-revision":Ed.revision(id);break;
case"toggle-exam":{const exam=S().exams.find(x=>x.id===id);if(exam){exam.done=!exam.done;changed();}}break;
case"delete-exam":if(confirm("Delete exam? Its revision sessions and tasks will remain intact.")){
  S().exams=S().exams.filter(x=>x.id!==id);changed();}break;
case"add-task":Ed.task();break;case"edit-task":Ed.task(id);break;case"auto-plan":Ed.planner();break;
case"delete-session":if(confirm("Delete session?")){S().sessions=S().sessions.filter(x=>x.id!==id);changed()}break;
case"delete-task":if(confirm("Delete task?")){S().tasks=S().tasks.filter(x=>x.id!==id);changed()}break;
case"suggestions":{const count=N.addSuggestions();if(changed())toast(count+" suggested subjects added.");break;}
case"day":day=Number(d);render();break;case"filter":filter=f;render();break;
case"go-exams":nav("exams");break;case"go-schedule":nav("schedule");break;case"go-tasks":nav("tasks");break;
case"toggle-language":switchLanguage(I.language==="bn"?"en":"bn");break;case"language-select":switchLanguage(b.dataset.lang);break;
case"apply-update":{if(updateRegistration?.waiting&&confirm("Install the new version? Any open editor will be closed; saved data will be preserved.")){updateAccepted=true;updateRegistration.waiting.postMessage({type:"SKIP_WAITING"});}break;}case"export-recovery":exportRawRecovery();break;case"dismiss-recovery":$("recoveryNotice").hidden=true;break;case"toggle-theme":toggleTheme();break;case"theme-select":setTheme(b.dataset.themeValue);break;case"install":Ed.install();break;case"export":exportBackup();break;case"close":Ed.close();break;
}});
document.addEventListener("submit",e=>{if(e.target.id==="editorForm"){e.preventDefault();Ed.save(e.target)}else if(e.target.id==="profileForm"){e.preventDefault();const form=new FormData(e.target),cat=String(form.get("category")),level=String(form.get("level")),track=String(form.get("track"));if(!N.C[cat]||!N.C[cat].levels.includes(level)||!N.C[cat].tracks[track])return toast("Invalid class/department.");S().profile={...S().profile,name:String(form.get("name")||"Student").trim().slice(0,80)||"Student",institution:String(form.get("institution")||"").trim().slice(0,100),category:cat,level,track,weekStart:Number(form.get("weekStart")||0)};if(changed())toast("Profile saved. Existing routine preserved.")}});
document.addEventListener("change",e=>{if(e.target.id==="profileCategory")refreshChoices();if(e.target.id==="importFile")importBackup(e.target.files?.[0]);if(e.target.dataset.taskCheck){const t=S().tasks.find(x=>x.id===e.target.dataset.taskCheck);if(t){t.done=e.target.checked;changed()}}if(e.target.id==="remindersSwitch"){if(!e.target.checked){S().profile.reminders=false;changed();return}if(!("Notification" in window)||!window.isSecureContext){e.target.checked=false;toast("Requires HTTPS and notification support.");return}Notification.requestPermission().then(p=>{S().profile.reminders=p==="granted";changed();toast(p==="granted"?"Foreground reminders enabled.":"Permission not granted.")})}});
document.addEventListener("input",e=>{if(e.target.id==="taskSearch"){query=e.target.value;const i=e.target.selectionStart;render();$("taskSearch").focus();$("taskSearch").setSelectionRange(i,i)}});
$("installBtn").addEventListener("click",()=>Ed.install());
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();promptInstall=e});window.addEventListener("appinstalled",()=>{promptInstall=null;toast("NovaStudy installed!")});
window.addEventListener("storage",e=>{
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
window.addEventListener("hashchange",()=>{const p=location.hash.slice(1);if(["dashboard","schedule","tasks","subjects","exams","settings"].includes(p)){page=p;render()}});
let updateRegistration=null,updateAccepted=false,updateReloaded=false;
function offerUpdate(reg){
 if(reg.waiting&&navigator.serviceWorker.controller){updateRegistration=reg;$("updateNotice").hidden=false}
}
if("serviceWorker" in navigator&&location.protocol!=="file:"){
 navigator.serviceWorker.addEventListener("controllerchange",()=>{
   if(updateAccepted&&!updateReloaded){updateReloaded=true;location.reload()}
 });
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").then(reg=>{
   updateRegistration=reg;offerUpdate(reg);
   reg.addEventListener("updatefound",()=>{
     const worker=reg.installing;
     if(worker)worker.addEventListener("statechange",()=>{if(worker.state==="installed")offerUpdate(reg)});
   });
   document.addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update().catch(()=>{})});
   setInterval(()=>reg.update().catch(()=>{}),60*60*1000);
 }).catch(()=>toast("Offline caching unavailable on this browser.")));
}
function exportRawRecovery(){
 const raw=N.rawRecovery();
 if(raw===null){toast("No damaged data snapshot is available.");return}
 const blob=new Blob([raw],{type:"text/plain"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="NovaStudy-recovery-raw-"+N.date(new Date())+".txt";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);toast("Original data snapshot downloaded. Do not import it directly.");
}
function clock(){const d=new Date();$("liveClock").textContent=I.clock(d)}
const seen=new Set();function remind(){if(!S().profile.reminders||!("Notification" in window)||Notification.permission!=="granted"||document.hidden)return;const d=new Date(),hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");for(const s of S().sessions){const key=N.date(d)+s.id;if(N.occursOn(s,d)&&s.start===hm&&!seen.has(key)){seen.add(key);try{new Notification(I.t("NovaStudy · Session starting"),{body:(s.title||N.name(s.subjectId))+" · "+I.time(s.start),icon:"./assets/icon-192.png"})}catch{}}}if(seen.size>200)seen.clear()}
if(N.getIssue())showRecovery(N.getIssue());render();clock();setInterval(clock,15000);setInterval(()=>X.refreshCountdowns(),15000);setInterval(remind,25000)
})();