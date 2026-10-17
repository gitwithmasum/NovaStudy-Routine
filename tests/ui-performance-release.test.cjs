"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
function themeHarness(){
 const code=read("app.js");
 const start=code.indexOf('const THEME_KEY = "novastudy_theme_v1";');
 const stop=code.indexOf("function updateLanguageControls()",start);
 assert.ok(start>0&&stop>start,"Theme-only behavior should be isolated");
 const attr={};
 const root={dataset:{theme:"cyber"}};
 const header={setAttribute(k,v){attr[k]=v},title:""};
 const label={textContent:""};
 const meta={content:""};
 const picks=["cyber","gold","halftone","neonwave"].map(value=>({dataset:{themeValue:value},state:{},classList:{toggle(k,v){this[k]=v}},setAttribute(k,v){this.state[k]=v}}));
 const document={documentElement:root,querySelector:selector=>selector==='meta[name="theme-color"]'?meta:null,
 querySelectorAll:selector=>selector==="[data-theme-value]"?picks:[]};
 const store=new Map(),saved={notes:"unsaved chapter edits",inputValue:"Draft assignment"},events=[];
 const context={document,localStorage:{setItem(k,v){store.set(k,v)}},$:(name)=>name==="themeToggle"?header:name==="themeLabel"?label:null,
  render(){events.push("full-render");saved.notes="lost"},toast:m=>events.push(m)};
 const js=code.slice(start,stop);
 vm.runInNewContext(js+"\nthis.selectTheme=setTheme;this.toggle=toggleTheme;this.update=updateThemeControls;",context,{filename:"theme-surface.js"});
 return {ctx:context,attr,root,header,label,meta,picks,store,saved,events};
}
test("all four theme switches update only CSS properties and never rebuild unsaved form content",()=>{
 const h=themeHarness();
 for(const id of ["gold","halftone","neonwave","cyber"]){
  h.ctx.selectTheme(id);
  assert.equal(h.root.dataset.theme,id);
  assert.equal(h.store.get("novastudy_theme_v1"),id);
  assert.equal(h.picks.find(x=>x.dataset.themeValue===id).state["aria-pressed"],"true");
  assert.equal(h.picks.filter(x=>x.state["aria-pressed"]==="true").length,1);
  assert.match(h.attr["aria-label"],/Current theme:/);
 }
 assert.equal(h.saved.notes,"unsaved chapter edits");
 assert.equal(h.saved.inputValue,"Draft assignment");
 assert.equal(h.events.filter(x=>x==="full-render").length,0);
 assert.equal(h.meta.content,"#080e20");
});
test("theme validation ignores malformed choices and handles repeat picks without data mutation",()=>{
 const h=themeHarness();
 h.ctx.selectTheme("untrusted");
 assert.equal(h.root.dataset.theme,"cyber");
 assert.equal(h.store.size,0);
 h.ctx.selectTheme("cyber");
 assert.equal(h.store.size,0);
 h.ctx.toggle();
 assert.equal(h.root.dataset.theme,"gold");
 assert.equal(h.saved.notes,"unsaved chapter edits");
});
const c=x=>parseInt(x,16)/255;
function lumi(s){
 const code=s.slice(1,7);
 const channels=[0,2,4].map(i=>c(code.slice(i,i+2))).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function contrast(a,b){const v=lumi(a),w=lumi(b);return (Math.max(v,w)+.05)/(Math.min(v,w)+.05)}
function vars(source){
 const o={};
 for(const [,name,value] of source.matchAll(/--(panel|text|muted):\s*(#[0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?/g))o[name]=value;
 return o;
}
test("base text and secondary text maintain WCAG AA contrast on each theme's panel",()=>{
 const cases=[
  ["Cyber",read("styles.css").split("}")[0]],
  ["Black & Gold",read("themes.css").match(/html\[data-theme="gold"\]\{([^}]+)\}/)?.[1]||""],
  ["Mint Halftone",read("halftone-theme.css").match(/html\[data-theme="halftone"\]\{([^}]+)\}/)?.[1]||""],
  ["Neon Wave",read("neon-wave-theme.css").match(/html\[data-theme="neonwave"\]\{([^}]+)\}/)?.[1]||""]
 ];
 for(const [name,source] of cases){
  const color=vars(source);
  for(const field of ["panel","text","muted"])assert.ok(color[field],name+" lacks "+field);
  assert.ok(contrast(color.panel,color.text)>=4.5,name+" default text contrast");
  assert.ok(contrast(color.panel,color.muted)>=4.5,name+" secondary text contrast");
 }
});
test("static background asset sizes are bounded to prevent previous scrolling regression",()=>{
 const mint=read("assets/mint-halftone-waves.svg"),neon=read("assets/neon-wave.svg");
 assert.ok(Buffer.byteLength(mint)<35000,"Mint SVG too large");
 assert.ok(Buffer.byteLength(neon)<35000,"Neon SVG too large");
 for(const art of [mint,neon]){
  assert.ok((art.match(/<path\b/g)||[]).length<=150);
  assert.doesNotMatch(art,/<animate\b|<foreignObject\b|<filter\b/i);
 }
 for(const file of ["halftone-theme.css","neon-wave-theme.css"]){
  const c=read(file);
  assert.match(c,/background-attachment:scroll/);
  assert.match(c,/backdrop-filter:none/);
 }
});
test("final polish stylesheet loads last and is PWA-cached with responsive touch and contrast",()=>{
 const html=read("index.html"),sw=read("sw.js"),css=read("ui-final-polish.css"),mob=read("performance-mobile.css");
 assert.ok(html.indexOf('href="./ui-final-polish.css"')>html.indexOf('href="./neon-wave-theme.css"'));
 assert.match(sw,/'\.\/ui-final-polish\.css'/);
 for(const theme of ["gold","halftone","neonwave"])assert.match(css,new RegExp('html\\[data-theme="'+theme+'"\\]\\[data-ui-contrast="on"\\]'));
 assert.match(css,/min-height:140px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(mob,/\.cm-topic\{content-visibility:auto;contain-intrinsic-size:auto 240px\}/);
 assert.match(read("app.js"),/if\(e\.key!==THEME_KEY\)return;[\s\S]*?updateThemeControls\(\)/);
});
test("theme polishing does not touch API, login, local study state or the other core features",()=>{
 const src=read("app.js");
 assert.doesNotMatch(read("ui-final-polish.css"),/display:none!important/);
 assert.match(src,/CourseManager\.page\(\)/);
 assert.match(src,/Portability\.page\(\)/);
 assert.match(src,/Auth\.init\(/);
 assert.match(src,/Reminders\.init\(/);
 assert.doesNotMatch(src.slice(src.indexOf("function setTheme("),src.indexOf("function toggleTheme()")),/\brender\(\)/);
});
