/* NovaStudy v1.7 — student attendance and academic analytics.
   Stored inside the existing version-1 routine backup for recovery compatibility. */
(function(){
"use strict";
const N=window.NOVA,I=window.NOVA_I18N,S=N.get,E=N.escape;
const STATUS=["present","late","absent","excused"];
const CLASS_TYPES=["Class","Lab"];
const t=value=>I.t(value);
let selected=N.date(new Date()),callbacks=null;
const records=()=>S().attendance||[];
const safeDate=value=>N.validDate(value)&&value<=N.date(new Date());
const readableDate=value=>E(I.displayDate(value));
function dayDate(iso){return new Date(iso+"T12:00:00")}
function scheduled(iso){
 if(!N.validDate(iso))return [];
 const day=dayDate(iso);
 return S().sessions.filter(item=>CLASS_TYPES.includes(item.type||"Class")&&N.occursOn(item,day))
 .sort((a,b)=>a.start.localeCompare(b.start));
}
function stats(rows=records()){
 let present=0,late=0,absent=0,excused=0;
 for(const a of rows)if(STATUS.includes(a.status))({present:()=>present++,late:()=>late++,absent:()=>absent++,excused:()=>excused++}[a.status]());
 const counted=present+late+absent;
 return {present,late,absent,excused,marked:present+late+absent+excused,
    counted,rate:counted?Math.round((present+late)/counted*100):null};
}
function week(){
 const result=[];
 for(let i=6;i>=0;i--){
   const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
   const date=N.date(d),roll=stats(records().filter(a=>a.date===date));
   result.push({date,rate:roll.rate,marked:roll.marked});
 }
 return result;
}
function subjectStats(){
 const groups=new Map();
 for(const item of records()){
   let r=groups.get(item.subjectId);
   if(!r){r=[];groups.set(item.subjectId,r)}
   r.push(item);
 }
 return [...groups].map(([id,rows])=>({id,name:N.name(id),...stats(rows)}))
 .sort((a,b)=>b.marked-a.marked||a.name.localeCompare(b.name));
}
function chooseDate(value){if(!safeDate(value))return false;selected=value;return true}
function navigation(delta){
 const d=dayDate(selected);d.setDate(d.getDate()+delta);
 return chooseDate(N.date(d));
}
function findRecord(iso,sessionId,subjectId){
 return records().find(a=>a.date===iso&&(sessionId?a.sessionId===sessionId:a.sessionId===""&&a.subjectId===subjectId));
}
function mutate({date=selected,sessionId="",subjectId="",status}){
 if(!safeDate(date))return {ok:false,error:"Choose a valid date that is not in the future."};
 if(status!=="clear"&&!STATUS.includes(status))return {ok:false,error:"Invalid attendance status."};
 if(sessionId){
   const session=scheduled(date).find(s=>s.id===sessionId);
   if(!session)return {ok:false,error:"This class does not occur on the selected day."};
   subjectId=session.subjectId||"";
 }else if(!S().subjects.some(s=>s.id===subjectId)){
   return {ok:false,error:"Choose a subject first."};
 }
 const current=findRecord(date,sessionId,subjectId);
 if(status==="clear"){
   if(!current)return {ok:true,unchanged:true};
   S().attendance=S().attendance.filter(a=>a.id!==current.id);
 }else if(current){
   current.status=status;
 }else{
   if(records().length>=3000)return {ok:false,error:"Attendance limit reached. Export a backup before adding more records."};
   S().attendance.push({id:N.uid(),date,sessionId,subjectId,status});
 }
 const saved=callbacks?.changed?.()===true;
 return {ok:saved,error:saved?"":"Attendance could not be saved."};
}
function mark(sessionId,status){return mutate({sessionId,status})}
function addManual(subjectId,status){return mutate({sessionId:"",subjectId,status})}
function rateText(value){return value===null?"—":I.number(value)+"%"}
const chip=(status)=>'<span class="attendance-status attendance-'+status+'">'+E(t(status.charAt(0).toUpperCase()+status.slice(1)))+'</span>';
function statusButtons(sessionId,record,subjectLabel){
 return '<div class="attendance-actions" role="group" aria-label="'+E(t("Attendance for")+" "+subjectLabel)+'">'+
 STATUS.map(status=>
 '<button type="button" class="attendance-choice '+(record?.status===status?'is-selected':'')+
 '" data-action="attendance-mark" data-session="'+E(sessionId)+
 '" data-status="'+status+'" aria-pressed="'+(record?.status===status)+'" aria-label="'+E(t(status.charAt(0).toUpperCase()+status.slice(1))+" — "+subjectLabel)+'">'+
 E(t(status.charAt(0).toUpperCase()+status.slice(1)))+'</button>').join("")+
 (record?'<button type="button" class="attendance-clear" data-action="attendance-mark" data-session="'+E(sessionId)+'" data-status="clear" aria-label="'+E(t("Remove attendance")+" — "+subjectLabel)+'">'+E(t("Clear"))+'</button>':"")+'</div>';
}
function dailyRows(){
 const classes=scheduled(selected);
 if(!classes.length)return '<div class="attendance-empty">'+E(t("No classes or labs scheduled for this date. Use manual attendance to add a record."))+'</div>';
 return classes.map(s=>{
   const label=s.title||N.name(s.subjectId),r=findRecord(selected,s.id,s.subjectId||"");
   return '<article class="attendance-class"><div class="attendance-class-title"><b data-i18n-ignore>'+E(label)+'</b>'+
    '<span class="attendance-meta">'+E(I.time(s.start))+' – '+E(I.time(s.end))+' · '+E(t(s.type||"Class"))+'</span>'+
    (r?chip(r.status):'<span class="attendance-unmarked">'+E(t("Not marked"))+'</span>')+
    '</div>'+statusButtons(s.id,r,label)+'</article>';
 }).join("");
}
function report(){
 const overall=stats(),done=S().tasks.filter(task=>task.done).length,tasks=S().tasks.length,
 exams=S().exams||[],examDone=exams.filter(ex=>ex.done).length;
 const focus=window.NOVA_FOCUS?.get?.()||{completed:0,totalMinutes:0};
 const subject=subjectStats(),weeks=week();
 return '<section class="panel attendance-report"><div class="panel-header"><b class="panel-title">'+E(t("Academic performance overview"))+'</b></div>'+
 '<div class="attendance-kpis">'+
 [["Attendance rate",rateText(overall.rate)],["Recorded classes",I.number(overall.marked)],["Tasks completed",I.number(done)+" / "+I.number(tasks)],["Exams completed",I.number(examDone)+" / "+I.number(exams.length)],["Focus minutes",I.number(focus.totalMinutes)]]
 .map(([k,v])=>'<div class="attendance-kpi"><small>'+E(t(k))+'</small><strong>'+E(v)+'</strong></div>').join("")+
 '</div>'+
 '<p class="attendance-hint">'+E(t("Rate counts Present and Late as attended; Excused records are excluded. Unmarked classes are not counted. All figures depend on your recorded data."))+'</p>'+
 '<h3>'+E(t("Subject-wise attendance"))+'</h3>'+
 (subject.length?'<div class="attendance-subjects">'+subject.map(s=>'<div class="attendance-subject-row"><div><b data-i18n-ignore>'+E(s.name)+'</b><small>'+E(I.number(s.marked))+' '+E(t("recorded"))+'</small></div>'+
 '<div class="attendance-meter" role="progressbar" aria-label="'+E(t("Attendance rate")+" — "+s.name)+'" aria-valuemin="0" aria-valuemax="100"'+(s.rate===null?'':' aria-valuenow="'+s.rate+'"')+'><span style="width:'+(s.rate??0)+'%"></span></div>'+
 '<strong>'+E(rateText(s.rate))+'</strong></div>').join("")+'</div>':
 '<div class="attendance-empty">'+E(t("No attendance records yet. Mark your first class to see subject analytics."))+'</div>')+
 '<h3>'+E(t("Attendance trend — last 7 days"))+'</h3>'+
 '<div class="attendance-trend" role="group" aria-label="'+E(t("Attendance trend — last 7 days"))+'">'+weeks.map(day=>{
   const name=dayDate(day.date).toLocaleDateString(I.language==="bn"?"bn-BD":"en-US",{weekday:"short"});
   return '<div class="attendance-trend-day"><strong>'+E(rateText(day.rate))+'</strong><div class="attendance-trend-bar"><span style="height:'+(day.rate??0)+'%"></span></div><small>'+E(name)+'</small></div>';
 }).join("")+'</div>'+
 '</section>';
}
function page(){
 const today=N.date(new Date()),overall=stats(),when=readableDate(selected);
 return '<div class="page-head"><div><span class="eyebrow">'+E(t("ACADEMIC INSIGHTS / 08"))+'</span><h1 class="view-title">'+E(t("Attendance & Academic Analytics"))+'</h1>'+
 '<p class="subheading">'+E(t("Record your classes and understand your progress across subjects, tasks and exams."))+'</p></div></div>'+
 '<section class="panel attendance-panel"><div class="panel-header"><b class="panel-title">'+E(t("Class attendance"))+'</b>'+
 '<span class="chip">'+E(I.number(overall.marked))+' '+E(t("records"))+'</span></div>'+
 '<div class="attendance-date"><button type="button" class="tiny-btn" data-action="attendance-prev" aria-label="'+E(t("Previous day"))+'">←</button>'+
 '<label for="attendanceDate">'+E(t("Attendance date"))+'</label>'+
 '<input type="date" id="attendanceDate" value="'+E(selected)+'" max="'+E(today)+'" />'+
 '<button type="button" class="tiny-btn" data-action="attendance-next" '+(selected===today?'disabled':'')+' aria-label="'+E(t("Next day"))+'">→</button>'+
 '<span>'+when+'</span></div>'+
 '<div class="attendance-list">'+dailyRows()+'</div>'+
 '<div class="attendance-manual"><h3>'+E(t("Add attendance manually"))+'</h3>'+
 '<p>'+E(t("Use this for a class not in your timetable. One manual record per subject and date."))+'</p>'+
 '<div class="attendance-manual-fields"><label for="attendanceSubject">'+E(t("Subject"))+'</label>'+
 '<select id="attendanceSubject">'+S().subjects.map(s=>'<option value="'+E(s.id)+'" data-i18n-ignore>'+E(s.name)+'</option>').join("")+'</select>'+
 '<label for="attendanceStatus">'+E(t("Status"))+'</label>'+
 '<select id="attendanceStatus">'+STATUS.map(status=>'<option value="'+status+'">'+E(t(status.charAt(0).toUpperCase()+status.slice(1)))+'</option>').join("")+'</select>'+
 '<button type="button" class="primary-btn" data-action="attendance-add" '+(S().subjects.length?'':'disabled')+'>'+E(t("Save attendance"))+'</button></div>'+
 '</div><div class="attendance-record-list"><h3>'+E(t("Recorded on selected date"))+'</h3>'+
 (records().filter(a=>a.date===selected).length?
 records().filter(a=>a.date===selected).map(a=>'<div class="attendance-record"><span data-i18n-ignore>'+E(N.name(a.subjectId))+'</span>'+
 chip(a.status)+'<button class="tiny-btn" type="button" data-action="attendance-delete" data-id="'+E(a.id)+'">'+E(t("Remove"))+'</button></div>').join(""):
 '<small>'+E(t("Nothing marked on this date."))+'</small>')+'</div></section>'+report()+
 '<div class="hint-banner">'+E(t("Attendance entries are included in the JSON routine backup. The focus timer remains separate, and Vercel/Netlify data do not sync automatically."))+'</div>';
}
function remove(id){
 const item=records().find(a=>a.id===id);if(!item)return false;
 S().attendance=S().attendance.filter(a=>a.id!==id);
 return callbacks?.changed?.()===true;
}
function init(options){callbacks=options;}
function handle(action,b){
 if(!action?.startsWith("attendance-"))return false;
 if(action==="attendance-prev"){navigation(-1);callbacks?.refresh?.();return true;}
 if(action==="attendance-next"){navigation(1);callbacks?.refresh?.();return true;}
 if(action==="attendance-mark"){
   const result=mark(b.dataset.session,b.dataset.status);
   if(!result.ok)callbacks?.toast?.(result.error);
   return true;
 }
 if(action==="attendance-add"){
   const result=addManual(document.getElementById("attendanceSubject")?.value||"",document.getElementById("attendanceStatus")?.value||"");
   if(!result.ok)callbacks?.toast?.(result.error);
   else callbacks?.toast?.("Attendance saved.");
   return true;
 }
 if(action==="attendance-delete"){
   if(!window.confirm(t("Remove this attendance record?")))return true;
   if(!remove(b.dataset.id))callbacks?.toast?.("Attendance could not be removed.");
   return true;
 }
 return false;
}
function dateChanged(value){
 if(!chooseDate(value)){callbacks?.toast?.("Choose a valid date that is not in the future.");callbacks?.refresh?.();return false;}
 callbacks?.refresh?.();return true;
}
window.NOVA_ATTENDANCE={page,init,handle,dateChanged,chooseDate,navigation,scheduled,stats,subjectStats,week,mark,addManual,remove,mutate,get selected(){return selected}};
})();
