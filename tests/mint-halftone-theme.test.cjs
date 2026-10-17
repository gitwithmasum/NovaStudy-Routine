"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("third Mint Halftone theme appears in the settings gallery beside Cyber and Black & Gold",()=>{
 const view=read("views.js");
 for(const theme of ["cyber","gold","halftone"])
  assert.match(view,new RegExp('data-theme-value="'+theme+'"'));
 assert.match(view,/theme-preview-halftone/);
 assert.match(view,/Mint Halftone/);
 const css=read("halftone-theme.css");
 assert.match(css,/\.theme-gallery\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.theme-gallery\{grid-template-columns:1fr\}/);
});

test("Mint Halftone restores before paint, persists and participates in the three-way toggle",()=>{
 const html=read("index.html"),js=read("app.js");
 assert.match(html,/localStorage\.getItem\("novastudy_theme_v1"\)/);
 assert.match(html,/\["cyber","gold","halftone"\]\.includes/);
 assert.match(js,/const THEMES=\["cyber","gold","halftone"\]/);
 assert.match(js,/THEMES\[\(THEMES.indexOf\(current\)\+1\)%THEMES.length\]/);
 assert.match(js,/localStorage\.setItem\(THEME_KEY,next\)/);
 assert.match(js,/THEMES\.includes\(e\.newValue\)\?e\.newValue:"cyber"/);
 assert.match(js,/current==="halftone"\?"#effbf6"/);
});

test("new wallpaper is text-free, fully SVG, and applied to entire view with accessible light contrast",()=>{
 const art=read("assets/mint-halftone-waves.svg"),css=read("halftone-theme.css");
 assert.match(art,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(art,/width="1600" height="1000"/);
 assert.match(art,/fill="#ffffff"/);
 assert.match(art,/stroke-dasharray=/);
 assert.match(art,/<path d="M/);
 assert.ok((art.match(/<path /g)||[]).length<=100,"Keep SVG wave path count small");
 assert.ok(art.length<40000,"Background must remain lightweight");
 assert.doesNotMatch(art,/LOREM|Canva|Edit with AI|<text\b/i);
 assert.match(css,/html\[data-theme="halftone"\] body\{/);
 assert.match(css,/url\("\.\/assets\/mint-halftone-waves\.svg"\)/);
 assert.match(css,/background-attachment:scroll/);
 assert.match(css,/backdrop-filter:none/);
 assert.match(css,/color-scheme:light/);
 for(const selector of [".sidebar",".topbar",".mobile-nav",".panel",".primary-btn",".subject-card",".cm-panel"])
  assert.ok(css.includes(selector),"Missing light override for "+selector);
 assert.match(css,/:focus-visible/);
});

test("CSS is loaded after existing module styles and both original themes remain untouched",()=>{
 const html=read("index.html"),css=read("halftone-theme.css"),orig=read("themes.css");
 const cssIndex=html.indexOf('href="./halftone-theme.css"');
 assert.ok(cssIndex>html.indexOf('href="./settings-tools.css"'));
 assert.match(orig,/html\[data-theme="gold"\]/);
 assert.match(read("styles.css"),/--bg:#080e1d/);
 assert.doesNotMatch(css,/html\[data-theme="gold"\] \.panel\s*\{/);
 assert.match(html,/href="\.\/themes\.css"/);
});

test("PWA caches the clean wallpaper and exported theme backups can validate Mint Halftone",()=>{
 const sw=read("sw.js"),port=read("portability.js"),i18n=read("i18n.js");
 assert.match(sw,/'\.\/halftone-theme\.css'/);
 assert.match(sw,/'\.\/assets\/mint-halftone-waves\.svg'/);
 assert.match(port,/x==="gold"\|\|x==="cyber"\|\|x==="halftone"/);
 assert.match(i18n,/"Mint Halftone":"মিন্ট হাফটোন"/);
 assert.doesNotMatch(port,/eval\(/);
});
