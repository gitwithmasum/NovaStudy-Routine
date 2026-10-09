/* Exam planner — NovaStudy 1.3. Data remains in novastudy_state_v1. */
(function(){
"use strict";
const N=window.NOVA,S=N.get,E=N.escape,V=window.NOVA_VIEWS;
const iso=()=>N.date(new Date());
function parseLocal(day,time="00:00"){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day))||!/^\d{2}:\d{2}$/.test(String(time)))return null;
  const [y,m,d]=day.split("-").map(Number),[h,mi]=time.split(":").map(Number);
  const x=new Date(y,m-1,d,h,mi);
  return x.getFullYear()===y&&x.getMonth()===m-1&&x.getDate()===d&&x.getHours()===h&&x.getMinutes()===mi?x:null;
}
function daysBetween(a,b){
  const x=parseLocal(a),y=parseLocal(b);
  if(!x||!y)return 0;
  return Math.round((Date.UTC(y.getFullYear(),y.getMonth(),y.getDate())-Date.UTC(x.getFullYear(),x.getMonth(),x.getDate()))/86400000);
}
function countdown(e){
  if(e.done)return "Completed";
  const when=parseLocal(e.date,e.start);
  if(!when)return "Invalid exam date";
  const remaining=when.getTime()-Date.now();
  if(remaining<=0){
    const end=parseLocal(e.date,e.end);
    return end&&end.getTime()>Date.now()?"In progress":"Finished";
  }
  const days=daysBetween(iso(),e.date);
  if(days===0){
    const mins=Math.ceil(remaining/60000),h=Math.floor(mins/60);
    return h>0?h+"h "+mins%60+"m remaining":mins+"m remaining";
  }
  return days===1?"Tomorrow":days+" days left";
}
function sorted(){
  return [...(S().exams||[])].sort((a,b)=>Number(a.done)-Number(b.done)||(a.date+a.start).localeCompare(b.date+b.start));
}
function next(){
  return sorted().find(e=>!e.done&&parseLocal(e.date,e.end)?.getTime()>=Date.now());
}
function dashboardPreview(){
  const e=next();
  return '<section class="exam-dashboard"><div><span class="eyebrow">EXAM INTELLIGENCE / 06</span><h3>'+
  (e?E(e.title):'Exam calendar ready')+'</h3><p>'+
  (e?E(N.name(e.subjectId))+' · '+E(e.date)+' · '+E(N.hour(e.start)):'Add your first exam to plan revision and watch the countdown.')+
  '</p></div><div class="exam-dashboard-actions"><span class="exam-countdown"'+(e?' data-exam-countdown="'+E(e.id)+'"':'')+'>'+
  (e?E(countdown(e)):'No upcoming exams')+
  '</span><button class="secondary-btn" type="button" data-action="go-exams">Open exams →</button></div></section>';
}
function card(e){
  const linked=S().sessions.filter(s=>s.revisionFor===e.id).length;
  const complete=Boolean(e.done);
  const label=new Date(e.date+'T12:00:00').toLocaleDateString(undefined,{month:'short'});
  return '<article class="exam-card'+(complete?' is-completed':'')+'"><div class="exam-card-main">'+
    '<span class="exam-date-block"><strong>'+E(e.date.slice(8,10))+'</strong><small>'+E(label)+'</small></span>'+
    '<div class="exam-card-info"><b>'+E(e.title)+'</b><span>'+E(N.name(e.subjectId))+' · '+E(N.hour(e.start))+'–'+E(N.hour(e.end))+'</span>'+
    (e.place?'<span>⌖ '+E(e.place)+'</span>':'')+
    (e.notes?'<small class="exam-note">'+E(e.notes)+'</small>':'')+
    '</div></div><div class="exam-card-side"><span class="exam-countdown" data-exam-countdown="'+E(e.id)+'">'+E(countdown(e))+'</span>'+
    '<span class="exam-revision-meta">'+linked+' revision blocks</span><div class="exam-card-actions">'+
    V.button('Edit','edit-exam','tiny-btn',e.id)+
    (complete?'':V.button('Plan revision','plan-revision','secondary-btn',e.id))+
    V.button(complete?'Reopen':'Mark done','toggle-exam','tiny-btn',e.id)+
    V.button('Delete','delete-exam','danger-btn',e.id)+
    '</div></div></article>';
}
function page(){
  const exams=sorted(),nextExam=next();
  return V.heading('EXAM INTELLIGENCE / 06','Exam & revision planner',
    'Exam dates, live countdowns and conflict-aware revision blocks.',V.button('+ Add exam','add-exam'))+
    '<div class="exam-kpis"><div class="exam-kpi"><small>UPCOMING</small><strong>'+exams.filter(e=>!e.done&&parseLocal(e.date,e.end)?.getTime()>=Date.now()).length+
    '</strong></div><div class="exam-kpi"><small>NEXT EXAM</small><strong>'+(nextExam?E(nextExam.date):'None')+
    '</strong></div><div class="exam-kpi"><small>REVISION BLOCKS</small><strong>'+S().sessions.filter(x=>x.revisionFor).length+
    '</strong></div></div><div class="exam-list">'+(exams.length?exams.map(card).join(''):'<div class="empty-state">No exams added yet. Create an exam to start planning revision.</div>')+
    '</div><div class="hint-banner">Countdown uses this device’s local time. Revision planning creates one-time schedule blocks and linked tasks without removing your existing routine.</div>';
}
function refreshCountdowns(){
  document.querySelectorAll('[data-exam-countdown]').forEach(el=>{
    const e=S().exams.find(x=>x.id===el.dataset.examCountdown);
    if(e){const t=countdown(e);if(el.textContent!==t)el.textContent=t;}
  });
}
function conflicts(day,start,end){
  const dt=parseLocal(day);
  return S().sessions.some(s=>N.occursOn(s,dt)&&N.min(s.start)<N.min(end)&&N.min(start)<N.min(s.end));
}
function generateRevision(id,o){
  const e=S().exams.find(x=>x.id===id);
  if(!e)return {added:0,skipped:0,reason:'Exam not found'};
  if(e.done)return {added:0,skipped:0,reason:'Reopen exam before planning'};
  const blocks=Number(o.blocks),length=Number(o.length),start=String(o.start||'17:00');
  if(!Number.isInteger(blocks)||blocks<1||blocks>10||![25,30,45,50,60,75,90].includes(length)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(start))
    return {added:0,skipped:0,reason:'Invalid revision settings'};
  const days=daysBetween(iso(),e.date);
  if(days<=0)return {added:0,skipped:0,reason:'Exam must be on a future date'};
  let added=0,skipped=0;
  for(let i=0;i<blocks;i++){
    const before=Math.min(days,Math.max(1,Math.ceil(days*(blocks-i)/(blocks+1))));
    const dt=parseLocal(e.date);dt.setDate(dt.getDate()-before);
    const day=N.date(dt);
    if(S().sessions.some(s=>s.revisionFor===id&&s.repeat==='once'&&s.date===day)){skipped++;continue;}
    let begin=N.min(start),end=begin+length;
    while(end<=1380&&conflicts(day,N.stamp(begin),N.stamp(end))){begin+=15;end+=15;}
    if(begin<0||end>1380||S().sessions.length>=3000||S().tasks.length>=3000){skipped++;continue;}
    const session={id:N.uid(),day:dt.getDay(),date:day,repeat:'once',start:N.stamp(begin),end:N.stamp(end),
      subjectId:e.subjectId||'',title:('Revision: '+e.title).slice(0,100),place:'Study Desk',type:'Revision',revisionFor:id};
    S().sessions.push(session);
    S().tasks.push({id:N.uid(),title:('Revise '+N.name(e.subjectId)+' for '+e.title).slice(0,250),
      subjectId:e.subjectId||'',due:day,priority:'high',done:false,revisionFor:id,sessionId:session.id});
    added++;
  }
  return {added,skipped,reason:added?'Revision blocks and tasks created.':'No new dates or free slots found.'};
}
window.NOVA_EXAMS={parseLocal,daysBetween,countdown,sorted,next,dashboardPreview,page,refreshCountdowns,generateRevision};
})();