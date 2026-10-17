"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("Neon Wave is selectable, persistent and compatible with backups",()=>{
 const app=read("app.js"),html=read("index.html"),v=read("views.js"),data=read("portability.js");
 assert.match(app,/const THEMES=\["cyber","gold","halftone","neonwave"\]/);
 assert.match(app,/neonwave:"Neon Wave"/);
 assert.match(html,/\["cyber","gold","halftone","neonwave"\]\.includes/);
 assert.match(v,/data-theme-value="neonwave"/);
 assert.match(data,/x==="neonwave"/);
});
test("Neon Wave is a lightweight static vector background with no expensive repaint effects",()=>{
 const art=read("assets/neon-wave.svg"),css=read("neon-wave-theme.css");
 assert.ok(Buffer.byteLength(art)<33000);
 assert.ok((art.match(/<path/g)||[]).length<150);
 assert.doesNotMatch(art,/<filter|<animate|<image/);
 assert.match(css,/background-attachment:scroll/);
 assert.match(css,/backdrop-filter:none!important/);
 assert.doesNotMatch(css,/background-attachment:fixed|filter:blur\(/);
 assert.match(css,/\.theme-gallery\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
test("PWA caches all assets and older theme styles remain available",()=>{
 const html=read("index.html"),sw=read("sw.js");
 assert.match(html,/href="\.\/neon-wave-theme\.css"/);
 assert.match(sw,/'\.\/neon-wave-theme\.css'/);
 assert.match(sw,/'\.\/assets\/neon-wave\.svg'/);
 assert.match(read("views.js"),/data-theme-value="cyber"/);
 assert.match(read("views.js"),/data-theme-value="gold"/);
 assert.match(read("views.js"),/data-theme-value="halftone"/);
 assert.match(read("i18n.js"),/"Neon Wave":"নিয়ন ওয়েভ"/);
});
