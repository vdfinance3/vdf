
/* ===== FINAL FIX: Note 1/2 bottom Overall Total rows + print totals ===== */
(function(){
  function sum(rows,key,feeFallback){
    return rows.reduce(function(t,r){
      var v = r && r[key];
      if (key === 'fee' && (v === undefined || v === null || v === '')) v = feeFallback || 0;
      return t + Math.max(0, Number(v) || 0);
    },0);
  }
  function overallRowNote1(rows){
    return '<tr class="vdf-overall-total-row" style="font-weight:900;background:#17120a;color:#f4d47d;">'+
      '<td colspan="2">Overall Total</td>'+
      '<td>'+money(sum(rows,'amount'))+'</td>'+
      '<td>'+money(sum(rows,'interest'))+'</td>'+
      '<td>'+money(sum(rows,'fee',100))+'</td>'+
      '<td>'+money(sum(rows,'total'))+'</td>'+
      '<td>—</td><td>—</td><td>—</td></tr>';
  }
  function overallRowNote2(rows){
    return '<tr class="vdf-overall-total-row" style="font-weight:900;background:#17120a;color:#f4d47d;">'+
      '<td colspan="2">Overall Total</td>'+
      '<td>'+money(sum(rows,'amount'))+'</td>'+
      '<td>'+money(sum(rows,'paid'))+'</td>'+
      '<td>'+money(sum(rows,'interest'))+'</td>'+
      '<td>'+money(sum(rows,'total'))+'</td>'+
      '<td>—</td><td>—</td><td>—</td></tr>';
  }
  var previousRender = renderVdfInterestRows;
  renderVdfInterestRows = function(){
    previousRender();
    if (vdfInterestPage !== 1 && vdfInterestPage !== 2) return;
    var tbody=document.getElementById('vdfInterestTableBody');
    if(!tbody) return;
    var rows=(getVdfInterestBookData()[vdfInterestPage].rows||[]);
    if(!rows.length) return;
    tbody.insertAdjacentHTML('beforeend', vdfInterestPage===1 ? overallRowNote1(rows) : overallRowNote2(rows));
  };

  printVdfInterestBook = function(){
    saveVdfInterestNote(false);
    var page=vdfInterestPage, data=getVdfInterestBookData()[page], rows=data.rows||[];
    var generated=new Date().toLocaleString('en-IN');
    var head='', body='', foot='';
    if(page===2){
      head='<tr><th>Person Name</th><th>Type</th><th>Amount</th><th>Amount Paid</th><th>Interest</th><th>Total</th><th>Due Date</th></tr>';
      body=rows.map(function(r){return '<tr><td>'+escapeHTML(r.name||'')+'</td><td>'+escapeHTML(r.type==='part'?'Part Payment':'Extension')+'</td><td>'+money(r.amount||0)+'</td><td>'+money(r.paid||0)+'</td><td>'+money(r.interest||0)+'</td><td>'+money(r.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.due))+'</td></tr>';}).join('');
      foot='<tr class="overall"><td colspan="2">Overall Total</td><td>'+money(sum(rows,'amount'))+'</td><td>'+money(sum(rows,'paid'))+'</td><td>'+money(sum(rows,'interest'))+'</td><td>'+money(sum(rows,'total'))+'</td><td>—</td></tr>';
    }else{
      head='<tr><th>Person Name</th><th>Given Date</th><th>Given Amount</th><th>Interest</th><th>Platform Fee</th><th>Total Amount</th><th>Due Date</th></tr>';
      body=rows.map(function(r){return '<tr><td>'+escapeHTML(r.name||'')+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.date))+'</td><td>'+money(r.amount||0)+'</td><td>'+money(r.interest||0)+'</td><td>'+money(r.fee!=null?r.fee:100)+'</td><td>'+money(r.total||0)+'</td><td>'+escapeHTML(vdfDisplayInputDate(r.due))+'</td></tr>';}).join('');
      foot='<tr class="overall"><td colspan="2">Overall Total</td><td>'+money(sum(rows,'amount'))+'</td><td>'+money(sum(rows,'interest'))+'</td><td>'+money(sum(rows,'fee',100))+'</td><td>'+money(sum(rows,'total'))+'</td><td>—</td></tr>';
    }
    var html='<!doctype html><html><head><title>VD Finance Interest Records</title></head><body><h1>VD Finance – Interest Records</h1><p><b>Note '+page+'</b></p><p>Generated: '+escapeHTML(generated)+'</p><div class="note">'+escapeHTML(data.note||'No note')+'</div><table><thead>'+head+'</thead><tbody>'+body+foot+'</tbody></table></body></html>';
    var w=window.open('','_blank'); if(!w){alert('Please allow popups to print.');return;} w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(function(){w.print();},250);
  };

  downloadVdfInterestPDF = function(){
    saveVdfInterestNote(false);
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('PDF library is not available.'); return; }
    var page=vdfInterestPage, data=getVdfInterestBookData()[page], rows=data.rows||[];
    var jsPDF=window.jspdf.jsPDF;
    var doc=new jsPDF({unit:'mm',format:'a4'});
    var y=18;
    doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.text('VD Finance - Interest Records',14,y); y+=8;
    doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.text('Note '+page+' | Generated: '+new Date().toLocaleString('en-IN'),14,y); y+=8;
    var noteLines=doc.splitTextToSize(data.note||'No note',180); doc.text(noteLines,14,y); y+=noteLines.length*5+6;

    var headers, widths;
    if(page===2){
      headers=['Name','Type','Amount','Paid','Interest','Total','Due Date'];
      widths=[34,27,25,23,24,25,26];
    }else{
      headers=['Name','Given Date','Given Amount','Interest','Platform Fee','Total Amount','Due Date'];
      widths=[31,25,27,23,25,27,26];
    }
    function drawHeader(){
      doc.setFont('helvetica','bold'); doc.setFontSize(7.5); var x=13;
      headers.forEach(function(h,i){doc.rect(x,y,widths[i],8);doc.text(h,x+1.5,y+5,{maxWidth:widths[i]-3});x+=widths[i];});
      y+=8; doc.setFont('helvetica','normal');
    }
    function drawRow(vals,bold){
      if(y>278){doc.addPage();y=18;drawHeader();}
      doc.setFont('helvetica',bold?'bold':'normal'); doc.setFontSize(7.5); var x=13;
      vals.forEach(function(v,i){doc.rect(x,y,widths[i],8);doc.text(String(v==null?'':v).slice(0,30),x+1.5,y+5,{maxWidth:widths[i]-3});x+=widths[i];});
      y+=8;
    }
    drawHeader();
    rows.forEach(function(r){
      if(page===2){
        drawRow([r.name||'',r.type==='part'?'Part Payment':'Extension',money(r.amount||0),money(r.paid||0),money(r.interest||0),money(r.total||0),vdfDisplayInputDate(r.due)],false);
      }else{
        drawRow([r.name||'',vdfDisplayInputDate(r.date),money(r.amount||0),money(r.interest||0),money(r.fee!=null?r.fee:100),money(r.total||0),vdfDisplayInputDate(r.due)],false);
      }
    });
    if(rows.length){
      if(page===2){
        drawRow(['Overall Total','',money(sum(rows,'amount')),money(sum(rows,'paid')),money(sum(rows,'interest')),money(sum(rows,'total')),''],true);
      }else{
        drawRow(['Overall Total','',money(sum(rows,'amount')),money(sum(rows,'interest')),money(sum(rows,'fee',100)),money(sum(rows,'total')),''],true);
      }
    }
    doc.save('VD_Finance_Interest_Records_Note_'+page+'.pdf');
  };
})();
