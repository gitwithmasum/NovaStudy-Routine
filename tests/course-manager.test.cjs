"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","course-manager.js"),"utf8");
const htmlEscape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function fixture({signedIn=false}={}){
 const account={id:"teacher-uuid",email:"teacher@example.com",user_metadata:{full_name:"Teacher Name"}};
 const auth={getStatus:()=>signedIn?"connected":"guest",getUser:()=>signedIn?account:null,getClient:()=>({})};
 const window={NOVA:{escape:htmlEscape},NOVA_AUTH:auth,NOVA_I18N:{language:"en"},NOVA_VIEWS:{subjects:()=>"<p>Legacy subject data remains here</p>"}};
 const ctx={window,console,queueMicrotask:()=>{},crypto:{randomUUID:()=>"new-id"}};
 vm.runInNewContext(source,ctx,{filename:"course-manager.js"});
 let refreshed=0;window.NOVA_COURSES.init({refresh:()=>refreshed++,toast:()=>{}});
 return {app:window.NOVA_COURSES,window,refreshes:()=>refreshed};
}
test("exports course manager and preserves original subject library for guest users",()=>{
 const f=fixture(),html=f.app.page();
 assert.match(html,/Course & Notes Manager/);
 assert.match(html,/Google Sign-In required/);
 assert.match(html,/Legacy subject data remains here/);
 assert.match(html,/data-action="cm-login"/);
 assert.doesNotMatch(html,/Publish Homework/);
});
test("signed-in teacher can open Add Course, Join Course and Homework tabs",()=>{
 const f=fixture({signedIn:true});
 const html=f.app.page();
 assert.match(html,/data-action="cm-tab"/);
 assert.match(html,/\+ Add Course/);
 assert.match(html,/Homework & Submissions/);
 assert.match(html,/Join Course/);
 assert.match(html,/Legacy subject data remains here/);
 assert.equal(f.app.action("cm-tab",{dataset:{tab:"new"}}),true);
 assert.match(f.app.page(),/id="cmCourseForm"/);
 assert.match(f.app.page(),/Create Course/);
 assert.equal(f.app.action("cm-tab",{dataset:{tab:"join"}}),true);
 assert.match(f.app.page(),/id="cmJoinForm"/);
 assert.equal(f.app.action("cm-tab",{dataset:{tab:"homework"}}),true);
 assert.ok(f.refreshes()>=3);
});
test("student-provided profile text is HTML-escaped in join form",()=>{
 const f=fixture({signedIn:true});
 f.window.NOVA_AUTH.getUser=()=>({id:"u1",user_metadata:{full_name:'<img src=x onerror=alert(1)>'}});
 f.app.page();f.app.action("cm-tab",{dataset:{tab:"join"}});
 const html=f.app.page();
 assert.match(html,/&lt;img src=x/);
 assert.doesNotMatch(html,/<img src=x/);
});
test("unknown actions are left to legacy NovaStudy modules",()=>{
 const f=fixture();
 assert.equal(f.app.action("add-subject",{dataset:{}}),false);
 assert.equal(f.app.action(undefined,{dataset:{}}),false);
});

function courseFixture({asStudent=false}={}){
 const courseId="course-one",chapterId="chapter-one",topicId="topic-one";
 const teacherId="teacher-uuid",studentId="student-uuid";
 const rows={
  ns_courses:[{id:courseId,owner_id:teacherId,title:"Data Structures",description:"",invite_code:"abcdef"}],
  ns_enrollments:[{course_id:courseId,student_id:studentId,display_name:"Student"}],
  ns_chapters:[{id:chapterId,course_id:courseId,title:"Chapter 01",position:0,created_at:"2026-01-01"}],
  ns_topics:[{id:topicId,chapter_id:chapterId,course_id:courseId,title:"Variables",body:"",position:0,created_at:"2026-01-01"}],
  ns_assets:[{id:"file-one",course_id:courseId,chapter_id:chapterId,topic_id:null,file_name:"Lecture.png",file_path:"notes/course-one/teacher-uuid/picture.png",mime_type:"image/png",byte_size:100}],
  ns_assignments:[],ns_submissions:[]
 };
 const account={id:asStudent?studentId:teacherId,user_metadata:{full_name:asStudent?"Student":"Teacher"}};
 const auth={getStatus:()=>"connected",getUser:()=>account,getClient:()=>({
  from(table){return {select(){return {limit:async()=>({data:rows[table],error:null})}}}}
 })};
 const window={NOVA:{escape:htmlEscape},NOVA_AUTH:auth,NOVA_I18N:{language:"en"},
  NOVA_VIEWS:{subjects:()=>"<p>Legacy library retained</p>"}};
 const ctx={window,console,queueMicrotask:()=>{},crypto:{randomUUID:()=>"new-id"}};
 vm.runInNewContext(source,ctx,{filename:"course-manager.js"});
 window.NOVA_COURSES.init({refresh:()=>{},toast:()=>{}});
 return {app:window.NOVA_COURSES,rows};
}
test("teacher chapter has only one upload; topic has its own upload",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 const html=f.app.page();
 assert.equal((html.match(/data-cm-upload data-course="course-one" data-chapter="chapter-one" data-topic=""/g)||[]).length,1);
 assert.equal((html.match(/data-cm-upload data-course="course-one" data-chapter="chapter-one" data-topic="topic-one"/g)||[]).length,1);
 assert.match(html,/data-action="cm-edit-file"/);
 assert.match(html,/data-action="cm-request-delete-file"/);
 assert.match(html,/data-action="cm-open-file"/);
 assert.equal(f.app.action("cm-edit-file",{dataset:{id:"file-one"}}),true);
 assert.match(f.app.page(),/data-cm-form="asset-edit"/);
 assert.match(f.app.page(),/name="replacement"/);
 assert.equal(f.app.action("cm-request-delete-file",{dataset:{id:"file-one"}}),true);
 assert.match(f.app.page(),/Delete this file permanently/);
 assert.equal(f.app.action("cm-cancel-file",{dataset:{}}),true);
 assert.doesNotMatch(f.app.page(),/data-cm-form="asset-edit"/);
});
test("student can open files but has no file edit/delete/upload controls",async()=>{
 const f=courseFixture({asStudent:true});f.app.page();await f.app.load();
 const html=f.app.page();
 assert.match(html,/data-action="cm-open-file"/);
 assert.doesNotMatch(html,/data-action="cm-edit-file"/);
 assert.doesNotMatch(html,/data-action="cm-request-delete-file"/);
 assert.doesNotMatch(html,/data-cm-upload/);
 assert.equal(f.app.action("cm-edit-file",{dataset:{id:"file-one"}}),true);
 assert.doesNotMatch(f.app.page(),/data-cm-form="asset-edit"/);
});
