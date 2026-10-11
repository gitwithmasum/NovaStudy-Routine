/* NovaStudy v2.2 · opt-in foreground automatic sync. Never resolve conflicts silently. */
(function novastudyAutoSync(){
"use strict";
const N=window.NOVA,S=window.NOVA_SYNC,A=window.NOVA_AUTH,I=window.NOVA_I18N;
const tr=(en,bn)=>I.language==="bn"?bn:en,esc=N.escape;
const ENABLE="novastudy_auto_enabled_v1_",PENDING="novastudy_auto_pending_v1_";
const BLOCKED="novastudy_auto_conflict_v1_",RECOVERY="novastudy_auto_recovery_v1_";
let running=false,scheduled=null,message="",issue="",notify=()=>{},toast=()=>{},lastAccount=null;
const current=()=>A.getStatus?.()==="connected"?A.getUser?.():null;
const key=(prefix,id)=>prefix+id;
const read=(prefix,id)=>{try{return id?localStorage.getItem(key(prefix,id)):null}catch{return null}};
const write=(prefix,id,value)=>{try{localStorage.setItem(key(prefix,id),value);return true}catch{return false}};
const erase=(prefix,id)=>{try{localStorage.removeItem(key(prefix,id));return true}catch{return false}};
function enabled(id=current()?.id){return !!id&&read(ENABLE,id)==="1"}
function reachable(){return navigator.onLine!==false&&!document.hidden}
function saveRecovery(snapshot,id){
 if(!id||current()?.id!==id||!N.valid(snapshot))return false;
 return write(RECOVERY,id,JSON.stringify({createdAt:new Date().toISOString(),snapshot}));
}
function recovery(id=current()?.id){
 if(!id)return null;
 try{const data=JSON.parse(read(RECOVERY,id));return data&&N.valid(data.snapshot)?data:null}catch{return null}
}
function saveDownload(snapshot,id){
 const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="NovaStudy-AutoSync-Safety-"+N.date(new Date())+".json";
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 return true;
}
function downloadRecovery(){
 const id=current()?.id,data=recovery(id);
 if(!id||!data)return false;
 try{saveDownload(data.snapshot,id);toast(tr("Safety snapshot downloaded.","সেফটি ব্যাকআপ ডাউনলোড হয়েছে।"));return true}
 catch(e){issue=String(e?.message||e);notify();return false}
}
function markSynced(id=current()?.id){
 if(!id)return;
 erase(PENDING,id);erase(BLOCKED,id);
 issue="";message=tr("All changes synced.","সব পরিবর্তন Sync হয়েছে।");notify();
}
function onLocalChange(){
 const id=current()?.id;
 if(!id||!enabled(id))return;
 if(!write(PENDING,id,new Date().toISOString())){
  issue=tr("Could not store pending-change marker. Existing device data is safe.","Pending Change Marker রাখা যায়নি। লোকাল ডেটা অক্ষত আছে।");
 }
 message=tr("Changes are waiting to sync.","পরিবর্তন Sync-এর অপেক্ষায় আছে।");
 notify();
 schedule(3000);
}
function schedule(delay=1200){
 const id=current()?.id;
 if(!enabled(id)||!S.getBaseline?.()||!reachable())return;
 if(scheduled!==null)clearTimeout(scheduled);
 scheduled=setTimeout(()=>{scheduled=null;void run()},delay);
}
async function run(){
 const u=current();
 if(!u||!enabled(u.id)||!S.getBaseline?.(u)||!reachable()||running)return false;
 if(read(BLOCKED,u.id)){message=tr("Sync paused: resolve conflicts in Smart Sync.","Sync থেমে আছে: Smart Sync-এ Conflict সমাধান করো।");notify();return false}
 running=true;issue="";notify();
 try{
  const ok=await S.review({auto:true});
  if(!ok){message=tr("Automatic comparison postponed. Review manually if needed.","Auto Comparison হয়নি। প্রয়োজনে ম্যানুয়ালি Review করো।");return false}
  const preview=S.getPreview?.();
  if(!preview||preview.manual||preview.account!==u.id)return false;
  if(preview.conflicts.length){
   write(BLOCKED,u.id,String(preview.conflicts.length));
   message=tr("Auto Sync paused: ","Auto Sync থেমে গেছে: ")+preview.conflicts.length+tr(" conflict(s). Open Smart Sync to resolve.","টি Conflict। Smart Sync-এ সমাধান করো।");
   toast(message);return false;
  }
  const applied=await S.apply(null,{auto:true});
  if(!applied){
   issue=tr("Auto Sync could not finish safely. Review Smart Sync.","Auto Sync নিরাপদে শেষ হয়নি। Smart Sync Review করো।");
   return false;
  }
  message=tr("Synced while NovaStudy was open.","NovaStudy খোলা অবস্থায় Sync হয়েছে।");
  return true;
 }catch(e){
  issue=String(e?.message||e||"Sync paused").slice(0,180);
  return false;
 }finally{running=false;notify()}
}
function toggle(){
 const u=current();if(!u)return false;
 if(enabled(u.id)){
  erase(ENABLE,u.id);
  if(scheduled!==null){clearTimeout(scheduled);scheduled=null}
  message=tr("Automatic sync is OFF.","Auto Sync বন্ধ।");issue="";notify();return true;
 }
 if(!S.getBaseline?.(u)){
  issue=tr("First complete a manual Smart Sync or Restore on this device, then enable Auto Sync.","প্রথমে এই Device-এ Manual Smart Sync বা Restore করো, তারপর Auto Sync চালু করো।");
  notify();return false;
 }
 if(!window.confirm(tr("Turn on automatic syncing while NovaStudy is open and online? Only conflict-free changes will sync; conflicts pause syncing. A local safety copy is kept before automatic changes.","NovaStudy খোলা ও Online থাকলে Auto Sync চালু করবে? Conflict ছাড়া পরিবর্তন Sync হবে, Conflict হলে থামবে। Automatic পরিবর্তনের আগে Safety Copy রাখা হবে।")))return false;
 if(!write(ENABLE,u.id,"1")){issue=tr("Could not save Auto Sync preference.","Auto Sync Preference সেভ হয়নি।");notify();return false}
 issue="";message=tr("Auto Sync enabled on this browser.","এই Browser-এ Auto Sync চালু হয়েছে।");notify();
 schedule(600);return true;
}
function onAuthChange(){
 const u=current(),id=u?.id||null;
 if(lastAccount!==id){lastAccount=id;message="";issue="";notify()}
 if(id&&enabled(id))schedule(1200);
}
function init(opts={}){
 notify=typeof opts.refresh==="function"?opts.refresh:()=>{};
 toast=typeof opts.toast==="function"?opts.toast:()=>{};
 window.addEventListener("online",()=>schedule(1200));
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule(1600)});
 window.addEventListener("storage",e=>{
  const id=current()?.id;if(!id)return;
  if(e.key===key(ENABLE,id)){message=enabled(id)?tr("Auto Sync enabled.","Auto Sync চালু।"):tr("Auto Sync disabled.","Auto Sync বন্ধ।");notify();schedule()}
  if(e.key===N.KEY){onLocalChange()}
 });
 // Foreground polling checks remote changes even when this device has no pending writes.
 setInterval(()=>schedule(50),90000);
 onAuthChange();
}
function panel(){
 const u=current(),id=u?.id,active=enabled(id),base=S.getBaseline?.(u);
 const conflict=read(BLOCKED,id),pending=read(PENDING,id),safety=recovery(id);
 const label=!u?tr("Sign in to Google first.","আগে Google Login করো।"):!base?
 tr("Complete manual Smart Sync once on this browser before enabling.","প্রথমে এই Browser-এ একবার Manual Smart Sync সম্পন্ন করো।"):
 conflict?tr("Paused: conflict needs manual review.","থেমে আছে: Conflict সমাধান প্রয়োজন।"):
 !active?tr("Off by default. You control when to enable.","ডিফল্টভাবে বন্ধ। তুমি চাইলে চালু করবে।"):
 !reachable()?tr("Offline or backgrounded. Changes wait safely.","Offline বা Background-এ আছে। পরিবর্তন অপেক্ষায় থাকবে।"):
 pending?tr("Local changes pending.","লোকাল পরিবর্তন অপেক্ষায় আছে।"):
 tr("Active while this app is open and online.","অ্যাপ খোলা ও Online থাকলে চালু থাকে।");
 const button=(action,label,disabled=false)=>'<button type="button" class="secondary-btn" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
 return '<section class="panel cloud-panel" aria-label="Automatic Sync">'+
 '<div class="panel-header"><div><b class="panel-title">'+tr("Automatic Sync · v2.2","অটোমেটিক Sync · v2.2")+'</b>'+
 '<small class="panel-sub">'+tr("Opt-in · conflict-aware · foreground only","তোমার অনুমতিতে · Conflict Protection · অ্যাপ খোলা থাকলে")+'</small></div>'+
 '<span class="auth-state'+(active?' connected':'')+'">'+(active?tr("ON","চালু"):tr("OFF","বন্ধ"))+'</span></div>'+
 '<p class="panel-sub">'+label+'</p>'+
 '<div class="cloud-actions">'+button("auto-toggle",active?tr("Turn OFF automatic sync","Auto Sync বন্ধ করো"):tr("Enable automatic sync","Auto Sync চালু করো"),!u||!active&&!base)+
 (active?button("auto-check",tr("Check now","এখন Check করো"),running||!!conflict||!reachable()):"")+
 (conflict?button("auto-review",tr("Review conflicts","Conflict Review"),false):"")+
 (safety?button("auto-safety",tr("Download last safety copy","সর্বশেষ Safety Backup ডাউনলোড"),false):"")+'</div>'+
 (pending?'<p class="panel-sub" role="status">'+tr("Pending offline change is saved on this device.","Pending Change এই Device-এ সংরক্ষিত।")+'</p>':'')+
 (message?'<p class="panel-sub" role="status">'+esc(message)+'</p>':'')+
 (issue?'<p class="auth-error" role="alert">'+esc(issue)+'</p>':'')+
 '<div class="hint-banner">'+tr("Requires an earlier manual sync on every device. No service-worker background syncing. When open and online, new changes are checked after edits and periodically. Conflict detection pauses automatic updates; resolve manually in Smart Sync. Safety snapshots remain in this browser until replaced by a later sync.","প্রতিটি Device-এ আগে Manual Sync দরকার। App বন্ধ থাকলে Auto Sync হয় না। App খোলা ও Online থাকলে Edit-এর পরে ও নির্দিষ্ট বিরতিতে Check হয়। Conflict হলে থামে; Smart Sync-এ ম্যানুয়ালি সমাধান করতে হবে। Safety Snapshot Browser-এ থাকবে।")+'</div></section>';
}
function handle(action){
 if(action==="auto-toggle"){toggle();return true}
 if(action==="auto-check"){void run();return true}
 if(action==="auto-review"){void S.review();return true}
 if(action==="auto-safety"){downloadRecovery();return true}
 return false;
}
window.NOVA_AUTO={init,handle,panel,enabled,run,toggle,onLocalChange,onAuthChange,saveRecovery,recovery,markSynced,downloadRecovery,schedule};
})();