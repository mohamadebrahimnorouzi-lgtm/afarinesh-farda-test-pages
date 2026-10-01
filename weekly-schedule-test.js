/* Afarinesh Farda — TEST class-wide recurring timetable. No Production endpoints. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const H=()=>window.afAdmissionCalendarHelpers;
const DB=()=>window.afSupabase;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const kindName={in_person:'کلاس حضوری',online:'کلاس آنلاین',exam:'آزمون حضوری'};
const days=['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'];
let slots=[],occurrences=[],classId=null,seq=0,mounted=false,busy=false;
const dayAdd=(day,offset)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
function today(){
 const p=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit'})
  .formatToParts(new Date()),g=n=>p.find(x=>x.type===n).value;
 return g('year')+'-'+g('month')+'-'+g('day');
}
function say(message,failed=false){const el=$('afWsMessage');if(el){el.textContent=message;el.style.color=failed?'#b91c1c':'#166534';}}
function currentId(){return $('afAfContract')?.value||'';}
async function rpc(name,params){
 const {data,error}=await DB().rpc(name,params);if(error)throw error;return data;
}
async function guarded(button,fn){
 if(busy)return;busy=true;if(button)button.disabled=true;
 try{await fn();}catch(e){say(e.message||String(e),true);}
 finally{busy=false;if(button)button.disabled=false;}
}
function initialMarkup(){
 const dates=H();
 return '<div class="af-ac-note"><b>برنامه هفتگی کلاس و شمارش خودکار جلسات</b><br>'+
 'هر نوبت هفتگی را یک بار برای کل کلاس تعریف کنید. «حذف از برنامه» نوبت‌های بعدی را برمی‌دارد، ولی سوابق گذشته را برای محاسبات مالی حفظ می‌کند. «لغو این جلسه» فقط همان جلسه را لغو می‌کند. جلسات آینده تا پایان زمان برگزاری مصرف‌شده نیستند. هر نوع کلاس یا آزمون فقط مطابق سهمیه قرارداد دانش‌آموز محاسبه می‌شود.</div>'+ 
 '<h4>روز و ساعت هفتگی کلاس</h4>'+
 '<label class="af-ac-field"><span>افزودن نوبت یا انتخاب برنامه برای ویرایش</span><select id="afWsReplace"><option value="">نوبت جدید</option></select></label>'+
 '<div class="af-ac-grid"><label class="af-ac-field"><span>نوع</span><select id="afWsKind"><option value="in_person">کلاس حضوری</option><option value="online">کلاس آنلاین</option><option value="exam">آزمون حضوری</option></select></label>'+
 '<label class="af-ac-field"><span>روز هفته</span><select id="afWsDow"><option value="6">شنبه</option><option value="0">یکشنبه</option><option value="1">دوشنبه</option><option value="2">سه‌شنبه</option><option value="3">چهارشنبه</option><option value="4">پنجشنبه</option><option value="5">جمعه</option></select></label>'+
 '<label class="af-ac-field"><span>ساعت شروع به وقت ایران</span><input id="afWsTime" type="time" value="17:00"></label>'+
 '<label class="af-ac-field"><span>مدت کلاس (دقیقه)</span><input id="afWsMinutes" type="number" min="15" max="360" value="90"></label>'+
 dates.dateSelect('afWsFrom','تاریخ شروع اجرای برنامه (شمسی)')+
 '</div><button type="button" id="afWsSave">ذخیره برنامه هفتگی کلاس</button><div id="afWsSlots"></div>'+
 '<h4>تقویم جلسات و ویرایش موردی</h4><p>از اینجا می‌توانید جلسه خاصی را لغو، جابه‌جا یا به زمان اصلی برگردانید؛ جلسه‌های لغوشده از هزینه مصرفی کنار گذاشته می‌شوند.</p>'+
 '<div class="af-ac-grid">'+dates.dateSelect('afWsCalStart','شروع بازه تقویم (شمسی)')+
 '<label class="af-ac-field"><span>بازه</span><button type="button" id="afWsReload" aria-controls="afWsCalendar" aria-expanded="false">نمایش ۸۵ روز جلسه</button></label></div>'+ 
 '<div id="afWsCalendar" hidden></div>'+ 
 '<h4>جلسه جبرانی یا اضافه برای تمام دانش‌آموزان کلاس</h4>'+
 '<div class="af-ac-grid"><label class="af-ac-field"><span>نوع جلسه</span><select id="afWsExtraKind"><option value="in_person">کلاس حضوری</option><option value="online">کلاس آنلاین</option><option value="exam">آزمون حضوری</option></select></label>'+
 dates.dateSelect('afWsExtraDay','تاریخ جلسه اضافه (شمسی)')+
 '<label class="af-ac-field"><span>ساعت شروع</span><input id="afWsExtraTime" type="time" value="17:00"></label>'+
 '<label class="af-ac-field"><span>مدت (دقیقه)</span><input id="afWsExtraMinutes" type="number" min="15" max="360" value="90"></label>'+
 '<label class="af-ac-field af-ac-wide"><span>علت جلسه اضافه</span><input id="afWsExtraReason" placeholder="مثلاً جلسه جبرانی"></label></div>'+
 '<label><input id="afWsExtraGift" type="checkbox"> جلسه هدیه (هزینه مصرفی نداشته باشد)</label>'+
 '<div class="af-ac-actions"><button type="button" id="afWsExtraSave">ثبت جلسه اضافه برای کل کلاس</button></div>'+
 '<p id="afWsMessage" role="status"></p>';
}
function init(){
 const root=$('afAfWeeklyApp');
 if(mounted||!root||!H()||!DB()||window.afCurrentRole!=='admin')return;
 root.innerHTML=initialMarkup();mounted=true;
 H().syncDateSelect('afWsFrom',H().toJ(today()));
 H().syncDateSelect('afWsCalStart',H().toJ(dayAdd(today(),-14)));
 H().syncDateSelect('afWsExtraDay',H().toJ(today()));
 $('afWsReplace').onchange=fillSlot;
 $('afWsSave').onclick=e=>guarded(e.currentTarget,saveWeekly);
 $('afWsReload').onclick=e=>guarded(e.currentTarget,toggleCalendar);
 $('afWsExtraSave').onclick=e=>guarded(e.currentTarget,saveExtra);
 $('afAfContract').addEventListener('change',()=>void load());
 void load();
}
function fillSlot(){
 const s=slots.find(x=>x.id===$('afWsReplace').value);
 if(!s)return;
 $('afWsKind').value=s.kind;$('afWsDow').value=String(s.dow);
 $('afWsTime').value=s.start_time.slice(0,5);$('afWsMinutes').value=String(s.duration_minutes);
 const next=dayAdd(today(),1),from=s.effective_from>next?s.effective_from:next;
 H().syncDateSelect('afWsFrom',H().toJ(from));
 say('ویرایش برنامه از تاریخ انتخابی اعمال می‌شود؛ جلسه‌های گذشته حفظ می‌شوند.');
}
async function selectedContract(){
 const id=currentId();if(!id)throw Error('ابتدا قرارداد و کلاس را انتخاب کنید.');
 const {data,error}=await DB().from('af_admission_contracts').select('id,class_id,status,contract_no').eq('id',id).single();
 if(error)throw error;return data;
}
async function load(){
 if(!mounted||!currentId())return;
 const n=++seq,c=await selectedContract();
 const from=H().toG($('afWsCalStart').value);
 const results=await Promise.all([
 DB().from('af_class_weekly_slots_test').select('*').eq('class_id',c.class_id).order('dow').order('start_time'),
 DB().rpc('af_class_calendar_test',{p_class:c.class_id,p_from:from,p_to:dayAdd(from,84)})
 ]);
 if(n!==seq||currentId()!==c.id)return;
 for(const r of results)if(r.error)throw r.error;
 classId=c.class_id;slots=results[0].data||[];occurrences=results[1].data||[];
 renderSlots();renderCalendar();say('برنامه کلاس و تقویم جلسات به‌روز است.');
}
async function toggleCalendar(){
 const box=$('afWsCalendar'),button=$('afWsReload');
 if(box.hidden){
  await load(); // Re-fetch the calendar when opening; leave collapsed if retrieval fails.
  box.hidden=false;
 }else box.hidden=true;
 button.textContent=box.hidden?'نمایش ۸۵ روز جلسه':'بستن تقویم جلسات';
 button.setAttribute('aria-expanded',String(!box.hidden));
}
function renderSlots(){
 const active=slots.filter(x=>!x.disabled&&!x.removed_from_schedule&&(!x.effective_until||x.effective_until>=today()));
 const sel=$('afWsReplace'),previous=sel.value;
 sel.innerHTML='<option value="">افزودن نوبت جدید</option>'+active.map(s=>'<option value="'+esc(s.id)+'">'+
 esc(days[s.dow]+' '+s.start_time.slice(0,5)+' · '+kindName[s.kind])+'</option>').join('');
 if(active.some(s=>s.id===previous))sel.value=previous;
 const box=$('afWsSlots');
 box.innerHTML=active.length?active.map(s=>'<div class="af-ac-draft"><span><b>'+esc(days[s.dow]+' ساعت '+s.start_time.slice(0,5))+
 '</b> · '+esc(kindName[s.kind])+' · '+esc(s.duration_minutes)+' دقیقه<br><small>از '+esc(H().toJ(s.effective_from))+
 (s.effective_until?' تا '+esc(H().toJ(s.effective_until)):' به بعد')+'</small></span>'+
 '<button type="button" class="secondary" data-slot-edit="'+esc(s.id)+'">ویرایش برنامه</button>'+
 '<button type="button" class="secondary" data-slot-stop="'+esc(s.id)+'">توقف تکرار</button>'+ 
 '<button type="button" class="secondary" data-slot-remove="'+esc(s.id)+'">حذف از برنامه</button></div>').join(''):
 '<p>برای این کلاس هنوز روز و ساعت هفتگی ثبت نشده است؛ ثبت‌های دستی قبلی محفوظ‌اند.</p>';
 box.querySelectorAll('[data-slot-edit]').forEach(b=>b.onclick=()=>{sel.value=b.dataset.slotEdit;fillSlot();});
 box.querySelectorAll('[data-slot-remove]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=slots.find(x=>x.id===b.dataset.slotRemove);if(!s)return;
 if(!confirm('نوبت «'+days[s.dow]+' '+s.start_time.slice(0,5)+' · '+kindName[s.kind]+'» از برنامه تمام دانش‌آموزان این کلاس حذف شود؟\n\nتکرارهای آینده برداشته می‌شوند. سوابق گذشته و جابه‌جایی‌های موردیِ قبلاً ثبت‌شده حفظ می‌شوند و در صورت نیاز باید جداگانه لغو شوند.'))return;
 const result=await rpc('af_class_schedule_remove_slot_test',{p_slot:s.id});
 $('afWsReplace').value='';
 await updated(result?.mode==='history_preserved'?'این نوبت از برنامه کلاس حذف شد؛ سوابق گذشته حفظ شدند.':'این نوبت از برنامه همه دانش‌آموزان کلاس حذف شد.');
 }));
 box.querySelectorAll('[data-slot-stop]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=slots.find(x=>x.id===b.dataset.slotStop);if(!s)return;
 const chosen=H().toG($('afWsFrom').value),from=[chosen,dayAdd(today(),1),s.effective_from].sort().at(-1);
 if(!confirm('تکرار این نوبت از '+H().toJ(from)+' متوقف شود؟'))return;
 await rpc('af_class_schedule_disable_slot_test',{p_slot:s.id,p_from:from});
 await updated('تکرار آینده برنامه متوقف شد؛ سوابق قبلی حفظ شدند.');
 }));
}
function getItem(b){return occurrences.find(s=>s.key===(b.dataset.move||b.dataset.cancel||b.dataset.restore||b.dataset.extraEdit||b.dataset.extraCancel));}
function hours(s){return new Date(s.starts_at).toLocaleTimeString('en-GB',{timeZone:'Asia/Tehran',hour:'2-digit',minute:'2-digit',hour12:false});}
function duration(s){return Math.round((Date.parse(s.ends_at)-Date.parse(s.starts_at))/60000);}
function askTime(s){
 const jd=prompt('تاریخ جدید شمسی:',H().toJ(s.date));if(!jd)return null;
 const time=prompt('ساعت شروع به وقت ایران (HH:MM):',hours(s));if(!time)return null;
 const mins=Number(prompt('مدت جلسه به دقیقه:',String(duration(s))));
 if(!/^\d\d:\d\d$/.test(time)||!Number.isInteger(mins)||mins<15||mins>360)throw Error('ساعت یا مدت جلسه نامعتبر است.');
 const why=prompt('علت ویرایش این جلسه:');if(!why?.trim())return null;
 return {date:H().toG(jd),time,mins,reason:why.trim()};
}
function renderCalendar(){
 const box=$('afWsCalendar');
 box.innerHTML=occurrences.length?occurrences.map(s=>{
 const stamp=new Date(s.starts_at).toLocaleString('fa-IR',{timeZone:'Asia/Tehran'});
 const status=s.cancelled?'لغوشده':s.completed?'برگزارشده و قابل شمارش':'آینده، هنوز مصرف‌نشده';
 return '<div class="af-ac-draft"><span><b>'+esc(kindName[s.kind])+'</b> · '+esc(stamp)+
 '<br><small>'+esc(status)+(s.gift?' · هدیه':'')+(s.origin==='weekly'?' · هفتگی':' · اضافه')+
 (s.note?' · '+esc(s.note):'')+'</small></span><div class="af-ac-actions">'+
 (s.origin==='weekly'?'<button type="button" class="secondary" data-move="'+esc(s.key)+'">جابه‌جایی این جلسه</button>'+
 (!s.cancelled?'<button type="button" class="secondary" data-cancel="'+esc(s.key)+'">لغو این جلسه</button>':'')+
 (s.note?'<button type="button" class="secondary" data-restore="'+esc(s.key)+'">بازگشت به زمان اصلی</button>':''):
 (!s.cancelled?'<button type="button" class="secondary" data-extra-edit="'+esc(s.key)+'">ویرایش جلسه اضافه</button>'+
 '<button type="button" class="secondary" data-extra-cancel="'+esc(s.key)+'">لغو جلسه اضافه</button>':''))+
 '</div></div>';
 }).join(''):'<p>در بازه انتخاب‌شده جلسه‌ای یافت نشد.</p>';
 box.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=getItem(b),why=prompt('علت لغو این جلسه:');if(!s||!why?.trim())return;
 await rpc('af_class_schedule_exception_test',{p_slot:s.slot_id,p_date:s.original_date,p_status:'cancelled',
 p_new_date:null,p_new_time:null,p_new_minutes:null,p_reason:why.trim()});
 await updated('این جلسه لغو شد و در هزینه مصرفی شمرده نمی‌شود.');
 }));
 box.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=getItem(b);if(!s)return;const v=askTime(s);if(!v)return;
 await rpc('af_class_schedule_exception_test',{p_slot:s.slot_id,p_date:s.original_date,p_status:'rescheduled',
 p_new_date:v.date,p_new_time:v.time,p_new_minutes:v.mins,p_reason:v.reason});
 await updated('فقط همین جلسه جابه‌جا شد؛ برنامه هفتگی تغییر نکرد.');
 }));
 box.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=getItem(b);if(!s||!confirm('بازگشت این جلسه به ساعت و تاریخ اصلی؟'))return;
 await rpc('af_class_schedule_restore_occurrence_test',{p_slot:s.slot_id,p_date:s.original_date});
 await updated('جلسه به برنامه اصلی بازگشت.');
 }));
 box.querySelectorAll('[data-extra-cancel]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=getItem(b),why=prompt('علت لغو جلسه اضافه:');if(!s||!why?.trim())return;
 await rpc('af_class_extra_cancel_test',{p_id:s.extra_id,p_reason:why.trim()});
 await updated('جلسه اضافه لغو شد.');
 }));
 box.querySelectorAll('[data-extra-edit]').forEach(b=>b.onclick=()=>guarded(b,async()=>{
 const s=getItem(b);if(!s)return;const v=askTime(s);if(!v)return;
 const gift=confirm('این جلسه هدیه است؟ تأیید = هدیه؛ لغو = عادی');
 await rpc('af_class_extra_edit_test',{p_extra:s.extra_id,p_day:v.date,p_time:v.time,
 p_minutes:v.mins,p_gift:gift,p_reason:v.reason});
 await updated('جلسه اضافه ویرایش شد.');
 }));
}
async function saveWeekly(){
 const c=await selectedContract();if(c.status!=='active')throw Error('یک قرارداد فعال انتخاب کنید.');
 const from=H().toG($('afWsFrom').value),time=$('afWsTime').value,mins=Number($('afWsMinutes').value);
 if(!/^\d\d:\d\d$/.test(time)||!Number.isInteger(mins)||mins<15||mins>360)throw Error('ساعت یا مدت کلاس نامعتبر است.');
 if(from<today()&&!confirm('از تاریخ گذشته برنامه تعریف می‌کنید؛ جلسه‌های تمام‌شده قبلی به‌طور خودکار محاسبه می‌شوند. ادامه؟'))return;
 if(!confirm('این برنامه برای تمام دانش‌آموزان کلاس اعمال شود؟'))return;
 await rpc('af_class_schedule_save_slot_test',{p_class:c.class_id,p_kind:$('afWsKind').value,
 p_dow:Number($('afWsDow').value),p_time:time,p_minutes:mins,p_from:from,p_until:null,p_replace:$('afWsReplace').value||null});
 $('afWsReplace').value='';await updated('برنامه هفتگی ذخیره شد. جلسه‌ها فقط پس از پایان برگزاری شمرده می‌شوند.');
}
async function saveExtra(){
 const c=await selectedContract();if(c.status!=='active')throw Error('یک قرارداد فعال انتخاب کنید.');
 const day=H().toG($('afWsExtraDay').value),time=$('afWsExtraTime').value,
 mins=Number($('afWsExtraMinutes').value),reason=$('afWsExtraReason').value.trim();
 if(!/^\d\d:\d\d$/.test(time)||!Number.isInteger(mins)||mins<15||mins>360||!reason)throw Error('اطلاعات و علت جلسه اضافه را کامل کنید.');
 if(!confirm('جلسه اضافه برای تمام دانش‌آموزان کلاس ثبت شود؟'))return;
 await rpc('af_class_extra_session_test',{p_class:c.class_id,p_kind:$('afWsExtraKind').value,
 p_day:day,p_time:time,p_minutes:mins,p_gift:$('afWsExtraGift').checked,p_reason:reason});
 $('afWsExtraReason').value='';await updated('جلسه اضافه برای کل کلاس ثبت شد؛ تا پایان برگزاری شمرده نمی‌شود.');
}
async function updated(note){
 await load();say(note);
 if(typeof window.afAdmissionTestRefresh==='function')await window.afAdmissionTestRefresh();
}
let attempts=0,firstLoadPending=false;const timer=setInterval(()=>{
 init();
 if(mounted&&currentId()&&!classId&&!firstLoadPending){
  firstLoadPending=true;
  void load().catch(e=>say('دریافت برنامه هفتگی: '+(e.message||String(e)),true))
   .finally(()=>{firstLoadPending=false;});
 }
 if((mounted&&classId)||++attempts>180)clearInterval(timer);
},500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!mounted)init();});
})();