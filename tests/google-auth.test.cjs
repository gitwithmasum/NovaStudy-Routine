const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const read=name=>readFileSync(path.join(__dirname,"..",name),"utf8");
const authCode=read("auth.js");
function boot({configured=false,existingUser=null,signInError=null}={}){
 const saved=new Map([["novastudy_state_v1",'{"version":1,"tasks":[{"title":"KEEP"}],"challenge":{"items":[]}}']]);
 let assigned="",notifies=0,signOuts=0,authParams=null,clientOptions=null;
 const user={id:"verified-account",email:"student@gmail.com",user_metadata:{full_name:"Test Learner"}};
 const sdkClient={auth:{
  onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
  async getUser(){return {data:{user:existingUser===false?null:(existingUser||user)},error:null}},
  async signInWithOAuth(params){authParams=params;return signInError?{data:null,error:new Error("Invalid OAuth provider")}:{data:{url:"https://example.com/oauth/authorize"},error:null}},
  async signOut(){signOuts++;return {error:null}}
 }};
 const avatar={textContent:"ST",title:"",setAttribute(){}};
 const cfg=configured?{supabaseUrl:"https://separate-project.supabase.co",publishableKey:"sb_publishable_test_public_value"}:{supabaseUrl:"",publishableKey:""};
 const win={NOVASTUDY_AUTH_CONFIG:cfg,NOVA:{escape:s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")},
 NOVA_I18N:{language:"en"},location:{origin:"https://novastudy-routine.vercel.app",pathname:"/",assign:u=>{assigned=u}},
 supabase:{createClient:(url,key,options)=>{clientOptions={url,key,options};return sdkClient}}};
 const doc={querySelector:q=>q===".avatar-button"?avatar:null,head:{appendChild(){}},createElement:()=>({})};
 const ctx={window:win,document:doc,Promise,Error,String,Object,Number,queueMicrotask};
 vm.runInNewContext(authCode,ctx,{filename:"auth.js"});
 return {A:win.NOVA_AUTH,win,cfg,saved,avatar,getAssigned:()=>assigned,getParams:()=>authParams,getOptions:()=>clientOptions,getSignOuts:()=>signOuts,init:()=>win.NOVA_AUTH.init({refresh:()=>notifies++,toast:()=>{}}),getNotifies:()=>notifies};
}
test("unconfigured project displays setup required and never pretends login succeeded",async()=>{
 const s=boot();
 await s.init();
 assert.equal(s.A.configured(),false);
 assert.equal(s.A.getStatus(),"unconfigured");
 assert.match(s.A.panel(),/Setup required/);
 assert.match(s.A.panel(),/disabled/);
 assert.equal(await s.A.signIn(),false);
 assert.equal(s.getAssigned(),"");
});
test("sign-in starts Google OAuth using project URL and only a publishable key",async()=>{
 const s=boot({configured:true});
 await s.init();
 assert.equal(s.A.configured(),true);
 assert.equal(s.A.getStatus(),"connected");
 const opts=s.getOptions();
 assert.equal(opts.url,"https://separate-project.supabase.co");
 assert.match(opts.key,/^sb_publishable_/);
 assert.equal(opts.options.auth.flowType,"pkce");
 assert.equal(opts.options.auth.storageKey,"novastudy_google_auth_v1");
 assert.equal(await s.A.signIn(),true);
 assert.equal(s.getParams().provider,"google");
 assert.equal(s.getParams().options.redirectTo,"https://novastudy-routine.vercel.app/#settings");
 assert.match(s.getAssigned(),/^https:\/\//);
});
test("verified user shown in account panel, and sign-out does not erase any study records",async()=>{
 const s=boot({configured:true});
 await s.init();
 assert.match(s.A.panel(),/Test Learner/);
 assert.match(s.A.panel(),/student@gmail.com/);
 const before=s.saved.get("novastudy_state_v1");
 assert.equal(await s.A.signOut(),true);
 assert.equal(s.getSignOuts(),1);
 assert.equal(s.A.getStatus(),"guest");
 assert.equal(s.saved.get("novastudy_state_v1"),before);
 assert.match(s.A.panel(),/Continue with Google/);
});
test("sign-in failure doesn't redirect or change study state",async()=>{
 const s=boot({configured:true,signInError:true});
 await s.init();
 const before=s.saved.get("novastudy_state_v1");
 assert.equal(await s.A.signIn(),false);
 assert.equal(s.A.getStatus(),"error");
 assert.equal(s.getAssigned(),"");
 assert.equal(s.saved.get("novastudy_state_v1"),before);
});
test("account metadata is escaped and not injected as HTML",async()=>{
 const bad={id:"user",email:'<img src=x onerror="alert(1)">',user_metadata:{full_name:'<script>evil()</script>'}};
 const s=boot({configured:true,existingUser:bad});
 await s.init();
 assert.match(s.A.panel(),/&lt;script&gt;/);
 assert.match(s.A.panel(),/&lt;img/);
 assert.doesNotMatch(s.A.panel(),/<script>evil/);
});
test("auth feature is integrated with local-first UI, PWA cache, bilingual and profile navigation",()=>{
 const h=read("index.html"),a=read("app.js"),v=read("views.js"),sw=read("sw.js"),ci=read(".github/workflows/novastudy-tests.yml");
 assert.match(h,/src="\.\/auth-config\.js"/);
 assert.match(h,/src="\.\/auth\.js"/);
 assert.match(h,/href="\.\/auth\.css"/);
 assert.match(h,/NOVASTUDY OS <b>1\.9\.0<\/b>/);
 assert.match(a,/Auth\.handle\(action\)/);
 assert.match(v,/NOVA_AUTH\.panel/);
 assert.match(sw,/novastudy-v1\.9\.0/);
 assert.match(sw,/'\.\/auth-config\.js'/);
 assert.match(ci,/node --check auth\.js/);
 for(const file of ["auth-config.js","auth.js","index.html","app.js","views.js"]){
  if(file.endsWith(".js"))assert.doesNotThrow(()=>new vm.Script(read(file),{filename:file}));
 }
});
