"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");
const esc=x=>String(x??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
function setup({account="owner"}={}){
 const teacher="teacher-uuid",student="student-uuid",outsider="outsider-uuid";
 const rows={
  ns_courses:[
   {id:"python",owner_id:teacher,title:"Python",description:"Basics",invite_code:"code-python"},
   {id:"javascript",owner_id:teacher,title:"JavaScript",description:"DOM and events",invite_code:"code-js"},
   {id:"outsider",owner_id:outsider,title:"External course",description:"Student view",invite_code:"code-out"}
  ],
  ns_enrollments:[{course_id:"outsider",student_id:student,display_name:"Student"}],
  ns_chapters:[{id:"ch-py",course_id:"python",title:"Variables",position:0,created_at:"2026-01-01"}],
  ns_topics:[{id:"t-py",course_id:"python",chapter_id:"ch-py",title:"print",body:"",position:0,created_at:"2026-01-01"}],
  ns_assets:[{id:"a-py",course_id:"python",chapter_id:"ch-py",topic_id:"t-py",file_path:"notes/python/lecture.pdf",file_name:"lecture.pdf"},
    {id:"a-js",course_id:"javascript",chapter_id:null,topic_id:null,file_path:"notes/javascript/other.pdf",file_name:"other.pdf"}],
  ns_assignments:[{id:"hw-py",course_id:"python",title:"Homework",instructions:"Practice"}],
  ns_submissions:[{id:"sub-py",course_id:"python",assignment_id:"hw-py",student_id:student,file_path:"submissions/python/homework.pdf"}]
 };
 const operations=[],cleanups=[],notify=[];
 const currentId=account==="owner"?teacher:student;
 function builder(table,operation,values){
  let checks=[],cols="*";
  const obj={
   eq(key,value){checks.push([key,value]);return this},
   select(columns="*"){cols=columns;return this},
   limit:async()=>({data:rows[table].filter(row=>checks.every(([key,v])=>row[key]===v)).map(r=>cols==="file_path"?{file_path:r.file_path}:r),error:null}),
   maybeSingle:async()=>{
    const matches=rows[table].filter(row=>checks.every(([key,v])=>row[key]===v));
    // Mimic server's ns_courses RLS: students cannot modify other people's courses.
    const found=matches.find(row=>table!=="ns_courses"||row.owner_id===currentId);
    if(!found)return {data:null,error:null};
    operations.push({operation,table,id:found.id,values});
    if(operation==="update"){Object.assign(found,values);return {data:{id:found.id},error:null}}
    if(operation==="delete"){
     const id=found.id;
     rows[table]=rows[table].filter(row=>row!==found);
     if(table==="ns_courses")for(const child of Object.keys(rows).filter(x=>x!=="ns_courses"))
       rows[child]=rows[child].filter(row=>row.course_id!==id);
     return {data:{id},error:null};
    }
    return {data:{id:found.id},error:null};
   }
  };
  return obj;
 }
 const sb={
  from(table){return {select:cols=>builder(table,"select").select(cols),update:changes=>builder(table,"update",changes),delete:()=>builder(table,"delete")}},
  storage:{from:bucket=>({remove:async paths=>{cleanups.push({bucket,paths:[...paths]});return {error:null}}})}
 };
 const auth={getStatus:()=> "connected",getUser:()=>({id:currentId}),getClient:()=>sb};
 const win={NOVA:{escape:esc},NOVA_AUTH:auth,NOVA_I18N:{language:"en"},NOVA_VIEWS:{subjects:()=>""}};
 const FormData=class{constructor(form){this.form=form}get(k){return this.form.values?.[k]??null}};
 vm.runInNewContext(read("course-manager.js"),{window:win,FormData,queueMicrotask:()=>{},console,crypto:{randomUUID:()=>""}},{filename:"course-manager.js"});
 win.NOVA_COURSES.init({refresh:()=>{},toast:t=>notify.push(t)});
 // The real app renders once before initial async load to bind its current user.
 win.NOVA_COURSES.page();
 return {app:win.NOVA_COURSES,rows,operations,cleanups,notify};
}
test("every owner-selected course has independent Edit/Delete buttons beside Refresh",async()=>{
 const h=setup();await h.app.load();let markup=h.app.page();
 for(const id of ["python","javascript"]){
  if(id!=="python")h.app.action("cm-select",{dataset:{id}});
  markup=h.app.page();
  const a=markup.indexOf('data-action="cm-edit-course" data-id="'+id+'"');
  const b=markup.indexOf('data-action="cm-request-delete-course" data-id="'+id+'"');
  const c=markup.indexOf('data-action="cm-reload"');
  assert.ok(a>0&&b>a&&c>b,"action order for "+id);
  assert.equal((markup.match(/data-action="cm-edit-course"/g)||[]).length,1);
  assert.equal((markup.match(/data-action="cm-request-delete-course"/g)||[]).length,1);
 }
});
test("Edit opens populated form and persists only selected owner's title and description",async()=>{
 const h=setup();await h.app.load();
 h.app.action("cm-select",{dataset:{id:"javascript"}});
 h.app.action("cm-edit-course",{dataset:{id:"javascript"}});
 let html=h.app.page();
 assert.match(html,/id="cm-course-editor"/);
 assert.match(html,/name="title" maxlength="120" required value="JavaScript"/);
 assert.match(html,/>DOM and events<\/textarea>/);
 assert.match(html,/data-cm-form="course-edit" data-course="javascript"/);
 await h.app.submit({dataset:{cmForm:"course-edit",course:"javascript"},values:{title:"Modern JavaScript",description:"Browser APIs"}});
 assert.equal(h.rows.ns_courses.find(c=>c.id==="javascript").title,"Modern JavaScript");
 assert.equal(h.rows.ns_courses.find(c=>c.id==="python").title,"Python");
 assert.deepEqual(h.operations.map(o=>o.table),["ns_courses"]);
 assert.equal(h.operations[0].operation,"update");
 assert.equal(h.operations[0].id,"javascript");
 assert.doesNotMatch(h.app.page(),/id="cm-course-editor"/);
});
test("Delete requires typing exact course name; a wrong name never mutates database",async()=>{
 const h=setup();await h.app.load();
 h.app.action("cm-request-delete-course",{dataset:{id:"python"}});
 assert.match(h.app.page(),/Delete Course Permanently/);
 assert.match(h.app.page(),/name="confirm_title"/);
 await h.app.submit({dataset:{cmForm:"course-delete",course:"python"},values:{confirm_title:"Not Python"}});
 assert.equal(h.operations.length,0);
 assert.equal(h.rows.ns_courses.length,3);
 assert.equal(h.cleanups.length,0);
 assert.match(h.app.page(),/Course name does not match/);
});
test("confirmed course deletion cascades only selected records and cleans only its Storage keys",async()=>{
 const h=setup();await h.app.load();
 h.app.action("cm-request-delete-course",{dataset:{id:"python"}});
 await h.app.submit({dataset:{cmForm:"course-delete",course:"python"},values:{confirm_title:"Python"}});
 assert.equal(h.rows.ns_courses.length,2);
 assert.ok(h.rows.ns_courses.some(c=>c.id==="javascript"));
 assert.equal(h.rows.ns_chapters.length,0);
 assert.equal(h.rows.ns_assignments.length,0);
 assert.equal(h.rows.ns_submissions.length,0);
 assert.deepEqual(h.operations.map(o=>[o.operation,o.table,o.id]),[["delete","ns_courses","python"]]);
 const paths=h.cleanups.flatMap(x=>x.paths);
 assert.deepEqual(paths.sort(),["notes/python/lecture.pdf","submissions/python/homework.pdf"].sort());
 assert.ok(!paths.some(s=>s.includes("javascript")));
 assert.match(h.app.page(),/JavaScript/);
});
test("student and forged owner action cannot open Edit/Delete or mutate courses",async()=>{
 const h=setup({account:"student"});await h.app.load();
 h.app.action("cm-select",{dataset:{id:"outsider"}});
 assert.doesNotMatch(h.app.page(),/data-action="cm-edit-course"|data-action="cm-request-delete-course"/);
 h.app.action("cm-edit-course",{dataset:{id:"outsider"}});
 h.app.action("cm-request-delete-course",{dataset:{id:"outsider"}});
 assert.doesNotMatch(h.app.page(),/id="cm-course-editor"|id="cm-course-delete-confirm"/);
 await h.app.submit({dataset:{cmForm:"course-delete",course:"outsider"},values:{confirm_title:"External course"}});
 await h.app.submit({dataset:{cmForm:"course-edit",course:"outsider"},values:{title:"Hack",description:""}});
 assert.equal(h.operations.length,0);
 assert.equal(h.rows.ns_courses.find(c=>c.id==="outsider").title,"External course");
});
test("switching courses cancels previous course's edit/delete state",async()=>{
 const h=setup();await h.app.load();
 h.app.action("cm-edit-course",{dataset:{id:"python"}});
 assert.match(h.app.page(),/id="cm-course-editor"/);
 h.app.action("cm-select",{dataset:{id:"javascript"}});
 assert.doesNotMatch(h.app.page(),/id="cm-course-editor"/);
 h.app.action("cm-request-delete-course",{dataset:{id:"javascript"}});
 assert.match(h.app.page(),/id="cm-course-delete-confirm"/);
 h.app.action("cm-cancel-course",{dataset:{}});
 assert.doesNotMatch(h.app.page(),/id="cm-course-delete-confirm"/);
});
