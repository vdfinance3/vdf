
/* ================= NOTE 2 — EXTENSION / PART PAYMENT REGISTER ================= */
var vdfNote2OriginalRecordHTML = "";
var vdfNote2OriginalTableHead = "";

function vdfNote2Setup() {
    var card = document.querySelector('#vdfInterestBookOverlay .vdf-interest-record-card');
    var thead = document.querySelector('#vdfInterestBookOverlay .vdf-interest-table thead');
    if (!card || !thead) return;
    if (!vdfNote2OriginalRecordHTML) vdfNote2OriginalRecordHTML = card.innerHTML;
    if (!vdfNote2OriginalTableHead) vdfNote2OriginalTableHead = thead.innerHTML;

    if (vdfInterestPage !== 2) {
        if (card.getAttribute('data-note2') === 'true') {
            card.innerHTML = vdfNote2OriginalRecordHTML;
            thead.innerHTML = vdfNote2OriginalTableHead;
            card.removeAttribute('data-note2');
            populateVdfInterestCustomers();
        }
        return;
    }

    card.setAttribute('data-note2','true');
    card.innerHTML = `
      <div class="vdf-interest-section-title"><strong>Loan Extension / Part Payment</strong><span>Interest + total calculate automatically</span></div>
      <div class="vdf-interest-grid select-grid">
        <label>Customer<select id="vdfInterestCustomer" onchange="loadVdfNote2Loans()"><option value="">Select customer</option></select></label>
        <label>Loan<select id="vdfInterestLoan" onchange="loadVdfNote2LoanDetails()"><option value="">Select loan</option></select></label>
      </div>
      <div class="vdf-interest-grid">
        <label>Update Type<select id="vdfNote2Type" onchange="vdfNote2ToggleType();vdfNote2Calculate()"><option value="extension">Extension</option><option value="part">Part Payment</option></select></label>
        <label>Person Name<input id="vdfInterestName" type="text" readonly></label>
        <label>Loan Type<select id="vdfNote2LoanType" onchange="vdfNote2ToggleLoanType();vdfNote2Calculate()"><option value="monthly">Month-wise</option><option value="daily">Day-wise</option></select></label>
        <label>Total Amount<input id="vdfInterestAmount" type="number" min="0" oninput="vdfNote2Calculate()"></label>
        <label id="vdfNote2MonthsWrap">Extension Months<select id="vdfNote2Months" onchange="vdfNote2Calculate()"><option value="1">1 Month</option><option value="2">2 Months</option><option value="3">3 Months</option></select></label>
        <label id="vdfNote2DaysWrap" style="display:none">Extension Days<input id="vdfNote2Days" type="number" min="1" max="15" value="1" oninput="vdfNote2Calculate()"></label>
        <label id="vdfNote2PaidWrap" style="display:none">Amount Received<input id="vdfNote2Paid" type="number" min="0" value="0" oninput="vdfNote2Calculate()"></label>
        <label>Interest<input id="vdfInterestInterest" type="number" min="0" readonly></label>
        <label>Total Payable<input id="vdfInterestTotal" type="number" min="0" readonly></label>
        <label>New Due Date<input id="vdfInterestDue" type="date"></label>
        <label>Update Date<input id="vdfInterestDate" type="date"></label>
        <label>Note<input id="vdfNote2Remark" type="text" placeholder="Optional note"></label>
      </div>
      <div class="vdf-interest-form-actions"><button id="vdfInterestAddBtn" type="button" class="vdf-interest-gold" onclick="addVdfNote2Record()">Save Update</button><button type="button" onclick="clearVdfNote2Form()">Clear</button></div>`;
    thead.innerHTML = '<tr><th>Person / Loan</th><th>Type</th><th>Total Amount</th><th>Received</th><th>Interest</th><th>Total / Balance</th><th>New Due</th><th>Status</th><th>Action</th></tr>';
    populateVdfInterestCustomers();
    clearVdfNote2Form();
}

