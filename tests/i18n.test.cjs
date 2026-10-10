const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const js=readFileSync(path.join(root,'i18n.js'),'utf8');
function setup(saved=null){
 const store=new Map();
 if(saved!==null)store.set('novastudy_language_v1',saved);
 store.set('novastudy_state_v1','{"version":1,"tasks":[{"title":"My Biology Exam"}]}');
 store.set('novastudy_theme_v1','gold');
 const localStorage={getItem:key=>store.get(key)??null,setItem:(key,v)=>store.set(key,String(v))};
 let text=null;
 const doc={
  documentElement:{lang:'en'},
  nodeType:9,
  querySelectorAll:()=>[],
  createTreeWalker:()=>({currentNode:null,nextNode(){if(!text||this.currentNode)return false;this.currentNode=text;return true;}})
 };
 const env={window:{},document:doc,NodeFilter:{SHOW_TEXT:4},localStorage,Date,Intl,WeakMap,Set,Number,String};
 vm.runInNewContext(js,env,{filename:'i18n.js'});
 return {I:env.window.NOVA_I18N,doc,store,createText(value){
    const node={nodeValue:value,parentElement:{closest:()=>false}};
    text=node;return node;
 }};
}
test('defaults to English and accepts saved Bangla preference',()=>{
 assert.equal(setup().I.language,'en');
 assert.equal(setup('bn').I.language,'bn');
});
test('English and Bangla translations cover core navigational screens',()=>{
 const {I}=setup();
 assert.equal(I.t('Dashboard'),'Dashboard');
 I.setLanguage('bn');
 for(const name of ['Dashboard','Weekly routine','Tasks & goals','Exams & revision','Profile & settings','Save','Cancel','Add exam','Choose your theme']){
   assert.notEqual(I.t(name),name,'Missing translation: '+name);
 }
 assert.equal(I.t('Dashboard'),'ড্যাশবোর্ড');
});
test('switching language leaves saved routine, exam, and theme keys untouched',()=>{
 const {I,store}=setup();
 const before=store.get('novastudy_state_v1'),theme=store.get('novastudy_theme_v1');
 I.setLanguage('bn');assert.equal(I.language,'bn');
 assert.equal(store.get('novastudy_state_v1'),before);
 assert.equal(store.get('novastudy_theme_v1'),theme);
 assert.equal(store.get('novastudy_language_v1'),'bn');
 I.setLanguage('en');assert.equal(I.language,'en');
});
test('Bangla dates are displayed without changing ISO storage values',()=>{
 const {I}=setup();
 I.setLanguage('bn');
 assert.match(I.displayDate('2026-10-10'),/২০২৬/);
 assert.equal(I.displayDate('2026-99-99'),'2026-99-99');
 assert.match(I.time('13:30'),/১/);
 assert.equal(I.number('102'), '১০২');
 I.setLanguage('en');
 assert.equal(I.displayDate('2026-10-10'),'2026-10-10');
});
test('a localized UI text node is reversible on language switch',()=>{
 const {I,createText}=setup();
 const node=createText('Dashboard');
 I.setLanguage('bn');assert.equal(node.nodeValue,'ড্যাশবোর্ড');
 I.setLanguage('en');assert.equal(node.nodeValue,'Dashboard');
});
test('user content is skipped by the translator, even if equal to UI vocabulary',()=>{
 const {I,createText}=setup();
 const node=createText('Science');
 node.parentElement.closest=()=>true;
 I.setLanguage('bn');assert.equal(node.nodeValue,'Science');
});
test('translated relative dates and counters use Bangla digits',()=>{
 const {I}=setup('bn');
 assert.equal(I.t('3 days left'),'৩ দিন বাকি');
 assert.equal(I.t('2h 15m remaining'),'২ ঘণ্টা ১৫ মিনিট বাকি');
 assert.equal(I.t('5 revision blocks'),'৫টি রিভিশন সেশন');
});
test('app wiring and service worker are prepared for offline bilingual use',()=>{
 const files=Object.fromEntries(['index.html','app.js','views.js','editors.js','exams.js','sw.js'].map(f=>[f,readFileSync(path.join(root,f),'utf8')]));
 assert.ok(files['index.html'].includes('src="./i18n.js"'));
 assert.ok(files['index.html'].includes('<b>2.0.0</b>'));
 assert.ok(files['app.js'].includes('I.useExternal(e.newValue)'));
 assert.ok(files['views.js'].includes('data-lang="bn"'));
 assert.ok(files['editors.js'].includes('aria-labelledby'));
 assert.ok(files['exams.js'].includes('I.displayDate'));
 assert.ok(files['sw.js'].includes('novastudy-v2.0.0'));
 assert.ok(files['sw.js'].includes("'./i18n.js'"));
 for(const f of ['i18n.js','core.js','views.js','editors.js','exams.js','app.js','sw.js']){
   assert.doesNotThrow(()=>new vm.Script(readFileSync(path.join(root,f),'utf8'),{filename:f}));
 }
});

test('education category and class labels translate without modifying underlying options',()=>{
 const {I}=setup('bn');
 assert.equal(I.t('Class 9'),'শ্রেণি ৯');
 assert.equal(I.t('Undergraduate — Year 2'),'স্নাতক — দ্বিতীয় বর্ষ');
 assert.notEqual(I.t('Computer / IT'),'Computer / IT');
 assert.equal(I.t('Class 11 / HSC 1st Year'),'শ্রেণি ১১ / এইচএসসি প্রথম বর্ষ');
});
