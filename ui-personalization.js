/* NovaStudy v3.0 — UI personalization. No academic, auth, backup or sync mutation. */
(function(){
"use strict";
const KEY="novastudy_ui_v3_v1";
const ids=["weekly","exams","today","tasks","actions"];
const words={
 weekly:["Weekly progress","সাপ্তাহিক অগ্রগতি"],
 exams:["Upcoming exams","আসন্ন পরীক্ষা"],
 today:["Today's timeline","আজকের সময়সূচি"],
 tasks:["Priority tasks","অগ্রাধিকারভিত্তিক Task"],
 actions:["Quick actions","দ্রুত কাজ"]
};
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape;
const tr=(en,bn)=>I.language==="bn"?bn:en;
const fresh=()=>({version:1,order:ids.slice(),hidden:[],compact:false,contrast:false,reduceMotion:false});
const clone=x=>JSON.parse(JSON.stringify(x));
function valid(s){
 return !!s&&s.version===1&&Array.isArray(s.order)&&s.order.length===ids.length&&
 new Set(s.order).size===ids.length&&s.order.every(x=>ids.includes(x))&&
 Array.isArray(s.hidden)&&s.hidden.length<ids.length&&new Set(s.hidden).size===s.hidden.length&&
 s.hidden.every(x=>ids.includes(x))&&
 typeof s.compact==="boolean"&&typeof s.contrast==="boolean"&&typeof s.reduceMotion==="boolean";
}
let config=fresh(),raw=null,locked=false,issue="",editing=false,render=()=>{},toast=()=>{};
try{
 raw=localStorage.getItem(KEY);
 if(raw!==null){const parsed=JSON.parse(raw);if(!valid(parsed))throw Error("Invalid UI preferences");config=parsed}
}catch{locked=true;issue=tr("UI preferences are damaged. Original bytes are protected.","UI Preference নষ্ট হয়েছে। পুরোনো ডেটা সুরক্ষিত আছে।")}
function apply(){
 const d=document.documentElement;
 d.dataset.uiCompact=config.compact?"on":"off";
 d.dataset.uiContrast=config.contrast?"on":"off";
 d.dataset.uiReducedMotion=config.reduceMotion?"on":"off";
}
function notify(){apply();render()}
function adopt(value){
 if(value===null)return false;
 try{const incoming=JSON.parse(value);if(!valid(incoming))return false;
 config=incoming;raw=value;locked=false;issue="";notify();return true;
 }catch{return false}
}
function save(next,reset=false){
 if(!valid(next)){issue=tr("Invalid UI preference change.","UI Preference পরিবর্তন গ্রহণ করা যায়নি।");notify();return false}
 if(locked&&!reset){issue=tr("UI settings locked to protect the saved preferences.","সংরক্ষিত UI Preference নিরাপদ রাখতে Lock করা হয়েছে।");notify();return false}
 try{
  const latest=localStorage.getItem(KEY);
  if(!reset&&latest!==raw){
   if(latest!==null)adopt(latest);
   issue=tr("Another tab changed the layout. Review and retry.","অন্য Tab-এ Layout বদলেছে। দেখে আবার চেষ্টা করো।");
   notify();return false;
  }
  const text=JSON.stringify(next);
  localStorage.setItem(KEY,text);config=next;raw=text;locked=false;issue="";notify();return true;
 }catch{
  issue=tr("Could not save UI preferences. Your previous layout is preserved.","UI Preference Save হয়নি। আগের Layout অক্ষত।");notify();return false;
 }
}
function option(key,on){
 if(!["compact","contrast","reduceMotion"].includes(key)||typeof on!=="boolean")return false;
 const n=clone(config);n[key]=on;return save(n);
}
function hiddenToggle(id){
 if(!ids.includes(id))return false;
 const n=clone(config);
 if(n.hidden.includes(id))n.hidden=n.hidden.filter(x=>x!==id);
 else if(n.hidden.length<ids.length-1)n.hidden.push(id);
 else{toast(tr("At least one widget must remain visible.","অন্তত একটি Widget দৃশ্যমান থাকতে হবে।"));return false}
 return save(n);
}
function shift(id,direction){
 if(!ids.includes(id)||![-1,1].includes(direction))return false;
 const n=clone(config),index=n.order.indexOf(id),other=index+direction;
 if(other<0||other>=ids.length)return false;
 [n.order[index],n.order[other]]=[n.order[other],n.order[index]];
 return save(n);
}
function reset(){
 if(!window.confirm(tr("Restore the default dashboard and appearance preferences? Study data will not change.","Dashboard ও Appearance-এর Default Preference ফিরিয়ে আনবে? Study Data বদলাবে না।")))return false;
 editing=false;return save(fresh(),true);
}
function toggleEditor(){editing=!editing;render();return true}
function widgets(items){
 if(!Array.isArray(items))return "";
 const lookup=new Map(items.filter(x=>ids.includes(x.id)&&typeof x.html==="string").map(x=>[x.id,x.html]));
 return config.order.filter(id=>!config.hidden.includes(id)&&lookup.has(id)).map(id=>
 '<div class="ui-dashboard-widget" data-ui-widget="'+id+'" role="region" aria-label="'+
 E(tr(...words[id]))+'">'+lookup.get(id)+'</div>').join("");
}
const b=(label,action,id,disabled=false)=>
 '<button type="button" class="ui-widget-move" data-action="'+action+'" data-id="'+id+'"'+
 (disabled?' disabled':'')+' aria-label="'+E(label)+'">'+label+'</button>';
function toolbar(){
 const total=ids.length-config.hidden.length;
 const intro='<section class="ui-widget-settings" aria-label="'+tr("Dashboard widget controls","Dashboard Widget Control")+'">'+
 '<div class="ui-widget-settings-header"><div><b>'+tr("Your dashboard, your layout","নিজের মতো ড্যাশবোর্ড")+'</b>'+
 '<small>'+tr("Change which widgets show and their order. Your study records stay unchanged.","Widget দেখানো ও অবস্থান বদলাও; পড়াশোনার Data অপরিবর্তিত থাকবে।")+'</small></div>'+
 '<button type="button" class="secondary-btn" data-action="ui-customize" aria-expanded="'+editing+'" aria-controls="uiWidgetEditor">'+
 (editing?tr("Finish customization","কাস্টমাইজ শেষ"):tr("Customize dashboard","ড্যাশবোর্ড সাজাও"))+'</button></div>';
 if(!editing)return intro+'</section>';
 return intro+'<div id="uiWidgetEditor" class="ui-widget-editor">'+config.order.map((id,i)=>{
 const visible=!config.hidden.includes(id),title=tr(...words[id]);
 return '<div class="ui-widget-control"><span>'+E(title)+'</span><div>'+
 b(tr("Move up: ","ওপরে নাও: ")+title,"ui-move-up",id,i===0)+
 b(tr("Move down: ","নিচে নাও: ")+title,"ui-move-down",id,i===ids.length-1)+
 b((visible?tr("Hide: ","লুকাও: "):tr("Show: ","দেখাও: "))+title,"ui-toggle-widget",id,!visible&&total===0)+
 '</div></div>';
 }).join("")+'</div></section>';
}
function settingsPanel(){
 const choices=[["compact",tr("Compact spacing","কম জায়গায় বেশি Content"),tr("Fit more items on screen.","স্ক্রিনে আরও Content দেখাও।")],
 ["contrast",tr("High-contrast controls","স্পষ্ট কনট্রাস্ট"),tr("Stronger text, borders, and focus rings.","Text, Border ও Focus আরও স্পষ্ট।")],
 ["reduceMotion",tr("Reduce interface motion","Animation কমাও"),tr("Minimize nonessential transitions and animated effects.","অপ্রয়োজনীয় Animation ও Effects কমাও।")]];
 return '<section class="ui-preferences panel"><div class="panel-header"><div><b class="panel-title">'+
 tr("Display & accessibility","ডিসপ্লে ও অ্যাক্সেসিবিলিটি")+'</b><small class="panel-sub">'+
 tr("Independent device preferences, separate from academic backups.","Academic Backup থেকে আলাদা Device Preference।")+'</small></div></div>'+
 choices.map(([id,title,sub])=>'<label class="ui-preference-item"><span><b>'+E(title)+'</b><small>'+E(sub)+
 '</small></span><input type="checkbox" data-ui-option="'+id+'"'+(config[id]?' checked':'')+'></label>').join("")+
 '<div class="ui-preference-footer"><button type="button" class="secondary-btn" data-action="ui-reset">'+
 tr("Reset dashboard and display preferences","ড্যাশবোর্ড ও ডিসপ্লে Reset")+'</button></div>'+
 (issue?'<p role="alert" class="ui-preference-error">'+E(issue)+'</p>':"")+
 '<p class="ui-preference-info">'+tr("Preferences are stored only in this browser. Routine, CSE 100, Google Login and Sync are not modified.",
 "Preference শুধু এই Browser-এ থাকে। Routine, CSE 100, Google Login ও Sync পরিবর্তন হয় না।")+'</p></section>';
}
function handle(action,button){
 if(action==="ui-customize"){toggleEditor();return true}
 if(action==="ui-toggle-widget"){hiddenToggle(button?.dataset?.id);return true}
 if(action==="ui-move-up"){shift(button?.dataset?.id,-1);return true}
 if(action==="ui-move-down"){shift(button?.dataset?.id,1);return true}
 if(action==="ui-reset"){reset();return true}
 return false;
}
function handleChange(target){
 const key=target?.dataset?.uiOption;
 if(!key)return false;
 option(key,Boolean(target.checked));return true;
}
function init(opts={}){
 render=opts.refresh||(()=>{});toast=opts.toast||(()=>{});
 apply();
}
apply();
window.NOVA_UI={KEY,init,valid,adopt,save,option,hiddenToggle,shift,reset,widgets,toolbar,settingsPanel,handle,handleChange,
 get:()=>clone(config),getIssue:()=>issue};
})();