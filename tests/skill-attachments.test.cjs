"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const read=f=>fs.readFileSync(path.join(__dirname,"..",f),"utf8");
let seq=0;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function boot(){
 const records=new Map(),blobs=new Map(),downloads=[],names=[];
 let quota=false;
 const indexedDB={open(){
  const req={};
  queueMicrotask(()=>{
   req.result={objectStoreNames:{contains:()=>true},close(){},
    transaction(){
     const tx={oncomplete:null,onerror:null,onabort:null,objectStore(){return{
      put(value,key){return schedule("put",key,value)},
      get(key){return schedule("get",key)},
      delete(key){return schedule("delete",key)}
     }}};
     function schedule(op,key,value){
      const event={result:undefined};
      queueMicrotask(()=>{
       if(op==="put")blobs.set(key,value);
       if(op==="get")event.result=blobs.get(key);
       if(op==="delete")blobs.delete(key);
       event.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());
      });
      return event;
     }
     return tx;
    }};
   req.onsuccess?.();
  });
  return req;
 }};
 const w={indexedDB,NOVA_CATALOG:{university:{tracks:{"CSE / Software Engineering":["Python"]}}},
  NOVA_COLORS:["#12aaab"],NOVA_I18N:{language:"en",number:v=>String(v),displayDate:v=>v,t:x=>x},confirm:()=>true};
 class TestURL extends URL{}
 TestURL.createObjectURL=blob=>{downloads.push(blob);return "blob:test"};
 TestURL.revokeObjectURL=()=>{};
 const document={body:{appendChild(){}},createElement(){return{download:"",click(){names.push(this.download)},remove(){}}}};
 const ctx={window:w,localStorage:{getItem:k=>records.get(k)??null,setItem(k,v){if(quota)throw Error("quota");records.set(k,String(v))}},
  Date,JSON,Math,Set,Map,Number,String,Array,Object,URL:TestURL,Uint8Array,DataView,TextEncoder,Blob,
  document,setTimeout:()=>{},crypto:{randomUUID:()=>String(++seq)},
  FormData:class{constructor(form){this.form=form}get(key){return this.form.fields?.[key]??null}getAll(key){return this.form.folder?.[key]||[]}}
 };
 for(const f of ["challenge-data.js","core.js","challenge.js","learning-hub.js"])vm.runInNewContext(read(f),ctx,{filename:f});
 const hub=w.NOVA_LEARNING_HUB;hub.init({refresh:()=>{},toast:()=>{}});
 const form=(kind,fields={},folder=[])=>({id:"hubItemForm",dataset:{skill:"skill-dsa",module:"dsa-arrays",item:""},
  fields:{title:"Study material",kind,body:"",url:"",pdf_file:null,upload_file:null,...fields},folder:{folder_files:folder}});
 const items=()=>hub.activeSkills().find(s=>s.id==="skill-dsa").modules[0].items;
 return {hub,form,items,blobs,downloads,names,setQuota:v=>quota=v};
}
function file(name,content,relative=""){
 const bytes=new TextEncoder().encode(content);
 return{name,size:bytes.length,type:"application/octet-stream",webkitRelativePath:relative,
  arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
}
test("modules expose PDF, file and directory selection with 20 MB limit",()=>{
 const b=boot();b.hub.selectTab("skills");b.hub.handle("hub-skill-open",{dataset:{id:"skill-dsa"}});
 b.hub.handle("hub-item-add",{dataset:{skill:"skill-dsa",module:"dsa-arrays"}});
 const html=b.hub.page();
 for(const x of ['value="file"','value="folder"','name="upload_file"','webkitdirectory','20 MB'])
  assert.ok(html.includes(x),x);
});
test("arbitrary files save, download and keep local metadata",async()=>{
 const b=boot(),f=file("algorithm.cpp","int main(){}");
 assert.equal(await b.hub.submit(b.form("file",{upload_file:f})),true);
 const item=b.items()[0];
 assert.equal(item.fileName,"algorithm.cpp");
 assert.equal(item.totalBytes,f.size);
 assert.equal(b.blobs.get(item.localId),f);
 assert.equal(b.hub.valid(b.hub.get()),true);
 b.hub.handle("hub-attachment-download",{dataset:{skill:"skill-dsa",module:"dsa-arrays",id:item.id}});
 await tick();await tick();
 assert.equal(b.names[0],"algorithm.cpp");
 assert.equal(b.downloads.length,1);
});
test("folder upload produces ZIP with nested relative paths",async()=>{
 const b=boot(),folder=[file("main.py","print(1)","Course/src/main.py"),
  file("notes.md","# topic","Course/notes.md")];
 assert.equal(await b.hub.submit(b.form("folder",{},folder)),true);
 const item=b.items()[0];
 assert.equal(item.fileCount,2);
 assert.equal(item.totalBytes,folder.reduce((n,x)=>n+x.size,0));
 assert.equal(b.blobs.get(item.localId).files[0].path,"Course/src/main.py");
 b.hub.handle("hub-attachment-download",{dataset:{skill:"skill-dsa",module:"dsa-arrays",id:item.id}});
 await tick();await tick();
 assert.equal(b.names[0],"Course.zip");
 const binary=new Uint8Array(await b.downloads[0].arrayBuffer()),view=new DataView(binary.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 assert.equal(view.getUint32(binary.length-22,true),0x06054b50);
 const text=Buffer.from(binary).toString("latin1");
 assert.ok(text.includes("Course/src/main.py"));assert.ok(text.includes("Course/notes.md"));
});
test("20 MB caps, unsafe paths and quota rollback preserve existing learning state",async()=>{
 const b=boot(),huge={...file("oversized.zip","hi"),size:20*1024*1024+1};
 assert.equal(await b.hub.submit(b.form("file",{upload_file:huge})),false);
 assert.equal(await b.hub.submit(b.form("pdf",{pdf_file:{...huge,name:"course.pdf"}})),false);
 const bigFolder=[{...file("a","a","Folder/a"),size:11*1024*1024},
  {...file("b","b","Folder/b"),size:10*1024*1024}];
 assert.equal(await b.hub.submit(b.form("folder",{},bigFolder)),false);
 assert.equal(await b.hub.submit(b.form("folder",{},[file("evil","x","Folder/../evil")])),false);
 b.setQuota(true);
 assert.equal(await b.hub.submit(b.form("file",{upload_file:file("safe.py","print(1)")})),false);
 assert.equal(b.items().length,0);assert.equal(b.blobs.size,0);
});
test("original PDF links and local PDF files remain compatible",async()=>{
 const b=boot();
 assert.equal(await b.hub.submit(b.form("pdf",{url:"https://example.com/course.pdf"})),true);
 assert.equal(await b.hub.submit(b.form("pdf",{pdf_file:file("guide.pdf","%PDF-1.7")})),true);
 assert.equal(b.items().length,2);
 assert.equal(b.items()[0].localId,"");
 assert.ok(b.items()[1].localId);
 assert.equal(b.hub.valid(b.hub.get()),true);
});

test("CP topic stores file and folder attachments beneath the selected topic",async()=>{
 const b=boot(),cp=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id==="dsa-cp-basics");
 const topic=cp.items[0],f=file("answer.py","print(42)");
 const upload={...b.form("file",{title:"Solution file",upload_file:f}),dataset:{skill:"skill-dsa",module:cp.id,item:"",parentTopic:topic.id}};
 assert.equal(await b.hub.submit(upload),true);
 const latest=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id);
 const child=latest.items.find(i=>i.parentTopicId===topic.id);
 assert.equal(child.kind,"file");
 assert.equal(child.fileName,"answer.py");
 assert.equal(b.blobs.get(child.localId),f);
 assert.equal(b.hub.valid(b.hub.get()),true);
 b.hub.handle("hub-skill-open",{dataset:{id:"skill-dsa"}});
 b.hub.handle("hub-dsa-part",{dataset:{id:"cp"}});
 b.hub.handle("hub-module-toggle",{dataset:{id:cp.id}});
 assert.match(b.hub.page(),/Topic files &amp; folders|Topic files & folders/);
 assert.match(b.hub.page(),/answer.py/);
 b.hub.handle("hub-attachment-download",{dataset:{skill:"skill-dsa",module:cp.id,id:child.id}});
 await tick();await tick();
 assert.equal(b.names[0],"answer.py");
 const folder=[file("main.py","print(1)","Contest/src/main.py"),file("readme.md","# intro","Contest/readme.md")];
 const bundle={...b.form("folder",{title:"Contest folder"},folder),dataset:{skill:"skill-dsa",module:cp.id,item:"",parentTopic:topic.id}};
 assert.equal(await b.hub.submit(bundle),true);
 const folderItem=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id).items.at(-1);
 assert.equal(folderItem.kind,"folder");
 assert.equal(folderItem.parentTopicId,topic.id);
 b.hub.handle("hub-attachment-download",{dataset:{skill:"skill-dsa",module:cp.id,id:folderItem.id}});
 await tick();await tick();
 assert.equal(b.names.at(-1),"Contest.zip");
});
test("Removing CP attachment keeps parent; deleting CP topic cascades stored files",async()=>{
 const b=boot(),cp=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id==="dsa-cp-basics");
 const topic=cp.items[0],f=file("solution.py","print(1)");
 const upload={...b.form("file",{title:"Answer",upload_file:f}),dataset:{skill:"skill-dsa",module:cp.id,item:"",parentTopic:topic.id}};
 assert.equal(await b.hub.submit(upload),true);
 const first=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id).items.at(-1);
 b.hub.handle("hub-item-delete",{dataset:{skill:"skill-dsa",module:cp.id,id:first.id}});
 await tick();await tick();
 assert.equal(b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id).items.some(x=>x.id===topic.id),true);
 assert.equal(b.blobs.has(first.localId),false);
 assert.equal(await b.hub.submit(upload),true);
 const second=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id).items.at(-1);
 b.hub.handle("hub-item-delete",{dataset:{skill:"skill-dsa",module:cp.id,id:topic.id}});
 await tick();await tick();
 const items=b.hub.activeSkills().find(s=>s.id==="skill-dsa").modules.find(m=>m.id===cp.id).items;
 assert.equal(items.some(x=>x.id===topic.id||x.parentTopicId===topic.id),false);
 assert.equal(b.blobs.has(second.localId),false);
});
test("CP nested uploads enforce 20 MB limits and forbid cross-module parent IDs",async()=>{
 const b=boot(),large={...file("big.zip","x"),size:20*1024*1024+1};
 const bad={...b.form("file",{title:"Oversized",upload_file:large}),dataset:{skill:"skill-dsa",module:"dsa-cp-basics",item:"",parentTopic:"dsa-cp-basics-topic-01"}};
 assert.equal(await b.hub.submit(bad),false);
 const wrong={...b.form("file",{title:"Wrong",upload_file:file("a.py","x")}),dataset:{skill:"skill-dsa",module:"dsa-arrays",item:"",parentTopic:"dsa-cp-basics-topic-01"}};
 assert.equal(await b.hub.submit(wrong),false);
 assert.equal(b.hub.valid(b.hub.get()),true);
});
