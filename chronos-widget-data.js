/* NovaStudy × Masum-Chronos v2.5 — explicit, minimal data projection. */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.NOVA_CHRONOS_DATA=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 function snapshot(state,focusState){
  const raw=state&&typeof state==="object"?state:{};
  const source=Array.isArray(raw.tasks)?raw.tasks:[];
  const tasks=source.slice(0,60).map((item,index)=>{
   if(!item||typeof item!=="object")return null;
   const title=typeof item.title==="string"?item.title.trim().slice(0,100):"";
   if(!title)return null;
   return {id:"study-"+(index+1),text:title,done:Boolean(item.done)};
  }).filter(Boolean);
  // NovaStudy routine sessions are scheduled classes/blocks, not completed focus sessions.
  const completed=Number.isInteger(focusState?.completed)?Math.max(0,Math.min(1000000,focusState.completed)):0;
  const minutes=Number.isInteger(focusState?.totalMinutes)?Math.max(0,Math.min(20000000,focusState.totalMinutes)):0;
  return {tasks,stats:{sessions:completed,focusSeconds:Math.min(100000000,minutes*60)}};
 }
 return Object.freeze({snapshot});
});
