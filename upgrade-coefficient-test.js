/* Afarinesh Farda — TEST ONLY: manager class-wide stepwise monthly upgrade coefficients.
   This screen saves pricing RULES only; no contract, installment, payment or entitlement writes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const DB=()=>window.afSupabase;
const H=()=>window.afAdmissionCalendarHelpers;
const digits=s=>String(s??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
const fmt=n=>Number(n).toLocaleString('fa-IR',{maximumFractionDigits:3});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const persianFmt=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
let ready=false,loaded='',seq=0,overrides={},step=0.1;
function status(s,error=false){const el=$('afUpStatus');if(el){el.textContent=s;el.style.color=error?'#b91c1c':'#166534';}}
function num(raw,label){const s=digits(raw).trim().replace('٫','.').replace(',','.');if(!/^\d+(?:\.\d{1,3})?$/.test(s))throw Error(label+' باید عدد غیرمنفی با حداکثر سه رقم اعشار باشد.');return Number(s);}
function parts(iso){const x=persianFmt.formatToParts(new Date(iso+'T12:00:00Z'));return ['year','month','day'].map(k=>Number(x.find(v=>v.type===k)?.value));}
function persianMonthDays(y,m){for(let d=31;d>=28;d--){try{H().toG(y+'/'+m+'/'+d);return d;}catch(_){}}throw Error('ماه نامعتبر');}
function completedMonths(start,on){
 if(on<start)return null;
 const [sy,sm,sd]=parts(start),[ey,em,ed]=parts(on);
 let n=(ey-sy)*12+em-sm;
 if(ed<Math.min(sd,persianMonthDays(ey,em)))n--;
 return Math.max(0,n);
}
function coefficient(month){let v=1;for(let m=1;m<=month;m++)v=Number(Object.hasOwn(overrides,String(m))?overrides[String(m)]:(v+step).toFixed(3));return v;}
function renderSteps(){
 const host=$('afUpSteps');if(!host)return;
 host.innerHTML='<div class="af-ac-note">ابتدای دوره: ضریب ثابت <b>۱</b>. از ماه دوم دوره به بعد، هر ماه کامل‌شده یک پله است؛ برای تغییر یک پله، مقدار همان ماه را ویرایش کنید.</div>'+
 '<div class="af-up-grid">'+Array.from({length:12},(_,i)=>{
 const n=i+1,value=coefficient(n),custom=Object.hasOwn(overrides,String(n));
 return '<label class="af-ac-field"><span>پس از '+fmt(n)+' ماه کامل'+(custom?' · ضریب اختصاصی':'')+'</span><input type="number" inputmode="decimal" step=".001" min="1" max="100" data-af-up-month="'+n+'" value="'+value.toFixed(3)+'"></label>';
 }).join('')+'</div>';
 host.querySelectorAll('[data-af-up-month]').forEach(input=>input.addEventListener('change',()=>{
  try{const n=Number(input.dataset.afUpMonth),v=num(input.value,'ضریب ماه '+n);
   if(v<1||v>100)throw Error('ضریب باید بین ۱ و ۱۰۰ باشد.');
   if(Math.abs(v-(coefficient(n-1)+step))<0.0005)delete overrides[n];
   else overrides[n]=v;
   renderSteps();preview();
  }catch(e){status(e.message||String(e),true);}
 }));
 renderAdvanced();
}
function renderAdvanced(){
 const box=$('afUpBeyond');if(!box)return;
 const months=Object.keys(overrides).map(Number).filter(n=>n>12).sort((a,b)=>a-b);
 box.innerHTML=months.length?months.map(n=>'<span class="af-up-tag">ماه '+fmt(n)+': '+fmt(overrides[n])+' <button type="button" data-af-up-remove="'+n+'" aria-label="حذف ضریب اختصاصی ماه '+n+'">×</button></span>').join(' '):'<small>برای ماه‌های ۱۳ به بعد، افزایش پیش‌فرض اعمال می‌شود.</small>';
 box.querySelectorAll('[data-af-up-remove]').forEach(btn=>btn.onclick=()=>{
  delete overrides[btn.dataset.afUpRemove];renderAdvanced();preview();
 });
}
function preview(){
 const el=$('afUpPreview');if(!el)return;
 try{
  if(!$('afUpClass')?.value||!H())return;
  const start=H().toG($('afUpStart').value),on=H().toG($('afUpPreviewOn').value);
  const months=completedMonths(start,on);
  if(months===null){el.textContent='تاریخ بررسی قبل از شروع دوره است؛ ضریب ارتقا هنوز قابل محاسبه نیست.';return;}
  if(months>60){el.textContent='دوره بیش از ۶۰ ماه است؛ برای این تاریخ نیاز به بازبینی تنظیمات وجود دارد.';return;}
  el.innerHTML='ماه کامل‌شده: <b>'+fmt(months)+'</b> · ضریب قابل اعمال: <b>'+fmt(coefficient(months))+'</b> · شروع دوره: '+esc(H().toJ(start))+
  '<br><small>صرفاً پیش‌نمایش ضریب؛ هیچ هزینه یا قسطی در این صفحه تغییر نمی‌کند.</small>';
 }catch(e){el.textContent=e.message||String(e);}
}
function validate(){
 const v=num($('afUpIncrement').value,'افزایش ماهانه');if(v>1)throw Error('افزایش ماهانه نباید از ۱ بیشتر باشد.');
 step=v;
 let previous=1;
 for(let m=1;m<=60;m++){
  const x=coefficient(m);
  if(!(x>=previous&&x<=100))throw Error('ضریب ماه '+fmt(m)+' باید حداقل برابر ماه قبل و حداکثر ۱۰۰ باشد؛ پله‌های اختصاصی را بررسی کنید.');
  previous=x;
 }
 return v;
}
async function load(){
 if(!ready||!DB()||!$('afUpClass')?.value)return;
 const classId=$('afUpClass').value,my=++seq;
 status('در حال دریافت تنظیمات کلاس...');
 try{
  const [rules,slots]=await Promise.all([
   DB().rpc('af_upgrade_coefficient_get_test',{p_class:classId}),
   DB().from('af_class_weekly_slots_test').select('effective_from').eq('class_id',classId).eq('kind','in_person').order('effective_from',{ascending:true}).limit(1)
  ]);
  if(my!==seq)return;
  if(rules.error)throw rules.error;if(slots.error)throw slots.error;
  const data=rules.data||{};
  const start=data.period_start||(slots.data||[])[0]?.effective_from||today();
  step=Number(data.monthly_increment??0.1);overrides={...(data.overrides||{})};
  $('afUpIncrement').value=step.toFixed(3);
  H().syncDateSelect('afUpStart',H().toJ(start));
  loaded=classId;renderSteps();preview();
  status(data.configured?'تنظیمات ذخیره‌شده این کلاس دریافت شد.':'این کلاس هنوز قانون ارتقای ذخیره‌شده ندارد؛ تاریخ شروع پیشنهادی را بررسی و سپس ذخیره کنید.');
 }catch(e){if(my===seq){loaded='';status('دریافت تنظیمات: '+(e.message||String(e)),true);}}
}
function today(){
 const x=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const val=k=>x.find(p=>p.type===k).value;
 return val('year')+'-'+val('month')+'-'+val('day');
}
async function save(){
 const btn=$('afUpSave');btn.disabled=true;
 try{
  const classId=$('afUpClass').value,on=H().toG($('afUpStart').value),increment=validate();
  const name=$('afUpClass').selectedOptions[0]?.textContent||'کلاس';
  if(!confirm('ذخیره تنظیمات ارتقای '+name+'؟\n\nشروع دوره: '+H().toJ(on)+'\nضریب اولیه: ۱\nافزایش هر ماه کامل: '+fmt(increment)+'\nتعداد پله‌های ویرایش‌شده: '+fmt(Object.keys(overrides).length)+'\n\nاین تغییر فقط تنظیمات ارتقا را ذخیره می‌کند؛ قرارداد و اقساط فعلی تغییر نمی‌کنند.'))return;
  const {error}=await DB().rpc('af_upgrade_coefficient_save_test',{p_class:classId,p_start:on,p_increment:increment,p_overrides:overrides});
  if(error)throw error;status('قانون ماهانه ارتقای کلاس با ثبت سابقه ذخیره شد.');
  await load();
 }catch(e){status('ذخیره انجام نشد: '+(e.message||String(e)),true);}
 finally{btn.disabled=false;}
}
async function init(){
 if(ready||window.afCurrentRole!=='admin'||!H()||!DB()||!$('afAcTab-settings'))return false;
 ready=true;
 const root=$('afAcTab-settings');
 root.innerHTML='<h3>ضرایب پلکانی ارتقای پکیج</h3>'+
 '<p class="af-ac-note">محاسبه بر اساس تعداد جلسات حضوری مشترک باقی‌مانده است. ضریب ابتدای دوره همیشه ۱ است و با تکمیل هر ماه شمسی از تاریخ شروع دوره یک پله جلو می‌رود. تنظیمات هر کلاس مستقل است.</p>'+
 '<label class="af-ac-field"><span>کلاس</span><select id="afUpClass"></select></label>'+
 '<div class="af-ac-grid">'+H().dateSelect('afUpStart','شروع مشترک دوره (شمسی)')+
 '<label class="af-ac-field"><span>افزایش ضریب پس از هر ماه کامل</span><input id="afUpIncrement" type="number" min="0" max="1" step=".001" inputmode="decimal" value=".100"></label></div>'+
 '<h4>ضریب هر پله (قابل ویرایش)</h4><div id="afUpSteps"></div>'+
 '<details class="af-ac-note"><summary>ویرایش ضریب ماه‌های ۱۳ تا ۶۰</summary>'+
 '<div class="af-ac-grid"><label class="af-ac-field"><span>شماره ماه کامل‌شده</span><input id="afUpMoreMonth" type="number" min="13" max="60" value="13"></label>'+
 '<label class="af-ac-field"><span>ضریب اختصاصی</span><input id="afUpMoreValue" type="number" step=".001" min="1" max="100"></label></div>'+
 '<button type="button" id="afUpMoreAdd">افزودن / جایگزینی پله</button><div id="afUpBeyond"></div></details>'+
 '<h4>بررسی ضریب در تاریخ دلخواه</h4>'+H().dateSelect('afUpPreviewOn','تاریخ ارتقا (شمسی)')+
 '<div class="af-ac-note" id="afUpPreview"></div>'+
 '<div class="af-ac-actions"><button type="button" id="afUpSave" class="primary">ذخیره ضرایب این کلاس</button></div>'+
 '<p id="afUpStatus" role="status"></p>';
 const style=document.createElement('style');style.textContent='.af-up-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:12px 0}.af-up-tag{display:inline-flex;gap:8px;align-items:center;border:1px solid #94a3b8;border-radius:9px;padding:6px;margin:6px}.af-up-tag button{padding:1px 7px}@media(max-width:700px){.af-up-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){.af-up-grid{grid-template-columns:1fr}}';
 document.head.append(style);
 H().syncDateSelect('afUpPreviewOn',H().toJ(today()));
 $('afUpIncrement').addEventListener('change',()=>{try{step=num($('afUpIncrement').value,'افزایش ماهانه');if(step>1)throw Error('افزایش ماهانه حداکثر ۱ است.');renderSteps();preview();}catch(e){status(e.message||String(e),true);}});
 for(const part of ['day','month','year'])for(const id of ['afUpStart','afUpPreviewOn'])$(id+'-'+part).addEventListener('change',preview);
 $('afUpMoreAdd').onclick=()=>{
  try{
   const m=num($('afUpMoreMonth').value,'ماه'),v=num($('afUpMoreValue').value,'ضریب');
   if(!Number.isInteger(m)||m<13||m>60||v<1||v>100)throw Error('ماه ۱۳ تا ۶۰ و ضریب ۱ تا ۱۰۰ وارد کنید.');
   if(Math.abs(v-(coefficient(m-1)+step))<0.0005)delete overrides[m];else overrides[m]=v;
   renderAdvanced();preview();status('پله به پیش‌نویس اضافه شد؛ برای ذخیره نهایی دکمه ذخیره ضرایب را بزنید.');
  }catch(e){status(e.message||String(e),true);}
 };
 $('afUpSave').onclick=save;
 $('afUpClass').onchange=load;
 const rs=await DB().from('classes').select('id,name').eq('active',true).order('name');
 if(rs.error)throw rs.error;
 $('afUpClass').innerHTML=(rs.data||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
 if((rs.data||[]).length)await load();else status('کلاس فعالی وجود ندارد.',true);
 return true;
}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-af-ac-tab="settings"]'))void init();});
let tries=0;const timer=setInterval(()=>{if(ready||++tries>120){clearInterval(timer);return;}void init().catch(e=>status(e.message||String(e),true));},500);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void init().catch(e=>status(e.message||String(e),true));},{once:true});
else void init().catch(e=>status(e.message||String(e),true));
})();