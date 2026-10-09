# NovaStudy — বাংলা সেটআপ ও পাবলিশ গাইড

এটি একটি **responsive PWA (Progressive Web App)**। ওয়েবসাইট থেকে Android/iPhone-এ Home Screen-এ ইনস্টল করা যায়; আলাদা APK/IPA এখনো তৈরি করা হয়নি। প্রথমবার অনলাইনে খুললে অ্যাপের প্রয়োজনীয় ফাইল cache হয়। পরবর্তীতে একই ডিভাইসের localStorage-এ রুটিন ও task থাকবে। ব্রাউজারের ডেটা মুছে ফেললে সেগুলো হারাতে পারে, তাই JSON backup নাও।

## 1. VS Code-এ চালাও

1. `NovaStudy-Routine-v1.0.0.zip` Extract করো।
2. Extracted `NovaStudy-Routine` ফোল্ডার VS Code-এ খোলো।
3. VS Code → Terminal → New Terminal।
4. নিচের যেকোনো একটি কমান্ড চালাও:

```powershell
python -m http.server 5173
```

বিকল্প: `npx serve . -l 5173` (Node.js/npm লাগবে; npx প্রথমবার dependency download করতে পারে)।

5. ব্রাউজারে `http://localhost:5173` খোলো।

## 2. GitHub-এ নতুন repository তৈরি

- নতুন Repo পেজ: https://github.com/new
- **Repository name:** `NovaStudy-Routine`
- **Visibility:** Public
- **Initialize with README:** No (কারণ এই প্রজেক্টে README আছে)
- **Create repository** চাপো।

Extracted প্রজেক্ট ফোল্ডারের VS Code টার্মিনালে:

```powershell
git clone https://github.com/gitwithmasum/NovaStudy-Routine.git
cd NovaStudy-Routine
# Future updates: git pull --ff-only origin main
```

পরবর্তী update:

```powershell
git add .
git commit -m "feat: improve student routine"
git push
```

## 3. Vercel-এ Deploy

- https://vercel.com/new
- GitHub দিয়ে login → **Import Git Repository** → `NovaStudy-Routine`।
- **Framework:** Other (HTML/CSS/JS, কোনো build command নয়)।
- **Root Directory:** `./`।
- **Build Command:** ফাঁকা।
- **Output Directory:** default / project root (অতিরিক্ত `dist` লিখবে না)।
- **Deploy**।
- Deploy শেষ হলে Vercel-এর দেওয়া `https://...vercel.app` URL-ই লাইভ ওয়েবসাইট।
- পরেরবার GitHub `main`-এ push করলে Git integration থাকলে নিজে নিজে redeploy হবে।

## 4. Netlify-তে Deploy (অন্য বিকল্প)

- https://app.netlify.com/start
- Add new project → Import an existing project → GitHub → `NovaStudy-Routine`।
- **Base directory:** ফাঁকা, **Build command:** ফাঁকা, **Publish directory:** `.` (current project root)।
- Deploy → Netlify `https://...netlify.app` URL তৈরি করবে।

## 5. GitHub Pages (অতিরিক্ত বিনামূল্যের বিকল্প)

- Repository → Settings → Pages → Build and deployment → **Deploy from a branch**।
- Branch **main**, folder **/(root)** → Save।
- প্রকাশিত হলে সাধারণত লিংক হবে `https://gitwithmasum.github.io/NovaStudy-Routine/`।
- পরিবর্তন লাইভ হতে কিছু সময় লাগতে পারে; Pages status দেখে নিশ্চিত হও।

## 6. ফোনে ইনস্টল

**Android (Chrome):** নিজের deployed HTTPS URL খোলো → **Install app** অথবা ব্রাউজার menu (⋮) → **Install app / Add to Home Screen**।

**iPhone (Safari):** HTTPS URL খোলো → **Share** → **Add to Home Screen** → **Add**।

**Desktop (Chrome/Edge):** address bar-এর install icon / browser menu-তে install।

> Localhost ছাড়া সাধারণ `file://` দিয়ে HTML খুললে service worker/PWA installation ঠিকমতো কাজ করবে না।

## 7. রুটিন সাজানো

1. **Profile & settings:** education category, class/year, group/major নির্বাচন করো → Save।
2. **Subjects:** ওই category/group অনুযায়ী suggestion যোগ করো; নিজের মতো add/edit করতে পারবে।
3. **Weekly routine:** + Add session দিয়ে সঠিক ক্লাস টাইম বসাও; অথবা **Auto-plan study** দিয়ে আলাদা study block তৈরি করো। Auto-plan কখনো পুরোনো timetable মুছে দেয় না।
4. **Tasks & goals:** assignment/exam/revision যোগ করো।
5. **Settings → Export JSON backup:** অন্য ফোনে নেওয়ার আগে অবশ্যই backup নাও।

## জরুরি সীমাবদ্ধতা

- Subject suggestions বোর্ড, প্রতিষ্ঠান, সিলেবাস বা সেমিস্টারভেদে আলাদা হতে পারে। এগুলো illustrative; official subject catalog নয়।
- Cloud sync/login নেই। রুটিন একটি ব্রাউজার/ডিভাইসে localStorage-এ থাকে।
- Browser notifications **শুধু অ্যাপ খোলা থাকলে** কাজ করার জন্য তৈরি; background push/alarm গ্যারান্টিযুক্ত নয়।
- APK/Play Store/App Store publishing এই v1 প্রকল্পের অংশ নয়। ভবিষ্যতে Capacitor/TWA দিয়ে মোবাইল প্যাকেজ তৈরি করা যায়।
## Theme (v1.1)

Header-এর **Cyber / Black Gold** button বা **Settings → Appearance** থেকে Black & Gold থিম চালু/বন্ধ করা যায়। পছন্দ করা থিম এই ব্রাউজারে সংরক্ষিত থাকে। আগের routine, task, subjects-এর data পরিবর্তন হয় না।

### v1.2 — Theme selection

Settings → Appearance-এ **Cyber** ও **Black & Gold** এর visual preview card থাকবে। Card-এ click করে theme select করবে, অথবা header-এর theme button ব্যবহার করবে। Preference refresh-এর পরও থাকবে; একই browser-এর অন্য tab-এও sync হবে। Routine data বদলাবে না।
