"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","course-manager.js"),"utf8");
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
class BrowserFile extends Blob{
 constructor(parts,name,options={}){super(parts,options);this.name=name;this.webkitRelativePath=options.relativePath||""}
}
function setup({teacher=true,failMetadata=false}={}){
 const rows={
  ns_courses:[{id:"course1",title:"CSE",owner_id:"teacher",created_at:"2026-10-01",invite_code:"join"}],
  ns_chapters:[{id:"ch1",course_id:"course1",title:"Chapter 1",position:0,created_at:"2026-10-01"}],
  ns_topics:[{id:"topic1",course_id:"course1",chapter_id:"ch1",title:"Binary Search",body:"",position:0,created_at:"2026-10-01"}],
  ns_assets:[],ns_enrollments:[],ns_assignments:[],ns_submissions:[]
 };
 const uploads=[],removals=[],signed=[],toasts=[];
 const sb={
  from(table){return {
   select(){return{limit:async()=>({data:rows[table].map(x=>({...x})),error:null})}},
   insert:async row=>{
    if(failMetadata)return {error:{message:"database insert failed"}};
    rows[table].push({...row,id:String(rows[table].length+1)});
    return {error:null};
   }
  }},
  storage:{from:bucket=>({
   upload:async(key,file,options)=>{uploads.push({bucket,key,file,options});return {error:null}},
   remove:async(keys)=>{removals.push([...keys]);return {error:null}},
   createSignedUrl:async(key,seconds,options)=>{signed.push({key,seconds,options});return {data:{signedUrl:"https://private.example/download"},error:null}}
  })}
 };
 const userId=teacher?"teacher":"student";
 const w={
  NOVA:{escape:esc},NOVA_AUTH:{getStatus:()=>"connected",getUser:()=>({id:userId}),getClient:()=>sb},
  NOVA_I18N:{language:"en"},NOVA_VIEWS:{subjects:()=>"<p>legacy</p>"}
 };
 const doc={querySelectorAll:()=>[],body:{appendChild(){}},createElement(){return {href:"",download:"",target:"",rel:"",click(){},remove(){}}}};
 const ctx={window:w,document:doc,File:BrowserFile,Blob,Uint8Array,Uint32Array,TextEncoder,DataView,
  FormData:class{constructor(form){this.fields=form.fields||{}}get(k){return this.fields[k]??null}},
  crypto:{randomUUID:()=>"id123"},queueMicrotask:()=>{},console,Date,Promise,Set,Array};
 vm.runInNewContext(source,ctx,{filename:"course-manager.js"});
 const app=w.NOVA_COURSES;app.init({refresh:()=>{},toast:x=>toasts.push(x)});
 app.page();
 const input=(files,folder=false)=>({
  files,value:"selected",dataset:{course:"course1",chapter:"ch1",topic:"topic1"},
  matches:selector=>folder?selector.includes("[data-cm-folder]"):selector.includes("[data-cm-upload]")&&!selector.startsWith("[data-cm-folder]")
 });
 return {app,rows,uploads,removals,signed,toasts,input};
}
test("course upload controls accept any file and directory, but only for owners",async()=>{
 const o=setup();await o.app.load();const html=o.app.page();
 assert.equal((html.match(/data-cm-upload data-course="course1"/g)||[]).length,2);
 assert.equal((html.match(/data-cm-folder data-course="course1"/g)||[]).length,2);
 assert.match(html,/Upload any file \(max 20 MB\)/);
 assert.match(html,/webkitdirectory directory multiple/);
 const s=setup({teacher:false});await s.app.load();const student=s.app.page();
 assert.doesNotMatch(student,/data-cm-folder/);
 assert.doesNotMatch(student,/data-cm-upload/);
});
test("teacher uploads arbitrary Python file privately, preserving extension and metadata",async()=>{
 const o=setup();await o.app.load();
 const file=new BrowserFile(["print('ok')"],"solution.py",{type:"text/x-python"});
 assert.equal(await o.app.change(o.input([file])),true);
 assert.equal(o.uploads.length,1);
 assert.match(o.uploads[0].key,/^notes\/course1\/teacher\/id123\.py$/);
 assert.equal(o.uploads[0].options.contentType,"application/octet-stream");
 assert.equal(o.uploads[0].file,file);
 assert.equal(o.rows.ns_assets[0].file_name,"solution.py");
 assert.equal(o.rows.ns_assets[0].byte_size,file.size);
 assert.equal(o.rows.ns_assets[0].mime_type,"application/octet-stream");
 assert.equal(o.rows.ns_assets[0].topic_id,"topic1");
});
test("uploaded folders become standard ZIP with nested paths and retained filenames",async()=>{
 const o=setup();await o.app.load();
 const files=[
  new BrowserFile(["print(1)"],"main.py",{relativePath:"PythonCourse/src/main.py",type:"text/x-python"}),
  new BrowserFile(["# Notes"],"readme.md",{relativePath:"PythonCourse/readme.md",type:"text/markdown"})
 ];
 assert.equal(await o.app.change(o.input(files,true)),true);
 assert.equal(o.uploads.length,1);
 const archive=o.uploads[0].file;
 assert.equal(archive.name,"PythonCourse.zip");assert.equal(archive.type,"application/zip");
 assert.equal(o.uploads[0].options.contentType,"application/octet-stream");
 assert.ok(archive.size>files[0].size+files[1].size);
 assert.equal(o.rows.ns_assets[0].file_name,"PythonCourse.zip");
 const buffer=Buffer.from(await archive.arrayBuffer());
 assert.equal(buffer.readUInt32LE(0),0x04034b50);
 assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50);
 assert.ok(buffer.includes(Buffer.from("PythonCourse/src/main.py")));
 assert.ok(buffer.includes(Buffer.from("PythonCourse/readme.md")));
});
test("20 MiB boundary allows exact single-file size, rejects oversized file and combined folder",async()=>{
 const o=setup();await o.app.load();
 const exact=new BrowserFile([new Uint8Array(20*1024*1024)],"exact.bin");
 assert.equal(await o.app.change(o.input([exact])),true);
 assert.equal(o.uploads.length,1);
 const bad=new BrowserFile([new Uint8Array(20*1024*1024+1)],"too-big.bin");
 assert.equal(await o.app.change(o.input([bad])),true);
 assert.equal(o.uploads.length,1);
 const files=[new BrowserFile([new Uint8Array(11*1024*1024)],"a",{relativePath:"Folder/a"}),
  new BrowserFile([new Uint8Array(10*1024*1024)],"b",{relativePath:"Folder/b"})];
 assert.equal(await o.app.change(o.input(files,true)),true);
 assert.equal(o.uploads.length,1);
 assert.equal(o.rows.ns_assets.length,1);
});
test("unsafe folder path and ZIP overhead beyond limit reject before server upload",async()=>{
 const o=setup();await o.app.load();
 const unsafe=[new BrowserFile(["x"],"script.js",{relativePath:"Folder/../script.js"})];
 await o.app.change(o.input(unsafe,true));
 assert.equal(o.uploads.length,0);
 const near=[new BrowserFile([new Uint8Array(20*1024*1024)],"near.bin",{relativePath:"Folder/near.bin"})];
 await o.app.change(o.input(near,true));
 assert.equal(o.uploads.length,0);
});
test("metadata insert failure cleans up the newly uploaded private blob",async()=>{
 const o=setup({failMetadata:true});await o.app.load();
 await o.app.change(o.input([new BrowserFile(["abc"],"sample.js",{type:"application/javascript"})]));
 assert.equal(o.uploads.length,1);
 assert.equal(o.removals.length,1);
 assert.deepEqual(o.removals[0],[o.uploads[0].key]);
 assert.equal(o.rows.ns_assets.length,0);
});
test("unknown and active content is downloaded using a signed attachment URL, not previewed",async()=>{
 const o=setup();await o.app.load();
 await o.app.change(o.input([new BrowserFile(["<script>alert(1)</script>"],"unsafe.html",{type:"text/html"})]));
 const attachment=o.rows.ns_assets[0];
 assert.equal(o.app.action("cm-open-file",{dataset:{path:attachment.file_path,name:attachment.file_name,mime:attachment.mime_type}}),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(o.signed.length,1);
 assert.equal(o.signed[0].options.download,"unsafe.html");
});
