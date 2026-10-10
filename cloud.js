/* NovaStudy v2.0: explicit, account-scoped backups. Never silently upload or restore. */
(function(){
"use strict";
const N=window.NOVA,A=window.NOVA_AUTH,I=window.NOVA_I18N;
const tr=(en,bn)=>I.language==="bn"?bn:en,esc=N.escape;
let cached=null,busy=false,notice="",error="",notify=()=>{},toast=()=>{};
const table="novastudy_backups";
function getClient(){return A.getClient?.()}
function identity(){const u=A.getUser?.();return u&&A.getStatus()==="connected"?u:null}
function validSnapshot(x){return x&&typeof x==="object"&&N.valid(x)}
function localCounts(s){return ["subjects","sessions","tasks","exams","attendance"].map(k=>[k,Array.isArray(s[k])?s[k].length:0]).concat([["CSE topics",s.challenge?.items?.length||0]])}
function countSummary(s){return localCounts(s).map(([k,v])=>k+": "+v).join(" · ")}
function fail(e){error=String(e?.message||e||"Cloud operation failed").slice(0,180);notice="";toast(error);redraw()}
function redraw(){notify()}
async function readCloud(){
 const u=identity(),client=getClient();
 if(!u||!client){cached=null;error=tr("Sign in first","আগে Sign In করো");redraw();return false}
 if(busy)return false;busy=true;error="";redraw();
 try{
  const {data,error:e}=await client.from(table).select("snapshot,revision,updated_at").eq("user_id",u.id).maybeSingle();
  if(e)throw e;
  if(identity()?.id!==u.id){cached=null;return false}
  if(data&&!validSnapshot(data.snapshot))throw Error("Invalid remote backup. It was not applied.");
  cached=data?{snapshot:data.snapshot,revision:Number(data.revision),updated_at:data.updated_at}:null;
  notice=data?tr("Backup loaded for preview.","ব্যাকআপের প্রিভিউ পাওয়া গেছে।"):tr("No cloud backup yet.","এখনো Cloud Backup নেই।");
  return true;
 }catch(e){fail(e);return false}
 finally{busy=false;redraw()}
}
async function upload(){
 const u=identity(),client=getClient();if(!u||!client||busy)return false;
 const local=JSON.parse(JSON.stringify(N.get()));
 if(!validSnapshot(local)){fail("Invalid local data; upload blocked.");return false}
 const payload=JSON.stringify(local);
 if(payload.length>900000){fail("Backup too large. Export JSON first.");return false}
 const before=await client.from(table).select("revision,updated_at").eq("user_id",u.id).maybeSingle();
 if(before.error){fail(before.error);return false}
 const expected=before.data?.revision||0;
 if(!window.confirm(tr("Upload the current local snapshot to your Google account? This will replace the previous cloud backup, but WILL NOT change local data. Current cloud revision: ","বর্তমান লোকাল ডেটা Google Account-এ ব্যাকআপ করবে? পুরোনো Cloud Backup প্রতিস্থাপিত হবে, কিন্তু লোকাল ডেটা বদলাবে না। বর্তমান Cloud Revision: ")+expected))return false;
 busy=true;error="";redraw();
 try{
  let response;
  if(expected){
   response=await client.from(table).update({snapshot:local,revision:expected+1}).eq("user_id",u.id).eq("revision",expected).select("snapshot,revision,updated_at").maybeSingle();
   if(!response.error&&!response.data)throw Error("Cloud changed in another session. Refresh before uploading.");
  }else{
   response=await client.from(table).insert({user_id:u.id,snapshot:local,revision:1}).select("snapshot,revision,updated_at").single();
   if(response.error?.code==="23505")throw Error("Cloud backup was created elsewhere. Refresh and review before uploading.");
  }
  if(response.error)throw response.error;
  if(identity()?.id!==u.id)throw Error("Account changed; reload and review backup.");
  cached=response.data;
  notice=tr("Cloud backup saved.","Cloud Backup সংরক্ষিত হয়েছে।");
  toast(notice);return true;
 }catch(e){fail(e);return false}
 finally{busy=false;redraw()}
}
function downloadLocal(){
 const blob=new Blob([JSON.stringify(N.get(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download="NovaStudy-before-cloud-restore-"+N.date(new Date())+".json";
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function restore(){
 if(busy||!cached||!identity())return false;
 const u=identity(),client=getClient();
 const latest=await client.from(table).select("snapshot,revision,updated_at").eq("user_id",u.id).maybeSingle();
 if(latest.error||!latest.data){fail(latest.error||"Cloud backup no longer exists.");return false}
 if(Number(latest.data.revision)!==cached.revision){cached=null;fail("Cloud revision changed. Refresh preview and try again.");return false}
 if(!validSnapshot(latest.data.snapshot)){fail("Cloud backup failed validation. Local data unchanged.");return false}
 if(!window.confirm(tr("DANGER: Replace every local routine, task, exam, attendance record and CSE 100 progress with cloud backup revision ","সতর্কতা: Cloud Backup থেকে সব লোকাল Routine, Task, Exam, Attendance, CSE 100 Progress Replace হবে। Cloud Revision ")+cached.revision+"? "+tr("A local JSON backup will download first.","আগে লোকাল JSON Backup ডাউনলোড হবে।")))return false;
 if(identity()?.id!==u.id)return false;
 downloadLocal();
 if(!N.setState(latest.data.snapshot)){fail(N.getIssue()||"Restore failed, local data unchanged.");return false}
 cached={snapshot:latest.data.snapshot,revision:Number(latest.data.revision),updated_at:latest.data.updated_at};
 notice=tr("Restored locally; cloud remains unchanged.","লোকাল ডেটা Restore হয়েছে; Cloud অপরিবর্তিত।");
 toast(notice);redraw();return true;
}
async function remove(){
 if(busy||!cached||!identity())return false;
 const u=identity(),client=getClient();
 if(!window.confirm(tr("Permanently delete the Google account cloud backup? Local study data will remain.","Google Account-এর Cloud Backup স্থায়ীভাবে মুছবে? লোকাল স্টাডি ডেটা থাকবে।")))return false;
 busy=true;redraw();
 try{
  const res=await client.from(table).delete().eq("user_id",u.id).eq("revision",cached.revision).select("user_id");
  if(res.error)throw res.error;
  if(!res.data?.length)throw Error("Cloud revision changed. Refresh first.");
  cached=null;notice=tr("Cloud backup deleted. Local data kept.","Cloud Backup মুছে গেছে। লোকাল ডেটা আছে।");toast(notice);return true;
 }catch(e){fail(e);return false}
 finally{busy=false;redraw()}
}
function panel(){
 const u=identity();
 if(!u)cached=null;
 const status=!u?tr("Sign in with Google to enable optional backup.","ঐচ্ছিক Cloud Backup চালু করতে Google দিয়ে Login করো।"):cached?
 tr("Backup: ","ব্যাকআপ: ")+esc(cached.updated_at||"") + " · revision "+esc(cached.revision):
 tr("No backup loaded. Refresh to check.","ব্যাকআপ এখনো দেখা হয়নি। Refresh করো।");
 const btn=(action,label,disabled)=>'<button type="button" data-action="'+action+'" class="secondary-btn"'+(disabled?' disabled':'')+'>'+label+'</button>';
 return '<section class="panel cloud-panel" aria-label="Cloud Backup"><div class="panel-header"><div><b class="panel-title">'+tr("Google Account Cloud Backup","Google Account Cloud Backup")+'</b><small class="panel-sub">'+tr("Manual backup and restore · no automatic overwrite","ম্যানুয়াল ব্যাকআপ ও রিস্টোর · অটোমেটিক Overwrite নয়")+'</small></div></div>'+
 '<p class="panel-sub">'+status+'</p><div class="cloud-counts"><strong>'+tr("This browser:","এই ব্রাউজারে:")+'</strong> '+esc(countSummary(N.get()))+'</div>'+
 (cached?'<div class="cloud-counts"><strong>'+tr("Cloud snapshot:","ক্লাউডে:")+'</strong> '+esc(countSummary(cached.snapshot))+'</div>':'')+
 '<div class="cloud-actions">'+btn("cloud-refresh",tr("Refresh preview","প্রিভিউ রিফ্রেশ"),!u||busy)+
 btn("cloud-upload",tr("Back up this browser","এই ব্রাউজারের ব্যাকআপ"),!u||busy)+
 btn("cloud-restore",tr("Restore cloud to this browser","ক্লাউড থেকে রিস্টোর"),!u||busy||!cached)+
 btn("cloud-delete",tr("Delete cloud backup","ক্লাউড ব্যাকআপ মুছো"),!u||busy||!cached)+'</div>'+
 (error?'<p role="alert" class="auth-error">'+esc(error)+'</p>':'')+
 (notice?'<p class="panel-sub" role="status">'+esc(notice)+'</p>':'')+
 '<div class="hint-banner">'+tr("Only one account backup is kept. Upload replaces that backup after confirmation. Restore downloads a local JSON copy before replacing browser data. Different sites/devices remain separate until you manually restore.","প্রতি Account-এ একটি Backup রাখা হয়। অনুমতি ছাড়া Upload বা Restore হয় না। Restore-এর আগে Local JSON Backup ডাউনলোড হয়। অন্য Domain/Device-এ ডেটা নিতে সেখানে আলাদাভাবে Restore করতে হবে।")+'</div></section>';
}
function handle(action){
 const actions={"cloud-refresh":readCloud,"cloud-upload":upload,"cloud-restore":restore,"cloud-delete":remove};
 if(!actions[action])return false;
 void actions[action]();return true;
}
function init(opts={}){notify=opts.refresh||(()=>{});toast=opts.toast||(()=>{})}
window.NOVA_CLOUD={init,panel,handle,readCloud,upload,restore,remove,getCached:()=>cached};
})();
