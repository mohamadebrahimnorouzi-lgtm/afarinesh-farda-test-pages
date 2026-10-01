/* TEST ONLY: parent-approved server-priced upgrade requests, manager decision and class offer rules. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const D=()=>window.afSupabase;
const H=()=>window.afAdmissionCalendarHelpers;
const money=irr=>new Intl.NumberFormat('fa-IR').format(Number(irr||0)/10)+' تومان';
const count=n=>new Intl.NumberFormat('fa-IR').format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={ordinary:'عادی',gold:'طلایی',special:'ویژه'};
const fmtDate=s=>{if(!s)return'—';const x=String(s).slice(0,10);try{return H()?.toJ(x)||x;}catch(_){return x;}};
const benefits={
 gold:['همان جلسات حضوری مشترک','آزمون‌های حضوری برنامه‌ریزی‌شده','آزمون غیرحضوری تستی و تشریحی','تمرین شبانه و پیگیری یادگیری','فیلم‌ها و آموزش‌های مجاز پکیج طلایی'],
 special:['تمام امکانات پکیج طلایی','کلاس آنلاین مطابق برنامه و سهمیه کلاس','آزمون‌های حضوری و غیرحضوری','تمرین شبانه و دسترسی آموزشی','پیگیری پیشرفت در پنل دانش‌آموز و ولی']
};
const yes=(obj)=>obj&&typeof obj==='object';
let parentContext=null,parentQuote=null,parentTarget=null,parentSeq=0,parentSaving=false;
let parentRenderSeq=0,parentOpenRequested=false;
let managerMounted=false,offerMounted=false,managerLoading=false,loadedOfferClassId=null;
function status(id,s,err=false){const el=$(id);if(el){el.textContent=s;el.style.color=err?'#b91c1c':'#166534';}}
async function rpc(name,args){if(!D())throw Error('اتصال به Supabase برقرار نیست.');const {data,error}=await D().rpc(name,args);if(error)throw error;return data;}
function div(id,className){const e=document.createElement('div');e.id=id;e.className=className||'';return e;}
function offerRows(q){
 return '<div class="af-parent-up-sum">'+
'<div>مانده قبل از ارتقا: '+money(q.snapshot.old_remaining_irr)+'</div>'+
 '<div class="af-parent-up-total">هزینه افزوده ارتقا: '+money(q.fee_irr)+'</div>'+
 '<div>مانده کل پس از ارتقا: <b>'+money(q.balance_after_irr)+'</b></div>'+
 '<p>اقساط قبلی، پرداخت‌ها و رسیدهای صادرشده بدون تغییر می‌مانند.</p></div>'+
 '<h4>اقساط پیشنهادی هزینه ارتقا</h4>'+
 '<div class="af-portal-table-wrap"><table><thead><tr><th>ردیف</th><th>سررسید شمسی</th><th>مبلغ</th></tr></thead><tbody>'+
 q.installments.map((i,n)=>'<tr><td>'+count(n+1)+'</td><td>'+esc(fmtDate(i.due_on))+'</td><td>'+money(i.amount_irr)+'</td></tr>').join('')+
 '</tbody></table></div>'+
 '<p class="muted">با ثبت درخواست، هنوز مبلغی به قرارداد اضافه یا قابلیتی فعال نمی‌شود. قطعی‌شدن فقط پس از تأیید مدیر است.</p>';
}
function parentButtons(pkg){
 const targets=pkg==='ordinary'?['gold','special']:pkg==='gold'?['special']:[];
 return targets.map(target=>'<div class="af-parent-up-card"><h4>پکیج '+names[target]+'</h4>'+
 '<ul>'+benefits[target].map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>'+
 '<button type="button" class="secondary" data-af-parent-target="'+target+'">انتخاب و مشاهده مبلغ '+names[target]+'</button></div>').join('');
}
function parentShell(c){
 return '<div class="af-portal-box af-mt af-parent-upgrade"><div class="af-parent-up-head"><h3>✨ درخواست تغییر پکیج</h3><button type="button" class="secondary" id="afParentUpClose">بستن</button></div>'+
 '<p>پکیج فعلی: <b>'+esc(names[c.package]||c.package)+'</b>. '+(c.package==='special'?'پکیج ویژه فعال است؛ سوابق درخواست‌ها را پایین ببینید.':'پکیج مورد نظر را انتخاب کنید تا مبلغ و اقساط، به‌صورت آنلاین از آموزشگاه محاسبه شود.')+'</p>'+
 '<div class="af-parent-up-grid">'+parentButtons(c.package)+'</div>'+
 '<div id="afParentUpStatus" role="status"></div><div id="afParentUpQuote"></div>'+
 '<div id="afParentUpHistory" class="af-parent-up-history"></div></div>';
}
async function renderParent(studentId,classId,role){
 const box=$('afPortalFinanceTest');if(!box||role!=='parent'||window._afPortalLoginRole!=='parent')return;
 const seq=++parentRenderSeq;
 const contracts=await rpc('af_portal_finance_by_class_test',{p_student_id:studentId,p_class_id:classId});
 if(seq!==parentRenderSeq||!box.isConnected||String(window._afPortalSelectedClassId)!==String(classId)||String(window._afPortalStudent?.id)!==String(studentId))return;
 const active=(contracts||[]).find(c=>c.status==='active'&&['ordinary','gold','special'].includes(c.package));
 if(!active)return;
 const shell=div('afParentUpgradeApp');
 shell.innerHTML=parentShell(active);
 shell.hidden=!parentOpenRequested;
 box.append(shell);
 const historyTrigger=div('afParentUpgradeHistoryTrigger');
 historyTrigger.className='af-parent-up-history-trigger';
 historyTrigger.hidden=true;
 box.insertBefore(historyTrigger,shell);
 parentContext={contractId:active.id,studentId,classId,package:active.package};
 parentQuote=null;parentTarget=null;
 $('afParentUpClose').onclick=()=>{parentOpenRequested=false;shell.hidden=true;};
 shell.querySelectorAll('[data-af-parent-target]').forEach(b=>b.onclick=()=>void selectTarget(b.dataset.afParentTarget));
 if(parentOpenRequested)requestAnimationFrame(()=>shell.scrollIntoView({behavior:'smooth',block:'start'}));
 await refreshParentHistory();
}
async function refreshParentHistory(){
 const ctx=parentContext,el=$('afParentUpHistory');if(!ctx||!el)return;
 try{
  const items=await rpc('af_upgrade_parent_requests_list_test',{p_contract:ctx.contractId});
  if(ctx!==parentContext||!el.isConnected)return;
  const historyTrigger=$('afParentUpgradeHistoryTrigger');
  if(historyTrigger){
   historyTrigger.hidden=!items.length;
   historyTrigger.innerHTML=items.length?'<button type="button" class="secondary" id="afParentUpgradeHistoryButton">📋 سوابق درخواست‌های ارتقای پکیج ('+count(items.length)+')</button>':'';
   if(items.length)$('afParentUpgradeHistoryButton').onclick=()=>window.afParentUpgradeOpen?.();
  }
  const labels={pending:'در انتظار تأیید مدیر',needs_reconfirmation:'نیازمند تأیید دوباره شما',approved:'تأیید و اجرا شده',rejected:'ردشده توسط مدیر',cancelled:'لغوشده'};
  el.innerHTML='<h4>وضعیت درخواست‌ها</h4>'+
   (items.length?items.map(r=>'<div class="af-parent-up-item"><b>'+names[r.target_package]+'</b> · '+labels[r.status]+
    ' · '+money(r.quote?.fee_irr)+
    (r.manager_note?'<br>'+esc(r.manager_note):'')+
    (r.status==='needs_reconfirmation'?'<br>پیشنهاد قبلی معتبر نیست؛ پکیج را دوباره انتخاب و مبلغ جدید را تأیید کنید.':'')+
    (['pending','needs_reconfirmation'].includes(r.status)?'<br><button type="button" class="secondary" data-af-parent-cancel="'+esc(r.id)+'">لغو درخواست</button>':'')+
    '</div>').join(''):'<p class="muted">هنوز درخواستی ثبت نشده است.</p>');
  el.querySelectorAll('[data-af-parent-cancel]').forEach(b=>b.onclick=async()=>{
   if(!confirm('درخواست تغییر پکیج لغو شود؟'))return;
   try{await rpc('af_upgrade_parent_cancel_test',{p_id:b.dataset.afParentCancel});await refreshParentHistory();status('afParentUpStatus','درخواست لغو شد.');}
   catch(e){status('afParentUpStatus',e.message||String(e),true);}
  });
 }catch(e){status('afParentUpStatus','دریافت وضعیت درخواست ممکن نشد: '+(e.message||String(e)),true);}
}
async function selectTarget(target){
 if(!parentContext)return;const ctx=parentContext,my=++parentSeq;parentTarget=target;parentQuote=null;
 const output=$('afParentUpQuote');if(!output)return;
 status('afParentUpStatus','در حال محاسبه آنلاین قیمت و اقساط پکیج '+names[target]+'...');
 output.textContent='';
 try{
  const quote=await rpc('af_upgrade_offer_quote_test',{p_contract:ctx.contractId,p_target:target});
  if(my!==parentSeq||ctx!==parentContext||!output.isConnected)return;
  parentQuote=quote;
  output.innerHTML='<div class="af-parent-up-proposal"><h4>پیشنهاد ارتقا به '+names[target]+'</h4>'+
   offerRows(quote)+'<label class="af-parent-up-accept"><input id="afParentUpAccept" type="checkbox"> '+
   'مبلغ ارتقا و سررسید تمام اقساط را مطالعه کردم و درخواست بررسی و تأیید مدیر را دارم.</label>'+
   '<label>توضیح اختیاری برای مدیر<textarea id="afParentUpNote" maxlength="500" rows="2" placeholder="در صورت نیاز توضیح بنویسید"></textarea></label>'+
   '<button type="button" class="primary" id="afParentUpSubmit" disabled>تأیید نهایی و ارسال درخواست به مدیر</button></div>';
  $('afParentUpAccept').onchange=()=>{$('afParentUpSubmit').disabled=!$('afParentUpAccept').checked||parentSaving;};
  $('afParentUpSubmit').onclick=()=>void submitParent();
  status('afParentUpStatus','محاسبه انجام شد؛ ارسال درخواست فقط با تأیید شما انجام می‌شود.');
 }catch(e){if(my!==parentSeq)return;output.textContent='این پیشنهاد هنوز قابل تأیید نیست.';status('afParentUpStatus',e.message||String(e),true);}
}
async function submitParent(){
 if(parentSaving||!parentQuote||!parentContext||!$('afParentUpAccept')?.checked)return;
 const button=$('afParentUpSubmit');const ctx=parentContext;parentSaving=true;button.disabled=true;
 try{
  if(!confirm('درخواست ارتقا به '+names[parentTarget]+' با هزینه افزوده '+money(parentQuote.fee_irr)+' و '+count(parentQuote.installment_count)+' قسط برای مدیر ارسال شود؟'))return;
  const result=await rpc('af_upgrade_parent_submit_test',{p_contract:ctx.contractId,p_target:parentTarget,
   p_expected:parentQuote,p_note:$('afParentUpNote')?.value||''});
  if(ctx!==parentContext)return;
  $('afParentUpQuote').innerHTML='<p class="af-parent-up-success">درخواست ثبت شد و در انتظار تأیید مدیر است. هیچ مبلغ یا پکیجی هنوز تغییر نکرده است.</p>';
  status('afParentUpStatus','درخواست برای مدیریت ارسال شد.');
  await refreshParentHistory();
 }catch(e){status('afParentUpStatus','درخواست ثبت نشد: '+(e.message||String(e)),true);}
 finally{parentSaving=false;if(button?.isConnected)button.disabled=!$('afParentUpAccept')?.checked;}
}
window.afParentUpgradeRender=function(studentId,classId,role){
 if(role!=='parent')return;
 parentOpenRequested=false;
 void renderParent(studentId,classId,role).catch(e=>console.warn('Parent upgrade TEST',e));
};
// The parent's locked-feature CTA is the sole entry point for this form.
window.afParentUpgradeOpen=function(){
 const ctx=window._afPortalPackageContext;
 if(!ctx||ctx.role!=='parent'||window._afPortalLoginRole!=='parent')return;
 parentOpenRequested=true;
 const shell=$('afParentUpgradeApp');
 if(shell&&parentContext&&String(parentContext.classId)===String(ctx.classId)&&String(parentContext.studentId)===String(ctx.studentId)){
  shell.hidden=false;
  shell.scrollIntoView({behavior:'smooth',block:'start'});
  return;
 }
 // The finance request may still be loading; open as soon as its class record resolves.
 void renderParent(ctx.studentId,ctx.classId,'parent').catch(e=>console.warn('Parent upgrade TEST open',e));
};

function managerRows(items){
 const labels={pending:'منتظر تأیید مدیر',needs_reconfirmation:'منتظر تأیید مجدد ولی',approved:'قطعی‌شده',rejected:'ردشده',cancelled:'لغوشده'};
 return items.map(r=>{
 const q=r.quote||{},s=q.snapshot||{},mayApprove=r.status==='pending';
 return '<div class="af-parent-up-item"><b>'+esc(r.student_name)+' · '+esc(r.class_name)+'</b>'+
 '<br>قرارداد '+esc(r.contract_no)+' · '+esc(names[q.source_package]||q.source_package)+' ← '+esc(names[r.target_package]||r.target_package)+
 ' · <b>'+esc(labels[r.status]||r.status)+'</b>'+
 '<br>هزینه افزوده: '+money(q.fee_irr)+' · مانده پس از ارتقا: '+money(q.balance_after_irr)+
 ' · ضریب '+esc(q.coefficient)+' · جلسات حضوری باقی‌مانده '+count(q.remaining_in_person)+
 '<br>اقساط پیشنهادی: '+(q.installments||[]).map(i=>esc(fmtDate(i.due_on))+' — '+money(i.amount_irr)).join(' | ')+
 (r.family_note?'<br>توضیح ولی: '+esc(r.family_note):'')+
 (r.manager_note?'<br>پاسخ مدیر: '+esc(r.manager_note):'')+
 (mayApprove?'<div class="af-parent-up-buttons"><button type="button" class="primary" data-af-manager-approve="'+esc(r.id)+'">تأیید و اجرای ارتقا</button>'+
 '<button type="button" class="secondary" data-af-manager-reject="'+esc(r.id)+'">رد درخواست</button></div>':
 r.status==='needs_reconfirmation'?'<div class="muted">خانواده باید مبلغ و اقساط جدید را در پنل تأیید کند.</div>':'')+'</div>';
 }).join('')||'<p>درخواست ارتقای جدیدی وجود ندارد.</p>';
}
async function refreshManager(){
 const el=$('afManagerUpList');if(!el||managerLoading)return;
 managerLoading=true;status('afManagerUpStatus','در حال دریافت درخواست‌های ولی‌ها...');
 try{
 const items=await rpc('af_upgrade_parent_requests_list_test',{p_contract:null});
 if(!el.isConnected)return;
 el.innerHTML='<h4>درخواست‌های در انتظار بررسی</h4>'+
  managerRows(items.filter(x=>x.status==='pending'||x.status==='needs_reconfirmation'))+
  '<details><summary>درخواست‌های قبلی ('+count(items.filter(x=>!['pending','needs_reconfirmation'].includes(x.status)).length)+')</summary>'+
  managerRows(items.filter(x=>!['pending','needs_reconfirmation'].includes(x.status)))+'</details>';
 el.querySelectorAll('[data-af-manager-approve]').forEach(b=>b.onclick=()=>void decideManager(b.dataset.afManagerApprove,'approve'));
 el.querySelectorAll('[data-af-manager-reject]').forEach(b=>b.onclick=()=>void decideManager(b.dataset.afManagerReject,'reject'));
 status('afManagerUpStatus','فهرست درخواست‌ها به‌روز شد.');
 }catch(e){status('afManagerUpStatus','دریافت درخواست‌ها: '+(e.message||String(e)),true);}
 finally{managerLoading=false;}
}
async function decideManager(id,action){
 const note=action==='reject'?prompt('علت رد درخواست را برای نمایش به ولی بنویسید:'):'';
 if(note===null)return;
 if(action==='reject'&&String(note).trim().length<3){status('afManagerUpStatus','برای رد درخواست باید علت را وارد کنید.',true);return;}
 if(action==='approve'&&!confirm('با تأیید، در صورت معتبرماندن پیشنهاد ولی، پکیج و اقساط واقعاً تغییر می‌کنند. ادامه می‌دهید؟'))return;
 status('afManagerUpStatus','در حال بررسی دوباره قیمت و ثبت تصمیم...');
 try{
 const result=await rpc('af_upgrade_manager_decide_test',{p_id:id,p_action:action,p_note:note||''});
 if(result.status==='needs_reconfirmation')
  status('afManagerUpStatus','قیمت یا شرایط تغییر کرده است؛ درخواست برای تأیید دوباره به ولی بازگردانده شد.',true);
 else status('afManagerUpStatus',result.status==='approved'?'ارتقا با همان مبلغ تأییدشده ولی قطعی شد.':'درخواست رد شد و به ولی اعلام می‌شود.');
 await refreshManager();
 if(result.status==='approved'&&typeof window.afAdmissionTestRefresh==='function')try{await window.afAdmissionTestRefresh();}catch(e){console.warn('Manager upgrade refresh deferred',e);}
 }catch(e){status('afManagerUpStatus','ثبت تصمیم: '+(e.message||String(e)),true);}
}
function initManager(){
 if(managerMounted||window.afCurrentRole!=='admin'||!D())return;
 const host=$('afAcTab-finance');if(!host)return;
 managerMounted=true;
 const root=div('afManagerUpgradeRequests');root.className='af-parent-up-manager';
 root.innerHTML='<hr><h3>📥 درخواست‌های تغییر پکیج ولی‌ها</h3>'+
 '<p class="muted">درخواست پس از مشاهده و تأیید آنلاین مبلغ و اقساط توسط ولی ثبت می‌شود. پیش از اجرای قطعی، پیشنهاد دوباره بررسی خواهد شد.</p>'+
 '<button type="button" id="afManagerUpRefresh" class="secondary">به‌روزرسانی درخواست‌ها</button>'+
 '<p role="status" id="afManagerUpStatus"></p><div id="afManagerUpList"></div>';
 const summary=$('afAfSummary');if(summary)summary.insertAdjacentElement('afterend',root);else host.prepend(root);
 $('afManagerUpRefresh').onclick=()=>void refreshManager();
 void refreshManager();
}
function asToman(v){const n=Number(String(v||'').replace(/[٬,\s]/g,''));if(!Number.isSafeInteger(n)||n<0)throw Error('مبلغ به تومان باید عدد صحیح باشد.');return n*10;}
function initOffers(){
 if(offerMounted||window.afCurrentRole!=='admin'||!D())return;
 const tab=$('afAcTab-settings'),classSel=$('afUpClass');if(!tab||!classSel)return;
 offerMounted=true;
 const root=div('afUpgradeOfferManager');root.innerHTML='<hr><h3>قیمت و شرایط اقساط ارتقا برای هر کلاس <span id="afOfSelectedClass"></span></h3>'+
 '<p class="muted">قانون ضرایب پلکانی بالای صفحه مستقل است. تعداد اقساط بر اساس ماه کامل‌شده دوره انتخاب می‌شود؛ مثلاً ۰:۳، ۲:۲، ۴:۱.</p>'+
 '<div class="af-parent-up-admin-grid">'+
 '<label>قیمت کامل طلایی (تومان)<input id="afOfGold" type="number" min="100000" step="50000"></label>'+
 '<label>قیمت کامل ویژه (تومان)<input id="afOfSpecial" type="number" min="100000" step="50000"></label>'+
 '<label>سهمیه کل آزمون حضوری طلایی<input id="afOfGoldExam" type="number" min="1" max="1000"></label>'+
 '<label>سهمیه کل آزمون حضوری ویژه<input id="afOfSpecialExam" type="number" min="1" max="1000"></label>'+
 '<label>سهمیه کل کلاس آنلاین ویژه<input id="afOfSpecialOnline" type="number" min="0" max="1000"></label>'+
 '<label>تعداد اقساط مجاز بر اساس ماه کامل‌شده<input id="afOfTiers" type="text" dir="ltr" placeholder="0:3,2:2,4:1"></label></div>'+
 '<p class="muted">اگر سهمیه آنلاین ویژه صفر باشد، محاسبه و تأیید پکیج ویژه برای خانواده غیرفعال می‌ماند تا سهمیه واقعی تعیین شود.</p>'+
 '<button type="button" class="primary" id="afOfSave">ذخیره قیمت‌ها و قواعد اقساط این کلاس</button>'+
 '<p id="afOfStatus" role="status"></p>';
 tab.append(root);
 $('afOfSave').disabled=true;
 classSel.addEventListener('change',()=>void loadOffers());
 $('afOfSave').onclick=()=>void saveOffers();
 void loadOffers();
}
async function loadOffers(){
 const classId=$('afUpClass')?.value;
 loadedOfferClassId=null;
 if($('afOfSave'))$('afOfSave').disabled=true;
 if($('afOfSelectedClass'))$('afOfSelectedClass').textContent='— '+($('afUpClass')?.selectedOptions?.[0]?.textContent?.trim()||'کلاس انتخاب‌نشده');
 if(!classId)return;
 status('afOfStatus','در حال دریافت تنظیمات این کلاس...');
 try{
 const row=await rpc('af_upgrade_offer_settings_get_test',{p_class:classId});
 if($('afUpClass').value!==classId)return;
 $('afOfGold').value=Number(row.gold_price_irr)/10;$('afOfSpecial').value=Number(row.special_price_irr)/10;
 $('afOfGoldExam').value=row.gold_exam_quota;$('afOfSpecialExam').value=row.special_exam_quota;
 $('afOfSpecialOnline').value=row.special_online_quota;
 $('afOfTiers').value=row.month_installments.map(r=>r.month+':'+r.count).join(', ');
 loadedOfferClassId=classId;
 $('afOfSave').disabled=false;
 status('afOfStatus',row.configured?'تنظیمات ذخیره‌شده این کلاس بارگذاری شد.':'برای این کلاس هنوز تنظیمات قیمت و اقساط ارتقا ذخیره نشده‌اند.');
 }catch(e){status('afOfStatus','تنظیمات دریافت نشد: '+(e.message||String(e)),true);}
}
async function saveOffers(){
 const classId=$('afUpClass')?.value;if(!classId)return;
 if(loadedOfferClassId!==classId){status('afOfStatus','ابتدا منتظر دریافت تنظیمات کلاس انتخاب‌شده بمانید.',true);return;}
 const className=$('afUpClass')?.selectedOptions?.[0]?.textContent?.trim()||'کلاس انتخاب‌شده';
 const btn=$('afOfSave');btn.disabled=true;
 try{
 const tiers=$('afOfTiers').value.split(',').map(x=>{
  const match=x.trim().match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);if(!match)throw Error('قواعد اقساط را مانند 0:3,2:2,4:1 وارد کنید.');
  return {month:Number(match[1]),count:Number(match[2])};
 });
 const args={p_class:classId,p_gold:asToman($('afOfGold').value),p_special:asToman($('afOfSpecial').value),
 p_exam_gold:Number($('afOfGoldExam').value),p_exam_special:Number($('afOfSpecialExam').value),
 p_online_special:Number($('afOfSpecialOnline').value),p_tiers:tiers};
 if(!confirm('قیمت‌ها، سهمیه‌ها و تعداد اقساط مجاز برای کلاس «'+className+'» ذخیره شوند؟\nدرخواست‌های قبلی در تأیید مدیر دوباره اعتبارسنجی خواهند شد.'))return;
 await rpc('af_upgrade_offer_settings_save_test',args);
 await loadOffers();
 if($('afUpClass')?.value===classId)status('afOfStatus','تنظیمات ارتقا برای کلاس «'+className+'» ذخیره شد.');
 }catch(e){status('afOfStatus','ذخیره انجام نشد: '+(e.message||String(e)),true);}
 finally{btn.disabled=loadedOfferClassId!==$('afUpClass')?.value;}
}
const st=document.createElement('style');st.textContent='.af-parent-upgrade[hidden],.af-parent-up-history-trigger[hidden]{display:none!important}.af-parent-up-history-trigger{margin:12px 0}.af-parent-up-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.af-parent-up-head h3{margin:0}.af-parent-up-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.af-parent-up-card,.af-parent-up-item,.af-parent-up-proposal{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin:10px 0}.af-parent-up-card h4{margin:0 0 8px}.af-parent-up-card li{line-height:1.9}.af-parent-up-sum{line-height:2.1;background:rgba(59,130,246,.08);padding:12px;border-radius:10px}.af-parent-up-total{font-weight:800;font-size:1.15rem}.af-parent-up-accept{display:block;line-height:2;padding:12px}.af-parent-up-success{border:1px solid #16a34a;padding:12px;border-radius:10px}.af-parent-up-manager{padding:16px 0}.af-parent-up-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.af-parent-up-admin-grid label{display:block}.af-parent-up-admin-grid input{width:100%;display:block;box-sizing:border-box}.af-parent-up-buttons{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}@media(max-width:620px){.af-parent-up-grid,.af-parent-up-admin-grid{grid-template-columns:1fr}}';document.head.append(st);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-af-ac-tab="finance"]'))void refreshManager();if(e.target.closest?.('[data-af-ac-tab="settings"]'))void loadOffers();});
const timer=setInterval(()=>{if(window.afCurrentRole==='admin'){initManager();initOffers();}},1300);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initManager();initOffers();},{once:true});else{initManager();initOffers();}
})();