/* Afarinesh Farda — Admission & contracts TEST. TEST only, independent admission contracts. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pkg={ordinary:'عادی — فقط کلاس حضوری',gold:'طلایی',special:'ویژه',online:'آنلاین',language:'زبان',other:'سایر'};
let drafts=[],classes=[],students=[],members=[],contracts=[],initialPayments=[],installments=[],allocations=[],mounted=false,selected=null,loading=false;
let contractPage=1;const contractPageSize=20;
const db=()=>window.afSupabase;
function notice(msg,bad=false){const n=$('afIntakeStatus');if(n){n.textContent=msg;n.style.color=bad?'#b91c1c':'#166534';}}
function opt(id,label){return '<option value="'+esc(id)+'">'+esc(label)+'</option>';}
const field=(id,label,type='text')=>type==='money'?'<label class="af-ac-field"><span>'+label+'</span><input id="'+id+'" type="text" inputmode="numeric" dir="ltr" data-af-money="1" autocomplete="off" aria-describedby="'+id+'-words"><small id="'+id+'-words" class="af-ac-money-words" aria-live="polite">مبلغ را وارد کنید</small></label>':'<label class="af-ac-field"><span>'+label+'</span><input id="'+id+'" type="'+type+'" autocomplete="off"></label>';
function css(){
if($('afAcCss'))return;
const el=document.createElement('style');el.id='afAcCss';el.textContent=`
#afAdmissionTest{padding:22px;border-radius:16px;background:var(--card,#fff);box-shadow:0 4px 18px #0000000a;max-width:1100px}
#afAdmissionTest h2{margin:0 0 6px}#afAdmissionTest p{line-height:1.9}
.af-ac-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0}.af-ac-tabs button{border-radius:10px;padding:10px 18px}
.af-ac-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:18px 0}
.af-ac-field{display:flex;flex-direction:column;gap:8px;min-width:0;font-weight:600}.af-ac-contract-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.af-ac-contract-filters input,.af-ac-contract-filters select{width:100%;min-width:0;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:9px;background:var(--card,#fff);color:inherit}@media(max-width:650px){.af-ac-contract-filters{grid-template-columns:1fr}}
.af-ac-field input,.af-ac-field select{width:100%;min-width:0;box-sizing:border-box;padding:11px;border:1px solid #cbd5e1;border-radius:9px;background:var(--card,#fff);color:inherit}
.af-ac-date-selects{display:flex;gap:6px;direction:rtl}.af-ac-date-selects select{flex:1;min-width:0}.af-ac-date-selects select:last-child{flex:1.35}.af-ac-wide{grid-column:1/-1}.af-ac-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.af-ac-draft{display:flex;justify-content:space-between;gap:12px;align-items:center;border:1px solid #dbe3ec;border-radius:10px;padding:12px;margin:8px 0;flex-wrap:wrap}.af-ac-contract-detail{display:block}.af-ac-contract-detail summary{cursor:pointer;line-height:2}.af-ac-contract-detail h4{margin:16px 0 6px}.af-ac-table-scroll{overflow-x:auto}.af-ac-table{width:100%;border-collapse:collapse;min-width:550px;text-align:right}.af-ac-table th,.af-ac-table td{padding:9px;border-bottom:1px solid #dbe3ec}.af-ac-payment{padding:8px 0;border-bottom:1px solid #dbe3ec}
#afAdmissionTest .af-ac-contract-card{display:block}#afAdmissionTest .af-ac-contract-card summary{cursor:pointer;line-height:2}#afAdmissionTest .af-ac-contract-details{padding:10px 4px;overflow-wrap:anywhere}#afAdmissionTest .af-ac-installment{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;border-bottom:1px solid #dbe3ec;padding:10px 2px}#afAdmissionTest .af-ac-installments{margin-top:14px} @media(max-width:650px){#afAdmissionTest .af-ac-installment{grid-template-columns:repeat(2,minmax(0,1fr))}}\n#afAcContractRows details{border:1px solid #dbe3ec;border-radius:10px;margin:10px 0;padding:12px}#afAcContractRows summary{cursor:pointer;line-height:2} .af-ac-contract-body{padding:12px 0} .af-ac-installment{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap;border-bottom:1px solid #dbe3ec;padding:10px 0} .af-ac-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px}
.af-ac-contract-card{border:1px solid #cbd5e1;border-radius:12px;padding:16px;margin:14px 0;display:grid;gap:12px}.af-ac-contract-card p{margin:0}.af-ac-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.af-ac-summary span{padding:9px;background:var(--card,#f8fafc);border:1px solid #e2e8f0;border-radius:8px}.af-ac-contract-card summary{cursor:pointer;font-weight:700;padding:8px}.af-ac-table-wrap{overflow-x:auto}.af-ac-table{width:100%;border-collapse:collapse;min-width:560px;text-align:right}.af-ac-table th,.af-ac-table td{border-bottom:1px solid #e2e8f0;padding:10px}.af-ac-muted{font-size:12px;opacity:.8}.af-ac-error{color:#b91c1c}@media(max-width:650px){.af-ac-summary{grid-template-columns:1fr}}
#afIntakeStatus{min-height:26px;margin-top:12px}
.af-ac-money-words{display:block;color:#166534;font-size:13px;line-height:1.8;min-height:1.8em}.af-ac-money-words.af-ac-money-invalid{color:#b91c1c}.af-ac-money-words.af-ac-money-caution{color:#92400e;font-weight:600}
.af-ac-pay-preview{margin:12px 0;line-height:2}.af-ac-money-warning{border:1px solid #d97706;background:#fffbeb;padding:10px;border-radius:9px;color:#92400e;margin:10px 0}

.af-ac-date-wrap{position:relative;display:flex;gap:6px}.af-ac-date-wrap input{flex:1;min-width:0}.af-ac-date-wrap button{flex:none;padding:8px 12px;border:1px solid #94a3b8;border-radius:9px;background:var(--card,#fff);color:inherit}
.af-ac-calendar{position:absolute;top:calc(100% + 5px);right:0;z-index:1000;width:min(310px,85vw);padding:12px;border:1px solid #94a3b8;border-radius:12px;background:var(--card,#fff);color:inherit;box-shadow:0 12px 30px #0003}
.af-ac-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:10px}.af-ac-calendar-head button{padding:5px 10px}
.af-ac-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}.af-ac-days button{padding:7px 0;min-width:0;border:0;border-radius:7px}.af-ac-days button:hover,.af-ac-days button[aria-pressed="true"]{background:#dbeafe;color:#1e3a8a}.af-ac-days span{font-size:12px}
@media(max-width:650px){.af-ac-grid{grid-template-columns:1fr}#afAdmissionTest{padding:14px}}
.af-ac-date-input{cursor:pointer;background:var(--card,#fff)!important}.af-ac-calendar{position:fixed;z-index:2147483000;inset:0;background:#0006;display:flex;align-items:center;justify-content:center;padding:14px}.af-ac-calendar[hidden]{display:none}.af-ac-cal-panel{width:min(100%,360px);background:var(--card,#fff);color:inherit;border:1px solid #cbd5e1;border-radius:16px;padding:16px;box-shadow:0 12px 40px #0003;direction:rtl}.af-ac-cal-header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:14px}.af-ac-cal-header button,.af-ac-cal-days button{border:1px solid #cbd5e1;border-radius:9px;padding:9px;background:transparent;color:inherit;cursor:pointer}.af-ac-cal-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;text-align:center}.af-ac-cal-days button{padding:8px 0}.af-ac-cal-days button[aria-pressed=true]{background:#166534;color:white}.af-ac-cal-days button:disabled{opacity:.2;cursor:default}.af-ac-cal-footer{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
`;document.head.appendChild(el);
}
async function load(){
 if(!db()||window.afCurrentRole!=='admin')return;
 const rs=await Promise.all([
 db().from('classes').select('id,name,active').eq('active',true),
 db().from('af_contract_intakes').select('*').order('created_at',{ascending:false}),
 db().from('students').select('id,first_name,last_name,phone'),
 db().from('student_classes').select('student_id,class_id,active'),
 db().from('af_admission_contracts').select('*').order('created_at',{ascending:false}),
 db().from('af_admission_contract_payments').select('id,contract_id,receipt_no,amount_irr,paid_on,method,note'),
 db().from('af_admission_contract_installments').select('id,contract_id,installment_no,due_on,amount_irr').order('installment_no',{ascending:true}),
 db().from('af_admission_payment_allocations').select('payment_id,installment_id,amount_irr')
 ]);
 for(const r of rs)if(r.error)throw r.error;
 [classes,drafts,students,members,contracts,initialPayments,installments,allocations]=rs.map(r=>r.data||[]);
 $('afIntakeClass').innerHTML=classes.map(c=>opt(c.id,c.name)).join('');
 $('afIntakeDraft').innerHTML=opt('','پذیرش جدید')+drafts.filter(d=>d.status==='draft').map(d=>opt(d.id,d.first_name+' '+d.last_name+' — '+(classes.find(c=>c.id===d.class_id)?.name||''))).join('');
 renderDrafts();renderContracts();contractPkg();await afAccessLoad();await afFinanceToolRefresh();
}
function renderDrafts(){
 const el=$('afAcDraftList');if(!el)return;
 const rows=drafts.filter(d=>d.status==='draft');
 el.innerHTML=rows.length?rows.map(d=>'<div class="af-ac-draft"><div><b>'+esc(d.first_name+' '+d.last_name)+'</b><div>'+esc(classes.find(c=>c.id===d.class_id)?.name||'کلاس نامشخص')+' · '+esc(pkg[d.package]||d.package)+'</div></div><button type="button" class="secondary" data-intake="'+esc(d.id)+'">ادامه ثبت‌نام</button></div>').join(''):'<p>پذیرش نیمه‌تمام وجود ندارد.</p>';
 el.querySelectorAll('[data-intake]').forEach(b=>b.onclick=()=>{showTab('new');$('afIntakeDraft').value=b.dataset.intake;fill(b.dataset.intake);});
 $('afAcCompleted').textContent=String(drafts.filter(d=>d.status==='completed').length);
}
function fill(id){
 selected=id||null;const d=drafts.find(x=>x.id===id);
 $('afIntakeFirst').value=d?.first_name||'';$('afIntakeLast').value=d?.last_name||'';
 $('afIntakePhone').value=d?.parent_phone||'';
 if(d){$('afIntakeClass').value=d.class_id;$('afIntakePackage').value=d.package;}
 $('afAcConfirm').checked=false;
 matches();notice('');
}
function matches(d){
 const first=(d?.first_name??$('afIntakeFirst').value).trim(),last=(d?.last_name??$('afIntakeLast').value).trim();
 const found=students.filter(s=>s.first_name?.trim()===first&&s.last_name?.trim()===last);
 const el=$('afAcExisting');el.innerHTML=opt('','ایجاد پرونده جدید')+found.map(s=>opt(s.id,s.first_name+' '+s.last_name+' — '+(s.phone||'بدون شماره')));
 const warning=$('afAcMatchWarning');
 warning.textContent=found.length?'توجه: '+found.length+' پرونده با همین نام موجود است. اگر دانش‌آموز دیگری است، ایجاد پرونده مستقل با تأیید جداگانه امکان‌پذیر است.':'';
 $('afAcSameNameWrap').hidden=!found.length;
 $('afAcSameName').checked=false;
 matchesSelection();
}
async function save(){
 const b=$('afIntakeSave');b.disabled=true;
 try{
 const first=$('afIntakeFirst').value.trim(),last=$('afIntakeLast').value.trim(),phone=$('afIntakePhone').value.trim(),id=selected;
 if(!first||!last||phone.length<7)throw Error('نام، نام خانوادگی و شماره تماس ولی را تکمیل کنید.');
 const {data,error}=await db().rpc('af_contract_intake_save',{p_id:id,p_first:first,p_last:last,p_phone:phone,p_class:$('afIntakeClass').value,p_package:$('afIntakePackage').value});
 if(error)throw error;
 selected=data;await load();$('afIntakeDraft').value=data;fill(data);
 $('afAcContractIntake').value=data;contractPkg();showTab('contracts');
 $('afAcContractStatus').textContent='پیش‌پذیرش ذخیره شد. اکنون قرارداد، پرداخت اولیه و اقساط را تکمیل کن. پرونده و عضویت کلاس فقط هم‌زمان با ثبت موفق قرارداد ایجاد می‌شوند.';
 }catch(e){notice(e.message||String(e),true);}finally{b.disabled=false;}
}

const money=n=>Number(n||0).toLocaleString('fa-IR');
const digits=s=>String(s??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));

/* Financial input safety: amounts are TOMAN; RPCs receive IRR via irr(). */
const afMoneyOnes=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه'];
const afMoneyTeens=['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
const afMoneyTens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
const afMoneyHundreds=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
const afMoneyScales=['','هزار','میلیون','میلیارد','هزار میلیارد','بیلیون'];
function afMoneyWords(value){
 if(!Number.isSafeInteger(value)||value<0)return 'مبلغ نامعتبر';
 if(value===0)return 'صفر';
 const result=[];let v=value,scale=0;
 while(v>0){
  const chunk=v%1000,parts=[];
  if(chunk){
   const hundreds=Math.floor(chunk/100),rest=chunk%100;
   if(hundreds)parts.push(afMoneyHundreds[hundreds]);
   if(rest>=20){parts.push(afMoneyTens[Math.floor(rest/10)]);if(rest%10)parts.push(afMoneyOnes[rest%10]);}
   else if(rest>=10)parts.push(afMoneyTeens[rest-10]);
   else if(rest)parts.push(afMoneyOnes[rest]);
   result.unshift(parts.join(' و ')+(afMoneyScales[scale]?' '+afMoneyScales[scale]:''));
  }
  v=Math.floor(v/1000);scale++;
 }
 return result.join(' و ');
}
function afMoneyParse(raw){
 const plain=digits(raw).trim().replace(/[,٬،\s]/g,'');
 if(!/^\d+$/.test(plain))return null;
 const n=Number(plain);
 return Number.isSafeInteger(n)&&n<=Number.MAX_SAFE_INTEGER/10?n:null;
}
function afMoneyFormatInput(input){
 if(!input)return;
 const wordsEl=$(input.id+'-words'),raw=input.value,amount=afMoneyParse(raw);
 if(amount!==null){
  const before=digits(raw.slice(0,input.selectionStart??raw.length)).replace(/\D/g,'').length;
  const formatted=money(amount);
  if(raw!==formatted){
   input.value=formatted;
   let pos=0,seen=0;
   while(pos<formatted.length&&seen<before){if(/[۰-۹٠-٩0-9]/.test(formatted[pos]))seen++;pos++;}
   if(before===digits(raw).replace(/\D/g,'').length)pos=formatted.length;
   try{input.setSelectionRange(pos,pos);}catch(_){}
  }
 }
 if(wordsEl){
  const caution=amount===null?'':afMoneyOneZeroWarning(amount,Number(input.dataset.afReferenceAmount||0));
  wordsEl.textContent=amount===null?(raw.trim()?'مبلغ نامعتبر است؛ فقط عدد صحیح تومان وارد کنید.':'مبلغ را وارد کنید'):afMoneyWords(amount)+' تومان'+(caution?' — '+caution:'');
  wordsEl.classList.toggle('af-ac-money-invalid',amount===null&&!!raw.trim());
  wordsEl.classList.toggle('af-ac-money-caution',!!caution);
 }
}
function afMoneyOneZeroWarning(amount,reference){
 if(!(amount>0&&reference>0))return '';
 const ratio=amount/reference;
 if(ratio>=0.095&&ratio<=0.105)return 'هشدار: مبلغ واردشده تقریباً یک‌دهم مبلغ مرجع است؛ احتمال حذف یک صفر را بررسی کنید.';
 if(ratio>=9.5&&ratio<=10.5)return 'هشدار: مبلغ واردشده تقریباً ده برابر مبلغ مرجع است؛ احتمال اضافه شدن یک صفر را بررسی کنید.';
 return '';
}


/* Local preview mirrors the RPC allocation order; server rechecks on commit. */
function afMoneyPaymentPreview(id){
 const box=$('afAcPayBox-'+id),target=$('afAcPayPreview-'+id);
 if(!box||box.hidden||!target)return null;
 try{
  const amount=num('afAcPayAmount-'+id),c=contracts.find(c=>c.id===id);
  if(!c)throw Error('قرارداد پیدا نشد؛ فهرست را تازه‌سازی کنید.');
  const alreadyPaid=initialPayments.filter(p=>p.contract_id===id).reduce((sum,p)=>sum+Number(p.amount_irr||0),0);
  const remaining=(Number(c.price_irr)-Number(c.discount_irr)-alreadyPaid)/10;
  if(amount<=0||amount>remaining)throw Error('مبلغ باید مثبت و حداکثر برابر مانده قرارداد ('+money(remaining)+' تومان) باشد.');
  let rest=amount;
  const rows=installments.filter(i=>i.contract_id===id).sort((a,b)=>a.due_on.localeCompare(b.due_on)||a.installment_no-b.installment_no);
  const items=[];
  for(const installment of rows){
   const paid=allocations.filter(a=>a.installment_id===installment.id).reduce((sum,a)=>sum+Number(a.amount_irr),0)/10;
   const due=Math.max(0,Number(installment.amount_irr)/10-paid);
   if(!due||rest<=0)continue;
   const part=Math.min(due,rest);rest-=part;
   items.push({installment_no:installment.installment_no,part,after:due-part});
  }
  if(rest!==0)throw Error('جمع اقساط با مانده قرارداد هماهنگ نیست؛ پیش از پرداخت بررسی کنید.');
  const warning=afMoneyOneZeroWarning(amount,Number(box.dataset.afReferenceAmount||0));
  const text='مبلغ: '+money(amount)+' تومان ('+afMoneyWords(amount)+' تومان)\n'+items.map(a=>'قسط '+a.installment_no+': '+money(a.part)+' تومان، مانده جدید '+money(a.after)+' تومان').join('\n')+'\nمانده کل قرارداد پس از پرداخت: '+money(remaining-amount)+' تومان';
  target.innerHTML='<b>پیش‌نمایش تخصیص پیش از صدور رسید</b><br>مبلغ دریافتی: <b>'+money(amount)+' تومان</b> — '+esc(afMoneyWords(amount))+' تومان'+items.map(a=>'<br>قسط '+money(a.installment_no)+': '+money(a.part)+' تومان | مانده پس از پرداخت: '+money(a.after)+' تومان').join('')+'<br><b>مانده کل پس از ثبت: '+money(remaining-amount)+' تومان</b>'+(warning?'<div class="af-ac-money-warning">'+esc(warning)+'</div>':'');
  return {amount,remaining,warning,text,items};
 }catch(e){target.textContent=e.message||String(e);return null;}
}

const jalFmt=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
function jparts(iso){const p=jalFmt.formatToParts(new Date(iso+'T12:00:00Z'));return ['year','month','day'].map(k=>Number(p.find(x=>x.type===k)?.value));}
function toJ(iso){const a=jparts(iso);return a[0]+'/'+String(a[1]).padStart(2,'0')+'/'+String(a[2]).padStart(2,'0');}
function toG(value){
 const m=digits(value).trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);if(!m)throw Error('تاریخ شمسی را به صورت ۱۴۰۵/۰۷/۰۱ وارد کنید.');
 const y=+m[1],mo=+m[2],d=+m[3];if(y<1300||y>1600||mo<1||mo>12||d<1||d>31)throw Error('تاریخ شمسی نامعتبر است.');
 const begin=Date.UTC(y+621,1,20,12);for(let i=0;i<430;i++){const iso=new Date(begin+i*86400000).toISOString().slice(0,10);const p=jparts(iso);if(p[0]===y&&p[1]===mo&&p[2]===d)return iso;}
 throw Error('روز واردشده در تقویم شمسی وجود ندارد.');
}


