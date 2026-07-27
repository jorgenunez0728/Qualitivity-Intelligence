// ===== KPI METRICS DASHBOARD (Official Qualitivity KPIs) =====
// Valores transcritos del reporte oficial "Qualitivity Claim Trend" (PowerBI),
// corte 2026-07-27 1:12 (ver tests/golden/report_0727.json). Los meses sin
// valor confirmado no aparecen aquí: la tabla muestra '—'/0 en vez de
// inventar una cifra, según el criterio del proyecto de no calcular una tasa
// con una base incompleta.
let KPI_MONTHLY_SALES={}; // Loaded from data.monthly_sales (DB Sales DC sheet)
const KPI_SALES={
  // Ventas mensuales de vehículos (cohorte "Sales" de las tablas 3M/DC del reporte oficial)
  '2026-01':22353,'2026-02':22313,'2026-03':27050,'2026-04':22323,
  '2026-05':21131,'2026-06':22768,'2026-07':21950
};
const KPI_TARGETS={DC:13.0,
  '3M_2026-01':116.7,'3M_2026-02':111.3,'3M_2026-03':106.0,'3M_2026-04':100.7,
  '3M_2026-05':95.3,'3M_2026-06':90.0,'3M':100.0,
  '12M_2026-05':48.1,'12M_2026-06':46.5,'12M_2026-07':45.6,'12M':45.6};
const KPI_12M_SALES={'2026-05':282649,'2026-06':285541,'2026-07':272197};
const KPI_DC_FORECAST=20;
const KPI_12M_FORECAST=53;

// Subíndice con el intervalo de Wilson (95%) del Index, en un <span> chico
// con tooltip. n suele ser grande (decenas/cientos de miles de ventas), así
// que el intervalo típicamente es angosto — pero mostrarlo evita presentar
// el Index como si fuera una cifra exacta sin margen de error, sobre todo en
// los meses de pocas ventas (DC).
function _idxCITag(claims,sales){
  if(!sales)return'';
  const{lo,hi}=wilsonInterval(claims,sales);
  const loIdx=(lo*10000).toFixed(1),hiIdx=(hi*10000).toFixed(1);
  return`<span style="font-size:8px;color:var(--tx3);display:block;font-weight:400" title="Intervalo de Wilson 95% (n=${fN(sales)} ventas)">±[${loIdx}, ${hiIdx}]</span>`;
}

