(function core(){
"use strict";
const C=window.NOVA_CATALOG,colors=window.NOVA_COLORS,KEY="novastudy_state_v1";
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const $=id=>document.getElementById(id);
const escape=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>crypto?.randomUUID?.()||Date.now()+"-"+Math.random().toString(36).slice(2);
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
const min=t=>{const x=String(t).split(":").map(Number);return x[0]*60+x[1]};
const stamp=n=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
const hour=t=>{const [h,m]=String(t).split(":").map(Number);return (h%12||12)+":"+String(m).padStart(2,"0")+(h>=12?" PM":" AM")};
const profile={name:"Student",institution:"",category:"university",level:"Undergraduate — Year 1",track:"CSE / Software Engineering",weekStart:6,reminders:false};
function initial(){return {version:1,profile:{...profile},subjects:C.university.tracks["CSE / Software Engineering"].slice(0,7).map((name,i)=>({id:uid(),name,color:colors[i%colors.length]})),sessions:[],tasks:[],exams:[],attendance:[],challenge:{startDate:"",items:[]},demo:false}}
function validDate(x){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(x)))return false;
 const [y,m,d]=x.split("-").map(Number),v=new Date(y,m-1,d);
 return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d;
}
function validExam(x){
 return Boolean(x&&typeof x.id==="string"&&x.id.length>0&&typeof x.title==="string"&&x.title.length<=120
 &&typeof x.subjectId==="string"&&validDate(x.date)
 &&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.start)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x.end)&&min(x.end)>min(x.start)
 &&(!x.place||typeof x.place==="string"&&x.place.length<=120)
 &&(!x.notes||typeof x.notes==="string"&&x.notes.length<=250)
 &&(x.done===undefined||typeof x.done==="boolean"));
}
function normalize(s){if(!Array.isArray(s.exams))s.exams=[];if(!Array.isArray(s.attendance))s.attendance=[];if(!Object.prototype.hasOwnProperty.call(s,"challenge"))s.challenge={startDate:"",items:[]};return s}
function occursOn(session,when){
 if(!(when instanceof Date)||Number.isNaN(when.getTime()))return false;
 if(session.repeat==="once")return Boolean(session.date)&&date(when)===session.date;
 return session.day===when.getDay()&&(!session.repeatUntil||date(when)<=session.repeatUntil);
}
const validTime=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x));
const idOk=x=>typeof x==="string"&&x.length>0&&x.length<=128;
function uniqueIds(list){return new Set(list.map(x=>x.id)).size===list.length}
function valid(s){
 if(!s||s.version!==1||!s.profile||!Object.prototype.hasOwnProperty.call(C,s.profile.category))return false;
 const p=s.profile;
 if(typeof p.name!=="string"||p.name.length>80||typeof p.level!=="string"||typeof p.track!=="string"
   ||!Array.isArray(s.subjects)||!Array.isArray(s.sessions)||!Array.isArray(s.tasks))return false;
 if(s.subjects.length>300||s.sessions.length>3000||s.tasks.length>3000)return false;
 if(!s.subjects.every(x=>x&&idOk(x.id)&&typeof x.name==="string"&&x.name.length<=120
   &&(x.color===undefined||typeof x.color==="string"))||!uniqueIds(s.subjects))return false;
 if(!s.sessions.every(x=>x&&idOk(x.id)&&Number.isInteger(x.day)&&x.day>=0&&x.day<=6
   &&validTime(x.start)&&validTime(x.end)&&min(x.end)>min(x.start)
   &&typeof x.subjectId==="string"&&x.subjectId.length<=128
   &&(x.repeat===undefined||x.repeat==="weekly"||x.repeat==="once")
   &&(x.repeat!=="once"||(validDate(x.date)&&new Date(x.date+"T12:00:00").getDay()===x.day))
   &&(!x.repeatUntil||(x.repeat!=="once"&&validDate(x.repeatUntil)))
   &&(x.title===undefined||typeof x.title==="string"&&x.title.length<=100)
   &&(x.place===undefined||typeof x.place==="string"&&x.place.length<=120)
   &&(x.revisionFor===undefined||typeof x.revisionFor==="string"))||!uniqueIds(s.sessions))return false;
 if(!s.tasks.every(x=>x&&idOk(x.id)&&typeof x.title==="string"&&x.title.length<=250
   &&(x.subjectId===undefined||typeof x.subjectId==="string")
   &&(!x.due||validDate(x.due))
   &&(x.priority===undefined||["low","medium","high"].includes(x.priority))
   &&(x.done===undefined||typeof x.done==="boolean")
   &&(x.revisionFor===undefined||typeof x.revisionFor==="string"))||!uniqueIds(s.tasks))return false;
 if("exams" in s&&(!Array.isArray(s.exams)||s.exams.length>500
   ||!s.exams.every(validExam)||!uniqueIds(s.exams)))return false;
 if("attendance" in s){
   if(!Array.isArray(s.attendance)||s.attendance.length>3000)return false;
   const keys=new Set();
   for(const a of s.attendance){
     if(!a||!idOk(a.id)||!validDate(a.date)
       ||typeof a.subjectId!=="string"||a.subjectId.length>128
       ||typeof a.sessionId!=="string"||a.sessionId.length>128
       ||!["present","late","absent","excused"].includes(a.status)
       ||(a.note!==undefined&&(typeof a.note!=="string"||a.note.length>140)))return false;
     const key=a.date+"\0"+(a.sessionId?"s:"+a.sessionId:"m:"+a.subjectId);
     if(keys.has(key))return false;
     keys.add(key);
   }
   if(!uniqueIds(s.attendance))return false;
 }
 if("challenge" in s){
   const c=s.challenge;
   if(!c||typeof c!=="object"||typeof c.startDate!=="string"||(c.startDate!==""&&!validDate(c.startDate))
      ||!Array.isArray(c.items)||c.items.length>100)return false;
   const seen=new Set();
   for(const item of c.items){
     if(!item||!Number.isInteger(item.topicId)||item.topicId<1||item.topicId>100
        ||!["not_started","learning","practiced","completed"].includes(item.status)
        ||seen.has(item.topicId))return false;
     seen.add(item.topicId);
   }
 }
 return true;
}
let state,persistedRaw=null,snapshot="",issue="",writeLocked=false,unreadableRaw=null;
try{
 persistedRaw=localStorage.getItem(KEY);
 if(persistedRaw!==null){
   const decoded=JSON.parse(persistedRaw);
   if(valid(decoded))state=normalize(decoded);
   else throw Error("Invalid stored state");
 }
}catch{
 issue="Stored data could not be read safely. Your original data was not overwritten. Import a valid JSON backup in Settings to recover.";
 writeLocked=true;unreadableRaw=persistedRaw;
}
if(!state)state=initial();
snapshot=JSON.stringify(state);
function rollback(){state=JSON.parse(snapshot)}
function save(){
 if(writeLocked){rollback();return false}
 try{
   if(!valid(state)){issue="Save prevented: invalid routine or exam data. The last saved copy was restored.";rollback();return false}
   const current=localStorage.getItem(KEY);
   if(current!==persistedRaw){
     if(!acceptExternal(current))rollback();
     issue="Another tab or browser storage changed your routine. The stale edit was not saved; review the latest data and retry.";
     return false;
   }
   const next=JSON.stringify(state);
   localStorage.setItem(KEY,next);
   persistedRaw=next;snapshot=next;issue="";
   return true;
 }catch{
   rollback();issue="Could not save to this device. Check browser storage and export a backup before making further changes.";
   return false;
 }
}
function setState(value){
 if(!valid(value)){issue="Backup rejected. The current data is unchanged.";return false}
 try{
   const candidate=JSON.stringify(normalize(JSON.parse(JSON.stringify(value))));
   localStorage.setItem(KEY,candidate);
   state=JSON.parse(candidate);snapshot=candidate;persistedRaw=candidate;
   writeLocked=false;unreadableRaw=null;issue="";
   return true;
 }catch{
   issue="Backup restore failed because device storage is unavailable. Your existing data was not replaced.";
   return false;
 }
}
function acceptExternal(raw){
 if(raw===null)return false;
 try{
   const parsed=JSON.parse(raw);
   if(!valid(parsed))return false;
   state=normalize(parsed);snapshot=JSON.stringify(state);persistedRaw=raw;
   writeLocked=false;unreadableRaw=null;issue="";
   return true;
 }catch{return false}
}
const get=()=>state;
const getIssue=()=>issue;
const rawRecovery=()=>unreadableRaw;
const name=id=>state.subjects.find(s=>s.id===id)?.name||"Personal";
const color=id=>{const x=state.subjects.find(s=>s.id===id)?.color;return colors.includes(x)?x:colors[0]};
const subjectPreset=()=>C[state.profile.category]?.tracks[state.profile.track]||[];
function addSuggestions(){let count=0;for(const n of subjectPreset()){if(state.subjects.length>=300)break;if(!state.subjects.some(s=>s.name.toLowerCase()===n.toLowerCase())){state.subjects.push({id:uid(),name:n,color:colors[state.subjects.length%colors.length]});count++}}return count}
function addStudy({days=5,blocks=2,start="16:00",length=50,breakTime=10}={}){let added=0,skipped=0;for(let i=0;i<days;i++){const target=new Date();target.setDate(target.getDate()+i);const day=target.getDay();let cursor=min(start);for(let j=0;j<blocks;j++){let attempts=0;while(attempts++<60){if(cursor+length>1439)break;const conflict=state.sessions.find(s=>occursOn(s,target)&&cursor<min(s.end)&&cursor+length>min(s.start));if(!conflict)break;cursor=min(conflict.end)+breakTime}if(cursor+length>1439||!state.subjects.length){skipped++;break}state.sessions.push({id:uid(),day,start:stamp(cursor),end:stamp(cursor+length),subjectId:state.subjects[(i*blocks+j)%state.subjects.length].id,title:"",place:"Auto study block",type:"Study"});added++;cursor+=length+breakTime}}return{added,skipped}}
window.NOVA={KEY,C,colors,DAYS,$,escape,uid,date,min,stamp,hour,valid,save,setState,acceptExternal,get,getIssue,rawRecovery,name,color,subjectPreset,addSuggestions,addStudy,validDate,occursOn};
})();