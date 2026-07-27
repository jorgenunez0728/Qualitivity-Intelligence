// ===== RESPONSE GENERATORS =====
function genRanking(I){
  const data=flt(gDS(),I.filters);
  const items=ag(data,I.groupBy,I.metric).slice(0,I.limit);
  if(!items.length)return'<p>No claims found. / Sin resultados.</p>';
  const mL=I.metric==='cost'?'Cost (USD)':I.metric==='mileage'?'Avg Mileage':'Claims';
  const fd=fdsc(I.filters);const tot=data.length;
  let h=`<p><b>Top ${items.length} by ${I.groupBy}</b> — ${mL}${fd?' | '+fd:''} | ${dsl()} (${fN(tot)} claims)</p>`;
  if(I.viz==='pareto')h+=mkPareto(items,mL);
  else if(I.viz==='donut')h+=mkDonut(items,mL);
  else if(I.viz==='treemap')h+=mkTreemap(items,mL);
  else{h+=mkBar(items,I.metric,mL,data);if(items.length>=8)h+=mkPareto(items,'Pareto');}
  h+=mkTbl(items,[{l:I.groupBy,k:'key',f:v=>esc(tr(v,35))},{l:'Claims',k:'count',f:v=>fN(v)},{l:'Total Cost',k:'cost',f:v=>f$(v)},{l:'Avg Cost',k:'avgC',f:v=>f$(v)},{l:'Avg Mileage',k:'avgM',f:v=>fN(v)+' km'}]);
  // Customer failure mode summary when filtered to specific parts
  if(I.filters._failureMode||I.filters.partNM||I.filters._sysCategory)h+=failureModeSummary(data);
  // When symptom search is active, show matching dealer comments as evidence
  if(I.filters._natSearch){
    const terms=I.filters._natSearch;
    const matchComments=data.filter(r=>r.comment&&r.comment.length>15).filter(r=>{
      const c=r.comment.toLowerCase();return terms.some(t=>c.includes(t));
    }).slice(0,6);
    if(matchComments.length){
      h+=`<div class="cb"><div class="ct">Matching Dealer Comments / Comentarios Coincidentes</div>`;
      h+=`<div style="font-size:10px;color:var(--tx3);margin-bottom:6px">Comments matching: "${terms.join('" or "')}"</div>`;
      matchComments.forEach(r=>{
        h+=`<div class="comment-box">"${hlTerms(esc(tr(r.comment,200)),terms)}" <span class="txt-dim">— ${r.proj} | ${r.nation} | ${fN(r.mileage)}km</span></div>`;
      });
      h+='</div>';
    }
  }
  h+=autoMarketMap(I,data);
  _vizData=data;_vizFilters=I.filters;_vizGroupBy=I.groupBy;_vizMetric=I.metric;
  h+=`<p style="margin-top:10px;font-size:11px;color:var(--tx2)"><b>🔧 Viz Studio</b> — Add more charts, switch grouping/metric:</p>`;
  h+=vizComboBar(data);
  h+=mkExpBtn(items,'Export Results');
  h+=srcTag(tot);return h;
}