const jMonths=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function dateSelect(id,label){
 return '<label class="af-ac-field"><span>'+label+'</span><span class="af-ac-date-selects">'+
 '<select id="'+id+'-day" aria-label="روز"></select>'+
 '<select id="'+id+'-month" aria-label="ماه">'+jMonths.map((m,i)=>opt(i+1,m)).join('')+'</select>'+
 '<select id="'+id+'-year" aria-label="سال">'+Array.from({length:81},(_,i)=>opt(1380+i,1380+i)).join('')+'</select></span>'+
 '<input type="hidden" id="'+id+'"></label>';
}
function syncDateSelect(id,initial){
 const y=$(id+'-year'),m=$(id+'-month'),d=$(id+'-day'),parts=digits(initial).split('/').map(Number);
 y.value=String(parts[0]);m.value=String(parts[1]);
 function updateValue(){
  $(id).value=y.value+'/'+String(m.value).padStart(2,'0')+'/'+String(d.value).padStart(2,'0');
  calcContract();
 }
 function updateDays(){
  const year=Number(y.value),month=Number(m.value),previous=Number(d.value)||parts[2]||1;
  const days=[];for(let day=1;day<=31;day++){try{toG(year+'/'+month+'/'+day);days.push(day);}catch(_){}}
  d.innerHTML=days.map(day=>opt(day,day)).join('');
  d.value=String(days.includes(previous)?previous:days[days.length-1]);
  updateValue();
 }
 y.addEventListener('change',updateDays);m.addEventListener('change',updateDays);d.addEventListener('change',updateValue);
 updateDays();
}
function afAcNextJalaliMonth(value){
 const p=digits(value).trim().match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);if(!p)throw Error('تاریخ شروع قرارداد معتبر نیست.');
 const monthIndex=(+p[1]*12+(+p[2]-1)+1),y=Math.floor(monthIndex/12),m=monthIndex%12+1;
 for(let day=+p[3];day>=1;day--){try{return toJ(toG(y+'/'+m+'/'+day));}catch(_){}}
 throw Error('تاریخ قسط اول معتبر نیست.');
}
function afAcSyncFirstDueFromStart(){
 const start=$('afAcStart')?.value;if(!start)return;
 const due=afAcNextJalaliMonth(start);
 const y=$('afAcFirstDue-year'),m=$('afAcFirstDue-month'),d=$('afAcFirstDue-day');
 const p=digits(due).split('/').map(Number);
 if(y&&m&&d){y.value=String(p[0]);m.value=String(p[1]);d.value=String(p[2]);}
 $('afAcFirstDue').value=due;
 calcContract();
}
function num(id){const raw=digits($(id).value).trim().replace(/[,٬،\s]/g,'');if(!/^\d+$/.test(raw))throw Error('مقدار '+($(id).previousElementSibling?.textContent||id)+' باید عدد صحیح غیرمنفی باشد.');const v=Number(raw);if(!Number.isSafeInteger(v))throw Error('مبلغ یا تعداد خارج از محدوده مجاز است.');return v;}
const irr=t=>{if(t>Number.MAX_SAFE_INTEGER/10)throw Error('مبلغ بیش از محدوده مجاز است.');return t*10;};
function renderContracts(){
 const linked=drafts.filter(d=>d.status==='draft'||(d.status==='completed'&&d.student_id)),picker=$('afAcContractIntake');if(!picker)return;
 const old=picker.value;
 picker.innerHTML=opt('','انتخاب پیش‌پذیرش بدون قرارداد')+linked.filter(d=>!contracts.some(c=>c.intake_id===d.id)).map(d=>opt(d.id,d.first_name+' '+d.last_name+' — '+(classes.find(c=>c.id===d.class_id)?.name||'کلاس'))).join('');
 const preferred=old||selected;
 if(linked.some(d=>d.id===preferred)&&!contracts.some(c=>c.intake_id===preferred))picker.value=preferred;
 const local=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
 const today=local.year+'-'+local.month+'-'+local.day;
 const end7=new Date(Date.parse(today+'T12:00:00Z')+7*86400000).toISOString().slice(0,10);
 const classFilter=$('afAcFilterClass'),statusFilter=$('afAcFilterStatus');
 const chosenClass=classFilter.value,chosenStatus=statusFilter.value;
 const allClasses=[...new Set(contracts.map(c=>c.class_id))];
 classFilter.innerHTML=opt('','همه کلاس‌ها')+allClasses.map(id=>opt(id,classes.find(x=>x.id===id)?.name||'کلاس حذف‌شده')).join('');
 classFilter.value=chosenClass;if(classFilter.value!==chosenClass)classFilter.value='';
 const statuses=[...new Set(contracts.map(c=>c.status))];
 statusFilter.innerHTML=opt('','همه وضعیت‌ها')+statuses.map(st=>opt(st,({active:'فعال',cancelled:'لغوشده',withdrawn:'انصرافی',expelled:'اخراج',completed:'پایان‌یافته'})[st]||st)).join('');
 statusFilter.value=chosenStatus;if(statusFilter.value!==chosenStatus)statusFilter.value='';
 const normalized=v=>digits(String(v??'')).replace(/[ي]/g,'ی').replace(/[ك]/g,'ک').toLowerCase().replace(/\s+/g,' ').trim();
 const search=normalized($('afAcSearch').value),debtFilter=$('afAcFilterDebt').value;
 const summaries=contracts.map(c=>{
  const student=students.find(s=>s.id===c.student_id);
  const intake=drafts.find(d=>d.id===c.intake_id);
  const paid=initialPayments.filter(p=>p.contract_id===c.id).reduce((n,p)=>n+Number(p.amount_irr||0),0);
  const remaining=Math.max(0,Number(c.price_irr)-Number(c.discount_irr)-paid);
  const due=installments.filter(i=>i.contract_id===c.id).map(i=>({
   date:i.due_on,left:Math.max(0,Number(i.amount_irr)-allocations.filter(a=>a.installment_id===i.id).reduce((n,a)=>n+Number(a.amount_irr),0))
  })).filter(i=>i.left>0).sort((a,b)=>a.date.localeCompare(b.date));
  const overdue=due.filter(i=>i.date<today),upcoming=due.filter(i=>i.date>=today&&i.date<=end7);
  const hay=normalized([c.contract_no,student?.first_name,student?.last_name,student?.phone,intake?.parent_phone,classes.find(x=>x.id===c.class_id)?.name,pkg[c.package]].join(' '));
  return {c,remaining,due,overdue,upcoming,hay};
 });
 const overdueCount=summaries.reduce((n,x)=>n+x.overdue.length,0);
 const upcomingCount=summaries.reduce((n,x)=>n+x.upcoming.length,0);
 $('afAcFollowup').textContent='پیگیری شهریه: '+money(overdueCount)+' قسط معوق · '+money(upcomingCount)+' قسط پرداخت‌نشده با سررسید امروز تا ۷ روز آینده (بر اساس تاریخ تهران)';
 let filtered=summaries.filter(x=>(!search||x.hay.includes(search))&&(!classFilter.value||x.c.class_id===classFilter.value)&&(!statusFilter.value||x.c.status===statusFilter.value)&&(!debtFilter||(debtFilter==='debt'&&x.remaining>0)||(debtFilter==='settled'&&x.remaining===0)||(debtFilter==='overdue'&&x.overdue.length>0)||(debtFilter==='upcoming'&&x.upcoming.length>0)));
 if($('afAcSort').value==='due')filtered.sort((a,b)=>(a.due[0]?.date||'9999-12-31').localeCompare(b.due[0]?.date||'9999-12-31'));
 const pages=Math.max(1,Math.ceil(filtered.length/contractPageSize));
 contractPage=Math.min(contractPage,pages);
 const visible=filtered.slice((contractPage-1)*contractPageSize,contractPage*contractPageSize);
 $('afAcFilterCount').textContent=money(filtered.length)+' قرارداد از '+money(contracts.length)+' قرارداد · صفحه '+money(contractPage)+' از '+money(pages);
 $('afAcContractRows').innerHTML=visible.length?visible.map(({c})=>{
  const payments=initialPayments.filter(p=>p.contract_id===c.id);
  const paid=payments.reduce((sum,p)=>sum+Number(p.amount_irr||0),0);
  const net=Number(c.price_irr)-Number(c.discount_irr),remaining=Math.max(0,net-paid);
  const rows=installments.filter(i=>i.contract_id===c.id).sort((a,b)=>a.installment_no-b.installment_no);
  const scheduled=rows.reduce((sum,i)=>sum+Number(i.amount_irr||0),0);
  const allocatedTotal=allocations.filter(a=>rows.some(i=>i.id===a.installment_id)).reduce((sum,a)=>sum+Number(a.amount_irr||0),0);
  const outstandingInstallments=scheduled-allocatedTotal;
  const scheduleDifference=remaining-outstandingInstallments;
  const student=students.find(s=>s.id===c.student_id);
  const paymentRows=payments.map(p=>'<div>پرداخت '+toJ(p.paid_on)+' · '+money(p.amount_irr/10)+' تومان · رسید '+esc(p.receipt_no)+(p.method!=='unspecified'?' · '+esc(({cash:'نقدی',pos:'کارت‌خوان',card_transfer:'کارت‌به‌کارت',bank_transfer:'واریز بانکی'})[p.method]||p.method):'')+(p.note?' · '+esc(p.note):'')+'</div>').join('');
  return '<details class="af-ac-contract-detail"><summary><b>'+esc(c.contract_no)+'</b> · '+esc((student?.first_name||'')+' '+(student?.last_name||''))+' · '+esc(classes.find(x=>x.id===c.class_id)?.name||'')+' · '+esc(pkg[c.package]||c.package)+'</summary>'+
  '<div class="af-ac-contract-body"><div class="af-ac-note">شروع قرارداد: '+toJ(c.starts_on)+' | وضعیت: '+esc(({active:'فعال',cancelled:'لغوشده',withdrawn:'انصرافی',expelled:'اخراج',completed:'پایان‌یافته'})[c.status]||c.status)+'<br>شهریه: '+money(c.price_irr/10)+' تومان | تخفیف: '+money(c.discount_irr/10)+' تومان | شهریه نهایی: '+money(net/10)+' تومان<br>هزینه ثابت (جزئی از شهریه؛ مخصوص محاسبه انصراف): '+money(c.fixed_fee_irr/10)+' تومان<br>جمع پرداخت‌های ثبت‌شده: '+money(paid/10)+' تومان | مانده: '+money(remaining/10)+' تومان</div>'+
  '<h4>پرداخت‌های ثبت‌شده</h4>'+(paymentRows||'<p>پرداختی ثبت نشده است.</p>')+
  '<h4>جدول اقساط</h4><p>جمع اقساط برنامه‌ریزی‌شده: '+money(scheduled/10)+' تومان | پرداخت تخصیص‌یافته به اقساط: '+money(allocatedTotal/10)+' تومان | مانده اقساط: '+money(outstandingInstallments/10)+' تومان | مانده قرارداد: '+money(remaining/10)+' تومان</p>'+(scheduleDifference!==0?'<p class="af-ac-error">اختلاف برنامه اقساط با مانده قرارداد: '+money(Math.abs(scheduleDifference)/10)+' تومان؛ اطلاعات مالی نیازمند بررسی است.</p>':'')+(rows.length?'<div class="af-ac-installments">'+rows.map(i=>{const allocated=allocations.filter(a=>a.installment_id===i.id).reduce((n,a)=>n+Number(a.amount_irr),0);const left=Math.max(0,Number(i.amount_irr)-allocated);const status=left===0?'تسویه‌شده':allocated>0?'پرداخت ناقص':i.due_on<today?'سررسید گذشته؛ پرداخت‌نشده':i.due_on===today?'سررسید امروز؛ پرداخت‌نشده':'در انتظار سررسید';return '<div class="af-ac-installment"><b>قسط '+money(i.installment_no)+'</b><span>سررسید: '+toJ(i.due_on)+'</span><span>مبلغ: '+money(i.amount_irr/10)+' تومان</span><span>پرداخت: '+money(allocated/10)+' | مانده: '+money(left/10)+' تومان · '+status+(left>0?'<br><button type="button" data-af-pay="'+esc(c.id)+'" data-af-amount="'+esc(String(left/10))+'">ثبت پرداخت</button>':'')+'</span></div>';}).join('')+'</div>':'<p>قسطی تعریف نشده است.</p>')+'<div id="afAcPayBox-'+esc(c.id)+'" class="af-ac-note" hidden><h4>ثبت پرداخت جدید (تومان)</h4><div class="af-ac-grid">'+field('afAcPayAmount-'+c.id,'مبلغ پرداخت','money')+dateSelect('afAcPayDate-'+c.id,'تاریخ پرداخت (شمسی)')+'<label class="af-ac-field"><span>روش پرداخت</span><select id="afAcPayMethod-'+esc(c.id)+'"><option value="cash">نقدی</option><option value="pos">کارت‌خوان</option><option value="card_transfer">کارت‌به‌کارت</option><option value="bank_transfer">واریز بانکی</option></select></label>'+field('afAcPayNote-'+c.id,'توضیحات اختیاری')+'</div><p>مازاد پرداخت خودکار به اقساط بعدی به ترتیب سررسید تخصیص می‌یابد.</p><div class="af-ac-pay-preview" id="afAcPayPreview-'+esc(c.id)+'" role="status"></div><button type="button" data-af-submit="'+esc(c.id)+'">تأیید و صدور رسید</button><p id="afAcPayStatus-'+esc(c.id)+'" role="status"></p></div>'+
  '<small>پرداخت اولیه به‌معنای تسویه قسط نیست؛ فقط پرداخت‌های تخصیص‌یافته به اقساط در وضعیت هر قسط لحاظ می‌شوند.</small></div></details>';
 }).join(''):'<p>قراردادی مطابق فیلترهای انتخاب‌شده پیدا نشد.</p>';
 $('afAcPagination').innerHTML=pages>1?'<button type="button" id="afAcPrev" '+(contractPage===1?'disabled':'')+'>صفحه قبل</button><span>صفحه '+money(contractPage)+' از '+money(pages)+'</span><button type="button" id="afAcNext" '+(contractPage===pages?'disabled':'')+'>صفحه بعد</button>':'';
 if($('afAcPrev'))$('afAcPrev').onclick=()=>{contractPage--;renderContracts();};
 if($('afAcNext'))$('afAcNext').onclick=()=>{contractPage++;renderContracts();};
 $('afAcContractRows').querySelectorAll('[data-af-pay]').forEach(b=>b.onclick=()=>{
  const id=b.dataset.afPay,box=$('afAcPayBox-'+id);
  box.hidden=false;box.dataset.afReferenceAmount=b.dataset.afAmount;
  $('afAcPayAmount-'+id).dataset.afReferenceAmount=b.dataset.afAmount;
  $('afAcPayAmount-'+id).value=b.dataset.afAmount;
  afMoneyFormatInput($('afAcPayAmount-'+id));
  syncDateSelect('afAcPayDate-'+id,toJ(today));
  afMoneyPaymentPreview(id);
  box.scrollIntoView({block:'nearest',behavior:'smooth'});
 });
 $('afAcContractRows').querySelectorAll('[data-af-submit]').forEach(b=>b.onclick=()=>recordInstallmentPayment(b.dataset.afSubmit,b));
}
async function recordInstallmentPayment(id,button){
 const status=$('afAcPayStatus-'+id);button.disabled=true;
 try{
  const amount=num('afAcPayAmount-'+id);
  if(amount<=0)throw Error('مبلغ پرداخت باید مثبت باشد.');
  const date=toG($('afAcPayDate-'+id).value),method=$('afAcPayMethod-'+id).value,note=$('afAcPayNote-'+id).value.trim();
  const contract=contracts.find(c=>c.id===id);
  const paid=initialPayments.filter(p=>p.contract_id===id).reduce((n,p)=>n+Number(p.amount_irr),0);
  const remaining=(Number(contract.price_irr)-Number(contract.discount_irr)-paid)/10;
  if(amount>remaining)throw Error('مبلغ از مانده قرارداد بیشتر است.');
  const preview=afMoneyPaymentPreview(id);
  if(!preview)throw Error('پیش‌نمایش تخصیص معتبر نیست؛ مبلغ و اقساط را بررسی کنید.');
  if(preview.warning&&!confirm(preview.warning+'\n\nمبلغ موردنظر واقعاً '+money(amount)+' تومان است؟'))return;
  if(!confirm('تأیید نهایی دریافت وجه و صدور رسید\n\n'+preview.text+'\n\nروش پرداخت: '+({'cash':'نقدی','pos':'کارت‌خوان','card_transfer':'کارت‌به‌کارت','bank_transfer':'واریز بانکی'}[method]||method)+'\nتاریخ: '+$('afAcPayDate-'+id).value+'\n\nآیا مبلغ و تخصیص آن را تأیید می‌کنید؟'))return;
  const request=crypto.randomUUID();
  const {data,error}=await db().rpc('af_admission_record_installment_payment',{p_contract:id,p_request:request,p_amount:irr(amount),p_paid_on:date,p_method:method,p_note:note||null});
  if(error)throw error;
  status.textContent='پرداخت ثبت شد؛ شماره رسید: '+data.receipt_no;
  try{await load();}catch(e){status.textContent+='؛ فهرست به‌روز نشد. قبل از ثبت مجدد صفحه را تازه کنید.';}
 }catch(e){status.textContent=e.message||String(e);}finally{button.disabled=false;}
}
function contractPkg(){
 const d=drafts.find(x=>x.id===$('afAcContractIntake').value);
 $('afAcContractPackage').textContent=d?'پکیج انتخابی: '+pkg[d.package]:'';
 $('afAcFinalizeBox').hidden=!d||d.status!=='draft';
 if(d?.status==='draft')matches(d);
 $('afAcInPerson').disabled=!!d&&d.package==='online';
 $('afAcExam').disabled=!d||['ordinary','online'].includes(d.package);
 $('afAcOnline').disabled=!d||['ordinary','gold'].includes(d.package);
 if(d?.package==='online')$('afAcInPerson').value='0';
 if(d&&d.package!=='online'&&num('afAcInPerson')===0)$('afAcInPerson').value='30';
 if(!d||['ordinary','online'].includes(d.package))$('afAcExam').value='0';
 if(!d||['ordinary','gold'].includes(d.package))$('afAcOnline').value='0';
 calcContract();
}
function calcContract(){
 try{
 const chosenPkg=drafts.find(x=>x.id===$('afAcContractIntake').value)?.package;
 const net=num('afAcPrice')-num('afAcDiscount'),upfront=num('afAcInitial'),fixed=num('afAcFixed'),count=num('afAcCount'),rest=net-upfront;
  $('afAcInitial').dataset.afReferenceAmount=String(Math.max(0,net));afMoneyFormatInput($('afAcInitial'));
 if(['gold','special'].includes(chosenPkg)&&num('afAcExam')<1)
  throw Error('برای پکیج طلایی یا ویژه، تعداد آزمون حضوریِ قرارداد را وارد کنید.');
 if(['special','online'].includes(chosenPkg)&&num('afAcOnline')<1)
  throw Error('تعداد جلسات آنلاین مشمول این پکیج را وارد کنید.');
 if(net<=0||fixed>net||rest<0||count>24||(rest>0&&count<1)||(rest===0&&count!==0))throw Error('مبلغ یا تعداد اقساط را بررسی کنید.');
 $('afAcNet').textContent='شهریه پس از تخفیف: '+money(net)+' تومان | پرداخت ثبت‌نام: '+money(upfront)+' تومان | مانده اقساط: '+money(rest)+' تومان | هزینه ثابت (بخشی از شهریه): '+money(fixed)+' تومان';
 const base=count?Math.round(rest/count/50000)*50000:0;
 const first=count>1?Math.min(base,Math.floor((rest-1)/(count-1)/50000)*50000):0;
 if(count>1&&first<50000)throw Error('مانده برای این تعداد قسط با گرد کردن ۵۰ هزار تومانی کافی نیست؛ تعداد اقساط را کمتر کنید.');
 const final=count?rest-first*(count-1):0;
 if(count&&final<=0)throw Error('مبلغ قسط آخر باید مثبت باشد.');
 const dates=[];const j=digits($('afAcFirstDue').value).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
 for(let i=0;i<count;i++){
  if(!j)throw Error('تاریخ اولین قسط را شمسی وارد کنید.');
  const monthIndex=(+j[1]*12+(+j[2]-1)+i);
  const y=Math.floor(monthIndex/12),m=monthIndex%12+1;
  let iso;for(let day=+j[3];day>=1;day--){try{iso=toG(y+'/'+m+'/'+day);break;}catch(e){}}
  if(!iso)throw Error('تاریخ قسط معتبر نیست.');
 if(iso<toG($('afAcStart').value))throw Error('سررسید قسط نمی‌تواند قبل از شروع قرارداد باشد.');
  dates.push({due_on:iso,amount_irr:irr(i===count-1?final:first)});
 }
 $('afAcPlan').innerHTML=dates.length?dates.map((x,i)=>'<div class="af-ac-draft"><b>قسط '+money(i+1)+'</b><span>'+esc(toJ(x.due_on))+' — '+money(x.amount_irr/10)+' تومان</span></div>').join(''):'<p>مانده‌ای برای قسط‌بندی وجود ندارد.</p>';
 $('afAcPlan').dataset.json=JSON.stringify(dates);
 }catch(e){$('afAcNet').textContent=e.message||String(e);$('afAcPlan').textContent='';$('afAcPlan').dataset.json='';}
}
async function createContract(){
 const b=$('afAcCreate');b.disabled=true;
 try{
 const intake=$('afAcContractIntake').value;if(!intake)throw Error('پیش‌پذیرش بدون قرارداد را انتخاب کنید.');
 const admission=drafts.find(x=>x.id===intake);
 if(!admission)throw Error('پیش‌پذیرش موردنظر پیدا نشد؛ فهرست را تازه‌سازی کنید.');
 const draft=admission.status==='draft';
 const existing=draft?($('afAcExisting').value||null):null;
 const sameNameConfirmed=draft&&!existing&&$('afAcSameName').checked;
 if(draft&&!$('afAcConfirm').checked)throw Error('نام، کلاس و وضعیت پرونده هم‌نام را تأیید کنید.');
 if(draft&&students.some(s=>s.first_name?.trim()===admission.first_name&&s.last_name?.trim()===admission.last_name)&&!existing&&!sameNameConfirmed)throw Error('پرونده هم‌نام وجود دارد؛ پرونده موجود را انتخاب کنید یا ساخت پرونده مستقل را تأیید کنید.');
 const start=toG($('afAcStart').value);
 const price=num('afAcPrice'),discount=num('afAcDiscount'),fixed=num('afAcFixed'),upfront=num('afAcInitial'),inp=num('afAcInPerson'),exam=num('afAcExam'),online=num('afAcOnline');
 calcContract();if(!$('afAcPlan').dataset.json)throw Error('مبالغ، تاریخ اقساط و تعداد اقساط را بررسی کنید.');
 const installments=JSON.parse($('afAcPlan').dataset.json);
 const paidOn=upfront>0?toG($('afAcPaidOn').value):start;
 if(installments.length!==num('afAcCount'))throw Error('تعداد اقساط با جدول مطابقت ندارد.');
 const net=price-discount;
 const warning=afMoneyOneZeroWarning(upfront,net);
 if(upfront>0&&warning&&!confirm('پرداخت اولیه را دوباره بررسی کنید.\n'+warning+'\n\nمبلغ اولیه: '+money(upfront)+' تومان ('+afMoneyWords(upfront)+' تومان)'))return;
 if(!confirm('تأیید نهایی قرارداد و ثبت پرداخت اولیه\n\nدانش‌آموز: '+admission.first_name+' '+admission.last_name+'\nشهریه: '+money(price)+' تومان ('+afMoneyWords(price)+' تومان)\nتخفیف: '+money(discount)+' تومان\nهزینه ثابت: '+money(fixed)+' تومان ('+afMoneyWords(fixed)+' تومان)\nشهریه نهایی: '+money(net)+' تومان\nپرداخت اولیه: '+money(upfront)+' تومان ('+afMoneyWords(upfront)+' تومان)\nمانده اقساط: '+money(net-upfront)+' تومان\nتعداد اقساط: '+installments.length+'\n\nشناسه پرونده و عضویت کلاس فقط با ثبت موفق قرارداد ایجاد می‌شوند. حساب ورود فعلاً ساخته نمی‌شود.'))return;
 const args={p_intake:intake,p_start:start,p_price:irr(price),p_discount:irr(discount),p_fixed:irr(fixed),p_paid:irr(upfront),p_paid_on:paidOn,p_request:upfront>0?crypto.randomUUID():null,p_in_person:inp,p_exam:exam,p_online:online,p_installments:installments};
 if(draft){args.p_existing_student=existing;args.p_confirm_new_same_name=sameNameConfirmed;}
 const {data,error}=await db().rpc(draft?'af_admission_contract_from_draft_test_v1':'af_admission_create_contract_v2',args);
 if(error)throw error;
 $('afAcContractStatus').textContent='قرارداد ثبت شد. شناسه: '+data+'؛ پرداخت ثبت‌نام نیز در صورت مبلغ مثبت ثبت و رسید صادر شده است. برای تکمیل مشخصات و ساخت حساب‌های ورود، صفحه را تازه‌سازی کن و در بخش دانش‌آموزان پرونده همین دانش‌آموز را ویرایش کن؛ پرونده جدید دیگری نساز.';
 try{await load();}catch(refreshError){$('afAcContractStatus').textContent+=' فهرست تازه نشد؛ پیش از ثبت دوباره صفحه را بازخوانی کنید: '+(refreshError.message||refreshError);}
 }catch(e){$('afAcContractStatus').textContent=e.message||String(e);}finally{b.disabled=false;}
}