function genKPIMetrics(I){
  let h='';

  // ===== DC Claim Trend =====
  h+=`<p><b>📊 DC Claim Trend — KMX W2P</b></p>`;
  const dcDataAll=D['DC']||[];
  // DC groups by retailSalesMonth (month name → YYYY-MM key)
  const _moNameToKey={'January':'2026-01','February':'2026-02','March':'2026-03','April':'2026-04',
    'May':'2026-05','June':'2026-06','July':'2026-07','August':'2026-08','September':'2025-09',
    'October':'2025-10','November':'2025-11','December':'2025-12'};
  const _moNameToResult={}; // retailSalesMonth → resultMonth mapping
  const dcByM={};
  // Only count DC records that have a retailSalesMonth (confirmed claims)
  const dcData=dcDataAll.filter(r=>r.retailSalesMonth&&r.retailSalesMonth!=='None');
  dcData.forEach(r=>{
    const mName=r.retailSalesMonth;
    const m=_moNameToKey[mName]||mName;
    if(!dcByM[m])dcByM[m]={claims:0};
    dcByM[m].claims+=(r.claims||1);
    if(r.resultMonth)_moNameToResult[m]=_moNameToKey[r.resultMonth]||r.resultMonth;
  });
  const dcMonths=Object.keys(dcByM).sort();
  h+='<div class="cb"><div class="ct">DC Claim Trend — Overall</div>';
  h+='<div class="tw"><table><thead><tr><th></th>';
  const _mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  dcMonths.forEach(m=>{
    const ms=m.replace(/^(\d{4})-(\d{2})$/,(a,y,mo)=>_mn[+mo]+"'"+y.slice(2));
    const rm=_moNameToResult[m]||nextMo(m);
    const rms=rm.replace(/^(\d{4})-(\d{2})$/,(a,y,mo)=>_mn[+mo]+"'"+y.slice(2));
    h+=`<th style="text-align:center"><div style="font-size:10px;color:var(--tx3)">Sales</div>${ms}<div style="font-size:10px;color:var(--tx3)">Result</div>${rms}</th>`;
  });
  h+='</tr></thead><tbody>';
  // Index row
  h+='<tr><td style="font-weight:700">Index</td>';
  dcMonths.forEach(m=>{
    const cl=dcByM[m]?dcByM[m].claims:0;
    const sl=KPI_MONTHLY_SALES[m]||KPI_SALES[m]||0;
    const idx=sl>0?(cl/sl*10000).toFixed(1):'—';
    const tgt=KPI_TARGETS.DC;
    const color=parseFloat(idx)>tgt?'var(--rd)':'var(--gn)';
    h+=`<td style="text-align:center;font-weight:700;color:${color}">${idx}${_idxCITag(cl,sl)}</td>`;
  });
  h+='</tr>';
  // Sales row
  h+='<tr><td>Sales</td>';
  dcMonths.forEach(m=>{h+=`<td style="text-align:center">${fN(KPI_MONTHLY_SALES[m]||KPI_SALES[m]||0)}</td>`;});
  h+='</tr>';
  // Claims row
  h+='<tr><td>Claims</td>';
  dcMonths.forEach(m=>{h+=`<td style="text-align:center;font-weight:700;color:var(--ac)">${fN(dcByM[m]?dcByM[m].claims:0)}</td>`;});
  h+='</tr>';
  // Target row
  h+='<tr><td>Target</td>';
  dcMonths.forEach(m=>{h+=`<td style="text-align:center;color:var(--tx3)">${KPI_TARGETS.DC.toFixed(1)}</td>`;});
  h+='</tr>';
  // Forecast row
  h+='<tr><td>Forecast</td>';
  dcMonths.forEach((m,i)=>{h+=`<td style="text-align:center;color:var(--yl)">${i>=dcMonths.length-2?KPI_DC_FORECAST:'—'}</td>`;});
  h+='</tr>';
  h+='</tbody></table></div></div>';

  // DC Top Issues (use retailSalesMonth for grouping)
  const dcTopData=dcData.map(r=>({...r,_kpiMonth:_moNameToKey[r.retailSalesMonth]||r.retailSalesMonth}));
  h+=mkTopIssues(dcTopData,'_kpiMonth',dcMonths,'DC Top Issues');

  // ===== 3M Claim Trend =====
  h+=`<p style="margin-top:16px"><b>📈 3M Claim Trend — Overall</b></p>`;
  const tmData=D['3M']||[];
  const tmByM={};
  tmData.forEach(r=>{const m=r.salesMonth;if(!m)return;if(!tmByM[m])tmByM[m]={claims:0};tmByM[m].claims+=(r.claims||1);});
  const tmMonths=Object.keys(tmByM).sort();
  h+='<div class="cb"><div class="ct">3M Claim Trend — Overall</div>';
  h+='<div class="tw"><table><thead><tr><th></th>';
  tmMonths.forEach(m=>{
    const ms=m.replace(/^(\d{4})-(\d{2})$/,(a,y,mo)=>{const mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mn[+mo]+"'"+y.slice(2);});
    const rm=addMo(m,3);
    const rms=rm.replace(/^(\d{4})-(\d{2})$/,(a,y,mo)=>{const mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return mn[+mo]+"'"+y.slice(2);});
    h+=`<th style="text-align:center"><div style="font-size:10px;color:var(--tx3)">Sales</div>${ms}<div style="font-size:10px;color:var(--tx3)">Result</div>${rms}</th>`;
  });
  h+='</tr></thead><tbody>';
  // Index
  h+='<tr><td style="font-weight:700">Index</td>';
  tmMonths.forEach(m=>{
    const cl=tmByM[m]?tmByM[m].claims:0;
    const sl=KPI_SALES[m]||0;
    const idx=sl>0?(cl/sl*10000).toFixed(1):'—';
    const tgt=KPI_TARGETS['3M_'+m]||KPI_TARGETS['3M'];
    const color=parseFloat(idx)>(tgt||100)?'var(--rd)':'var(--gn)';
    h+=`<td style="text-align:center;font-weight:700;color:${color}">${idx}${_idxCITag(cl,sl)}</td>`;
  });
  h+='</tr>';
  // Sales
  h+='<tr><td>Sales</td>';
  tmMonths.forEach(m=>{h+=`<td style="text-align:center">${fN(KPI_SALES[m]||0)}</td>`;});
  h+='</tr>';
  // Claims
  h+='<tr><td>Claims</td>';
  tmMonths.forEach(m=>{h+=`<td style="text-align:center;font-weight:700;color:var(--ac)">${fN(tmByM[m]?tmByM[m].claims:0)}</td>`;});
  h+='</tr>';
  // Target
  h+='<tr><td>Target</td>';
  tmMonths.forEach(m=>{const t=KPI_TARGETS['3M_'+m]||KPI_TARGETS['3M'];h+=`<td style="text-align:center;color:var(--tx3)">${t?t.toFixed(1):'—'}</td>`;});
  h+='</tr>';
  h+='</tbody></table></div></div>';

  // 3M Top Issues
  h+=mkTopIssues(tmData,'salesMonth',tmMonths,'3M Top Issues');

  // ===== WM (12M) Claim Trend =====
  h+=`<p style="margin-top:16px"><b>📉 WM (12M) Claim Trend — Overall</b></p>`;
  const wmDataAll=D['12M']||[];
  // Get unique confMonths
  const wmConfMonths=[...new Set(wmDataAll.map(r=>r.confMonth).filter(Boolean))].sort();
  // For each confMonth, count claims where salesMonth is within 12 months of confMonth
  const wmByM={};
  function moNum(m){return m?+m.slice(0,4)*12+(+m.slice(5,7)):0;}
  wmConfMonths.forEach(cm=>{
    const cmN=moNum(cm);
    let claims=0;
    wmDataAll.forEach(r=>{
      if(r.confMonth!==cm)return;
      const smN=moNum(r.salesMonth);
      if(smN>0&&cmN-smN>=0&&cmN-smN<=12)claims+=(r.claims||1);
    });
    wmByM[cm]={claims};
  });
  const wmMonths=wmConfMonths;
  // Also prepare filtered data for top issues (only claims within 12m window)
  const wmData=wmDataAll.filter(r=>{
    if(!r.confMonth||!r.salesMonth)return false;
    const d=moNum(r.confMonth)-moNum(r.salesMonth);
    return d>=0&&d<=12;
  });
  h+='<div class="cb"><div class="ct">WM (12M) Claim Trend — Overall</div>';
  h+='<div class="tw"><table><thead><tr><th></th>';
  wmMonths.forEach(m=>{
    const y=+m.slice(0,4);const mo=+m.slice(5,7);
    const mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const startY=y-1;
    const ms=mn[mo]+"'"+(startY%100).toString().padStart(2,'0')+'-'+mn[mo]+"'"+(y%100).toString().padStart(2,'0');
    const rms=mn[mo]+"'"+(y%100).toString().padStart(2,'0');
    h+=`<th style="text-align:center"><div style="font-size:10px;color:var(--tx3)">Sales</div>${ms}<div style="font-size:10px;color:var(--tx3)">Result</div>${rms}</th>`;
  });
  h+='</tr></thead><tbody>';
  // Index
  h+='<tr><td style="font-weight:700">Index</td>';
  wmMonths.forEach(m=>{
    const cl=wmByM[m]?wmByM[m].claims:0;
    const sl=KPI_12M_SALES[m]||0;
    const idx=sl>0?(cl/sl*10000).toFixed(1):'—';
    const tgt=KPI_TARGETS['12M_'+m]||KPI_TARGETS['12M'];
    const color=parseFloat(idx)>(tgt||50)?'var(--rd)':'var(--gn)';
    h+=`<td style="text-align:center;font-weight:700;color:${color}">${idx}${_idxCITag(cl,sl)}</td>`;
  });
  h+='</tr>';
  // Sales
  h+='<tr><td>Sales</td>';
  wmMonths.forEach(m=>{h+=`<td style="text-align:center">${fN(KPI_12M_SALES[m]||0)}</td>`;});
  h+='</tr>';
  // Claims
  h+='<tr><td>Claims</td>';
  wmMonths.forEach(m=>{h+=`<td style="text-align:center;font-weight:700;color:var(--ac)">${fN(wmByM[m]?wmByM[m].claims:0)}</td>`;});
  h+='</tr>';
  // Target
  h+='<tr><td>Target</td>';
  wmMonths.forEach(m=>{const t=KPI_TARGETS['12M_'+m]||KPI_TARGETS['12M'];h+=`<td style="text-align:center;color:var(--tx3)">${t?t.toFixed(1):'—'}</td>`;});
  h+='</tr>';
  // Forecast
  h+='<tr><td>Forecast</td>';
  wmMonths.forEach((m,i)=>{h+=`<td style="text-align:center;color:var(--yl)">${i===wmMonths.length-1?KPI_12M_FORECAST:'—'}</td>`;});
  h+='</tr>';
  h+='</tbody></table></div></div>';

  // 12M Top Issues
  h+=mkTopIssues(wmData,'confMonth',wmMonths,'WM (12M) Top Issues');

  h+=`<div style="font-size:10px;color:var(--tx3);margin-top:12px;padding:8px 10px;background:var(--sf2);border-radius:6px;line-height:1.6">
    <b>Sobre estas cifras:</b>
    Claims se cuenta directamente de los CSV/zip 0727 (bloque A) y está verificado exacto
    contra el reporte oficial para 3M (2026-04..06) y 12WM (May/Jun/Jul'26: 1,318/1,752/1,059).
    Sales (KPI_SALES / KPI_12M_SALES) está <b>transcrito del reporte oficial</b>, no derivado del
    CSV de ventas — ese export sólo cubre 2026-05..07 y excluye BDM, insuficiente para
    reconstruir las ventanas de 3 y 12 meses. El rango ±[…] bajo cada Index es el
    intervalo de Wilson al 95% dado ese tamaño de muestra, no un margen de error del dato en sí.
    DC mantiene una diferencia pequeña sin explicar (~+3/+1/0 claims vs. el reporte).
    36WM no está implementado: la regla de 12WM extendida a 36 meses no reproduce el dato oficial.
  </div>`;
  h+=`<span class="st">KPI Metrics · DC: ${fN(dcData.length)} · 3M: ${fN(tmData.length)} · 12M: ${fN(wmData.length)} claims</span>`;
  return h;
}