function genAnalysis(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No claims found.</p>';
  const sysCat=I.filters._sysCategory?SYS_CAT[I.filters._sysCategory]:null;
  const pn=I.filters.partNM||(sysCat?sysCat.label:I.filters._hvac?'HVAC/Climate':'Component');
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const am=data.reduce((s,r)=>s+(r.mileage||0),0)/data.length;
  const au=data.reduce((s,r)=>s+(r.misMonths||0),0)/data.length;
  let h=`<p><b>${esc(pn)} — Detailed Analysis</b> | ${dsl()}</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)',`of ${fN(gDS().length)}`],['Total Cost',f$(tc),'var(--or)',`avg ${f$(tc/data.length)}`],['Avg Mileage',fN(am)+' km','var(--gn)'],['Avg Use Period',fN(au,1)+' mo','var(--pu)']]);
  h+=mkBar(ag(data,'natName','count').slice(0,10),'count','Failure Modes / Modos de Falla');
  // Customer failure mode categorization from [C] comments
  h+=failureModeSummary(data);
  // When symptom search is active, show matching comments with highlighted terms
  if(I.filters._natSearch){
    const terms=I.filters._natSearch;
    const matchComments=data.filter(r=>r.comment&&r.comment.length>15).filter(r=>{
      const c=r.comment.toLowerCase();return terms.some(t=>c.includes(t));
    }).slice(0,8);
    if(matchComments.length){
      h+=`<div class="cb"><div class="ct">Matching Comments / Comentarios que Coinciden</div>`;
      h+=`<div style="font-size:10px;color:var(--tx3);margin-bottom:6px">${fN(matchComments.length)} comments matching: "${terms.join('" or "')}"</div>`;
      matchComments.forEach(r=>{
        h+=`<div class="comment-box">"${hlTerms(esc(tr(r.comment,250)),terms)}" <span class="txt-dim">— ${r.proj} | ${r.nation} | ${fN(r.mileage)}km</span></div>`;
      });
      h+='</div>';
    }
  }
  // Show DTC / Cause Codes if available
  const dtcData=data.filter(r=>r.causeCode&&r.causeCode!=='ZZ2'&&r.causeCode!=='ZZ7');
  const byDTC=ag(dtcData.length>0?dtcData:data,'causeCode','count').filter(d=>d.key).slice(0,8);
  if(byDTC.length>0)h+=mkBar(byDTC,'count','Cause / DTC Codes');
  const byN=ag(data,'nation','count');if(byN.length>1)h+=mkDonut(byN,'Market / Mercado');
  const byP=ag(data,'proj','count');if(byP.length>1)h+=mkDonut(byP,'Project / Proyecto');
  if(byP.length>1)h+=mkHeat(data,'natName','proj','Nature × Project');
  const byM=ag(data,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  if(byM.length>1)h+=mkBar(byM,'count','Trend by Sale Month / Tendencia por Mes de Venta');
  // US Map if enough US data
  const usData=data.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=5)h+=mkMap(usData,'US Geographic Distribution (Normalized)',true);
  if(data.length>5&&data[0].mileage!==undefined)h+=mkScatter(data,'Mileage vs Cost');
  const byD=ag(data,'devName','count').slice(0,5);
  if(byD.length)h+=`<p style="margin-top:8px"><b>Suppliers:</b> ${byD.map(d=>esc(tr(d.key,30))+' ('+d.count+')').join(' · ')}</p>`;
  h+=autoMarketMap(I,data);
  h+=srcTag(data.length);return h;
}

function genFailureMode(I){
  // When a specific _failureMode is requested with a part, get ALL data for the part first (don't hard-filter by mode)
  const requestedFM=I.filters._failureMode||null;
  const requestedFS=I.filters._failureSub||null;
  const baseFilters=Object.assign({},I.filters);
  if(requestedFM)delete baseFilters._failureMode;
  if(requestedFS)delete baseFilters._failureSub;
  const data=flt(gDS(),baseFilters);
  if(!data.length)return'<p>No claims found. / Sin resultados.</p>';
  const withCC=data.filter(r=>r._custComment);
  const pn=I.filters.partNM||(I.filters._sysCategory?SYS_CAT[I.filters._sysCategory].label:I.filters._hvac?'HVAC/Climate':'All Parts');
  const fmFilterLabel=requestedFM?cfmLabel(requestedFM):'';
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const am=data.length>0?data.reduce((s,r)=>s+(r.mileage||0),0)/data.length:0;
  let h=`<p><b>Customer Failure Mode Analysis — ${esc(pn)}</b>${fmFilterLabel?' | Focus: '+esc(fmFilterLabel):''} | ${dsl()}</p>`;
  h+=mkKPIs([['Total Claims',fN(data.length),'var(--ac)',`of ${fN(gDS().length)}`],['With [C] Comments',fN(withCC.length),'var(--gn)',pc(withCC.length,data.length)],['Total Cost',f$(tc),'var(--or)',`avg ${f$(tc/data.length)}`],['Avg Mileage',fN(am)+' km','var(--pu)']]);
  // Focused failure mode highlight — when a specific mode was requested
  if(requestedFM){
    const fmData=data.filter(r=>r._failureMode===requestedFM);
    const fmCC=fmData.filter(r=>r._custComment);
    const fmCost=fmData.reduce((s,r)=>s+(r.totalCost||0),0);
    const months=fmData.map(r=>r.confMonth).filter(Boolean);
    const period=months.length?[...new Set(months)].sort():[];
    const periodStr=period.length>=2?period[0]+' → '+period[period.length-1]:period.length===1?period[0]:'—';
    h+=`<div class="cb" style="border-left:3px solid var(--yl);background:rgba(251,191,36,.06)">`;
    h+=`<div class="ct" style="color:var(--yl)">🎯 Focus: ${esc(cfmLabel(requestedFM))} — ${esc(pn)}</div>`;
    h+=mkKPIs([
      ['Mode Claims',fN(fmCC.length),'var(--yl)',fmCC.length>0?pc(fmCC.length,withCC.length)+' of commented':'0 classified'],
      ['Mode Cost',f$(fmCost),'var(--or)',fmCost>0?'avg '+f$(fmCost/fmData.length):'—'],
      ['Period',periodStr,'var(--cy)',fmData.length+' records'],
      ['All Claims',fN(data.length),'var(--ac)',`100% baseline`]
    ]);
    if(fmCC.length>0){
      // Show sample comments for this specific mode
      const samples=fmCC.slice(0,4);
      h+=`<div style="margin-top:8px">`;
      samples.forEach(r=>{
        const fmTag=cfmFullLabel(r._failureMode,r._failureSub);
        h+=`<div style="border-left:3px solid var(--yl);padding:5px 10px;margin:3px 0;font-size:12px;color:var(--tx2);border-radius:0 4px 4px 0">"${esc(tr(r._custComment,180))}" <span style="color:var(--tx3)">— ${esc(fmTag)} | ${r.proj} | ${r.nation} | ${fN(r.mileage)}km</span></div>`;
      });
      h+='</div>';
    } else {
      h+=`<p style="color:var(--tx3);font-size:11px;margin-top:6px">No claims classified as "${esc(cfmLabel(requestedFM))}" for ${esc(pn)}. See the full breakdown below for actual failure modes.</p>`;
    }
    h+='</div>';
  }
  // Main failure mode summary bar chart
  h+=failureModeSummary(data);
  // Subcategory breakdown bar chart
  const subData=withCC.filter(r=>r._failureSub&&r._failureSub!=='other');
  if(subData.length>2)h+=mkBar(ag(subData,'_failureSub','count').slice(0,15),'count','Subcategory Detail / Detalle de Subcategoría');
  // Failure mode × Project heatmap
  const projs=[...new Set(data.map(r=>r.proj))];
  if(projs.length>1)h+=mkHeat(data,'_failureMode','proj','Customer Failure Mode × Project');
  // Failure mode × Market
  const nations=[...new Set(data.map(r=>r.nation))];
  if(nations.length>1)h+=mkHeat(data,'_failureMode','nation','Customer Failure Mode × Market');
  // Nature codes for cross-reference
  h+=mkBar(ag(data,'natName','count').slice(0,10),'count','Qualitivity Nature Codes');
  // DTC / Cause Codes
  const dtcData=data.filter(r=>r.causeCode&&r.causeCode!=='ZZ2'&&r.causeCode!=='ZZ7');
  const byDTC=ag(dtcData.length>0?dtcData:data,'causeCode','count').filter(d=>d.key).slice(0,8);
  if(byDTC.length>0)h+=mkBar(byDTC,'count','Cause / DTC Codes');
  // Monthly trend
  const byM=ag(data,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  if(byM.length>1)h+=mkBar(byM,'count','Trend by Sale Month / Tendencia por Mes de Venta');
  // Market donuts
  if(nations.length>1)h+=mkDonut(ag(data,'nation','count'),'Market / Mercado');
  if(projs.length>1)h+=mkDonut(ag(data,'proj','count'),'Project / Proyecto');
  // US Map
  const usData=data.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=5)h+=mkMap(usData,'US Geographic — '+esc(pn)+' Failure Modes',true);
  // Scatter
  if(data.length>5&&data[0].mileage!==undefined)h+=mkScatter(data,'Mileage vs Cost');
  // Sample customer comments as evidence
  if(withCC.length>0){
    const samples=requestedFM?withCC.filter(r=>r._failureMode!==requestedFM).slice(0,4):withCC.slice(0,6);
    if(samples.length){
      h+=`<div class="cb"><div class="ct">${requestedFM?'Other':'Sample'} Customer Comments [C] / Comentarios del Cliente</div>`;
      samples.forEach(r=>{
        const fmTag=cfmFullLabel(r._failureMode,r._failureSub);
        h+=`<div style="background:var(--sf2);border-left:3px solid var(--ac);padding:6px 10px;margin:4px 0;font-size:12px;color:var(--tx2);border-radius:0 6px 6px 0">"${esc(tr(r._custComment,200))}" <span style="color:var(--tx3)">— ${esc(fmTag)} | ${r.proj} | ${r.nation} | ${fN(r.mileage)}km</span></div>`;
      });
      h+='</div>';
    }
  }
  h+=autoMarketMap(I,data);
  h+=srcTag(data.length,'claims · '+fN(withCC.length)+' customer comments');
  return h;
}

function mkTrendSVG(pts,title,isCost){
  if(!pts.length)return'';
  const mxY=Math.max(...pts.map(p=>p.y),1)*1.2;
  const W=560,H=200,pad=55;
  const n=pts.length;
  const xScale=(i)=>pad+(i/(n-1||1))*(W-pad-15);
  const yScale=(y)=>H-25-(y/mxY)*(H-50);
  const bw=Math.max(14,Math.min(36,(W-pad-15)/(n*1.5)));
  // Check if last month is incomplete (current month)
  const now=new Date();const curMKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  let svg=`<div class="cb"><div class="ct">${esc(title)}</div><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  for(let i=0;i<=4;i++){
    const y=H-25-i/4*(H-50);
    svg+=`<line x1="${pad}" y1="${y}" x2="${W-10}" y2="${y}" stroke="var(--bd)" stroke-width=".5"/>`;
    svg+=`<text x="${pad-4}" y="${y+3}" fill="var(--tx3)" font-size="9" text-anchor="end" font-family="JetBrains Mono">${isCost?(mxY*i/4>=1000?'$'+Math.round(mxY*i/4/1000)+'k':'$'+Math.round(mxY*i/4)):Math.round(mxY*i/4)}</text>`;
  }
  pts.forEach((p,i)=>{
    const x=xScale(i);const bh=(p.y/mxY)*(H-50);
    const isInc=String(p.m)===curMKey;
    if(isInc){
      svg+=`<rect x="${x-bw/2}" y="${yScale(p.y)}" width="${bw}" height="${bh}" rx="3" fill="url(#hatch_trend)" stroke="var(--pu)" stroke-width="1" stroke-dasharray="3,2" opacity=".7"/>`;
    } else {
      svg+=`<rect x="${x-bw/2}" y="${yScale(p.y)}" width="${bw}" height="${bh}" rx="3" fill="var(--ac)" opacity=".8"/>`;
    }
    svg+=`<text x="${x}" y="${H-6}" fill="${isInc?'var(--pu)':'var(--tx3)'}" font-size="9" text-anchor="middle" font-family="JetBrains Mono">${String(p.m).slice(5)}</text>`;
    svg+=`<text x="${x}" y="${yScale(p.y)-5}" fill="var(--tx)" font-size="9" text-anchor="middle" font-family="JetBrains Mono" font-weight="600">${isCost?'$'+Math.round(p.y/1000)+'k':p.y}</text>`;
  });
  // Trend line
  if(pts.length>=2){const reg=linReg(pts.map((p,i)=>({x:i,y:p.y})));
    svg+=`<line x1="${xScale(0)}" y1="${yScale(reg.b)}" x2="${xScale(n-1)}" y2="${yScale(reg.m*(n-1)+reg.b)}" stroke="var(--or)" stroke-width="1.5" stroke-dasharray="5,3"/>`;
  }
  svg+=`<defs><pattern id="hatch_trend" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="4" fill="var(--pu)" opacity=".6"/></pattern></defs>`;
  svg+=`</svg></div>`;return svg;
}
function genTrend(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  const byM=ag(data,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  const byCost=ag(data,'salesMonth','cost').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  const fd=fdsc(I.filters);
  let h=`<p><b>Trend by Sale Month</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  // KPIs
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const months=byM.length;
  const avgClaims=months>0?Math.round(byM.reduce((s,m)=>s+m.count,0)/months):0;
  h+=mkKPIs([['Total Claims',fN(data.length),'var(--ac)'],['Months',fN(months),'var(--gn)'],['Avg/Month',fN(avgClaims),'var(--pu)'],['Total Cost',f$(tc),'var(--or)']]);
  // SVG trend charts
  h+=mkTrendSVG(byM.map(m=>({m:m.key,y:m.count})),'Claims / Sale Month',false);
  h+=mkTrendSVG(byCost.map(m=>({m:m.key,y:m.cost})),'Cost / Sale Month (USD)',true);
  const prjs=[...new Set(data.map(r=>r.proj))].filter(Boolean);
  if(prjs.length>1)h+=mkHeat(data,'proj','salesMonth','Project × Sale Month');
  h+=srcTag(data.length);return h;
}

function genSummary(I){
  const data=flt(gDS(),I.filters);
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  let h=`<p><b>Dashboard Summary / Resumen</b> — ${dsl()}</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)'],['Total Cost',f$(tc),'var(--or)'],['Avg Cost',f$(data.length?tc/data.length:0),'var(--yl)'],['Parts',fN([...new Set(data.map(r=>r.partNM))].length),'var(--pu)']]);
  h+=mkDonut(ag(data,'system','count'),'By System / Por Sistema');
  h+=mkDonut(ag(data,'proj','count'),'By Project / Proyecto');
  h+=mkBar(ag(data,'partNM','count').slice(0,10),'count','Top 10 Parts');
  h+=mkPareto(ag(data,'partNM','count').slice(0,15),'Parts Pareto');
  h+=mkDonut(ag(data,'nation','count'),'By Market / Mercado');
  h+=mkHeat(data,'system','proj','System × Project');
  h+=mkTreemap(ag(data,'partNM','count').slice(0,12),'Claims Treemap');
  const byM=ag(data,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  h+=mkBar(byM,'count','Trend by Sale Month / Tendencia por Mes de Venta');
  // US Map
  const usData=data.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=5){
    h+=mkMap(usData,'USA Claims Map — Raw Count',false);
    h+=mkMap(usData,'USA Claims Map — Normalized by Sales (Claim Index)',true);
  }
  if(data.length>10)h+=mkScatter(data.slice(0,200),'Mileage vs Cost');
  h+=`<span class="st">Qualitivity ${dsl()} · Full summary</span>`;return h;
}

