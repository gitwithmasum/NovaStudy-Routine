/* NovaStudy x Masum-Chronos v2.5 — opt-in, least-privilege integration. */
(function(){
 "use strict";
 const $=id=>document.getElementById(id);
 let mounted=false,widgets=[],scriptPromise=null;
 function loadLoader(){
  if(window.ChronosWidgets)return Promise.resolve(window.ChronosWidgets);
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise((resolve,reject)=>{
   const s=document.createElement("script");
   s.src="https://gitwithmasum.github.io/Masum-Chronos/web/widgets/chronos-widgets.js";
   s.async=true;
   s.onload=()=>window.ChronosWidgets?resolve(window.ChronosWidgets):reject(Error("Chronos widget loader unavailable"));
   s.onerror=()=>reject(Error("Could not load Chronos widget loader. Check your connection."));
   document.head.appendChild(s);
  });
  return scriptPromise;
 }
 function summary(){
  // Explicitly selected fields only. Never send IDs, account/session tokens, notes, or course documents.
  const state=window.NOVA?.get?.();
  if(!state)return {tasks:[],stats:{sessions:0,focusSeconds:0}};
  const tasks=(Array.isArray(state.tasks)?state.tasks:[]).slice(0,60).map((t,i)=>({
   id:"study-"+(i+1),
   text:String(t.title||"Study task").slice(0,100),
   done:Boolean(t.done)
  }));
  const sessions=Array.isArray(state.sessions)?state.sessions:[];
  const done=tasks.filter(t=>t.done).length;
  return {tasks,stats:{sessions:Math.min(sessions.length,10000),focusSeconds:0,completedTasks:done,totalTasks:tasks.length}};
 }
 function showStatus(message,isError=false){
  const el=$("chronosWidgetStatus");if(!el)return;
  el.textContent=message;el.dataset.state=isError?"error":"ok";
 }
 async function openPanel(){
  const panel=$("chronosWidgetPanel"),button=$("chronosWidgetToggle");
  if(!panel||!button)return;
  const opening=panel.hidden;panel.hidden=!opening;
  button.setAttribute("aria-expanded",String(opening));
  button.textContent=opening?"Hide Chronos Widgets":"Open Chronos Widgets";
  if(!opening||mounted)return;
  try{
   const api=await loadLoader();
   const focus=api.mount($("chronosFocusWidget"),{type:"focus",theme:"cyber",size:"regular",minutes:25});
   widgets.push(focus);
   mounted=true;
   $("chronosShareToggle")?.addEventListener("change",event=>{
    const target=$("chronosStudyStats");if(!target)return;
    if(event.currentTarget.checked){
     if(!widgets.some(w=>w._kind==="stats")){
      const stats=api.mount(target,{type:"stats",theme:"cyber",size:"regular",source:"host",data:summary()});
      // Mark this instance for deterministic cleanup.
      try{Object.defineProperty(stats,"_kind",{value:"stats"});}catch{}
      widgets.push(stats);
     }else widgets.find(w=>w._kind==="stats")?.update(summary());
     target.hidden=false;
     showStatus("Read-only study summary shared with the Chronos widget. No credentials or notes were sent.");
    }else{
     const index=widgets.findIndex(w=>w._kind==="stats");
     if(index>=0){widgets[index].destroy();widgets.splice(index,1);}
     target.hidden=true;
     showStatus("Study summary sharing stopped.");
    }
   },{once:false});
   showStatus("Focus Timer ready. Study data sharing is off by default.");
  }catch(error){showStatus(error?.message||"Chronos widget could not load.",true);}
 }
 function refreshSharedStats(){
  if(!$("chronosShareToggle")?.checked)return;
  const widget=widgets.find(w=>w._kind==="stats");
  if(widget)widget.update(summary());
 }
 document.addEventListener("click",event=>{
  if(event.target.closest("#chronosWidgetToggle"))openPanel();
  if(event.target.closest("#chronosShareRefresh"))refreshSharedStats();
 });
 window.addEventListener("beforeunload",()=>widgets.forEach(w=>w.destroy()));
})();