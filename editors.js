window.NOVA_EDIT=(function Editors(A){
const N=window.NOVA,V=window.NOVA_VIEWS,I=window.NOVA_I18N,S=N.get,E=N.escape;
const confirm=message=>window.confirm(I.t(message));
const f=(label,name,type="text",value="",extra="")=>`<div class="field"><label for="edit-${name}">${E(label)}</label><input id="edit-${name}" name="${name}" type="${type}" value="${E(value)}" ${extra}></div>`;
const sel=(label,name,arr,value)=>`<div class="field"><label for="edit-${name}">${E(label)}</label><select id="edit-${name}" name="${name}">${V.option(arr,value)}</select></div>`;
let submit=null;
function close(){N.$("modal").close();submit=null}
function open(title,fields,cb,remove){submit=cb;N.$("modalBody").innerHTML=`<div class="modal-header"><h2 id="editorTitle">${E(title)}</h2><button type="button" data-action="close" class="modal-close">×</button></div><div class="modal-content"><form id="editorForm">${fields}<div class="modal-actions">${remove?'<button type="button" id="removeItem" class="danger-btn">Delete</button>':""}<button type="button" data-action="close" class="secondary-btn">Cancel</button><button type="submit" class="primary-btn">Save</button></div></form></div>`;N.$("modal").setAttribute("aria-labelledby","editorTitle");N.$("modal").showModal();I.apply(N.$("modal"));if(remove)N.$("removeItem").onclick=remove;}
function save(form){if(submit&&submit(new FormData(form))!==false)close()}
function subject(id){const old=S().subjects.find(x=>x.id===id),fields=f("Subject / course name","name","text",old?.name||"",'maxlength="120" required')+sel("Color","color",N.colors.map((x,i)=>[x,"Color "+(i+1)]),old?.color||N.colors[S().subjects.length%N.colors.length]);open(old?"Edit subject":"Add subject",fields,data=>{const name=String(data.get("name")||"").trim().slice(0,120);if(!name)return A.toast("Enter a subject."),false;if(S().subjects.some(x=>x.id!==id&&x.name.toLowerCase()===name.toLowerCase()))return A.toast("Duplicate subject."),false;const color=N.colors.includes(data.get("color"))?data.get("color"):N.colors[0];if(old)Object.assign(old,{name,color});else S().subjects.push({id:N.uid(),name,color});return A.changed();},old?()=>{if(!confirm("Delete subject? Current routine entries will remain unassigned."))return;S().subjects=S().subjects.filter(x=>x.id!==id);if(A.changed())close()}:null)}
function session(id){const old=S().sessions.find(x=>x.id===id),v=old||{subjectId:S().subjects[0]?.id||"",day:A.day(),type:"Class",start:"09:00",end:"10:00",title:"",place:""};const fields=sel("Subject","subjectId",[["","Personal / None"],...S().subjects.map(x=>[x.id,x.name])],v.subjectId)+f("Custom activity title","title","text",v.title||"",'maxlength="100"')+'<div class="repeat-helper">Weekly classes repeat each week. One-time sessions need an exact date. Existing sessions remain unchanged.</div>'+sel("Repeat","repeat",[["weekly","Every week"],["once","One time"]],v.repeat||"weekly")+f("One-time date","date","date",v.date||N.date(new Date()))+f("Repeat until (optional)","repeatUntil","date",v.repeatUntil||"")+'<div class="form-grid">'+sel("Day","day",N.DAYS.map((x,i)=>[i,x]),v.day)+sel("Type","type",["Class","Study","Lab","Revision","Exam","Break","Sleep","Meal","Exercise","Prayer","Commute","Personal","Other"],v.type)+f("Start","start","time",v.start,"required")+f("End","end","time",v.end,"required")+"</div>"+f("Room / note","place","text",v.place||"",'maxlength="100"');
open(old?"Edit session":"Add session",fields,data=>{const requestedDay=Number(data.get("day")),start=String(data.get("start")),end=String(data.get("end"));if(!Number.isInteger(requestedDay)||requestedDay<0||requestedDay>6||!start||!end||N.min(end)<=N.min(start))return A.toast("End must be after start."),false;
const repeat=String(data.get("repeat"))==="once"?"once":"weekly",date=String(data.get("date")||""),repeatUntil=String(data.get("repeatUntil")||"");
if(repeat==="once"&&!N.validDate(date))return A.toast("Select a valid one-time date."),false;
if(repeat==="weekly"&&repeatUntil&&!N.validDate(repeatUntil))return A.toast("Invalid repeat end date."),false;
const day=repeat==="once"?new Date(date+"T12:00:00").getDay():requestedDay;
const overlap=S().sessions.some(x=>x.id!==id&&N.min(start)<N.min(x.end)&&N.min(end)>N.min(x.start)&&(
 repeat==="once"?N.occursOn(x,new Date(date+"T12:00:00")):
 (x.repeat!=="once"?x.day===day:N.occursOn({day,repeat:"weekly",repeatUntil},new Date(x.date+"T12:00:00")))
));if(overlap&&!confirm("Overlaps another session. Save anyway?"))return false;
const rec={id:old?.id||N.uid(),day,start,end,repeat,date:repeat==="once"?date:"",repeatUntil:repeat==="weekly"?repeatUntil:"",subjectId:String(data.get("subjectId")||""),type:String(data.get("type")||"Class"),title:String(data.get("title")||"").trim().slice(0,100),place:String(data.get("place")||"").trim().slice(0,100)};if(old)Object.assign(old,rec);else S().sessions.push(rec);A.setDay(day);return A.changed();},old?()=>{if(!confirm("Delete this session?"))return;S().sessions=S().sessions.filter(x=>x.id!==id);if(A.changed())close()}:null)}
function task(id){const old=S().tasks.find(x=>x.id===id),v=old||{title:"",subjectId:"",due:N.date(new Date()),priority:"medium"};const fields=f("Task / goal","title","text",v.title,'maxlength="250" required')+sel("Subject","subjectId",[["","Personal / General"],...S().subjects.map(x=>[x.id,x.name])],v.subjectId)+'<div class="form-grid">'+f("Due date","due","date",v.due||"")+sel("Priority","priority",["low","medium","high"],v.priority)+"</div>";
open(old?"Edit task":"New task",fields,data=>{const title=String(data.get("title")||"").trim().slice(0,250);if(!title)return A.toast("Enter a task title."),false;const rec={id:old?.id||N.uid(),title,subjectId:String(data.get("subjectId")||""),due:String(data.get("due")||""),priority:String(data.get("priority")||"medium"),done:old?.done||false};if(old)Object.assign(old,rec);else S().tasks.push(rec);return A.changed();},old?()=>{if(!confirm("Delete task?"))return;S().tasks=S().tasks.filter(x=>x.id!==id);if(A.changed())close()}:null)}
function planner(){const fields='<div class="hint-banner">Generates study blocks without deleting existing events.</div><div class="form-grid">'+sel("Days","days",[1,2,3,4,5,6,7],5)+sel("Blocks / day","blocks",[1,2,3,4,5,6],2)+f("Start time","start","time","16:00","required")+sel("Minutes / block","length",[25,30,40,45,50,60,75,90],50)+sel("Break minutes","breakTime",[0,5,10,15,20,30],10)+"</div>";open("Auto study planner",fields,data=>{const r=N.addStudy({days:Number(data.get("days")),blocks:Number(data.get("blocks")),start:String(data.get("start")),length:Number(data.get("length")),breakTime:Number(data.get("breakTime"))});if(!A.changed())return false;A.toast(r.added+" blocks created; "+r.skipped+" skipped.");return true;})}
function install(){if(A.installPrompt()){A.installPrompt().prompt();A.installPrompt().userChoice.then(()=>A.clearInstallPrompt());return}open("Install NovaStudy",'<div class="hint-banner"><b>Android:</b> Chrome ⋮ → Install app.<br><br><b>iOS:</b> Safari Share → Add to Home Screen.<br><br><b>Desktop:</b> Chrome/Edge install icon.<br><br>Requires HTTPS or localhost.</div>',()=>true)}

function exam(id){
 const X=window.NOVA_EXAMS,old=S().exams.find(e=>e.id===id);
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const v=old||{title:"",subjectId:S().subjects[0]?.id||"",date:N.date(tomorrow),start:"09:00",end:"10:00",place:"",notes:"",done:false};
 const fields=f("Exam title","title","text",v.title,'maxlength="120" required')+
 sel("Subject","subjectId",[["","General / Personal"],...S().subjects.map(x=>[x.id,x.name])],v.subjectId)+
 '<div class="form-grid">'+f("Exam date","date","date",v.date,"required")+f("Start","start","time",v.start,"required")+
 f("End","end","time",v.end,"required")+f("Room / venue","place","text",v.place,'maxlength="120"')+'</div>'+
 f("Notes / syllabus","notes","text",v.notes,'maxlength="250"');
 open(old?"Edit exam":"Add exam",fields,data=>{
   const title=String(data.get("title")||"").trim().slice(0,120),date=String(data.get("date")),start=String(data.get("start")),end=String(data.get("end"));
   if(!title||!N.validDate(date)||!X.parseLocal(date,start)||!X.parseLocal(date,end)||N.min(end)<=N.min(start)){
     A.toast("Check exam date and start/end time.");return false;
   }
   if(!old&&S().exams.length>=500){A.toast("Exam limit reached");return false}
   const rec={id:old?.id||N.uid(),title,date,start,end,
     subjectId:String(data.get("subjectId")||""),place:String(data.get("place")||"").trim().slice(0,120),
     notes:String(data.get("notes")||"").trim().slice(0,250),done:old?.done||false};
   if(old)Object.assign(old,rec);else S().exams.push(rec);
   if(!A.changed())return false;A.toast("Exam saved.");return true;
 });
}
function revision(id){
 const ex=S().exams.find(e=>e.id===id);
 if(!ex){A.toast("Exam not found");return}
 const fields='<div class="hint-banner">Creates date-specific revision sessions and tasks BEFORE the exam. Weekly classes remain unchanged; occupied times are skipped or shifted.</div>'+
 '<div class="form-grid">'+sel("Revision sessions","blocks",[2,3,4,5,6,7,10],5)+
 sel("Minutes per session","length",[25,30,45,50,60,75,90],60)+
 f("Preferred start","start","time","17:00","required")+'</div>';
 open(I.t("Revision plan")+" — "+ex.title,fields,data=>{
   const result=window.NOVA_EXAMS.generateRevision(id,{
     blocks:Number(data.get("blocks")),length:Number(data.get("length")),start:String(data.get("start"))
   });
   if(result.added&&!A.changed())return false;
   A.toast(result.added+" scheduled, "+result.skipped+" skipped. "+result.reason);
   return true;
 });
}
return{subject,session,task,planner,install,close,save,exam,revision}
});