function genComparison(I){
  const prjs=[...new Set(gDS().map(r=>r.proj))].filter(Boolean);const all=gDS();
  let h=`<p><b>Project Comparison</b> — ${dsl()}</p>`;
  const rows=prjs.map(p=>{const d=flt(all,{...I.filters,proj:p});const tc=d.reduce((s,r)=>s+(r.totalCost||0),0);const tp=ag(d,'partNM','count')[0];const tn=ag(d,'natName','count')[0];
  return{proj:p,claims:d.length,cost:tc,avgC:d.length?tc/d.length:0,avgM:d.length?d.reduce((s,r)=>s+(r.mileage||0),0)/d.length:0,topPart:tp?tp.key+' ('+tp.count+')':'—',topNat:tn?tn.key+' ('+tn.count+')':'—'};});
  h+=mkTbl(rows,[{l:'Project',k:'proj',f:v=>`<b style="color:var(--ac)">${v}</b>`},{l:'Claims',k:'claims',f:v=>fN(v)},{l:'Cost',k:'cost',f:v=>f$(v)},{l:'Avg Cost',k:'avgC',f:v=>f$(v)},{l:'Avg Mileage',k:'avgM',f:v=>fN(v)+' km'},{l:'Top Part',k:'topPart',f:v=>esc(tr(v,30))},{l:'Top Failure',k:'topNat',f:v=>esc(tr(v,30))}]);
  h+=mkHeat(flt(all,I.filters),'system','proj','System × Project');
  h+=mkDonut(ag(flt(all,I.filters),'proj','count'),'Distribution');
  h+=`<span class="st">Qualitivity ${dsl()}</span>`;return h;
}

function genMap(I){
  const filters={...I.filters};
  const rq=(I._rawQuery||'').toLowerCase();
  // Detect if user wants a specific country map
  const wantsMexico=/\bmexi[ck]o\b|\bmex\b|멕시코/.test(rq);
  const wantsWorld=/world|global|mundo|all\s*market|todos.*mercado|세계/.test(rq);
  const wantsLatam=/latin|latam|latinoamer|sudamer|south\s*amer/.test(rq);
  const wantsME=/middle\s*east|medio\s*oriente|중동/.test(rq);
  if(wantsWorld)return genWorldMap(I);
  if(wantsMexico){I.filters.nation='Mexico';return genMexicoMap(I);}
  // Default: try USA first, then add other available regions
  if(!filters.nation&&!filters.region&&!wantsLatam&&!wantsME)filters.nation='U.S.A';
  let data=wantsLatam||wantsME?flt(gDS(),I.filters):flt(gDS(),filters).filter(r=>r.state);
  const qMonth=parseMonth(rq);
  if(qMonth!==undefined){
    const ms=String(qMonth+1).padStart(2,'0');
    const mf=data.filter(r=>r.confMonth&&String(r.confMonth).includes('-'+ms));
    if(mf.length>0)data=mf;
  }
  if(!data.length)return'<p>No claims with geographic data found.</p>';
  const fd=fdsc(I.filters);
  const hasTemp=/temperature|temperatura|temp|기온/.test(rq);
  const hasRain=/rain|lluvia|precip|precipitac|강수/.test(rq);
  const hasSnow=/snow|nieve|눈/.test(rq);
  const ovType=hasRain?'precip':hasSnow?'snow':'temp';
  const ovLabel=qMonth!==undefined?MONTHS[qMonth]+' '+(ovType==='precip'?'Precip (in)':'Temp (°F)'):(ovType==='precip'?'Annual Precip':'Annual Temp');
  const showOverlay=hasTemp||hasRain||hasSnow;
  const mLabel=qMonth!==undefined?' | '+MONTHS[qMonth]:'';
  if(wantsLatam){
    let h=`<p><b>Latin America Map</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
    const latam=flt(gDS(),I.filters).filter(r=>r.region==='Latin America');
    h+=mkLatamMap(latam,'Latin America Claims');
    h+=mkBar(ag(latam,'nation','count').slice(0,15),'count','By Country');
    return h;
  }
  if(wantsME){
    let h=`<p><b>Middle East Map</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
    const me=flt(gDS(),I.filters).filter(r=>r.region==='Middle East');
    h+=mkMEMap(me,'Middle East Claims');
    h+=mkBar(ag(me,'nation','count').slice(0,10),'count','By Country');
    return h;
  }
  let h='<p><b>US Geographic Analysis</b>'+((fd?' | '+fd:'')+mLabel+' | '+dsl())+'</p>';
  h+=mkKPIs([['US Claims',fN(data.length),'var(--ac)'],['States',fN([...new Set(data.map(r=>r.state))].length),'var(--gn)'],['US Sales',fN(Object.values(SALES_ST).reduce((a,b)=>a+b,0)),'var(--pu)']]);
  if(US_TOPO&&typeof d3!=='undefined'){
    h+=mkRealMap(data,'Claim Ratio by State'+(showOverlay?' + '+ovLabel:''),true,showOverlay?ovType:null,showOverlay?ovLabel:null,qMonth);
  }
  h+=mkMap(data,'Tile Map — Claim Ratio',true);
  const bySt=ag(data,'state','count').slice(0,15);
  h+=mkBar(bySt,'count','Top States by Claims');
  // Also show Mexico + World if no specific nation filter
  if(!I.filters.nation){
    const allData=flt(gDS(),I.filters);
    const mxData=allData.filter(r=>r.nation==='Mexico');
    if(mxData.length>=3)h+=mkMexicoMap(mxData,'México Claims');
    if(allData.length>data.length+10)h+=mkWorldMap(allData,'All Markets Overview');
  }
  _vizData=data;_vizFilters=filters;
  h+=`<p style="margin-top:10px;font-size:11px;color:var(--tx2)"><b>🔧 Viz Studio</b> — Add more views:</p>`;
  h+=vizComboBar(data);
  h+=srcTag(data.length);
  return h;
}

function genHeatmap(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  let h=`<p><b>Heatmap Analysis</b> — ${dsl()}</p>`;
  h+=mkHeat(data,'system','proj','System × Project');
  h+=mkHeat(data,'natName','proj','Nature × Project');
  h+=mkHeat(data,'system','nation','System × Market');
  h+=mkHeat(data,'partNM','salesMonth','Parts × Sale Month');
  const usData=data.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=5)h+=mkMap(usData,'US Geographic Heatmap (Normalized)',true);
  const mxData=data.filter(r=>r.nation==='Mexico');
  if(mxData.length>=3)h+=mkMexicoMap(mxData,'México Geographic Heatmap');
  if(data.length>=10)h+=mkWorldMap(data,'Global Geographic Heatmap');
  _vizData=data;_vizFilters=I.filters;
  h+=`<p style="margin-top:10px;font-size:11px;color:var(--tx2)"><b>🔧 Viz Studio</b> — Combine more views:</p>`;
  h+=vizComboBar(data);
  h+=srcTag(data.length);return h;
}

