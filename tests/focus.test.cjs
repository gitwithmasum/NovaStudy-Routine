const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=readFileSync(path.join(root,'focus.js'),'utf8');
const KEY='novastudy_focus_v1';
function storage(raw=null){
 const values=new Map(raw===null?[]:[[KEY,raw]]);
 return {values,fail:false,getItem(k){if(this.fail)throw Error('blocked');return values.get(k)??null},
 setItem(k,v){if(this.fail)throw Error('quota');values.set(k,String(v))}};
}
function boot(store){
 const w={NOVA:{date:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),escape:s=>String(s)},
 NOVA_I18N:{language:'en',number:s=>String(s),t:s=>s,time:s=>s,displayDate:s=>s},confirm:()=>true};
 const doc={hidden:false,getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{}};
 vm.runInNewContext(source,{window:w,document:doc,localStorage:store,setInterval:()=>0,Date,JSON,Math},{filename:'focus.js'});
 return w.NOVA_FOCUS;
}
test('defaults to 25 minutes and stores focus preferences separately',()=>{
 const st=storage(),F=boot(st);
 assert.equal(F.get().durationSec,1500);
 assert.equal(F.remaining(),1500);
 assert.equal(st.getItem('novastudy_state_v1'),null);
});
test('wall clock controls countdown with pause and resume',()=>{
 const F=boot(storage()),now=1000;
 assert.equal(F.start(now),true);
 assert.equal(F.remaining(now+61000),1439);
 assert.equal(F.pause(now+61000),true);
 assert.equal(F.get().remainingSec,1439);
 assert.equal(F.start(now+70000),true);
 assert.equal(F.remaining(now+71000),1438);
});
test('focus completion updates statistics once only',()=>{
 const F=boot(storage());
 F.start(1000);F.tick(1501001,true);
 assert.equal(F.get().completed,1);
 assert.equal(F.get().totalMinutes,25);
 assert.equal(F.get().running,false);
 F.tick(1501003,true);
 assert.equal(F.get().completed,1);
});
test('break completion never increments focus minutes',()=>{
 const F=boot(storage());
 assert.equal(F.mode('short'),true);
 F.start(1000);F.tick(301001,true);
 assert.equal(F.get().completed,0);assert.equal(F.get().totalMinutes,0);
 assert.equal(F.mode('long'),true);
 assert.equal(F.get().durationSec,900);
});
test('custom minutes are limited to integer values between 1 and 180',()=>{
 const F=boot(storage());
 assert.equal(F.duration(0),false);
 assert.equal(F.duration(181),false);
 assert.equal(F.duration(7.5),false);
 assert.equal(F.duration(10),true);
 assert.equal(F.get().durationSec,600);
});
test('a fresh browser run can recover an in-progress timer from a future deadline',()=>{
 const st=storage(),F=boot(st),now=Date.now();
 assert.equal(F.start(now),true);
 const G=boot(st);
 assert.equal(G.get().running,true);
 assert.equal(G.remaining(now+2000),1498);
});
test('stale tab updates cannot overwrite a newer countdown',()=>{
 const st=storage(),a=boot(st),b=boot(st);
 assert.equal(a.start(1000),true);
 assert.equal(b.mode('short'),false);
 assert.equal(b.get().running,true);
 assert.equal(b.get().mode,'focus');
});
test('corrupted focus data is never overwritten without an explicit recovery',()=>{
 const st=storage('{broken'),F=boot(st);
 assert.equal(F.start(1000),false);
 assert.equal(st.getItem(KEY),'{broken');
 assert.equal(F.recover(),true);
 assert.equal(F.get().durationSec,1500);
});
test('focus stats may be cleared without touching routine data',()=>{
 const st=storage(),F=boot(st);
 st.values.set('novastudy_state_v1','{"routine":"preserved"}');
 F.start(1000);F.tick(1501001,true);
 assert.equal(F.clearStats(),true);
 assert.equal(F.get().completed,0);
 assert.equal(st.getItem('novastudy_state_v1'),'{"routine":"preserved"}');
});
test('sound preference persists and default stays on',()=>{
 const st=storage(),F=boot(st);
 assert.equal(F.get().sound,true);
 assert.equal(F.toggleSound(),true);
 assert.equal(boot(st).get().sound,false);
});
test('v1.6 integration, offline cache, and bilingual hooks are included',()=>{
 const files=Object.fromEntries(['index.html','app.js','focus.js','sw.js','styles.css','i18n.js','views.js']
 .map(f=>[f,readFileSync(path.join(root,f),'utf8')]));
 assert.match(files['index.html'],/1\.8\.0/);
 assert.match(files['index.html'],/data-nav="focus"/);
 assert.ok(files['index.html'].includes('src="./focus.js"'));
 assert.ok(files['sw.js'].includes("'./focus.js'")&&files['sw.js'].includes("novastudy-v1.8.0"));
 assert.ok(files['app.js'].includes('F.handle(action,b)'));
 assert.ok(files['i18n.js'].includes('Focus Timer & Pomodoro'));
 assert.ok(files['styles.css'].includes('.focus-layout'));
 for(const f of ['focus.js','app.js','views.js','core.js','i18n.js','editors.js','exams.js','sw.js']){
   assert.doesNotThrow(()=>new vm.Script(readFileSync(path.join(root,f),'utf8'),{filename:f}));
 }
});

test('Web Audio alert schedules chimes that all finish before 10 seconds',()=>{
 const notes=[];
 class FakeAudio {
   constructor(){this.state='running';this.currentTime=100;this.destination={};}
   createOscillator(){return {frequency:{value:0},connect:()=>{},start:()=>{},stop:time=>notes.push(time)};}
   createGain(){return {gain:{setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}},connect:()=>{}};}
   resume(){return Promise.resolve();}
 }
 const st=storage();
 const w={NOVA:{date:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),escape:s=>String(s)},
 NOVA_I18N:{language:'en',number:s=>String(s),t:s=>s,displayDate:s=>s},AudioContext:FakeAudio,confirm:()=>true};
 const doc={hidden:false,getElementById:()=>null,querySelector:()=>null,addEventListener:()=>{}};
 vm.runInNewContext(source,{window:w,document:doc,localStorage:st,setInterval:()=>0,Date,JSON,Math});
 const F=w.NOVA_FOCUS;
 let notified=0;
 F.init({onComplete:()=>notified++,toast:()=>{},refresh:()=>{}});
 assert.equal(F.start(1000),true);
 F.tick(1501000,false);
 assert.equal(notes.length,12);
 assert.ok(Math.max(...notes)-100<10);
 assert.equal(notified,1);
});
