/* NovaStudy v3.4 — local-only portable backup with validated selective restore.
 * Never reads auth, cloud, sync, tokens, or browser permissions. */
(function(){
"use strict";
const N=window.NOVA,H=window.NOVA_LEARNING_HUB,F=window.NOVA_FOCUS_INSIGHTS,
 R=window.NOVA_REMINDERS,U=window.NOVA_UI,I=window.NOVA_I18N,E=N.escape;
const FORMAT="novastudy-portability",VERSION=1,LIMIT=3500000;
const K={study:N.KEY,learning:H.KEY,focus:F.KEY,reminders:R.KEY,ui:U.KEY,theme:"novastudy_theme_v1",language:I.KEY};
const ORDER=["study","learning","focus","reminders","ui","theme","language"];
const NAMES={study:["Routine, Tasks, Exams & CSE 100","রুটিন, Task, পরীক্ষা ও CSE ১০০"],
 learning:["CSE Learning Hub records","CSE Learning Hub রেকর্ড"],focus:["Focus Insights & Distractions","Focus History ও Distraction"],
 reminders:["Reminders & preferences","Reminder ও Preferences"],ui:["Dashboard widget preferences","Dashboard Widget Preferences"],
 theme:["Theme","থিম"],language:["Language","ভাষা"]};
const tr=(a,b)=>I.language==="bn"?b:a,copy=x=>JSON.parse(JSON.stringify(x));
let pending=null,selected=new Set(),error="",note="",busy=false,refresh=()=>{};
function valueOk(k,x){
 if(k==="study")return N.valid(x);
 if(k==="learning")return H.valid(x);
 if(k==="focus")return F.valid(x);
 if(k==="reminders")return R.valid(x);
 if(k==="ui")return U.valid(x);
 if(k==="theme")return x==="gold"||x==="cyber";
 if(k==="language")return x==="bn"||x==="en";
 return false;
}
function readCurrent(){
 const modules={};
 for(const name of ORDER){
  let raw=localStorage.getItem(K[name]);
  if(raw===null){modules[name]=null;continue}
  try{
   const v=name==="theme"||name==="language"?raw:JSON.parse(raw);
   if(!valueOk(name,v))throw Error("invalid");
   modules[name]=v;
  }catch{throw Error("Cannot export: existing "+name+" storage is invalid. Original bytes were left unchanged; recover that module before exporting.")}
 }
 if(modules.study===null){
  const state=copy(N.get());
  if(!valueOk("study",state))throw Error("Current routine is invalid. Nothing exported.");
  modules.study=state;
 }
 return modules;
}
function makeBackup(now=new Date()){
 return {format:FORMAT,version:VERSION,createdAt:now.toISOString(),modules:readCurrent()};
}
function validateBundle(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload)||payload.format!==FORMAT||
 payload.version!==1||!payload.modules||typeof payload.modules!=="object"||
 Array.isArray(payload.modules)||typeof payload.createdAt!=="string"||
 payload.createdAt.length>40||!Number.isFinite(Date.parse(payload.createdAt)))return false;
 if(Object.keys(payload.modules).sort().join("|")!==ORDER.slice().sort().join("|"))return false;
 if(payload.modules.study===null)return false;
 return ORDER.every(key=>payload.modules[key]===null||valueOk(key,payload.modules[key]));
}
function sizeText(x){return (JSON.stringify(x).length/1024).toFixed(1)+" KB"}
function download(){
 if(busy)return false;
 try{
  const data=makeBackup(),payload=JSON.stringify(data,null,2);
  if(payload.length>LIMIT)throw Error("Backup exceeds 3.5 MB browser export limit.");
  const blob=new Blob([payload],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="NovaStudy-Complete-Backup-"+N.date(new Date())+".json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
  note=tr("Combined backup downloaded. Store it privately; it includes your study records.","সব Module-এর Backup ডাউনলোড হয়েছে। এতে তোমার Study Data আছে; নিরাপদে রাখো।");
  error="";refresh();return true;
 }catch(ex){error=String(ex.message||ex);refresh();return false}
}
async function prepare(file){
 if(busy)return false;busy=true;pending=null;selected=new Set();error="";note="";refresh();
 try{
  if(!file||!Number.isFinite(file.size)||file.size>LIMIT||file.size<5||typeof file.text!=="function")throw Error("Choose a valid combined JSON backup under 3.5 MB.");
  const raw=await file.text();
  if(raw.length>LIMIT)throw Error("Backup is too large.");
  const parsed=JSON.parse(raw);
  if(!validateBundle(parsed))throw Error("Backup rejected: unsupported format or invalid module records. No data was replaced.");
  pending=copy(parsed);
  selected=new Set(ORDER.filter(k=>parsed.modules[k]!==null));
  note=tr("Backup validated. Review the modules below before restoring.","Backup পরীক্ষা সফল। Restore-এর আগে Module Selection দেখো।");
  return true;
 }catch(ex){error=String(ex.message||ex);return false}
 finally{busy=false;refresh()}
}
function select(name,checked){
 if(!pending||!ORDER.includes(name)||pending.modules[name]===null)return false;
 if(checked)selected.add(name);else selected.delete(name);
 refresh();return true;
}
function preview(){
 if(!pending)return null;
 return {createdAt:pending.createdAt,modules:ORDER.filter(k=>pending.modules[k]!==null),
  selected:ORDER.filter(k=>selected.has(k)),size:sizeText(pending)};
}
function replaceSelection(){
 if(!pending||busy||!validateBundle(pending))return false;
 const chosen=ORDER.filter(x=>selected.has(x)&&pending.modules[x]!==null);
 if(!chosen.length){error=tr("Select at least one module to restore.","Restore-এর জন্য অন্তত একটি Module নির্বাচন করো।");refresh();return false}
 if(document.getElementById("modal")?.open){
  error=tr("Close the open editor before restoring to avoid losing unsaved changes.","অসম্পূর্ণ পরিবর্তন হারানো এড়াতে Restore-এর আগে Editor বন্ধ করো।");refresh();return false;
 }
 if(!window.confirm(tr("Replace SELECTED local modules? This overwrites their current data. Save your current combined backup first. The app will reload after success.","নির্বাচিত Module-এর বর্তমান Data Replace হবে। আগে বর্তমান Combined Backup রাখো। সফল হলে App Reload হবে।")))return false;
 let before=new Map(),written=[];
 busy=true;error="";refresh();
 try{
  // A second validation prevents restoring a mutated preview object.
  if(!validateBundle(pending))throw Error("Backup changed since preview; not restored.");
  const serialized=new Map(chosen.map(k=>[k,k==="theme"||k==="language"?pending.modules[k]:JSON.stringify(pending.modules[k])]));
  for(const k of chosen)before.set(k,localStorage.getItem(K[k]));
  for(const k of chosen){
   if(localStorage.getItem(K[k])!==before.get(k))throw Error("Another tab changed storage; no restore attempted.");
  }
  for(const k of chosen){localStorage.setItem(K[k],serialized.get(k));written.push(k)}
  pending=null;selected=new Set();
  note=tr("Restore saved. Reloading to apply restored records.","Restore সংরক্ষিত। নতুন Data লোড হচ্ছে।");
  busy=false;refresh();
  window.location.reload();return true;
 }catch(ex){
  let rollbackOk=true;
  for(const key of written.reverse()){
   try{const value=before.get(key);if(value===null)localStorage.removeItem(K[key]);else localStorage.setItem(K[key],value)}
   catch{rollbackOk=false}
  }
  error=rollbackOk?String(ex.message||ex)+tr(" Original values were restored where writes occurred."," পূর্বের Data ফিরিয়ে দেওয়া হয়েছে।"):
   tr("Restore was interrupted and rollback was incomplete. Do not edit; export raw data before recovery.","Restore ব্যর্থ হয়েছে এবং সব Data ফিরিয়ে দেওয়া যায়নি। আগে Raw Backup নিয়ে Recovery করো।");
  busy=false;refresh();return false;
 }
}
function cancel(){if(busy)return false;pending=null;selected=new Set();error="";note="";refresh();return true}
function action(a){
 if(a==="portability-export"){download();return true}
 if(a==="portability-restore"){replaceSelection();return true}
 if(a==="portability-cancel"){cancel();return true}
 return false;
}
function change(el){
 if(el?.id==="portabilityFile"){void prepare(el.files?.[0]);return true}
 if(el?.dataset?.portabilityModule){select(el.dataset.portabilityModule,Boolean(el.checked));return true}
 return false;
}
function currentStatus(){
 return ORDER.map(k=>{
  try{const value=localStorage.getItem(K[k]);return {name:k,status:value===null?"not-saved":valueOk(k,k==="theme"||k==="language"?value:JSON.parse(value))?"stored":"invalid"}}
  catch{return {name:k,status:"unreadable"}}
 });
}
function page(){
 const statuses=currentStatus();
 let html='<div class="port-root"><div class="page-head"><div><span class="eyebrow">'+tr("DATA PORTABILITY / 3.4","ডেটা পোর্টেবিলিটি / ৩.৪")+
 '</span><h1 class="view-title">'+tr("Backup & Data Portability","ব্যাকআপ ও ডেটা পোর্টেবিলিটি")+'</h1><p class="subheading">'+
 tr("One downloadable backup for your local NovaStudy records. No sync, login or cloud credentials are included.","NovaStudy-এর Local Data একই Backup File-এ। Login বা Cloud Credentials থাকবে না।")+
 '</p></div></div><section class="panel"><b class="panel-title">'+tr("Combined local backup","সম্পূর্ণ Local Backup")+'</b>'+
 '<p class="port-help">'+tr("Includes saved routine/CSE 100, Learning Hub, Focus Insights, reminders, dashboard preferences, theme and language when present. Files may contain personal study information. Save them privately.","সংরক্ষিত Routine/CSE 100, Learning Hub, Focus History, Reminder, UI Preference, Theme ও Language অন্তর্ভুক্ত থাকবে। ব্যক্তিগত Study Data নিরাপদে রাখবে।")+'</p>'+
 '<div class="port-status">'+statuses.map(x=>'<div><span>'+E(tr(...NAMES[x.name]))+'</span><small>'+E(x.status)+'</small></div>').join("")+'</div>'+
 '<button type="button" class="primary-btn" data-action="portability-export"'+(busy?' disabled':'')+'>'+tr("Download complete JSON backup","সম্পূর্ণ JSON Backup ডাউনলোড")+'</button></section>'+
 '<section class="panel"><b class="panel-title">'+tr("Restore with validation & preview","পরীক্ষা ও Preview করে Restore")+'</b>'+
 '<p class="port-help">'+tr("Choose a NovaStudy combined backup exported from this center. Individual Routine or Learning Hub JSON files use a different format and are restored in their original sections.","এখান থেকে Export করা Combined Backup নির্বাচন করো। আগের Routine বা Learning Hub-এর আলাদা JSON File তাদের নিজস্ব Section থেকেই Import করতে হবে।")+'</p>'+
 '<label class="port-file">'+tr("Select complete backup JSON","Combined Backup JSON নির্বাচন")+
 '<input type="file" id="portabilityFile" accept=".json,application/json"'+(busy?' disabled':'')+'></label>';
 if(pending){
  html+='<div class="port-preview"><h3>'+tr("Validated backup preview","যাচাই করা Backup Preview")+'</h3>'+
  '<small>'+tr("Created: ","তৈরি: ")+E(pending.createdAt)+' · '+E(sizeText(pending))+'</small>'+
  '<div class="port-choices">'+ORDER.map(k=>'<label><input type="checkbox" data-portability-module="'+k+'"'+
  (selected.has(k)?' checked':'')+(pending.modules[k]===null?' disabled':'')+'><span>'+
  E(tr(...NAMES[k]))+(pending.modules[k]===null?' · '+tr("Not in file","File-এ নেই"):'')+'</span></label>').join("")+'</div>'+
  '<p class="port-help">'+tr("Only checked modules will replace this browser’s matching local records. Unchecked or absent modules remain unchanged.","শুধু নির্বাচিত Module Replace হবে। অন্য Module অপরিবর্তিত থাকবে।")+'</p>'+
  '<div class="port-actions"><button type="button" class="primary-btn" data-action="portability-restore"'+
  (!selected.size||busy?' disabled':'')+'>'+tr("Confirm selected restore","নির্বাচিত Data Restore")+'</button>'+
  '<button type="button" class="secondary-btn" data-action="portability-cancel">'+tr("Cancel preview","Preview বাতিল")+'</button></div></div>';
 }
 html+='</section>'+(error?'<p role="alert" class="port-error">'+E(error)+'</p>':'')+
 (note?'<p role="status" class="port-note">'+E(note)+'</p>':'')+
 '<section class="panel"><b class="panel-title">'+tr("Before moving to another device","অন্য Device-এ যাওয়ার আগে")+'</b>'+
 '<p class="port-help">'+tr("Local data is specific to each website domain and browser profile. Export on the old device, open the SAME NovaStudy deployment on the new one, choose this file and confirm restore. No automatic cloud sync or cross-device transfer is performed. Back up any data already on the destination before replacing it.","প্রতিটি Domain ও Browser-এর Local Data আলাদা। পুরোনো Device-এ Export করে নতুন Device-এ একই Website খুলে Import করো। Restore-এর আগে নতুন Device-এর Data Backup নাও। নতুন কোনো Cloud Sync যুক্ত হয়নি।")+'</p></section></div>';
 return html;
}
function init(opts={}){refresh=opts.refresh||(()=>{})}
window.NOVA_PORTABILITY={FORMAT,VERSION,KEYS:K,ORDER,download,init,page,action,change,readCurrent,makeBackup,validateBundle,prepare,preview,select,replaceSelection,cancel,currentStatus,getPending:()=>pending?copy(pending):null};
})();
