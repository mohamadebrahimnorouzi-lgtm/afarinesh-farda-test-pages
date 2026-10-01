(function(){
  'use strict';
  if(window.__afPortalAccountsV2Installed)return;
  window.__afPortalAccountsV2Installed=true;

  const ROLE_META={
    student:{label:'دانش‌آموز',icon:'👨‍🎓'},
    parent:{label:'ولی',icon:'👨‍👩‍👧'}
  };

  function db(){
    return window.afSupabase || (typeof afSupabase!=='undefined'?afSupabase:null);
  }
  function esc(v){
    return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function normalizeUsername(value){
    let v=String(value||'').trim().toLowerCase();
    v=v.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
       .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    v=v.replace(/[\s\-()]/g,'');
    if(/^\+98\d{10}$/.test(v))v='0'+v.slice(3);
    if(/^0098\d{10}$/.test(v))v='0'+v.slice(4);
    return v;
  }
  function byId(id){return document.getElementById(id);}
  function roleIds(role){
    const p=role==='parent'?'Parent':'Student';
    return {
      panel:'afPortalAccount'+p,
      username:'afPortalAccount'+p+'Username',
      password:'afPortalAccount'+p+'Password',
      active:'afPortalAccount'+p+'Active',
      save:'afPortalAccount'+p+'Save',
      status:'afPortalAccount'+p+'Status',
      toggle:'afPortalAccount'+p+'Toggle'
    };
  }

  function hideLegacyAccountFields(){
    ['accountType','accountUsername','accountPassword','accountActive','accountStatusNote'].forEach(id=>{
      const el=byId(id);if(!el)return;
      const wrap=el.closest('.field')||el.parentElement;
      if(wrap)wrap.style.display='none';
    });
    const type=byId('accountType'),user=byId('accountUsername'),pass=byId('accountPassword'),active=byId('accountActive');
    if(type)type.value='';
    if(user)user.value='';
    if(pass)pass.value='';
    if(active)active.value='active';
  }

  function accountCard(role){
    const m=ROLE_META[role],ids=roleIds(role);
    return `
      <div id="${ids.panel}" data-role="${role}" style="border:1px solid var(--color-border,#dde4ee);border-radius:14px;padding:14px;background:var(--color-surface-muted,#f8fafc)">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px;flex-wrap:wrap">
          <b>${m.icon} حساب ${m.label}</b>
          <span id="${ids.status}" class="muted">در حال بررسی…</span>
        </div>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px">
          <label class="field"><span>نام کاربری ${m.label}</span><input id="${ids.username}" dir="ltr" autocomplete="off" placeholder="نام کاربری مستقل"></label>
          <div class="field af-portal-password-field">
            <div class="af-portal-password-head"><label for="${ids.password}">رمز جدید</label><button type="button" class="af-portal-password-toggle" id="${ids.toggle}">نمایش</button></div>
            <input id="${ids.password}" type="password" dir="ltr" autocomplete="new-password" placeholder="برای حساب موجود، خالی = بدون تغییر">
          </div>
          <label class="field"><span>وضعیت</span><select id="${ids.active}"><option value="active">فعال</option><option value="inactive">غیرفعال</option></select></label>
          <div class="field" style="justify-content:flex-end"><span>&nbsp;</span><button type="button" class="primary" id="${ids.save}">ذخیره حساب ${m.label}</button></div>
        </div>
      </div>`;
  }

  function ensureUi(){
    const form=byId('studentForm');
    if(!form)return false;
    hideLegacyAccountFields();
    if(byId('afPortalAccountsV2'))return true;
    const host=document.createElement('div');
    host.id='afPortalAccountsV2';
    host.className='field full';
    host.innerHTML=`
      <div style="border-top:1px solid var(--color-border,#dde4ee);padding-top:14px;margin-top:2px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <b>حساب‌های ورود پنل</b>
          <span class="muted">یک پرونده آموزشی؛ دو حساب مستقل با دسترسی‌های متفاوت</span>
        </div>
        <div id="afPortalAccountsV2Note" class="muted" style="margin-bottom:10px"></div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px" class="af-portal-account-grid">
          ${accountCard('student')}
          ${accountCard('parent')}
        </div>
      </div>`;
    const classField=byId('studentClass')?.closest('.field');
    if(classField?.parentNode)classField.parentNode.insertBefore(host,classField);else form.appendChild(host);

    ['student','parent'].forEach(role=>{
      const ids=roleIds(role);
      byId(ids.save).addEventListener('click',()=>saveAccount(role));
      byId(ids.toggle).addEventListener('click',()=>{
        const inp=byId(ids.password),btn=byId(ids.toggle);if(!inp||!btn)return;
        const hidden=inp.type==='password';inp.type=hidden?'text':'password';btn.textContent=hidden?'مخفی کردن':'نمایش';
      });
    });
    const style=document.createElement('style');
    style.textContent='.af-portal-password-field{grid-column:1/-1!important}.af-portal-password-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.af-portal-password-toggle{position:static!important;transform:none!important;border:0;background:transparent;color:var(--color-primary,#1b6fd4);font-weight:700;padding:2px 6px;border-radius:8px}.af-portal-password-toggle:hover{background:var(--color-primary-soft,#e8f2fc)}.af-portal-password-field>input{width:100%!important;min-width:0!important;direction:ltr}@media(max-width:720px){.af-portal-account-grid{grid-template-columns:1fr!important}}';
    document.head.appendChild(style);
    return true;
  }

  function setRoleEnabled(role,enabled){
    const ids=roleIds(role);
    [ids.username,ids.password,ids.active,ids.save].forEach(id=>{const el=byId(id);if(el)el.disabled=!enabled;});
  }
  function clearRole(role){
    const ids=roleIds(role);
    if(byId(ids.username))byId(ids.username).value='';
    if(byId(ids.password))byId(ids.password).value='';
    if(byId(ids.active))byId(ids.active).value='active';
    if(byId(ids.panel))byId(ids.panel).dataset.exists='0';
    if(byId(ids.status))byId(ids.status).textContent='حسابی ثبت نشده است';
  }

  async function loadAccounts(studentId){
    ensureUi();
    hideLegacyAccountFields();
    const sid=String(studentId||'').trim();
    const note=byId('afPortalAccountsV2Note');
    if(!sid){
      if(note)note.textContent='برای دانش‌آموز جدید ابتدا پرونده را ذخیره کنید؛ سپس پرونده را دوباره باز کنید و دو حساب را بسازید.';
      ['student','parent'].forEach(role=>{clearRole(role);setRoleEnabled(role,false);});
      return;
    }
    if(note)note.textContent='نام کاربری دانش‌آموز و ولی باید متفاوت باشد. تغییر رمز اختیاری است؛ برای حساب موجود می‌توانید فیلد رمز را خالی بگذارید.';
    ['student','parent'].forEach(role=>setRoleEnabled(role,false));
    try{
      const client=db();if(!client)throw new Error('اتصال Supabase آماده نیست.');
      const {data,error}=await client.from('student_accounts')
        .select('id,student_id,username,role,auth_user_id,active,updated_at')
        .eq('student_id',sid);
      if(error)throw error;
      const rows=Array.isArray(data)?data:[];
      for(const role of ['student','parent']){
        const ids=roleIds(role),row=rows.find(x=>x.role===role)||null;
        if(row){
          byId(ids.username).value=row.username||'';
          byId(ids.password).value='';
          byId(ids.active).value=row.active===false?'inactive':'active';
          byId(ids.panel).dataset.exists='1';
          byId(ids.panel).dataset.accountId=row.id||'';
          byId(ids.status).textContent=(row.active===false?'غیرفعال':'فعال')+' · '+(row.username||'');
        }else clearRole(role);
        setRoleEnabled(role,true);
      }
    }catch(e){
      console.error('PORTAL ACCOUNTS V2 LOAD ERROR',e);
      if(note)note.textContent='دریافت حساب‌های ورود انجام نشد: '+(e?.message||e);
      ['student','parent'].forEach(role=>setRoleEnabled(role,true));
    }
  }

  async function saveAccount(role){
    const ids=roleIds(role),m=ROLE_META[role];
    const sid=String(byId('studentId')?.value||'').trim();
    if(!sid){alert('ابتدا پرونده دانش‌آموز را ذخیره کنید و دوباره باز کنید.');return;}
    const username=normalizeUsername(byId(ids.username)?.value||'');
    const password=String(byId(ids.password)?.value||'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).trim();
    const active=byId(ids.active)?.value!=='inactive';
    const exists=byId(ids.panel)?.dataset.exists==='1';
    if(!username){alert('نام کاربری '+m.label+' را وارد کنید.');return;}
    if(!exists && !password){alert('برای ساخت حساب جدید '+m.label+'، رمز عبور را وارد کنید.');return;}
    if(password && password.length<6){alert('رمز عبور باید حداقل ۶ کاراکتر باشد.');return;}

    const other=role==='student'?'parent':'student';
    const otherUsername=normalizeUsername(byId(roleIds(other).username)?.value||'');
    if(otherUsername && otherUsername===username){alert('نام کاربری دانش‌آموز و ولی باید متفاوت باشد.');return;}

    const client=db();if(!client){alert('اتصال Supabase آماده نیست.');return;}
    const btn=byId(ids.save),status=byId(ids.status);
    if(btn)btn.disabled=true;if(status)status.textContent='در حال ذخیره…';
    try{
      const first=String(byId('firstName')?.value||'').trim();
      const last=String(byId('lastName')?.value||'').trim();
      const {data,error}=await client.functions.invoke('af-create-student-account',{
        body:{username,password,role,student_id:sid,name:(first+' '+last).trim(),active}
      });
      // Supabase Functions may surface a response-parsing/transport error even when
      // the Edge Function has already committed the requested account update.
      // Verify the authoritative student_accounts row before showing a failure.
      let confirmed=null;
      if(error || !data?.ok){
        const {data:row,error:verifyError}=await client.from('student_accounts')
          .select('id,student_id,username,role,auth_user_id,active,updated_at')
          .eq('student_id',sid).eq('role',role).maybeSingle();
        if(!verifyError && row && normalizeUsername(row.username)===username && (row.active!==false)===active){
          confirmed=row;
        }else{
          const detail=data?.error || error?.message || (typeof error==='string'?error:'') || 'ذخیره حساب ورود انجام نشد.';
          throw new Error(typeof detail==='string'?detail:'ذخیره حساب ورود انجام نشد.');
        }
      }
      if(!confirmed && !data?.ok)throw new Error(data?.error||'ذخیره حساب ورود انجام نشد.');
      if(byId(ids.password))byId(ids.password).value='';
      await loadAccounts(sid);
      const msg='حساب '+m.label+' با موفقیت ذخیره شد.';
      if(typeof window.afReliableSavedMessage==='function')window.afReliableSavedMessage(msg);else alert(msg);
    }catch(e){
      console.error('PORTAL ACCOUNT V2 SAVE ERROR',e);
      if(status)status.textContent='خطا در ذخیره';
      alert('ذخیره حساب '+m.label+' انجام نشد.\n\n'+(e?.message||e));
    }finally{
      if(btn)btn.disabled=false;
    }
  }

  window.afLoadPortalAccountsV2=loadAccounts;
  window.afSavePortalAccountV2=saveAccount;

  function wrapOpenStudent(){
    if(typeof window.openStudent!=='function'||window.openStudent.__afAccountsV2)return;
    const original=window.openStudent;
    const wrapped=function(id){
      const r=original.apply(this,arguments);
      setTimeout(()=>{
        ensureUi();hideLegacyAccountFields();
        const sid=String(byId('studentId')?.value||id||'').trim();
        loadAccounts(sid);
      },0);
      return r;
    };
    wrapped.__afAccountsV2=true;
    window.openStudent=wrapped;
  }

  function install(){
    if(!ensureUi())return false;
    wrapOpenStudent();
    hideLegacyAccountFields();
    return true;
  }

  if(!install())document.addEventListener('DOMContentLoaded',install,{once:true});
  setTimeout(install,300);
})();


/* AF_MANAGER_DIRECT_INPUTS_V1
 * Accept Persian/Arabic digits in manager exam settings and normalize them
 * to browser-safe Latin numeric/time values while typing.
 */
(function(){
  const timeIds=new Set(['examStartNew','examEndNew','teStartTime','teEndTime','teResultTime','afIpStart','afIpEnd']);
  const decimalIds=new Set(['teCorrectScore','teWrongScore']);
  const integerIds=new Set(['teCount','teDuration','teAbsencePenalty','tqdNumber','tqdManualQuestionNumber']);

  function latin(v){
    return String(v??'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  }
  function numberText(v,integer){
    let x=latin(v).replace(/٬/g,'').replace(/٫/g,'.').replace(/,/g,'').trim();
    const neg=x.startsWith('-'); x=x.replace(/-/g,'');
    if(integer)x=x.replace(/\D/g,'');
    else{
      x=x.replace(/[^0-9.]/g,'');
      const p=x.indexOf('.'); if(p>=0)x=x.slice(0,p+1)+x.slice(p+1).replace(/\./g,'');
    }
    return (neg?'-':'')+x;
  }
  function timeTyping(v){
    let x=latin(v).replace(/[٫.]/g,':').replace(/\s+/g,'').replace(/[^0-9:]/g,'');
    const p=x.indexOf(':'); if(p>=0)x=x.slice(0,p+1)+x.slice(p+1).replace(/:/g,'');
    if(!x.includes(':')&&/^\d{4}$/.test(x))x=x.slice(0,2)+':'+x.slice(2);
    return x.slice(0,5);
  }
  function bindTime(el){
    if(!el||el.dataset.afDirectTime24==='1')return;
    el.dataset.afDirectTime24='1';
    const val=el.value;
    el.type='text'; el.inputMode='numeric'; el.dir='ltr'; el.autocomplete='off'; el.maxLength=5;
    el.placeholder='مثلاً 18:30'; el.title='زمان را به صورت ۲۴ ساعته وارد کنید؛ مثال 18:30';
    el.value=timeTyping(val);
    el.addEventListener('input',()=>{const v=timeTyping(el.value);if(v!==el.value)el.value=v;el.removeAttribute('aria-invalid');});
    el.addEventListener('blur',()=>{const v=timeTyping(el.value);if(v)el.value=v;if(el.value&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(el.value))el.setAttribute('aria-invalid','true');else el.removeAttribute('aria-invalid');});
  }
  function bindNumber(el,integer){
    if(!el||el.dataset.afDirectNumber==='1')return;
    el.dataset.afDirectNumber='1';
    const val=el.value;
    el.type='text'; el.inputMode=integer?'numeric':'decimal'; el.dir='ltr'; el.autocomplete='off';
    el.value=numberText(val,integer);
    el.addEventListener('input',()=>{const v=numberText(el.value,integer);if(v!==el.value)el.value=v;});
    el.addEventListener('blur',()=>{el.value=numberText(el.value,integer);});
  }
  function apply(root){
    const scope=root&&root.querySelectorAll?root:document;
    for(const id of timeIds){const el=document.getElementById(id);if(el)bindTime(el);}
    for(const id of decimalIds){const el=document.getElementById(id);if(el)bindNumber(el,false);}
    for(const id of integerIds){const el=document.getElementById(id);if(el)bindNumber(el,true);}
    scope.querySelectorAll?.('[data-tqd-draft] input[type="number"], input.q-number[type="number"]').forEach(el=>bindNumber(el,true));
  }
  function start(){
    apply(document);
    new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)apply(n);})
      .observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
