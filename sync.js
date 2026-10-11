/* NovaStudy v2.1 - explicit three-way, conflict-aware, account-scoped device sync.
   Never apply or upload changes before preview, choice and confirmation. */
(function novastudySmartSync(){
"use strict";
const N=window.NOVA,A=window.NOVA_AUTH,I=window.NOVA_I18N;
const text=(en,bn)=>I.language==="bn"?bn:en,esc=N.escape,table="novastudy_backups";
const MISSING=Symbol("missing"),KEY_PREFIX="novastudy_sync_base_v1_";
let preview=null,busy=false,status="",failure="",notify=()=>{},toast=()=>{};
const copy=x=>JSON.parse(JSON.stringify(x));
const user=()=>A.getStatus?.()==="connected"?A.getUser?.():null;
const client=()=>A.getClient?.();
function stable(x){
 if(x===MISSING)return "#missing";
 if(x===undefined)return "#undefined";
 if(!x||typeof x!=="object")return JSON.stringify(x);
 if(Array.isArray(x))return "["+x.map(stable).join(",")+"]";
 return "{"+Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+stable(x[k])).join(",")+"}";
}
const eq=(x,y)=>stable(x)===stable(y);
function select(base,local,cloud,path,conflicts,choice){
 if(eq(local,cloud))return local;
 if(eq(base,local))return cloud;
 if(eq(base,cloud))return local;
 // When migrating into an account for the first time, entries existing on
 // only one device are additions (not deletions).
 if(base===MISSING&&(local===MISSING||cloud===MISSING))return local===MISSING?cloud:local;
 conflicts.push(path);
 return choice==="cloud"?cloud:local;
}
function mergeObject(base,local,remote,path,conflicts,choice){
 if(![local,remote].some(x=>x&&typeof x==="object"&&!Array.isArray(x)))return select(base,local,remote,path,conflicts,choice);
 const keys=new Set([...Object.keys(base&&base!==MISSING?base:{}),...Object.keys(local&&local!==MISSING?local:{}),...Object.keys(remote&&remote!==MISSING?remote:{})]);
 const out={};
 for(const k of keys){
  const b=base!==MISSING&&Object.hasOwn(base,k)?base[k]:MISSING;
  const l=local!==MISSING&&Object.hasOwn(local,k)?local[k]:MISSING;
  const r=remote!==MISSING&&Object.hasOwn(remote,k)?remote[k]:MISSING;
  const v=select(b,l,r,path+"."+k,conflicts,choice);
  if(v!==MISSING)out[k]=v;
 }
 return out;
}
function mergeRows(base,local,remote,name,key,conflicts,choice){
 const records=a=>new Map((Array.isArray(a)?a:[]).map(x=>[String(x[key]),x]));
 const b=records(base),l=records(local),r=records(remote);
 const order=[...new Set([...l.keys(),...r.keys(),...b.keys()])],out=[];
 for(const id of order){
  const result=select(b.has(id)?b.get(id):MISSING,l.has(id)?l.get(id):MISSING,r.has(id)?r.get(id):MISSING,name+"."+id,conflicts,choice);
  if(result!==MISSING)out.push(result);
 }
 return out;
}
function merge(base,local,remote,choice){
 const conflicts=[];
 if(!N.valid(local)||!N.valid(remote)||base&&!N.valid(base))throw Error("Invalid study snapshot. Nothing was changed.");
 const b=base||{},l=local,r=remote;
 const merged={};
 for(const field of new Set([...Object.keys(l),...Object.keys(r),...Object.keys(b)])){
  if(["subjects","sessions","tasks","exams","attendance"].includes(field)){
   merged[field]=mergeRows(b[field],l[field],r[field],field,"id",conflicts,choice);
  }else if(field==="challenge"){
   const bc=b.challenge||{},lc=l.challenge||{},rc=r.challenge||{};
   const common=mergeObject(
    Object.fromEntries(Object.entries(bc).filter(([k])=>k!=="items")),
    Object.fromEntries(Object.entries(lc).filter(([k])=>k!=="items")),
    Object.fromEntries(Object.entries(rc).filter(([k])=>k!=="items")),
    "challenge",conflicts,choice);
   common.items=mergeRows(bc.items,lc.items,rc.items,"challenge.items","topicId",conflicts,choice);
   merged.challenge=common;
  }else if(field==="profile"){
   merged.profile=mergeObject(b.profile||MISSING,l.profile||MISSING,r.profile||MISSING,"profile",conflicts,choice);
  }else{
   const bv=Object.hasOwn(b,field)?b[field]:MISSING,lv=Object.hasOwn(l,field)?l[field]:MISSING,rv=Object.hasOwn(r,field)?r[field]:MISSING;
   const value=select(bv,lv,rv,field,conflicts,choice);
   if(value!==MISSING)merged[field]=value;
  }
 }
 return {merged,conflicts};
}
function reset(){preview=null;failure="";status="";notify()}
function getBaseline(u=user()){
 if(!u)return null;
 try{
  const value=JSON.parse(localStorage.getItem(KEY_PREFIX+u.id));
  return value&&Number.isInteger(value.revision)&&N.valid(value.snapshot)?value:null;
 }catch{return null}
}
function acceptSnapshot(snapshot,revision){
 const u=user();
 if(!u||!N.valid(snapshot)||!Number.isSafeInteger(Number(revision)))return false;
 preview=null;
 try{localStorage.setItem(KEY_PREFIX+u.id,JSON.stringify({snapshot:copy(snapshot),revision:Number(revision)}));notify();return true}
 catch{failure=text("Local sync history could not be saved. Manual backups still work.","লোকাল Sync History সেভ হয়নি। Manual Backup চালু আছে।");notify();return false}
}
function clearBaseline(){const u=user();preview=null;if(u)try{localStorage.removeItem(KEY_PREFIX+u.id)}catch{}notify()}
function markLocalChange(){preview=null;status=text("Local changes detected. Review sync again.","লোকাল পরিবর্তন হয়েছে। নতুন করে Sync Review করো।")}
function fail(e){failure=String(e?.message||e||"Sync failed").slice(0,220);status="";toast(failure);notify()}
async function fetchRemote(u){
 const result=await client().from(table).select("snapshot,revision,updated_at").eq("user_id",u.id).maybeSingle();
 if(result.error)throw result.error;
 if(result.data&&!N.valid(result.data.snapshot))throw Error("Invalid remote backup. Sync blocked.");
 return result.data;
}
async function review(options={}){
 const u=user();
 if(busy||!u||!client()||(options.auto&&preview?.manual))return false;
 busy=true;failure="";status="";notify();
 try{
  const local=copy(N.get());
  const rawAtReview=localStorage.getItem(N.KEY);
  if(!N.valid(local))throw Error("Local data invalid. Sync blocked.");
  const remote=await fetchRemote(u);
  if(user()?.id!==u.id)throw Error("Google account changed. Sign in and retry.");
  const baseline=remote?getBaseline(u):null;
  // No cloud record: only a confirmed upload may create the first backup.
  const joined=remote?merge(baseline?.snapshot||null,local,remote.snapshot):{merged:local,conflicts:[]};
  preview={
   account:u.id,manual:options.auto!==true,local,localHash:stable(local),rawAtReview,cloud:remote?copy(remote.snapshot):null,
   revision:remote?Number(remote.revision):0,updated:remote?.updated_at||"",
   baseline:baseline?.snapshot||null,conflicts:joined.conflicts,
   pending:!remote||!eq(joined.merged,local)||!eq(joined.merged,remote.snapshot)
  };
  status=preview.conflicts.length?text("Conflicts found. Choose which version to keep for those entries.","Conflict পাওয়া গেছে। কোন Version রাখবে নির্বাচন করো।"):
   text("Review ready. No conflicting edits found.","Review তৈরি। বিরোধপূর্ণ পরিবর্তন নেই।");
  return true;
 }catch(e){preview=null;fail(e);return false}
 finally{busy=false;notify()}
}
function saveLocalBackup(){
 const blob=new Blob([JSON.stringify(N.get(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download="NovaStudy-before-smart-sync-"+N.date(new Date())+".json";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
}
async function apply(choice,options={}){
 const automatic=options.auto===true,u=user(),p=preview,baseline=getBaseline(u);
 if(busy||!u||!client()||!p||p.account!==u.id)return false;
 if(automatic&&(!window.NOVA_AUTO?.enabled?.(u.id)||!baseline||p.manual||p.conflicts.length||p.revision<baseline.revision))return false;
 if(p.conflicts.length&&!["local","cloud"].includes(choice)){fail("Choose a conflict resolution before syncing.");return false}
 if(!automatic&&!window.confirm(text("Sync this device with the Google cloud now? A local JSON backup will download before any replacement. ","এখন Device ও Google Cloud Sync করবে? কোনো পরিবর্তনের আগে Local JSON Backup ডাউনলোড হবে। ")+
 (p.conflicts.length?text("Conflicts: ","Conflict: ")+p.conflicts.length+"; "+(choice==="cloud"?"Cloud wins.":"This device wins."):"No conflicts.")))return false;
 busy=true;failure="";notify();
 try{
  const current=copy(N.get());
  if(stable(current)!==p.localHash||localStorage.getItem(N.KEY)!==p.rawAtReview)
   throw Error("Device or another tab changed since review. Refresh review first.");
  const latest=await fetchRemote(u);
  if(user()?.id!==u.id)throw Error("Account changed. Sync cancelled.");
  if((latest?Number(latest.revision):0)!==p.revision||!eq(latest?.snapshot||null,p.cloud))
   throw Error("Cloud changed since review. Refresh to avoid overwriting.");
  const result=latest?merge(p.baseline,current,latest.snapshot,choice):{merged:current,conflicts:[]};
  if(automatic&&(!latest||!p.baseline))throw Error("Manual sync required before automatic cloud creation or recovery.");
  if(automatic&&result.conflicts.length)throw Error("Conflicting edits detected. Open Smart Sync and review manually.");
  if(!N.valid(result.merged))throw Error("Merged data failed validation (possibly duplicate attendance entries). No changes saved.");
  const encoded=JSON.stringify(result.merged);
  if(new Blob([encoded]).size>900000)throw Error("Merged data exceeds the safe backup limit.");
  const dataChanged=!eq(current,result.merged)||!eq(latest?.snapshot,result.merged);
  if(automatic){
   if(dataChanged&&!window.NOVA_AUTO?.saveRecovery?.(current,u.id))throw Error("Could not keep local safety copy. Auto Sync stopped.");
  }else saveLocalBackup();
  let saved=latest;
  if(!latest){
   const res=await client().from(table).insert({user_id:u.id,snapshot:result.merged,revision:1}).select("snapshot,revision,updated_at").single();
   if(res.error)throw res.error;
   saved=res.data;
  }else if(!eq(result.merged,latest.snapshot)){
   const res=await client().from(table).update({snapshot:result.merged,revision:p.revision+1}).eq("user_id",u.id).eq("revision",p.revision).select("snapshot,revision,updated_at").maybeSingle();
   if(res.error)throw res.error;
   if(!res.data)throw Error("Cloud changed during sync. Retry review.");
   saved=res.data;
  }
  if(!saved||user()?.id!==u.id)throw Error("Account changed during sync. Downloaded JSON backup is available.");
  if(stable(N.get())!==p.localHash||localStorage.getItem(N.KEY)!==p.rawAtReview)
   throw Error("Local data changed during sync. Cloud may have saved; local changes were kept. Review again.");
  if(!eq(current,result.merged)&&!N.setState(result.merged))throw Error(N.getIssue()||"Local save failed. Cloud may already be updated; do not leave without exporting your data.");
  if(!acceptSnapshot(result.merged,Number(saved.revision))){
   status=text("Sync data saved but history unavailable. Next review may show extra conflicts.","Sync হয়েছে, তবে History Save হয়নি। পরের Review-তে বেশি Conflict আসতে পারে।");
  }else status=text("Smart Sync completed. Both copies match.","Smart Sync সফল। দুই জায়গায় একই ডেটা আছে।");
  preview=null;
  window.NOVA_AUTO?.markSynced?.(u.id);
  if(!automatic||dataChanged)toast(status);
  return true;
 }catch(e){preview=null;fail(e);return false}
 finally{busy=false;notify()}
}
const button=(action,caption,disabled=false)=>'<button type="button" class="secondary-btn" data-action="'+action+'"'+(disabled?' disabled':'')+'>'+caption+'</button>';
function panel(){
 const u=user(),base=getBaseline(u);
 if(preview?.account!==u?.id)preview=null;
 const conflict=preview?.conflicts||[];
 return '<section class="panel cloud-panel" aria-label="Smart Sync">'+
 '<div class="panel-header"><div><b class="panel-title">'+text("Smart Sync · v2.2","স্মার্ট সিঙ্ক · v2.2")+'</b>'+
 '<small class="panel-sub">'+text("Review Laptop / Mobile changes before syncing","সিঙ্কের আগে Laptop ও Mobile-এর পরিবর্তন যাচাই করো")+'</small></div></div>'+
 '<p class="panel-sub">'+(!u?text("Connect Google account to start.","শুরু করতে Google Account Connect করো।"):base?
 text("Last synchronized cloud revision: ","সর্বশেষ Sync Revision: ")+esc(base.revision):
 text("No device sync history yet.","এই Device-এ এখনো Sync History নেই।"))+'</p>'+
 '<div class="cloud-actions">'+button("sync-review",text("Compare & review","তুলনা ও যাচাই"),busy||!u)+
 (preview&&!conflict.length?button("sync-apply",text("Sync reviewed changes","পর্যালোচিত পরিবর্তন Sync"),busy):"")+'</div>'+
 (preview?'<div class="cloud-counts"><strong>'+text("Preview","প্রিভিউ")+'</strong> · Cloud revision '+esc(preview.revision)+' · '+esc(conflict.length)+
 text(" conflicts","টি Conflict")+' · '+(preview.pending?text("Changes available","পরিবর্তন আছে"):text("Already matching","ইতিমধ্যে একই"))+'</div>':'')+
 (conflict.length?'<p class="auth-error" role="status">'+text("Conflicting fields: ","বিরোধপূর্ণ তথ্য: ")+esc(conflict.slice(0,6).join(", "))+
 (conflict.length>6?" …":"")+'</p><div class="cloud-actions">'+
 button("sync-prefer-local",text("Keep this device's conflicting edits","এই Device-এর Conflict রাখো"),busy)+
 button("sync-prefer-cloud",text("Keep cloud's conflicting edits","Cloud-এর Conflict রাখো"),busy)+'</div>':'')+
 (failure?'<p class="auth-error" role="alert">'+esc(failure)+'</p>':'')+
 (status?'<p class="panel-sub" role="status">'+esc(status)+'</p>':'')+
 '<div class="hint-banner">'+text("Manual sync always requires review and confirmation. If you opt in to Auto Sync, conflict-free changes can sync while the app is open. Conflicts pause automation for manual review. A local safety copy is kept before automatic changes.","ম্যানুয়াল Sync-এ Review ও Confirmation লাগে। Auto Sync চালু করলে অ্যাপ খোলা থাকাকালীন Conflict ছাড়া পরিবর্তন Sync হবে। Conflict হলে থেমে যাবে। Automatic পরিবর্তনের আগে লোকাল Safety Copy রাখা হয়।")+'</div></section>';
}
function handle(action){
 const actions={"sync-review":review,"sync-apply":()=>apply(null),"sync-prefer-local":()=>apply("local"),"sync-prefer-cloud":()=>apply("cloud")};
 if(!actions[action])return false;
 void actions[action]();return true;
}
function init(opts={}){notify=opts.refresh||(()=>{});toast=opts.toast||(()=>{})}
window.NOVA_SYNC={init,handle,panel,review,apply,merge,acceptSnapshot,clearBaseline,markLocalChange,getPreview:()=>preview,getBaseline};
})();