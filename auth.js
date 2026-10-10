/* NovaStudy v1.9 · Google sign-in through a dedicated Supabase Auth project.
   Auth is optional; it never reads, changes, or uploads novastudy_state_v1. */
(function novastudyGoogleAuth(){
"use strict";
const CONFIG=window.NOVASTUDY_AUTH_CONFIG||{};
const SDK_URL="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
const EN="en",N=window.NOVA,I=window.NOVA_I18N;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const esc=value=>N.escape(String(value??""));
const cfgUrl=String(CONFIG.supabaseUrl||"").trim().replace(/\/+$/,"");
const key=String(CONFIG.publishableKey||"").trim();
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cfgUrl)&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
let client=null,user=null,pending=false,errorMessage="",state=configured?"initializing":"unconfigured",loading=null;
let notify=()=>{},toast=()=>{};
function updateAvatar(){
 const avatar=document.querySelector(".avatar-button");
 if(!avatar)return;
 const name=user?.user_metadata?.full_name||user?.email||"Student";
 avatar.textContent=user?String(name).trim().slice(0,2).toUpperCase():"ST";
 avatar.title=user?tr("Google account connected","Google অ্যাকাউন্ট সংযুক্ত"):tr("Guest profile","অতিথি প্রোফাইল");
 avatar.setAttribute("aria-label",avatar.title);
}
function changed(){updateAvatar();notify()}
function sdk(){
 if(window.supabase&&typeof window.supabase.createClient==="function")return Promise.resolve(window.supabase);
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src=SDK_URL;script.async=true;script.crossOrigin="anonymous";
  script.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(Error("Authentication library unavailable"));
  script.onerror=()=>reject(Error("Authentication library could not load. Check internet connection."));
  document.head.appendChild(script);
 }).catch(e=>{loading=null;throw e});
 return loading;
}
async function refreshUser(){
 if(!client)return;
 try{
  const result=await client.auth.getUser();
  if(result.error||!result.data?.user){user=null;state="guest";errorMessage="";}
  else{user=result.data.user;state="connected";errorMessage="";}
 }catch(e){user=null;state="error";errorMessage=String(e?.message||"Unable to validate account.").slice(0,180)}
 changed();
}
async function init(actions={}){
 notify=typeof actions.refresh==="function"?actions.refresh:()=>{};
 toast=typeof actions.toast==="function"?actions.toast:()=>{};
 changed();
 if(!configured)return;
 try{
  state="initializing";changed();
  const lib=await sdk();
  client=lib.createClient(cfgUrl,key,{
   auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"novastudy_google_auth_v1"}
  });
  client.auth.onAuthStateChange((event)=>{
   if(event==="SIGNED_OUT"){user=null;state="guest";errorMessage="";changed()}
   else if(event==="SIGNED_IN"||event==="TOKEN_REFRESHED"||event==="USER_UPDATED"){
    queueMicrotask(()=>{refreshUser().catch(()=>{})});
   }
  });
  await refreshUser();
 }catch(e){
  state="error";errorMessage=String(e?.message||"Authentication unavailable").slice(0,180);changed();
 }
}
async function signIn(){
 if(!configured){toast(tr("Google login needs project configuration.","Google Login চালু করতে Project Configuration লাগবে।"));return false}
 if(pending)return false;
 pending=true;errorMessage="";state="initializing";changed();
 try{
  if(!client){const lib=await sdk();client=lib.createClient(cfgUrl,key,{auth:{flowType:"pkce",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:"novastudy_google_auth_v1"}})}
  const redirectTo=window.location.origin+window.location.pathname+"#settings";
  const result=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo}});
  if(result.error)throw result.error;
  if(result.data?.url&&result.data.url.startsWith("https://")){window.location.assign(result.data.url);return true}
  // Browser SDK normally navigates itself; do not claim successful sign-in yet.
  return true;
 }catch(e){state="error";errorMessage=String(e?.message||"Could not start Google login.").slice(0,180);toast(errorMessage);changed();return false}
 finally{pending=false}
}
async function signOut(){
 if(!client||pending)return false;
 pending=true;changed();
 try{
  const result=await client.auth.signOut();
  if(result.error)throw result.error;
  user=null;state="guest";errorMessage="";changed();
  toast(tr("Signed out. Local study data is unchanged.","সাইন আউট হয়েছে। লোকাল স্টাডি ডেটা অপরিবর্তিত।"));
  return true;
 }catch(e){errorMessage=String(e?.message||"Sign out failed").slice(0,180);toast(errorMessage);changed();return false}
 finally{pending=false;changed()}
}
function panel(){
 const title=tr("Google Account","Google অ্যাকাউন্ট");
 const connected=state==="connected"&&user;
 const safeName=connected?esc(String(user.user_metadata?.full_name||user.email||"").slice(0,120)):"";
 const safeEmail=connected?esc(String(user.email||"").slice(0,254)):"";
 const message=state==="unconfigured"?tr("Google sign-in is not configured yet. Connect a separate NovaStudy Supabase Auth project to enable it.","Google Sign-In এখনো Configure করা হয়নি। চালু করতে NovaStudy-এর নিজস্ব Supabase Auth Project যুক্ত করতে হবে।"):
 state==="initializing"?tr("Checking Google account…","Google অ্যাকাউন্ট পরীক্ষা করা হচ্ছে…"):
 state==="error"?tr("Authentication unavailable. Check configuration or network.","Authentication চালু হয়নি। Configuration ও Internet পরীক্ষা করো।"):
 connected?tr("Identity verified by Supabase Auth.","Supabase Auth দিয়ে পরিচয় যাচাই করা হয়েছে।"):
 tr("Continue using the app as a guest, or sign in with Google.","অতিথি হিসেবে ব্যবহার করতে পারো, অথবা Google দিয়ে Login করো।");
 return '<section class="panel google-auth-panel" aria-label="'+title+'"><div class="panel-header"><div><b class="panel-title">'+title+'</b><small class="panel-sub">'+
 tr("Optional identity · local-first data","ঐচ্ছিক পরিচয় · লোকাল ডেটা")+'</small></div><span class="auth-state '+(connected?"connected":"")+'">'+
 (connected?tr("Connected","সংযুক্ত"):state==="guest"?tr("Guest","অতিথি"):state==="unconfigured"?tr("Setup required","সেটআপ প্রয়োজন"):tr("Checking","পরীক্ষা চলছে"))+
 '</span></div><div class="auth-summary"><span class="auth-monogram" aria-hidden="true">'+(connected?esc(String(user.user_metadata?.full_name||user.email||"G").charAt(0).toUpperCase()):"G")+
 '</span><div class="auth-summary-text"><strong>'+(connected?safeName:tr("Sign in with Google","Google দিয়ে সাইন ইন"))+
 '</strong><small>'+(connected?safeEmail:message)+'</small></div></div>'+
 (connected?'<button type="button" class="secondary-btn" data-action="google-signout"'+(pending?' disabled':'')+'>'+tr("Sign out of Google","Google থেকে সাইন আউট")+'</button>':
 '<button type="button" class="google-signin-btn" data-action="google-signin"'+(pending||state==="initializing"||!configured?' disabled':'')+'><span aria-hidden="true" class="google-letter">G</span> '+tr("Continue with Google","Google দিয়ে চালিয়ে যাও")+'</button>')+
 (state==="unconfigured"?'<p class="auth-help">'+tr("Owner setup: add public Supabase URL and publishable key in auth-config.js, then enable Google OAuth and redirect URLs.","Owner Setup: auth-config.js-এ Public Supabase URL ও Publishable Key যোগ করো; এরপর Google OAuth ও Redirect URL Configure করো।")+'</p>':"")+
 (errorMessage?'<p class="auth-error" role="alert">'+esc(errorMessage)+'</p>':"")+
 '<div class="hint-banner auth-privacy">'+tr("Signing in does NOT upload or sync tasks, routines, exams or CSE 100 progress. Existing study data remains in this browser even after signing out.","Login করলে Tasks, Routine, Exams বা CSE 100 Progress Cloud-এ Upload/Sync হয় না। Sign Out করার পরও আগের ডেটা এই Browser-এ থাকবে।")+'</div></section>';
}
function handle(action){
 if(action==="google-signin"){void signIn();return true}
 if(action==="google-signout"){void signOut();return true}
 return false;
}
window.NOVA_AUTH={init,handle,panel,signIn,signOut,refreshUser,getStatus:()=>state,getUser:()=>user,getClient:()=>client,configured:()=>configured};
})();
