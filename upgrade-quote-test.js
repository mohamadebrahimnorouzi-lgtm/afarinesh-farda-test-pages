/* Afarinesh Farda — TEST ONLY: read-only quote until explicit manager-confirmed upgrade. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const DB=()=>window.afSupabase;
const H=()=>window.afAdmissionCalendarHelpers;
const digits=s=>String(s??'').replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const money=n=>Math.round(Number(n)||0).toLocaleString('fa-IR');
const pretty=n=>Number(n||0).toLocaleString('fa-IR',{maximumFractionDigits:3});
const name={ordinary:'عادی',gold:'طلایی',special:'ویژه'};

function amountWords(input){
 const n=Number(input);if(!Number.isSafeInteger(n)||n<0)return 'نامعتبر';
 if(n===0)return 'صفر';
 const ones=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه'];
 const teens=['ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
 const tens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'];
 const hundreds=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
 const scales=['','هزار','میلیون','میلیارد','هزار میلیارد'];
 const out=[];let v=n,i=0;
 while(v>0){
  const c=v%1000,a=[];if(c){
   if(Math.floor(c/100))a.push(hundreds[Math.floor(c/100)]);
   const r=c%100;
   if(r>=20){a.push(tens[Math.floor(r/10)]);if(r%10)a.push(ones[r%10]);}
   else if(r>=10)a.push(teens[r-10]);else if(r)a.push(ones[r]);
   out.unshift(a.join(' و ')+(scales[i]?' '+scales[i]:''));}
  i++;v=Math.floor(v/1000);
 }
 return out.join(' و ');
}

const targetPrices={gold:5000000,special:5600000}; // Suggested retail prices, editable by manager; not contract prices.
const jal=new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn',{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
let snap=null,lastId='',seq=0,mounted=false,initializing=false;
let previewFee=null,previewRows=null,upgradeRequest=null,committing=false;
function msg(value,error=false){const e=$('afUqMessage');if(e){e.textContent=value;e.style.color=error?'#b91c1c':'#166534';}}
function num(raw,label){const cleaned=digits(raw).replace(/[,٬،\s]/g,'');if(!/^\d+$/.test(cleaned))throw Error(label+' باید عدد صحیح غیرمنفی باشد.');const n=Number(cleaned);if(!Number.isSafeInteger(n)||n>Number.MAX_SAFE_INTEGER/10)throw Error(label+' خارج از محدوده معتبر است.');return n;}
function today(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>parts.find(p=>p.type===k)?.value).join('-');}
function jparts(iso){const ps=jal.formatToParts(new Date(iso+'T12:00:00Z'));return ['year','month','day'].map(k=>Number(ps.find(p=>p.type===k)?.value));}
function monthDays(y,m){for(let d=31;d>=28;d--){try{H().toG(y+'/'+m+'/'+d);return d;}catch(_){}}throw Error('ماه شمسی نامعتبر');}
function monthsCompleted(start,on){
 if(on<start)throw Error('تاریخ ارتقا پیش از شروع دوره است.');
 const [sy,sm,sd]=jparts(start),[ey,em,ed]=jparts(on);
 let n=(ey-sy)*12+em-sm;
 if(ed<Math.min(sd,monthDays(ey,em)))n--;
 if(n<0||n>60)throw Error('بازه دوره برای محاسبه پلکانی معتبر نیست.');
 return n;
}
function coefficient(n,r){
 let value=1,ov=r.overrides||{},inc=Number(r.monthly_increment);
 for(let i=1;i<=n;i++)value=Number(Object.hasOwn(ov,String(i))?ov[String(i)]:(value+inc).toFixed(3));
 return value;
}
function splitFee(amount,count,firstDue){
 if(amount===0)return[];
 if(!(Number.isInteger(count)&&count>=1&&count<=24))throw Error('تعداد اقساط ارتقا باید بین ۱ و ۲۴ باشد.');
 if(firstDue<today())throw Error('تاریخ اولین قسط پیشنهادی نمی‌تواند در گذشته باشد.');
 const [y,m,day]=jparts(firstDue);
 const first=count===1?0:Math.min(Math.round(amount/count/50000)*50000,Math.floor((amount-1)/(count-1)/50000)*50000);
 if(count>1&&first<50000)throw Error('برای این مبلغ، تعداد اقساط زیاد است؛ تعداد را کمتر کنید.');
 const last=count===1?amount:amount-first*(count-1);
 if(last<=0)throw Error('مبلغ قسط آخر نامعتبر است.');
 return Array.from({length:count},(_,i)=>{
  const serial=y*12+m-1+i,year=Math.floor(serial/12),month=serial%12+1;
  const due=H().toG(year+'/'+month+'/'+Math.min(day,monthDays(year,month)));
  return {no:i+1,due,amount:i===count-1?last:first};
 });
}

function clearUpgradeConfirmation(){
 upgradeRequest=null;
 const checked=$('afUqConfirm');if(checked)checked.checked=false;
 const receipt=$('afUqReceipt');if(receipt)receipt.textContent='';
}
function setQuotaFields(){
 if(!snap)return;
 const exam=$('afUqExamQuota'),online=$('afUqOnlineQuota'),target=$('afUqTarget').value;
 if(!exam||!online)return;
 if(snap.package==='gold'){exam.value=String(snap.exam_quota||'');exam.readOnly=true;}
 else exam.readOnly=false;
 if(target==='gold'){online.value='0';online.readOnly=true;}
 else {online.readOnly=false;if(online.value==='0')online.value='';}
 const hint=$('afUqQuotaHint');
 if(hint)hint.textContent='تعداد کل خدمات تعهدشده در دوره را وارد کنید، نه فقط تعداد باقی‌مانده. سهمیه حضوری '+money(snap.quota_in_person)+' جلسه، مشترک و بدون تغییر می‌ماند.';
}

function choiceOptions(){
 const sel=$('afUqTarget');if(!sel||!snap)return;
 const values=snap.package==='ordinary'?['gold','special']:snap.package==='gold'?['special']:[];
 const prev=sel.value;
 sel.innerHTML=values.map(p=>'<option value="'+p+'">'+name[p]+'</option>').join('');
 if(values.includes(prev))sel.value=prev;
 const inp=$('afUqTargetPrice');
 inp.value=String(targetPrices[sel.value]||0);
 inp.dataset.afReferenceAmount=String(Number(snap.source_full_price_irr)/10);
 setQuotaFields();
 $('afUqCurrent').textContent='قرارداد '+snap.contract_no+' · پکیج فعلی '+name[snap.package]+' · شهریه قرارداد '+money(Number(snap.current_price_irr)/10)+' تومان · شهریه مرجع کامل پکیج فعلی '+money(Number(snap.source_full_price_irr)/10)+' تومان';
}
function render(){
 const box=$('afUqOutput');if(!box)return;
 if(!snap){box.textContent='برای محاسبه، قرارداد فعال را از فهرست بالا انتخاب کنید.';return;}
 if(snap.package==='special'){
  previewFee=null;previewRows=null;
  if($('afUqCommit'))$('afUqCommit').disabled=true;
  if($('afUqRefresh'))$('afUqRefresh').disabled=true;
  box.textContent='پکیج ویژه فعال است و پکیج بالاتری برای ارتقا وجود ندارد.';
  msg('این قرارداد در بالاترین پکیج قرار دارد.');
  return;
 }
 if($('afUqRefresh'))$('afUqRefresh').disabled=false;
 try{
  const to=$('afUqTarget').value;
  if(!(snap.package==='ordinary'&&['gold','special'].includes(to)||snap.package==='gold'&&to==='special'))throw Error('مسیر ارتقا پشتیبانی نمی‌شود.');
  const target=num($('afUqTargetPrice').value,'شهریه پکیج مقصد');
  const original=Number(snap.source_full_price_irr)/10;
  if(!(target>original))throw Error('شهریه پکیج مقصد باید از شهریه ثبت‌شده فعلی بیشتر باشد.');
  const months=Number(snap.months_completed),factor=Number(snap.coefficient);
  const total=Number(snap.quota_in_person),used=Number(snap.used_in_person),remaining=Number(snap.remaining_in_person);
  if(!(total>0&&remaining>=0&&used>=0&&used+remaining===total))throw Error('سهمیه جلسات حضوری نیازمند بازبینی است.');
  if(remaining===0)throw Error('جلسات حضوری دوره به پایان رسیده است؛ برای تغییر پکیج، تصمیم مالی اختصاصی مدیر لازم است.');
  const difference=target-original,unrounded=difference*remaining/total*factor;
  const fee=Math.round(unrounded);
  previewFee=null;previewRows=null;
  if(!Number.isSafeInteger(fee)||fee<=0)throw Error('مبلغ ارتقا باید مثبت و معتبر باشد.');
  const count=Number($('afUqInstallmentCount').value),firstDue=H().toG($('afUqFirstDue').value);
  const proposed=splitFee(fee,count,firstDue);
  const oldBalance=Number(snap.old_remaining_irr)/10;
  const oldNet=Number(snap.old_net_irr)/10;
  const paid=Number(snap.paid_irr)/10;
  const newNet=oldNet+fee,newDebt=oldBalance+fee;
  const oldRows=(snap.old_unpaid_installments||[]).filter(z=>Number(z.remaining_irr)>0);
  const oldSum=oldRows.reduce((s,z)=>s+Number(z.remaining_irr)/10,0);
  if(Math.round(oldSum)!==Math.round(oldBalance))throw Error('جمع مانده اقساط قدیمی با مانده قرارداد یکسان نیست؛ پیش‌نمایش متوقف شد.');
  const feeSum=proposed.reduce((s,z)=>s+z.amount,0);
  if(feeSum!==fee)throw Error('جمع اقساط پیشنهاد ارتقا با هزینه ارتقا مغایرت دارد.');
  previewFee=fee;previewRows=proposed;
  if($('afUqCommit'))$('afUqCommit').disabled=false;
  const warning=fee>difference?'<p class="af-uq-alert">توجه: مبلغ ارتقا از اختلاف کامل شهریه بیشتر شده است؛ ضریب و جلسات باقی‌مانده را بررسی کنید.</p>':'';
  box.innerHTML=
  '<div class="af-ac-note"><b>پیش‌فاکتور ارتقا: '+name[snap.package]+' ← '+name[to]+'</b>'+
  '<br>شروع دوره: '+esc(H().toJ(snap.period_start))+' · ماه‌های کامل‌شده: '+money(months)+' · ضریب: <b>'+pretty(factor)+'</b>'+
  '<br>حضوری برگزارشده: '+money(used)+' از '+money(total)+' · باقی‌مانده: <b>'+money(remaining)+'</b>'+
  (Number(snap.held_in_person)>total?'<br>⚠️ جلسات ثبت‌شده بیش از سهمیه است؛ شمارش طبق سقف قرارداد انجام شد.':'')+
  '<br>اختلاف شهریه کامل: '+money(difference)+' تومان'+
  '<br>فرمول: '+money(difference)+' × '+money(remaining)+' ÷ '+money(total)+' × '+pretty(factor)+
  '<br><b>هزینه ارتقا: '+money(fee)+' تومان</b> ('+amountWords(fee)+' تومان)</div>'+
  warning+
  '<div class="af-ac-note"><b>خلاصه مالی پیش‌نمایش</b>'+
  '<br>شهریه ثبت‌شده قرارداد فعلی: '+money(Number(snap.current_price_irr)/10)+' تومان'+
  '<br>شهریه خالص قرارداد فعلی: '+money(oldNet)+' تومان'+
  '<br>پرداخت‌های قبلی محفوظ: '+money(paid)+' تومان'+
  '<br>مانده فعلی: '+money(oldBalance)+' تومان'+
  '<br>هزینه افزوده ارتقا: '+money(fee)+' تومان'+
  '<br>شهریه خالص فرضی پس از ارتقا: '+money(newNet)+' تومان'+
  '<br><b>مانده کل فرضی پس از ارتقا: '+money(newDebt)+' تومان</b>'+
  '<br>تخفیف و هزینه ثابت قبلی بدون تغییر هستند؛ هزینه ثابت مجدداً دریافت نمی‌شود.</div>'+
  '<h4>اقساط قبلی (بدون تغییر)</h4>'+
  (oldRows.map(z=>'<div class="af-ac-draft">قسط '+money(z.installment_no)+' · '+esc(H().toJ(z.due_on))+
   ' · مانده '+money(Number(z.remaining_irr)/10)+' تومان</div>').join('')||'<p>مانده‌ای از اقساط قبلی وجود ندارد.</p>')+
  '<h4>اقساط پیشنهادی فقط برای مبلغ ارتقا</h4>'+
  (proposed.map(z=>'<div class="af-ac-draft">قسط جدید '+money(z.no)+' · '+esc(H().toJ(z.due))+
    ' · <b>'+money(z.amount)+' تومان</b></div>').join('')||'<p>هزینه ارتقا صفر است.</p>')+
  '<div class="af-ac-note">جمع اقساط قبلی پرداخت‌نشده: '+money(oldBalance)+
  ' تومان · جمع اقساط پیشنهادی ارتقا: '+money(fee)+
  ' تومان · جمع هر دو: <b>'+money(newDebt)+' تومان</b></div>'+
  '<p class="muted">تا پیش از تأیید نهایی مدیر و ثبت رضایت خانواده، فقط پیش‌نمایش است. پس از تأیید نیز هیچ قسط یا رسید قبلی پاک یا بازنویسی نمی‌شود.</p>';
  msg('پیش‌فاکتور با داده‌های قرارداد و تقویم کلاس محاسبه شد؛ ذخیره مالی انجام نشده است.');
 }catch(e){previewFee=null;previewRows=null;if($('afUqCommit'))$('afUqCommit').disabled=true;box.textContent='پیش‌فاکتور آماده نیست: '+(e.message||String(e));msg(e.message||String(e),true);}
}
async function load(){
 if(!mounted||!DB())return;
 const selected=$('afAfContract')?.value;
 if(!selected){lastId='';snap=null;render();msg('قرارداد را انتخاب کنید.');return;}
 const mine=++seq;lastId=selected;snap=null;upgradeRequest=null;previewFee=null;previewRows=null;
 if($('afUqCommit'))$('afUqCommit').disabled=true;
 msg('در حال دریافت داده‌های مالی و تعداد جلسات از Supabase TEST...');
 try{
  const selectedOption=$('afAfContract')?.selectedOptions?.[0];
  const selectedPackage=selectedOption?.dataset?.package||'';
  if(selectedPackage==='special'){
   snap={package:'special'};
   if($('afUqCurrent'))$('afUqCurrent').textContent='پکیج فعلی ویژه';
   render();
   return;
  }
  const {data,error}=await DB().rpc('af_upgrade_quote_snapshot_test',{p_contract:selected});
  if(mine!==seq||$('afAfContract')?.value!==selected)return;
  if(error)throw error;snap=data;choiceOptions();render();
  const warning=$('afUqOverrideWarning');
  if(warning){
    const {data:items,error:overrideError}=await DB().from('af_student_feature_overrides_test')
      .select('feature_key,allowed').eq('student_id',data.student_id)
      .eq('class_id',data.class_id).eq('allowed',false);
    warning.textContent=overrideError?'بررسی استثناهای دسترسی این دانش‌آموز ناموفق بود.':items?.length?
      '⚠️ دسترسی‌های اختصاصاً غیرفعال‌شده: '+items.map(x=>x.feature_key).join('، ')+
      '. ارتقای پکیج این تصمیم‌های مستقل مدیر را لغو نمی‌کند.':'';
  }
 }catch(e){if(mine===seq){snap=null;$('afUqOutput').textContent='پیش‌فاکتور آماده نیست: '+(e.message||String(e));msg('دریافت پیش‌فاکتور: '+(e.message||String(e)),true);}}
}

async function commitUpgrade(){
 const button=$('afUqCommit');
 if(committing)return;
 committing=true;button.disabled=true;
 try{
  if(!snap||previewFee===null||!previewRows)throw Error('ابتدا پیش‌فاکتور معتبر دریافت کنید.');
  if(!$('afUqConfirm').checked)throw Error('تأیید مدیر و پذیرش خانواده ضروری است.');
  const note=$('afUqAcceptanceNote').value.trim();
  if(note.length<5||note.length>500)throw Error('شرح تأیید خانواده را بین ۵ تا ۵۰۰ نویسه وارد کنید.');
  const target=$('afUqTarget').value;
  const exam=num($('afUqExamQuota').value,'تعداد کل آزمون‌های حضوری');
  const online=num($('afUqOnlineQuota').value,'تعداد کل کلاس‌های آنلاین');
  if(exam<1||exam>1000||(snap.package==='gold'&&exam!==Number(snap.exam_quota))||
    (target==='gold'&&online!==0)||(target==='special'&&online<1)||online>1000)
   throw Error('سهمیه کل دوره آزمون‌های حضوری و کلاس‌های آنلاین را بررسی کنید.');
  const targetPrice=num($('afUqTargetPrice').value,'شهریه کامل پکیج مقصد');
  const reference=Number(snap.source_full_price_irr)/10;
  if(targetPrice<=reference)throw Error('شهریه پکیج مقصد باید از شهریه مرجع فعلی بیشتر باشد.');
  const balance=Number(snap.old_remaining_irr)/10+previewFee;
  const text=[
   'تأیید نهایی ارتقای پکیج در محیط TEST',
   'شماره قرارداد: '+snap.contract_no,
   'مسیر: '+name[snap.package]+' ← '+name[target],
   'شهریه کامل مرجع فعلی: '+money(reference)+' تومان',
   'شهریه کامل مقصد: '+money(targetPrice)+' تومان',
   'ضریب: '+pretty(snap.coefficient)+' | حضوری باقی‌مانده: '+money(snap.remaining_in_person),
   'هزینه افزوده ارتقا: '+money(previewFee)+' تومان ('+amountWords(previewFee)+' تومان)',
   'مانده کل پس از ارتقا: '+money(balance)+' تومان',
   'کل سهمیه آزمون حضوری: '+money(exam)+' | کل سهمیه آنلاین: '+money(online),
   'اقساط افزوده: '+money(previewRows.length)+' قسط',
   'توضیح پذیرش خانواده: '+note,
   '',
   'پکیج و اقساط جدید ثبت می‌شوند؛ رسیدها و اقساط قبلی بدون تغییر می‌مانند.'
  ];
  if(targetPrice/reference>=9.5)text.unshift('⚠️ احتمال اضافه‌شدن صفر در مبلغ مقصد را بررسی کنید.');
  if(!confirm(text.join('\n')))return;
  const request=upgradeRequest||(upgradeRequest=crypto.randomUUID());
  const previousNo=snap.contract_no;
  const {data,error}=await DB().rpc('af_admission_commit_upgrade_test',{
    p_contract:snap.contract_id,
    p_request:request,
    p_target:target,
    p_target_full_irr:targetPrice*10,
    p_exam_quota:exam,
    p_online_quota:online,
    p_installments:previewRows.map(z=>({due_on:z.due,amount_irr:z.amount*10})),
    p_expected:{...snap,fee_irr:previewFee*10},
    p_acceptance_note:note,
    p_confirm:true
  });
  if(error)throw error;
  upgradeRequest=null;
  let refreshWarning='';
  try{
   if(typeof window.afAdmissionTestRefresh==='function')await window.afAdmissionTestRefresh();
   await load();
  }catch(refreshError){
   refreshWarning='؛ ارتقا ثبت شد اما تازه‌سازی صفحه ناموفق بود؛ صفحه را رفرش کنید';
   console.warn('Upgrade committed, manager refresh failed',refreshError);
  }
  const success='ارتقای قرارداد '+previousNo+' به '+name[target]+' ثبت شد؛ هزینه افزوده: '+
   money(Number(data.fee_irr)/10)+' تومان؛ اقساط افزوده: '+
   money(data.new_installments||previewRows?.length||0)+'. اقساط و رسیدهای قبلی حفظ شدند'+refreshWarning+'.';
  $('afUqReceipt').textContent=success;
  msg(success);
 }catch(e){
  const message=e.message||String(e);
  if($('afUqReceipt'))$('afUqReceipt').textContent='ثبت قطعی تأیید نشد: '+message+'؛ قبل از ارسال دوباره وضعیت قرارداد را بررسی کنید.';
  msg(message,true);
  if(/stale|modified|finance mismatch|quotation/i.test(message)){
    upgradeRequest=null;await load();
    msg('اطلاعات مالی یا ضریب تغییر کرده است؛ پیش‌فاکتور را مجدداً دریافت و تأیید کنید.',true);
  }
 }finally{committing=false;button.disabled=previewFee===null;}
}

function init(){
 if(mounted||window.afCurrentRole!=='admin'||!H()||!DB())return false;
 const host=$('afAcTab-finance'),summary=$('afAfSummary'),picker=$('afAfContract');
 if(!host||!summary||!picker)return false;
 mounted=true;
 const root=document.createElement('div');root.id='afUpgradeQuoteTest';
 root.innerHTML='<hr><h3>محاسبه دستی ارتقا (فقط جهت بررسی مدیر)</h3>'+
 '<p class="af-ac-note">این بخش صرفاً کنترل دستی است. درخواست ولی با قیمت‌ها و اقساط تنظیم‌شده برای کلاس محاسبه می‌شود؛ ثبت قطعی فقط از صندوق درخواست‌ها امکان‌پذیر است.</p>'+
 '<div class="af-ac-note" id="afUqCurrent">قرارداد را انتخاب کنید.</div>'+
 '<div class="af-ac-grid"><label class="af-ac-field"><span>پکیج مقصد</span><select id="afUqTarget"></select></label>'+
 '<label class="af-ac-field"><span>شهریه کامل پکیج مقصد (تومان؛ قابل ویرایش)</span>'+
 '<input id="afUqTargetPrice" type="text" data-af-money="1" inputmode="numeric" dir="ltr" autocomplete="off">'+
 '<small id="afUqTargetPrice-words" class="af-ac-money-words"></small></label>'+
 '<label class="af-ac-field"><span>تعداد کل آزمون‌های حضوری پکیج مقصد</span><input id="afUqExamQuota" type="number" min="1" max="1000" inputmode="numeric" placeholder="تعداد کل دوره"></label>'+
 '<label class="af-ac-field"><span>تعداد کل کلاس‌های آنلاین پکیج مقصد</span><input id="afUqOnlineQuota" type="number" min="0" max="1000" inputmode="numeric" placeholder="برای ویژه وارد کنید"></label>'+
 '<label class="af-ac-field"><span>تعداد اقساط پیشنهادی مبلغ ارتقا</span><input id="afUqInstallmentCount" type="number" min="1" max="24" value="3"></label>'+
 H().dateSelect('afUqFirstDue','تاریخ اولین قسط پیشنهادی (شمسی)')+'</div>'+
 '<p class="af-ac-note">قیمت پیشنهادی اولیه طلایی ۵٬۰۰۰٬۰۰۰ و ویژه ۵٬۶۰۰٬۰۰۰ تومان است. برای ارتقای دوم، اختلاف از شهریه کامل مرجع پکیج فعلی محاسبه می‌شود، نه شهریه تعدیل‌شده قرارداد.</p>'+
 '<p id="afUqQuotaHint" class="af-ac-note"></p><p id="afUqOverrideWarning" class="af-ac-note"></p>'+
 '<button type="button" id="afUqRefresh" class="secondary">دریافت مجدد و محاسبه پیش‌فاکتور</button>'+
 '<p role="status" id="afUqMessage"></p><div id="afUqOutput"></div>'+
 '<p class="af-ac-note">ثبت قطعی فقط از بخش «درخواست‌های تغییر پکیج ولی‌ها» و پس از تأیید مبلغ و اقساط توسط ولی انجام می‌شود.</p>'+ 
 '<div class="af-ac-note" style="display:none" aria-hidden="true"><h4>ثبت مستقیم غیرفعال است</h4>'+
 '<p>با ثبت نهایی، پکیج و امکانات جدید فعال می‌شوند و اقساط ارتقا به انتهای اقساط قرارداد افزوده خواهند شد؛ رسیدها، پرداخت‌ها و اقساط قبلی محفوظ می‌مانند.</p>'+
 '<label class="af-ac-field"><span>شرح تأیید خانواده و مدیر</span><textarea id="afUqAcceptanceNote" rows="2" placeholder="مثلاً: مبلغ و برنامه اقساط ارتقا با ولی بررسی و تأیید شد"></textarea></label>'+
 '<label style="display:block;margin:12px 0"><input type="checkbox" id="afUqConfirm"> تأیید می‌کنم شرایط، امکانات و مبلغ جدید با خانواده مطرح و پذیرفته شده‌اند.</label>'+
 '<button type="button" id="afUqCommit" class="primary" disabled>ثبت قطعی ارتقا و فعال‌سازی پکیج</button>'+
 '<p id="afUqReceipt" role="status"></p></div>';
 summary.insertAdjacentElement('afterend',root);
 H().syncDateSelect('afUqFirstDue',H().toJ(today()));
 picker.addEventListener('change',()=>{void load();});
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-af-ac-tab="finance"]'))void load();});
 $('afUqTarget').addEventListener('change',()=>{clearUpgradeConfirmation();if(snap){$('afUqTargetPrice').value=String(targetPrices[$('afUqTarget').value]||0);setQuotaFields();render();}});
 $('afUqTargetPrice').addEventListener('input',()=>{clearUpgradeConfirmation();render();});
 $('afUqInstallmentCount').addEventListener('input',()=>{clearUpgradeConfirmation();render();});
 for(const id of ['afUqExamQuota','afUqOnlineQuota'])$(id).addEventListener('input',clearUpgradeConfirmation);
 for(const part of ['day','month','year'])$('afUqFirstDue-'+part).addEventListener('change',()=>{clearUpgradeConfirmation();render();});
 // Direct manager-only upgrade is disabled: parent-approved requests use the manager queue.
 $('afUqRefresh').onclick=()=>void load();
 void load();
 return true;
}
// Auth and the admission form are hydrated asynchronously. Do not expire after
// 60 seconds: a manager may sign in or open this tab much later.
function ensureQuoteMounted(){
 if(mounted)return true;
 try{return init();}catch(e){console.warn('Upgrade quote TEST init',e);return false;}
}
const quoteBootstrapTimer=setInterval(()=>{
 if(ensureQuoteMounted())clearInterval(quoteBootstrapTimer);
},2000);
// Retry immediately when the manager enters the finance tab, even after a long idle.
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-af-ac-tab="finance"]'))ensureQuoteMounted();
});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)ensureQuoteMounted();
});
if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',ensureQuoteMounted,{once:true});
else ensureQuoteMounted();
})();