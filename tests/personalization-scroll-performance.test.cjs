"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
test("Personalization card renders theme, language and UI settings but never Reminder preferences",()=>{
 const views=read("views.js"),reminders=read("reminders.js"),app=read("app.js");
 assert.match(views,/title:"Personalization"/);
 assert.match(views,/class="panel settings-data-panel" aria-label="Personalization"/);
 assert.doesNotMatch(views,/window\.NOVA_REMINDERS\.panel\(\)/);
 assert.match(views,/data-theme-value="halftone"/);
 assert.match(views,/window\.NOVA_UI\?\.settingsPanel/);
 assert.match(views,/data-action="language-select"/);
 assert.match(reminders,/Reminder preferences/);
 assert.match(reminders,/function page\(\)/);
 assert.match(app,/page==="notifications"\?Reminders\.page\(\)/);
 assert.match(views,/\(active\?settingsUtilityBody\(active\.route\):\'\'\)/);
});
test("Mint Halftone wallpaper has bounded vector complexity and uses scroll-safe static paint",()=>{
 const svg=read("assets/mint-halftone-waves.svg"),css=read("halftone-theme.css");
 assert.ok(svg.length<40000,"Large wallpaper payload impacts first paint");
 const elements=(svg.match(/<path /g)||[]).length;
 assert.ok(elements>=25&&elements<=100,"Use batched wave strokes rather than 10k nodes");
 assert.equal((svg.match(/<ellipse\b/g)||[]).length,0);
 assert.match(css,/background-attachment:scroll/);
 assert.match(css,/-webkit-backdrop-filter:none/);
 assert.match(css,/box-shadow:0 3px 14px/);
 assert.match(css,/@media\(max-width:660px\)/);
});
test("navigation uses immediate scrolling and mobile menu avoids snap latency",()=>{
 const app=read("app.js"),css=read("performance-mobile.css");
 assert.match(app,/scrollIntoView\?\.\(\{block:"nearest",inline:"nearest",behavior:"auto"\}\)/);
 assert.match(app,/window\.scrollTo\(\{top:0,behavior:"auto"\}\)/);
 assert.match(css,/html\{scroll-behavior:auto\}/);
 assert.match(css,/\.mobile-nav\{scroll-snap-type:none\}/);
 assert.match(css,/\.mobile-nav button\{scroll-snap-align:none\}/);
});
test("legacy themes, all user data, course notes and Reminder module remain untouched",()=>{
 const view=read("views.js"),theme=read("themes.css"),app=read("app.js");
 assert.match(theme,/data-theme="gold"/);
 assert.match(view,/accountServicePanel\(\)/);
 assert.match(view,/id="profileForm"/);
 assert.match(app,/CourseManager\.page\(\)/);
 assert.match(app,/Reminders\.handle\(action,b\)/);
 assert.doesNotMatch(view,/localStorage\.removeItem|localStorage\.clear\(\)/);
});
