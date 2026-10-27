/* VD Finance ML Analytics - local repayment-behaviour decision support */
(function () {
  "use strict";
  function sigmoid(z){ z=Math.max(-20,Math.min(20,z)); return 1/(1+Math.exp(-z)); }
  function daysBetween(a,b){ var x=new Date(a),y=new Date(b); if(isNaN(x)||isNaN(y))return 0; x.setHours(0,0,0,0); y.setHours(0,0,0,0); return Math.round((y-x)/86400000); }
  function features(loan){
    var ups=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];
    var ext=ups.filter(function(x){return /extension/i.test(String(x.type||""));}).length+(Array.isArray(loan.extensionHistory)?loan.extensionHistory.length:0);
    var pp=ups.filter(function(x){return /part payment/i.test(String(x.type||""));}).length;
    var od=0; try{ if(typeof getLoanOverdueInfo==="function") od=Number((getLoanOverdueInfo(loan)||{}).days||0); }catch(e){}
    var paid=Number(loan.amountPaid||loan.totalPaid||0), total=Math.max(1,Number(loan.originalFullAmount||loan.total||loan.amount||1));
    var cleared=/cleared|paid/i.test(String(loan.status||""))?1:0;
    return [Math.min(1,od/30),Math.min(1,ext/3),Math.min(1,pp/3),Math.min(1,paid/total),cleared];
  }
  function label(loan){
    var due=loan.repaymentDate||loan.dueDate, end=loan.clearedAt||loan.updatedAt||new Date().toISOString(); if(!due)return null;
    if(/cleared|paid/i.test(String(loan.status||""))) return daysBetween(due,end)>0?1:0;
    try{ if(typeof getLoanOverdueInfo==="function"&&Number((getLoanOverdueInfo(loan)||{}).days||0)>0)return 1; }catch(e){}
    return null;
  }
  function train(samples){
    var w=[0,0,0,0,0],b=0,lr=.16;
    if(samples.length<4)return {w:[1.55,.8,.45,-.85,-.55],b:-.45,trained:false,n:samples.length};
    for(var epoch=0;epoch<260;epoch++) samples.forEach(function(s){ var z=b; for(var i=0;i<w.length;i++)z+=w[i]*s.x[i]; var e=sigmoid(z)-s.y; b-=lr*e; for(var j=0;j<w.length;j++)w[j]-=lr*e*s.x[j]; });
    return {w:w,b:b,trained:true,n:samples.length};
  }
  function model(){ var samples=[]; (getLoans()||[]).forEach(function(a){ (ensureLoanHistory(a)||[]).forEach(function(l){var y=label(l);if(y!==null)samples.push({x:features(l),y:y});});}); return train(samples); }
  function predict(m,l){var x=features(l),z=m.b;for(var i=0;i<m.w.length;i++)z+=m.w[i]*x[i];return Math.round(sigmoid(z)*100);}
  window.openVdfMlAnalytics=function(){
    if(sessionStorage.getItem("vdfAdmin")!=="true"){showPage("login");return;}
    var m=model(),rows=[];
    (getLoans()||[]).forEach(function(a){(ensureLoanHistory(a)||[]).forEach(function(l,i){var st=String(l.status||"");if(/approved|active|pending/i.test(st)&&!/cleared|paid|rejected/i.test(st))rows.push({a:a,l:l,i:i,p:predict(m,l)});});});
    rows.sort(function(a,b){return b.p-a.p;});
    var hi=rows.filter(function(x){return x.p>=70;}).length, med=rows.filter(function(x){return x.p>=40&&x.p<70;}).length, low=rows.filter(function(x){return x.p<40;}).length;
    var html='<h3>🧠 VD ML Analytics</h3><p style="color:#aaa">Repayment-behaviour risk analysis. Identity, Aadhaar, phone and UPI are not model features.</p>'+
      '<div class="vdf-ml-grid"><div class="vdf-ml-stat"><span>Model Records</span><strong>'+m.n+'</strong></div><div class="vdf-ml-stat"><span>Low Risk</span><strong>'+low+'</strong></div><div class="vdf-ml-stat"><span>Medium Risk</span><strong>'+med+'</strong></div><div class="vdf-ml-stat"><span>High Risk</span><strong>'+hi+'</strong></div></div>'+
      '<div class="vdf-ml-note">'+(m.trained?'Model is trained locally from available VD Finance repayment outcomes.':'Not enough completed history yet; starter weights are used until at least 4 labelled repayment records are available.')+' This is decision support only and never changes a loan automatically.</div>';
    html+='<div style="margin-top:12px">'+(rows.length?rows.map(function(x){var c=x.p>=70?'high':x.p>=40?'medium':'low',lab=x.p>=70?'HIGH':x.p>=40?'MEDIUM':'LOW';return '<div class="vdf-ml-row"><div><b style="color:#fff">'+escapeHTML(x.a.name||'Customer')+'</b><div style="color:#8f8773">'+escapeHTML(x.a.id||'')+' • Loan '+(x.i+1)+'</div></div><div><span class="vdf-ml-risk '+c+'">'+lab+'</span></div><div class="vdf-ml-hide-mobile" style="color:#f4d47d;font-weight:900">'+x.p+'% late risk</div><div class="vdf-ml-hide-mobile" style="color:#aaa">Score '+(100-x.p)+'/100</div></div>';}).join(''):'<p style="color:#aaa">No active loans to analyse.</p>')+'</div><div class="vdf-modal-actions"><button onclick="vdfCloseModal()">Close</button></div>';
    vdfModal(html);
  };
})();
