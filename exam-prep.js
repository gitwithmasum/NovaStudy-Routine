/* NovaStudy v2.5 — Exam Preparation Center.
   Embedded optional metadata in existing exams; no separate database, no automatic sync writes. */
(function novaExamPrep(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,E=N.escape;
const tr=(en,bn)=>I.language==="bn"?bn:en;
let selected=null,changed=()=>false,toast=()=>{},refresh=()=>{};
const all=()=>N.get().exams||[];
const current=()=>all().find(x=>x.id===selected)||null;
function selectExam(id){
 if(!all().some(x=>x.id===id))return false;
 selected=id;refresh();return true;
}
function getPrep(exam){const p=exam?.prep;return {
 topics:Array.isArray(p?.topics)?p.topics:[],mocks:Array.isArray(p?.mocks)?p.mocks:[]};}
function metrics(exam){
 const p=getPrep(exam),total=p.topics.length,completed=p.topics.filter(x=>x.done).length;
 const weak=p.topics.filter(x=>x.weak);
 const topicsPct=total?Math.round(completed/total*100):null;
 const latest=p.mocks.reduce((best,m)=>!best||m.date>best.date||m.date===best.date?m:best,null);
 const mockPct=latest?Math.round(latest.score/latest.total*100):null;
 const indicator=topicsPct===null||mockPct===null?null:Math.round(topicsPct*.6+mockPct*.4);
 return {total,completed,weak,topicsPct,latest,mockPct,indicator,attempts:p.mocks.length};
}
function write(mutator){
 const exam=current();if(!exam)return false;
 const next={topics:getPrep(exam).topics.map(x=>({...x})),mocks:getPrep(exam).mocks.map(x=>({...x}))};
 const result=mutator(next);
 if(result===false)return false;
 // We rely on the core validator and storage rollback for concurrent tab writes / quota failures.
 exam.prep=next;
 if(!changed()){toast(tr("Could not save. Your previous data was restored.","Save হয়নি। আগের ডেটা ফিরিয়ে আনা হয়েছে।"));return false}
 return true;
}
function addTopic(form){
 if(!current())return false;
 const title=String(new FormData(form).get("title")||"").trim().slice(0,120);
 if(!title){toast(tr("Enter a revision topic.","Revision Topic লিখো।"));return false}
 return write(p=>{
  if(p.topics.length>=60){toast(tr("Maximum 60 topics per exam.","প্রতি পরীক্ষায় সর্বোচ্চ ৬০টি Topic।"));return false}
  if(p.topics.some(x=>x.title.toLocaleLowerCase()===title.toLocaleLowerCase())){
   toast(tr("This topic is already listed.","এই Topic আগে থেকেই আছে।"));return false}
  p.topics.push({id:N.uid(),title,done:false,weak:false});
 });
}
function addMock(form){
 if(!current())return false;
 const data=new FormData(form);
 const score=Number(data.get("score")),total=Number(data.get("total"));
 const date=String(data.get("date")||N.date(new Date()));
 const notes=String(data.get("notes")||"").trim().slice(0,140);
 if(!Number.isInteger(score)||!Number.isInteger(total)||total<1||total>200||score<0||score>total||
    !N.validDate(date)||date>N.date(new Date())){
  toast(tr("Enter a valid score (0 to total, max 200) and a date not in the future.","সঠিক নম্বর (সর্বোচ্চ ২০০) ও আজ বা আগের তারিখ দাও।"));return false;
 }
 return write(p=>{
  if(p.mocks.length>=60){toast(tr("Maximum 60 mock records per exam.","প্রতি পরীক্ষায় সর্বোচ্চ ৬০টি Mock Result।"));return false}
  p.mocks.push({id:N.uid(),score,total,date,notes});
 });
}
function updateTopic(action,id){
 return write(p=>{
  const topic=p.topics.find(x=>x.id===id);
  if(!topic)return false;
  if(action==="prep-toggle-topic")topic.done=!topic.done;
  else if(action==="prep-weak-topic")topic.weak=!topic.weak;
  else if(action==="prep-remove-topic"){if(!window.confirm(tr("Delete this revision topic?","এই Revision Topic মুছে ফেলবে?")))return false;
   p.topics=p.topics.filter(x=>x.id!==id)}
  else return false;
 });
}
function removeMock(id){
 return write(p=>{
  if(!p.mocks.some(x=>x.id===id)||!window.confirm(tr("Remove this mock test result?","এই Mock Test Result মুছে ফেলবে?")))return false;
  p.mocks=p.mocks.filter(x=>x.id!==id);
 });
}
function handle(action,id){
 if(action==="exam-prep"){selectExam(id);return true}
 if(["prep-toggle-topic","prep-weak-topic","prep-remove-topic"].includes(action)){
  updateTopic(action,id);return true}
 if(action==="prep-remove-mock"){removeMock(id);return true}
 return false;
}
const button=(title,action,id,cls="tiny-btn")=>'<button type="button" class="'+cls+
 '" data-action="'+action+'" data-id="'+E(id)+'">'+title+'</button>';
function topicRow(t){
 return '<div class="exam-prep-topic"><label><input type="checkbox" data-prep-check="'+E(t.id)+'" '+
 (t.done?"checked":"")+' aria-label="'+tr("Complete revision topic","Revision Topic সম্পন্ন")+'"><span class="'+
 (t.done?"is-done":"")+'">'+E(t.title)+'</span></label><div class="exam-prep-row-actions">'+
 button(t.weak?tr("Weak ✓","দুর্বল ✓"):tr("Mark weak","দুর্বল চিহ্নিত"),"prep-weak-topic",t.id,t.weak?"secondary-btn":"tiny-btn")+
 button(tr("Delete","মুছো"),"prep-remove-topic",t.id,"tiny-btn")+'</div></div>';
}
function mockRow(m){
 return '<div class="exam-prep-mock"><div><b>'+E(I.number(m.score))+'/'+E(I.number(m.total))+
 ' · '+E(I.number(Math.round(m.score/m.total*100)))+'%</b><small>'+E(I.displayDate(m.date))+
 (m.notes?' · '+E(m.notes):"")+'</small></div>'+
 button(tr("Remove","মুছো"),"prep-remove-mock",m.id,"tiny-btn")+'</div>';
}
function panel(){
 const exams=all();if(!exams.length)return "";
 const exam=current()||exams.find(e=>!e.done)||exams[0];
 if(!exam)return "";selected=exam.id;
 const p=getPrep(exam),m=metrics(exam);
 const pct=x=>x===null?"—":E(I.number(x))+"%";
 const readiness=m.indicator===null?
 tr("Add both checklist topics and a mock score to calculate a preparation indicator.","Preparation Indicator দেখতে Checklist Topic ও Mock Score দুটোই যোগ করো।"):
 tr("Checklist 60% + latest mock 40%; not a prediction of exam results.","Checklist ৬০% + সর্বশেষ Mock ৪০%; এটি পরীক্ষার ফলের পূর্বাভাস নয়।");
 return '<section class="panel exam-prep-center" aria-label="Exam Preparation Center"><div class="panel-header"><div>'+
 '<span class="eyebrow">'+tr("EXAM INTELLIGENCE / PREPARATION","পরীক্ষার প্রস্তুতি")+'</span>'+
 '<h3>'+tr("Preparation center","প্রিপারেশন সেন্টার")+'</h3>'+
 '<small class="panel-sub">'+E(exam.title)+' · '+E(I.displayDate(exam.date))+'</small></div>'+
 '<span class="chip">'+tr("Local study records","লোকাল স্টাডি রেকর্ড")+'</span></div>'+
 '<div class="exam-prep-metrics">'+
 '<div><small>'+tr("Revision completed","Revision সম্পন্ন")+'</small><strong>'+pct(m.topicsPct)+'</strong><span>'+E(I.number(m.completed))+'/'+E(I.number(m.total))+'</span></div>'+
 '<div><small>'+tr("Latest mock score","সর্বশেষ Mock Score")+'</small><strong>'+pct(m.mockPct)+'</strong><span>'+E(I.number(m.attempts))+' '+tr("attempts","টি চেষ্টা")+'</span></div>'+
 '<div><small>'+tr("Preparation indicator","Preparation Indicator")+'</small><strong>'+pct(m.indicator)+'</strong><span>'+E(I.number(m.weak.length))+' '+tr("weak topics","টি দুর্বল Topic")+'</span></div>'+
 '</div><p class="exam-prep-caveat">'+readiness+'</p>'+
 '<div class="exam-prep-columns"><div><h4>'+tr("Revision checklist","রিভিশন চেকলিস্ট")+'</h4>'+
 '<form id="examPrepTopicForm" class="exam-prep-form"><label class="sr-only" for="prep-topic">'+tr("Revision topic","Revision Topic")+'</label>'+
 '<input id="prep-topic" name="title" maxlength="120" required autocomplete="off" placeholder="'+tr("e.g. Database normalization","যেমন: Database Normalization")+'">'+
 '<button type="submit" class="primary-btn">'+tr("Add topic","যোগ করো")+'</button></form>'+
 '<div class="exam-prep-list">'+(p.topics.length?p.topics.map(topicRow).join(""):
 '<div class="empty-state">'+tr("No revision topics yet.","এখনো Revision Topic নেই।")+'</div>')+'</div>'+
 (m.weak.length?'<h4>'+tr("Weak topic analysis","দুর্বল Topic বিশ্লেষণ")+'</h4><p class="exam-prep-caveat">'+
 m.weak.slice(0,6).map(x=>E(x.title)).join(" · ")+(m.weak.length>6?" …":"")+'</p>':"")+'</div>'+
 '<div><h4>'+tr("Mock test tracker","মক টেস্ট ট্র্যাকার")+'</h4>'+
 '<form id="examPrepMockForm" class="exam-prep-mockform">'+
 '<label>'+tr("Score","প্রাপ্ত নম্বর")+'<input type="number" name="score" min="0" max="200" step="1" required></label>'+
 '<label>'+tr("Out of","মোট নম্বর")+'<input type="number" name="total" min="1" max="200" step="1" value="100" required></label>'+
 '<label>'+tr("Test date","পরীক্ষার তারিখ")+'<input type="date" name="date" max="'+N.date(new Date())+'" value="'+N.date(new Date())+'" required></label>'+
 '<label class="exam-prep-note">'+tr("Notes (optional)","নোট (ঐচ্ছিক)")+'<input name="notes" maxlength="140" placeholder="'+tr("Topics to improve","কোন অংশে উন্নতি দরকার")+'"></label>'+
 '<button type="submit" class="primary-btn">'+tr("Record mock test","Mock Result Save করো")+'</button></form>'+
 '<div class="exam-prep-list">'+(p.mocks.length?p.mocks.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(mockRow).join(""):
 '<div class="empty-state">'+tr("No mock results recorded.","এখনো Mock Result নেই।")+'</div>')+'</div></div></div></section>';
}
function handleChange(target){
 if(!target?.dataset?.prepCheck)return false;
 updateTopic("prep-toggle-topic",target.dataset.prepCheck);return true;
}
function init(opts={}){changed=opts.changed||(()=>false);toast=opts.toast||(()=>{});refresh=opts.refresh||(()=>{})}
window.NOVA_EXAM_PREP={init,handle,handleChange,addTopic,addMock,getPrep,metrics,panel,selectExam,getSelected:()=>selected};
})();