function genDetail(I){
  const allData=flt(gDS(),I.filters);
  const data=allData.slice(0,30);
  if(!data.length)return'<p>No claims found.</p>';
  let h=`<p><b>Claim Details</b> — Showing ${data.length} of ${fN(allData.length)} claims${allData.length>30?' (top 30)':''}</p>`;
  h+=mkTbl(data,[{l:'VIN',k:'vin',f:v=>v?'…'+String(v).slice(-6):''},{l:'Project',k:'proj',f:v=>esc(v||'')},{l:'Part',k:'partNM',f:v=>esc(tr(v,22))},{l:'Cause',k:'causeCode',f:v=>v?`<span style="font-family:'JetBrains Mono',monospace;color:var(--yl)">${esc(v)}</span>`:''},{l:'Nature',k:'natName',f:v=>esc(tr(v,25))},{l:'System',k:'system',f:v=>esc(v||'')},{l:'Nation',k:'nation',f:v=>esc(v||'')},{l:'Mileage',k:'mileage',f:v=>fN(v)+' km'},{l:'Cost',k:'totalCost',f:v=>f$(v)}]);
  return h;
}

// ===== CFM COMMENTS TABLE (drill-down from subcategory labels) =====
function genCfmComments(I){
  const data=flt(gDS(),I.filters);
  const withCC=dedupCfm(data.filter(r=>r._custComment&&r._custComment.length>=8));
  if(!withCC.length)return'<p>No customer comments found for this filter. / Sin comentarios de cliente.</p>';
  const subId=I.filters._failureSub;const catId=I.filters._failureMode;
  const titleLabel=subId?cfmFullLabel(catId,subId):catId?cfmLabel(catId):'All Failure Modes';
  const fd=fdsc(I.filters);
  let h=`<p><b>Customer Comments — ${esc(titleLabel)}</b>${fd?' | '+esc(fd):''} | ${dsl()}</p>`;
  h+=mkKPIs([['Comments',fN(withCC.length),'var(--ac)'],['Total Claims',fN(data.length),'var(--gn)'],['Avg Mileage',fN(withCC.reduce((s,r)=>s+(r.mileage||0),0)/withCC.length)+' km','var(--pu)'],['Total Cost',f$(withCC.reduce((s,r)=>s+(r.totalCost||0),0)),'var(--or)']]);
  // Comments table — each row is a customer comment with VIN clickable
  h+='<div class="tw"><table><thead><tr><th style="width:60px">VIN</th><th>Customer Description [C]</th><th>Part</th><th>Project</th><th>Market</th><th>Mileage</th><th>Cost</th></tr></thead><tbody>';
  withCC.slice(0,100).forEach(r=>{
    const vinShort=r.vin?'…'+String(r.vin).slice(-6):'—';
    const vinFull=r.vin||'';
    h+=`<tr>`;
    h+=`<td><span style="color:var(--ac);cursor:pointer;text-decoration:underline;font-family:'JetBrains Mono',monospace;font-size:10px" onclick="inp.value='vin ${esc(vinFull)}';send()" title="Click for VIN detail: ${esc(vinFull)}">${vinShort}</span></td>`;
    h+=`<td style="font-size:11px;max-width:400px;white-space:normal;line-height:1.3">${esc(tr(r._custComment,250))}</td>`;
    h+=`<td style="font-size:10px">${esc(tr(r.partNM||'',20))}</td>`;
    h+=`<td>${esc(r.proj||'')}</td>`;
    h+=`<td>${esc(r.nation||'')}</td>`;
    h+=`<td style="font-family:'JetBrains Mono',monospace;font-size:10px">${fN(r.mileage)} km</td>`;
    h+=`<td style="font-family:'JetBrains Mono',monospace;font-size:10px">${f$(r.totalCost)}</td>`;
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  if(withCC.length>100)h+=`<p style="font-size:10px;color:var(--tx3)">Showing first 100 of ${fN(withCC.length)} comments.</p>`;
  h+=srcTag(withCC.length,'customer comments');
  return h;
}

// ===== VIN DETAIL VIEW =====
function genVinDetail(I){
  const vinQ=(I._rawQuery||'').replace(/^vin\s*/i,'').trim();
  if(!vinQ)return'<p>Please specify a VIN.</p>';
  const all=gDS();
  const matches=all.filter(r=>r.vin&&String(r.vin).includes(vinQ));
  if(!matches.length)return`<p>No claims found for VIN containing "${esc(vinQ)}".</p>`;
  const r0=matches[0];
  const vinFull=r0.vin||vinQ;
  let h=`<p><b>VIN Detail — ${esc(vinFull)}</b></p>`;
  // Vehicle info card
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px">';
  const info=[
    ['VIN',vinFull,'var(--ac)'],
    ['Project',r0.proj||'—','var(--gn)'],
    ['System',r0.system||'—','var(--pu)'],
    ['Nation',r0.nation||'—','var(--yl)'],
    ['Region',r0.region||'—','var(--or)'],
    ['Dealer',r0.dealer||'—','var(--ac)'],
    ['State',r0.state?((ST_NAMES[r0.state]||r0.state)+' ('+r0.state+')'):'—','var(--gn)'],
    ['Supplier',tr(r0.devName||'—',30),'var(--tx2)']
  ];
  info.forEach(([l,v,c])=>{
    h+=`<div style="background:var(--sf2);border-radius:8px;padding:8px 10px"><div style="font-size:9px;color:var(--tx3);text-transform:uppercase;margin-bottom:2px">${l}</div><div style="font-size:12px;color:${c};font-weight:600;word-break:break-all">${esc(v)}</div></div>`;
  });
  h+='</div>';
  // All claims for this VIN
  h+=`<p style="font-size:11px;color:var(--tx2);margin:8px 0 4px"><b>${matches.length} claim(s) for this VIN:</b></p>`;
  h+='<div class="tw"><table><thead><tr><th>Month</th><th>Part</th><th>Nature</th><th>Cause</th><th>Mileage</th><th>Use Period</th><th>Cost</th><th>Safety</th></tr></thead><tbody>';
  matches.forEach(r=>{
    h+=`<tr>`;
    h+=`<td>${esc(r.confMonth||'')}</td>`;
    h+=`<td style="font-size:10px">${esc(tr(r.partNM||'',25))}</td>`;
    h+=`<td style="font-size:10px">${esc(tr(r.natName||'',25))}</td>`;
    h+=`<td style="font-family:'JetBrains Mono',monospace">${esc(r.causeCode||'')}</td>`;
    h+=`<td style="font-family:'JetBrains Mono',monospace">${fN(r.mileage)} km</td>`;
    h+=`<td>${r.useP!=null?fN(r.useP,0)+' d':'—'}</td>`;
    h+=`<td style="font-family:'JetBrains Mono',monospace">${f$(r.totalCost)}</td>`;
    h+=`<td>${r.safety==='Y'?'⚠️':''}</td>`;
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  // Customer comments
  const withCC=matches.filter(r=>r._custComment);
  if(withCC.length){
    h+=`<p style="font-size:11px;color:var(--tx2);margin:10px 0 4px"><b>Customer Comments [C]:</b></p>`;
    withCC.forEach(r=>{
      const fmTag=cfmFullLabel(r._failureMode,r._failureSub);
      h+=`<div class="comment-box accent">"${esc(r._custComment)}" <div class="txt-dim" style="margin-top:4px">${esc(fmTag)} · ${esc(r.partNM||'')} · ${r.confMonth||''} · ${fN(r.mileage)} km · ${f$(r.totalCost)}</div></div>`;
    });
  }
  // Full dealer comment (raw)
  const withRaw=matches.filter(r=>r.comment);
  if(withRaw.length){
    h+=`<p style="font-size:11px;color:var(--tx2);margin:10px 0 4px"><b>Full Dealer Report:</b></p>`;
    withRaw.forEach(r=>{
      h+=`<div style="background:var(--sf2);padding:8px 12px;margin:4px 0;font-size:10px;color:var(--tx3);border-radius:6px;line-height:1.4;white-space:pre-wrap;word-break:break-word;font-family:'JetBrains Mono',monospace">${esc(r.comment||'')}</div>`;
    });
  }
  h+=`<span class="st">Qualitivity ${dsl()} · VIN ${esc(vinFull)}</span>`;
  return h;
}

// ===== V6: GENERIC REGION MAP BUILDER =====
function mkGenMap(data, title, tileMap, nameMap, geoField, cellSize, climateDB, monthlyTempDB, monthlyPrecipDB, overlayVar, monthIdx){
  cellSize=cellSize||48;const gap=3;
  const hasOverlay=!!climateDB&&!!overlayVar;
  const showMonthly=hasOverlay&&monthIdx!==undefined;
  // Calculate grid dimensions from tile positions
  let maxR=0,maxC=0;
  for(const[_,pos]of Object.entries(tileMap)){maxR=Math.max(maxR,pos[0]);maxC=Math.max(maxC,pos[1]);}
  const rows=maxR+1,cols=maxC+1;
  // Aggregate claims by geo code
  const geoClaims={};
  for(const r of data){
    let code=r[geoField];
    if(!code)continue;
    if(!nameMap[code])continue;
    geoClaims[code]=(geoClaims[code]||0)+(r.claims||1);
  }
  let maxVal=0;
  for(const v of Object.values(geoClaims))if(v>maxVal)maxVal=v;
  const oCS=hasOverlay?Math.max(cellSize,50):cellSize; // bigger cells when overlay
  const W=(oCS+gap)*cols,H=(oCS+gap)*rows;
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  h+=`<div style="position:relative;width:${W}px;max-width:100%;margin:0 auto">`;
  h+=`<div style="display:grid;grid-template-columns:repeat(${cols},${oCS}px);grid-template-rows:repeat(${rows},${oCS}px);gap:${gap}px">`;
  for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){
    let here=null;
    for(const[code,[cr,cc]]of Object.entries(tileMap)){if(cr===r&&cc===c){here=code;break;}}
    if(here){
      const claims=geoClaims[here]||0;
      const intensity=maxVal>0?Math.sqrt(claims/maxVal):0;
      const ci=Math.min(Math.round(intensity*10),10);
      const bg=claims>0?HC[ci]:'#0a0f18';
      const fg=ci>4?'#fff':'var(--tx3)';
      const name=nameMap[here]||here;
      // Climate overlay value
      let ovText='';
      if(hasOverlay&&climateDB[here]){
        if(showMonthly&&overlayVar==='temp'&&monthlyTempDB&&monthlyTempDB[here])
          ovText=monthlyTempDB[here][monthIdx]+'°';
        else if(showMonthly&&overlayVar==='precip'&&monthlyPrecipDB&&monthlyPrecipDB[here])
          ovText=monthlyPrecipDB[here][monthIdx]+'"';
        else if(climateDB[here][overlayVar]!==undefined)
          ovText=climateDB[here][overlayVar]+(overlayVar==='humidity'?'%':overlayVar==='precipIn'?'"':'°');
      }
      const tipClimate=hasOverlay&&climateDB[here]?`\nTemp: ${climateDB[here].avgTemp}°F\nPrecip: ${climateDB[here].precipIn}in\nHumidity: ${climateDB[here].humidity}%`:'';
      h+=`<div style="background:${bg};color:${fg};border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;font-family:'JetBrains Mono',monospace;border:1px solid ${ci>2?'transparent':'var(--bd)'}" title="${name}\nClaims: ${claims}${tipClimate}" onclick="drill('nation','${name}')" onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform='scale(1)'">
        <div style="font-size:${oCS>40?'10':'8'}px;font-weight:700">${here}</div>
        <div style="font-size:${oCS>40?'9':'7'}px;margin-top:1px">${claims||''}</div>`;
      if(ovText)h+=`<div style="font-size:7px;color:${fg};opacity:.7;margin-top:0">${ovText}</div>`;
      h+=`</div>`;
    } else h+='<div></div>';
  }}
  h+='</div>';
  h+=`<div style="display:flex;align-items:center;gap:4px;margin-top:8px;justify-content:center"><span style="font-size:9px;color:var(--tx3);font-family:'JetBrains Mono',monospace">Low</span><div style="height:10px;width:160px;border-radius:3px;background:linear-gradient(90deg,${HC[0]},${HC[3]},${HC[6]},${HC[9]},${HC[10]})"></div><span style="font-size:9px;color:var(--tx3);font-family:'JetBrains Mono',monospace">High</span></div>`;
  h+='</div>';
  // Top areas table with climate data
  const sorted=Object.entries(geoClaims).sort((a,b)=>b[1]-a[1]).slice(0,15);
  if(sorted.length){
    const showClimaCols=hasOverlay&&climateDB;
    h+='<div class="tw" style="margin-top:8px"><table><thead><tr><th>#</th><th>Region</th><th>Claims</th><th>% of Total</th>';
    if(showClimaCols)h+='<th>Temp°F</th><th>Precip"</th><th>Humidity%</th>';
    h+='</tr></thead><tbody>';
    const tot=sorted.reduce((s,x)=>s+x[1],0);
    sorted.forEach(([code,cnt],i)=>{
      h+=`<tr><td>${i+1}</td><td>${esc(nameMap[code]||code)}</td><td>${fN(cnt)}</td><td>${pc(cnt,tot)}</td>`;
      if(showClimaCols&&climateDB[code])
        h+=`<td>${climateDB[code].avgTemp}</td><td>${climateDB[code].precipIn}</td><td>${climateDB[code].humidity}</td>`;
      else if(showClimaCols) h+=`<td>-</td><td>-</td><td>-</td>`;
      h+=`</tr>`;
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';return h;
}

// Mexico map — maps dealer codes to states then renders state tile map
function mkMexicoMap(data, title, overlayVar, monthIdx){
  // Map each record to Mexican state via dealer code
  const mapped=data.map(r=>{
    const dlr=String(r.dealer||'');
    const stCode=MX_DEALER_STATE[dlr]||null;
    return{...r,_mxState:stCode};
  }).filter(r=>r._mxState);
  return mkGenMap(mapped,title,MX_ZONES,MX_NAMES,'_mxState',44,
    overlayVar?MX_CLIMATE:null,MX_MONTHLY_TEMP,MX_MONTHLY_PRECIP,overlayVar,monthIdx);
}

// World overview map
function mkWorldMap(data, title){
  const mapped=data.map(r=>{
    const code=NATION_CODE[r.nation];
    return code?{...r,_cc:code}:null;
  }).filter(Boolean);
  return mkGenMap(mapped,title,WORLD_TILE,WORLD_NAMES,'_cc',50);
}

// LATAM map
function mkLatamMap(data, title){
  const mapped=data.map(r=>{
    const code=NATION_CODE[r.nation];
    return code?{...r,_cc:code}:null;
  }).filter(Boolean);
  return mkGenMap(mapped,title,LATAM_TILE,{...WORLD_NAMES,...MX_NAMES},'_cc',50);
}

// Middle East map
function mkMEMap(data, title){
  const mapped=data.map(r=>{
    const code=NATION_CODE[r.nation];
    return code?{...r,_cc:code}:null;
  }).filter(Boolean);
  return mkGenMap(mapped,title,ME_TILE,ME_NAMES,'_cc',55);
}

// Canada map
function mkCanadaMap(data, title, overlayVar, monthIdx){
  // If we have province data, use it with climate overlay
  if(data.some(r=>CA_NAMES[r.state])){
    return mkGenMap(data,title,CA_TILE,CA_NAMES,'state',50,
      overlayVar?CA_CLIMATE:null,CA_MONTHLY_TEMP,CA_MONTHLY_PRECIP,overlayVar,monthIdx);
  }
  // Fallback: aggregate Canada as single tile with summary
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  const total=data.length;
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  h+=`<p>Canada: <b>${fN(total)}</b> claims · <b>${f$(tc)}</b> total cost</p>`;
  h+=mkBar(ag(data,'partNM','count').slice(0,10),'count','Top Parts — Canada');
  h+='</div>';
  return h;
}

// Australia map
function mkAustraliaMap(data, title){
  if(data.some(r=>AU_NAMES[r.state])){
    return mkGenMap(data,title,AU_TILE,AU_NAMES,'state',55);
  }
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  const total=data.length;
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  h+=`<p>Australia: <b>${fN(total)}</b> claims · <b>${f$(tc)}</b> total cost</p>`;
  h+=mkBar(ag(data,'partNM','count').slice(0,10),'count','Top Parts — Australia');
  h+='</div>';
  return h;
}

// Canada map generator
function genCanadaMap(I){
  const data=flt(gDS(),{...I.filters,nation:'Canada'});
  if(!data.length)return'<p>No Canada claims found / No se encontraron reclamos de Canadá.</p>';
  const rq=(I._rawQuery||'').toLowerCase();
  const hasTemp=/temp|기온/.test(rq);
  const hasRain=/rain|lluvia|precip|강수/.test(rq);
  const ovVar=hasRain?'precip':hasTemp?'temp':null;
  const fd=fdsc(I.filters);
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  let h=`<p><b>🍁 Canada Claims Analysis / Análisis Canadá</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)'],['Total Cost',f$(tc),'var(--or)'],
    ['Avg Cost',f$(data.length?tc/data.length:0),'var(--yl)'],
    ['Climate Source','Env. Canada','var(--tx2)']]);
  h+=mkCanadaMap(data,'Canada — Claims by Province'+(ovVar?' + Climate':''),ovVar?'avgTemp':null);
  // Climate correlation if enough data
  const hasProvince=data.some(r=>CA_NAMES[r.state]);
  if(hasProvince&&data.length>=5){
    h+=mkClimateCorrelation(data,'avgTemp','Avg Annual Temp (°F)','Canada: Claims vs Temperature',CA_CLIMATE,CA_NAMES,'state',{});
    h+=mkClimateCorrelation(data,'winterTemp','Winter Avg Temp (°F)','Canada: Claims vs Winter Temp',CA_CLIMATE,CA_NAMES,'state',{});
    h+=mkClimateCorrelation(data,'precipIn','Annual Precipitation (in)','Canada: Claims vs Precipitation',CA_CLIMATE,CA_NAMES,'state',{});
    h+=mkClimateCorrelation(data,'snowIn','Annual Snowfall (in)','Canada: Claims vs Snowfall',CA_CLIMATE,CA_NAMES,'state',{});
  }
  const bySys=ag(data,'system','count').slice(0,8);
  if(bySys.length)h+=mkDonut(bySys,'System Distribution — Canada');
  const byPart=ag(data,'partNM','count').slice(0,10);
  h+=mkBar(byPart,'count','Top Parts — Canada');
  h+=`<span class="st">Canada · ${fN(data.length)} claims · Climate: Environment Canada Normals</span>`;
  return h;
}

// Australia map generator
function genAustraliaMap(I){
  const data=flt(gDS(),{...I.filters,nation:'Australia'});
  if(!data.length)return'<p>No Australia claims found.</p>';
  let h=`<p><b>🦘 Australia Claims Analysis</b></p>`;
  h+=mkAustraliaMap(data,'Australia — Claims Distribution');
  const bySys=ag(data,'system','count').slice(0,8);
  if(bySys.length)h+=mkDonut(bySys,'System Distribution — Australia');
  const byPart=ag(data,'partNM','count').slice(0,10);
  h+=mkBar(byPart,'count','Top Parts — Australia');
  h+=`<span class="st">Australia Map · ${fN(data.length)} claims</span>`;
  return h;
}

// ===== V6: VIZ COMBINER ENGINE =====
let _vizData=null;let _vizFilters={};let _vizSlots=[];let _vizCounter=0;
const VIZ_TYPES=[
  {id:'bar',icon:'📊',label:'Bar Chart',fn:(d,f)=>mkBar(ag(flt(d,f),_vizGroupBy||'partNM',_vizMetric||'count').slice(0,15),_vizMetric||'count','Bar Chart')},
  {id:'pareto',icon:'📉',label:'Pareto',fn:(d,f)=>mkPareto(ag(flt(d,f),_vizGroupBy||'partNM',_vizMetric||'count').slice(0,15),'Pareto')},
  {id:'donut',icon:'🍩',label:'Donut',fn:(d,f)=>mkDonut(ag(flt(d,f),_vizGroupBy||'system',_vizMetric||'count'),'Distribution')},
  {id:'treemap',icon:'🌲',label:'Treemap',fn:(d,f)=>mkTreemap(ag(flt(d,f),_vizGroupBy||'partNM',_vizMetric||'count').slice(0,12),'Treemap')},
  {id:'heatmap',icon:'🔥',label:'Heatmap',fn:(d,f)=>mkHeat(flt(d,f),'system','proj','System × Project Heatmap')},
  {id:'scatter',icon:'🔍',label:'Scatter',fn:(d,f)=>mkScatter(flt(d,f).slice(0,250),'Mileage vs Cost')},
  {id:'trend',icon:'📈',label:'Trend',fn:(d,f)=>{const byM=ag(flt(d,f),'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));return mkBar(byM,'count','Trend by Sale Month');}},
  {id:'tbl',icon:'📋',label:'Table',fn:(d,f)=>{const dt=flt(d,f).slice(0,30);return mkTbl(dt,[{l:'Part',k:'partNM',f:v=>esc(tr(v,25))},{l:'System',k:'system',f:v=>esc(v||'')},{l:'Nation',k:'nation',f:v=>esc(v||'')},{l:'Cost',k:'totalCost',f:v=>f$(v)},{l:'Mileage',k:'mileage',f:v=>fN(v)+' km'}]);}},
  {id:'usmap',icon:'🗺️',label:'USA Map',fn:(d,f)=>mkMap(flt(d,f).filter(r=>r.nation==='U.S.A'&&r.state),'USA Claims Map',false)},
  {id:'mxmap',icon:'🇲🇽',label:'México Map',fn:(d,f)=>mkMexicoMap(flt(d,f).filter(r=>r.nation==='Mexico'),'México Claims Map')},
  {id:'worldmap',icon:'🌍',label:'World Map',fn:(d,f)=>mkWorldMap(flt(d,f),'Global Claims Map')},
  {id:'camap',icon:'🍁',label:'Canada Map',fn:(d,f)=>mkCanadaMap(flt(d,f).filter(r=>r.nation==='Canada'),'Canada Claims Map')},
  {id:'aumap',icon:'🦘',label:'Australia Map',fn:(d,f)=>mkAustraliaMap(flt(d,f).filter(r=>r.nation==='Australia'),'Australia Claims Map')},
  {id:'latammap',icon:'🌎',label:'LATAM Map',fn:(d,f)=>mkLatamMap(flt(d,f).filter(r=>r.region==='Latin America'||r.nation==='Mexico'||r.nation==='Puerto Rico'),'LATAM Claims Map')},
  {id:'memap',icon:'🕌',label:'ME Map',fn:(d,f)=>mkMEMap(flt(d,f).filter(r=>r.region==='Middle East'),'Middle East Claims Map')},
  {id:'histogram',icon:'📊',label:'Mileage Hist',fn:(d,f)=>mkHistogram(flt(d,f).filter(r=>r.mileage>0),'Mileage Distribution')},
  {id:'waterfall',icon:'💧',label:'Cost Split',fn:(d,f)=>{const dt=flt(d,f);const bySys=ag(dt,'system','cost').slice(0,10).map(s=>{const sd=dt.filter(r=>r.system===s.key);return{key:s.key,...s,pCost:sd.reduce((x,r)=>x+(r.partCost||0),0),lCost:sd.reduce((x,r)=>x+(r.laborCost||0),0),outsource:sd.reduce((x,r)=>x+(r.outsource||0),0)};});return mkWaterfall(bySys,'Cost Breakdown');}},
  {id:'timeheat',icon:'📅',label:'Time Heatmap',fn:(d,f)=>mkHeat(flt(d,f),'partNM','salesMonth','Part × Sale Month')},
  {id:'dealheat',icon:'🏢',label:'Dealer Heat',fn:(d,f)=>mkHeat(flt(d,f),'dealer','salesMonth','Dealer × Sale Month')},
];
let _vizGroupBy='partNM';let _vizMetric='count';

function vizComboBar(dataRef){
  let h=`<div class="viz-bar" id="vbar${_vizCounter}">`;
  h+=`<span style="font-size:9px;color:var(--tx3);margin-right:4px">Add viz:</span>`;
  VIZ_TYPES.forEach(vt=>{
    h+=`<button class="viz-btn" onclick="addVizSlot('${vt.id}',${_vizCounter})" title="${vt.label}">${vt.icon} ${vt.label}</button>`;
  });
  h+=`<span style="font-size:9px;color:var(--tx3);margin-left:auto">Group:</span>`;
  ['partNM','system','nation','dealer','devName','proj','natName','salesMonth','confMonth'].forEach(g=>{
    h+=`<button class="viz-btn${g===_vizGroupBy?' va':''}" onclick="_vizGroupBy='${g}';regenVizSlots(${_vizCounter})">${g==='partNM'?'Part':g==='devName'?'Supplier':g==='natName'?'Nature':g==='salesMonth'?'Sale Mo':g==='confMonth'?'Conf Mo':g.charAt(0).toUpperCase()+g.slice(1)}</button>`;
  });
  h+=`<span style="font-size:9px;color:var(--tx3);margin-left:4px">Metric:</span>`;
  ['count','cost','mileage'].forEach(m=>{
    h+=`<button class="viz-btn${m===_vizMetric?' va':''}" onclick="_vizMetric='${m}';regenVizSlots(${_vizCounter})">${m.charAt(0).toUpperCase()+m.slice(1)}</button>`;
  });
  h+=`</div>`;
  h+=`<div id="vslots${_vizCounter}"></div>`;
  _vizCounter++;
  return h;
}

function addVizSlot(vizId, barId){
  const vt=VIZ_TYPES.find(v=>v.id===vizId);
  if(!vt||!_vizData)return;
  const container=document.getElementById('vslots'+barId);
  if(!container)return;
  const slot=document.createElement('div');
  slot.className='viz-slot';
  slot.setAttribute('data-viz',vizId);
  const closeBtn=`<div style="text-align:right;margin-bottom:4px"><button class="viz-btn" onclick="this.parentElement.parentElement.remove()" style="color:var(--rd);border-color:var(--rd)">✕ Remove</button></div>`;
  try{
    slot.innerHTML=closeBtn+vt.fn(_vizData,_vizFilters);
  }catch(e){slot.innerHTML=closeBtn+'<p style="color:var(--rd)">Error rendering: '+e.message+'</p>';}
  container.appendChild(slot);
  setTimeout(animKPIs,60);
}

function regenVizSlots(barId){
  const container=document.getElementById('vslots'+barId);
  if(!container)return;
  const slots=[...container.querySelectorAll('.viz-slot')];
  slots.forEach(slot=>{
    const vizId=slot.getAttribute('data-viz');
    const vt=VIZ_TYPES.find(v=>v.id===vizId);
    if(!vt)return;
    const closeBtn=`<div style="text-align:right;margin-bottom:4px"><button class="viz-btn" onclick="this.parentElement.parentElement.remove()" style="color:var(--rd);border-color:var(--rd)">✕ Remove</button></div>`;
    try{slot.innerHTML=closeBtn+vt.fn(_vizData,_vizFilters);}catch(e){slot.innerHTML=closeBtn+'<p style="color:var(--rd)">Error: '+e.message+'</p>';}
  });
  // Update group/metric button states
  const bar=document.getElementById('vbar'+barId);
  if(bar){bar.querySelectorAll('.viz-btn').forEach(b=>{
    const t=b.textContent.trim().toLowerCase();
    if(['part','system','nation','dealer','supplier','nature','month','proj'].includes(t)){
      const gMap={part:'partNM',system:'system',nation:'nation',dealer:'dealer',supplier:'devName',nature:'natName',month:'confMonth',proj:'proj'};
      b.classList.toggle('va',gMap[t]===_vizGroupBy);
    }
    if(['count','cost','mileage'].includes(t))b.classList.toggle('va',t===_vizMetric);
  });}
  setTimeout(animKPIs,60);
}

// ===== V6: ENHANCED MULTI-REGION MAP GENERATOR =====
function genWorldMap(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  const nations=[...new Set(data.map(r=>r.nation))].filter(Boolean);
  let h=`<p><b>🌍 Global Claims Map / Mapa Global</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Total Claims',fN(data.length),'var(--ac)'],['Markets',fN(nations.length),'var(--gn)'],
    ['Regions',fN([...new Set(data.map(r=>r.region))].filter(Boolean).length),'var(--pu)']]);
  // World overview
  h+=mkWorldMap(data,'Global Claims Distribution');
  // USA map
  const usData=data.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=3)h+=mkMap(usData,'United States',false);
  // Mexico map
  const mxData=data.filter(r=>r.nation==='Mexico');
  if(mxData.length>=3)h+=mkMexicoMap(mxData,'México — By Dealer Zone');
  // LATAM map
  const latamData=data.filter(r=>r.region==='Latin America');
  if(latamData.length>=3)h+=mkLatamMap(latamData,'Latin America');
  // Middle East
  const meData=data.filter(r=>r.region==='Middle East');
  if(meData.length>=3)h+=mkMEMap(meData,'Middle East / Medio Oriente');
  // By region table
  const byRegion=ag(data,'region','count');
  if(byRegion.length>1)h+=mkDonut(byRegion,'Claims by Region');
  const byNation=ag(data,'nation','count');
  h+=mkBar(byNation.slice(0,15),'count','Claims by Country');
  // Viz combiner
  _vizData=data;_vizFilters=I.filters;
  h+=`<p style="margin-top:12px;font-size:11px;color:var(--tx2)"><b>🔧 Visualization Studio</b> — Click buttons below to add and combine charts. Change grouping and metric to customize.</p>`;
  h+=vizComboBar(data);
  h+=`<span class="st">Global Map · ${fN(nations.length)} markets · ${fN(data.length)} claims</span>`;
  return h;
}

function genMexicoMap(I){
  const data=flt(gDS(),I.filters).filter(r=>r.nation==='Mexico');
  if(!data.length)return'<p>No Mexico claims found.</p>';
  const rq=(I._rawQuery||'').toLowerCase();
  const hasTemp=/temp|기온/.test(rq);
  const hasRain=/rain|lluvia|precip|강수/.test(rq);
  const ovVar=hasRain?'precip':hasTemp?'temp':null;
  const fd=fdsc(I.filters);
  let h=`<p><b>🇲🇽 México Claims Map / Mapa de México</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  h+=mkKPIs([['Mexico Claims',fN(data.length),'var(--ac)'],['Total Cost',f$(tc),'var(--or)'],
    ['Dealers',fN([...new Set(data.map(r=>r.dealer))].length),'var(--gn)'],
    ['Climate Source','SMN/CONAGUA','var(--tx2)']]);
  h+=mkMexicoMap(data,'México — Claims by State'+(ovVar?' + Climate':''),ovVar?'avgTemp':null);
  // Climate correlation
  const mxMapped=_mxStateData(data);
  if(mxMapped.length>=3){
    h+=mkClimateCorrelation(mxMapped,'avgTemp','Avg Annual Temp (°F)','México: Claims vs Temperature',MX_CLIMATE,MX_NAMES,'_mxSt',{});
    h+=mkClimateCorrelation(mxMapped,'winterTemp','Winter Avg Temp (°F)','México: Claims vs Winter Temp',MX_CLIMATE,MX_NAMES,'_mxSt',{});
    h+=mkClimateCorrelation(mxMapped,'precipIn','Annual Precipitation (in)','México: Claims vs Precipitation',MX_CLIMATE,MX_NAMES,'_mxSt',{});
    h+=mkClimateCorrelation(mxMapped,'humidity','Avg Humidity (%)','México: Claims vs Humidity',MX_CLIMATE,MX_NAMES,'_mxSt',{});
  }
  h+=mkBar(ag(data,'partNM','count').slice(0,10),'count','Top 10 Parts México');
  h+=mkDonut(ag(data,'proj','count'),'Projects');
  // Viz combiner
  _vizData=data;_vizFilters={...I.filters,nation:'Mexico'};
  h+=`<p style="margin-top:10px;font-size:11px;color:var(--tx2)"><b>🔧 Viz Studio</b> — Mix and match charts below:</p>`;
  h+=vizComboBar(data);
  h+=`<span class="st">México · ${fN(data.length)} claims · Climate: SMN/CONAGUA Normals</span>`;
  return h;
}

// ===== V6: ENHANCED ANOMALY WITH GEO + TIME VIEWS =====
function genEnhancedAnomaly(I){
  const data=flt(gDS(),I.filters);const dp={};
  const dealerTotal={},partTotal={};
  for(const r of data){const k=`${r.dealer}||${r.partNM}`;if(!dp[k])dp[k]={dealer:r.dealer,part:r.partNM,count:0,cost:0,vins:new Set(),nation:r.nation,state:r.state,months:{}};dp[k].count++;dp[k].cost+=(r.totalCost||0);dp[k].vins.add(r.vin);
    const m=r.confMonth||'?';dp[k].months[m]=(dp[k].months[m]||0)+1;
    dealerTotal[r.dealer]=(dealerTotal[r.dealer]||0)+1;partTotal[r.partNM]=(partTotal[r.partNM]||0)+1;}
  const total=data.length||1;
  // Un dealer con volumen alto tendrá conteos altos de casi todo por pura
  // exposición; un umbral fijo (>=3) lo marca igual que a un dealer chico
  // con la misma cuenta. En vez de eso: cuánto reclamo de ESTA parte
  // esperaríamos en ESTE dealer si se repartiera proporcional al volumen
  // del dealer y a la prevalencia de la parte en todo el dataset (lambda =
  // dealerTotal*partTotal/total, aproximación Poisson a la hipergeométrica),
  // y qué tan improbable es superarlo (cola superior de Poisson).
  const fl=Object.values(dp).map(d=>{
    const expected=(dealerTotal[d.dealer]||0)*(partTotal[d.part]||0)/total;
    return{...d,expected,p:poissonUpperTail(d.count,expected)};
  }).filter(d=>d.count>=3&&d.p<0.05).sort((a,b)=>a.p-b.p).slice(0,30);
  if(!fl.length)return'<p>No statistically anomalous dealer/part patterns found (p&lt;0.05 vs. expected rate, min. 3 claims).</p>';
  // Build the detailed view
  const fd=fdsc(I.filters);
  let h=`<p><b>🚨 Dealer Anomaly Detection / Detección de Anomalías</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=`<p style="font-size:11px;color:var(--tx2);margin-bottom:8px">Exceso estadístico sobre la tasa esperada (Poisson, p&lt;0.05) dado el volumen del dealer y la prevalencia de la parte — no un umbral de conteo fijo</p>`;
  const critCount=fl.filter(f=>f.p<0.001).length;
  const highCount=fl.filter(f=>f.p>=0.001&&f.p<0.01).length;
  h+=mkKPIs([['Anomalies Found',fN(fl.length),critCount>0?'var(--rd)':'var(--or)'],
    ['Critical (p<.001)',fN(critCount),'var(--rd)'],['High (p<.01)',fN(highCount),'var(--or)'],
    ['Total Cost',f$(fl.reduce((s,f)=>s+f.cost,0)),'var(--yl)']]);
  // Main table
  h+=mkTbl(fl.map(f=>({...f,uv:f.vins.size,flag:f.p<0.001?'🔴 Critical':f.p<0.01?'🟠 High':'🟡 Watch'})),[{l:'Risk',k:'flag',f:v=>v},{l:'Dealer',k:'dealer',f:v=>esc(v)},{l:'Part',k:'part',f:v=>esc(tr(v,25))},{l:'Claims',k:'count',f:v=>`<b>${v}</b>`},{l:'Expected',k:'expected',f:v=>v.toFixed(1)},{l:'p-value',k:'p',f:v=>v<0.001?'<0.001':v.toFixed(3)},{l:'VINs',k:'uv',f:v=>fN(v)},{l:'Cost',k:'cost',f:v=>f$(v)},{l:'Nation',k:'nation',f:v=>esc(v||'')}]);

  // Geographic heatmap — anomaly claims by nation
  const anomalyRecords=[];
  for(const f of fl){
    const recs=data.filter(r=>r.dealer===f.dealer&&r.partNM===f.part);
    anomalyRecords.push(...recs);
  }
  if(anomalyRecords.length>=3){
    // By nation map
    const byNation=ag(anomalyRecords,'nation','count');
    if(byNation.length>1)h+=mkDonut(byNation,'Anomaly Distribution by Market');
    // USA geographic heatmap of anomalies
    const usAnom=anomalyRecords.filter(r=>r.nation==='U.S.A'&&r.state);
    if(usAnom.length>=3)h+=mkMap(usAnom,'USA Anomaly Geographic Heatmap',false);
    // Mexico geographic heatmap
    const mxAnom=anomalyRecords.filter(r=>r.nation==='Mexico');
    if(mxAnom.length>=3)h+=mkMexicoMap(mxAnom,'México Anomaly Heatmap');
    // World view
    if(anomalyRecords.length>=10)h+=mkWorldMap(anomalyRecords,'Global Anomaly Distribution');
    // Dealer × Month heatmap (time dimension)
    const topDealers=fl.slice(0,10);
    const allMonths=[...new Set(anomalyRecords.map(r=>r.confMonth))].filter(Boolean).sort();
    if(allMonths.length>=2&&topDealers.length>=2){
      h+=mkHeat(anomalyRecords.filter(r=>topDealers.some(td=>td.dealer===r.dealer)),'dealer','confMonth','Dealer × Month — Anomaly Timeline');
    }
    // Part × Month heatmap
    const topParts=[...new Set(fl.map(f=>f.part))].slice(0,10);
    if(allMonths.length>=2&&topParts.length>=2){
      h+=mkHeat(anomalyRecords.filter(r=>topParts.includes(r.partNM)),'partNM','confMonth','Anomalous Part × Month Timeline');
    }
  }
  h+=mkTreemap(fl.map(f=>({key:`${f.dealer}: ${tr(f.part,15)}`,value:f.count})),'Anomaly Distribution');
  // Viz combiner
  _vizData=anomalyRecords.length?anomalyRecords:data;_vizFilters=I.filters;
  h+=`<p style="margin-top:10px;font-size:11px;color:var(--tx2)"><b>🔧 Viz Studio</b> — Combine additional views for anomaly data:</p>`;
  h+=vizComboBar(_vizData);
  _lastExport=fl;
  h+=mkExpBtn(fl,'Export Anomalies');
  h+=`<span class="st">Anomaly Detection · ${fN(fl.length)} patterns · ${fN(anomalyRecords.length)} claims</span>`;
  return h;
}

// ===== V6: STANDALONE VIZ STUDIO =====
// Viz Studio presets — one-click chart combos
const VIZ_PRESETS=[
  {id:'overview',label:'📊 Overview',desc:'Bar + Donut + Heatmap',charts:['bar','donut','heatmap']},
  {id:'geographic',label:'🌍 Geographic',desc:'World + USA + México maps',charts:['worldmap','usmap','mxmap']},
  {id:'deep',label:'🔬 Deep Dive',desc:'Pareto + Scatter + Time Heatmap',charts:['pareto','scatter','timeheat']},
  {id:'executive',label:'📋 Executive',desc:'Bar + Donut + Trend + Table',charts:['bar','donut','trend','tbl']},
  {id:'anomaly',label:'🚨 Anomaly Hunt',desc:'Dealer Heat + Scatter + Bar',charts:['dealheat','scatter','bar']},
  {id:'allregions',label:'🗺️ All Regions',desc:'World + LATAM + ME + Canada + Australia',charts:['worldmap','latammap','memap','camap','aumap']},
];

function applyVizPreset(presetId, barId){
  const preset=VIZ_PRESETS.find(p=>p.id===presetId);
  if(!preset||!_vizData)return;
  // Clear existing slots
  const container=document.getElementById('vslots'+barId);
  if(container)container.innerHTML='';
  // Add each chart from the preset
  preset.charts.forEach(vizId=>addVizSlot(vizId,barId));
}

function genVizStudio(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  let h=`<p><b>🎨 Visualization Studio / Estudio de Visualización</b>${fd?' | '+fd:''} | ${dsl()} (${fN(data.length)} claims)</p>`;
  h+=`<p style="font-size:11px;color:var(--tx2);margin-bottom:6px">Click a <b>preset</b> for instant chart combos, or build your own by clicking individual chart buttons. Change grouping and metric to customize. Remove any chart with ✕.</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)'],['Cost',f$(data.reduce((s,r)=>s+(r.totalCost||0),0)),'var(--or)'],
    ['Parts',fN([...new Set(data.map(r=>r.partNM))].length),'var(--pu)'],['Markets',fN([...new Set(data.map(r=>r.nation))].length),'var(--gn)']]);
  _vizData=data;_vizFilters=I.filters;
  // Presets bar
  const nextBar=_vizCounter;
  h+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0"><span style="font-size:10px;color:var(--tx3);align-self:center">Presets:</span>`;
  VIZ_PRESETS.forEach(p=>{
    h+=`<button class="viz-btn" onclick="applyVizPreset('${p.id}',${nextBar})" title="${p.desc}" style="background:var(--acd);border-color:var(--ac)">${p.label}</button>`;
  });
  h+=`</div>`;
  h+=vizComboBar(data);
  h+=`<span class="st">Viz Studio · ${fN(data.length)} claims</span>`;
  return h;
}

