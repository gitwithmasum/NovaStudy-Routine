/* NovaStudy CSE 100: idempotent, offline-first, local bilingual challenge. */
(function(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,D=window.NOVA_CHALLENGE_DATA;
const STATUSES=["not_started","learning","practiced","completed"];
const E=N.escape;
let api=null,blockFilter=0,statusFilter="all",search="";
const tr=(en,bn)=>I.language==="bn"?bn:en;
const store=()=>N.get().challenge;
const today=()=>N.date(new Date());
const pad=id=>String(id).padStart(3,"0");
function offset(id){
 const index=id-1,within=index%10;
 return Math.floor(index/10)*6+(within===9?5:Math.floor(within/2));
}
function scheduled(start,id){
 if(!N.validDate(start)||!Number.isInteger(id)||id<1||id>100)return "";
 const parts=start.split("-").map(Number),dt=new Date(parts[0],parts[1]-1,parts[2],12);
 dt.setDate(dt.getDate()+offset(id));
 return N.date(dt);
}
function records(){return new Map(store().items.map(x=>[x.topicId,x]));}
function summary(){
 const a=store().items,completed=a.filter(x=>x.status==="completed").length;
 return {imported:a.length,completed,learning:a.filter(x=>x.status==="learning").length,
 practiced:a.filter(x=>x.status==="practiced").length,pending:a.filter(x=>x.status==="not_started").length,
 percent:a.length?Math.round(completed/a.length*100):0};
}
function importBatch(block){
 if(block!==0&&(!Number.isInteger(block)||block<1||block>10))return 0;
 const existing=new Set(store().items.map(x=>x.topicId));
 const items=D.topics.filter(x=>(block===0||x.block===block)&&!existing.has(x.id));
 if(!items.length)return 0;
 if(!store().startDate)store().startDate=today();
 for(const item of items)store().items.push({topicId:item.id,status:"not_started"});
 return api.changed()?items.length:0;
}
function setStatus(id,status){
 const num=Number(id);
 if(!Number.isInteger(num)||!STATUSES.includes(status))return false;
 const entry=store().items.find(x=>x.topicId===num);
 if(!entry)return false;
 if(entry.status===status)return true;
 entry.status=status;
 return api.changed();
}
function setStartDate(start){
 if(!N.validDate(start))return false;
 if(store().startDate===start)return true;
 store().startDate=start;
 return api.changed();
}
function fmtDate(day){return day?E(I.displayDate(day)):tr("Choose a start date","শুরুর তারিখ বেছে নাও");}
function actionButton(label,action,kind){return '<button type="button" class="'+(kind||"secondary-btn")+'" data-action="'+action+'">'+label+'</button>';}
function view(){
 const state=store(),map=records(),s=summary(),day=today();
 const rows=D.topics.filter(t=>{
   const item=map.get(t.id);
   const matchesBlock=blockFilter===0||t.block===blockFilter;
   const matchesStatus=statusFilter==="all"||(statusFilter==="today"?Boolean(item)&&scheduled(state.startDate,t.id)===day:statusFilter==="unimported"?!item:Boolean(item)&&item.status===statusFilter);
   return matchesBlock&&matchesStatus&&(t.title+" "+t.learn+" "+t.practice+" "+t.practiceBn).toLowerCase().includes(search.toLowerCase());
 });
 const title=tr("CSE 100 Learning Challenge","CSE ১০০ লার্নিং চ্যালেঞ্জ");
 const intro=tr("100 topics · 10 blocks · 60 days · practice-first learning","১০০টি টপিক · ১০টি ব্লক · ৬০ দিন · অনুশীলনভিত্তিক শেখা");
 const statusLabels=[
  ["not_started",tr("Not Started","শুরু হয়নি")],
  ["learning",tr("Learning","শিখছি")],
  ["practiced",tr("Practiced","অনুশীলন করেছি")],
  ["completed",tr("Completed","সম্পন্ন")]
 ];
 const filters=[["all",tr("All","সব")],["today",tr("Today","আজ")],["not_started",tr("Not Started","শুরু হয়নি")],["learning",tr("Learning","শিখছি")],["practiced",tr("Practiced","অনুশীলন করেছি")],["completed",tr("Completed","সম্পন্ন")],["unimported",tr("Not Imported","ইমপোর্ট হয়নি")]];
 const blocksSummary=D.blocks.map((b,i)=>{
  const count=state.items.filter(x=>x.topicId>=i*10+1&&x.topicId<=i*10+10&&x.status==="completed").length;
  return '<div class="challenge-block-summary"><strong>'+pad(i+1)+' · '+E(I.language==="bn"?b.bn:b.title)+'</strong><span>'+E(I.number(count))+'/10</span><div class="challenge-bar"><i style="width:'+(count*10)+'%"></i></div></div>';
 }).join("");
 const cards=rows.map(t=>{
  const rec=map.get(t.id),when=scheduled(state.startDate,t.id);
  const dayNo=offset(t.id)+1;
  const tag=rec?'<span class="challenge-tag">'+E(tr("Day","দিন"))+' '+E(I.number(dayNo))+' · '+fmtDate(when)+'</span>':'<span class="challenge-tag challenge-notimported">'+tr("Not imported","ইমপোর্ট হয়নি")+'</span>';
  const choices=statusLabels.map(pair=>'<option value="'+pair[0]+'"'+(rec&&rec.status===pair[0]?' selected':'')+'>'+E(pair[1])+'</option>').join("");
  return '<article class="challenge-topic'+(rec&&rec.status==="completed"?' is-completed':'')+'"><div class="challenge-topic-top"><div><span class="challenge-index">'+pad(t.id)+'</span><span class="challenge-topic-block">'+E(I.language==="bn"?D.blocks[t.block-1].bn:D.blocks[t.block-1].title)+'</span></div>'+tag+'</div>'+
   '<h3>'+E(t.title)+'</h3><p>'+E(t.learn)+'</p>'+
   '<div class="challenge-practice"><strong>'+tr("Practical task:","প্র্যাকটিক্যাল কাজ:")+'</strong> '+E(I.language==="bn"?t.practiceBn:t.practice)+'</div>'+
   (rec?'<label class="challenge-status-label">'+tr("Learning status","শেখার অবস্থা")+'<select data-challenge-status data-topic-id="'+t.id+'" aria-label="'+E(t.title)+' '+tr("status","অবস্থা")+'">'+choices+'</select></label>':
   '<button type="button" class="tiny-btn" data-action="challenge-add-topic" data-id="'+t.id+'">'+tr("Import this topic","এই টপিক যোগ করো")+'</button>')+'</article>';
 }).join("");
 return '<div class="page-head"><div><span class="eyebrow">FUTURE ENGINEER / CSE 100</span><h1 class="view-title">'+title+'</h1><p class="subheading">'+intro+'</p></div></div>'+
 '<section class="challenge-hero"><div><span class="eyebrow">'+tr("MISSION CONTROL · LEARNING","মিশন কন্ট্রোল · শেখা")+'</span><h2>'+E(I.number(s.completed))+' / '+E(I.number(100))+'</h2><p>'+tr("Topics completed","টি টপিক সম্পন্ন")+' · '+E(I.number(s.imported))+' '+tr("imported","ইমপোর্ট করা হয়েছে")+'</p></div>'+
 '<div class="challenge-hero-score"><strong>'+E(I.number(s.percent))+'%</strong><small>'+tr("of imported topics","ইমপোর্ট করা টপিকের")+'</small></div><div class="challenge-bar challenge-hero-bar"><i style="width:'+s.percent+'%"></i></div></section>'+
 '<div class="challenge-stats">'+[
  [s.pending,tr("Not Started","শুরু হয়নি")],[s.learning,tr("Learning","শিখছি")],[s.practiced,tr("Practiced","অনুশীলন করেছি")],[s.completed,tr("Completed","সম্পন্ন")]
 ].map(x=>'<div class="challenge-stat"><b>'+E(I.number(x[0]))+'</b><span>'+x[1]+'</span></div>').join("")+'</div>'+
 '<section class="panel challenge-import"><div class="panel-header"><div><b class="panel-title">'+tr("Import & schedule","ইমপোর্ট ও সময়সূচি")+'</b><small class="panel-sub">'+tr("Re-import skips existing IDs and preserves all statuses.","পুনরায় ইমপোর্টে পুরোনো টপিক বাদ যাবে, স্ট্যাটাস অক্ষত থাকবে।")+'</small></div></div>'+
 '<div class="challenge-controls"><label>'+tr("Start date","শুরুর তারিখ")+'<input id="challengeStartDate" type="date" value="'+E(state.startDate)+'" aria-label="'+tr("Challenge start date","চ্যালেঞ্জ শুরুর তারিখ")+'"></label>'+
 '<label>'+tr("Choose block","ব্লক বেছে নাও")+'<select id="challengeImportBlock">'+D.blocks.map((b,i)=>'<option value="'+(i+1)+'">'+E(I.number(i+1))+' · '+E(I.language==="bn"?b.bn:b.title)+'</option>').join("")+'</select></label>'+
 actionButton(tr("Import selected block","নির্বাচিত ব্লক যোগ করো"),"challenge-import-block")+
 actionButton(tr("Import all 100","সব ১০০টি যোগ করো"),"challenge-import-all","primary-btn")+'</div>'+
 '<div class="hint-banner">'+tr("Import is non-destructive: it never clears routine, tasks, exams, attendance or previous challenge progress. Study days use your device calendar, including the 10th day in each block as a revision day.","ইমপোর্টে পুরোনো রুটিন, কাজ, পরীক্ষা, উপস্থিতি বা চ্যালেঞ্জ অগ্রগতি মুছে যাবে না। প্রতিটি ব্লকের ষষ্ঠ দিন রিভিশনসহ পরিকল্পিত।")+'</div></section>'+
 '<div class="challenge-layout"><section class="panel"><div class="panel-header"><b class="panel-title">'+tr("Challenge topics","চ্যালেঞ্জের টপিক")+'</b><span class="chip">'+E(I.number(rows.length))+' '+tr("visible","দেখানো হচ্ছে")+'</span></div>'+
 '<div class="challenge-toolbar"><label>'+tr("Block filter","ব্লক ফিল্টার")+'<select id="challengeBlockFilter"><option value="0">'+tr("All blocks","সব ব্লক")+'</option>'+D.blocks.map((b,i)=>'<option value="'+(i+1)+'"'+(blockFilter===i+1?' selected':'')+'>'+E(I.number(i+1))+' · '+E(I.language==="bn"?b.bn:b.title)+'</option>').join("")+'</select></label>'+
 '<label>'+tr("Progress filter","অগ্রগতি ফিল্টার")+'<select id="challengeStatusFilter">'+filters.map(f=>'<option value="'+f[0]+'"'+(statusFilter===f[0]?' selected':'')+'>'+f[1]+'</option>').join("")+'</select></label>'+
 '<label>'+tr("Search topics","টপিক খুঁজুন")+'<input id="challengeSearch" type="search" value="'+E(search)+'" placeholder="'+tr("Search the 100 topics","১০০টি টপিক খুঁজুন")+'"></label></div>'+
 '<div class="challenge-topic-list">'+(cards||'<div class="empty-state">'+tr("No matching topics","কোনো টপিক পাওয়া যায়নি")+'</div>')+'</div></section>'+
 '<aside class="panel"><div class="panel-header"><b class="panel-title">'+tr("Block progress","ব্লকের অগ্রগতি")+'</b></div><div class="challenge-block-list">'+blocksSummary+'</div></aside></div>';
}
function dashboardPreview(){
 const s=summary();
 return '<section class="challenge-dash"><div><span class="eyebrow">CSE 100 / FUTURE ENGINEER</span><h3>'+tr("60-Day Learning Challenge","৬০ দিনের লার্নিং চ্যালেঞ্জ")+'</h3><p>'+E(I.number(s.imported))+' / 100 '+tr("imported","ইমপোর্ট করা")+' · '+E(I.number(s.completed))+' '+tr("completed","সম্পন্ন")+'</p></div><div class="challenge-dash-actions"><strong>'+E(I.number(s.percent))+'%</strong><button type="button" class="secondary-btn" data-action="go-challenge">'+tr("Open challenge →","চ্যালেঞ্জ খুলুন →")+'</button></div></section>';
}
function handle(action,button){
 if(action==="challenge-import-all"||action==="challenge-import-block"){
  const block=action==="challenge-import-all"?0:Number(document.getElementById("challengeImportBlock")?.value);
  const n=importBatch(block);
  api.toast(n?tr("Imported "+n+" new topics.","নতুন "+I.number(n)+"টি টপিক যোগ হয়েছে।"):tr("No new topics. Existing progress kept.","নতুন টপিক নেই। পুরোনো অগ্রগতি অক্ষত।"));
  return true;
 }
 if(action==="challenge-add-topic"){
  const id=Number(button.dataset.id),item=D.topics.find(x=>x.id===id);
  if(!item)return true;
  if(store().items.some(x=>x.topicId===id)){api.toast(tr("Already imported","আগেই যোগ করা হয়েছে"));return true}
  if(!store().startDate)store().startDate=today();
  store().items.push({topicId:id,status:"not_started"});
  if(api.changed())api.toast(tr("Topic imported","টপিক যোগ হয়েছে"));
  return true;
 }
 return false;
}
function handleChange(target){
 if(target.id==="challengeStartDate"){
  if(!setStartDate(target.value))api.toast(tr("Invalid date or save failed.","তারিখ ভুল অথবা সংরক্ষণ ব্যর্থ।"));
  return true;
 }
 if(target.id==="challengeImportBlock")return false;
 if(target.id==="challengeBlockFilter"){
  blockFilter=Number(target.value)||0;api.refresh();return true;
 }
 if(target.id==="challengeStatusFilter"){
  statusFilter=target.value;api.refresh();return true;
 }
 if(target.dataset.challengeStatus!==undefined){
  if(!setStatus(target.dataset.topicId,target.value))api.toast(tr("Unable to update status.","স্ট্যাটাস আপডেট হয়নি।"));
  return true;
 }
 return false;
}
function handleInput(target){
 if(target.id!=="challengeSearch")return false;
 search=target.value;
 const cursor=target.selectionStart;
 api.refresh();
 const input=document.getElementById("challengeSearch");
 if(input){input.focus();try{input.setSelectionRange(cursor,cursor)}catch{}}
 return true;
}
function init(actions){api=actions}
window.NOVA_CHALLENGE={init,view,dashboardPreview,handle,handleChange,handleInput,importBatch,setStatus,setStartDate,summary,scheduled,offset,catalog:D};
})();