function loadVdfNote2Loans(){ loadVdfInterestLoans(); }
function loadVdfNote2LoanDetails(){
    var c=document.getElementById('vdfInterestCustomer'), l=document.getElementById('vdfInterestLoan');
    if(!c||!l||c.value===''||l.value==='') return;
    var app=getLoans()[Number(c.value)]; if(!app) return;
    var loan=ensureLoanHistory(app)[Number(l.value)]; if(!loan) return;
    document.getElementById('vdfInterestName').value=app.name||'';
    var fullAmount=Math.max(0,Number(loan.total)||((Number(loan.amount)||0)+(Number(loan.interest)||0)+(Number(loan.fee)||0)));
    var amountEl=document.getElementById('vdfInterestAmount');
    amountEl.value=fullAmount;
    // Keep the real loan components on the field so Month Extension can add
    // the ORIGINAL monthly interest again instead of charging interest on ₹fullAmount.
    amountEl.dataset.principal=String(Math.max(0,Number(loan.amount)||0));
    amountEl.dataset.currentInterest=String(Math.max(0,Number(loan.interest)||0));
    amountEl.dataset.platformFee=String(Math.max(0,Number(loan.fee)||0));
    var originalMonthlyInterest=Number(loan.monthlyInterest);
    if(!Number.isFinite(originalMonthlyInterest)||originalMonthlyInterest<0){
        var monthsSoFar=Math.max(1,Math.ceil(Math.max(1,Number(loan.period)||30)/30));
        originalMonthlyInterest=Math.max(0,Number(loan.interest)||0)/monthsSoFar;
    }
    amountEl.dataset.originalMonthlyInterest=String(originalMonthlyInterest);
    document.getElementById('vdfInterestDate').value=vdfDateForInput(new Date().toISOString());
    document.getElementById('vdfInterestDue').value=vdfDateForInput(loan.repaymentDate||getRepaymentDateFromCreatedAt(loan.createdAt,loan.period)||'');
    document.getElementById('vdfNote2LoanType').value=Number(loan.period)>0&&Number(loan.period)<30?'daily':'monthly';
    vdfNote2ToggleLoanType(); vdfNote2Calculate();
}
function vdfNote2ToggleType(){
    var part=document.getElementById('vdfNote2Type')?.value==='part';
    var p=document.getElementById('vdfNote2PaidWrap'); if(p)p.style.display=part?'block':'none';
}
function vdfNote2ToggleLoanType(){
    var daily=document.getElementById('vdfNote2LoanType')?.value==='daily';
    var m=document.getElementById('vdfNote2MonthsWrap'), d=document.getElementById('vdfNote2DaysWrap');
    if(m)m.style.display=daily?'none':'block'; if(d)d.style.display=daily?'block':'none';
}
function vdfNote2Calculate(){
    var amountEl=document.getElementById('vdfInterestAmount');
    var amount=Math.max(0,Number(amountEl?.value||0));
    var received=Math.max(0,Number(document.getElementById('vdfNote2Paid')?.value||0));
    var isPart=document.getElementById('vdfNote2Type')?.value==='part';
    var daily=document.getElementById('vdfNote2LoanType')?.value==='daily';
    var units=daily?Math.max(1,Math.min(15,Number(document.getElementById('vdfNote2Days')?.value||1))):Math.max(1,Number(document.getElementById('vdfNote2Months')?.value||1));
    var interest=0,total=0;

    if(!isPart && !daily && amountEl && amountEl.dataset.principal!==''){
        // MONTH EXTENSION = simple/flat extension. Never calculate interest on
        // principal + old interest + fee. Example: ₹2,000 + ₹700 = ₹2,700;
        // one more month => interest ₹1,400 and total ₹3,400 (fee handled separately).
        var principal=Math.max(0,Number(amountEl.dataset.principal||0));
        var currentInterest=Math.max(0,Number(amountEl.dataset.currentInterest||0));
        var fee=Math.max(0,Number(amountEl.dataset.platformFee||0));
        var originalMonthlyInterest=Math.max(0,Number(amountEl.dataset.originalMonthlyInterest||0));
        interest=Math.round((currentInterest+(originalMonthlyInterest*units))*100)/100;
        total=Math.round((principal+interest+fee)*100)/100;
    } else {
        // Part payment and day-wise records keep their existing balance-based logic.
        var base=isPart?Math.max(0,amount-received):amount;
        interest=daily?(base/1000)*88*units:base*0.31*units;
        interest=Math.round(interest*100)/100;
        total=Math.round((base+interest)*100)/100;
    }
    var ie=document.getElementById('vdfInterestInterest'), te=document.getElementById('vdfInterestTotal');
    if(ie)ie.value=interest.toFixed(2); if(te)te.value=total.toFixed(2);
}
function addVdfNote2Record(){
    var c=document.getElementById('vdfInterestCustomer'), l=document.getElementById('vdfInterestLoan');
    var name=document.getElementById('vdfInterestName').value.trim(), amount=Number(document.getElementById('vdfInterestAmount').value||0);
    if(!name||!amount||!c||c.value===''||!l||l.value===''){alert('Select customer + loan and enter full amount.');return;}
    vdfNote2Calculate();
    var data=getVdfInterestBookData(), rows=data[2].rows;
    var row={id:vdfInterestEditId||('IR-'+Date.now()),name:name,loanNumber:Number(l.value)+1,type:document.getElementById('vdfNote2Type').value,loanType:document.getElementById('vdfNote2LoanType').value,date:document.getElementById('vdfInterestDate').value,amount:amount,paid:Number(document.getElementById('vdfNote2Paid').value||0),interest:Number(document.getElementById('vdfInterestInterest').value||0),total:Number(document.getElementById('vdfInterestTotal').value||0),due:document.getElementById('vdfInterestDue').value,months:Number(document.getElementById('vdfNote2Months')?.value||1),days:Number(document.getElementById('vdfNote2Days')?.value||1),remark:document.getElementById('vdfNote2Remark').value||'',principal:Number(document.getElementById('vdfInterestAmount')?.dataset.principal||0),currentInterest:Number(document.getElementById('vdfInterestAmount')?.dataset.currentInterest||0),platformFee:Number(document.getElementById('vdfInterestAmount')?.dataset.platformFee||0),originalMonthlyInterest:Number(document.getElementById('vdfInterestAmount')?.dataset.originalMonthlyInterest||0),recordStatus:(vdfInterestEditId&&rows.find(x=>x.id===vdfInterestEditId)?.recordStatus)||'Pending'};
    if(vdfInterestEditId){var i=rows.findIndex(x=>x.id===vdfInterestEditId);if(i!==-1)rows[i]=row;else rows.push(row);}else rows.push(row);
    saveVdfInterestBookData(data); clearVdfNote2Form(); renderVdfInterestRows();
}
function clearVdfNote2Form(){
    if(vdfInterestPage!==2)return;
    vdfInterestEditId='';
    ['vdfInterestName','vdfInterestAmount','vdfInterestInterest','vdfInterestTotal','vdfInterestDue','vdfInterestDate','vdfNote2Remark'].forEach(id=>{var e=document.getElementById(id);if(e)e.value='';});
    var p=document.getElementById('vdfNote2Paid');if(p)p.value='0'; var c=document.getElementById('vdfInterestCustomer');if(c)c.value=''; var l=document.getElementById('vdfInterestLoan');if(l)l.innerHTML='<option value="">Select loan</option>';
    var ae=document.getElementById('vdfInterestAmount');if(ae){delete ae.dataset.principal;delete ae.dataset.currentInterest;delete ae.dataset.platformFee;delete ae.dataset.originalMonthlyInterest;} var b=document.getElementById('vdfInterestAddBtn');if(b)b.textContent='Save Update';
}

