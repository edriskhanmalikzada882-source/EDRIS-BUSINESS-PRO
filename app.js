const DB_NAME='edris-business-pro', DB_VERSION=1;
let db;
const stores=['customers','sales','expenses','items','settings'];
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;for(const s of stores){if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id',autoIncrement:true});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function all(store){return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function add(store,value){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).add({...value,createdAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function put(store,value){return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
const fmt=n=>new Intl.NumberFormat('fa-AF').format(Number(n||0));
const money=(n,c='AFN')=>`${fmt(n)} ${c}`;
function table(rows,cols){if(!rows.length)return '<div class="empty">هنوز موردی ثبت نشده است.</div>';return `<table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rows.slice().reverse().map(r=>`<tr>${cols.map(c=>`<td>${escapeHTML(c[2](r))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function refresh(){const [cs,ss,es,is]=await Promise.all(['customers','sales','expenses','items'].map(all));document.getElementById('totalSales').textContent=fmt(ss.reduce((a,x)=>a+Number(x.amount),0));document.getElementById('totalExpenses').textContent=fmt(es.reduce((a,x)=>a+Number(x.amount),0));document.getElementById('customerCount').textContent=fmt(cs.length);document.getElementById('stockCount').textContent=fmt(is.reduce((a,x)=>a+Number(x.quantity),0));
document.getElementById('customerList').innerHTML=table(cs,[['name','نام',r=>r.name],['phone','تماس',r=>r.phone||'—'],['createdAt','تاریخ',r=>new Date(r.createdAt).toLocaleDateString('fa-AF')]]);
document.getElementById('saleList').innerHTML=table(ss,[['description','شرح',r=>r.description],['amount','مبلغ',r=>money(r.amount,r.currency)],['createdAt','تاریخ',r=>new Date(r.createdAt).toLocaleDateString('fa-AF')]]);
document.getElementById('expenseList').innerHTML=table(es,[['description','شرح',r=>r.description],['amount','مبلغ',r=>money(r.amount,r.currency)],['createdAt','تاریخ',r=>new Date(r.createdAt).toLocaleDateString('fa-AF')]]);
document.getElementById('itemList').innerHTML=table(is,[['name','جنس',r=>r.name],['quantity','تعداد',r=>fmt(r.quantity)],['price','قیمت واحد',r=>fmt(r.price)]]);
const recent=[...ss.map(x=>({...x,type:'فروش'})),...es.map(x=>({...x,type:'مصرف'}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
document.getElementById('recent').innerHTML=recent.length?table(recent,[['type','نوع',r=>r.type],['description','شرح',r=>r.description],['amount','مبلغ',r=>money(r.amount,r.currency)]]):'<div class="empty">هنوز فعالیتی ثبت نشده است.</div>';
document.getElementById('reportSummary').innerHTML=`<p>مجموع فروش: <b>${fmt(ss.reduce((a,x)=>a+Number(x.amount),0))}</b></p><p>مجموع مصارف: <b>${fmt(es.reduce((a,x)=>a+Number(x.amount),0))}</b></p><p>تعداد مشتریان: <b>${fmt(cs.length)}</b></p><p>تعداد اقلام گدام: <b>${fmt(is.length)}</b></p>`;
}
function formHandler(id,store,mapper){document.getElementById(id).addEventListener('submit',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));await add(store,mapper(data));e.target.reset();await refresh();alert('اطلاعات در همین دستگاه ذخیره شد.');});}
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
function showPage(name){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('hidden',p.id!==name));document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const titles={dashboard:'داشبورد',customers:'مشتریان',sales:'فروش',expenses:'مصارف',inventory:'گدام و اجناس',reports:'گزارش‌ها',settings:'تنظیمات'};document.getElementById('pageTitle').textContent=titles[name]||'داشبورد';}
formHandler('customerForm','customers',d=>d);
formHandler('saleForm','sales',d=>({...d,amount:Number(d.amount)}));
formHandler('expenseForm','expenses',d=>({...d,amount:Number(d.amount)}));
formHandler('itemForm','items',d=>({...d,quantity:Number(d.quantity),price:Number(d.price||0)}));
document.getElementById('settingsForm').addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));await put('settings',{id:1,...d});document.getElementById('companyName').textContent=d.company;alert('تنظیمات ذخیره شد.');});
document.getElementById('quickSale').onclick=()=>showPage('sales');
document.getElementById('langBtn').onclick=()=>alert('رابط انگلیسی در مرحله بعدی تکمیل می‌شود.');
function connection(){const el=document.getElementById('connection');el.textContent=navigator.onLine?'● آنلاین':'● آفلاین';el.style.color=navigator.onLine?'#5bc49a':'#e5b85c';}
window.addEventListener('online',connection);window.addEventListener('offline',connection);
(async()=>{try{db=await openDB();const settings=await all('settings');if(settings[0]){document.getElementById('companyName').textContent=settings[0].company;document.getElementById('companyInput').value=settings[0].company;}await refresh();connection();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}catch(e){console.error(e);alert('ذخیره‌سازی محلی در این مرورگر فعال نشد. لطفاً از مرورگر به‌روز استفاده کنید.');}})();
