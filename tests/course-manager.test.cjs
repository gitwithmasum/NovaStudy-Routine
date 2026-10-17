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

test("teacher can edit chapter/title, edit topic/title, and edit or delete only written notes",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 f.rows.ns_topics[0].body="A variable stores information.";
 let html=f.app.page();
 for(const name of ["cm-edit-chapter","cm-request-delete-chapter","cm-edit-topic","cm-request-delete-topic","cm-edit-note","cm-request-delete-note"])
  assert.match(html,new RegExp('data-action="'+name+'"'),name);
 assert.match(html,/A variable stores information/);
 assert.doesNotMatch(html,/data-cm-form="topic-body"/);
 assert.equal(f.app.action("cm-edit-chapter",{dataset:{id:"chapter-one"}}),true);
 assert.match(f.app.page(),/data-cm-form="chapter-edit"/);
 assert.equal(f.app.action("cm-cancel-entity",{dataset:{}}),true);
 assert.equal(f.app.action("cm-edit-topic",{dataset:{id:"topic-one"}}),true);
 assert.match(f.app.page(),/data-cm-form="topic-edit"/);
 assert.equal(f.app.action("cm-cancel-entity",{dataset:{}}),true);
 assert.equal(f.app.action("cm-edit-note",{dataset:{id:"topic-one"}}),true);
 assert.match(f.app.page(),/data-cm-form="topic-body"/);
 assert.match(f.app.page(),/A variable stores information/);
 assert.equal(f.app.action("cm-cancel-entity",{dataset:{}}),true);
 assert.doesNotMatch(f.app.page(),/data-cm-form="topic-body"/);
 assert.equal(f.app.action("cm-request-delete-note",{dataset:{id:"topic-one"}}),true);
 assert.match(f.app.page(),/Delete only the written notes/);
 assert.match(f.app.page(),/uploaded PDF\/images will be preserved/);
 assert.doesNotMatch(f.app.page(),/data-action="cm-confirm-delete-topic"/);
});
test("owner deletion confirmation explains chapter/topic cascading data loss",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 assert.equal(f.app.action("cm-request-delete-chapter",{dataset:{id:"chapter-one"}}),true);
 assert.match(f.app.page(),/Deleting this chapter permanently removes its/);
 assert.match(f.app.page(),/1 topics and 1 attached files/);
 assert.match(f.app.page(),/data-action="cm-confirm-delete-chapter"/);
 assert.equal(f.app.action("cm-cancel-entity",{dataset:{}}),true);
 assert.doesNotMatch(f.app.page(),/data-action="cm-confirm-delete-chapter"/);
 assert.equal(f.app.action("cm-request-delete-topic",{dataset:{id:"topic-one"}}),true);
 assert.match(f.app.page(),/Permanently delete this topic/);
 assert.match(f.app.page(),/data-action="cm-confirm-delete-topic"/);
});
test("student cannot see or open chapter/topic or written-note edit and delete controls",async()=>{
 const f=courseFixture({asStudent:true});f.app.page();await f.app.load();
 f.rows.ns_topics[0].body="Student can read but not modify";
 let html=f.app.page();
 assert.match(html,/Student can read but not modify/);
 for(const action of ["edit-chapter","request-delete-chapter","edit-topic","request-delete-topic","edit-note","request-delete-note"])
  assert.doesNotMatch(html,new RegExp('data-action="cm-'+action+'"'),action);
 assert.equal(f.app.action("cm-edit-chapter",{dataset:{id:"chapter-one"}}),true);
 assert.equal(f.app.action("cm-edit-topic",{dataset:{id:"topic-one"}}),true);
 assert.equal(f.app.action("cm-request-delete-note",{dataset:{id:"topic-one"}}),true);
 html=f.app.page();
 assert.doesNotMatch(html,/data-cm-form="chapter-edit"/);
 assert.doesNotMatch(html,/data-cm-form="topic-edit"/);
 assert.doesNotMatch(html,/data-cm-form="topic-body"/);
});