/* Package access editor — TEST only. Changes apply to the selected class/student only. */
let afAccessFeatures=[],afAccessRules=[],afAccessOverrides=[];
const afAccessPackages=['ordinary','gold','special','online','language','other'];
function afAccessStatus(message,error=false){const el=$('afAcAccessStatus');if(el){el.textContent=message;el.style.color=error?'#b91c1c':'#166534';}}
async function afAccessLoad(){
 const results=await Promise.all([
 db().from('af_package_features_test').select('feature_key,title_fa,description_fa,sort_order,active').order('sort_order'),
 db().from('af_package_permissions_test').select('package,feature_key,allowed'),
 db().from('af_student_feature_overrides_test').select('student_id,class_id,feature_key,allowed,reason')
 ]);
 for(const result of results)if(result.error)throw result.error;
 [afAccessFeatures,afAccessRules,afAccessOverrides]=results.map(r=>r.data||[]);
 afAccessRender();
}
function afAccessRender(){
 const el=$('afAcAccessRules');if(!el)return;
 el.innerHTML='<div class="af-ac-table-scroll"><table class="af-ac-table"><thead><tr><th>امکان</th>'+afAccessPackages.map(p=>'<th>'+esc(pkg[p])+'</th>').join('')+'</tr></thead><tbody>'+
 afAccessFeatures.map(f=>'<tr><td><b>'+esc(f.title_fa)+'</b><br><small>'+esc(f.description_fa)+'</small></td>'+
 afAccessPackages.map(p=>{const rule=afAccessRules.find(r=>r.package===p&&r.feature_key===f.feature_key);return '<td><input type="checkbox" data-af-access-package="'+esc(p)+'" data-af-access-feature="'+esc(f.feature_key)+'" aria-label="'+esc(f.title_fa+' — '+pkg[p])+'" '+(rule?.allowed?'checked':'')+' '+(!f.active?'disabled':'')+'></td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
 el.querySelectorAll('[data-af-access-package]').forEach(input=>input.onchange=async()=>{
  const p=input.dataset.afAccessPackage,key=input.dataset.afAccessFeature,allowed=input.checked;
  input.disabled=true;afAccessStatus('در حال ذخیره دسترسی...');
  const {error}=await db().from('af_package_permissions_test').upsert({package:p,feature_key:key,allowed,updated_at:new Date().toISOString()},{onConflict:'package,feature_key'});
  if(error){input.checked=!allowed;afAccessStatus('ذخیره نشد: '+error.message,true);}else{const old=afAccessRules.find(r=>r.package===p&&r.feature_key===key);if(old)old.allowed=allowed;else afAccessRules.push({package:p,feature_key:key,allowed});afAccessStatus('دسترسی «'+afAccessFeatures.find(f=>f.feature_key===key)?.title_fa+'» برای پکیج '+pkg[p]+' ذخیره شد.');}
  input.disabled=false;
 });
 const cs=$('afAcAccessClass');if(cs){const old=cs.value;cs.innerHTML=opt('','انتخاب کلاس')+classes.map(c=>opt(c.id,c.name)).join('');cs.value=old;}
 afAccessRenderStudents();
}
async function afAccessRenderStudents(){
 const classId=$('afAcAccessClass')?.value,studentSelect=$('afAcAccessStudent');if(!studentSelect)return;
 const previous=studentSelect.value;
 studentSelect.innerHTML=opt('','در حال دریافت دانش‌آموزان...');
 $('afAcAccessOverrides').innerHTML='';
 if(!classId){studentSelect.innerHTML=opt('','ابتدا کلاس را انتخاب کنید');return;}
 const {data,error}=await db().rpc('af_package_class_roster_test',{p_class:classId});
 if($('afAcAccessClass')?.value!==classId)return;
 if(error){studentSelect.innerHTML=opt('','خطا در دریافت فهرست');afAccessStatus('دریافت دانش‌آموزان: '+error.message,true);return;}
 studentSelect.innerHTML=opt('','انتخاب دانش‌آموز')+(data||[]).map(s=>opt(s.student_id,(s.first_name||'')+' '+(s.last_name||''))).join('');
 if((data||[]).some(s=>s.student_id===previous))studentSelect.value=previous;
 afAccessStatus((data||[]).length?'تعداد دانش‌آموزان فعال کلاس: '+data.length:'دانش‌آموز فعال برای این کلاس یافت نشد.');
 afAccessRenderOverrides();
}
function afAccessRenderOverrides(){
 const el=$('afAcAccessOverrides');if(!el)return;
 const sid=$('afAcAccessStudent')?.value,cid=$('afAcAccessClass')?.value;
 if(!sid||!cid){el.innerHTML='<p class="af-ac-note">ابتدا کلاس و دانش‌آموز را انتخاب کنید.</p>';return;}
 const contract=contracts.find(c=>c.student_id===sid&&c.class_id===cid&&c.status==='active');
 el.innerHTML='<p class="af-ac-note">پکیج قرارداد فعال: '+(contract?esc(pkg[contract.package]||contract.package):'قرارداد فعال یافت نشد؛ دسترسی مؤثر تا ثبت قرارداد غیرفعال است')+'</p>'+
 afAccessFeatures.filter(f=>f.active).map(f=>{
 const override=afAccessOverrides.find(o=>o.student_id===sid&&o.class_id===cid&&o.feature_key===f.feature_key);
 const base=afAccessRules.find(r=>r.package===contract?.package&&r.feature_key===f.feature_key)?.allowed||false;
 return '<label class="af-ac-field" style="margin:10px 0"><span>'+esc(f.title_fa)+' — پیش‌فرض پکیج: '+(base?'فعال':'غیرفعال')+'</span><select data-af-override="'+esc(f.feature_key)+'"><option value="">مطابق پکیج</option><option value="true" '+(override?.allowed===true?'selected':'')+'>دسترسی ویژه: فعال</option><option value="false" '+(override?.allowed===false?'selected':'')+'>محدودیت ویژه: غیرفعال</option></select></label>';
 }).join('')+'<label class="af-ac-field"><span>علت تغییر دسترسی (اختیاری)</span><input id="afAcAccessReason" placeholder="مثلاً دسترسی هدیه"></label>';
 el.querySelectorAll('[data-af-override]').forEach(select=>select.onchange=async()=>{
  const feature_key=select.dataset.afOverride,choice=select.value,previous=afAccessOverrides.find(o=>o.student_id===sid&&o.class_id===cid&&o.feature_key===feature_key);
  select.disabled=true;afAccessStatus('در حال ذخیره استثنا...');
  const query=choice===''?db().from('af_student_feature_overrides_test').delete().eq('student_id',sid).eq('class_id',cid).eq('feature_key',feature_key):
   db().from('af_student_feature_overrides_test').upsert({student_id:sid,class_id:cid,feature_key,allowed:choice==='true',reason:$('afAcAccessReason')?.value||'',updated_at:new Date().toISOString()},{onConflict:'student_id,class_id,feature_key'});
  const {error}=await query;
  if(error){select.value=previous?String(previous.allowed):'';afAccessStatus('ذخیره نشد: '+error.message,true);}
  else{afAccessStatus('دسترسی اختصاصی دانش‌آموز ذخیره شد.');try{await afAccessLoad();}catch(e){afAccessStatus('ذخیره شد؛ بارگذاری مجدد ناموفق بود: '+e.message,true);}}
  select.disabled=false;
 });
}


/* Canonical finance actions for admission contracts — TEST only.
   The historical af_finance_contracts ledger is not used by this screen. */
let afAfSeq=0,afAfRefundKey=null;
const afAfLabel={in_person:'کلاس حضوری',exam:'آزمون حضوری',online:'کلاس آنلاین'};
const afAfMoneyIrr=n=>money(Number(n||0)/10)+' تومان';
function afAfStatus(msg,bad=false){const el=$('afAfStatus');if(el){el.textContent=msg;el.style.color=bad?'#b91c1c':'#166534';}}
function afAfSyncDate(id,initial){
 const y=$(id+'-year'),m=$(id+'-month'),d=$(id+'-day'),parts=digits(initial).split('/').map(Number);
 if(!y||!m||!d)return;
 y.value=String(parts[0]);m.value=String(parts[1]);
 function sync(){ $(id).value=y.value+'/'+String(m.value).padStart(2,'0')+'/'+String(d.value).padStart(2,'0');}
 function setDays(){
  const a=[];for(let i=1;i<=31;i++){try{toG(y.value+'/'+m.value+'/'+i);a.push(i);}catch(_){}}
  const prev=Number(d.value)||parts[2]||1;
  d.innerHTML=a.map(i=>opt(i,i)).join('');
  d.value=String(a.includes(prev)?prev:a[a.length-1]);sync();
 }
 y.addEventListener('change',setDays);m.addEventListener('change',setDays);d.addEventListener('change',sync);
 setDays();
}
function afAfTehranDate(){
 const a=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
 return a.year+'-'+a.month+'-'+a.day;
}
async function afFinanceToolRefresh(){
 const picker=$('afAfContract');if(!picker||window.afCurrentRole!=='admin'||!db())return;
 const old=picker.value,all=contracts.slice();
 picker.innerHTML=opt('','انتخاب قرارداد')+all.map(c=>{
 const s=students.find(x=>x.id===c.student_id);
 return '<option value="'+esc(c.id)+'" data-package="'+esc(c.package||'')+'">'+esc((s?(s.first_name||'')+' '+(s.last_name||''):'دانش‌آموز')+' · '+(classes.find(x=>x.id===c.class_id)?.name||'کلاس')+' · '+c.contract_no)+'</option>';
 }).join('');
 picker.value=all.some(c=>c.id===old)?old:(all.length===1?all[0].id:'');
 const id=picker.value,seq=++afAfSeq;
 if(!id){$('afAfSummary').innerHTML='<p>ابتدا قرارداد را انتخاب کنید.</p>';$('afAfActions').hidden=true;return;}
 const c=all.find(x=>x.id===id);
 try{
  const rs=await Promise.all([
   db().rpc('af_admission_finance_preview_test',{p_contract:id}),
   db().from('af_admission_consumption').select('id,service_id,gift').eq('contract_id',id),
   db().from('af_admission_services').select('id,kind,starts_at,cancelled,cancel_reason').eq('class_id',c.class_id)
  ]);
  if(seq!==afAfSeq)return;
  for(let i=0;i<3;i++)if(rs[i].error)throw rs[i].error;
  const p=rs[0].data,cons=rs[1].data||[],svc=new Map((rs[2].data||[]).map(x=>[x.id,x]));
  const rows=cons.map(x=>({x,s:svc.get(x.service_id)})).filter(v=>v.s).sort((a,b)=>a.s.starts_at.localeCompare(b.s.starts_at));
  $('afAfSummary').innerHTML='<div class="af-ac-note"><b>قرارداد واحد: '+esc(c.contract_no)+'</b><br>وضعیت: '+esc(p.status)+
   ' · شهریه نهایی: '+afAfMoneyIrr(p.cap_irr)+' · پرداخت‌شده: '+afAfMoneyIrr(p.paid_irr)+
   '<br>تعداد مصرفی: حضوری '+money(p.consumed_in_person)+'، آزمون '+money(p.consumed_exam)+'، آنلاین '+money(p.consumed_online)+
   ' · هدیه: '+money(p.gifts)+' · از برنامه هفتگی برگزارشده: '+money(p.weekly_count||0)+
   '<br>هزینه ثابت: '+afAfMoneyIrr(p.fixed_fee_irr)+' · نرخ هر مورد: '+afAfMoneyIrr(p.rate_irr)+
   '<br>هزینه مصرفی تا این لحظه: '+afAfMoneyIrr(p.settlement_irr)+' · مبلغ قابل استرداد: '+afAfMoneyIrr(p.refund_due_irr)+
   (p.closed?'<br><b>تسویه قطعی ثبت شده است؛ استرداد باقیمانده: '+afAfMoneyIrr(p.refund_remaining_irr)+'</b>':'')+'</div>'+
   '<h4>ثبت‌های دستی قبلی این قرارداد (برنامه هفتگی در بخش پایین)</h4>'+
   (rows.length?rows.map(({x,s})=>'<div class="af-ac-draft"><span>'+esc(afAfLabel[s.kind]||s.kind)+' · '+esc(new Date(s.starts_at).toLocaleString('fa-IR',{timeZone:'Asia/Tehran'}))+
    (x.gift?' · هدیه':'')+(s.cancelled?' · لغوشده':'')+'</span>'+
    (!p.closed&&!s.cancelled?'<button type="button" class="secondary" data-af-cancel-session="'+esc(s.id)+'">لغو جلسه</button>':'')+'</div>').join(''):'<p>هنوز جلسه‌ای برای این قرارداد ثبت نشده است.</p>');
  $('afAfActions').hidden=!!p.closed;
  $('afAfClosed').hidden=!p.closed;
  $('afAfRefundForm').hidden=!p.closed||Number(p.refund_remaining_irr)<=0;
  $('afAfRefundHint').textContent=p.closed?'مانده استرداد: '+afAfMoneyIrr(p.refund_remaining_irr):'';
  $('afAfClose').disabled=p.closed;
  $('afAfFeeAmount').dataset.afReferenceAmount=String(Number(p.fixed_fee_irr)/10);
  $('afAfFeeAmount').value=String(Number(p.fixed_fee_irr)/10);afMoneyFormatInput($('afAfFeeAmount'));
  $('afAfRefundAmount').dataset.afReferenceAmount=String(Number(p.refund_remaining_irr||0)/10);afMoneyFormatInput($('afAfRefundAmount'));
  $('afAfSummary').querySelectorAll('[data-af-cancel-session]').forEach(btn=>btn.onclick=async()=>{
   const reason=prompt('علت لغو جلسه (برای حفظ سابقه):');if(!reason?.trim())return;
   btn.disabled=true;
   try{const {error}=await db().rpc('af_admission_cancel_service_test',{p_service:btn.dataset.afCancelSession,p_reason:reason.trim()});if(error)throw error;afAfStatus('جلسه با حفظ سابقه لغو شد.');await afFinanceToolRefresh();}
   catch(e){afAfStatus(e.message||String(e),true);}finally{btn.disabled=false;}
  });
  $('afAfRefundReceipts').innerHTML='';
  if(p.closed&&p.settlement_id){
   const {data,error}=await db().from('af_admission_refunds').select('receipt_no,amount_irr,refunded_on').eq('settlement_id',p.settlement_id).order('created_at');
   if(error)throw error;if(seq!==afAfSeq)return;
   $('afAfRefundReceipts').innerHTML=(data||[]).length?'<h4>رسیدهای استرداد</h4>'+(data||[]).map(z=>'<div>'+esc(z.receipt_no)+' · '+afAfMoneyIrr(z.amount_irr)+' · '+esc(toJ(z.refunded_on))+'</div>').join(''):'';
  }
 }catch(e){if(seq===afAfSeq)afAfStatus('دریافت اطلاعات قرارداد: '+(e.message||String(e)),true);}
}
async function afAfWithButton(id,task){
 const b=$(id);b.disabled=true;try{await task();}catch(e){afAfStatus(e.message||String(e),true);}finally{b.disabled=false;}
}
async function afAfFee(){
 const cid=$('afAfContract').value,amount=num('afAfFeeAmount'),reason=$('afAfFeeReason').value.trim();
 if(!reason)throw Error('علت تغییر هزینه ثابت را وارد کنید.');
 const oldFixed=Number(contracts.find(x=>x.id===cid)?.fixed_fee_irr||0)/10;
 const warning=afMoneyOneZeroWarning(amount,oldFixed);
 if(warning&&!confirm(warning+'\nآیا مبلغ جدید واقعاً '+money(amount)+' تومان است؟'))return;
 if(!confirm('تأیید تغییر هزینه ثابت\n\nمبلغ قبلی: '+money(oldFixed)+' تومان\nمبلغ جدید: '+money(amount)+' تومان ('+afMoneyWords(amount)+' تومان)\nعلت: '+reason+'\n\nاین تغییر با ثبت سابقه ذخیره شود؟'))return;
 const {error}=await db().rpc('af_admission_change_fixed_fee_test',{p_contract:cid,p_new_irr:irr(amount),p_reason:reason});if(error)throw error;
 afAfStatus('هزینه ثابت و سابقه تغییر ذخیره شد.');$('afAfFeeReason').value='';await afFinanceToolRefresh();
}
async function afAfCloseContract(){
 const cid=$('afAfContract').value,on=toG($('afAfCloseDate').value),why=$('afAfCloseReason').value;
 const {data:p,error:pe}=await db().rpc('af_admission_finance_preview_test',{p_contract:cid});if(pe)throw pe;
 if(!confirm('بستن قطعی قرارداد؟\n\nهزینه مصرفی: '+afAfMoneyIrr(p.settlement_irr)+'\nپرداخت‌شده: '+afAfMoneyIrr(p.paid_irr)+'\nمبلغ قابل استرداد: '+afAfMoneyIrr(p.refund_due_irr)+'\n\nاین کار دسترسی پکیج قرارداد فعال را نیز پایان می‌دهد.'))return;
 const {error}=await db().rpc('af_admission_close_contract_test',{p_contract:cid,p_effective_on:on,p_reason:why});if(error)throw error;
 afAfStatus('قرارداد با حفظ همه پرداخت‌ها و ثبت تسویه قطعی بسته شد.');await load();
}
async function afAfRefund(){
 const cid=$('afAfContract').value,amount=num('afAfRefundAmount'),date=toG($('afAfRefundDate').value),method=$('afAfRefundMethod').value;
 const {data:p,error:pe}=await db().rpc('af_admission_finance_preview_test',{p_contract:cid});if(pe)throw pe;
 if(!p.closed||amount<=0||irr(amount)>Number(p.refund_remaining_irr))throw Error('مبلغ استرداد از مانده استرداد بیشتر است.');
 const refundBalance=Number(p.refund_remaining_irr)/10;
 const warning=afMoneyOneZeroWarning(amount,refundBalance);
 if(warning&&!confirm(warning+'\nآیا مبلغ استرداد واقعاً '+money(amount)+' تومان است؟'))return;
 if(!confirm('تأیید نهایی استرداد و صدور رسید\n\nمبلغ: '+money(amount)+' تومان ('+afMoneyWords(amount)+' تومان)\nمانده استرداد قبل: '+money(refundBalance)+' تومان\nمانده استرداد بعد: '+money(refundBalance-amount)+' تومان\nتاریخ: '+$('afAfRefundDate').value+'\nروش استرداد: '+({'transfer':'واریز بانکی','card':'کارت‌به‌کارت','cash':'نقدی'}[method]||method)+'\n\nصدور رسید تأیید شود؟'))return;
 if(!afAfRefundKey)afAfRefundKey=crypto.randomUUID();
 const {data,error}=await db().rpc('af_admission_post_refund_test',{p_settlement:p.settlement_id,p_request:afAfRefundKey,p_amount_irr:irr(amount),p_refunded_on:date,p_method:method,p_reference_no:$('afAfRefundReference').value.trim()||null});
 if(error)throw error;
 afAfRefundKey=null;
 afAfStatus('استرداد ثبت شد. شماره رسید: '+data.receipt_no);
 await afFinanceToolRefresh();
}
function afAfMount(){
 const today=toJ(afAfTehranDate());
 for(const id of ['afAfCloseDate','afAfRefundDate'])afAfSyncDate(id,today);
 $('afAfContract').onchange=()=>{afAfRefundKey=null;void afFinanceToolRefresh();};
 // Recurring schedule and class-wide extra lessons are mounted by weekly-schedule-test.js.
 $('afAfUpdateFee').onclick=()=>afAfWithButton('afAfUpdateFee',afAfFee);
 $('afAfClose').onclick=()=>afAfWithButton('afAfClose',afAfCloseContract);
 $('afAfRefund').onclick=()=>afAfWithButton('afAfRefund',afAfRefund);
 // Former per-student manual session form retired; legacy session records stay visible for audit.
 for(const id of ['afAfRefundAmount','afAfRefundDate-day','afAfRefundDate-month','afAfRefundDate-year','afAfRefundMethod','afAfRefundReference'])$(id).addEventListener('change',()=>{afAfRefundKey=null;});
}

window.afAdmissionCalendarHelpers={dateSelect,syncDateSelect,toG,toJ};
function showTab(which){
 for(const name of ['new','drafts','contracts','finance','settings','access'])$('afAcTab-'+name).hidden=which!==name;
 document.querySelectorAll('[data-af-ac-tab]').forEach(b=>b.classList.toggle('primary',b.dataset.afAcTab===which));
}
function mount(){
 if(mounted||!$('afAdmissionContractRoot'))return;
 mounted=true;css();
 const root=document.createElement('div');root.id='afAdmissionTest';
 root.innerHTML='<h2>مدیریت ثبت‌نام و قراردادها</h2><p>پذیرش دانش‌آموز و مدیریت قرارداد مستقل هر کلاس — پنل مدیریت</p>'+
 '<div class="af-ac-tabs">'+[['new','پذیرش جدید'],['drafts','پذیرش‌های نیمه‌تمام'],['contracts','قراردادها'],['finance','شهریه و اقساط'],['settings','تنظیمات قرارداد'],['access','دسترسی پکیج‌ها']].map(([id,label])=>'<button type="button" class="secondary" data-af-ac-tab="'+id+'">'+label+'</button>').join('')+'</div>'+
 '<div id="afAcTab-new"><div class="af-ac-grid"><label class="af-ac-field af-ac-wide"><span>انتخاب پیش‌نویس</span><select id="afIntakeDraft"></select></label>'+
 field('afIntakeFirst','نام دانش‌آموز')+field('afIntakeLast','نام خانوادگی')+field('afIntakePhone','شماره تماس ولی','tel')+
 '<label class="af-ac-field"><span>کلاس</span><select id="afIntakeClass"></select></label>'+
 '<label class="af-ac-field"><span>پکیج</span><select id="afIntakePackage">'+Object.entries(pkg).map(([k,v])=>opt(k,v)).join('')+'</select></label></div>'+
 '<div class="af-ac-actions"><button type="button" class="primary" id="afIntakeSave">ذخیره پیش‌نویس پذیرش</button><button type="button" class="secondary" id="afAcNew">پذیرش جدید</button></div>'+
 '<div id="afIntakeStatus" role="status"></div></div>'+
 '<div id="afAcTab-drafts" hidden><h3>پذیرش‌های نیمه‌تمام</h3><div id="afAcDraftList"></div></div>'+
 '<div id="afAcTab-contracts" hidden><h3>قرارداد مستقل هر کلاس</h3><p>پذیرش‌های دارای پرونده: <b id="afAcCompleted">۰</b></p>'+
 '<div class="af-ac-grid"><label class="af-ac-field af-ac-wide"><span>پیش‌پذیرش بدون قرارداد</span><select id="afAcContractIntake"></select></label>'+
 '<p class="af-ac-wide af-ac-note" id="afAcContractPackage"></p>'+ 
  '<div id="afAcFinalizeBox" class="af-ac-note af-ac-wide" hidden><h3>بررسی پرونده پیش از ثبت قرارداد</h3><p>در صورت موفقیت ثبت قرارداد، شناسه پرونده و عضویت کلاس هم‌زمان ساخته یا به پرونده موجود متصل می‌شوند؛ اگر قرارداد خطا بدهد، این تغییرات نیز ذخیره نمی‌شوند. حساب‌های ورود در این مرحله ساخته نمی‌شوند.</p><p id="afAcMatchWarning"></p><label class="af-ac-field"><span>پرونده دانش‌آموز</span><select id="afAcExisting"></select></label><p id="afAcSameNameWrap" hidden><label><input type="checkbox" id="afAcSameName"> این دانش‌آموز فرد دیگری با نام و نام خانوادگی یکسان است؛ پرونده مستقل بساز.</label></p><p><label><input type="checkbox" id="afAcConfirm"> نام، کلاس و پرونده انتخابی را بررسی کردم.</label></p></div>'+
 dateSelect('afAcStart','شروع قرارداد (شمسی)')+
 field('afAcPrice','شهریه پکیج (تومان)','money')+field('afAcDiscount','تخفیف (تومان)','money')+field('afAcFixed','هزینه ثابت قابل تغییر (تومان)','money')+field('afAcInitial','مبلغ پرداختی هنگام ثبت‌نام (تومان)','money')+
 dateSelect('afAcPaidOn','تاریخ پرداخت هنگام ثبت‌نام (شمسی)')+field('afAcInPerson','تعداد جلسات حضوری','number')+field('afAcExam','تعداد آزمون حضوری','number')+field('afAcOnline','تعداد جلسات آنلاین','number')+
 '<label class="af-ac-field"><span>تعداد اقساط (۰ تا ۲۴)</span><input id="afAcCount" type="number" min="0" max="24" value="3"></label>'+ dateSelect('afAcFirstDue','تاریخ اولین قسط (شمسی)')+'</div>'+
 '<p id="afAcNet" class="af-ac-note"></p><div id="afAcPlan"></div><div class="af-ac-actions"><button type="button" class="primary" id="afAcCreate">ثبت قرارداد و اقساط</button></div><p id="afAcContractStatus" role="status"></p><h3>قراردادهای ثبت‌شده</h3><div class="af-ac-contract-filters"><label class="af-ac-field af-ac-wide"><span>جست‌وجوی نام دانش‌آموز، شماره قرارداد، کلاس یا شماره تماس</span><input id="afAcSearch" type="search" placeholder="جست‌وجوی قرارداد..."></label><label class="af-ac-field"><span>کلاس</span><select id="afAcFilterClass"><option value="">همه کلاس‌ها</option></select></label><label class="af-ac-field"><span>وضعیت قرارداد</span><select id="afAcFilterStatus"><option value="">همه وضعیت‌ها</option></select></label><label class="af-ac-field"><span>وضعیت مالی</span><select id="afAcFilterDebt"><option value="">همه</option><option value="debt">دارای بدهی</option><option value="settled">تسویه‌شده</option><option value="overdue">اقساط معوق</option><option value="upcoming">سررسید ۷ روز آینده</option></select></label><label class="af-ac-field"><span>مرتب‌سازی</span><select id="afAcSort"><option value="newest">جدیدترین قرارداد</option><option value="due">نزدیک‌ترین سررسید پرداخت‌نشده</option></select></label></div><div id="afAcFollowup" class="af-ac-note" role="status"></div><p id="afAcFilterCount" aria-live="polite"></p><div id="afAcContractRows"></div><div id="afAcPagination" class="af-ac-actions"></div></div>'+
 '<div id="afAcTab-finance" hidden><h3>مدیریت مصرف جلسات، انصراف و استرداد</h3><p class="af-ac-note">این بخش فقط از همان قرارداد ثبت‌نام استفاده می‌کند. پرداخت‌ها و رسیدها در تب قراردادها ثبت می‌شوند؛ حسابداری تاریخی جداگانه تغییری نمی‌کند.</p><label class="af-ac-field"><span>قرارداد</span><select id="afAfContract"></select></label><div id="afAfSummary" style="margin-top:14px"></div><div id="afAfActions" hidden><div id="afAfWeeklyApp"><p>در حال بارگذاری برنامه هفتگی کلاس...</p></div><h4>تغییر هزینه ثابت</h4><div class="af-ac-grid">'+field('afAfFeeAmount','هزینه ثابت (تومان)','money')+field('afAfFeeReason','علت تغییر')+'</div><button id="afAfUpdateFee" type="button">ثبت تغییر هزینه ثابت</button><h4>تسویه قطعی قرارداد</h4><div class="af-ac-grid">'+dateSelect('afAfCloseDate','تاریخ پایان قرارداد (شمسی)')+'<label class="af-ac-field"><span>علت پایان</span><select id="afAfCloseReason"><option value="withdrawn">انصراف</option><option value="expelled">اخراج</option><option value="completed">اتمام قرارداد</option><option value="cancelled">لغو قرارداد</option></select></label></div><button id="afAfClose" type="button">محاسبه و بستن قطعی قرارداد</button></div><div id="afAfClosed" hidden><h4>استرداد وجه پس از تسویه</h4><p id="afAfRefundHint"></p><div id="afAfRefundForm" hidden><div class="af-ac-grid">'+field('afAfRefundAmount','مبلغ استرداد (تومان)','money')+dateSelect('afAfRefundDate','تاریخ استرداد (شمسی)')+'<label class="af-ac-field"><span>روش استرداد</span><select id="afAfRefundMethod"><option value="transfer">واریز بانکی</option><option value="card">کارت‌به‌کارت</option><option value="cash">نقدی</option></select></label>'+field('afAfRefundReference','شماره پیگیری (اختیاری)')+'</div><button id="afAfRefund" type="button">ثبت استرداد و صدور رسید</button></div><div id="afAfRefundReceipts"></div></div><p id="afAfStatus" role="status"></p></div>'+
 '<div id="afAcTab-settings" hidden><h3>تنظیمات قرارداد</h3><p class="af-ac-note">تعریف مبلغ پکیج، تعداد جلسات و هزینه ثابت در مرحله بعد انجام می‌شود.</p></div>'+ 
  '<div id="afAcTab-access" hidden><h3>مدیریت دسترسی پکیج‌ها</h3><p class="af-ac-note">تغییرات دسترسی در محیط متصل به پنل ذخیره می‌شوند. سطح دسترسی هر دانش‌آموز را برای کلاس مربوط بررسی کنید.</p><div id="afAcAccessRules"></div><h3>دسترسی اختصاصی دانش‌آموز</h3><div class="af-ac-grid"><label class="af-ac-field"><span>کلاس</span><select id="afAcAccessClass"></select></label><label class="af-ac-field"><span>دانش‌آموز</span><select id="afAcAccessStudent"></select></label></div><div id="afAcAccessOverrides"></div><p id="afAcAccessStatus" role="status"></p></div>';
 $('afAdmissionContractRoot').append(root);
 root.addEventListener('input',event=>{
  const input=event.target;
  if(!input.matches?.('input[data-af-money]'))return;
  afMoneyFormatInput(input);
  if(input.id.startsWith('afAcPayAmount-'))afMoneyPaymentPreview(input.id.slice('afAcPayAmount-'.length));
 });
 $('afAcAccessClass').addEventListener('change',()=>{void afAccessRenderStudents();});
 $('afAcAccessStudent').addEventListener('change',afAccessRenderOverrides);
 $('afIntakeDraft').onchange=e=>fill(e.target.value);
 $('afIntakeSave').onclick=save;
 $('afAcNew').onclick=()=>{$('afIntakeDraft').value='';fill('');};
 $('afIntakeFirst').oninput=matches;$('afIntakeLast').oninput=matches;
 $('afAcExisting').onchange=matchesSelection;
 $('afAcSameName').onchange=matchesSelection;
 $('afAcContractIntake').onchange=contractPkg;
 $('afAcCreate').onclick=createContract;afAfMount();
 ['afAcSearch','afAcFilterClass','afAcFilterStatus','afAcFilterDebt','afAcSort'].forEach(id=>$(id).addEventListener(id==='afAcSearch'?'input':'change',()=>{contractPage=1;renderContracts();}));
 ['afAcPrice','afAcDiscount','afAcFixed','afAcInitial','afAcInPerson','afAcExam','afAcOnline','afAcCount','afAcStart','afAcFirstDue'].forEach(id=>$(id).addEventListener('input',calcContract));
 ['afAcDiscount','afAcFixed','afAcInitial','afAcExam','afAcOnline'].forEach(id=>$(id).value='0');
 ['afAcPrice','afAcDiscount','afAcFixed','afAcInitial','afAfFeeAmount','afAfRefundAmount'].forEach(id=>afMoneyFormatInput($(id)));
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,p.value]));
 const today=parts.year+'-'+parts.month+'-'+parts.day;
  ['afAcStart','afAcPaidOn'].forEach(id=>syncDateSelect(id,toJ(today)));
  // قسط اول همیشه یک ماه بعد از تاریخ شروع قرارداد است.
  syncDateSelect('afAcFirstDue',afAcNextJalaliMonth($('afAcStart').value));
  ['afAcStart-year','afAcStart-month','afAcStart-day'].forEach(id=>$(id).addEventListener('change',afAcSyncFirstDueFromStart));
 $('afAcInPerson').value='30';$('afAcCount').value='3';
  document.querySelectorAll('[data-af-ac-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.afAcTab));
 showTab('new');
}
function matchesSelection(){
 const d=drafts.find(x=>x.id===$('afAcContractIntake').value);
 const first=(d?.first_name??$('afIntakeFirst').value).trim(),last=(d?.last_name??$('afIntakeLast').value).trim();
 const has=students.some(s=>s.first_name?.trim()===first&&s.last_name?.trim()===last);
 $('afAcSameName').disabled=!!$('afAcExisting').value;
 $('afAcConfirm').disabled=has&&!$('afAcExisting').value&&!$('afAcSameName').checked;
 if($('afAcConfirm').disabled)$('afAcConfirm').checked=false;
}
async function init(){
 if(window.afCurrentRole!=='admin'||!db()||loading)return;
 loading=true;try{mount();await load();}catch(e){notice('دریافت اطلاعات پذیرش: '+(e.message||String(e)),true);}finally{loading=false;}
}
// Authentication and the manager dashboard hydrate asynchronously on the first navigation.
// A single 800ms attempt could return before afCurrentRole / afSupabase is ready.
let afAcBootstrapTimer=null,afAcBootstrapAttempts=0;
function afAcBootstrap(){
 if(mounted){if(afAcBootstrapTimer){clearInterval(afAcBootstrapTimer);afAcBootstrapTimer=null;}return;}
 if(window.afCurrentRole==='admin'&&db()&&$('afAdmissionContractRoot')){
  void init();
  if(afAcBootstrapTimer){clearInterval(afAcBootstrapTimer);afAcBootstrapTimer=null;}
  return;
 }
 if(++afAcBootstrapAttempts>=60&&afAcBootstrapTimer){
  clearInterval(afAcBootstrapTimer);afAcBootstrapTimer=null;
 }
}
function afAcStartBootstrap(){
 afAcBootstrapAttempts=0;
 afAcBootstrap();
 if(!mounted&&!afAcBootstrapTimer)afAcBootstrapTimer=setInterval(afAcBootstrap,1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',afAcStartBootstrap,{once:true});
else afAcStartBootstrap();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!mounted)afAcStartBootstrap();});
window.afAdmissionTestRefresh=init;
})();
