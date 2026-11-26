import {auth, db, A, F} from "./firebase.js";
import {ctx, list} from "./db.js";

const $ = id => document.getElementById(id);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const BOTTOM = [["home","الرئيسية","⌂"],["bookings","الحجوزات","▣"],["calendar","التقويم","▦"],["services","الخدمات","✦"]];
const MORE = [["customers","العملاء"],["invoices","الفواتير"],["contracts","العقود"],["expenses","المصروفات"],["reports","التقارير"],["settings","الإعدادات"]];
const TITLES = Object.fromEntries([...BOTTOM.map(x=>[x[0],x[1]]), ...MORE]);

let page = "home", tenants = [], renderToken = 0;
const pages = {home: renderHome};

function toast(msg){
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
const ERR = {
  "auth/invalid-credential":"البريد أو كلمة المرور غير صحيحة",
  "auth/email-already-in-use":"هذا البريد مسجّل مسبقًا",
  "auth/weak-password":"كلمة المرور ضعيفة",
  "auth/invalid-email":"البريد الإلكتروني غير صحيح",
  "auth/too-many-requests":"محاولات كثيرة، حاول بعد قليل",
  "permission-denied":"ما عندك صلاحية لهذا الإجراء. راجع قواعد قاعدة البيانات"
};
const errMsg = e => ERR[e.code] || ("حدث خطأ: " + (e.message || e));

function buildNav(){
  $("bottomNav").innerHTML = BOTTOM.map(([k,l,i]) => `<button data-p="${k}"><i>${i}</i>${l}</button>`).join("");
  $("drawer").innerHTML = `<div class="drawer-head">مَدار</div>` +
    [...BOTTOM.map(x=>[x[0],x[1]]), ...MORE].map(([k,l]) => `<button data-p="${k}">${l}</button>`).join("") +
    `<button id="logoutBtn" style="color:var(--red)">تسجيل الخروج</button>`;
  document.querySelectorAll("[data-p]").forEach(b => b.onclick = () => go(b.dataset.p));
  $("logoutBtn").onclick = () => A.signOut(auth);
}
function drawer(open){
  $("drawer").classList.toggle("open", open);
  $("drawerBg").classList.toggle("hidden", !open);
}
function go(p){
  page = p; drawer(false);
  document.querySelectorAll("[data-p]").forEach(b => b.classList.toggle("on", b.dataset.p === p));
  render();
}
async function render(){
  if(!ctx.tenant) return noTenant();
  const my = ++renderToken;
  $("page").innerHTML = `<div class="empty">جاري التحميل...</div>`;
  try{
    const html = pages[page] ? await pages[page]() : soon();
    if(my === renderToken) $("page").innerHTML = html;
  }catch(e){
    if(my === renderToken) $("page").innerHTML = `<div class="empty">${esc(errMsg(e))}</div>`;
  }
}
const soon = () => `<div class="card"><h3>${TITLES[page]}</h3><div class="empty">هذا القسم قيد النقل من روانا</div></div>`;
const noTenant = () => {
  $("page").innerHTML = `<div class="card"><h3>أهلاً بك في مدار</h3><p class="empty">ابدأ بإنشاء منشأتك لإدارة الحجوزات والوحدات.</p><button class="btn gold full" id="firstTenant">إنشاء منشأة</button></div>`;
  $("firstTenant").onclick = openTenantModal;
};

async function renderHome(){
  const [units, bookings, customers] = await Promise.all([list("units"), list("bookings"), list("customers")]);
  const t = tenants.find(x => x.id === ctx.tenant);
  return `<div class="banner"><h2>مرحبًا بك في ${esc(t?.name)}</h2><p>إدارة الحجوزات والعملاء من مكان واحد</p></div>
  <div class="stats">
   <div class="stat"><span>الوحدات</span><b>${units.length}</b></div>
   <div class="stat"><span>الحجوزات</span><b>${bookings.length}</b></div>
   <div class="stat"><span>العملاء</span><b>${customers.length}</b></div>
  </div>`;
}

export function openModal(title, body, onSave){
  $("modalRoot").innerHTML = `<div class="modal-bg"><div class="modal"><h3>${title}</h3>${body}
   <div class="modal-actions"><button class="btn" id="mSave">حفظ</button><button class="btn light" id="mCancel">إلغاء</button></div></div></div>`;
  $("mCancel").onclick = closeModal;
  $("mSave").onclick = async () => {
    const b = $("mSave"); b.disabled = true;
    try{ await onSave(); }catch(e){ toast(errMsg(e)); }
    b.disabled = false;
  };
}
export const closeModal = () => { $("modalRoot").innerHTML = ""; };

async function loadTenants(selectId){
  const s = await F.getDocs(F.collection(db,"users",ctx.uid,"tenants"));
  tenants = s.docs.map(d => ({id:d.id, ...d.data()}));
  $("tenantSelect").innerHTML = tenants.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
  const pick = tenants.find(t => t.id === selectId) || tenants[0];
  ctx.tenant = pick ? pick.id : null;
  if(pick) $("tenantSelect").value = pick.id;
  render();
}
function openTenantModal(){
  openModal("إنشاء منشأة", `
   <label>اسم المنشأة</label><input id="tName" placeholder="مثال: شاليهات النخيل">
   <label>نوع النشاط</label><select id="tType"><option>شاليهات</option><option>استراحات</option><option>شقق مفروشة</option><option>فلل</option><option>مخيمات</option><option>فنادق</option><option>أخرى</option></select>
   <label>المدينة</label><input id="tCity">
   <label>رقم التواصل</label><input id="tPhone" type="tel" placeholder="05xxxxxxxx">`,
  async () => {
    const name = $("tName").value.trim();
    if(!name) return toast("اكتب اسم المنشأة");
    const ref = await F.addDoc(F.collection(db,"tenants"),{
      name, type:$("tType").value, city:$("tCity").value.trim(), phone:$("tPhone").value.trim(),
      ownerId:ctx.uid, createdAt:F.serverTimestamp()
    });
    await F.setDoc(F.doc(db,"users",ctx.uid,"tenants",ref.id),{name, role:"owner", createdAt:F.serverTimestamp()});
    closeModal(); toast("تم إنشاء المنشأة");
    await loadTenants(ref.id);
  });
}

const show = (a,b) => { $(a).classList.add("hidden"); $(b).classList.remove("hidden"); };
$("toRegister").onclick = () => show("loginForm","registerForm");
$("toLogin").onclick = () => show("registerForm","loginForm");

$("loginBtn").onclick = async () => {
  try{
    const r = await A.signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value);
    if(!r.user.emailVerified){
      await A.sendEmailVerification(r.user); await A.signOut(auth);
      toast("فعّل بريدك أولاً، أرسلنا لك رسالة التفعيل");
    }
  }catch(e){ toast(errMsg(e)); }
};
$("registerBtn").onclick = async () => {
  const name = $("regName").value.trim(), email = $("regEmail").value.trim(), pw = $("regPassword").value;
  if(!name || !email || pw.length < 8) return toast("أكمل البيانات واجعل كلمة المرور 8 أحرف على الأقل");
  try{
    const r = await A.createUserWithEmailAndPassword(auth, email, pw);
    await F.setDoc(F.doc(db,"users",r.user.uid),{name, email, createdAt:F.serverTimestamp()});
    await A.sendEmailVerification(r.user); await A.signOut(auth);
    show("registerForm","loginForm");
    toast("تم إنشاء الحساب. فعّل بريدك ثم سجّل دخولك");
  }catch(e){ toast(errMsg(e)); }
};
$("resetBtn").onclick = async () => {
  const email = $("loginEmail").value.trim();
  if(!email) return toast("اكتب بريدك أولاً");
  try{ await A.sendPasswordResetEmail(auth, email); toast("أرسلنا رابط استعادة كلمة المرور"); }
  catch(e){ toast(errMsg(e)); }
};

$("menuBtn").onclick = () => drawer(true);
$("drawerBg").onclick = () => drawer(false);
$("addTenantBtn").onclick = openTenantModal;
$("tenantSelect").onchange = e => { ctx.tenant = e.target.value; render(); };

A.onAuthStateChanged(auth, async user => {
  if(user && user.emailVerified){
    ctx.uid = user.uid;
    $("auth").classList.add("hidden"); $("app").classList.remove("hidden");
    buildNav(); go("home");
    try{ await loadTenants(); }catch(e){ toast(errMsg(e)); }
  }else{
    ctx.uid = null; ctx.tenant = null;
    $("app").classList.add("hidden"); $("auth").classList.remove("hidden");
  }
});
