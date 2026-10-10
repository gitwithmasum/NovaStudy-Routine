/* CSE 100 learning catalogue: ten blocks, exactly 100 stable IDs, bilingual practice. */
(function(){
"use strict";
const blocks=[
{title:"Computer Science Foundations",bn:"কম্পিউটার সায়েন্সের ভিত্তি",topics:[
["Computational Thinking & Logic","Algorithms, decomposition, abstraction, pseudocode and flowcharts.","Draw a cash withdrawal ATM flowchart.","ATM থেকে টাকা তোলার একটি Flowchart আঁকো।"],
["Computer Architecture & Digital Logic","Binary, hexadecimal, gates, CPU, RAM, cache and GPU.","Convert binary 1010 to decimal and explain CPU vs RAM.","1010 বাইনারিকে দশমিকে রূপান্তর করে CPU ও RAM-এর কাজ বোঝাও।"],
["Operating Systems","Processes, threads, scheduling, memory, file systems and deadlocks.","Inspect process CPU and memory use in Task Manager.","Task Manager দিয়ে Process, CPU ও Memory দেখো।"],
["Linux, Terminal & Shell","CLI, permissions, Bash, PowerShell and environment variables.","Create, copy and rename files through a terminal.","Terminal দিয়ে Folder ও File তৈরি, Copy ও Rename করো।"],
["Computer Networking & Internet","OSI, TCP/IP, IP, DNS, HTTP/S, routing and ports.","Inspect a domain with ping, ipconfig and nslookup.","ping, ipconfig, nslookup দিয়ে একটি Domain পরীক্ষা করো।"],
["Discrete Mathematics","Sets, relations, truth tables, combinatorics, graphs and proofs.","Build AND, OR and NOT truth tables.","AND, OR ও NOT-এর Truth Table তৈরি করো।"],
["Linear Algebra","Vectors, matrices, dot products, eigenvalues and embeddings.","Add two matrices in NumPy.","NumPy দিয়ে দুটি Matrix যোগ করো।"],
["Calculus & Optimization","Derivatives, gradients, chain rule and gradient descent.","Differentiate a function and locate a minimum.","একটি Function-এর Derivative ও Minimum বের করো।"],
["Probability & Statistics","Means, variance, distributions, Bayes theorem and correlation.","Calculate mean, median and standard deviation of 20 values.","২০টি সংখ্যার Mean, Median ও Standard Deviation বের করো।"],
["Compilers, Runtimes & Programming Languages","Compilation, interpretation, bytecode, JIT and garbage collection.","Diagram how C and Python programs execute.","C ও Python Program কীভাবে Execute হয় আঁকো।"]
]},
{title:"Programming & Developer Tools",bn:"প্রোগ্রামিং ও ডেভেলপার টুলস",topics:[
["Python Programming","Types, conditions, loops, collections, functions and files.","Build a command-line calculator.","Command-Line Calculator তৈরি করো।"],
["C / C++ & Memory Management","Pointers, arrays, stack, heap, structs and STL.","Find the largest item in a C++ array.","C++ দিয়ে Array-এর Largest Number বের করো।"],
["JavaScript Fundamentals","Closures, objects, functions, modules, promises and event loop.","Build an interactive counter.","JavaScript Interactive Counter তৈরি করো।"],
["TypeScript & Type Systems","Static typing, interfaces, generics, unions and narrowing.","Convert a JavaScript calculator to TypeScript.","JavaScript Calculator TypeScript-এ Convert করো।"],
["Object-Oriented Programming","Encapsulation, inheritance, polymorphism, abstraction and SOLID.","Model student registration with Student and Course classes.","Student ও Course Class দিয়ে Registration Model বানাও।"],
["Functional, Asynchronous & Concurrent Programming","Pure functions, immutability, async/await and race conditions.","Run three fake API calls concurrently.","৩টি Fake API Call Parallel চালাও।"],
["Developer Environment & Debugging","VS Code, breakpoints, virtual environments, npm and exceptions.","Find a bug using a VS Code breakpoint.","VS Code Breakpoint দিয়ে একটি Bug ঠিক করো।"],
["Git, GitHub & Team Collaboration","Commits, branching, merging, pull requests and README files.","Create a repository, branch and pull request.","নতুন Repository, Branch ও Pull Request তৈরি করো।"],
["Testing & Program Reliability","Unit tests, mocks, edge cases and assertions.","Write five unit tests for a calculator.","Calculator-এর ৫টি Unit Test লেখো।"],
["Clean Code & Documentation","Refactoring, modularity, DRY, documentation and reviews.","Refactor your calculator and write a README.","Calculator Refactor করে README লেখো।"]
]},
{title:"Data Structures & Algorithms",bn:"ডেটা স্ট্রাকচার ও অ্যালগরিদম",topics:[
["Time & Space Complexity","Big O, Theta, Omega and common growth rates.","Analyze nested-loop time complexity.","Nested Loop-এর Complexity বিশ্লেষণ করো।"],
["Arrays & Strings","Traversal, prefix sums, counts and string operations.","Write a palindrome detector.","Palindrome Checker তৈরি করো।"],
["Linked Lists, Stacks & Queues","Singly/doubly lists, LIFO, FIFO and deques.","Implement a balanced-parentheses checker.","Stack দিয়ে Balanced Parentheses Checker বানাও।"],
["Hashing & Hash Tables","Hash maps, sets, collisions and lookup performance.","Detect anagrams using a hash map.","Hashmap দিয়ে Anagram শনাক্ত করো।"],
["Recursion & Backtracking","Call stacks, recursion trees, permutations and subsets.","Implement factorial and a subset generator.","Recursive Factorial ও Subset Generator বানাও।"],
["Searching & Sorting Algorithms","Binary search, merge sort, quicksort and complexity.","Implement binary search from scratch.","নিজে Binary Search Implement করো।"],
["Trees, Heaps & Tries","Binary trees, BST, traversals, heaps and tries.","Print binary-tree traversals.","Binary Tree Traversal Print করো।"],
["Graph Algorithms","BFS, DFS, Dijkstra, components and topological ordering.","Find a shortest path on a small graph.","একটি Graph-এ Shortest Path খুঁজে বের করো।"],
["Greedy, Two Pointers & Sliding Window","Greedy decisions, pointers, windows and intervals.","Compute maximum fixed-window subarray sum.","Fixed Window-এর Maximum Subarray Sum বের করো।"],
["Dynamic Programming & Competitive Programming","Memoization, tabulation, knapsack and state transitions.","Memoize Fibonacci and solve three easy DSA tasks.","Fibonacci Memoization করে ৩টি Easy DSA Problem Solve করো।"]
]},
{title:"Frontend, Web Design & UX",bn:"ফ্রন্টএন্ড, ওয়েব ডিজাইন ও UX",topics:[
["How Websites & Browsers Work","DOM, rendering, HTTP requests, static/dynamic, SSR and CSR.","Inspect a browser network request.","Browser DevTools-এ Network Request দেখো।"],
["HTML5, Semantic Web & Accessibility","Semantic tags, forms, labels, keyboard navigation and ARIA.","Build an accessible contact form.","Accessible Contact Form তৈরি করো।"],
["CSS3 & Responsive Design","Flexbox, Grid, positioning, media queries and animations.","Create a mobile-friendly landing page.","Mobile/Desktop Responsive Landing Page বানাও।"],
["DOM, Events & Browser APIs","DOM events, Fetch API, localStorage and sessionStorage.","Build a persistent browser to-do list.","Data-saving To-Do List বানাও।"],
["React.js Fundamentals","Components, props, state, hooks, effects and rendering.","Build a searchable React task list.","React Searchable Task List বানাও।"],
["Next.js & Web Rendering","Routing, layouts, SSR, SSG, ISR and server components.","Build a three-page Next.js portfolio.","Next.js দিয়ে ৩-পেজ Portfolio বানাও।"],
["UI/UX, HCI & Figma","Wireframes, prototypes, usability and WCAG.","Design a dashboard wireframe in Figma.","Figma-তে Dashboard Wireframe আঁকো।"],
["CSS Frameworks & Component Libraries","Tailwind, Bootstrap, shadcn/ui and design tokens.","Build a pricing card in Tailwind and plain CSS.","Tailwind ও Plain CSS-এ Pricing Card বানাও।"],
["Web Performance, SEO & PWA","Core Web Vitals, Lighthouse, caching and service workers.","Audit a website with Lighthouse.","Lighthouse দিয়ে Website Audit করো।"],
["Frontend Testing & Browser Compatibility","Browser QA, responsive tests and Playwright/Cypress.","Write an end-to-end form submission test.","Form Submission-এর Browser Test লেখো।"]
]},
{title:"Backend, APIs & Databases",bn:"ব্যাকএন্ড, API ও ডেটাবেজ",topics:[
["Backend Languages & Frameworks","Express, FastAPI, Django, Flask, Laravel and server execution.","Run a simple Express or FastAPI endpoint.","Express বা FastAPI দিয়ে Hello World API চালাও।"],
["REST APIs, JSON & HTTP","CRUD, HTTP methods, status codes, OpenAPI and Postman.","Design CRUD endpoints for a book collection.","Books CRUD API Design করো।"],
["DBMS & Database Modeling","ER diagrams, keys, normalization and relations.","Draw a library management ER diagram.","Library Management System-এর ER Diagram আঁকো।"],
["SQL & Relational Databases","PostgreSQL, MySQL, joins, indexes and transactions.","Join student and course tables with SQL.","Students ও Courses Table JOIN করো।"],
["NoSQL & Caching","MongoDB, Redis, document and key-value stores.","Compare appropriate SQL and NoSQL use cases.","কখন SQL/NoSQL বেছে নেবে তা তুলনা করো।"],
["Authentication & Authorization","Hashing, sessions, cookies, JWT, OAuth and roles.","Diagram admin and user login permissions.","Login Flow ও Admin/User Permissions Diagram আঁকো।"],
["ORM, Migrations & Data Validation","Prisma, SQLAlchemy, migrations and validation.","Create a database schema migration.","Database Schema Migration লেখো।"],
["File Upload & Cloud Storage","Upload validation, signed URLs, S3 and object storage.","Design a secure profile photo upload.","Profile Photo Upload Architecture আঁকো।"],
["Realtime Systems, WebSockets & Webhooks","WebSockets, SSE, webhooks, queues and background jobs.","Prototype two-tab real-time data sync.","দুটি Browser Tab-এ Realtime Sync Prototype বানাও।"],
["Full-Stack Application Integration","React, API, database, CORS and error states.","Connect a React UI to a database-backed CRUD API.","React Frontend + CRUD API + Database Connect করো।"]
]},
{title:"Website Building, Hosting & Deployment",bn:"ওয়েবসাইট তৈরি, হোস্টিং ও ডিপ্লয়মেন্ট",topics:[
["Website Planning & Requirements","Users, sitemap, wireframes and requirements.","Plan a perfume shop sitemap and features.","Perfume Store-এর Sitemap ও Feature List বানাও।"],
["Website Building Methods & AI Builders","Manual coding, Wix, Webflow, Framer, v0, Lovable, Bolt and Replit.","Build a landing page manually and with AI.","একটি Landing Page Manual ও AI দিয়ে তৈরি করো।"],
["CMS & E-Commerce Systems","WordPress, WooCommerce, Shopify, Ghost and headless CMS.","Create a sample WordPress page.","WordPress Playground-এ Sample Page বানাও।"],
["Project Setup, Build Tools & Configuration","Vite, npm, build output, environment variables and lockfiles.","Build a Vite project and inspect dist.","Vite Project Build করে dist Folder দেখো।"],
["Static Hosting Platforms","GitHub Pages, Netlify, Cloudflare Pages and static sites.","Publish HTML/CSS to GitHub Pages.","HTML/CSS Website GitHub Pages-এ Publish করো।"],
["Frontend & Serverless Hosting","Vercel, Netlify, previews and serverless limits.","Deploy a React/Next.js demo.","React/Next.js Demo Vercel বা Netlify-তে Publish করো।"],
["Backend & Server Hosting","Render, Railway, Fly.io, VPS and health checks.","Plan deployment of a demo FastAPI server.","Demo FastAPI/Express Deployment Workflow আঁকো।"],
["Domain, DNS, SSL & CDN","Domain registrars, records, HTTPS and CDNs.","Diagram a custom domain connection.","Free URL ও Custom Domain Connect করার Diagram আঁকো।"],
["Managed Databases, Storage & BaaS","Supabase, Neon, Firebase, cloud Postgres and secrets.","Connect to a demo managed database safely.","Demo Database Environment Variables দিয়ে Connect করো।"],
["CI/CD & Production Operations","GitHub Actions, deployment, monitoring, backup and rollback.","Draw a push-build-test-deploy pipeline.","Push → Build → Test → Deploy Pipeline আঁকো।"]
]},
{title:"Software Engineering, Cloud & Future Tech",bn:"সফটওয়্যার ইঞ্জিনিয়ারিং, ক্লাউড ও ফিউচার টেক",topics:[
["SDLC, Agile & Project Management","User stories, Scrum, Kanban, requirements and acceptance.","Create five user stories and a sprint backlog.","৫টি User Story ও Sprint Backlog তৈরি করো।"],
["Software Architecture & System Design","Monolith, MVC, layering, API boundaries and tradeoffs.","Diagram a routine app architecture.","Routine App-এর Architecture Diagram আঁকো।"],
["Design Patterns & Maintainability","Factory, Strategy, Observer and dependency injection.","Implement a payment Strategy pattern.","Strategy Pattern দিয়ে Payment Example বানাও।"],
["Docker & Containerization","Images, containers, Dockerfiles, volumes and Compose.","Containerize a Hello World app.","Hello World App Docker Container-এ চালাও।"],
["Linux Servers & Web Infrastructure","SSH, Nginx, reverse proxies, systemd and ports.","Explain an Nginx reverse proxy request.","Nginx Reverse Proxy Flow ব্যাখ্যা করো।"],
["Cloud Computing & Serverless","AWS, Azure, GCP, IaaS/PaaS/SaaS, IAM and costs.","Draw a free-tier cloud architecture.","Free-Tier Cloud Architecture Diagram আঁকো।"],
["Scalable & Distributed Systems","Load balancing, queues, replication, CAP and reliability.","Sketch a system serving one million users.","১০ লাখ User-এর App Scaling Plan আঁকো।"],
["Monitoring, Reliability & DevOps","Metrics, logs, traces, alerts, SLO and incidents.","Write an application error monitoring plan.","App Error Monitoring Plan লেখো।"],
["Mobile & Cross-Platform Development","Kotlin, Swift, Flutter, React Native and PWA.","Prototype and compare PWA vs native.","Web App, PWA ও Native App Prototype তুলনা করো।"],
["Emerging Computing Technologies","IoT, embedded systems, AR/VR, robotics, blockchain and quantum.","Compare two emerging technology use cases.","দুটি Emerging Technology-এর Use Case তুলনা করো।"]
]},
{title:"Cybersecurity & Ethical Hacking",bn:"সাইবারসিকিউরিটি ও এথিক্যাল হ্যাকিং",topics:[
["Cybersecurity Fundamentals & Ethics","CIA, risk, vulnerabilities, threat surfaces and consent.","List five security risks in your demo app.","নিজের Demo Website-এর ৫টি Risk লিখো।"],
["Network Security & Defense","Firewalls, VPN, segmentation, IDS and safe inspection.","Review your own router security settings.","নিজের Router Security Settings Review করো।"],
["OWASP Top 10 & Web Vulnerabilities","SQLi, XSS, CSRF, SSRF and insecure access control.","Study a vulnerability in an authorized lab.","Authorized OWASP Juice Shop Lab-এ Vulnerability বোঝো।"],
["Identity, Password & Account Security","MFA, password managers, password hashing and recovery.","Create a secure login checklist.","Secure Login Checklist বানাও।"],
["Cryptography & Transport Security","Keys, TLS, certificates, PKI, digital signatures and salts.","Explain encryption vs hashing with examples.","Hashing ও Encryption-এর পার্থক্য লেখো।"],
["API Security & Access Controls","CORS, rate limits, JWT, IDOR/BOLA and privileges.","Test authorization on your own demo API.","নিজের Demo API-এর Authorization Rules Test করো।"],
["Secure SDLC & Supply Chain Security","SAST, DAST, dependency audits and SBOM.","Audit dependencies in a practice project.","Practice Project-এ Dependency Audit চালাও।"],
["Server Hardening & Secret Management","SSH keys, patches, secrets and least privilege.","Check your own demo project for hardcoded secrets.","Demo Project-এ Hard-coded Secret খুঁজে দেখো।"],
["Threat Modeling & Ethical Security Testing","STRIDE, trust boundaries and scoped testing.","Threat-model an app you own.","নিজের Demo App-এর Threat Model বানাও।"],
["Incident Response, Digital Forensics & Privacy","Detect, contain, recover, logs and privacy by design.","Write a fictional breach response checklist.","Demo Data Leak Response Checklist বানাও।"]
]},
{title:"Data Science, Machine Learning & Deep Learning",bn:"ডেটা সায়েন্স, মেশিন লার্নিং ও ডিপ লার্নিং",topics:[
["Data Lifecycle & Data Engineering","Collection, cleaning, labels, ETL/ELT and data quality.","Clean a CSV and correct types.","CSV Dataset Clean করে Column Types ঠিক করো।"],
["NumPy, Pandas & Notebooks","Arrays, DataFrames, grouping, Jupyter and Colab.","Load a CSV and group records.","CSV Load করে GroupBy Summary করো।"],
["Exploratory Data Analysis & Visualization","EDA, correlations, outliers and Matplotlib.","Create three charts and three insights.","Dataset থেকে ৩টি Chart ও ৩টি Insight বের করো।"],
["Statistical Inference & Experimentation","Sampling, intervals, hypotheses and A/B testing.","Write an A/B test hypothesis.","Sample A/B Test-এর Hypothesis লেখো।"],
["Feature Engineering & Preprocessing","Encoding, scaling, data leakage and splitting.","Preprocess an ML dataset.","ML Dataset Preprocess করো।"],
["Supervised Machine Learning","Regression, classification, trees and random forests.","Train an Iris dataset classifier.","Iris Classification Model Train করো।"],
["Unsupervised Learning & Recommenders","K-means, PCA, anomalies and recommendations.","Cluster customers with K-means.","K-means দিয়ে Customer Groups তৈরি করো।"],
["Model Evaluation & Generalization","F1, accuracy, precision/recall, cross-validation and fairness.","Build and explain a confusion matrix.","Confusion Matrix দিয়ে Model Evaluate করো।"],
["Deep Learning with PyTorch","Tensors, autograd, backpropagation and GPUs.","Train a small neural network in PyTorch.","PyTorch দিয়ে ছোট Neural Network Train করো।"],
["NLP, Computer Vision & Sequence Models","CNN, RNN, Transformers, text and image classification.","Try a pretrained text or image classifier.","Pre-trained Text/Image Classification Demo চালাও।"]
]},
{title:"Generative AI, AI Agents & Research",bn:"জেনারেটিভ AI, এজেন্ট ও গবেষণা",topics:[
["LLMs, Transformers & Generative AI","Tokens, embeddings, attention, multimodal models and inference.","Compare rule-based, ML and LLM systems.","LLM, Traditional ML ও Rule-based System তুলনা করো।"],
["AI Tools for Coding & Software Development","ChatGPT, Claude, Gemini, Copilot, Cursor and code review.","Generate, test and improve an AI-assisted function.","AI দিয়ে Function বানিয়ে নিজে Test ও Improve করো।"],
["Prompt Engineering & Structured Outputs","Context, constraints, examples, JSON schemas and iteration.","Compare three prompts for the same programming task.","একই Programming Task-এর ৩টি Prompt তুলনা করো।"],
["LLM APIs & AI App Integration","API keys, streaming, token costs, privacy and rate limits.","Diagram an AI API request-response lifecycle.","AI API Request/Response Flow আঁকো।"],
["RAG, Embeddings & Vector Databases","Chunking, retrieval, semantic search and pgvector.","Design a searchable knowledge base from five notes.","৫টি Note দিয়ে Searchable Knowledge Base Design করো।"],
["AI Agents, Tool Calling & MCP","Tools, permissions, Model Context Protocol and orchestration.","Design a safe to-do assistant tool workflow.","To-Do Assistant-এর Safe Tool Workflow আঁকো।"],
["AI Evaluation, Reliability & Safety","Hallucinations, injection, bias, guardrails and review.","Design a rubric to evaluate ten AI answers.","AI-এর ১০টি Answer যাচাইয়ের Rubric বানাও।"],
["MLOps, Model Deployment & Fine-tuning","Tracking, serving, Hugging Face, LoRA and drift.","Plan serving an ML model over an API.","ML Model API Deployment Plan লেখো।"],
["Scientific Research & Academic Publishing","Literature reviews, citations, Elicit, LaTeX, arXiv and Zenodo.","Write a research question and summarize five papers.","Research Question ও ৫টি Related Paper-এর Summary লেখো।"],
["Future Research & Engineering Capstone","Multimodal, edge/federated AI, green computing and trustworthy AI.","Propose a problem, method, dataset and capstone.","Research Problem, Method, Dataset ও Project Proposal তৈরি করো।"]
]}
];
const topics=blocks.flatMap((block,index)=>block.topics.map((topic,offset)=>Object.freeze({
 id:index*10+offset+1,block:index+1,title:topic[0],learn:topic[1],practice:topic[2],practiceBn:topic[3]
})));
if(blocks.length!==10||blocks.some(b=>b.topics.length!==10)||topics.length!==100)throw Error("CSE 100 catalog invalid");
window.NOVA_CHALLENGE_DATA=Object.freeze({blocks,topics});
})();