function vdfUpdateInterestTotals(){
    var data=getVdfInterestBookData();
    var rows=(data[vdfInterestPage]&&data[vdfInterestPage].rows)||[];
    var amountTotal=0, interestTotal=0, feeTotal=0, grandTotal=0;
    rows.forEach(function(r){
        var amount=Math.max(0,Number(r.amount)||0);
        var interest=Math.max(0,Number(r.interest)||0);
        var fee=vdfInterestPage===2 ? Math.max(0,Number(r.platformFee)||0) : Math.max(0,Number(r.fee)||0);
        var total=Math.max(0,Number(r.total)||0);
        amountTotal += amount; interestTotal += interest; feeTotal += fee; grandTotal += total;
    });
    var a=document.getElementById('vdfInterestAmountTotal');
    var i=document.getElementById('vdfInterestInterestTotal');
    var f=document.getElementById('vdfInterestFeeTotal');
    var o=document.getElementById('vdfInterestOverallTotal');
    if(a)a.textContent=money(amountTotal);
    if(i)i.textContent=money(interestTotal);
    if(f)f.textContent=money(feeTotal);
    if(o)o.textContent=money(grandTotal);
}

var vdfBaseSelectInterestPage = selectVdfInterestPage;
selectVdfInterestPage = function(page){ vdfBaseSelectInterestPage(page); vdfNote2Setup(); renderVdfInterestRows(); };
var vdfBaseRenderInterestRows = renderVdfInterestRows;
renderVdfInterestRows = function(){
    vdfUpdateInterestTotals();
    if(vdfInterestPage!==2){
        if(vdfInterestPage===1){
            var tb=document.getElementById('vdfInterestTableBody'); var table=tb&&tb.closest('table'); var th=table&&table.querySelector('thead');
            if(th) th.innerHTML='<tr><th>Person Name</th><th>Given Date</th><th>Given Amount</th><th>Interest</th><th>Platform Fee</th><th>Total Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr>';
            var rr=getVdfInterestBookData()[1].rows||[];
            if(tb) tb.innerHTML=rr.length?rr.map(function(row){return '<tr><td>'+escapeHTML(row.name||'')+'</td><td>'+escapeHTML(vdfDisplayInputDate(row.date))+'</td><td>'+money(row.amount||0)+'</td><td>'+money(row.interest||0)+'</td><td>'+money(row.fee!=null?row.fee:100)+'</td><td>'+money(row.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(row.due))+'</td><td><button type="button" class="vdf-record-status '+(vdfInterestRowStatus(row)==='Clear'?'clear':'pending')+'" onclick="toggleVdfInterestRecordStatus(\''+row.id+'\')">'+vdfInterestRowStatus(row)+'</button></td><td class="vdf-interest-actions"><button type="button" title="Edit row" aria-label="Edit row" onclick="editVdfInterestRecord(\''+row.id+'\')">✏️</button><button type="button" class="danger" onclick="deleteVdfInterestRecord(\''+row.id+'\')">Delete</button></td></tr>';}).join(''):'<tr><td colspan="9" class="vdf-interest-empty">No records in Note 1.</td></tr>';
            return;
        }
        vdfBaseRenderInterestRows();return;
    }
    var tbody=document.getElementById('vdfInterestTableBody'); if(!tbody)return;
    var rows=getVdfInterestBookData()[2].rows||[];
    tbody.innerHTML=rows.length?rows.map(function(r){return '<tr><td>'+escapeHTML(r.name||'')+'<br><small>Loan '+(r.loanNumber||1)+'</small></td><td>'+escapeHTML(r.type==='part'?'Part Payment':'Extension')+'</td><td>'+money(r.amount||0)+'</td><td>'+money(r.paid||0)+'</td><td>'+money(r.interest||0)+'</td><td>'+money(r.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.due))+'</td><td><button type="button" class="vdf-record-status '+(vdfInterestRowStatus(r)==='Clear'?'clear':'pending')+'" onclick="toggleVdfInterestRecordStatus(\''+r.id+'\')">'+vdfInterestRowStatus(r)+'</button></td><td class="vdf-interest-actions"><button type="button" title="Edit row" aria-label="Edit row" onclick="editVdfNote2Record(\''+r.id+'\')">✏️</button><button type="button" class="danger" onclick="deleteVdfInterestRecord(\''+r.id+'\')">Delete</button></td></tr>';}).join(''):'<tr><td colspan="9" class="vdf-interest-empty">No extension / part-payment records in Note 2.</td></tr>';
};
function editVdfNote2Record(id){
    var r=getVdfInterestBookData()[2].rows.find(x=>x.id===id);if(!r)return;vdfInterestEditId=id;
    document.getElementById('vdfInterestName').value=r.name||'';var ae=document.getElementById('vdfInterestAmount');ae.value=r.amount||0;ae.dataset.principal=String(r.principal||0);ae.dataset.currentInterest=String(r.currentInterest||0);ae.dataset.platformFee=String(r.platformFee||0);ae.dataset.originalMonthlyInterest=String(r.originalMonthlyInterest||0);document.getElementById('vdfNote2Type').value=r.type||'extension';document.getElementById('vdfNote2LoanType').value=r.loanType||'monthly';document.getElementById('vdfNote2Paid').value=r.paid||0;document.getElementById('vdfInterestDate').value=r.date||'';document.getElementById('vdfInterestDue').value=r.due||'';document.getElementById('vdfNote2Months').value=r.months||1;document.getElementById('vdfNote2Days').value=r.days||1;document.getElementById('vdfNote2Remark').value=r.remark||'';vdfNote2ToggleType();vdfNote2ToggleLoanType();vdfNote2Calculate();var b=document.getElementById('vdfInterestAddBtn');if(b)b.textContent='Update Record';
}


