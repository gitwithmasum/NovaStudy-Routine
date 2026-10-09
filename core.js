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
function initial(){return {version:1,profile:{...profile},subjects:C.university.tracks["CSE / Software Engineering"].slice(0,7).map((name,i)=>({id:uid(),name,color:colors[i%colors.length]})),sessions:[],tasks:[],exams:[],demo:false}}
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
function normalize(s){if(!Array.isArray(s.exams))s.exams=[];return s}
function occursOn(session,when){
 if(!(when instanceof Date)||Number.isNaN(when.getTime()))return false;
 if(session.repeat==="once")return Boolean(session.date)&&date(when)===session.date;
 return session.day===when.getDay()&&(!session.repeatUntil||date(when)<=session.repeatUntil);
}
function valid(s){return Boolean(s&&s.version===1&&s.profile&&C[s.profile.category]&&Array.isArray(s.subjects)&&Array.isArray(s.sessions)&&Array.isArray(s.tasks)&&s.subjects.length<=300&&s.sessions.length<=3000&&s.tasks.length<=3000&&s.subjects.every(x=>typeof x.name==="string"&&typeof x.id==="string"&&x.name.length<=120)&&s.sessions.every(x=>typeof x.id==="string"&&Number.isInteger(x.day)&&x.day>=0&&x.day<=6&&/^\d\d:\d\d$/.test(x.start)&&/^\d\d:\d\d$/.test(x.end)&&typeof x.subjectId==="string")&&s.tasks.every(x=>typeof x.id==="string"&&typeof x.title==="string"&&x.title.length<=250)&&(!("exams" in s)||(Array.isArray(s.exams)&&s.exams.length<=500&&s.exams.every(validExam))))}
let state;try{const v=JSON.parse(localStorage.getItem(KEY));state=valid(v)?normalize(v):initial()}catch{state=initial()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{return false}}
function setState(x){if(!valid(x))return false;state=normalize(x);return save()}
const get=()=>state;
const name=id=>state.subjects.find(s=>s.id===id)?.name||"Personal";
const color=id=>{const x=state.subjects.find(s=>s.id===id)?.color;return colors.includes(x)?x:colors[0]};
const subjectPreset=()=>C[state.profile.category]?.tracks[state.profile.track]||[];
function addSuggestions(){let count=0;for(const n of subjectPreset()){if(state.subjects.length>=300)break;if(!state.subjects.some(s=>s.name.toLowerCase()===n.toLowerCase())){state.subjects.push({id:uid(),name:n,color:colors[state.subjects.length%colors.length]});count++}}save();return count}
function addStudy({days=5,blocks=2,start="16:00",length=50,breakTime=10}={}){let added=0,skipped=0;for(let i=0;i<days;i++){const target=new Date();target.setDate(target.getDate()+i);const day=target.getDay();let cursor=min(start);for(let j=0;j<blocks;j++){let attempts=0;while(attempts++<60){if(cursor+length>1439)break;const conflict=state.sessions.find(s=>occursOn(s,target)&&cursor<min(s.end)&&cursor+length>min(s.start));if(!conflict)break;cursor=min(conflict.end)+breakTime}if(cursor+length>1439||!state.subjects.length){skipped++;break}state.sessions.push({id:uid(),day,start:stamp(cursor),end:stamp(cursor+length),subjectId:state.subjects[(i*blocks+j)%state.subjects.length].id,title:"",place:"Auto study block",type:"Study"});added++;cursor+=length+breakTime}}save();return{added,skipped}}
window.NOVA={C,colors,DAYS,$,escape,uid,date,min,stamp,hour,valid,save,setState,get,name,color,subjectPreset,addSuggestions,addStudy,validDate,occursOn};
})();