function nextMo(m){const y=+m.slice(0,4);const mo=+m.slice(5,7);return mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`;}
function addMo(m,n){let y=+m.slice(0,4);let mo=+m.slice(5,7)+n;while(mo>12){mo-=12;y++;}return`${y}-${String(mo).padStart(2,'0')}`;}

function mkTopIssues(data,monthField,months,title){
  // Group by proj+partNM and month
  const g={};
  data.forEach(r=>{
    const k=(r.proj||'?')+'|'+(r.partNM||'?');
    const m=r[monthField]||'?';
    if(!months.includes(m))return;
    if(!g[k])g[k]={proj:r.proj||'?',part:r.partNM||'?',total:0,byM:{}};
    g[k].byM[m]=(g[k].byM[m]||0)+(r.claims||1);
    g[k].total+=(r.claims||1);
  });
  const items=Object.values(g).sort((a,b)=>b.total-a.total).slice(0,25);
  if(!items.length)return'';
  const mn=['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h='<div class="cb"><div class="ct">'+esc(title)+' — Top Issues</div>';
  h+='<div class="tw" style="max-height:350px"><table><thead><tr><th>Model</th><th>Part Name</th>';
  months.forEach(m=>{
    const lab=m.replace(/^(\d{4})-(\d{2})$/,(a,y,mo)=>mn[+mo]+"'"+(+y%100).toString().padStart(2,'0'));
    h+=`<th style="text-align:center">${lab}</th>`;
  });
  h+='<th style="text-align:center;font-weight:700;color:var(--ac)">Total</th></tr></thead><tbody>';
  items.forEach(it=>{
    h+=`<tr><td style="font-weight:600">${esc(it.proj)}</td><td>${esc(tr(it.part,30))}</td>`;
    months.forEach(m=>{
      const v=it.byM[m]||0;
      h+=`<td style="text-align:center">${v||''}</td>`;
    });
    const isHigh=it.total>=items[0].total*0.7;
    h+=`<td style="text-align:center;font-weight:700;${isHigh?'color:var(--rd);background:rgba(248,113,113,.12)':''}">${it.total}</td></tr>`;
  });
  h+='</tbody></table></div></div>';
  return h;
}

