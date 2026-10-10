/* NovaStudy v1.5: bilingual UI. Language preference is separate from student data. */
(function(){
"use strict";
const KEY="novastudy_language_v1";
const bn={"ROUTINE OPERATING SYSTEM":"রুটিন অপারেটিং সিস্টেম","WORKSPACE":"ওয়ার্কস্পেস","WORKSPACE / 01":"ওয়ার্কস্পেস / ০১","Dashboard":"ড্যাশবোর্ড","Weekly routine":"সাপ্তাহিক রুটিন","Tasks & goals":"কাজ ও লক্ষ্য","Exams & revision":"পরীক্ষা ও রিভিশন","Subjects":"বিষয়সমূহ","My profile & settings":"প্রোফাইল ও সেটিংস","Home":"হোম","Routine":"রুটিন","Tasks":"কাজ","Exams":"পরীক্ষা","Settings":"সেটিংস","Install app":"অ্যাপ ইনস্টল","⇩ Install app":"⇩ অ্যাপ ইনস্টল","Cyber":"সাইবার","Black Gold":"ব্ল্যাক গোল্ড","Profile":"প্রোফাইল","Local time":"স্থানীয় সময়","Switch theme":"থিম পরিবর্তন","Open profile":"প্রোফাইল খুলুন","Main navigation":"প্রধান নেভিগেশন","Mobile navigation":"মোবাইল নেভিগেশন","Pages":"পেজসমূহ","NovaStudy home":"NovaStudy হোম","⚠ Data safety alert":"⚠ ডেটা সুরক্ষা সতর্কতা","Export current backup":"বর্তমান ব্যাকআপ এক্সপোর্ট","Download raw recovery":"মূল ডেটা ডাউনলোড","Open Settings":"সেটিংস খুলুন","Dismiss":"বন্ধ করুন","✦ NovaStudy update ready":"✦ NovaStudy আপডেট প্রস্তুত","A newer version is downloaded. Your saved routines and exams will be kept.":"নতুন সংস্করণ ডাউনলোড হয়েছে। সংরক্ষিত রুটিন ও পরীক্ষা অক্ষত থাকবে।","Update and reload":"আপডেট করে পুনরায় চালু","ENGINEERED FOR YOUR NEXT LEVEL":"তোমার আগামী সাফল্যের জন্য তৈরি","MISSION CONTROL / 01":"স্টাডি কন্ট্রোল / ০১","Your student dashboard":"তোমার স্টাডি ড্যাশবোর্ড","Daily schedule, missions and progress in one futuristic workspace.":"প্রতিদিনের রুটিন, কাজ ও অগ্রগতি এক জায়গায় দেখো।","+ New session":"+ নতুন সেশন","STUDY INTELLIGENCE · ONLINE":"স্টাডি ইন্টেলিজেন্স · অনলাইন","Plan smarter. Focus deeper. Make every session count, from school to university.":"স্মার্টভাবে পড়ো, গভীর মনোযোগ দাও। প্রতিটি স্টাডি সেশনকে কাজে লাগাও।","Build my routine →":"রুটিন তৈরি করি →","Auto study plan":"স্বয়ংক্রিয় স্টাডি প্ল্যান","Sessions today":"আজকের সেশন","Planned hours":"নির্ধারিত ঘণ্টা","Pending missions":"বাকি কাজ","Task completion":"কাজ সম্পন্ন","Today's timeline":"আজকের সময়সূচি","See all →":"সব দেখুন →","No sessions yet. Add a class, lab or study session.":"এখনো কোনো সেশন নেই। ক্লাস, ল্যাব বা স্টাডি সেশন যোগ করো।","Upcoming missions":"আসন্ন কাজ","Your next goals":"তোমার পরবর্তী লক্ষ্য","View all →":"সব দেখুন →","No pending tasks. Enjoy the progress!":"কোনো বাকি কাজ নেই। এগিয়ে চলো!","TIME MATRIX / 02":"সময়সূচি / ০২","Your 7-day timetable":"তোমার ৭ দিনের রুটিন","Weekly classes, revision, activities and study blocks.":"সাপ্তাহিক ক্লাস, রিভিশন, কার্যক্রম ও পড়ার সময়।","+ Add session":"+ সেশন যোগ","⚡ Generate study time":"⚡ পড়ার সময় তৈরি","24-hour scheduling":"২৪ ঘণ্টার সময়সূচি","Nothing planned here yet.":"এখনো কোনো সেশন নির্ধারিত নেই।","Overlaps are warned about when saving. Auto study planner avoids occupied time slots.":"সময়ের সংঘর্ষ থাকলে সতর্ক করা হয়। স্বয়ংক্রিয় প্ল্যানার ব্যস্ত সময় এড়িয়ে চলে।","MISSION TRACKER / 03":"কাজের তালিকা / ০৩","Assignments, exam prep and personal to-dos.":"অ্যাসাইনমেন্ট, পরীক্ষার প্রস্তুতি ও ব্যক্তিগত কাজ।","+ New task":"+ নতুন কাজ","ALL":"সব","PENDING":"বাকি","DONE":"সম্পন্ন","Search tasks…":"কাজ খুঁজুন…","Search tasks":"কাজ অনুসন্ধান","No missions match this filter.":"এই ফিল্টারে কোনো কাজ পাওয়া যায়নি।","Mark task complete":"কাজ সম্পন্ন হিসেবে চিহ্নিত","Edit":"সম্পাদনা","Delete":"মুছুন","Save":"সংরক্ষণ","Cancel":"বাতিল","Close":"বন্ধ করুন","KNOWLEDGE LIBRARY / 04":"বিষয় লাইব্রেরি / ০৪","Subject library":"বিষয়ের তালিকা","Choose subjects for your own academic level and curriculum.":"তোমার শ্রেণি ও পাঠ্যক্রম অনুযায়ী বিষয় নির্বাচন করো।","+ Add subject":"+ বিষয় যোগ","MY SUBJECTS":"আমার বিষয়","Add your first course or import suggestions.":"প্রথম বিষয়টি যোগ করো অথবা সাজেশন ইমপোর্ট করো।","Suggestions are customizable examples, not the official syllabus of any education board or university.":"প্রস্তাবিত বিষয়গুলো কেবল উদাহরণ; কোনো বোর্ড বা বিশ্ববিদ্যালয়ের সরকারি সিলেবাস নয়।","IDENTITY SYSTEM / 05":"প্রোফাইল / ০৫","Profile & settings":"প্রোফাইল ও সেটিংস","Your class, category, group, preferences and local backups.":"শ্রেণি, বিভাগ, পছন্দ এবং লোকাল ব্যাকআপ নিয়ন্ত্রণ করো।","Academic profile":"শিক্ষার্থী প্রোফাইল","STUDENT ID":"শিক্ষার্থী আইডি","Your name":"তোমার নাম","Institution (optional)":"প্রতিষ্ঠান (ঐচ্ছিক)","Education category":"শিক্ষার ধরন","Class / academic year":"শ্রেণি / শিক্ষাবর্ষ","Group / department":"গ্রুপ / বিভাগ","Week begins":"সপ্তাহ শুরু","Save profile →":"প্রোফাইল সংরক্ষণ →","Changing class or subject group never deletes existing routines, subjects or missions.":"শ্রেণি বা বিভাগ পরিবর্তন করলেও আগের রুটিন, বিষয় ও কাজ মুছে যাবে না।","Data & notifications":"ডেটা ও নোটিফিকেশন","LOCAL FIRST":"লোকাল ডেটা","Choose your theme":"থিম নির্বাচন করো","Choose an interface style without changing your saved routine, tasks, or subjects.":"সংরক্ষিত রুটিন, কাজ ও বিষয় না বদলে থিম বেছে নাও।","Futuristic Cyber":"ফিউচারিস্টিক সাইবার","Black & Gold":"ব্ল্যাক অ্যান্ড গোল্ড","Cyan + violet":"সায়ান + বেগুনি","Midnight + gold":"গাঢ় কালো + সোনালি","Your appearance preference is saved on this device, including after refresh.":"পেজ রিফ্রেশ করলেও এই ডিভাইসে থিম পছন্দ সংরক্ষিত থাকবে।","Your routines are saved in THIS browser, not in a cloud database. Export regularly to avoid losing data.":"তোমার রুটিন এই ব্রাউজারেই সংরক্ষিত, ক্লাউডে নয়। নিয়মিত ব্যাকআপ নাও।","⇩ Export JSON backup":"⇩ JSON ব্যাকআপ এক্সপোর্ট","⇧ Import backup":"⇧ ব্যাকআপ ইমপোর্ট","In-app reminders":"অ্যাপের নোটিফিকেশন","Only while app is open; no background alarms":"অ্যাপ খোলা থাকলেই কাজ করে; ব্যাকগ্রাউন্ড অ্যালার্ম নেই","PWA works over HTTPS/localhost after first load. Installing does not create an Android APK or iOS IPA.":"প্রথমবার চালুর পর HTTPS/localhost-এ PWA চলে। ইনস্টল করলে আলাদা Android APK বা iOS IPA তৈরি হয় না।","EXAM INTELLIGENCE / 06":"পরীক্ষা ব্যবস্থাপনা / ০৬","Exam & revision planner":"পরীক্ষা ও রিভিশন প্ল্যানার","Exam dates, live countdowns and conflict-aware revision blocks.":"পরীক্ষার তারিখ, কাউন্টডাউন ও সময়ের সংঘর্ষ এড়িয়ে রিভিশন পরিকল্পনা।","+ Add exam":"+ পরীক্ষা যোগ","UPCOMING":"আসন্ন","NEXT EXAM":"পরবর্তী পরীক্ষা","REVISION BLOCKS":"রিভিশন সেশন","None":"নেই","Exam calendar ready":"পরীক্ষার ক্যালেন্ডার প্রস্তুত","Add your first exam to plan revision and watch the countdown.":"পরীক্ষা যোগ করে রিভিশন পরিকল্পনা ও কাউন্টডাউন দেখো।","No upcoming exams":"আসন্ন পরীক্ষা নেই","Open exams →":"পরীক্ষা দেখো →","Revision blocks":"রিভিশন সেশন","Plan revision":"রিভিশন প্ল্যান","Mark done":"সম্পন্ন করো","Reopen":"আবার চালু করো","Completed":"সম্পন্ন","Finished":"শেষ হয়েছে","In progress":"চলছে","Tomorrow":"আগামীকাল","Invalid exam date":"পরীক্ষার তারিখ সঠিক নয়","No exams added yet. Create an exam to start planning revision.":"এখনো কোনো পরীক্ষা নেই। রিভিশন পরিকল্পনা করতে একটি পরীক্ষা যোগ করো।","Countdown uses this device’s local time. Revision planning creates one-time schedule blocks and linked tasks without removing your existing routine.":"কাউন্টডাউন ডিভাইসের স্থানীয় সময় অনুসরণ করে। রিভিশন প্ল্যান আগের রুটিন না মুছে নির্দিষ্ট দিনের সেশন ও কাজ যোগ করে।","Subject / course name":"বিষয় / কোর্সের নাম","Subject":"বিষয়","Color":"রং","Add subject":"বিষয় যোগ করো","Edit subject":"বিষয় সম্পাদনা","Enter a subject.":"একটি বিষয় লিখো।","Duplicate subject.":"বিষয়টি ইতিমধ্যে আছে।","Custom activity title":"কার্যক্রমের শিরোনাম","Repeat":"পুনরাবৃত্তি","Every week":"প্রতি সপ্তাহে","One time":"শুধু একবার","One-time date":"নির্দিষ্ট তারিখ","Repeat until (optional)":"পুনরাবৃত্তি শেষ (ঐচ্ছিক)","Day":"দিন","Type":"ধরন","Start":"শুরু","End":"শেষ","Room / note":"রুম / নোট","Add session":"সেশন যোগ","Edit session":"সেশন সম্পাদনা","Weekly classes repeat each week. One-time sessions need an exact date. Existing sessions remain unchanged.":"সাপ্তাহিক ক্লাস প্রতি সপ্তাহে পুনরাবৃত্তি হয়। একবারের সেশনের জন্য নির্দিষ্ট তারিখ দাও। আগের সেশন অপরিবর্তিত থাকবে।","End must be after start.":"শেষের সময় শুরুর সময়ের পরে হতে হবে।","Select a valid one-time date.":"সঠিক এককালীন তারিখ নির্বাচন করো।","Invalid repeat end date.":"পুনরাবৃত্তি শেষের তারিখ সঠিক নয়।","Overlaps another session. Save anyway?":"অন্য সেশনের সঙ্গে সময় মিলে যাচ্ছে। তবুও সংরক্ষণ করবে?","Task / goal":"কাজ / লক্ষ্য","Due date":"শেষ তারিখ","Priority":"অগ্রাধিকার","New task":"নতুন কাজ","Edit task":"কাজ সম্পাদনা","Enter a task title.":"কাজের নাম লিখো।","Auto study planner":"স্বয়ংক্রিয় স্টাডি প্ল্যানার","Days":"দিন","Blocks / day":"প্রতিদিন সেশন","Minutes / block":"প্রতি সেশনে মিনিট","Break minutes":"বিরতি (মিনিট)","Generates study blocks without deleting existing events.":"আগের ইভেন্ট না মুছে পড়ার সেশন তৈরি করে।","Preferred start":"পছন্দের শুরুর সময়","Revision sessions":"রিভিশন সেশন","Minutes per session":"প্রতি সেশনে মিনিট","Exam title":"পরীক্ষার নাম","Add exam":"পরীক্ষা যোগ","Edit exam":"পরীক্ষা সম্পাদনা","Exam date":"পরীক্ষার তারিখ","Room / venue":"রুম / পরীক্ষাকেন্দ্র","Notes / syllabus":"নোট / সিলেবাস","Check exam date and start/end time.":"পরীক্ষার তারিখ ও সময় যাচাই করো।","Exam limit reached":"সর্বোচ্চ পরীক্ষার সীমা পূর্ণ।","Exam saved.":"পরীক্ষা সংরক্ষিত হয়েছে।","Exam not found":"পরীক্ষাটি পাওয়া যায়নি।","Revision plan":"রিভিশন পরিকল্পনা","Invalid revision settings":"রিভিশন সেটিংস সঠিক নয়।","Exam must be on a future date":"পরীক্ষা ভবিষ্যতের তারিখে হতে হবে","Reopen exam before planning":"পরিকল্পনার আগে পরীক্ষা আবার চালু করো","No new dates or free slots found.":"নতুন খালি সময় পাওয়া যায়নি।","Revision blocks and tasks created.":"রিভিশন সেশন ও কাজ তৈরি হয়েছে।","Creates date-specific revision sessions and tasks BEFORE the exam. Weekly classes remain unchanged; occupied times are skipped or shifted.":"পরীক্ষার আগের নির্দিষ্ট দিনে রিভিশন সেশন ও কাজ তৈরি হয়। সাপ্তাহিক ক্লাস অপরিবর্তিত থাকে; ব্যস্ত সময় এড়িয়ে চলে।","Class":"ক্লাস","Study":"পড়াশোনা","Lab":"ল্যাব","Revision":"রিভিশন","Exam":"পরীক্ষা","Break":"বিরতি","Sleep":"ঘুম","Meal":"খাবার","Exercise":"ব্যায়াম","Prayer":"নামাজ / প্রার্থনা","Commute":"যাতায়াত","Personal":"ব্যক্তিগত","Other":"অন্যান্য","Personal / None":"ব্যক্তিগত / নেই","Personal / General":"ব্যক্তিগত / সাধারণ","General":"সাধারণ","low":"কম","medium":"মাঝারি","high":"উচ্চ","Sunday":"রবিবার","Monday":"সোমবার","Tuesday":"মঙ্গলবার","Wednesday":"বুধবার","Thursday":"বৃহস্পতিবার","Friday":"শুক্রবার","Saturday":"শনিবার","Primary School":"প্রাথমিক বিদ্যালয়","Secondary School":"মাধ্যমিক বিদ্যালয়","Higher Secondary / College":"উচ্চমাধ্যমিক / কলেজ","Madrasah":"মাদ্রাসা","Diploma / Technical / Vocational":"ডিপ্লোমা / কারিগরি","University / Higher Education":"বিশ্ববিদ্যালয় / উচ্চশিক্ষা","Other / International / Custom":"অন্যান্য / আন্তর্জাতিক / নিজস্ব","Science":"বিজ্ঞান","Business Studies":"ব্যবসায় শিক্ষা","Humanities":"মানবিক","CSE / Software Engineering":"সিএসই / সফটওয়্যার ইঞ্জিনিয়ারিং","Confirm":"নিশ্চিত করো","Delete subject? Current routine entries will remain unassigned.":"বিষয়টি মুছবে? বিদ্যমান রুটিনে ওই বিষয় আর যুক্ত থাকবে না।","Delete this session?":"সেশনটি মুছবে?","Delete task?":"কাজটি মুছবে?","Delete session?":"সেশনটি মুছবে?","Delete exam? Its revision sessions and tasks will remain intact.":"পরীক্ষাটি মুছবে? এর রিভিশন সেশন ও কাজ অক্ষত থাকবে।","Replace all current profile, subjects, routine, tasks and exams?":"বর্তমান প্রোফাইল, বিষয়, রুটিন, কাজ ও পরীক্ষা প্রতিস্থাপন করবে?","Storage full: export backup.":"স্টোরেজ পূর্ণ: ব্যাকআপ এক্সপোর্ট করো।","Profile saved. Existing routine preserved.":"প্রোফাইল সংরক্ষিত। আগের রুটিন অক্ষত আছে।","Backup restored.":"ব্যাকআপ পুনরুদ্ধার হয়েছে।","Backup exported. Keep a copy.":"ব্যাকআপ এক্সপোর্ট হয়েছে। একটি কপি রাখো।","Import failed: no data was replaced.":"ইমপোর্ট ব্যর্থ। বিদ্যমান ডেটা অপরিবর্তিত আছে।","Backup was rejected; existing data is unchanged.":"ব্যাকআপ প্রত্যাখ্যাত। আগের ডেটা অক্ষত আছে।","No damaged data snapshot is available.":"ক্ষতিগ্রস্ত ডেটার কোনো কপি পাওয়া যায়নি।","Original data snapshot downloaded. Do not import it directly.":"মূল ডেটা ডাউনলোড হয়েছে। এটি সরাসরি ইমপোর্ট করবে না।","Routine updated from another tab.":"অন্য ট্যাব থেকে রুটিন আপডেট হয়েছে।","NovaStudy installed!":"NovaStudy ইনস্টল হয়েছে!","Foreground reminders enabled.":"অ্যাপ খোলা থাকলে নোটিফিকেশন চালু।","Permission not granted.":"অনুমতি দেওয়া হয়নি।","Requires HTTPS and notification support.":"HTTPS এবং নোটিফিকেশন সমর্থন প্রয়োজন।","Invalid class/department.":"শ্রেণি / বিভাগ সঠিক নয়।","Unsupported or invalid backup.":"অসমর্থিত বা ভুল ব্যাকআপ।","Backups must be under 1 MB.":"ব্যাকআপ ১ এমবির কম হতে হবে।","Data safety alert":"ডেটা সুরক্ষা সতর্কতা","Could not save to this device. Check browser storage and export a backup before making further changes.":"এই ডিভাইসে সংরক্ষণ করা যায়নি। আরও পরিবর্তনের আগে স্টোরেজ পরীক্ষা ও ব্যাকআপ নাও।","Save prevented: invalid routine or exam data. The last saved copy was restored.":"ভুল রুটিন বা পরীক্ষার ডেটা সংরক্ষণ বন্ধ করা হয়েছে। সর্বশেষ সংরক্ষিত কপি ফেরানো হয়েছে।","Stored data could not be read safely. Your original data was not overwritten. Import a valid JSON backup in Settings to recover.":"সংরক্ষিত ডেটা সঠিকভাবে পড়া যায়নি। মূল ডেটা বদলানো হয়নি। Settings থেকে বৈধ JSON ব্যাকআপ ইমপোর্ট করো।","Another tab or browser storage changed your routine. The stale edit was not saved; review the latest data and retry.":"অন্য ট্যাবে রুটিন বদলেছে। পুরোনো পরিবর্তন সংরক্ষিত হয়নি; নতুন ডেটা দেখে আবার চেষ্টা করো।","Backup rejected. The current data is unchanged.":"ব্যাকআপ প্রত্যাখ্যাত। বর্তমান ডেটা অক্ষত আছে।","Backup restore failed because device storage is unavailable. Your existing data was not replaced.":"স্টোরেজ পাওয়া যাচ্ছে না বলে ব্যাকআপ ফেরানো যায়নি। আগের ডেটা অক্ষত।","Offline caching unavailable on this browser.":"এই ব্রাউজারে অফলাইন ক্যাশ পাওয়া যাচ্ছে না।","Update in another tab. Editor closed to prevent overwriting newer data.":"অন্য ট্যাবের পরিবর্তনে নতুন ডেটা রক্ষায় সম্পাদক বন্ধ হয়েছে।","Storage changed in another tab, but the incoming data could not be verified. No changes were loaded.":"অন্য ট্যাবে ডেটা বদলেছে, কিন্তু নতুন ডেটা যাচাই করা যায়নি। কিছু লোড হয়নি।","Install the new version? Any open editor will be closed; saved data will be preserved.":"নতুন সংস্করণ ইনস্টল করবে? খোলা ফর্ম বন্ধ হবে, সংরক্ষিত ডেটা অক্ষত থাকবে।","NovaStudy · Session starting":"NovaStudy · সেশন শুরু হচ্ছে","Language":"ভাষা","Language preference":"ভাষার পছন্দ","Select interface language":"ইন্টারফেসের ভাষা নির্বাচন","English":"English","বাংলা":"বাংলা","Switch interface language":"ইন্টারফেসের ভাষা পরিবর্তন","The interface language is saved on this device. Your own subjects, notes and JSON backups will not be translated.":"এই ডিভাইসে ইন্টারফেসের ভাষা মনে রাখা হয়। তোমার নিজের বিষয়, নোট ও JSON ব্যাকআপ বদলানো হবে না।","Import suggestions":"সাজেশন ইমপোর্ট","Add first task":"প্রথম কাজ যোগ","See exams":"পরীক্ষা দেখুন","No data":"কোনো ডেটা নেই"};
Object.assign(bn,{"Play":"প্লে","Nursery":"নার্সারি","Kindergarten":"কিন্ডারগার্টেন","SSC Vocational":"এসএসসি ভোকেশনাল","HSC Vocational":"এইচএসসি ভোকেশনাল","Short Course":"স্বল্পমেয়াদি কোর্স","Masters / Postgraduate":"মাস্টার্স / স্নাতকোত্তর","MPhil / Research":"এমফিল / গবেষণা","PhD / Doctoral":"পিএইচডি / ডক্টরাল","Computer / IT":"কম্পিউটার / আইটি","Electrical":"ইলেকট্রিক্যাল","Civil":"সিভিল","Mechanical":"মেকানিক্যাল","Textile":"টেক্সটাইল","Automobile":"অটোমোবাইল","Agriculture":"কৃষি","Custom":"নিজস্ব","EEE / ECE":"ইইই / ইসিই","BBA / Business":"বিবিএ / ব্যবসা","Economics":"অর্থনীতি","English / Literature":"ইংরেজি / সাহিত্য","Law / LLB":"আইন / এলএলবি","Medicine / MBBS":"মেডিসিন / এমবিবিএস","Civil Engineering":"সিভিল ইঞ্জিনিয়ারিং","Mechanical Engineering":"মেকানিক্যাল ইঞ্জিনিয়ারিং","Architecture":"স্থাপত্য","Pharmacy":"ফার্মেসি","Physics":"পদার্থবিজ্ঞান","Mathematics":"গণিত","Other / Custom":"অন্যান্য / নিজস্ব","Early Years":"প্রারম্ভিক শিক্ষা","Elementary":"প্রাথমিক স্তর","Middle School":"মিডল স্কুল","High School":"হাই স্কুল","A Level / IB":"এ লেভেল / আইবি","Undergraduate":"স্নাতক","Postgraduate":"স্নাতকোত্তর","Professional Course":"পেশাগত কোর্স","Custom / International":"নিজস্ব / আন্তর্জাতিক"});
const originals=new WeakMap(),originalAttrs=new WeakMap();
const blocked=".session-text b,.task-main b,.subject-card b,.exam-card-info b,.exam-note,.exam-dashboard h3,.exam-dashboard p,.subject-initial,.task-main small,.exam-card-info span,.hero-copy h2,select[name=\"subjectId\"] option";
let language="en";
try{language=localStorage.getItem(KEY)==="bn"?"bn":"en"}catch{}
const ordinal=n=>({"1":"প্রথম","2":"দ্বিতীয়","3":"তৃতীয়","4":"চতুর্থ","5":"পঞ্চম"}[n]||number(n)+"তম");
function number(value){
 if(language!=="bn")return String(value);
 return String(value).replace(/[0-9]/g,d=>"০১২৩৪৫৬৭৮৯"[Number(d)]);
}
function displayDate(value){
 if(language!=="bn")return String(value||"");
 const v=String(value||"");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
 const [y,m,d]=v.split("-").map(Number),dt=new Date(y,m-1,d,12);
 if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return v;
 return new Intl.DateTimeFormat("bn-BD",{day:"numeric",month:"short",year:"numeric"}).format(dt);
}
function time(value){
 const [h,m]=String(value).split(":").map(Number);
 if(!Number.isFinite(h)||!Number.isFinite(m))return String(value);
 const dt=new Date(2026,0,1,h,m);
 return new Intl.DateTimeFormat(language==="bn"?"bn-BD":"en-US",{hour:"numeric",minute:"2-digit",hour12:true}).format(dt);
}
function clock(date){
 return date.toLocaleTimeString(language==="bn"?"bn-BD":"en-BD",{hour:"numeric",minute:"2-digit",hour12:true});
}
function translate(text){
 if(language!=="bn")return String(text??"");
 const raw=String(text??""),v=raw.trim();
 if(!v)return raw;
 let out=bn[v];
 if(out===undefined){
  let m;
  if((m=/^Class (\d+) \/ HSC (\d+)(?:st|nd|rd|th) Year$/.exec(v)))out="শ্রেণি "+number(m[1])+" / এইচএসসি "+ordinal(m[2])+" বর্ষ";
  else if((m=/^Class (\d+)$/.exec(v)))out="শ্রেণি "+number(m[1]);
  else if((m=/^(Ibtedayi|Dakhil) (\d+)$/.exec(v)))out=(m[1]==="Ibtedayi"?"ইবতেদায়ি ":"দাখিল ")+number(m[2]);
  else if((m=/^Alim (\d+)(?:st|nd|rd|th) Year$/.exec(v)))out="আলিম "+ordinal(m[1])+" বর্ষ";
  else if((m=/^Diploma Semester (\d+)$/.exec(v)))out="ডিপ্লোমা সেমিস্টার "+number(m[1]);
  else if((m=/^Undergraduate — Year (\d+)$/.exec(v)))out="স্নাতক — "+ordinal(m[1])+" বর্ষ";
  else if((m=/^Color (\d+)$/.exec(v)))out="রং "+number(m[1]);
  else if((m=/^Import suggestions \((\d+)\)$/.exec(v)))out="সাজেশন ইমপোর্ট ("+number(m[1])+")";
  else if((m=/^MY SUBJECTS \/ (\d+)$/.exec(v)))out="আমার বিষয় / "+number(m[1]);
  else if((m=/^(\d+) blocks$/.exec(v)))out=number(m[1])+"টি ব্লক";
  else if((m=/^(\d+) (sessions|session) • editable$/.exec(v)))out=number(m[1])+"টি সেশন • সম্পাদনাযোগ্য";
  else if((m=/^(\d+) weekly sessions$/.exec(v)))out=number(m[1])+"টি সাপ্তাহিক সেশন";
  else if((m=/^(\d+) revision blocks$/.exec(v)))out=number(m[1])+"টি রিভিশন সেশন";
  else if((m=/^(\d+) days left$/.exec(v)))out=number(m[1])+" দিন বাকি";
  else if((m=/^(\d+)m remaining$/.exec(v)))out=number(m[1])+" মিনিট বাকি";
  else if((m=/^(\d+)h (\d+)m remaining$/.exec(v)))out=number(m[1])+" ঘণ্টা "+number(m[2])+" মিনিট বাকি";
  else if((m=/^(\d+) scheduled, (\d+) skipped\. (.+)$/.exec(v)))out=number(m[1])+"টি নির্ধারিত, "+number(m[2])+"টি বাদ। "+translate(m[3]);
  else if((m=/^(\d+) blocks created; (\d+) skipped\.$/.exec(v)))out=number(m[1])+"টি ব্লক তৈরি; "+number(m[2])+"টি বাদ।";
  else if((m=/^(\d+) suggested subjects added\.$/.exec(v)))out=number(m[1])+"টি প্রস্তাবিত বিষয় যোগ হয়েছে।";
  else if((m=/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday) routine$/.exec(v)))out=bn[m[1]]+"-এর রুটিন";
  else if((m=/^((?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday))$/.exec(v)))out=bn[m[1]];
  else if((m=/^([A-Za-z]+) • (\d{4}-\d\d-\d\d)$/.exec(v)))out=(bn[m[1]]||m[1])+" • "+displayDate(m[2]);
  else if(v==="Invalid backup file.")out="ব্যাকআপ ফাইলটি সঠিক নয়।";
 }
 if(out===undefined)return raw;
 return raw.replace(v,out);
}
function apply(root=document){
 if(!root)return;
 document.documentElement.lang=language;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const items=[];
 while(walker.nextNode())items.push(walker.currentNode);
 for(const node of items){
  const parent=node.parentElement;
  if(!parent||parent.closest("script,style,textarea,[data-i18n-ignore],"+blocked))continue;
  if(!originals.has(node))originals.set(node,node.nodeValue);
  node.nodeValue=translate(originals.get(node));
 }
 const els=[...(root.nodeType===1?[root]:[]),...(root.querySelectorAll?.("[aria-label],[title],[placeholder]")||[])];
 for(const el of els){
  if(el.closest?.("[data-i18n-ignore]"))continue;
  for(const attr of ["aria-label","title","placeholder"]){
   if(!el.hasAttribute?.(attr))continue;
   let saved=originalAttrs.get(el);if(!saved){saved={};originalAttrs.set(el,saved)}
   if(!(attr in saved))saved[attr]=el.getAttribute(attr);
   el.setAttribute(attr,translate(saved[attr]));
  }
 }
 document.querySelectorAll("[data-lang]").forEach(el=>{
   const active=el.dataset.lang===language;
   el.setAttribute("aria-pressed",String(active));
   el.classList.toggle("is-selected",active);
 });
}
function setLanguage(next){
 if(next!=="en"&&next!=="bn")return false;
 language=next;
 try{localStorage.setItem(KEY,next)}catch{}
 apply();return true;
}
function useExternal(next){
 if(next!=="en"&&next!=="bn")next="en";
 language=next;apply();
}
function format(key,vars={}){
 const out=translate(key);
 return out.replace(/\{(\w+)\}/g,(_,k)=>vars[k]??"");
}
window.NOVA_I18N={KEY,get language(){return language},number,displayDate,time,clock,t:translate,format,apply,setLanguage,useExternal};
})();
