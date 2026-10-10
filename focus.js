/* NovaStudy v1.6 — locally saved focus timer, Pomodoro, and 10-second audio cue. */
(function(){
"use strict";
const KEY="novastudy_focus_v1",DEFAULTS={focus:25,short:5,long:15},MODES=Object.keys(DEFAULTS);
const N=window.NOVA,I=window.NOVA_I18N;
const t=s=>I.t(s),esc=s=>N.escape(s);
const fresh=()=>({version:1,mode:"focus",durationSec:1500,remainingSec:1500,
 running:false,deadline:null,sound:true,completed:0,totalMinutes:0,days:{},finishedAt:null});
const valid=s=>Boolean(s&&s.version===1&&MODES.includes(s.mode)
 &&Number.isInteger(s.durationSec)&&s.durationSec>=60&&s.durationSec<=10800
 &&Number.isInteger(s.remainingSec)&&s.remainingSec>=0&&s.remainingSec<=s.durationSec
 &&typeof s.running==="boolean"&&(s.deadline===null||Number.isFinite(s.deadline)&&s.deadline>0)
 &&(!s.running||s.deadline!==null)&&typeof s.sound==="boolean"
 &&Number.isInteger(s.completed)&&s.completed>=0&&s.completed<=1000000
 &&Number.isInteger(s.totalMinutes)&&s.totalMinutes>=0&&s.totalMinutes<=20000000
 &&s.days&&typeof s.days==="object"&&!Array.isArray(s.days)
 &&Object.keys(s.days).length<=400
 &&Object.entries(s.days).every(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=1000000)
 &&(s.finishedAt===null||Number.isFinite(s.finishedAt)));
let state=fresh(),raw=null,locked=false,error="",alarmCtx=null,alarmNotes=[],callbacks=null;
try{
 raw=localStorage.getItem(KEY);
 if(raw!==null){const decoded=JSON.parse(raw);if(!valid(decoded))throw Error("invalid timer state");state=decoded;}
}catch{
 locked=true;error="Focus storage could not be read safely. Your previous timer data has not been overwritten.";
}
function status(){return error}
function copy(s){return JSON.parse(JSON.stringify(s))}
function adopt(value){
 if(value===null)return false;
 try{const decoded=JSON.parse(value);if(!valid(decoded))return false;
   state=decoded;raw=value;locked=false;error="";return true;
 }catch{return false;}
}
function persist(next,replace=false){
 if(!valid(next)){error="Invalid timer settings. Previous timer data was kept.";return false;}
 if(locked&&!replace){error="Timer storage is protected. Reset focus data to recover.";return false;}
 try{
   const latest=localStorage.getItem(KEY);
   if(!replace&&latest!==raw){
     adopt(latest);error="Focus timer changed in another tab. The latest saved timer was loaded.";
     return false;
   }
   const encoded=JSON.stringify(next);localStorage.setItem(KEY,encoded);
   state=next;raw=encoded;locked=false;error="";return true;
 }catch{error="Focus timer could not be saved. Check available browser storage.";return false;}
}
function get(){return copy(state)}
function remaining(now=Date.now()){
 return state.running?Math.max(0,Math.ceil((state.deadline-now)/1000)):state.remainingSec;
}
function dateKey(now){return N.date(new Date(now));}
function finish(now=Date.now(),silent=false){
 if(!state.running||remaining(now)>0)return false;
 const next=copy(state),wasFocus=next.mode==="focus",mins=next.durationSec/60;
 next.running=false;next.remainingSec=0;next.deadline=null;next.finishedAt=now;
 if(wasFocus){next.completed+=1;next.totalMinutes+=mins;const day=dateKey(now);
   next.days[day]=(next.days[day]||0)+mins;
   const keys=Object.keys(next.days).sort();for(const key of keys.slice(0,Math.max(0,keys.length-365)))delete next.days[key];
 }
 if(!persist(next))return false;
 if(!silent){
   if(next.sound&&typeof document!=="undefined"&&!document.hidden&&now-stateDeadlineLast<=10000)ring();
   if(callbacks?.onComplete)callbacks.onComplete(next.mode);
 }
 return true;
}
let stateDeadlineLast=0;
function tick(now=Date.now(),silent=false){
 if(state.running&&remaining(now)===0){
   stateDeadlineLast=state.deadline;finish(now,silent);
 }
 renderClock(now);
}
function unlockAudio(){
 if(!state.sound)return;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
   if(!alarmCtx)alarmCtx=new Audio();
   if(alarmCtx.state==="suspended")alarmCtx.resume().catch(()=>{});
 }catch{}
}
function stopAlarm(){
 for(const osc of alarmNotes){try{osc.stop()}catch{}}
 alarmNotes=[];
}
function ring(){
 stopAlarm();
 if(!alarmCtx||alarmCtx.state!=="running")return;
 const startAt=alarmCtx.currentTime+.04;
 // 12 short chime pulses, each oscillator stops well before the 10-second limit.
 for(let n=0;n<12;n++){
   try{
     const when=startAt+n*.78,osc=alarmCtx.createOscillator(),gain=alarmCtx.createGain();
     osc.type="sine";osc.frequency.value=n%3===2?660:880;
     gain.gain.setValueAtTime(0.0001,when);
     gain.gain.exponentialRampToValueAtTime(.11,when+.025);
     gain.gain.exponentialRampToValueAtTime(.0001,when+.34);
     osc.connect(gain);gain.connect(alarmCtx.destination);osc.start(when);osc.stop(when+.35);alarmNotes.push(osc);
   }catch{break}
 }
}
function start(now=Date.now()){
 tick(now,true);
 if(state.running)return true;
 const next=copy(state);
 if(next.remainingSec<=0)next.remainingSec=next.durationSec;
 next.running=true;next.deadline=now+next.remainingSec*1000;next.finishedAt=null;
 const ok=persist(next);
 if(ok)unlockAudio();
 return ok;
}
function pause(now=Date.now()){
 if(!state.running)return true;
 if(remaining(now)===0){tick(now);return true;}
 const next=copy(state);next.remainingSec=remaining(now);next.running=false;next.deadline=null;
 return persist(next);
}
function reset(){
 stopAlarm();const next=copy(state);
 next.running=false;next.deadline=null;next.remainingSec=next.durationSec;next.finishedAt=null;
 return persist(next);
}
function mode(nextMode){
 if(!MODES.includes(nextMode))return false;
 stopAlarm();const next=copy(state);
 next.mode=nextMode;next.durationSec=DEFAULTS[nextMode]*60;next.remainingSec=next.durationSec;
 next.running=false;next.deadline=null;next.finishedAt=null;return persist(next);
}
function duration(minutes){
 const number=Number(minutes);
 if(!Number.isInteger(number)||number<1||number>180){error="Select 1–180 minutes.";return false;}
 const next=copy(state);
 if(next.running){error="Pause or reset before changing the duration.";return false;}
 next.durationSec=number*60;next.remainingSec=next.durationSec;next.finishedAt=null;return persist(next);
}
function toggleSound(){
 const next=copy(state);next.sound=!next.sound;
 if(!next.sound)stopAlarm();
 const ok=persist(next);if(ok&&next.sound)unlockAudio();return ok;
}
function clearStats(){
 const next=copy(state);next.completed=0;next.totalMinutes=0;next.days={};return persist(next);
}
function recover(){
 const next=fresh();stopAlarm();return persist(next,true);
}
function formatSeconds(seconds){
 const secs=Math.max(0,seconds);return I.number(String(Math.floor(secs/60)).padStart(2,"0")+":"+String(secs%60).padStart(2,"0"));
}
function weekBars(){
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return N.date(d)});
 const maximum=Math.max(1,...days.map(day=>state.days[day]||0));
 return '<div class="focus-bars" aria-label="'+esc(t("Focus time over the last 7 days"))+'">'+days.map(day=>{
   const mins=state.days[day]||0,short=new Date(day+"T12:00:00").toLocaleDateString(I.language==="bn"?"bn-BD":"en-US",{weekday:"short"});
   return '<div class="focus-day"><span class="focus-column" style="height:'+Math.max(5,Math.round(mins/maximum*100))+'%" title="'+esc(I.number(mins)+" "+t("min"))+'"></span><small>'+esc(short)+'</small></div>';
 }).join("")+'</div>';
}
function page(){
 const left=remaining(),ratio=(state.durationSec-left)/state.durationSec;
 return '<div class="page-head"><div><span class="eyebrow">'+t("FOCUS LAB / 07")+'</span><h1 class="view-title">'+t("Focus Timer & Pomodoro")+'</h1><p class="subheading">'+t("Study with purpose. Work in timed blocks and take intentional breaks.")+'</p></div></div>'+
 '<div class="focus-layout"><section class="panel focus-panel" aria-label="'+esc(t("Focus timer"))+'">'+
 '<div class="focus-modes" role="group" aria-label="'+esc(t("Timer mode"))+'">'+
 MODES.map(mode=>'<button type="button" class="focus-mode'+(state.mode===mode?' selected':'')+'" data-action="focus-mode" data-mode="'+mode+'" aria-pressed="'+(state.mode===mode)+'">'+esc(t({focus:"Focus",short:"Short break",long:"Long break"}[mode]))+'</button>').join("")+'</div>'+
 '<div class="focus-timer" style="--focus-progress:'+Math.round(ratio*360)+'deg"><div class="focus-timer-inside">'+
 '<span id="focusModeName">'+esc(t({focus:"Focus session",short:"Short break",long:"Long break"}[state.mode]))+'</span>'+
 '<output id="focusClock" role="timer" aria-live="off" aria-label="'+esc(t("Time remaining"))+'">'+formatSeconds(left)+'</output>'+
 '<p id="focusStatus" aria-live="polite">'+esc(t(state.running?"Timer running":left===0?"Session completed":"Ready when you are"))+'</p></div></div>'+
 '<div class="focus-controls">'+(state.running?
 '<button type="button" class="primary-btn" data-action="focus-pause">'+esc(t("Pause"))+'</button>':
 '<button type="button" class="primary-btn" data-action="focus-start">'+esc(t(left===state.durationSec||left===0?"Start timer":"Resume"))+'</button>')+
 '<button type="button" class="secondary-btn" data-action="focus-reset">'+esc(t("Reset timer"))+'</button></div>'+
 '<div class="focus-config"><label for="focusMinutes">'+esc(t("Duration (minutes)"))+'</label><input type="number" id="focusMinutes" min="1" max="180" step="1" inputmode="numeric" value="'+(state.durationSec/60)+'"'+(state.running?' disabled':'')+' />'+
 '<button class="secondary-btn" type="button" data-action="focus-sound" aria-pressed="'+state.sound+'">'+esc(t(state.sound?"Sound on":"Sound off"))+'</button></div>'+
 (error?'<div class="focus-error" role="alert">'+esc(t(error))+(locked?' <button type="button" class="secondary-btn" data-action="focus-recover">'+esc(t("Reset focus data"))+'</button>':'')+'</div>':'')+
 '<p class="focus-help">'+esc(t("Sounds play only when browser audio is permitted and the app stays active. The alert stops automatically within 10 seconds. No background alarm is guaranteed."))+'</p></section>'+
 '<section class="panel focus-stat-panel"><h2>'+esc(t("Your focus progress"))+'</h2><div class="focus-metrics">'+
 '<div><b>'+I.number(state.completed)+'</b><span>'+esc(t("Completed focus blocks"))+'</span></div>'+
 '<div><b>'+I.number(state.totalMinutes)+'</b><span>'+esc(t("Focused minutes"))+'</span></div></div>'+
 '<h3>'+esc(t("Last 7 days"))+'</h3>'+weekBars()+
 '<div class="focus-stat-actions"><button type="button" class="secondary-btn" data-action="focus-clear-stats">'+esc(t("Reset statistics"))+'</button>'+
 '<button type="button" class="secondary-btn" data-nav="subjects">'+esc(t("Subject library"))+'</button></div>'+
 '<p class="focus-help">'+esc(t("Focus statistics are stored locally on this website and are not included in routine JSON backups."))+'</p></section></div>';
}
function renderClock(now=Date.now()){
 const clock=document.getElementById("focusClock");
 if(!clock)return;
 const left=remaining(now),text=formatSeconds(left);if(clock.textContent!==text)clock.textContent=text;
 const dial=document.querySelector(".focus-timer");if(dial)dial.style.setProperty("--focus-progress",Math.round((state.durationSec-left)/state.durationSec*360)+"deg");
 const message=document.getElementById("focusStatus");
 if(message){const label=t(state.running?"Timer running":left===0?"Session completed":"Ready when you are");if(message.textContent!==label)message.textContent=label;}
}
function init(options){
 callbacks=options;
 // On reload, settle elapsed timers without emitting a delayed sound.
 tick(Date.now(),true);
 setInterval(()=>tick(Date.now()),250);
 document.addEventListener("visibilitychange",()=>tick(Date.now()));
}
function handle(action,button){
 if(!action||!action.startsWith("focus-"))return false;
 let ok=true;
 switch(action){
 case"focus-start":ok=start();break;
 case"focus-pause":ok=pause();break;
 case"focus-reset":ok=reset();break;
 case"focus-mode":
   if(state.running&&!window.confirm(t("Switching modes will discard the current countdown. Continue?")))break;
   ok=mode(button.dataset.mode);break;
 case"focus-sound":ok=toggleSound();break;
 case"focus-clear-stats":
   if(!window.confirm(t("Clear focus statistics? Routine data will not be changed.")))break;
   ok=clearStats();break;
 case"focus-recover":
   if(!window.confirm(t("Reset damaged focus data? Your routine, tasks and exams will not be changed.")))break;
   ok=recover();break;
 default:return false;
 }
 if(!ok&&callbacks?.toast)callbacks.toast(status()||"Timer action failed.");
 if(callbacks?.refresh)callbacks.refresh();
 return true;
}
function handleMinutes(value){
 const ok=duration(value);
 if(!ok&&callbacks?.toast)callbacks.toast(status());
 if(callbacks?.refresh)callbacks.refresh();
 return ok;
}
window.NOVA_FOCUS={KEY,get,remaining,start,pause,reset,mode,duration,toggleSound,clearStats,recover,adopt,persist,tick,init,handle,handleMinutes,page,renderClock,status};
})();
