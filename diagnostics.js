/* NovaStudy v3.3 — on-device diagnostics, privacy-preserving support export.
   Does not inspect user records, network sync or mutate academic data. */
(function(){
"use strict";
const I=window.NOVA_I18N,E=window.NOVA.escape;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const VERSION="3.5.2";
let results=null,checking=false,issueDraft="",message="",refresh=()=>{};
const small=(x)=>String(x).slice(0,500);
const status=(id,label,level,detail)=>({id,label,level,detail});
function storageProbe(){
 const key="novastudy_diag_probe_"+Math.random().toString(36).slice(2);
 let wrote=false;
 try{localStorage.setItem(key,"ok");wrote=true;
  return localStorage.getItem(key)==="ok";}
 catch{return false}
 finally{if(wrote)try{localStorage.removeItem(key)}catch{}}
}
const supported=(obj,key)=>!!obj&&key in obj;
async function collect(env={}){
 const doc=env.document||document,nav=env.navigator||navigator,win=env.window||window,
 cache=env.caches||(typeof caches==="undefined"?null:caches);
 const checks=[];
 function add(id,label,level,detail){checks.push(status(id,label,level,detail))}
 const secure=win.isSecureContext===true||win.location?.hostname==="localhost";
 add("secure","Secure context",secure?"pass":"warn",secure?"HTTPS / localhost":"Not HTTPS; installed PWA features may fail");
 const online=nav.onLine;
 add("network","Browser connection",online===false?"warn":"info",online===false?"Browser reports offline":"Browser reports online or unknown (not proof of Internet access)");
 const storageOk=storageProbe();
 add("storage","Local storage test",storageOk?"pass":"warn",storageOk?"Temporary write/read worked; probe removed":"Storage is blocked or unavailable; saved data may be at risk");
 const dom=doc.documentElement;
 const theme=dom?.dataset?.theme||"unknown",language=I.language;
 const view=win.innerWidth+" × "+win.innerHeight;
 const navBar=doc.querySelector(".mobile-nav");
 const mobile=!!win.matchMedia?.("(max-width:660px)")?.matches;
 add("viewport","Viewport & menu","info",view+(mobile?(navBar&&navBar.scrollWidth>navBar.clientWidth?" · horizontal navigation scrollable":" · narrow viewport"):" · desktop/tablet"));
 const skip=doc.querySelector('[data-action="focus-content"]'),main=doc.querySelector('#view[tabindex="-1"]');
 add("keyboard","Keyboard skip target",skip&&main?"pass":"warn",skip&&main?"Skip link and focusable main view present":"Skip link or keyboard target missing");
 const navButtons=Array.from(doc.querySelectorAll('.nav-list [data-nav],.mobile-nav [data-nav]'));
 const unlabeled=navButtons.filter(el=>!el.getAttribute("aria-label")&&!el.textContent?.trim());
 add("navlabels","Navigation labels",navButtons.length&&!unlabeled.length?"pass":"warn",
  navButtons.length&&!unlabeled.length?navButtons.length+" navigation buttons have text":"One or more navigation buttons lack text labels");
 const motion=win.matchMedia?.("(prefers-reduced-motion:reduce)")?.matches||false;
 add("motion","Reduced motion","info",motion||dom?.dataset?.uiReducedMotion==="on"?"Reduced motion requested":"Normal motion enabled");
 const permission=win.Notification?.permission||"unsupported";
 add("notifications","Browser notifications",permission==="granted"?"pass":permission==="denied"?"warn":"info",
  "Permission: "+permission+" (foreground only; no background push)");
 const standalone=!!win.matchMedia?.("(display-mode:standalone)")?.matches||nav.standalone===true;
 add("installed","App display mode","info",standalone?"Standalone PWA":"Browser tab or unverified installation");
 const sw=nav.serviceWorker;
 if(!sw||!supported(sw,"getRegistration")){
  add("worker","Offline service worker","warn","Service Worker API unavailable");
 }else{
  try{
   const reg=await sw.getRegistration();
   add("worker","Offline service worker",reg?.active?"pass":"warn",
    reg?.waiting?"Update waiting — return to app update prompt":reg?.active?"Active service worker":"No active worker for this scope");
  }catch{add("worker","Offline service worker","warn","Cannot read service worker status")}
 }
 if(cache&&supported(cache,"keys")){
  try{
   const keys=await cache.keys(),versions=keys.filter(k=>/^novastudy-v/.test(k));
   const offlineShell=await cache.match("./index.html");
   add("cache","Offline app shell",offlineShell?"pass":"warn",
    offlineShell?"Cached index.html present · "+versions.length+" NovaStudy cache(s)":"No cached offline index found");
  }catch{add("cache","Offline app shell","warn","Cache Storage unreadable")}
 }else add("cache","Offline app shell","info","Cache Storage API unsupported");
 const data={
  version:VERSION,checkedAt:new Date().toISOString(),language,theme,viewport:view,
  secureContext:secure,standalone,checks
 };
 return data;
}
function renderRefresh(){refresh()}
async function run(){
 if(checking)return false;
 checking=true;message="";renderRefresh();
 try{results=await collect();return true}
 catch{message=tr("Diagnostics could not finish. No student records were changed.","Diagnostics সম্পন্ন হয়নি। কোনো Student Data পরিবর্তিত হয়নি।");return false}
 finally{checking=false;renderRefresh()}
}
function report(){
 if(!results)return null;
 return {product:"NovaStudy",release:VERSION,privacy:"No academic, login, token or localStorage content included.",
   diagnostics:results,issueDescription:small(issueDraft)};
}
async function copyReport(){
 const r=report();if(!r){message=tr("Run diagnostics before exporting.","Export-এর আগে Diagnostics চালাও।");renderRefresh();return false}
 if(!navigator.clipboard?.writeText){
  message=tr("Clipboard unavailable. Use Download JSON instead.","Clipboard পাওয়া যায়নি। Download JSON ব্যবহার করো।");renderRefresh();return false}
 try{await navigator.clipboard.writeText(JSON.stringify(r,null,2));
  message=tr("Diagnostic report copied. Review before sharing.","রিপোর্ট Copy হয়েছে। Share করার আগে দেখে নাও।");renderRefresh();return true
 }catch{message=tr("Clipboard permission denied. Use Download JSON.","Clipboard Permission নেই। Download JSON ব্যবহার করো।");renderRefresh();return false}
}
function download(){
 const r=report();if(!r){message=tr("Run diagnostics before exporting.","Export-এর আগে Diagnostics চালাও।");renderRefresh();return false}
 try{
  const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="NovaStudy-Diagnostics-v3.4.0.json";
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1200);
  message=tr("Report downloaded. Review it before sharing.","রিপোর্ট ডাউনলোড হয়েছে। Share করার আগে দেখে নাও।");renderRefresh();return true;
 }catch{message=tr("Download unavailable. Try Copy Report.","ডাউনলোড করা যায়নি। Copy Report চেষ্টা করো।");renderRefresh();return false}
}
function setIssue(text){issueDraft=small(text||"")}
function onAction(action){
 if(action==="diagnostics-run"){void run();return true}
 if(action==="diagnostics-copy"){void copyReport();return true}
 if(action==="diagnostics-download"){download();return true}
 return false;
}
function page(){
 const rows=results?.checks||[];
 const counts={pass:rows.filter(x=>x.level==="pass").length,warn:rows.filter(x=>x.level==="warn").length};
 const displayRows=rows.map(x=>
  '<li class="diag-result" data-level="'+x.level+'"><span class="diag-status">'+
  (x.level==="pass"?"✓":x.level==="warn"?"!":"i")+'</span><div><b>'+E(x.label)+'</b>'+
  '<small>'+E(x.detail)+'</small></div><strong>'+E(x.level.toUpperCase())+'</strong></li>').join("");
 return '<div class="diag-root"><div class="page-head"><div><span class="eyebrow">'+
 tr("APP HEALTH / 3.4","অ্যাপ হেলথ / ৩.৩")+'</span><h1 class="view-title">'+
 tr("Diagnostics & Accessibility","ডায়াগনস্টিকস ও অ্যাক্সেসিবিলিটি")+'</h1><p class="subheading">'+
 tr("Inspect device-level app readiness without sharing your study records.","পড়াশোনার তথ্য না দিয়েই App-এর অবস্থা যাচাই করো।")+'</p></div></div>'+
 '<section class="panel"><div class="panel-header"><b class="panel-title">'+
 tr("Device & PWA checks","ডিভাইস ও PWA পরীক্ষা")+'</b><span class="chip">'+VERSION+'</span></div>'+
 '<p class="diag-help">'+tr("Checks run only when you choose Run diagnostics. This is not a full device or security audit.",
 "Run Diagnostics চাপলে তবেই পরীক্ষা হবে। এটি সম্পূর্ণ Device বা Security Audit নয়।")+'</p>'+
 '<button type="button" class="primary-btn" data-action="diagnostics-run"'+(checking?' disabled':'')+'>'+
 (checking?tr("Checking…","পরীক্ষা চলছে…"):tr("Run diagnostics","ডায়াগনস্টিকস চালাও"))+'</button>'+
 (results?'<div class="diag-overview"><span>'+tr("Checks","পরীক্ষা")+': '+E(String(rows.length))+
 '</span><span>'+tr("Passed","পাস")+': '+E(String(counts.pass))+'</span><span>'+
 tr("Warnings","সতর্কতা")+': '+E(String(counts.warn))+'</span></div>'+
 '<ul class="diag-results">'+displayRows+'</ul>':
 '<p class="diag-help">'+tr("No checks have been run yet.","এখনো কোনো পরীক্ষা করা হয়নি।")+'</p>')+'</section>'+
 '<section class="panel"><div class="panel-header"><b class="panel-title">'+
 tr("Issue report (manual export)","সমস্যার রিপোর্ট (ম্যানুয়াল Export)")+'</b></div>'+
 '<label class="diag-label" for="diagnosticIssue">'+tr("What happened? (optional, 500 characters)","কী সমস্যা হয়েছে? (ঐচ্ছিক, ৫০০ অক্ষর)")+'</label>'+
 '<textarea id="diagnosticIssue" maxlength="500" rows="4" placeholder="'+
 tr("Steps to reproduce, but do not include passwords, emails or personal notes.",
 "সমস্যা কীভাবে হচ্ছে লিখো। Password, Email বা Personal Note দেবে না।")+'">'+E(issueDraft)+'</textarea>'+
 '<div class="diag-actions"><button type="button" class="secondary-btn" data-action="diagnostics-copy"'+(!results?' disabled':'')+'>'+
 tr("Copy report","রিপোর্ট Copy")+'</button><button type="button" class="secondary-btn" data-action="diagnostics-download"'+(!results?' disabled':'')+'>'+
 tr("Download JSON","JSON ডাউনলোড")+'</button></div>'+
 (message?'<p class="diag-message" role="status">'+E(message)+'</p>':"")+
 '<p class="diag-help">'+tr("Your report contains only app/version, basic browser capability checks, screen size, language, appearance, and the issue text you enter. It does not contain study data, credentials, tokens, emails, or entire URLs. Nothing is sent automatically.",
 "রিপোর্টে App Version, Browser Capability, Screen Size, Language, Theme এবং তোমার লেখা Issue থাকবে। Study Data, Password, Token, Email বা সম্পূর্ণ URL থাকবে না। কিছুই স্বয়ংক্রিয়ভাবে পাঠানো হয় না।")+'</p></section>'+
 '<section class="panel"><b class="panel-title">'+tr("Keyboard & accessibility checklist","কিবোর্ড ও অ্যাক্সেসিবিলিটি চেকলিস্ট")+'</b>'+
 '<ul class="diag-checklist"><li>'+tr("Press Tab: use Skip to main content, then try keyboard navigation.","Tab চাপো: Skip to main content এবং Keyboard Navigation যাচাই করো।")+'</li>'+
 '<li>'+tr("Use Left/Right arrows in the mobile navigation when a menu button is focused.","Mobile Navbar-এ Focus থাকলে Left/Right Arrow ব্যবহার করো।")+'</li>'+
 '<li>'+tr("Check 200% zoom, both themes, Bangla labels and Reduce Motion.","২০০% Zoom, দুই Theme, Bangla Label ও Reduce Motion যাচাই করো।")+'</li>'+
 '<li>'+tr("Use TalkBack or VoiceOver to check real screen reader announcements.","TalkBack বা VoiceOver দিয়ে Screen Reader-এর আচরণ পরীক্ষা করো।")+'</li></ul></section></div>';
}
function init(opts={}){refresh=opts.refresh||(()=>{})}
window.NOVA_DIAGNOSTICS={VERSION,init,page,onAction,setIssue,collect,run,report,copyReport,download,get:()=>results};
})();
