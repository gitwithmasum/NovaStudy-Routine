const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=readFileSync(path.join(root,'core.js'),'utf8');
let seq=0;
function storage(seed=null){
 const values=new Map(seed===null?[]:[['novastudy_state_v1',seed]]);
 return {values,fail:false,getItem(k){if(this.fail)throw Error('blocked');return values.has(k)?values.get(k):null},
   setItem(k,v){if(this.fail)throw Error('quota');values.set(k,String(v))}};
}
function boot(store){
 const win={NOVA_COLORS:['#09f'],NOVA_CATALOG:{university:{tracks:{'CSE / Software Engineering':['Math','Programming']}}}};
 vm.runInNewContext(source,{window:win,localStorage:store,crypto:{randomUUID:()=>String(++seq)},Date,Math,JSON});
 return win.NOVA;
}
test('saved state survives a fresh boot and old backups without exams remain valid',()=>{
 const st=storage(),a=boot(st);
 a.get().tasks.push({id:'task-one',title:'First task',subjectId:'',due:'',priority:'high',done:false});
 assert.equal(a.save(),true);
 const raw=JSON.parse(st.getItem('novastudy_state_v1'));delete raw.exams;
 assert.equal(a.valid(raw),true);
 assert.equal(boot(storage(JSON.stringify(raw))).get().tasks.length,1);
});
test('quota failure restores the latest saved in-memory snapshot',()=>{
 const st=storage(),a=boot(st);
 a.get().tasks.push({id:'task1',title:'saved'});assert.equal(a.save(),true);
 st.fail=true;a.get().tasks.push({id:'task2',title:'unsaved'});
 assert.equal(a.save(),false);assert.equal(a.get().tasks.length,1);
});
test('invalid backup is rejected without replacing existing data',()=>{
 const st=storage(),a=boot(st);a.get().tasks.push({id:'x',title:'original'});a.save();
 const before=st.getItem('novastudy_state_v1');
 const wrong=JSON.parse(before);wrong.tasks[0].due='2026-99-99';
 assert.equal(a.setState(wrong),false);assert.equal(st.getItem('novastudy_state_v1'),before);
});
test('duplicate IDs, backwards time ranges, and invalid dates are rejected',()=>{
 const a=boot(storage());
 const s=JSON.parse(JSON.stringify(a.get()));
 s.sessions.push({id:'same',day:1,start:'18:30',end:'16:30',subjectId:''});
 assert.equal(a.valid(s),false);
 s.sessions[0].end='19:30';s.sessions.push({...s.sessions[0]});
 assert.equal(a.valid(s),false);
});
test('stale tab cannot overwrite the more recent saved state',()=>{
 const st=storage(),a=boot(st),b=boot(st);
 a.get().tasks.push({id:'a',title:'updated on A'});assert.equal(a.save(),true);
 b.get().tasks.push({id:'b',title:'stale B'});
 assert.equal(b.save(),false);assert.equal(b.get().tasks[0].id,'a');
 assert.equal(b.get().tasks.length,1);
});
test('damaged storage is not overwritten until explicit valid restore',()=>{
 const st=storage('{broken'),a=boot(st);
 assert.equal(a.save(),false);assert.equal(st.getItem('novastudy_state_v1'),'{broken');
 assert.equal(a.rawRecovery(),'{broken');
 const recovered=JSON.parse(JSON.stringify(a.get()));
 assert.equal(a.setState(recovered),true);
 assert.notEqual(st.getItem('novastudy_state_v1'),'{broken');
});
test('valid multi-tab updates can be adopted without an echo write',()=>{
 const st=storage(),a=boot(st);a.get().tasks.push({id:'shared',title:'another tab'});a.save();
 const target=storage(),b=boot(target);
 assert.equal(b.acceptExternal(st.getItem('novastudy_state_v1')),true);
 assert.equal(b.get().tasks[0].title,'another tab');
 assert.equal(target.getItem('novastudy_state_v1'),null);
});
test('PWA and UI reliability integration hooks exist and parse cleanly',()=>{
 for(const file of ['core.js','app.js','editors.js','sw.js']){
   const code=readFileSync(path.join(root,file),'utf8');
   assert.doesNotThrow(()=>new vm.Script(code,{filename:file}));
 }
 const sw=readFileSync(path.join(root,'sw.js'),'utf8');
 const app=readFileSync(path.join(root,'app.js'),'utf8');
 const html=readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(sw.includes('SKIP_WAITING')&&sw.includes('novastudy-v1.4.0'));
 assert.ok(app.includes('updateAccepted')&&app.includes('acceptExternal(e.newValue)'));
 assert.ok(html.includes('data-action="apply-update"')&&html.includes('id="recoveryNotice"'));
 assert.ok(html.includes('themeToggle')&&html.includes('data-nav="exams"'));
});
