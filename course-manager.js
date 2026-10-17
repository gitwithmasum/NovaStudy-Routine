/* NovaStudy Courses & Notes + teacher/student homework. Cloud-only: does not change local routine state. */
(function courseManagerModule(){
"use strict";
const N=window.NOVA,Auth=window.NOVA_AUTH;
const e=value=>N.escape(String(value??""));
const tr=(en,bn)=>window.NOVA_I18N?.language==="bn"?bn:en;
const empty=()=>({courses:[],enrollments:[],chapters:[],topics:[],assets:[],assignments:[],submissions:[]});
let data=empty(),selected="",tab="courses",busy=false,loading=false,loadedUser="",message="",refresh=()=>{},toast=()=>{},editingAsset="",deletingAsset="",editingChapter="",deletingChapter="",editingTopic="",deletingTopic="",editingNote="",deletingNote="",openedChapters=null;
const TABLES={courses:"ns_courses",enrollments:"ns_enrollments",chapters:"ns_chapters",topics:"ns_topics",assets:"ns_assets",assignments:"ns_assignments",submissions:"ns_submissions"};
const bucket="novastudy-learning";
const user=()=>Auth.getStatus()==="connected"?Auth.getUser():null;
const client=()=>Auth.getClient?.();
const owner=c=>!!(user()&&c&&c.owner_id===user().id);
const by=(key,id)=>data[key].filter(x=>x.course_id===id);
const button=(label,action,extras="",cls="secondary-btn")=>'<button type="button" class="'+cls+'" data-action="cm-'+action+'" '+extras+'>'+label+'</button>';
const msg=(text,isError=false)=>{message=String(text||"").slice(0,250);if(isError)toast(message);refresh()};
function rememberOpenChapters(){
 if(typeof document==="undefined")return;
 const nodes=Array.from(document.querySelectorAll(".cm-chapter-shell[data-chapter-id]"));
 if(nodes.length)openedChapters=new Set(nodes.filter(node=>node.dataset.open==="true").map(node=>node.dataset.chapterId));
}
function resetEntityEditors(){editingChapter="";deletingChapter="";editingTopic="";deletingTopic="";editingNote="";deletingNote="";}
function init(a){refresh=a.refresh||refresh;toast=a.toast||toast;}
function authChanged(){loadedUser="";data=empty();selected="";openedChapters=null;resetEntityEditors();editingAsset="";deletingAsset="";if(!loading)refresh();}
function page(){
 const u=user();if((u?.id||"")!==loadedUser&&!loading){loadedUser=u?.id||"";data=empty();selected="";if(u)queueMicrotask(load);}
 const legacy='<details class="cm-legacy"><summary>'+tr("Legacy subject library (existing subjects and routines preserved)","আগের Subject Library (পুরোনো রুটিন ও তথ্য অক্ষত)")+'</summary>'+window.NOVA_VIEWS.subjects()+'</details>';
 const heading='<div class="page-head"><div><span class="eyebrow">LEARNING WORKSPACE / COURSE MANAGEMENT</span><h1 class="view-title">'+tr("Course & Notes Manager","কোর্স ও নোটস ম্যানেজার")+'</h1><p class="subheading">'+tr("Build courses, organize chapters and topics, share notes, assign and submit homework.","কোর্স, অধ্যায়, টপিক, নোটস ও হোমওয়ার্ক এক জায়গায় পরিচালনা করো।")+'</p></div></div>';
 if(!u)return heading+'<section class="panel cm-panel"><h2>'+tr("Google Sign-In required","Google Sign-In প্রয়োজন")+'</h2><p>'+tr("Course sharing and student submissions require a verified Google account and internet. Your existing local subjects still work below.","শিক্ষার্থীকে কোর্স দেওয়া ও হোমওয়ার্ক জমা নেওয়ার জন্য Google account এবং ইন্টারনেট প্রয়োজন। আগের Subjects নিচে পাওয়া যাবে।")+'</p>'+button(tr("Sign in with Google","Google দিয়ে লগইন"),"login")+'</section>'+legacy;
 const nav='<div class="cm-tabs" role="group" aria-label="Course manager sections">'+[
 ["courses",tr("My Courses","আমার কোর্স")],["new",tr("+ Add Course","+ কোর্স যোগ")],
 ["homework",tr("Homework & Submissions","হোমওয়ার্ক ও জমা দেওয়া কাজ")],["join",tr("Join Course","কোর্সে যোগ দিন")]
 ].map(([key,name])=>button(name,"tab",'data-tab="'+key+'" aria-pressed="'+(tab===key)+'"',tab===key?"primary-btn":"secondary-btn")).join("")+'</div>';
 const stats='<div class="cm-stats"><span><b>'+data.courses.length+'</b> '+tr("Courses","কোর্স")+'</span><span><b>'+data.chapters.length+'</b> '+tr("Chapters","অধ্যায়")+'</span><span><b>'+data.assignments.length+'</b> '+tr("Homework","হোমওয়ার্ক")+'</span><span><b>'+data.submissions.length+'</b> '+tr("Submissions","সাবমিশন")+'</span></div>';
 let body=loading?'<div class="panel cm-panel" role="status">'+tr("Loading shared courses…","কোর্স লোড হচ্ছে…")+'</div>':tab==="new"?renderNew():tab==="join"?renderJoin():tab==="homework"?renderHomework():renderCourses();
 return heading+'<div class="cm-root">'+stats+nav+(message?'<p class="cm-message" role="status">'+e(message)+'</p>':"")+body+'</div>'+legacy;
}
async function load(){
 const u=user(),sb=client();if(!u||!sb){loading=false;refresh();return}
 const uid=u.id;loading=true;refresh();
 try{
  const entries=await Promise.all(Object.entries(TABLES).map(async ([key,table])=>{
   const {data:rows,error}=await sb.from(table).select("*").limit(1200);
   if(error)throw error;
   return [key,rows||[]];
  }));
  if(user()?.id!==uid)return;
  data=Object.fromEntries(entries);
  if(!data.courses.some(c=>c.id===selected)){selected=data.courses[0]?.id||"";openedChapters=null;}
  message="";
 }catch(err){if(user()?.id===uid)message=tr("Could not load courses: ","কোর্স লোড করা যায়নি: ")+String(err.message||err).slice(0,150)}
 finally{loading=false;refresh()}
}
async function reload(){if(!user())return;loadedUser=user().id;await load();}
function renderNew(){return '<section class="panel cm-panel"><h2>'+tr("Create a new course","নতুন কোর্স তৈরি")+'</h2><form id="cmCourseForm" class="cm-form"><label>'+tr("Course name","কোর্সের নাম")+'<input name="title" maxlength="120" placeholder="e.g. Data Structures" required></label><label>'+tr("Description (optional)","বিবরণ (ঐচ্ছিক)")+'<textarea name="description" maxlength="1200" rows="3" placeholder="What will students learn?"></textarea></label><button class="primary-btn" type="submit">'+tr("Create Course","কোর্স তৈরি করো")+'</button></form><p class="cm-muted">'+tr("You become the owner (teacher). Share the generated join code only with your students.","কোর্স তৈরি করলে তুমি Teacher হবে। তৈরি হওয়া Join Code শিক্ষার্থীদের দেবে।")+'</p></section>';}
function renderJoin(){return '<section class="panel cm-panel"><h2>'+tr("Join a teacher’s course","শিক্ষকের কোর্সে যোগ দাও")+'</h2><form id="cmJoinForm" class="cm-form"><label>'+tr("Course join code","কোর্সের Join Code")+'<input name="code" maxlength="64" required autocomplete="off" placeholder="Paste your course code"></label><label>'+tr("Student name","শিক্ষার্থীর নাম")+'<input name="student" maxlength="120" required value="'+e(user()?.user_metadata?.full_name||"")+'" placeholder="Your name"></label><button class="primary-btn" type="submit">'+tr("Join Course","কোর্সে যোগ দাও")+'</button></form></section>';}
function currentCourse(){return data.courses.find(c=>c.id===selected)||null}
function coursePicker(){return '<div class="cm-course-pills">'+data.courses.map(c=>button(e(c.title), "select",'data-id="'+c.id+'"',c.id===selected?"primary-btn":"secondary-btn")).join("")+'</div>'}
function noCourses(){return '<section class="panel cm-panel"><h2>'+tr("No shared courses yet","এখনো কোনো কোর্স নেই")+'</h2><p>'+tr("Create your own course, or join using a teacher’s course code.","নিজে কোর্স তৈরি করো অথবা শিক্ষকের কোড দিয়ে যোগ দাও।")+'</p>'+button("+ Add Course","tab",'data-tab="new"')+" "+button(tr("Join a Course","কোর্সে যোগ দাও"),"tab",'data-tab="join"')+'</section>'}
function renderCourses(){
 if(!data.courses.length)return noCourses();
 const c=currentCourse(),isOwner=owner(c),members=by("enrollments",c.id);
 const chapters=by("chapters",c.id).sort((a,b)=>a.position-b.position||a.created_at.localeCompare(b.created_at));
 const invite=isOwner?'<div class="cm-invite"><span>'+tr("Student join code","শিক্ষার্থীর Join Code")+'</span><code>'+e(c.invite_code)+'</code>'+button(tr("Copy Code","কোড কপি"),"copy",'data-id="'+e(c.invite_code)+'"')+'</div>':"";
 const add=isOwner?'<form class="cm-inline" data-cm-form="chapter" data-course="'+c.id+'"><input name="title" maxlength="150" required placeholder="'+tr("New chapter title","নতুন অধ্যায়ের নাম")+'"><button class="secondary-btn" type="submit">+ '+tr("Add Chapter","অধ্যায় যোগ")+'</button></form>':"";
 const membersBox=isOwner?'<details class="cm-members"><summary>'+tr("Enrolled Students","ভর্তিকৃত শিক্ষার্থী")+' ('+members.length+')</summary>'+ (members.length?members.map(m=>'<div class="cm-member"><span>'+e(m.display_name||"Student")+'</span>'+button(tr("Remove","সরাও"),"remove-student",'data-id="'+c.id+'" data-student="'+m.student_id+'"')+'</div>').join(""):'<p class="cm-muted">'+tr("No students have joined yet.","এখনো শিক্ষার্থী যোগ দেয়নি।")+'</p>')+'</details>':"";
 return coursePicker()+'<section class="panel cm-panel"><div class="cm-flex"><div><span class="eyebrow">'+(isOwner?"TEACHER / OWNER":"STUDENT / ENROLLED")+'</span><h2>'+e(c.title)+'</h2><p class="cm-muted">'+e(c.description)+'</p></div>'+button(tr("Refresh","রিফ্রেশ"),"reload")+'</div>'+invite+membersBox+'<h3>'+tr("Chapters & Topics","অধ্যায় ও টপিক")+'</h3>'+add+(chapters.length?chapters.map((ch,i)=>renderChapter(c,ch,i+1,isOwner)).join(""):'<p class="cm-muted">'+tr("No chapters yet. Add the first chapter.","কোনো অধ্যায় নেই। প্রথম অধ্যায় যোগ করো।")+'</p>')+'</section>';
}
function fileList(courseId,chapterId,topicId,isOwner=false){
 const attachments=by("assets",courseId).filter(a=>topicId?a.topic_id===topicId:!!chapterId&&a.chapter_id===chapterId&&!a.topic_id);
 return '<div class="cm-files">'+attachments.map(a=>{
  const id=e(a.id),editing=isOwner&&editingAsset===a.id,deleting=isOwner&&deletingAsset===a.id;
  const actions='<div class="cm-file-actions">'+
   button(tr("Open","খুলো"),"open-file",'data-path="'+e(a.file_path)+'"')+
   (isOwner?button(tr("Edit","এডিট"),"edit-file",'data-id="'+id+'" aria-expanded="'+editing+'"')+
   button(tr("Delete","ডিলিট"),"request-delete-file",'data-id="'+id+'"', "danger-btn"):"")+'</div>';
  const editor=editing?'<form class="cm-asset-editor cm-form" data-cm-form="asset-edit" data-asset="'+id+'">'+
   '<label>'+tr("Display file name","ফাইলের নাম")+
   '<input name="file_name" maxlength="250" required value="'+e(a.file_name)+'"></label>'+
   '<label>'+tr("Replace file (optional · PDF or image, max 10 MB)","ফাইল পরিবর্তন (ঐচ্ছিক · PDF বা ছবি, সর্বোচ্চ ১০ MB)")+
   '<input type="file" name="replacement" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"></label>'+
   '<div class="cm-file-actions"><button type="submit" class="primary-btn">'+tr("Save Changes","পরিবর্তন সেভ")+'</button>'+
   button(tr("Cancel","বাতিল"),"cancel-file")+'</div></form>':"";
  const confirmDelete=deleting?'<div class="cm-delete-confirm" role="group" aria-label="'+tr("Confirm file deletion","ফাইল মুছতে নিশ্চিত করো")+'">'+
   '<p>'+tr("Delete this file permanently? Students will no longer be able to open it.","ফাইলটি স্থায়ীভাবে মুছবে? শিক্ষার্থীরা আর এটি খুলতে পারবে না।")+'</p>'+
   '<div class="cm-file-actions">'+button(tr("Yes, Delete","হ্যাঁ, মুছো"),"confirm-delete-file",'data-id="'+id+'"',"danger-btn")+
   button(tr("Cancel","বাতিল"),"cancel-file")+'</div></div>':"";
  return '<div class="cm-file-item"><div class="cm-file"><span class="cm-file-title">'+
   '<span aria-hidden="true">'+(a.mime_type==="application/pdf"?"▤":"▧")+'</span> '+e(a.file_name)+
   '</span>'+actions+'</div>'+editor+confirmDelete+'</div>';
 }).join("")+'</div>';
}
function fileUpload(courseId,chapterId,topicId=""){
 return '<label class="cm-upload">'+tr("⇧ Upload PDF / Image (max 10 MB)","⇧ PDF / ছবি আপলোড (সর্বোচ্চ ১০ MB)")+'<input type="file" data-cm-upload data-course="'+courseId+'" data-chapter="'+chapterId+'" data-topic="'+topicId+'" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"></label>';
}

function chapterControls(c,ch,topics,isOwner){
 if(!isOwner)return "";
 const chapterId=e(ch.id),isEditing=editingChapter===ch.id,isDeleting=deletingChapter===ch.id;
 const files=by("assets",c.id).filter(a=>a.chapter_id===ch.id).length;
 const edit=isEditing?'<form class="cm-form cm-inline-editor" data-cm-form="chapter-edit" data-chapter="'+chapterId+'" data-course="'+e(c.id)+'">'+
 '<label>'+tr("Chapter title","অধ্যায়ের নাম")+'<input name="title" maxlength="150" required value="'+e(ch.title)+'"></label>'+
 '<div class="cm-section-actions"><button class="primary-btn" type="submit">'+tr("Save Chapter","অধ্যায় সেভ")+'</button>'+button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></form>':"";
 const del=isDeleting?'<div class="cm-delete-confirm" role="group" aria-label="'+tr("Confirm chapter deletion","অধ্যায় মুছে ফেলা নিশ্চিত করো")+'"><p>'+
 tr("Deleting this chapter permanently removes its ","এই অধ্যায় মুছলে স্থায়ীভাবে মুছে যাবে: ")+
 topics.length+" "+tr("topics and ","টি টপিক এবং ")+files+" "+tr("attached files, including topic notes. Other chapters and homework remain.","টি সংযুক্ত ফাইলসহ টপিকের লিখিত নোটস। অন্য অধ্যায় ও হোমওয়ার্ক অক্ষত থাকবে।")+'</p>'+
 '<div class="cm-section-actions">'+button(tr("Yes, Delete Chapter","হ্যাঁ, অধ্যায় মুছো"),"confirm-delete-chapter",'data-id="'+chapterId+'"',"danger-btn")+
 button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></div>':"";
 return edit+del;
}
function chapterHeaderActions(ch,isOwner){
 if(!isOwner)return "";
 const id=e(ch.id),title=e(ch.title);
 return '<div class="cm-chapter-header-actions cm-compact-actions" role="group" aria-label="'+tr("Chapter actions","অধ্যায়ের অপশন")+'">'+
 button(tr("Edit","এডিট"),"edit-chapter",'data-id="'+id+'" aria-label="'+tr("Edit chapter: ","অধ্যায় এডিট: ")+title+'" aria-expanded="'+(editingChapter===ch.id)+'"')+
 button(tr("Delete","ডিলিট"),"request-delete-chapter",'data-id="'+id+'" aria-label="'+tr("Delete chapter: ","অধ্যায় ডিলিট: ")+title+'"',"danger-btn")+
 '</div>';
}
function renderTopic(c,ch,t,index,isOwner){
 const topicId=e(t.id),topicTitle=e(t.title),isEditing=isOwner&&editingTopic===t.id,isDeleting=isOwner&&deletingTopic===t.id;
 const noteEditing=isOwner&&editingNote===t.id,noteDeleting=isOwner&&deletingNote===t.id;
 const fileCount=by("assets",c.id).filter(a=>a.topic_id===t.id).length;
 const buttons=isOwner?'<div class="cm-section-actions cm-compact-actions" role="group" aria-label="'+tr("Topic actions","টপিকের অপশন")+'">'+
 button(tr("Edit","এডিট"),"edit-topic",'data-id="'+topicId+'" aria-label="'+tr("Edit topic: ","টপিক এডিট: ")+topicTitle+'"')+
 button(tr("Delete","ডিলিট"),"request-delete-topic",'data-id="'+topicId+'" aria-label="'+tr("Delete topic: ","টপিক ডিলিট: ")+topicTitle+'"',"danger-btn")+'</div>':"";
 const edit=isEditing?'<form class="cm-form cm-inline-editor" data-cm-form="topic-edit" data-topic="'+topicId+'" data-chapter="'+e(ch.id)+'" data-course="'+e(c.id)+'">'+
 '<label>'+tr("Topic title","টপিকের নাম")+'<input name="title" maxlength="150" required value="'+topicTitle+'"></label>'+
 '<div class="cm-section-actions"><button class="primary-btn" type="submit">'+tr("Save Topic","টপিক সেভ")+'</button>'+button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></form>':"";
 const del=isDeleting?'<div class="cm-delete-confirm" role="group" aria-label="'+tr("Confirm topic deletion","টপিক মুছে ফেলা নিশ্চিত করো")+'"><p>'+
 tr("Permanently delete this topic, its written notes, and ","এই টপিক, এর লিখিত নোটস এবং ")+fileCount+" "+
 tr("attached files? Other topics and the chapter will remain.","টি সংযুক্ত ফাইল স্থায়ীভাবে মুছবে? অন্য টপিক ও অধ্যায় অক্ষত থাকবে।")+'</p>'+
 '<div class="cm-section-actions">'+button(tr("Yes, Delete Topic","হ্যাঁ, টপিক মুছো"),"confirm-delete-topic",'data-id="'+topicId+'"',"danger-btn")+
 button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></div>':"";
 const noteText='<p class="cm-body cm-note-text">'+e(t.body||tr("No written notes yet.","এখনো লিখিত নোটস নেই।"))+'</p>';
 const noteButtons=isOwner?'<div class="cm-section-actions cm-compact-actions" role="group" aria-label="'+tr("Written note actions","লিখিত নোটসের অপশন")+'">'+
 button(t.body?tr("Edit","এডিট"):tr("Add","যোগ"),"edit-note",'data-id="'+topicId+'" aria-label="'+tr("Edit notes for topic: ","টপিকের নোটস এডিট: ")+topicTitle+'"')+
 (t.body?button(tr("Delete","ডিলিট"),"request-delete-note",'data-id="'+topicId+'" aria-label="'+tr("Delete notes for topic: ","টপিকের নোটস ডিলিট: ")+topicTitle+'"',"danger-btn"):"")+
 '</div>':"";
 const noteEditor=noteEditing?'<form class="cm-form cm-note-editor" data-cm-form="topic-body" data-topic="'+topicId+'" data-course="'+e(c.id)+'">'+
 '<label>'+tr("Written notes","লিখিত নোটস")+'<textarea name="body" maxlength="20000" rows="5" placeholder="'+tr("Write notes here…","এখানে নোটস লেখো…")+'">'+e(t.body)+'</textarea></label>'+
 '<div class="cm-section-actions"><button class="primary-btn" type="submit">'+tr("Save Notes","নোটস সেভ")+'</button>'+button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></form>':"";
 const noteDel=noteDeleting?'<div class="cm-delete-confirm" role="group" aria-label="'+tr("Confirm note deletion","নোটস মুছে ফেলা নিশ্চিত করো")+'"><p>'+
 tr("Delete only the written notes? This topic and its uploaded PDF/images will be preserved.","শুধু লিখিত নোটস মুছবে? টপিক এবং আপলোড করা PDF/ছবি অক্ষত থাকবে।")+'</p>'+
 '<div class="cm-section-actions">'+button(tr("Yes, Delete Notes","হ্যাঁ, নোটস মুছো"),"confirm-delete-note",'data-id="'+topicId+'"',"danger-btn")+
 button(tr("Cancel","বাতিল"),"cancel-entity")+'</div></div>':"";
 return '<article class="cm-topic" data-topic-id="'+topicId+'"><div class="cm-section-heading"><b>'+
 tr("Topic","টপিক")+" "+index+": "+topicTitle+'</b>'+buttons+'</div>'+edit+del+
 '<div class="cm-note-block"><div class="cm-section-heading cm-note-heading"><strong>'+tr("Written Notes","লিখিত নোটস")+'</strong>'+noteButtons+'</div>'+
 (noteEditing?noteEditor:noteText+noteDel)+'</div>'+
 fileList(c.id,ch.id,t.id,isOwner)+(isOwner?fileUpload(c.id,ch.id,t.id):"")+'</article>';
}
function renderChapter(c,ch,index,isOwner){
 const topics=by("topics",c.id).filter(t=>t.chapter_id===ch.id).sort((a,b)=>a.position-b.position||a.created_at.localeCompare(b.created_at));
 const chfiles=fileList(c.id,ch.id,null,isOwner);
 const tools=isOwner?'<form class="cm-inline" data-cm-form="topic" data-course="'+e(c.id)+'" data-chapter="'+e(ch.id)+'"><input name="title" maxlength="150" required placeholder="'+tr("New topic","নতুন টপিক")+'"><button class="secondary-btn" type="submit">+ '+tr("Add Topic","টপিক যোগ")+'</button></form>':"";
 const isOpen=openedChapters?openedChapters.has(ch.id):index===1;
 const chapterId=e(ch.id),contentId="cm-chapter-content-"+chapterId;
 return '<section class="cm-chapter-shell" data-chapter-id="'+chapterId+'" data-open="'+isOpen+'">'+
 '<div class="cm-chapter-heading">'+
 '<button type="button" class="cm-chapter-toggle" data-action="cm-toggle-chapter" data-id="'+chapterId+'" aria-expanded="'+isOpen+'" aria-controls="'+contentId+'" aria-label="'+tr("Toggle chapter: ","অধ্যায় খুলুন বা বন্ধ করুন: ")+e(ch.title)+'">'+
 '<strong>'+tr("Chapter","অধ্যায়")+' '+index+' — '+e(ch.title)+'</strong>'+
 '<span class="cm-chapter-topic-count">'+topics.length+' '+tr("Topics","টপিক")+'</span></button>'+
 chapterHeaderActions(ch,isOwner)+'</div>'+
 '<div class="cm-chapter-inner" id="'+contentId+'" '+(isOpen?'':'hidden')+'>'+
 chapterControls(c,ch,topics,isOwner)+
 '<h3>'+tr("Chapter Notes & Files","অধ্যায়ের নোটস ও ফাইল")+'</h3>'+
 chfiles+(isOwner?fileUpload(c.id,ch.id):"")+tools+
 '<div class="cm-topic-list">'+(topics.length?topics.map((t,i)=>renderTopic(c,ch,t,i+1,isOwner)).join(""):'<p class="cm-muted">'+tr("Add a topic to begin.","শুরু করতে টপিক যোগ করো।")+'</p>')+
 '</div></div></section>';
}
function renderHomework(){
 if(!data.courses.length)return noCourses();
 const c=currentCourse(),isOwner=owner(c);
 const assignments=by("assignments",c.id).sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const newForm=isOwner?'<form id="cmHomeworkForm" class="cm-form"><h3>'+tr("Assign Homework","হোমওয়ার্ক দাও")+'</h3><label>'+tr("Homework title","হোমওয়ার্কের শিরোনাম")+'<input name="title" maxlength="160" required placeholder="e.g. Array Practice"></label><label>'+tr("Instructions","নির্দেশনা")+'<textarea name="instructions" maxlength="6000" rows="3" placeholder="Describe the homework"></textarea></label><label>'+tr("Deadline (optional)","জমা দেওয়ার শেষ সময় (ঐচ্ছিক)")+'<input type="datetime-local" name="due_at"></label><button type="submit" class="primary-btn">'+tr("Publish Homework","হোমওয়ার্ক প্রকাশ করো")+'</button></form>':"";
 return coursePicker()+'<section class="panel cm-panel"><h2>'+tr("Homework & Submissions","হোমওয়ার্ক ও সাবমিশন")+' · '+e(c.title)+'</h2>'+newForm+(assignments.length?assignments.map(a=>renderAssignment(a,isOwner)).join(""):'<p class="cm-muted">'+tr("No homework assigned yet.","এখনো হোমওয়ার্ক দেওয়া হয়নি।")+'</p>')+'</section>';
}
function renderAssignment(a,isOwner){
 const submissions=data.submissions.filter(s=>s.assignment_id===a.id);
 const mine=submissions.find(s=>s.student_id===user()?.id),deadline=a.due_at?new Date(a.due_at).toLocaleString(window.NOVA_I18N?.language==="bn"?"bn-BD":"en-GB"):"—";
 const files=()=>submissions.map(s=>'<div class="cm-submitted"><b>'+e(s.student_name||"Student")+'</b><small>'+e(new Date(s.submitted_at).toLocaleString())+'</small><p>'+e(s.answer)+'</p>'+(s.file_path?button(e(s.file_name||tr("Attachment","ফাইল")),"open-file",'data-path="'+e(s.file_path)+'"'):"")+'</div>').join("");
 const form='<form class="cm-form cm-answer" data-cm-form="submission" data-assignment="'+a.id+'" data-course="'+a.course_id+'"><label>'+tr("Your answer","তোমার উত্তর")+'<textarea name="answer" maxlength="12000" rows="3" placeholder="'+tr("Type your homework answer here…","এখানে হোমওয়ার্কের উত্তর লেখো…")+'">'+e(mine?.answer||"")+'</textarea></label><label>'+tr("Attach PDF or image (optional)","PDF বা ছবি যোগ করো (ঐচ্ছিক)")+'<input type="file" name="attachment" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"></label>'+(mine?.file_path?'<p class="cm-muted">'+tr("Current file: ","বর্তমান ফাইল: ")+e(mine.file_name||"File")+'</p>':"")+'<button type="submit" class="primary-btn">'+(mine?tr("Update Submission","সাবমিশন আপডেট"):tr("Submit Homework","হোমওয়ার্ক জমা দাও"))+'</button></form>';
 return '<article class="cm-assignment"><div class="cm-flex"><h3>'+e(a.title)+'</h3><span class="cm-muted">'+tr("Due: ","শেষ সময়: ")+e(deadline)+'</span></div><p class="cm-body">'+e(a.instructions)+'</p>'+(isOwner?'<b>'+tr("Student Submissions","শিক্ষার্থীর জমা দেওয়া কাজ")+' ('+submissions.length+')</b>'+(submissions.length?files():'<p class="cm-muted">'+tr("No submissions yet.","কেউ এখনো জমা দেয়নি।")+'</p>'):form)+'</article>';
}
function checkFile(file){
 if(!file)return false;
 const types=["application/pdf","image/jpeg","image/png","image/webp"];
 if(!types.includes(file.type)||file.size<1||file.size>10485760)throw Error(tr("Only PDF, JPG, PNG, WEBP up to 10 MB are supported.","সর্বোচ্চ ১০ MB PDF/JPG/PNG/WEBP ফাইল দেওয়া যাবে।"));
 return true;
}
async function storageUpload(file,courseId,folder){
 checkFile(file);
 const suffix=({ "application/pdf":"pdf","image/jpeg":"jpg","image/png":"png","image/webp":"webp"})[file.type];
 const path=folder+"/"+courseId+"/"+user().id+"/"+crypto.randomUUID()+"."+suffix;
 const {error}=await client().storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
 if(error)throw error;
 return path;
}
async function submit(form){
 const u=user(),sb=client();if(!u||!sb){msg(tr("Sign in required.","আগে লগইন করো।"),true);return true}
 const type=form.id==="cmCourseForm"?"course":form.id==="cmJoinForm"?"join":form.id==="cmHomeworkForm"?"homework":form.dataset.cmForm;
 if(!type)return false;
 if(busy)return true;
 busy=true;
 rememberOpenChapters();
 const fd=new FormData(form);
 try{
  if(type==="course"){
   const {data:row,error}=await sb.from(TABLES.courses).insert({owner_id:u.id,title:String(fd.get("title")||"").trim(),description:String(fd.get("description")||"").trim()}).select().single();
   if(error)throw error;
   selected=row.id;tab="courses";
  } else if(type==="join"){
   const {data:id,error}=await sb.rpc("ns_join_course",{code:String(fd.get("code")||"").trim(),student_display_name:String(fd.get("student")||"").trim()});
   if(error)throw error;selected=id;tab="courses";
  } else if(type==="chapter"||type==="topic"){
   const c=form.dataset.course,ch=form.dataset.chapter,title=String(fd.get("title")||"").trim();
   const table=type==="chapter"?TABLES.chapters:TABLES.topics;
   const payload=type==="chapter"?{course_id:c,title,position:by("chapters",c).length}:{course_id:c,chapter_id:ch,title,position:data.topics.filter(x=>x.chapter_id===ch).length};
   const {error}=await sb.from(table).insert(payload);if(error)throw error;
  } else if(type==="chapter-edit"||type==="topic-edit"){
   const key=type==="chapter-edit"?"chapters":"topics",id=type==="chapter-edit"?form.dataset.chapter:form.dataset.topic;
   const row=data[key].find(x=>x.id===id),title=String(fd.get("title")||"").trim();
   if(!row||row.course_id!==form.dataset.course||!owner(data.courses.find(c=>c.id===row.course_id)))
    throw Error(tr("Only the course owner can edit this item.","শুধু কোর্সের মালিক এটি এডিট করতে পারবেন।"));
   if(!title||title.length>150)throw Error(tr("Enter a valid title (max 150 characters).","সঠিক নাম লেখো (সর্বোচ্চ ১৫০ অক্ষর)।"));
   const {data:updated,error}=await sb.from(TABLES[key]).update({title}).eq("id",id).eq("course_id",row.course_id).select("id").maybeSingle();
   if(error)throw error;
   if(!updated)throw Error(tr("Item no longer exists or you lack permission.","তথ্যটি পাওয়া যায়নি অথবা পরিবর্তনের অনুমতি নেই।"));
   resetEntityEditors();
  } else if(type==="topic-body"){
   const topic=data.topics.find(x=>x.id===form.dataset.topic);
   if(!topic||topic.course_id!==form.dataset.course||!owner(data.courses.find(c=>c.id===topic.course_id)))
    throw Error(tr("Only the course owner can edit written notes.","শুধু কোর্সের মালিক লিখিত নোটস এডিট করতে পারবেন।"));
   const {data:updated,error}=await sb.from(TABLES.topics).update({body:String(fd.get("body")||"").slice(0,20000)})
    .eq("id",topic.id).eq("course_id",topic.course_id).select("id").maybeSingle();
   if(error)throw error;
   if(!updated)throw Error(tr("Notes no longer exist or you lack permission.","নোটস পাওয়া যায়নি অথবা পরিবর্তনের অনুমতি নেই।"));
   resetEntityEditors();
  } else if(type==="asset-edit"){
   const asset=data.assets.find(a=>a.id===form.dataset.asset);
   if(!asset||!owner(data.courses.find(c=>c.id===asset.course_id)))throw Error(tr("You cannot edit this file.","এই ফাইল পরিবর্তনের অনুমতি নেই।"));
   const file=fd.get("replacement"),hasReplacement=file instanceof File&&file.size>0;
   const name=String(fd.get("file_name")||"").trim();
   if(!name||name.length>250)throw Error(tr("Enter a file name (max 250 characters).","সঠিক ফাইলের নাম লেখো (সর্বোচ্চ ২৫০ অক্ষর)।"));
   const changes={file_name:name};
   let uploadedPath="";
   try{
    if(hasReplacement){
     uploadedPath=await storageUpload(file,asset.course_id,"notes");
     Object.assign(changes,{file_path:uploadedPath,mime_type:file.type,byte_size:file.size});
    }
    const {data:updated,error}=await sb.from(TABLES.assets).update(changes)
     .eq("id",asset.id).eq("course_id",asset.course_id).select("id").maybeSingle();
    if(error)throw error;
    if(!updated)throw Error(tr("File was changed by another session; refresh and try again.","অন্য সেশনে ফাইলটি পরিবর্তিত হয়েছে; রিফ্রেশ করে আবার চেষ্টা করো।"));
   }catch(err){
    if(uploadedPath)await sb.storage.from(bucket).remove([uploadedPath]).catch(()=>{});
    throw err;
   }
   if(uploadedPath&&uploadedPath!==asset.file_path){
    const {error:cleanupError}=await sb.storage.from(bucket).remove([asset.file_path]);
    if(cleanupError)console.warn("NovaStudy: old file cleanup failed",cleanupError);
   }
   editingAsset="";
   deletingAsset="";
  } else if(type==="homework"){
   const due=String(fd.get("due_at")||"");
   const {error}=await sb.from(TABLES.assignments).insert({course_id:selected,title:String(fd.get("title")||"").trim(),instructions:String(fd.get("instructions")||"").trim(),due_at:due?new Date(due).toISOString():null});if(error)throw error;
  } else if(type==="submission"){
   const answer=String(fd.get("answer")||"").trim(),file=fd.get("attachment"),hasFile=file instanceof File&&file.size>0;
   const old=data.submissions.find(s=>s.assignment_id===form.dataset.assignment&&s.student_id===u.id);
   if(!answer&&!hasFile&&!old?.file_path)throw Error(tr("Type an answer or attach a file.","উত্তর লিখো অথবা একটি ফাইল দাও।"));
   let path=old?.file_path||null,fileName=old?.file_name||null;
   if(hasFile){path=await storageUpload(file,form.dataset.course,"submissions");fileName=file.name.slice(0,250);}
   const record={assignment_id:form.dataset.assignment,course_id:form.dataset.course,student_id:u.id,student_name:String(u.user_metadata?.full_name||u.email||"Student").slice(0,120),answer,file_path:path,file_name:fileName,submitted_at:new Date().toISOString()};
   const {error}=await sb.from(TABLES.submissions).upsert(record,{onConflict:"assignment_id,student_id"});if(error){if(hasFile)await sb.storage.from(bucket).remove([path]);throw error;}
   if(hasFile&&old?.file_path&&old.file_path!==path)await sb.storage.from(bucket).remove([old.file_path]).catch(()=>{});
  }
  await reload();
  msg(tr("Saved successfully.","সফলভাবে সংরক্ষিত হয়েছে।"));
 }catch(err){msg(tr("Failed: ","সমস্যা: ")+String(err.message||err).slice(0,170),true)}
 finally{busy=false}
 return true;
}
async function change(input){
 if(!input.matches?.("[data-cm-upload]"))return false;
 const file=input.files?.[0];input.value="";if(!file||busy)return true;
 busy=true;
 rememberOpenChapters();
 let path="";
 try{
  path=await storageUpload(file,input.dataset.course,"notes");
  const payload={course_id:input.dataset.course,chapter_id:input.dataset.chapter||null,topic_id:input.dataset.topic||null,file_name:file.name.slice(0,250),file_path:path,mime_type:file.type,byte_size:file.size};
  const {error}=await client().from(TABLES.assets).insert(payload);
  if(error){await client().storage.from(bucket).remove([path]);throw error}
  await reload();msg(tr("File uploaded.","ফাইল আপলোড হয়েছে।"));
 }catch(err){msg(tr("Upload failed: ","আপলোড ব্যর্থ: ")+String(err.message||err).slice(0,160),true)}
 finally{busy=false}
 return true;
}
async function openFile(path){
 if(!path)return;
 const {data:link,error}=await client().storage.from(bucket).createSignedUrl(path,120);
 if(error)throw error;
 const a=document.createElement("a");a.href=link.signedUrl;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();a.remove();
}

async function deleteCourseItem(kind,id){
 if(busy)return;
 const key=kind==="chapter"?"chapters":"topics",item=data[key].find(x=>x.id===id);
 const course=data.courses.find(c=>c.id===item?.course_id);
 if(!item||!owner(course))return;
 if((kind==="chapter"?deletingChapter:deletingTopic)!==id)return;
 const sb=client();if(!sb)return;
 rememberOpenChapters();
 busy=true;
 try{
  // Capture the exact paths before FK-cascade deletes their metadata.
  const column=kind==="chapter"?"chapter_id":"topic_id";
  const {data:assets,error:listingError}=await sb.from(TABLES.assets)
   .select("file_path").eq("course_id",item.course_id).eq(column,id).limit(5000);
  if(listingError)throw listingError;
  if(assets.length===5000)throw Error(tr("Too many files for safe deletion; contact support.","নিরাপদে মুছতে ফাইলের সংখ্যা বেশি; সহায়তা নাও।"));
  const {data:removed,error}=await sb.from(TABLES[key]).delete()
   .eq("id",id).eq("course_id",item.course_id).select("id").maybeSingle();
  if(error)throw error;
  if(!removed)throw Error(tr("Item could not be deleted. Refresh and try again.","মুছতে পারিনি; রিফ্রেশ করে আবার চেষ্টা করো।"));
  resetEntityEditors();
  const paths=[...new Set(assets.map(a=>a.file_path).filter(Boolean))];
  let cleanupFailed=false;
  for(let i=0;i<paths.length;i+=100){
   const {error:storageError}=await sb.storage.from(bucket).remove(paths.slice(i,i+100));
   if(storageError){cleanupFailed=true;console.warn("NovaStudy file cleanup needs attention",storageError)}
  }
  await reload();
  msg(cleanupFailed?
   tr("Chapter/topic removed, but some private stored files could not be cleaned up.","অধ্যায়/টপিক মুছে গেছে, তবে কিছু সংরক্ষিত ফাইলের cleanup সম্পন্ন হয়নি।"):
   kind==="chapter"?tr("Chapter deleted.","অধ্যায় মুছে ফেলা হয়েছে।"):tr("Topic deleted.","টপিক মুছে ফেলা হয়েছে।"),cleanupFailed);
 }catch(err){msg(tr("Delete failed: ","মুছতে সমস্যা: ")+String(err.message||err).slice(0,150),true)}
 finally{busy=false}
}
async function deleteWrittenNote(id){
 if(busy||deletingNote!==id)return;
 const topic=data.topics.find(t=>t.id===id);
 if(!topic||!owner(data.courses.find(c=>c.id===topic.course_id)))return;
 rememberOpenChapters();busy=true;
 try{
  const {data:updated,error}=await client().from(TABLES.topics)
    .update({body:""}).eq("id",id).eq("course_id",topic.course_id).select("id").maybeSingle();
  if(error)throw error;
  if(!updated)throw Error(tr("Notes not found or permission denied.","নোটস পাওয়া যায়নি অথবা অনুমতি নেই।"));
  resetEntityEditors();
  await reload();
  msg(tr("Written notes deleted. Topic and files kept.","লিখিত নোটস মুছে গেছে। টপিক ও ফাইল অক্ষত আছে।"));
 }catch(err){msg(tr("Delete failed: ","মুছতে সমস্যা: ")+String(err.message||err).slice(0,150),true)}
 finally{busy=false}
}
function action(act,btn){
 if(!act?.startsWith("cm-"))return false;
 const type=act.slice(3),id=btn?.dataset.id;
 if(type==="tab"){tab=btn.dataset.tab;message="";refresh();return true}
 if(type==="select"){selected=id;message="";openedChapters=null;editingAsset="";deletingAsset="";resetEntityEditors();refresh();return true}
 if(type==="login"){void Auth.signIn();return true}
 if(type==="copy"){if(navigator.clipboard?.writeText){void navigator.clipboard.writeText(id).then(()=>msg(tr("Join code copied.","Join Code কপি হয়েছে।"))).catch(()=>msg(id))}else msg(id);return true}
 if(type==="reload"){void reload();return true}
 if(type==="toggle-chapter"){
  const ch=data.chapters.find(x=>x.id===id);
  if(!ch||!data.courses.some(c=>c.id===ch.course_id))return true;
  rememberOpenChapters();
  if(!openedChapters){
   openedChapters=new Set(data.chapters.filter((item,i)=>i===0).map(item=>item.id));
  }
  if(openedChapters.has(id))openedChapters.delete(id);else openedChapters.add(id);
  refresh();return true;
 }

 if(["edit-chapter","request-delete-chapter","edit-topic","request-delete-topic","edit-note","request-delete-note"].includes(type)){
  const key=type.includes("chapter")?"chapters":"topics";
  const item=data[key].find(x=>x.id===id);
  if(!item||!owner(data.courses.find(c=>c.id===item.course_id))||busy)return true;
  rememberOpenChapters();
  if(type==="edit-chapter"||type==="request-delete-chapter"){
   if(!openedChapters)openedChapters=new Set();
   openedChapters.add(id);
  }
  const prop={"edit-chapter":"editingChapter","request-delete-chapter":"deletingChapter",
   "edit-topic":"editingTopic","request-delete-topic":"deletingTopic",
   "edit-note":"editingNote","request-delete-note":"deletingNote"}[type];
  const active={editingChapter,deletingChapter,editingTopic,deletingTopic,editingNote,deletingNote}[prop]===id;
  resetEntityEditors();
  if(!active){
   if(prop==="editingChapter")editingChapter=id;
   if(prop==="deletingChapter")deletingChapter=id;
   if(prop==="editingTopic")editingTopic=id;
   if(prop==="deletingTopic")deletingTopic=id;
   if(prop==="editingNote")editingNote=id;
   if(prop==="deletingNote")deletingNote=id;
  }
  editingAsset="";deletingAsset="";refresh();return true;
 }
 if(type==="cancel-entity"){rememberOpenChapters();resetEntityEditors();refresh();return true}
 if(type==="confirm-delete-chapter"){void deleteCourseItem("chapter",id);return true}
 if(type==="confirm-delete-topic"){void deleteCourseItem("topic",id);return true}
 if(type==="confirm-delete-note"){void deleteWrittenNote(id);return true}
 if(type==="edit-file"||type==="request-delete-file"){
  rememberOpenChapters();
  const asset=data.assets.find(x=>x.id===id);
  if(!asset||!owner(data.courses.find(c=>c.id===asset.course_id)))return true;
  if(type==="edit-file"){editingAsset=editingAsset===id?"":id;deletingAsset="";}
  else {deletingAsset=deletingAsset===id?"":id;editingAsset="";}
  refresh();return true;
 }
 if(type==="cancel-file"){rememberOpenChapters();editingAsset="";deletingAsset="";refresh();return true}
 if(type==="confirm-delete-file"){
  const asset=data.assets.find(x=>x.id===id);
  if(!asset||deletingAsset!==id||!owner(data.courses.find(c=>c.id===asset.course_id))||busy)return true;
  rememberOpenChapters();
  void (async()=>{
   busy=true;
   try{
    const {data:removed,error}=await client().from(TABLES.assets).delete()
      .eq("id",asset.id).eq("course_id",asset.course_id).select("id").maybeSingle();
    if(error)throw error;
    if(!removed)throw Error(tr("File no longer exists or you do not have permission.","ফাইল পাওয়া যায়নি অথবা মুছে ফেলার অনুমতি নেই।"));
    editingAsset="";deletingAsset="";
    const {error:storageError}=await client().storage.from(bucket).remove([asset.file_path]);
    await reload();
    msg(storageError?tr("File removed from the course, but stored-file cleanup needs attention.","কোর্স থেকে ফাইল মুছেছে, তবে Storage cleanup যাচাই করা দরকার।"):
      tr("File deleted.","ফাইল মুছে ফেলা হয়েছে।"),Boolean(storageError));
   }catch(err){msg(tr("Delete failed: ","মুছতে সমস্যা: ")+String(err.message||err).slice(0,160),true)}
   finally{busy=false}
  })();
  return true;
 }
 if(type==="open-file"){void openFile(btn.dataset.path).catch(err=>msg(String(err.message||err),true));return true}
 if(type==="remove-student"&&owner(currentCourse())){
  if(window.confirm(tr("Remove this student from the course?","শিক্ষার্থীকে কোর্স থেকে সরাতে চাও?")))void (async()=>{const {error}=await client().from(TABLES.enrollments).delete().eq("course_id",id).eq("student_id",btn.dataset.student);if(error)msg(String(error.message),true);else await reload()})();
  return true;
 }
 return false;
}
window.NOVA_COURSES={init,page,load,authChanged,action,submit,change};
})();