# NovaStudy v3.6.3 — Skills & Modules Workspace

## User workflow
- New **Skills & Modules** tab inside CSE Learning Hub, and clickable Skills cards from Overview.
- Six initial Skills: Programming Practice, DSA & CP, AI & ML, Full Stack, Projects and Resources.
- Add your own skills, rename/edit descriptions, delete a skill, and open any skill for a course-like module view.
- Add, edit, delete and expand/collapse learning modules.
- Each module can contain Topic/Notes, Code snippets and PDF resources. Titles/content can be edited or deleted and each resource can be marked completed. Code displays in a fixed monospace preformatted panel.
- PDFs can be attached by HTTPS link (portable to other devices) or uploaded as local PDFs (maximum 8 MB each). Local uploads are saved in browser IndexedDB `novastudy-skill-pdfs` and downloaded by the resource's local PDF action.
- The navigation keeps Overview, Skills & Modules, CSE 100 Challenge and Programming Practice. DSA & CP, AI & ML and Full Stack each expose their 14 previously separate roadmap topics as editable, expandable modules with the original five-state learning statuses. Projects and Resources now live within dedicated, auto-expanded skill modules; existing project milestones and saved URL records remain intact and fully usable.

## Storage, data integrity and limitations
- v3.6.3 migrates valid previous Learning Hub records and older imported backups once, preserving existing DSA learning statuses and custom modules. Intentionally removed modules are not recreated.
- Skill and module metadata, notes and source code are stored in the existing validated browser `novastudy_learning_hub_v1` data key. New validation applies to nested Skills, Modules and Items, and **legacy v1 payloads without a Skills field remain valid**.
- Learning Hub JSON export/import and the combined local backup include metadata and source code. **They do NOT contain the bytes of locally uploaded PDFs stored in IndexedDB.** PDF links are portable. Users should retain original PDF files elsewhere for restore or device migration.
- Existing routine, exams, cloud backup, course manager, user identity and CSE 100 state remain unchanged.
- Each Skill allows up to 40 modules, each Module up to 80 resources, up to 48 Skills, a code/note item up to 12k characters, and the Learning Hub metadata storage limit remains 750k characters.
- Local PDF attachments require browser IndexedDB permission/storage quota. On devices without IndexedDB, use an HTTPS PDF link.
- This feature follows the uploaded reference's module list concept, not a copy of the Ostad site or its private course materials.
- No automatic cloud sync or cross-device PDF transfer has been added.

## QA
- Regression tests cover existing default Skills, legacy data, Skill and Module CRUD, Topic/Code/PDF URL items, done statuses, escaped HTML, safe URLs, duplicate skills, deletion confirmation, storage failure and combined backup compatibility.
- Static responsive styles in `learning-hub.css` maintain the existing Cyber, Black & Gold, Mint Halftone and Neon Wave themes.
- Cache/footer version: `v3.6.3`; check installed PWA Update & Reload.
- Manual Android PWA upload/open test and scroll FPS verification remain outstanding.

## v3.6.3: File & Folder uploads
- Each skill module supports Topic/Notes, Code, PDF, **Any File**, and **Folder** content types. A single file (including PDF) can be up to 20 MiB, or a folder can contain multiple files totalling at most 20 MiB.
- Folder uploads use the browser's directory picker; subfolder relative paths are retained and a client-side ZIP can be downloaded without a server. Empty directories cannot be stored by this browser picker. The limit is 10,000 files per folder to protect browser performance.
- Uploaded binary data remains in the existing `novastudy-skill-pdfs` IndexedDB store (now shared for all attachment types). Learning Hub JSON backup contains metadata only, **not file/folder bytes**. For portability, retain original files. Local uploads are offline-capable but browser storage permissions and quotas still apply.
- Validated upload sizes, safe paths, failure rollback and legacy PDF items are retained. The app does not automatically run uploaded code or executables.