test("short Edit/Delete labels align at the chapter top-right, topic header and note header",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 f.rows.ns_topics[0].body="Example written notes";
 const html=f.app.page();
 // Chapter title and owner actions share a real flex header; no absolute overlay or summary nesting.
 assert.match(html,/<section class="cm-chapter-shell" data-chapter-id="chapter-one" data-open="true"><div class="cm-chapter-heading">/);
 assert.match(html,/<button type="button" class="cm-chapter-toggle" data-action="cm-toggle-chapter"[^>]*><strong>Chapter 1 — Chapter 01<\/strong>/);
 assert.match(html,/<\/button><div class="cm-chapter-header-actions cm-compact-actions"/);
 assert.match(html,/data-action="cm-edit-chapter"[^>]*>Edit<\/button>/);
 assert.match(html,/data-action="cm-request-delete-chapter"[^>]*>Delete<\/button>/);
 assert.match(html,/aria-label="Edit chapter: Chapter 01"/);
 assert.match(html,/aria-label="Delete chapter: Chapter 01"/);
 assert.doesNotMatch(html,/>Edit Chapter<\/button>|>Delete Chapter<\/button>/);
 // Topic and written note controls belong to the same title row.
 assert.match(html,/<div class="cm-section-heading"><b>Topic 1: Variables<\/b><div class="cm-section-actions cm-compact-actions"/);
 assert.match(html,/<div class="cm-section-heading cm-note-heading"><strong>Written Notes<\/strong><div class="cm-section-actions cm-compact-actions"/);
 assert.match(html,/data-action="cm-edit-topic"[^>]*>Edit<\/button>/);
 assert.match(html,/data-action="cm-request-delete-topic"[^>]*>Delete<\/button>/);
 assert.match(html,/data-action="cm-edit-note"[^>]*>Edit<\/button>/);
 assert.match(html,/data-action="cm-request-delete-note"[^>]*>Delete<\/button>/);
 assert.equal((html.match(/data-action="cm-edit-chapter"/g)||[]).length,1);
 assert.equal((html.match(/data-action="cm-request-delete-chapter"/g)||[]).length,1);
 assert.match(html,/class="cm-chapter-header-actions cm-compact-actions"/);
 // Edit/Delete remain in the row with an actual independent collapse button.
 const heading=html.slice(html.indexOf('<div class="cm-chapter-heading">'),html.indexOf('<div class="cm-chapter-inner"'));
 assert.ok(heading.indexOf('data-action="cm-toggle-chapter"') < heading.indexOf('data-action="cm-edit-chapter"'));
 assert.ok(heading.indexOf('data-action="cm-edit-chapter"') < heading.indexOf('data-action="cm-request-delete-chapter"'));
});
test("empty written note exposes a compact Add action, not a destructive Delete",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 const html=f.app.page();
 assert.match(html,/data-action="cm-edit-note"[^>]*>Add<\/button>/);
 assert.doesNotMatch(html,/data-action="cm-request-delete-note"/);
});

test("chapter actions remain visible when chapter is collapsed; toggle does not trigger Edit/Delete",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 const open=f.app.page();
 assert.match(open,/data-chapter-id="chapter-one" data-open="true"/);
 assert.match(open,/<div class="cm-chapter-inner" id="cm-chapter-content-chapter-one" >/);
 assert.equal(f.app.action("cm-toggle-chapter",{dataset:{id:"chapter-one"}}),true);
 const closed=f.app.page();
 assert.match(closed,/data-chapter-id="chapter-one" data-open="false"/);
 assert.match(closed,/<div class="cm-chapter-inner" id="cm-chapter-content-chapter-one" hidden>/);
 assert.match(closed,/data-action="cm-edit-chapter"[^>]*>Edit<\/button>/);
 assert.match(closed,/data-action="cm-request-delete-chapter"[^>]*>Delete<\/button>/);
 assert.doesNotMatch(closed,/data-cm-form="chapter-edit"/);
 assert.equal(f.app.action("cm-edit-chapter",{dataset:{id:"chapter-one"}}),true);
 const expanded=f.app.page();
 assert.match(expanded,/data-chapter-id="chapter-one" data-open="true"/);
 assert.match(expanded,/data-cm-form="chapter-edit"/);
 assert.equal(f.app.action("cm-cancel-entity",{dataset:{}}),true);
 assert.equal(f.app.action("cm-toggle-chapter",{dataset:{id:"chapter-one"}}),true);
 assert.match(f.app.page(),/data-chapter-id="chapter-one" data-open="false"/);
});
test("student still sees chapter title and toggle but no owner-only Edit/Delete",async()=>{
 const f=courseFixture({asStudent:true});f.app.page();await f.app.load();
 const html=f.app.page();
 assert.match(html,/data-action="cm-toggle-chapter"/);
 assert.match(html,/Chapter 1 — Chapter 01/);
 assert.doesNotMatch(html,/data-action="cm-edit-chapter"/);
 assert.doesNotMatch(html,/data-action="cm-request-delete-chapter"/);
});

