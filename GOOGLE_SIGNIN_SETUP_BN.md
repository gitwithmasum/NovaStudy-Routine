# NovaStudy v1.9 — Google Sign-In Setup (বাংলা)

**Status:** Google Login Profile UI এবং Supabase OAuth PKCE Code যুক্ত। চালু করতে নিজস্ব NovaStudy Supabase Project + Google OAuth Provider Setup প্রয়োজন।

## 0. Local Data আগে Backup
NovaStudy → My Profile & Settings → Export JSON Backup। Google Login শুধু পরিচয় যাচাই করে; Routine, Tasks, Exams, CSE 100, Attendance এখনো Browser Local Storage-এ থাকবে, Cloud Sync নয়।

## 1. NovaStudy-এর জন্য আলাদা Supabase Project
1. https://supabase.com/dashboard/projects এ নতুন NovaStudy-Auth Project তৈরি করো। Cost/Plan Dashboard-এ যাচাই করবে।
2. Project Settings → API Keys থেকে Publishable Key (sb_publishable_...) সংগ্রহ করো।
3. Project URL সংগ্রহ করো: https://PROJECT_REF.supabase.co।
4. Aurora Bachelor বা অন্য Project-এর Auth/Database মিশিয়ে ব্যবহার করো না।

## 2. Google Cloud OAuth
1. https://console.cloud.google.com/auth/overview → Branding, Audience ও Clients Configure করো।
2. Web Application OAuth Client তৈরি করো। Testing Audience থাকলে Test Users-এ নিজের Google Account যুক্ত করো।
3. Authorized JavaScript Origins:
   - https://novastudy-routine.vercel.app
   - https://novastudy-routine.netlify.app
   - https://gitwithmasum.github.io
   - http://localhost:5500 (লোকাল হলে তোমার প্রকৃত Port)
4. Authorized Redirect URI: https://PROJECT_REF.supabase.co/auth/v1/callback
5. Client ID এবং Client Secret শুধু Supabase Dashboard-এ রাখবে; GitHub-এ নয়।

## 3. Supabase Provider ও Allowed URLs
1. Supabase Dashboard → Authentication → Providers → Google → Enable।
2. Google OAuth Client ID ও Secret Provider Settings-এ Save করো।
3. Authentication → URL Configuration:
   - Site URL: https://novastudy-routine.vercel.app
   - Redirect URL: https://novastudy-routine.vercel.app/**
   - Redirect URL: https://novastudy-routine.netlify.app/**
   - Redirect URL: https://gitwithmasum.github.io/NovaStudy-Routine/**
   - Redirect URL: http://localhost:5500/** (লোকাল Preview-র জন্য)

## 4. Public Browser Configuration
GitHub-এর auth-config.js ফাইলে শুধু এই Public Values বসাও:
   supabaseUrl: "https://PROJECT_REF.supabase.co"
   publishableKey: "sb_publishable_YOUR_PUBLIC_KEY"
sb_secret_*, service_role বা Google OAuth Client Secret কখনো GitHub বা Browser JavaScript-এ রেখো না।

## 5. Test & QA
1. Profile & Settings → Google Account → Continue with Google।
2. Consent শেষে Account Name ও Email দেখা যাবে।
3. Refresh করে Session টিকে আছে কি না যাচাই করো।
4. Sign Out করে আগের Tasks, Exams ও Challenge Progress আছে কি না যাচাই করো।
5. Desktop, Mobile Browser, Installed PWA ও উভয় Live Origin-এ আলাদাভাবে পরীক্ষা করো।
6. Netlify ও Vercel Local Storage এক নয়; Login করে স্বয়ংক্রিয় Data Transfer হবে না।

## Troubleshooting
- Setup required: auth-config.js খালি বা অবৈধ।
- Redirect mismatch: Google Cloud-এ Supabase Auth Callback URL ঠিক করো।
- Redirect not allowed: Supabase URL Configuration-এ Live Origin যোগ করো।
- Invalid client: Provider Client ID/Secret বা Test Audience পরীক্ষা করো।
- Offline: Google Login-এর জন্য Internet প্রয়োজন।

Official: https://supabase.com/docs/guides/auth/social-login/auth-google
Redirects: https://supabase.com/docs/guides/auth/redirect-urls
