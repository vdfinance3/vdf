
/* VD Finance Messenger — shared through Apps Script, with local fallback. */
var vdMsgMode = "customer";
var vdMsgSelectedId = "";
var vdMsgRemoteCache = {};
var vdMsgPollTimer = null;
var vdMsgSending = false;
function vdMsgLoad(){try{return JSON.parse(localStorage.getItem("vdFinanceMessenger")||"{}")||{}}catch(e){return {}}}
function vdMsgSave(data){localStorage.setItem("vdFinanceMessenger",JSON.stringify(data||{}));}
function vdMsgCustomer(){
  var a=window.vdfCurrentStatementApplication;
  if(a&&a.id)return {id:String(a.id),name:String(a.name||"Customer")};
  return null;
}
function vdMsgAllCustomers(){
  var list=[]; try{list=typeof getLoans==="function"?getLoans():[]}catch(e){}
  return (Array.isArray(list)?list:[]).filter(function(a){return a&&a.id}).map(function(a){return{id:String(a.id),name:String(a.name||"Customer")}});
}
function vdMsgMergeLocalThread(id, thread){
  var all=vdMsgLoad(); all[id]=thread; vdMsgSave(all);
}
function vdMsgApiGet(action, params){
  if(!GOOGLE_SHEET_WEB_APP_URL)return Promise.reject(new Error("No backend URL"));
  var q=new URLSearchParams(Object.assign({action:action,_:Date.now()},params||{}));
  return fetch(GOOGLE_SHEET_WEB_APP_URL+"?"+q.toString(),{cache:"no-store"}).then(function(r){return r.json()});
}
function vdMsgApiPost(payload){
  if(!GOOGLE_SHEET_WEB_APP_URL)return Promise.reject(new Error("No backend URL"));
  return fetch(GOOGLE_SHEET_WEB_APP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload)}).then(function(r){return r.json()});
}
function vdMsgThreadUnread(thread, reader){
  var arr=thread&&Array.isArray(thread.messages)?thread.messages:[];
  return arr.filter(function(m){return m.from!==reader && !m.readBy?.[reader];}).length;
}
function vdMsgSetBadge(id,count){var el=document.getElementById(id);if(!el)return;count=Number(count)||0;el.textContent=String(count);el.style.display=count>0?"inline-flex":"none";}
function refreshVdMessageBadges(){
  var admin=sessionStorage.getItem("vdfAdmin")==="true";
  if(admin){
    vdMsgApiGet("getUnreadMessageCounts",{reader:"admin"}).then(function(r){if(r&&r.success)vdMsgSetBadge("vdAdminMsgBadge",r.total||0);}).catch(function(){
      var d=vdMsgLoad(),n=0;Object.keys(d).forEach(function(k){n+=vdMsgThreadUnread(d[k],"admin")});vdMsgSetBadge("vdAdminMsgBadge",n);
    });
  }
  var c=vdMsgCustomer();
  if(c){
    vdMsgApiGet("getUnreadMessageCounts",{reader:"customer",id:c.id}).then(function(r){if(r&&r.success)vdMsgSetBadge("vdCustomerMsgBadge",r.total||0);}).catch(function(){vdMsgSetBadge("vdCustomerMsgBadge",vdMsgThreadUnread(vdMsgLoad()[c.id]||{},"customer"));});
  }
}
function vdMsgFetchThread(id, after){
  return vdMsgApiGet("getMessages",{id:id,after:after||""}).then(function(r){
    if(!r||!r.success)throw new Error((r&&r.error)||"Message load failed");
    var thread={name:r.name||"Customer",messages:Array.isArray(r.messages)?r.messages:[]};vdMsgRemoteCache[id]=thread;vdMsgMergeLocalThread(id,thread);return thread;
  });
}
function vdMsgMarkRead(id,reader){
  if(!id)return Promise.resolve();
  return vdMsgApiPost({action:"markMessagesRead",id:id,reader:reader}).catch(function(){
    var d=vdMsgLoad(),t=d[id];if(t&&Array.isArray(t.messages)){t.messages.forEach(function(m){if(m.from!==reader){m.readBy=m.readBy||{};m.readBy[reader]=true;}});vdMsgSave(d);}
  }).then(refreshVdMessageBadges);
}
function openVdMessenger(mode){
  vdMsgMode=mode==="admin"?"admin":"customer";
  if(vdMsgMode==="admin" && sessionStorage.getItem("vdfAdmin")!=="true"){showPage("login");return;}
  var overlay=document.getElementById("vdMessengerOverlay"); if(!overlay)return;
  overlay.style.display="flex";
  document.getElementById("vdMsgSubTitle").textContent=vdMsgMode==="admin"?"Admin inbox — select a customer":"Private chat with VD Finance";
  var body=document.querySelector("#vdMessengerOverlay .vd-msg-body");
  if(vdMsgMode==="customer"){
    var c=vdMsgCustomer();if(!c){closeVdMessenger();alert("Please check your loan status first, then open Messenger.");return;}
    vdMsgSelectedId=c.id;if(body)body.classList.add("chat-open");renderVdMsgContacts();renderVdConversation();
  }else{vdMsgSelectedId="";if(body)body.classList.remove("chat-open");renderVdMsgContacts();renderVdConversation();}
  if(vdMsgPollTimer)clearInterval(vdMsgPollTimer);vdMsgPollTimer=setInterval(function(){renderVdMsgContacts(true);if(vdMsgSelectedId)renderVdConversation(true);refreshVdMessageBadges();},5000);
}
function vdMsgBack(){
  if(vdMsgMode!=="admin"){ closeVdMessenger(); return; }
  vdMsgSelectedId="";
  var body=document.querySelector("#vdMessengerOverlay .vd-msg-body"); if(body) body.classList.remove("chat-open");
  var title=document.getElementById("vdMsgChatTitle"),messages=document.getElementById("vdMsgMessages");
  if(title) title.textContent="Select a customer"; var del=document.getElementById("vdMsgDeleteBtn"); if(del) del.style.display="none";
  if(messages) messages.innerHTML='<div class="vd-msg-empty">Select a customer to start messaging.</div>';
  renderVdMsgContacts();
}
function closeVdMessenger(){var x=document.getElementById("vdMessengerOverlay");if(x)x.style.display="none";if(vdMsgPollTimer){clearInterval(vdMsgPollTimer);vdMsgPollTimer=null;}refreshVdMessageBadges();}
function renderVdMsgContacts(silent){
  var box=document.getElementById("vdMsgContacts");if(!box)return;
  if(vdMsgMode==="customer"){
    var c=vdMsgCustomer();if(!c)return;box.innerHTML='<div class="vd-msg-idcard"><b>'+escapeHTML(c.name)+'</b><br>VD ID: '+escapeHTML(c.id)+'</div>';return;
  }
  var customers=vdMsgAllCustomers();
  vdMsgApiGet("getMessageThreads",{}).then(function(r){
    var threads=r&&r.success&&Array.isArray(r.threads)?r.threads:[];
    threads.forEach(function(t){if(!customers.some(function(c){return c.id===String(t.id)}))customers.push({id:String(t.id),name:String(t.name||"Customer")});});
    box.innerHTML="";if(!customers.length){box.innerHTML='<div class="vd-msg-empty" style="padding:25px 8px">No customers found.</div>';return;}
    customers.forEach(function(c){var t=threads.find(function(x){return String(x.id)===c.id})||{};var last=t.lastMessage||"No messages yet",unread=Number(t.adminUnread)||0;var b=document.createElement("button");b.type="button";b.className="vd-msg-contact"+(vdMsgSelectedId===c.id?" active":"");b.innerHTML='<b>'+escapeHTML(c.name)+'</b><span>'+escapeHTML(c.id)+' • '+escapeHTML(String(last).slice(0,45))+'</span>'+(unread?'<i class="vd-msg-unread">'+unread+'</i>':'');b.onclick=function(){vdMsgSelectedId=c.id;var body=document.querySelector("#vdMessengerOverlay .vd-msg-body");if(body)body.classList.add("chat-open");renderVdMsgContacts();renderVdConversation();};box.appendChild(b);});
  }).catch(function(){
    var data=vdMsgLoad();box.innerHTML="";Object.keys(data).forEach(function(id){if(!customers.some(function(c){return c.id===id}))customers.push({id:id,name:data[id].name||"Customer"});});customers.forEach(function(c){var t=data[c.id]||{},a=Array.isArray(t.messages)?t.messages:[],last=a.length?a[a.length-1].text:"No messages yet",unread=vdMsgThreadUnread(t,"admin");var b=document.createElement("button");b.type="button";b.className="vd-msg-contact"+(vdMsgSelectedId===c.id?" active":"");b.innerHTML='<b>'+escapeHTML(c.name)+'</b><span>'+escapeHTML(c.id)+' • '+escapeHTML(String(last).slice(0,45))+'</span>'+(unread?'<i class="vd-msg-unread">'+unread+'</i>':'');b.onclick=function(){vdMsgSelectedId=c.id;var body=document.querySelector("#vdMessengerOverlay .vd-msg-body");if(body)body.classList.add("chat-open");renderVdMsgContacts();renderVdConversation();};box.appendChild(b);});
  });
}
function renderVdConversation(silent){
  var messages=document.getElementById("vdMsgMessages"),title=document.getElementById("vdMsgChatTitle");if(!messages||!title)return;
  var c=vdMsgMode==="customer"?vdMsgCustomer():(vdMsgAllCustomers().find(function(x){return x.id===vdMsgSelectedId})||{id:vdMsgSelectedId,name:"Customer"});
  var del=document.getElementById("vdMsgDeleteBtn");
  if(!c||!vdMsgSelectedId){title.textContent="Select a customer";if(del)del.style.display="none";messages.innerHTML='<div class="vd-msg-empty">Select a customer to start messaging.</div>';return;}
  title.textContent=c.name+" • "+c.id;if(del)del.style.display="inline-flex";
  vdMsgFetchThread(vdMsgSelectedId).then(function(thread){
    var arr=thread.messages||[];messages.innerHTML=arr.length?arr.map(function(m){return '<div class="vd-msg-bubble '+(m.from==="admin"?"admin":"customer")+'">'+escapeHTML(m.text||"")+'<small>'+escapeHTML(m.time||"")+'</small></div>';}).join(""):'<div class="vd-msg-empty">No messages yet. Start the conversation.</div>';messages.scrollTop=messages.scrollHeight;return vdMsgMarkRead(vdMsgSelectedId,vdMsgMode);
  }).then(function(){if(vdMsgMode==="admin")renderVdMsgContacts(true);}).catch(function(){
    var t=vdMsgLoad()[vdMsgSelectedId]||{},arr=Array.isArray(t.messages)?t.messages:[];messages.innerHTML=arr.length?arr.map(function(m){return '<div class="vd-msg-bubble '+(m.from==="admin"?"admin":"customer")+'">'+escapeHTML(m.text||"")+'<small>'+escapeHTML(m.time||"")+'</small></div>';}).join(""):'<div class="vd-msg-empty">No messages yet. Start the conversation.</div>';messages.scrollTop=messages.scrollHeight;
  });
}
function deleteVdConversation(){
  if(!vdMsgSelectedId)return;
  var who=vdMsgMode==="admin"?"this customer chat":"your chat history";
  if(!confirm("Delete "+who+" permanently?"))return;
  var id=vdMsgSelectedId;
  vdMsgApiPost({action:"deleteMessages",id:id}).then(function(r){
    if(!r||!r.success)throw new Error((r&&r.error)||"Delete failed");
    var d=vdMsgLoad();delete d[id];vdMsgSave(d);delete vdMsgRemoteCache[id];
    if(vdMsgMode==="admin"){vdMsgBack();}else{renderVdConversation();}
    refreshVdMessageBadges();
  }).catch(function(){
    var d=vdMsgLoad();delete d[id];vdMsgSave(d);delete vdMsgRemoteCache[id];
    if(vdMsgMode==="admin"){vdMsgBack();}else{renderVdConversation();}
    refreshVdMessageBadges();
    alert("Chat cleared on this device. Server delete could not be confirmed.");
  });
}
function sendVdMessage(e){
  if(e){e.preventDefault();e.stopPropagation();}
  if(vdMsgSending)return false;
  var input=document.getElementById("vdMsgInput"),txt=(input&&input.value||"").trim();
  if(!txt||!vdMsgSelectedId)return false;
  var c=vdMsgMode==="customer"?vdMsgCustomer():(vdMsgAllCustomers().find(function(x){return x.id===vdMsgSelectedId})||{id:vdMsgSelectedId,name:"Customer"});
  vdMsgSending=true; input.disabled=true;
  var form=document.getElementById("vdMsgForm"),btn=form?form.querySelector('button[type="submit"]'):null; if(btn)btn.disabled=true;
  vdMsgApiPost({action:"sendMessage",id:vdMsgSelectedId,name:c?c.name:"Customer",from:vdMsgMode==="admin"?"admin":"customer",text:txt,clientMessageId:"VDM-"+Date.now()+"-"+Math.random().toString(36).slice(2,8)}).then(function(r){
    if(!r||!r.success)throw new Error((r&&r.error)||"Message send failed");
    input.value="";return renderVdConversation();
  }).catch(function(){
    var d=vdMsgLoad();if(!d[vdMsgSelectedId])d[vdMsgSelectedId]={name:c?c.name:"Customer",messages:[]};
    var a=d[vdMsgSelectedId].messages||(d[vdMsgSelectedId].messages=[]);
    a.push({from:vdMsgMode==="admin"?"admin":"customer",text:txt,time:new Date().toLocaleString("en-IN"),readBy:{},localOnly:true});
    vdMsgSave(d);input.value="";renderVdConversation();
  }).finally(function(){vdMsgSending=false;input.disabled=false;if(btn)btn.disabled=false;input.focus();refreshVdMessageBadges();});
  return false;
}

window.addEventListener("load",function(){setTimeout(refreshVdMessageBadges,900);setInterval(refreshVdMessageBadges,15000);});
