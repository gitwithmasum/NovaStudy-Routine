const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const core=readFileSync(path.join(root,'core.js'),'utf8');
const attendance=readFileSync(path.join(root,'attendance.js'),'utf8');
const KEY='novastudy_state_v1';
let serial=0;
function storage(seed=null){
 const data=new Map(seed===null?[]:[[KEY,seed]]);
 return {data,fail:false,getItem(k){if(this.fail)throw Error('blocked');return data.get(k)??null},
 setItem(k,v){if(this.fail)throw Error('quota');data.set(k,String(v))}};
}
function boot(store){
 const w={NOVA_COLORS:['#22aabb'],NOVA_CATALOG:{university:{tracks:{'CSE / Software Engineering':['Math','Science']}}},
  NOVA_I18N:{t:s=>s,number:s=>String(s),displayDate:s=>s,time:s=>s,language:'en'},NOVA_FOCUS:{get:()=>({totalMinutes:50})}};
 const globals={window:w,localStorage:store,crypto:{randomUUID:()=>String(++serial)},Date,Math,JSON,Set,Object,String,Number,Array};
 vm.runInNewContext(core,globals,{filename:'core.js'});
 vm.runInNewContext(attendance,{...globals,document:{},Date},{filename:'attendance.js'});
 const N=w.NOVA,T=w.NOVA_ATTENDANCE;
 T.init({changed:()=>N.save(),toast:()=>{},refresh:()=>{}});
 return {N,T};
}
function addClass(N,{day,date,repeat='weekly',type='Class'}={}){
 const today=new Date();const iso=N.date(today),d=day??today.getDay();
 const s={id:N.uid(),subjectId:N.get().subjects[0].id,day:d,start:'10:00',end:'11:00',type,repeat};
 if(repeat==='once')s.date=date||iso;
 N.get().sessions.push(s);assert.equal(N.save(),true);
 return s;
}
test('legacy v1 backups without attendance normalize without losing other arrays',()=>{
 const st=storage(),{N}=boot(st),s=addClass(N);
 const old=JSON.parse(st.getItem(KEY));delete old.attendance;
 assert.equal(N.valid(old),true);
 const recovered=boot(storage(JSON.stringify(old)));
 assert.equal(recovered.N.get().attendance.length,0);
 assert.equal(recovered.N.get().sessions[0].id,s.id);
});
test('marking a scheduled class saves one record and updates rather than duplicates',()=>{
 const st=storage(),{N,T}=boot(st),s=addClass(N);
 assert.equal(T.mark(s.id,'present').ok,true);
 assert.equal(T.mark(s.id,'late').ok,true);
 assert.equal(N.get().attendance.length,1);
 assert.equal(N.get().attendance[0].status,'late');
 assert.equal(JSON.parse(st.getItem(KEY)).attendance.length,1);
});
test('present and late are attended; absent is counted; excused is excluded',()=>{
 const {N,T}=boot(storage()),s=addClass(N);
 const today=N.date(new Date()),subjectId=s.subjectId;
 assert.equal(T.mark(s.id,'present').ok,true);
 let st=T.stats();assert.equal(st.rate,100);
 assert.equal(T.addManual(subjectId,'absent').ok,true);
 st=T.stats();assert.equal(st.rate,50);
 assert.equal(T.addManual(subjectId,'excused').ok,true);
 st=T.stats();assert.equal(st.rate,100);
 assert.equal(st.marked,2);
 assert.equal(st.counted,1);
 assert.equal(N.get().attendance[0].date,today);
});
test('unmarked classes have no fabricated zero-percent attendance rate',()=>{
 const {N,T}=boot(storage());addClass(N);
 assert.equal(T.stats().rate,null);
 assert.equal(T.stats().marked,0);
});
test('future and invalid dates cannot be marked and do not modify data',()=>{
 const {N,T}=boot(storage()),s=addClass(N);
 const future=new Date();future.setDate(future.getDate()+1);
 const ahead=N.date(future);
 assert.equal(T.chooseDate(ahead),false);
 assert.equal(T.mutate({date:ahead,sessionId:s.id,status:'present'}).ok,false);
 assert.equal(T.mutate({date:'2026-02-30',sessionId:s.id,status:'present'}).ok,false);
 assert.equal(N.get().attendance.length,0);
});
test('a class scheduled on the wrong day is not marked',()=>{
 const {N,T}=boot(storage());
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
 const s=addClass(N,{day:tomorrow.getDay()});
 assert.equal(T.mark(s.id,'present').ok,false);
 assert.equal(T.stats().marked,0);
});
test('one-time class is recognized only on its actual date',()=>{
 const {N,T}=boot(storage());const s=addClass(N,{repeat:'once'});
 assert.ok(T.scheduled(N.date(new Date())).some(x=>x.id===s.id));
 assert.equal(T.mark(s.id,'absent').ok,true);
});
test('manual entries require a valid subject, can be updated and removed',()=>{
 const {N,T}=boot(storage()),id=N.get().subjects[0].id;
 assert.equal(T.addManual('nonexistent','present').ok,false);
 assert.equal(T.addManual(id,'present').ok,true);
 assert.equal(T.addManual(id,'late').ok,true);
 assert.equal(N.get().attendance.length,1);
 assert.equal(T.remove(N.get().attendance[0].id),true);
 assert.equal(N.get().attendance.length,0);
});
test('duplicate identities and invalid statuses are rejected by backup validation',()=>{
 const {N,T}=boot(storage()),s=addClass(N);
 T.mark(s.id,'present');
 const broken=JSON.parse(JSON.stringify(N.get()));
 broken.attendance.push({...broken.attendance[0],id:'other-record'});
 assert.equal(N.valid(broken),false);
 broken.attendance.pop();broken.attendance[0].status='skipped';
 assert.equal(N.valid(broken),false);
});
test('JSON backup roundtrip includes attendance but does not change focus timer data',()=>{
 const st=storage(),{N,T}=boot(st),s=addClass(N);
 T.mark(s.id,'present');
 const backup=JSON.parse(JSON.stringify(N.get()));
 const other=boot(storage());
 assert.equal(other.N.setState(backup),true);
 assert.equal(other.N.get().attendance.length,1);
 assert.equal(other.N.get().attendance[0].subjectId,s.subjectId);
});
test('save quota errors roll back attendance changes and preserve stored JSON',()=>{
 const st=storage(),{N,T}=boot(st),s=addClass(N);
 const before=st.getItem(KEY);
 st.fail=true;
 assert.equal(T.mark(s.id,'present').ok,false);
 assert.equal(N.get().attendance.length,0);
 st.fail=false;
 assert.equal(st.getItem(KEY),before);
});
test('subject names escape HTML while attendance UI remains keyboard operable',()=>{
 const {N,T}=boot(storage());
 const sub=N.get().subjects[0];sub.name='<img src=x onerror=alert(1)>';assert.equal(N.save(),true);
 const s=addClass(N);
 const html=T.page();
 assert.ok(html.includes('&lt;img'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(html.includes('id="attendanceDate"'));
 assert.ok(html.includes('aria-pressed='));
 assert.ok(html.includes('data-action="attendance-mark"'));
 assert.ok(T.subjectStats().length===0);
});
test('offline PWA, bilingual navigation and v1.7 version wiring are present',()=>{
 const file=f=>readFileSync(path.join(root,f),'utf8');
 const html=file('index.html'),sw=file('sw.js'),app=file('app.js'),css=file('styles.css');
 assert.ok(html.includes('<b>1.7.0</b>'));
 assert.ok(html.includes('src="./attendance.js"'));
 assert.ok(sw.includes("'./attendance.js'")&&sw.includes("novastudy-v1.7.0"));
 assert.ok(app.includes('T.dateChanged')&&app.includes('T.handle(action,b)'));
 assert.ok(css.includes('.attendance-layout')||css.includes('.attendance-panel'));
 for(const path of ['attendance.js','core.js','app.js','views.js','i18n.js','sw.js','focus.js'])
   assert.doesNotThrow(()=>new vm.Script(file(path),{filename:path}));
});