test("course owner sees Join Code and Students buttons with spacing beside Refresh; panels start closed",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 const html=f.app.page();
 const header=html.slice(html.indexOf('<div class="cm-course-header">'),html.indexOf('</div></div>',html.indexOf('<div class="cm-course-header">'))+12);
 assert.match(html,/<div class="cm-course-header">/);
 assert.match(header,/<div class="cm-course-actions" role="group"/);
 const a=header.indexOf('data-action="cm-toggle-owner-panel" data-panel="code"');
 const b=header.indexOf('data-action="cm-toggle-owner-panel" data-panel="students"');
 const edit=header.indexOf('data-action="cm-edit-course" data-id="course-one"');
 const del=header.indexOf('data-action="cm-request-delete-course" data-id="course-one"');
 const c=header.indexOf('data-action="cm-reload"');
 assert.ok(a>0&&a<b&&b<edit&&edit<del&&del<c,"Join Code → Enrolled Students → Edit Course → Delete Course → Refresh order");
 assert.match(header,/data-panel="code" aria-expanded="false"/);
 assert.match(header,/data-panel="students" aria-expanded="false"/);
 assert.match(header,/>Join Code<\/button>/);
 assert.match(header,/>Enrolled Students \(1\)<\/button>/);
 assert.doesNotMatch(html,/id="cm-owner-code" role="region"/);
 assert.doesNotMatch(html,/id="cm-owner-students" role="region"/);
 assert.doesNotMatch(html,/cm-invite"><span>/);
 assert.doesNotMatch(html,/<details class="cm-members">/);
});
test("Join Code and Enrolled Students open exclusively; copy and member removal still available",async()=>{
 const f=courseFixture();f.app.page();await f.app.load();
 let html=f.app.page();
 assert.equal(f.app.action("cm-toggle-owner-panel",{dataset:{panel:"code"}}),true);
 html=f.app.page();
 assert.match(html,/id="cm-owner-code" class="cm-owner-panel cm-invite"/);
 assert.match(html,/<code>abcdef<\/code>/);
 assert.match(html,/data-action="cm-copy" data-id="abcdef"/);
 assert.match(html,/data-panel="code" aria-expanded="true"/);
 assert.doesNotMatch(html,/id="cm-owner-students"/);
 assert.equal(f.app.action("cm-toggle-owner-panel",{dataset:{panel:"students"}}),true);
 html=f.app.page();
 assert.doesNotMatch(html,/id="cm-owner-code"/);
 assert.match(html,/id="cm-owner-students" class="cm-owner-panel cm-members"/);
 assert.match(html,/>Student<\/span>/);
 assert.match(html,/data-action="cm-remove-student" data-id="course-one" data-student="student-uuid"/);
 assert.match(html,/data-panel="students" aria-expanded="true"/);
 assert.equal(f.app.action("cm-toggle-owner-panel",{dataset:{panel:"students"}}),true);
 assert.doesNotMatch(f.app.page(),/id="cm-owner-students"/);
});
test("student cannot see teacher Join Code or student list buttons, even with crafted actions",async()=>{
 const f=courseFixture({asStudent:true});f.app.page();await f.app.load();
 const html=f.app.page();
 assert.match(html,/<div class="cm-course-actions" role="group"/);
 assert.match(html,/data-action="cm-reload"/);
 assert.doesNotMatch(html,/data-action="cm-toggle-owner-panel"/);
 assert.doesNotMatch(html,/id="cm-owner-code"/);
 assert.doesNotMatch(html,/id="cm-owner-students"/);
 assert.doesNotMatch(html,/abcdef/);
 assert.doesNotMatch(html,/data-action="cm-edit-course"|data-action="cm-request-delete-course"/);
 assert.equal(f.app.action("cm-edit-course",{dataset:{id:"course-one"}}),true);
 assert.equal(f.app.action("cm-request-delete-course",{dataset:{id:"course-one"}}),true);
 assert.doesNotMatch(f.app.page(),/id="cm-course-editor"|id="cm-course-delete-confirm"/);
 assert.equal(f.app.action("cm-toggle-owner-panel",{dataset:{panel:"code"}}),true);
 assert.equal(f.app.action("cm-toggle-owner-panel",{dataset:{panel:"students"}}),true);
 assert.doesNotMatch(f.app.page(),/id="cm-owner-code"|id="cm-owner-students"/);
});
