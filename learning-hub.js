/* NovaStudy v2.7 · Offline-first CSE Learning Hub.
   Independent local store: NEVER touches NOVA core, challenge or cloud/sync state. */
(function(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape,C=window.NOVA_CHALLENGE;
const KEY="novastudy_learning_hub_v1";
const TABS=["overview","challenge","practice","dsa","ai","fullstack","projects","resources"];
const LEVELS=["todo","learning","practiced","completed","review"];
const STAGES=["idea","building","testing","completed"];
const DIFFICULTY=["easy","medium","hard"];
const LANGS=["Python","C","C++","Java","JavaScript","TypeScript","SQL","Other"];
const tr=(en,bn)=>I.language==="bn"?bn:en,copy=o=>JSON.parse(JSON.stringify(o));
const today=()=>N.date(new Date());
const labelTab={overview:["Overview","ওভারভিউ"],challenge:["CSE 100 Challenge","CSE ১০০ চ্যালেঞ্জ"],
 practice:["Programming Practice","প্রোগ্রামিং অনুশীলন"],dsa:["DSA & CP","ডিএসএ ও সিপি"],
 ai:["AI & ML","এআই ও এমএল"],fullstack:["Full Stack","ফুল স্ট্যাক"],
 projects:["Projects","প্রজেক্ট"],resources:["Resources","রিসোর্স"]};
const ROADMAPS={
 dsa:[
 ["arrays","Arrays & Strings","অ্যারে ও স্ট্রিং"],["hash","Hash Maps & Sets","হ্যাশ ম্যাপ ও সেট"],["pointers","Two Pointers / Sliding Window","টু পয়েন্টার / স্লাইডিং উইন্ডো"],
 ["search","Binary Search","বাইনারি সার্চ"],["sort","Sorting & Complexity","সর্টিং ও কমপ্লেক্সিটি"],["stack","Stacks & Queues","স্ট্যাক ও কিউ"],
 ["linked","Linked Lists","লিংকড লিস্ট"],["recursion","Recursion & Backtracking","রিকর্শন ও ব্যাকট্র্যাকিং"],["tree","Trees & BST","ট্রি ও বিএসটি"],
 ["heap","Heaps & Priority Queues","হিপ ও প্রায়োরিটি কিউ"],["graph","Graphs BFS / DFS","গ্রাফ বিএফএস / ডিএফএস"],
 ["greedy","Greedy Algorithms","গ্রিডি অ্যালগরিদম"],["dp","Dynamic Programming","ডাইনামিক প্রোগ্রামিং"],["advanced","Advanced Graph / DP","অ্যাডভান্সড গ্রাফ / ডিপি"]],
 ai:[
 ["python","Python Foundations","পাইথন ফাউন্ডেশন"],["math","Linear Algebra & Calculus","লিনিয়ার অ্যালজেব্রা ও ক্যালকুলাস"],["stats","Probability & Statistics","সম্ভাবনা ও পরিসংখ্যান"],
 ["numpy","NumPy & Pandas","নামপাই ও পান্ডাস"],["clean","Data Cleaning & EDA","ডেটা ক্লিনিং ও ইডিএ"],["viz","Matplotlib & Data Visualization","ডেটা ভিজুয়ালাইজেশন"],
 ["ml","Supervised ML / scikit-learn","সুপারভাইজড এমএল"],["unsupervised","Unsupervised ML","আনসুপারভাইজড এমএল"],
 ["evaluation","Model Evaluation & Data Leakage","মডেল ইভ্যালুয়েশন"],["torch","PyTorch Foundations","পাইটর্চ ফাউন্ডেশন"],
 ["deep","Neural Networks & Deep Learning","ডিপ লার্নিং"],["nlp","NLP / Transformers","এনএলপি / ট্রান্সফরমার"],
 ["vision","Computer Vision","কম্পিউটার ভিশন"],["research","Reproducible AI Research Project","এআই রিসার্চ প্রজেক্ট"]],
 fullstack:[
 ["html","Semantic HTML & Accessibility","এইচটিএমএল ও অ্যাক্সেসিবিলিটি"],["css","CSS & Responsive Layouts","সিএসএস ও রেসপন্সিভ ডিজাইন"],
 ["js","Modern JavaScript","আধুনিক জাভাস্ক্রিপ্ট"],["ts","TypeScript","টাইপস্ক্রিপ্ট"],["git","Git & GitHub","গিট ও গিটহাব"],
 ["react","React Components & Hooks","রিয়্যাক্ট কম্পোনেন্ট ও হুক"],["routing","Routing & State","রাউটিং ও স্টেট"],
 ["node","Node.js & Express","নোড ও এক্সপ্রেস"],["api","REST APIs & Validation","রেস্ট এপিআই"],["db","SQL & PostgreSQL","এসকিউএল ও পোস্টগ্রেস"],
 ["auth","Authentication & Security","অথেন্টিকেশন ও সিকিউরিটি"],["tests","Testing & Debugging","টেস্টিং ও ডিবাগিং"],
 ["deploy","Vercel / Netlify / CI","ডিপ্লয়মেন্ট ও সিআই"],["capstone","Full Stack Capstone","ফুল স্ট্যাক প্রজেক্ট"]]
};
const stateFresh=()=>({version:1,practice:[],roadmaps:{dsa:{},ai:{},fullstack:{}},projects:[],resources:[]});
const uid=()=>N.uid(),kind=(s,allowed)=>allowed.includes(s);
const safeUrl=value=>{
 const s=String(value||"").trim();
 if(!s)return true;
 try{let u=new URL(s);return ["http:","https:"].includes(u.protocol)&&!!u.hostname}catch{return false}
};
const unique=a=>new Set(a.map(x=>x.id)).size===a.length;
const bounded=(s,max)=>typeof s==="string"&&s.length<=max;
const validPractice=p=>p&&bounded(p.id,128)&&p.id&&bounded(p.title,160)&&p.title.trim()&&
 kind(p.language,LANGS)&&kind(p.difficulty,DIFFICULTY)&&kind(p.status,LEVELS)&&
 bounded(p.platform,55)&&bounded(p.url,500)&&safeUrl(p.url)&&
 bounded(p.notes,300)&&N.validDate(p.date);
const validProject=p=>p&&bounded(p.id,128)&&p.id&&bounded(p.name,140)&&p.name.trim()&&
 bounded(p.stack,200)&&kind(p.status,STAGES)&&bounded(p.repo,500)&&safeUrl(p.repo)&&
 bounded(p.live,500)&&safeUrl(p.live)&&Array.isArray(p.milestones)&&p.milestones.length<=25&&unique(p.milestones)&&
 p.milestones.every(m=>m&&bounded(m.id,128)&&m.id&&bounded(m.title,130)&&m.title.trim()&&typeof m.done==="boolean");
const validResource=r=>r&&bounded(r.id,128)&&r.id&&bounded(r.title,150)&&r.title.trim()&&
 bounded(r.url,500)&&r.url&&safeUrl(r.url)&&kind(r.category,["dsa","ai","fullstack","general"]);
function valid(v){
 if(!v||v.version!==1||!Array.isArray(v.practice)||!Array.isArray(v.projects)||!Array.isArray(v.resources)||!v.roadmaps ||
 v.practice.length>500||v.projects.length>80||v.resources.length>120||
 !unique(v.practice)||!unique(v.projects)||!unique(v.resources)||
 !v.practice.every(validPractice)||!v.projects.every(validProject)||!v.resources.every(validResource))return false;
 for(const k of ["dsa","ai","fullstack"]){
  let r=v.roadmaps[k];if(!r||typeof r!=="object"||Array.isArray(r))return false;
  const ids=ROADMAPS[k].map(x=>x[0]);
  if(Object.keys(r).some(x=>!ids.includes(x)||!LEVELS.includes(r[x])))return false;
 }
 return true;
}
let state=stateFresh(),raw=null,locked=false,error="",tab="overview",toast=()=>{},refresh=()=>{};
try{raw=localStorage.getItem(KEY);if(raw!==null){const s=JSON.parse(raw);if(!valid(s))throw Error("Invalid stored learning data");state=s}}
catch{locked=true;error=tr("Saved learning records could not be read. Original bytes are protected; export a raw copy before resetting.","সেভ করা লার্নিং ডেটা পড়া যায়নি। পুরোনো ডেটা অপরিবর্তিত রয়েছে।")}
function save(next,{replace=false}={}){
 if(!valid(next)){error=tr("Invalid learning data. Nothing saved.","লার্নিং ডেটা ভুল। কিছু Save হয়নি।");refresh();return false}
 if(locked&&!replace){error=tr("Learning records are protected. Export raw storage before resetting.","লার্নিং রেকর্ড সুরক্ষিত। Reset করার আগে Raw Data Export করো।");refresh();return false}
 try{
  const latest=localStorage.getItem(KEY);
  if(!replace&&latest!==raw){
   if(latest!==null){const incoming=JSON.parse(latest);if(valid(incoming)){state=incoming;raw=latest;locked=false}}
   error=tr("Another tab changed learning records. Latest valid changes loaded; retry.","অন্য Tab-এ ডেটা বদলেছে। নতুন তথ্য Load হয়েছে; আবার চেষ্টা করো।");refresh();return false;
  }
  let textValue=JSON.stringify(next);
  if(textValue.length>750000)throw Error("Learning storage size limit reached");
  localStorage.setItem(KEY,textValue);
  state=next;raw=textValue;locked=false;error="";refresh();return true;
 }catch{error=tr("Could not save learning records. Previously saved data is unchanged.","লার্নিং রেকর্ড Save হয়নি। আগের সংরক্ষিত ডেটা অক্ষত আছে।");refresh();return false}
}
function adopt(textValue){
 if(textValue===null)return false;
 try{const candidate=JSON.parse(textValue);if(!valid(candidate))return false;
  state=candidate;raw=textValue;locked=false;error="";refresh();return true
 }catch{return false}
}
const requireValue=(x,max,name)=>{
 const value=String(x||"").trim().slice(0,max);
 if(!value)throw Error(name+" is required.");
 return value
};
const string=(x,max)=>String(x||"").trim().slice(0,max);
const formValue=(form,key)=>new FormData(form).get(key);
const formText=(form,key,max)=>string(formValue(form,key),max);
function mutate(cb){
 let next=copy(state);
 try{if(cb(next)===false)return false;return save(next)}
 catch(ex){error=String(ex.message||ex);refresh();return false}
}
function createPractice(form){
 return mutate(n=>{
  if(n.practice.length>=500)throw Error("Maximum 500 practice problems.");
  const title=requireValue(formValue(form,"title"),160,"Problem title");
  const language=formText(form,"language",24),difficulty=formText(form,"difficulty",12),
   platform=formText(form,"platform",55),url=formText(form,"url",500),notes=formText(form,"notes",300),
   date=formText(form,"date",10)||today();
  if(!kind(language,LANGS)||!kind(difficulty,DIFFICULTY)||!safeUrl(url)||!N.validDate(date))throw Error("Invalid practice details or URL");
  if(n.practice.some(x=>x.title.toLowerCase()===title.toLowerCase()&&x.language===language))throw Error("Problem already tracked for this language");
  n.practice.push({id:uid(),title,language,difficulty,platform,url,notes,date,status:"todo"});
 });
}
function createProject(form){
 return mutate(n=>{
  if(n.projects.length>=80)throw Error("Maximum 80 projects.");
  const name=requireValue(formValue(form,"name"),140,"Project name"),stack=formText(form,"stack",200),repo=formText(form,"repo",500),live=formText(form,"live",500);
  if(!safeUrl(repo)||!safeUrl(live))throw Error("Invalid project URL");
  n.projects.push({id:uid(),name,stack,repo,live,status:"idea",milestones:[]});
 });
}
function addMilestone(form){
 return mutate(n=>{
  const id=formText(form,"projectId",128),project=n.projects.find(p=>p.id===id);
  if(!project)throw Error("Project not found");
  if(project.milestones.length>=25)throw Error("Maximum 25 milestones per project");
  project.milestones.push({id:uid(),title:requireValue(formValue(form,"title"),130,"Milestone"),done:false});
 });
}
function createResource(form){
 return mutate(n=>{
  if(n.resources.length>=120)throw Error("Maximum 120 resources");
  const title=requireValue(formValue(form,"title"),150,"Resource title"),url=formText(form,"url",500),category=formText(form,"category",20);
  if(!url||!safeUrl(url)||!kind(category,["dsa","ai","fullstack","general"]))throw Error("Enter a safe HTTPS or HTTP resource URL");
  n.resources.push({id:uid(),title,url,category});
 });
}
function selectTab(next,silent=false){if(!TABS.includes(next))return false;tab=next;if(!silent)refresh();return true}
function handle(action,button){
 const id=button?.dataset?.id,section=button?.dataset?.section;
 if(action==="hub-tab"){selectTab(button?.dataset?.tab);return true}
 if(action==="hub-practice-delete"){if(window.confirm(tr("Delete this problem?","এই Problem মুছবে?")))mutate(n=>{n.practice=n.practice.filter(x=>x.id!==id)});return true}
 if(action==="hub-project-delete"){if(window.confirm(tr("Delete this project and milestones?","এই Project ও Milestones মুছবে?")))mutate(n=>{n.projects=n.projects.filter(x=>x.id!==id)});return true}
 if(action==="hub-milestone-toggle"){mutate(n=>{const p=n.projects.find(x=>x.id===section),m=p?.milestones.find(x=>x.id===id);if(!m)return false;m.done=!m.done});return true}
 if(action==="hub-resource-delete"){if(window.confirm(tr("Remove this resource?","Resource মুছবে?")))mutate(n=>{n.resources=n.resources.filter(x=>x.id!==id)});return true}
 if(action==="hub-export"){exportData();return true}
 if(action==="hub-export-raw"){exportRaw();return true}
 if(action==="hub-clear"){if(window.confirm(tr("Delete this browser's CSE Learning Hub practice, roadmaps, projects and resources? CSE 100 and routines remain untouched.","এই Browser-এর Learning Hub Practice, Roadmap, Project ও Resource মুছবে? CSE 100 এবং Routine অক্ষত থাকবে।")))save(stateFresh(),{replace:true});return true}
 return false;
}
function handleChange(target){
 const ds=target?.dataset||{};
 if(ds.hubMilestone){
  mutate(n=>{const p=n.projects.find(x=>x.id===ds.section),m=p?.milestones.find(x=>x.id===ds.hubMilestone);
   if(!m)return false;m.done=Boolean(target.checked)});return true;
 }
 if(ds.hubProgress){
  const road=ds.hubProgress,id=ds.topicId,value=target.value;
  if(!ROADMAPS[road]?.some(x=>x[0]===id)||!kind(value,LEVELS))return true;
  mutate(n=>{n.roadmaps[road][id]=value});return true;
 }
 if(ds.hubPractice){
  if(!kind(target.value,LEVELS))return true;
  mutate(n=>{const p=n.practice.find(x=>x.id===ds.hubPractice);if(!p)return false;p.status=target.value});return true;
 }
 if(ds.hubProject){
  if(!kind(target.value,STAGES))return true;
  mutate(n=>{const p=n.projects.find(x=>x.id===ds.hubProject);if(!p)return false;p.status=target.value});return true;
 }
 return false;
}
function submit(form){
 if(form?.id==="hubPracticeForm")return createPractice(form);
 if(form?.id==="hubProjectForm")return createProject(form);
 if(form?.id==="hubMilestoneForm")return addMilestone(form);
 if(form?.id==="hubResourceForm")return createResource(form);
 return false;
}
function download(content,filename){
 const blob=new Blob([content],{type:"application/json"}),url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportData(){try{download(JSON.stringify(state,null,2),"NovaStudy-CSE-Learning-Hub-"+today()+".json");return true}catch{return false}}
function exportRaw(){try{const previous=localStorage.getItem(KEY);if(previous===null)return false;download(previous,"NovaStudy-Learning-Raw-Recovery-"+today()+".json");return true}catch{return false}}
async function importData(file){
 if(!file||file.size>850000){error="Choose a JSON file under 850 KB";refresh();return false}
 try{
  const parsed=JSON.parse(await file.text());
  if(!valid(parsed))throw Error("Invalid Learning Hub backup; nothing overwritten");
  if(!window.confirm(tr("Replace this browser's CSE Learning Hub records with the imported copy? Your CSE 100 challenge and routines stay untouched.","Learning Hub-এর রেকর্ড Import করা Copy দিয়ে বদলাবে? CSE 100 ও Routine অক্ষত থাকবে।")))return false;
  return save(parsed,{replace:false});
 }catch(ex){error=String(ex.message||ex);refresh();return false}
}
function analytics(){
 const summaries=Object.fromEntries(Object.entries(ROADMAPS).map(([k,topics])=>[k,{
  completed:topics.filter(([id])=>state.roadmaps[k][id]==="completed").length,
  total:topics.length,
  review:topics.filter(([id])=>state.roadmaps[k][id]==="review").length
 }]));
 const solved=state.practice.filter(p=>p.status==="completed").length;
 const cse=C.summary();
 return{solved,practice:state.practice.length,projects:state.projects.length,
 completedProjects:state.projects.filter(p=>p.status==="completed").length,
 resources:state.resources.length,roadmaps:summaries,cse};
}
const options=(arr,selected)=>arr.map(v=>'<option value="'+E(v)+'"'+(v===selected?" selected":"")+'>'+E(v)+'</option>').join("");
const progressOptions=(value="todo")=>LEVELS.map(s=>'<option value="'+s+'"'+(s===value?" selected":"")+'>'+E(tr(
 {todo:"Not started",learning:"Learning",practiced:"Practiced",completed:"Completed",review:"Review again"}[s],
 {todo:"শুরু হয়নি",learning:"শিখছি",practiced:"অনুশীলন করেছি",completed:"সম্পন্ন",review:"আবার রিভিশন"}[s]))+'</option>').join("");
const btn=(text,action,attr="",style="secondary-btn")=>'<button type="button" class="'+style+'" data-action="'+action+'" '+attr+'>'+text+'</button>';
function top(){
 return '<div class="page-head"><div><span class="eyebrow">'+tr("FUTURE ENGINEER / SKILL WORKSPACE","ফিউচার ইঞ্জিনিয়ার / স্কিল ওয়ার্কস্পেস")+'</span>'+
 '<h1 class="view-title">'+tr("CSE Learning Hub","সিএসই লার্নিং হাব")+'</h1><p class="subheading">'+tr(
 "Programming, DSA, AI/ML, Full Stack, projects, and your original CSE 100 Challenge in one place.",
 "প্রোগ্রামিং, DSA, AI/ML, Full Stack, Project এবং আগের CSE 100 Challenge একই জায়গায়।")+'</p></div></div>'+
 '<nav class="hub-tabs" aria-label="'+tr("Learning Hub sections","লার্নিং হাব সেকশন")+'">'+
 TABS.map(t=>'<button type="button" class="hub-tab'+(tab===t?" is-active":"")+'" data-action="hub-tab" data-tab="'+t+'" aria-current="'+(tab===t?"page":"false")+'">'+
 E(tr(...labelTab[t]))+'</button>').join("")+'</nav>';
}
const progressBar=(value,max)=>'<div class="hub-progress"><span style="width:'+Math.round(value/Math.max(1,max)*100)+'%"></span></div>';
function overview(){
 const a=analytics(),total=a.roadmaps.dsa.completed+a.roadmaps.ai.completed+a.roadmaps.fullstack.completed;
 const rows=["dsa","ai","fullstack"].map(k=>'<div class="hub-roadmap-snapshot"><div><b>'+E(tr(...labelTab[k]))+'</b><span>'+
 E(I.number(a.roadmaps[k].completed))+'/'+E(I.number(a.roadmaps[k].total))+'</span></div>'+
 progressBar(a.roadmaps[k].completed,a.roadmaps[k].total)+'</div>').join("");
 const nums=[[a.solved,tr("Problems solved","সমাধান করা Problem")],[a.cse.completed+"/100",tr("CSE 100 completed","CSE 100 সম্পন্ন")],
 [total,tr("Roadmap topics done","Roadmap Topic সম্পন্ন")],[a.projects,tr("Projects tracked","ট্র্যাক করা Project")]];
 const todayIndex=Math.floor(new Date().getTime()/86400000)%ROADMAPS.dsa.length;
 const item=ROADMAPS.dsa[todayIndex];
 return '<section class="hub-metrics">'+nums.map(([n,t])=>'<div class="panel hub-metric"><strong>'+E(I.number(n))+'</strong><small>'+t+'</small></div>').join("")+'</section>'+
 '<div class="hub-grid"><section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Learning roadmap progress","রোডম্যাপ অগ্রগতি")+'</b></div>'+
 rows+'<p class="hub-note">'+tr("Only your recorded completions count. Progress is not estimated.","শুধু সম্পন্ন হিসেবে Record করা Topic গণনা হয়; অনুমান নয়।")+'</p></section>'+
 '<section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Daily practice suggestion","আজকের অনুশীলনের পরামর্শ")+'</b></div>'+
 '<h3>'+E(tr(item[1],item[2]))+'</h3><p>'+tr("Practice one problem on this topic, then record your result in Programming Practice. This is a suggested topic—not a fetched daily coding challenge.","এই Topic-এ একটি Problem সমাধান করে Programming Practice-এ Record করো। এটি প্রস্তাবিত Topic, অনলাইন থেকে আনা Daily Challenge নয়।")+'</p>'+
 btn(tr("Open practice","Practice খুলুন"),"hub-tab",'data-tab="practice"')+'</section></div>'+
 '<section class="panel hub-backup"><b>'+tr("Your learning records","তোমার Learning Records")+'</b><p class="hub-note">'+tr("Stored in this browser separately from routine backup/cloud sync. Export regularly. CSE 100 remains in the original routine backup.","এই Browser-এ Routine Backup/Cloud Sync থেকে আলাদাভাবে Save হয়। নিয়মিত Export করো। CSE 100 আগের Routine Backup-এই আছে।")+'</p>'+
 btn(tr("Export Learning Hub JSON","Learning Hub JSON Export"),"hub-export")+' '+
 '<label class="hub-import-label">'+tr("Import Learning Hub JSON","Learning Hub JSON Import")+'<input type="file" id="hubImportFile" accept=".json,application/json"></label> '+
 btn(tr("Clear Hub records","Hub Records মুছো"),"hub-clear",'',"danger-btn")+
 (locked?btn(tr("Download raw data","Raw Data ডাউনলোড"),"hub-export-raw"):"")+'</section>';
}
function roadmap(which){
 const progress=state.roadmaps[which],topics=ROADMAPS[which];
 const count=topics.filter(([id])=>progress[id]==="completed").length;
 return '<section class="panel"><div class="panel-header"><div><b class="panel-title">'+E(tr(...labelTab[which]))+
 '</b><small class="panel-sub">'+tr("Track each milestone. Review again flags a weak topic.","প্রতিটি Milestone Track করো। Review Again মানে দুর্বল Topic।")+'</small></div>'+
 '<span class="chip">'+E(I.number(count))+'/'+E(I.number(topics.length))+'</span></div>'+
 progressBar(count,topics.length)+
 '<div class="hub-topic-list">'+topics.map(([id,en,bn],i)=>'<div class="hub-topic"><span class="hub-num">'+E(I.number(i+1))+'</span><div><b>'+E(tr(en,bn))+'</b></div>'+
 '<label><span class="sr-only">'+tr("Progress","অগ্রগতি")+'</span><select data-hub-progress="'+which+'" data-topic-id="'+id+'">'+progressOptions(progress[id])+'</select></label></div>').join("")+'</div></section>';
}
function practice(){
 const rows=state.practice.slice().reverse().map(p=>'<article class="hub-record"><div><b>'+E(p.title)+'</b><small>'+
 E(p.language)+' · '+E(p.difficulty)+' · '+E(I.displayDate(p.date))+(p.platform?" · "+E(p.platform):"")+'</small>'+
 (p.notes?'<p>'+E(p.notes)+'</p>':"")+(p.url?'<a href="'+E(p.url)+'" target="_blank" rel="noopener noreferrer">'+tr("Open problem ↗","Problem খুলুন ↗")+'</a>':"")+'</div>'+
 '<div class="hub-record-actions"><select data-hub-practice="'+E(p.id)+'" aria-label="'+tr("Problem status","Problem Status")+'">'+progressOptions(p.status)+'</select>'+
 btn(tr("Delete","মুছো"),"hub-practice-delete",'data-id="'+E(p.id)+'"',"tiny-btn")+'</div></article>').join("");
 return '<section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Log a programming problem","Programming Problem Record করো")+'</b></div>'+
 '<form id="hubPracticeForm" class="hub-form">'+
 '<label>'+tr("Problem title","Problem Title")+'<input name="title" maxlength="160" required></label>'+
 '<label>'+tr("Language","Language")+'<select name="language">'+options(LANGS,"Python")+'</select></label>'+
 '<label>'+tr("Difficulty","Difficulty")+'<select name="difficulty">'+options(DIFFICULTY,"easy")+'</select></label>'+
 '<label>'+tr("Platform","Platform")+'<input name="platform" maxlength="55" placeholder="LeetCode, Codeforces…"></label>'+
 '<label>'+tr("Problem URL (optional)","Problem URL (ঐচ্ছিক)")+'<input name="url" type="url" maxlength="500" placeholder="https://…"></label>'+
 '<label>'+tr("Practice date","অনুশীলনের তারিখ")+'<input name="date" type="date" value="'+today()+'"></label>'+
 '<label class="hub-wide">'+tr("Notes","নোট")+'<input name="notes" maxlength="300"></label>'+
 '<button class="primary-btn hub-wide" type="submit">'+tr("Add problem","Problem যোগ করো")+'</button></form></section>'+
 '<section class="panel"><b class="panel-title">'+tr("My practice history","আমার অনুশীলনের ইতিহাস")+' ('+E(I.number(state.practice.length))+')</b>'+
 '<div class="hub-record-list">'+(rows||'<div class="empty-state">'+tr("No practice problems yet.","এখনো কোনো Problem Record করা হয়নি।")+'</div>')+'</div></section>';
}
function projects(){
 const projectOptions=state.projects.map(p=>'<option value="'+E(p.id)+'">'+E(p.name)+'</option>').join("");
 const cards=state.projects.slice().reverse().map(p=>{
  const done=p.milestones.filter(x=>x.done).length;
  return '<article class="hub-record hub-project"><div class="hub-project-top"><div><h3>'+E(p.name)+'</h3><small>'+E(p.stack)+'</small></div>'+
  '<select data-hub-project="'+E(p.id)+'" aria-label="'+tr("Project status","Project Status")+'">'+options(STAGES,p.status)+'</select></div>'+
  progressBar(done,p.milestones.length)+
  '<small>'+E(I.number(done))+'/'+E(I.number(p.milestones.length))+' '+tr("milestones completed","টি Milestone সম্পন্ন")+'</small>'+
  '<div class="hub-links">'+(p.repo?'<a href="'+E(p.repo)+'" target="_blank" rel="noopener noreferrer">GitHub ↗</a>':"")+
   (p.live?'<a href="'+E(p.live)+'" target="_blank" rel="noopener noreferrer">Live ↗</a>':"")+'</div>'+
  '<div class="hub-milestones">'+p.milestones.map(m=>'<label><input type="checkbox" data-hub-milestone="'+E(m.id)+'" data-section="'+E(p.id)+'"'+(m.done?" checked":"")+'>'+E(m.title)+'</label>').join("")+'</div>'+
  btn(tr("Delete project","Project মুছো"),"hub-project-delete",'data-id="'+E(p.id)+'"',"tiny-btn")+'</article>';
 }).join("");
 return '<section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Add software project","সফটওয়্যার Project যোগ")+'</b></div>'+
 '<form id="hubProjectForm" class="hub-form">'+
 '<label>'+tr("Project name","Project Name")+'<input name="name" maxlength="140" required></label>'+
 '<label>'+tr("Tech stack","টেক স্ট্যাক")+'<input name="stack" maxlength="200" placeholder="React, Python…"></label>'+
 '<label>'+tr("GitHub URL","GitHub URL")+'<input name="repo" type="url" maxlength="500"></label>'+
 '<label>'+tr("Live URL","Live URL")+'<input name="live" type="url" maxlength="500"></label>'+
 '<button class="primary-btn hub-wide" type="submit">'+tr("Add project","Project যোগ করো")+'</button></form></section>'+
 (state.projects.length?'<section class="panel"><h3>'+tr("Add project milestone","Project Milestone যোগ")+'</h3>'+
 '<form id="hubMilestoneForm" class="hub-form"><label>'+tr("Project","Project")+'<select name="projectId">'+projectOptions+'</select></label>'+
 '<label>'+tr("Milestone","Milestone")+'<input name="title" maxlength="130" required></label>'+
 '<button class="primary-btn hub-wide" type="submit">'+tr("Add milestone","Milestone যোগ")+'</button></form></section>':"")+
 '<section class="panel hub-projects"><b class="panel-title">'+tr("Project tracker","Project Tracker")+' ('+E(I.number(state.projects.length))+')</b>'+
 '<div class="hub-record-list">'+(cards||'<div class="empty-state">'+tr("No projects yet.","এখনো কোনো Project নেই।")+'</div>')+'</div></section>';
}
function resources(){
 const rows=state.resources.slice().reverse().map(r=>'<div class="hub-record"><div><b>'+E(r.title)+'</b><small>'+E(r.category)+'</small>'+
 '<a href="'+E(r.url)+'" target="_blank" rel="noopener noreferrer">'+tr("Open resource ↗","Resource খুলুন ↗")+'</a></div>'+
 btn(tr("Remove","মুছো"),"hub-resource-delete",'data-id="'+E(r.id)+'"',"tiny-btn")+'</div>').join("");
 return '<section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Save learning resources","Learning Resource Save করো")+'</b></div>'+
 '<form id="hubResourceForm" class="hub-form"><label>'+tr("Title","শিরোনাম")+'<input name="title" maxlength="150" required></label>'+
 '<label>'+tr("URL","ইউআরএল")+'<input type="url" name="url" maxlength="500" required placeholder="https://…"></label>'+
 '<label>'+tr("Category","ক্যাটাগরি")+'<select name="category">'+options(["general","dsa","ai","fullstack"],"general")+'</select></label>'+
 '<button class="primary-btn" type="submit">'+tr("Save resource","Resource Save")+'</button></form></section>'+
 '<section class="panel"><b class="panel-title">'+tr("My saved resources","আমার Saved Resources")+'</b><div class="hub-record-list">'+
 (rows||'<div class="empty-state">'+tr("No saved links yet.","এখনো কোনো Link Save করা হয়নি।")+'</div>')+'</div></section>';
}
function page(){
 const content=tab==="challenge"?C.view():tab==="overview"?overview():tab==="practice"?practice():
 ["dsa","ai","fullstack"].includes(tab)?roadmap(tab):tab==="projects"?projects():resources();
 return '<div class="hub-root">'+top()+(error?'<p class="hub-alert" role="alert">'+E(error)+'</p>':"")+
 '<div class="hub-content">'+content+'</div></div>';
}
function init(opts={}){toast=opts.toast||(()=>{});refresh=opts.refresh||(()=>{})}
window.NOVA_LEARNING_HUB={KEY,TABS,ROADMAPS,init,page,selectTab,handle,handleChange,submit,importData,
 valid,save,adopt,analytics,exportData,get:()=>copy(state),getTab:()=>tab,createPractice,createProject,addMilestone,createResource};
})();