/* ================= VD PAYMENT LEDGER / RECEIPTS ================= */
function vdfPaymentReceiptId(){var d=new Date(),pad=function(n){return String(n).padStart(2,'0');};return 'VDR-'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+String(Date.now()).slice(-6);}
function vdfAddPaymentLedgerRecord(app,loan,loanIndex,data){
    if(!app||!loan||!data)return null;
    loan.paymentLedger=Array.isArray(loan.paymentLedger)?loan.paymentLedger:[];
    var rec={id:data.id||vdfPaymentReceiptId(),date:data.date||new Date().toISOString(),applicationId:String(app.id||''),customer:String(app.name||'Customer'),loanIndex:Number(loanIndex)||0,loanLabel:'Loan '+(Number(loanIndex)+1),type:String(data.type||'Payment'),previousBalance:Math.max(0,Number(data.previousBalance)||0),amountPaid:Math.max(0,Number(data.amountPaid)||0),newBalance:Math.max(0,Number(data.newBalance)||0),paymentMode:String(data.paymentMode||'Recorded by Admin')};
    var dup=loan.paymentLedger.some(function(x){return x&&x.id===rec.id;});if(!dup)loan.paymentLedger.push(rec);return rec;
}
function vdfAllPaymentLedger(){var out=[];(typeof getLoans==='function'?getLoans():[]).forEach(function(app){ensureLoanHistory(app).forEach(function(loan,idx){(Array.isArray(loan.paymentLedger)?loan.paymentLedger:[]).forEach(function(r){out.push(Object.assign({},r,{applicationId:r.applicationId||app.id,customer:r.customer||app.name,loanIndex:Number.isFinite(Number(r.loanIndex))?Number(r.loanIndex):idx,loanLabel:r.loanLabel||('Loan '+(idx+1))}));});});});return out.sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0);});}
function openVdfPaymentLedger(){if(sessionStorage.getItem('vdfAdmin')!=='true'){showPage('login');return;}var o=document.getElementById('vdfPaymentLedgerOverlay');if(o)o.style.display='flex';renderVdfPaymentLedger();}
function closeVdfPaymentLedger(){var o=document.getElementById('vdfPaymentLedgerOverlay');if(o)o.style.display='none';}
function renderVdfPaymentLedger(){var body=document.getElementById('vdfPaymentLedgerBody'),foot=document.getElementById('vdfPaymentLedgerFoot');if(!body)return;var q=String(document.getElementById('vdfPaymentLedgerSearch')?.value||'').trim().toLowerCase();var rows=vdfAllPaymentLedger().filter(function(r){return !q||[r.id,r.customer,r.applicationId,r.loanLabel,r.type].join(' ').toLowerCase().includes(q);});if(!rows.length){body.innerHTML='<tr><td colspan="10" style="padding:18px;text-align:center;color:#94a3b8;">No payment records yet</td></tr>';if(foot)foot.innerHTML='';return;}body.innerHTML=rows.map(function(r){var dt=r.date?new Date(r.date).toLocaleString('en-IN'):'—';return '<tr style="border-top:1px solid #273244;"><td style="padding:9px;color:#f4d47d;font-weight:700;">'+escapeHTML(r.id||'—')+'</td><td>'+escapeHTML(dt)+'</td><td>'+escapeHTML(r.customer||'—')+'</td><td>'+escapeHTML(r.applicationId||'—')+'</td><td>'+escapeHTML(r.loanLabel||'—')+'</td><td>'+escapeHTML(r.type||'Payment')+'</td><td>'+money(r.previousBalance||0)+'</td><td style="color:#86efac;font-weight:800;">'+money(r.amountPaid||0)+'</td><td>'+money(r.newBalance||0)+'</td><td><button type="button" onclick="openVdfPaymentReceipt(\''+String(r.id).replace(/'/g,"\\'")+'\')">Receipt</button></td></tr>';}).join('');var paid=rows.reduce(function(a,r){return a+(Number(r.amountPaid)||0);},0);if(foot)foot.innerHTML='<tr style="border-top:2px solid #d9a928;background:#090b10;color:#f4d47d;font-weight:900;"><td colspan="7" style="padding:10px;text-align:right;">Total Collected</td><td>'+money(paid)+'</td><td colspan="2"></td></tr>';}
function openVdfPaymentReceipt(id){var r=vdfAllPaymentLedger().find(function(x){return String(x.id)===String(id);});if(!r)return;var paper=document.getElementById('vdfPaymentReceiptPaper');paper.dataset.receiptId=r.id;paper.innerHTML='<div style="text-align:center;border-bottom:2px solid #b58a18;padding-bottom:12px;"><h2 style="margin:0;">VD Finance</h2><div style="font-weight:800;margin-top:4px;">PAYMENT RECEIPT</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px;font-size:14px;"><div><b>Receipt ID</b><br>'+escapeHTML(r.id)+'</div><div><b>Date / Time</b><br>'+escapeHTML(new Date(r.date).toLocaleString('en-IN'))+'</div><div><b>Customer</b><br>'+escapeHTML(r.customer)+'</div><div><b>VD ID</b><br>'+escapeHTML(r.applicationId)+'</div><div><b>Loan</b><br>'+escapeHTML(r.loanLabel)+'</div><div><b>Payment Type</b><br>'+escapeHTML(r.type)+'</div></div><div style="margin-top:18px;border:1px solid #ddd;border-radius:10px;overflow:hidden;"><div style="display:flex;justify-content:space-between;padding:11px;border-bottom:1px solid #ddd;"><span>Previous Balance</span><b>'+money(r.previousBalance)+'</b></div><div style="display:flex;justify-content:space-between;padding:11px;border-bottom:1px solid #ddd;"><span>Amount Paid</span><b>'+money(r.amountPaid)+'</b></div><div style="display:flex;justify-content:space-between;padding:11px;"><span>New Payable / Balance</span><b>'+money(r.newBalance)+'</b></div></div><p style="margin-top:18px;font-size:12px;color:#555;">Computer-generated VD Finance payment receipt.</p>';document.getElementById('vdfPaymentReceiptOverlay').style.display='flex';}
function closeVdfPaymentReceipt(){var o=document.getElementById('vdfPaymentReceiptOverlay');if(o)o.style.display='none';}
function printVdfPaymentReceipt(){var paper=document.getElementById('vdfPaymentReceiptPaper');if(!paper)return;var w=window.open('','_blank','width=760,height=900');if(!w){alert('Please allow pop-ups to print the receipt.');return;}w.document.write('<!doctype html><html><head><title>VD Finance Receipt</title><meta charset="utf-8"></head><body>'+paper.innerHTML+'</body></html>');w.document.close();w.focus();setTimeout(function(){w.print();},250);}

/* ================= VD PART-PAYMENT / BALANCE UPDATE ================= */
function vdfCalcAdjustedInterest(balance, loan) {
    balance = Math.max(0, Number(balance) || 0);
    var period = Math.max(1, Number(loan && loan.period) || 30);
    var isDaily = period < 30;
    if (isDaily) return Number(((balance / 1000) * 69 * Math.min(15, period)).toFixed(2));
    return Number((balance * 0.31).toFixed(2));
}
function vdfFormatInputToDmy(value) {
    var p=String(value||'').split('-');
    return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : String(value||'');
}
function extensionPartPaymentTransactionBase(id, loanIndex) {
    if (sessionStorage.getItem("vdfAdmin") !== "true") { showPage("login"); return; }
    var apps=getLoans(), app=apps.find(function(x){return String(x.id)===String(id);});
    if(!app){alert('Customer not found.');return;}
    var hist=ensureLoanHistory(app), loan=hist[loanIndex];
    if(!loan){alert('Loan not found.');return;}
    var old=document.getElementById('vdfBalanceEditor'); if(old) old.remove();
    var alreadyPaid=Math.max(0,Number(loan.amountPaid||0));
    // Extension / Part Payment must start from the loan's FULL payable amount
    // (principal + interest + platform fee), not only the principal/current balance.
    var calculatedFullAmount=Math.max(0,(Number(loan.amount)||0)+(Number(loan.interest)||0)+(Number(loan.fee)||0));
    var originalFullAmount=Math.max(0,Number(loan.originalFullAmount)||calculatedFullAmount);
    // Always open Edit Full Access with the LATEST saved payable amount.
    // After a month extension/part payment, loan.total is the authoritative current amount.
    var latestSavedTotal=Number(loan.total);
    // Always sync Update Loan Balance with the live overdue amount shown elsewhere.
    // Backend may have saved part/all of the overdue fee already, so replace the
    // current-period saved fee with today's live fee instead of double-adding it.
    var liveOverdueInfo=getLoanOverdueInfo(loan);
    var liveOverdueFee=Math.max(0,Number(liveOverdueInfo&&liveOverdueInfo.fee||0));
    var savedCurrentOverdue=Math.max(0,Number(loan.overdueFeeCurrentPeriod||0));
    var savedAccruedOverdue=Math.max(0,Number(loan.overdueFeeAccrued||0));
    var historicalOverdue=Math.max(0,savedAccruedOverdue-savedCurrentOverdue);
    var baseSavedTotal=(Number.isFinite(latestSavedTotal) && latestSavedTotal >= 0)
      ? Math.max(0,latestSavedTotal)
      : (loan.balanceUpdated ? Math.max(0,Number(loan.remainingAmount)||0) : originalFullAmount);
    var currentPayable=Math.max(0,Number((baseSavedTotal-savedCurrentOverdue+liveOverdueFee).toFixed(2)));
    var overlay=document.createElement('div'); overlay.id='vdfBalanceEditor'; overlay.className='vdf-balance-editor-overlay';
    overlay.innerHTML='<div class="vdf-balance-editor"><div class="vdf-balance-editor-head"><div><h3>Update Loan Balance</h3><p>'+escapeHTML(app.name||'Customer')+' • Loan '+(loanIndex+1)+'</p></div><button type="button" onclick="document.getElementById(\'vdfBalanceEditor\').remove()">✕</button></div>'+
      '<div class="vdf-balance-summary"><span>Latest Total Amount<b id="vdfBalTotalDisplay">'+money(currentPayable)+'</b></span><span>Already Paid<b>'+money(alreadyPaid)+'</b></span></div>'+
      '<div class="vdf-balance-grid"><label>Total Amount<input id="vdfBalTotalAmount" type="number" min="0" value="'+currentPayable+'" oninput="vdfTotalAmountChanged()"></label><label>Amount Paid Now<input id="vdfBalPaidNow" type="number" min="0" max="'+currentPayable+'" value="0" oninput="vdfPreviewBalanceUpdate()"></label><label>Balance Amount<input id="vdfBalBalance" type="number" min="0" value="'+currentPayable+'" oninput="vdfPreviewBalanceUpdate(true)"></label><label>New Due Date<input id="vdfBalDue" type="date" value="'+vdfDateForInput(loan.repaymentDate||'')+'" oninput="vdfPreviewBalanceUpdate()"></label><label>Interest (Auto)<input id="vdfBalInterest" type="number" readonly></label><label>Platform Fee<input value="0" readonly></label><label>Overdue Charges<input id="vdfBalOverdue" type="number" readonly></label><label>Now Payable<input id="vdfBalNowPayable" type="number" readonly></label></div>'+
      '<div class="vdf-balance-note">Status page will show Amount Paid, Remaining Amount and Now Payable automatically.</div><div class="vdf-balance-actions"><button type="button" onclick="document.getElementById(\'vdfBalanceEditor\').remove()">Cancel</button><button type="button" class="save" onclick="vdfSaveBalanceUpdate(\''+String(id).replace(/'/g,"\\'")+'\','+loanIndex+')">Save Update</button></div></div>';
    document.body.appendChild(overlay);
    overlay.dataset.currentPayable=String(currentPayable); overlay.dataset.alreadyPaid=String(alreadyPaid);
    overlay._vdfLoan=loan;
    overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
    vdfPreviewBalanceUpdate();
}
function vdfTotalAmountChanged(){
    var o=document.getElementById('vdfBalanceEditor'); if(!o)return;
    var totalEl=document.getElementById('vdfBalTotalAmount');
    var total=Math.max(0,Number(totalEl&&totalEl.value||0));
    o.dataset.currentPayable=String(total);
    var d=document.getElementById('vdfBalTotalDisplay');if(d)d.textContent=money(total);
    vdfPreviewBalanceUpdate();
}
function vdfPreviewBalanceUpdate(balanceWasEdited){
    var o=document.getElementById('vdfBalanceEditor'); if(!o)return;
    var current=Math.max(0,Number(o.dataset.currentPayable||0));
    var paidEl=document.getElementById('vdfBalPaidNow'), balEl=document.getElementById('vdfBalBalance');
    var paid=Math.max(0,Number(paidEl.value||0)), balance=Math.max(0,Number(balEl.value||0));
    if(balanceWasEdited){ paid=Math.max(0,current-balance); paidEl.value=paid.toFixed(2); }
    else { if(paid>current){paid=current;paidEl.value=paid.toFixed(2);} balance=Math.max(0,current-paid);balEl.value=balance.toFixed(2); }
    var id=document.querySelector('#vdfBalanceEditor .vdf-balance-editor-head p').textContent;
    var interest=0;
    /* The selected loan is recovered from the open editor's temporary properties. */
    var loan=o._vdfLoan;
    if(!loan){ var period=30; loan={period:period}; }
    interest=vdfCalcAdjustedInterest(balance,loan);
    document.getElementById('vdfBalInterest').value=interest.toFixed(2);
    var liveOverdue=getLoanOverdueInfo(loan);
    var savedCurrent=Math.max(0,Number(loan.overdueFeeCurrentPeriod||0));
    var savedAccrued=Math.max(0,Number(loan.overdueFeeAccrued||0));
    var overdueAmount=Math.max(0,savedAccrued-savedCurrent)+Math.max(0,Number(liveOverdue.fee||0));
    var overdueEl=document.getElementById('vdfBalOverdue'); if(overdueEl) overdueEl.value=overdueAmount.toFixed(2);
    // current Total Amount already includes today's overdue. Do not add it a second time.
    document.getElementById('vdfBalNowPayable').value=(balance+interest).toFixed(2);
}
function vdfLoanSnapshotForUpdate(loan){var c=JSON.parse(JSON.stringify(loan||{}));delete c.balanceUpdateHistory;return c;}
function vdfSaveBalanceUpdate(id,loanIndex){
    var apps=getLoans(), app=apps.find(function(x){return String(x.id)===String(id);}); if(!app)return;
    var hist=ensureLoanHistory(app), loan=hist[loanIndex]; if(!loan)return;
    var o=document.getElementById('vdfBalanceEditor'); if(!o)return;
    var current=Math.max(0,Number(o.dataset.currentPayable||0)), previousPaid=Math.max(0,Number(o.dataset.alreadyPaid||0));
    var paidNow=Math.max(0,Number(document.getElementById('vdfBalPaidNow').value||0)), balance=Math.max(0,Number(document.getElementById('vdfBalBalance').value||0)), due=document.getElementById('vdfBalDue').value;
    if(paidNow>current+0.001){alert('Paid amount cannot be more than current payable.');return;} if(!due){alert('Please select the new due date.');return;}
    var updateHistory=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];
    var editingId=String(o.dataset.editUpdateId||'');
    var beforeSnapshot;
    if(editingId){var last=updateHistory[updateHistory.length-1];if(!last||String(last.id)!==editingId){alert('Only the latest Extension / Part Payment update can be edited safely.');return;}beforeSnapshot=last.beforeSnapshot||vdfLoanSnapshotForUpdate(loan);loan=Object.assign(loan,JSON.parse(JSON.stringify(beforeSnapshot)));loan.balanceUpdateHistory=updateHistory.slice(0,-1);updateHistory=loan.balanceUpdateHistory;previousPaid=Math.max(0,Number(last.previousPaid||0));current=Math.max(0,Number(last.currentPayable||current));}
    else beforeSnapshot=vdfLoanSnapshotForUpdate(loan);
    if(loan.originalPrincipal==null)loan.originalPrincipal=Number(loan.amount)||0;
    if(loan.originalInterest==null)loan.originalInterest=Number(loan.interest)||0;
    if(loan.originalPlatformFee==null)loan.originalPlatformFee=Number(loan.fee)||0;

    /* Exact Extension / Part Payment flow:
       1) current = the FULL payable shown when this update is opened. It already includes
          principal + old interest + old platform fee + all overdue charges up to today.
       2) subtract Amount Paid Now from that full amount.
       3) after the update, Status uses this full amount as Total Amount, then shows
          cumulative paid, remaining balance, NEW interest, platform fee 0, and only
          NEW overdue charges that accrue after the newly selected due date.
       This prevents the old overdue amount from being added twice. */
    loan.originalFullAmount=Number(current.toFixed(2));
    var interest=vdfCalcAdjustedInterest(balance,loan);
    var nowPayable=Number((balance+interest).toFixed(2));

    // Old overdue is already folded into originalFullAmount/current. Reset the overdue
    // period because a new due date is being saved. Future overdue starts after that date.
    loan.overdueFeeAccrued=0;
    loan.overdueFeeCurrentPeriod=0;
    loan.lastOverdueFeeDate='';
    loan.overdueFeeHistory=[];

    var isPartPayment = paidNow > 0;
    loan.amountPaid=Number((previousPaid+paidNow).toFixed(2));
    loan.remainingAmount=balance;
    loan.repaymentDate=vdfFormatInputToDmy(due);
    loan.balanceUpdated=true;
    if (isPartPayment) {
        loan.adjustedInterest=interest; loan.interest=interest; loan.fee=0; loan.total=nowPayable;
    } else {
        // Extension only: keep normal-loan structure and keep platform fee.
        var originalMonthlyInterest=Math.max(0,Number(loan.originalInterest!=null?loan.originalInterest:loan.interest)||0);
        loan.extensionCount=Math.max(0,Number(loan.extensionCount||0))+1;
        loan.interest=Number((Math.max(0,Number(loan.interest)||0)+originalMonthlyInterest).toFixed(2));
        loan.adjustedInterest=0;
        loan.fee=Math.max(0,Number(loan.originalPlatformFee!=null?loan.originalPlatformFee:loan.fee)||0);
        loan.total=Number((Math.max(0,Number(loan.amount)||0)+loan.interest+loan.fee).toFixed(2));
        loan.amountPaid=0; loan.remainingAmount=0;
    }
    loan.lastPaymentAmount=paidNow;
    loan.lastPaymentDate=new Date().toISOString();
    if(balance<=0.001){loan.remainingAmount=0;loan.interest=0;loan.total=0;loan.status='Amount Cleared';loan.clearedAt=new Date().toISOString();}
    var oldOverdueInfo=getLoanOverdueInfo(beforeSnapshot||{});var rec={id:editingId||('UPD-'+Date.now()),createdAt:new Date().toISOString(),type:isPartPayment?'Part Payment':'Extension',currentPayable:current,totalAmount:current,previousPaid:previousPaid,paidNow:paidNow,balance:loan.remainingAmount,newInterest:loan.interest,platformFee:isPartPayment?0:loan.fee,overdueDaysAtUpdate:Number(oldOverdueInfo.days||0),overdueIncludedAtUpdate:Number(oldOverdueInfo.fee||0),dueInput:due,dueDate:loan.repaymentDate,nowPayable:loan.total,beforeSnapshot:beforeSnapshot};
    updateHistory.push(rec);loan.balanceUpdateHistory=updateHistory;
    if(isPartPayment && paidNow>0){vdfAddPaymentLedgerRecord(app,loan,loanIndex,{id:'PAY-'+rec.id,date:rec.createdAt,type:(balance<=0.001?'Full Payment':'Part Payment'),previousBalance:current,amountPaid:paidNow,newBalance:loan.total,paymentMode:'Admin Part Payment'});}
    hist[loanIndex]=loan;app.loanHistory=hist;var latest=hist[hist.length-1];app.amount=latest.amount;app.period=latest.period;app.interest=latest.interest;app.fee=latest.fee;app.total=latest.total;app.repaymentDate=latest.repaymentDate;app.status=latest.status;app.userAccess=hist.some(function(x){return String(x.status||'').toLowerCase()!=='amount cleared';});
    saveLoans(apps);var syncPromise=syncToGoogleSheet('update',app);Promise.resolve(syncPromise).then(function(){sendVDFLoanUpdateEmail(app,loan,loanIndex,rec);}).catch(function(e){console.warn('Loan update email skipped after sync error:',e);});loadAdminApplications(false);o.remove();showCustomerLoanEditor(id,'extension');alert('Loan '+(loanIndex+1)+' update saved. Paid: '+money(loan.amountPaid)+' | Balance: '+money(loan.remainingAmount)+' | Now Payable: '+money(loan.total));
}
function editLatestLoanBalanceUpdate(id,loanIndex){
    var apps=getLoans(),app=apps.find(function(x){return String(x.id)===String(id);});if(!app)return;var loan=ensureLoanHistory(app)[loanIndex];if(!loan)return;var h=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];var r=h[h.length-1];if(!r){alert('No saved Extension / Part Payment update is available to edit yet.');return;}
    extensionPartPaymentTransaction(id,loanIndex);var o=document.getElementById('vdfBalanceEditor');if(!o)return;o.dataset.editUpdateId=r.id;o.dataset.currentPayable=String(r.currentPayable||0);o.dataset.alreadyPaid=String(r.previousPaid||0);var te=document.getElementById('vdfBalTotalAmount');if(te)te.value=Number(r.currentPayable||0).toFixed(2);var td=document.getElementById('vdfBalTotalDisplay');if(td)td.textContent=money(Number(r.currentPayable||0));document.getElementById('vdfBalPaidNow').value=Number(r.paidNow||0).toFixed(2);document.getElementById('vdfBalDue').value=r.dueInput||vdfDateForInput(r.dueDate||'');var title=o.querySelector('h3');if(title)title.textContent='Edit Latest Extension / Part Payment';var save=o.querySelector('.vdf-balance-actions .save');if(save)save.textContent='Update Correction';vdfPreviewBalanceUpdate();
}
function deleteLatestLoanBalanceUpdate(id,loanIndex){
    var apps=getLoans(),app=apps.find(function(x){return String(x.id)===String(id);});if(!app)return;var hist=ensureLoanHistory(app),loan=hist[loanIndex];if(!loan)return;var h=Array.isArray(loan.balanceUpdateHistory)?loan.balanceUpdateHistory:[];var r=h[h.length-1];if(!r||!r.beforeSnapshot){alert('No saved Extension / Part Payment update is available to delete yet.');return;}if(!confirm('Delete the latest '+(r.type||'Extension / Part Payment')+' update for Loan '+(loanIndex+1)+'?\n\nThe loan will return to the values it had before this update.'))return;
    var restored=JSON.parse(JSON.stringify(r.beforeSnapshot));restored.balanceUpdateHistory=h.slice(0,-1);hist[loanIndex]=restored;app.loanHistory=hist;var latest=hist[hist.length-1];app.amount=latest.amount;app.period=latest.period;app.interest=latest.interest;app.fee=latest.fee;app.total=latest.total;app.repaymentDate=latest.repaymentDate;app.status=latest.status;app.userAccess=hist.some(function(x){return String(x.status||'').toLowerCase()!=='amount cleared';});saveLoans(apps);syncToGoogleSheet('update',app);loadAdminApplications(false);showCustomerLoanEditor(id,'extension');alert('Latest update deleted and previous loan values restored.');
}

/* Attach the exact selected loan to the balance editor after it opens. */
function extensionPartPaymentTransaction(id,loanIndex){
    extensionPartPaymentTransactionBase(id,loanIndex);
    var o=document.getElementById('vdfBalanceEditor'), apps=getLoans(), app=apps.find(function(x){return String(x.id)===String(id);});
    if(o&&app){o._vdfLoan=ensureLoanHistory(app)[loanIndex];vdfPreviewBalanceUpdate();}
};

function vdfInterestRowStatus(row){return String(row&&row.recordStatus||'Pending')==='Clear'?'Clear':'Amount Pending';}
function toggleVdfInterestRecordStatus(id){
    if(vdfInterestPage!==1&&vdfInterestPage!==2)return;
    var data=getVdfInterestBookData(), row=data[vdfInterestPage].rows.find(function(x){return x.id===id;}); if(!row)return;
    row.recordStatus=vdfInterestRowStatus(row)==='Clear'?'Pending':'Clear'; saveVdfInterestBookData(data); renderVdfInterestRows();
}
