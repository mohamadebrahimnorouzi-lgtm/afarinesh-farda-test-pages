self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(_){data={body:event.data?event.data.text():''};}
  const title=data.title||'آفرینش فردا';
  const kind=data.kind||'';
  const isNightlyMissed=kind==='nightly_missed';
  const isTuitionReminder=kind==='tuition_installment';
  const isPriorityReminder=kind==='online_class'||kind==='exam_in_person'||isNightlyMissed||isTuitionReminder||kind==='test';
  const options={
    body:data.body||'',
    tag:data.tag||undefined,
    renotify:true,
    silent:false,
    vibrate:isNightlyMissed?[500,200,500,200,800]:(isPriorityReminder?[300,150,300,150,500]:undefined),
    requireInteraction:isNightlyMissed?true:undefined,
    data:{url:data.url||'./',kind}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=(event.notification.data&&event.notification.data.url)||'./';
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if('focus' in client){
        try{client.postMessage({type:'AF_PUSH_NOTIFICATION_CLICK',url:target,kind:event.notification.data&&event.notification.data.kind||''});}catch(_){}
        return client.focus();
      }
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  })());
});
