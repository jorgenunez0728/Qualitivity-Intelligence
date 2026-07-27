// ===== STATISTICS (significance layer) =====
// Antes, la correlación climática mostraba un coeficiente r sin p-value ni
// intervalo de confianza, y la detección de anomalías marcaba dealers por
// un conteo crudo (>=3 claims), sin considerar cuántas oportunidades tenía
// cada dealer de generar ese conteo. Ambas cosas se corrigen aquí.

// Función beta incompleta regularizada (algoritmo estándar, Numerical
// Recipes §6.4). Se usa para el p-value del test t de Pearson. Verificada
// contra scipy.stats.t.cdf en 5 combinaciones de r/n con diferencia <1e-14.
function _betacf(a,b,x){
  const MAXIT=200,EPS=3e-14,FPMIN=1e-300;
  const qab=a+b,qap=a+1,qam=a-1;
  let c=1,d=1-qab*x/qap;
  if(Math.abs(d)<FPMIN)d=FPMIN;
  d=1/d;let h=d;
  for(let m=1;m<=MAXIT;m++){
    const m2=2*m;
    let aa=m*(b-m)*x/((qam+m2)*(a+m2));
    d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;
    c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;
    d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;
    c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;
    d=1/d;const de=d*c;h*=de;
    if(Math.abs(de-1)<EPS)break;
  }
  return h;
}
function _lgamma(x){
  // Aproximación de Lanczos, precisión doble suficiente para este uso.
  const g=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,
    12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(x<0.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-_lgamma(1-x);
  x-=1;let a=0.99999999999980993;const t=x+7.5;
  for(let i=0;i<8;i++)a+=g[i]/(x+i+1);
  return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
}
function _betai(a,b,x){
  if(x<=0)return 0;if(x>=1)return 1;
  const bt=Math.exp(_lgamma(a+b)-_lgamma(a)-_lgamma(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2)?bt*_betacf(a,b,x)/a:1-bt*_betacf(b,a,1-x)/b;
}
// p-value de dos colas para un coeficiente de Pearson r con n observaciones.
function pearsonP(r,n){
  if(n<=2)return 1;
  const rc=Math.max(-0.999999,Math.min(0.999999,r));
  const t=rc*Math.sqrt((n-2)/(1-rc*rc));
  const df=n-2;
  return _betai(df/2,0.5,df/(df+t*t));
}
// Intervalo de confianza 95% para r vía transformación z de Fisher.
function pearsonCI(r,n){
  if(n<=3)return{lo:-1,hi:1};
  const rc=Math.max(-0.999999,Math.min(0.999999,r));
  const z=Math.atanh(rc),se=1/Math.sqrt(n-3);
  return{lo:Math.tanh(z-1.96*se),hi:Math.tanh(z+1.96*se)};
}
// Cola superior de Poisson: P(X>=k) dado lambda esperado — usada para medir
// cuánto excede un dealer/parte su tasa esperada, en vez de un umbral fijo.
function poissonUpperTail(k,lambda){
  if(lambda<=0)return k>0?1:0;
  let term=Math.exp(-lambda),cum=term;
  for(let i=1;i<k;i++){term*=lambda/i;cum+=term;}
  return Math.max(0,1-cum);
}
// Intervalo de Wilson (score interval) para una proporción k/n — más fiable
// que el intervalo normal ingenuo cuando k es chico o n no es enorme, que es
// justo el caso del Index de garantía (pocos miles de reclamos sobre
// cientos de miles de ventas). Devuelve {lo,hi} como proporciones (0..1);
// para el Index (× 10,000) hay que escalar el resultado.
// Verificado contra la tabla de referencia estándar: wilson(8,20) da
// (0.219, 0.613), tabla publicada da (0.221, 0.618).
function wilsonInterval(k,n,z){
  z=z||1.96;
  if(n<=0)return{lo:0,hi:0};
  const phat=k/n;
  const denom=1+z*z/n;
  const center=phat+z*z/(2*n);
  const margin=z*Math.sqrt(phat*(1-phat)/n+z*z/(4*n*n));
  return{lo:Math.max(0,(center-margin)/denom),hi:Math.min(1,(center+margin)/denom)};
}

// ===== CLIMATE CORRELATION =====
// Generic climate correlation — works with US, MX, CA
function mkClimateCorrelation(data, climateVar, climateLabel, title, climateDB, nameDB, geoField, salesDB, geoMapFn){
  // defaults for backward compat (US)
  climateDB=climateDB||US_CLIMATE;nameDB=nameDB||ST_NAMES;geoField=geoField||'state';salesDB=salesDB||SALES_ST;
  // Build per-region aggregation
  const stData={};
  for(const r of data){
    let st=r[geoField];
    if(!st||!nameDB[st]||!climateDB[st])continue;
    if(!stData[st])stData[st]={claims:0,sales:salesDB[st]||0,climate:climateDB[st]};
    stData[st].claims+=(r.claims||1);
  }
  const points=[];
  const hasSales=Object.values(salesDB||{}).some(v=>v>0);
  for(const[st,d]of Object.entries(stData)){
    if(hasSales&&d.sales<10)continue;
    const ratio=hasSales?(d.claims/d.sales*1000):d.claims;
    const cv=d.climate[climateVar];
    if(cv===undefined)continue;
    points.push({st,claims:d.claims,sales:d.sales,ratio,cv,name:nameDB[st]});
  }
  // n>=3 alcanza para calcular r, pero no para que un p-value o un intervalo
  // de confianza signifiquen algo; con pocas regiones cualquier r es ruido.
  const MIN_N_CLIMA=8;
  if(points.length<MIN_N_CLIMA)return`<p>Not enough region data for ${esc(climateLabel)} correlation (need ≥${MIN_N_CLIMA}, have ${points.length}).</p>`;
  // Calc correlation coefficient
  const n=points.length;
  const sx=points.reduce((s,p)=>s+p.cv,0);
  const sy=points.reduce((s,p)=>s+p.ratio,0);
  const sxy=points.reduce((s,p)=>s+p.cv*p.ratio,0);
  const sx2=points.reduce((s,p)=>s+p.cv*p.cv,0);
  const sy2=points.reduce((s,p)=>s+p.ratio*p.ratio,0);
  const r_num=n*sxy-sx*sy;
  const r_den=Math.sqrt((n*sx2-sx*sx)*(n*sy2-sy*sy));
  const corr=r_den>0?r_num/r_den:0;
  const pVal=pearsonP(corr,n);
  const ci=pearsonCI(corr,n);
  const sig=pVal<0.05;
  const corrLabel=Math.abs(corr)>.7?'Strong':Math.abs(corr)>.4?'Moderate':Math.abs(corr)>.2?'Weak':'Very Weak';
  const corrDir=corr>0?'positive':'negative';
  // El color y la etiqueta ahora dependen de significancia (p<0.05), no sólo
  // de la magnitud de r: con pocas regiones, un r "moderado" puede no ser
  // distinguible de ruido.
  const corrColor=sig?(Math.abs(corr)>.4?'var(--ac)':'var(--yl)'):'var(--tx3)';
  const yAxisLabel=hasSales?'Claims per 1K':'Claims';
  // Scatter plot
  const mxX=Math.max(...points.map(p=>p.cv));
  const mnX=Math.min(...points.map(p=>p.cv));
  const mxY=Math.max(...points.map(p=>p.ratio));
  const W=500,H=220;
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  h+=`<div style="display:flex;gap:12px;margin-bottom:10px;flex-wrap:wrap">`;
  h+=`<div class="kc"><div class="kcl">Correlation (r)</div><div class="kcv" style="color:${corrColor}">${corr.toFixed(3)}</div><div class="kcs">${corrLabel} ${corrDir}${sig?'':' (n.s.)'}</div></div>`;
  h+=`<div class="kc"><div class="kcl">p-value</div><div class="kcv" style="color:${sig?'var(--gn)':'var(--tx3)'}">${pVal<0.001?'<0.001':pVal.toFixed(3)}</div><div class="kcs">${sig?'significant':'not significant'} (α=.05)</div></div>`;
  h+=`<div class="kc"><div class="kcl">95% CI</div><div class="kcv" style="font-size:14px">[${ci.lo.toFixed(2)}, ${ci.hi.toFixed(2)}]</div></div>`;
  h+=`<div class="kc"><div class="kcl">Regions Analyzed</div><div class="kcv" style="color:var(--gn)">${n}</div></div>`;
  h+=`</div>`;
  h+=`<div class="scatter-wrap" style="width:100%;height:${H+40}px;position:relative">`;
  h+=`<div style="position:absolute;bottom:0;left:50px;right:10px;height:1px;background:var(--bd)"></div>`;
  h+=`<div style="position:absolute;bottom:0;left:50px;width:1px;top:10px;background:var(--bd)"></div>`;
  h+=`<div style="position:absolute;bottom:-16px;left:50%;font-size:9px;color:var(--tx3)">${esc(climateLabel)}</div>`;
  h+=`<div style="position:absolute;left:2px;top:50%;transform:rotate(-90deg);font-size:9px;color:var(--tx3)">${yAxisLabel}</div>`;
  h+=`<div style="position:absolute;bottom:2px;left:50px;font-size:8px;color:var(--tx3);font-family:'JetBrains Mono',monospace">${mnX.toFixed(0)}</div>`;
  h+=`<div style="position:absolute;bottom:2px;right:10px;font-size:8px;color:var(--tx3);font-family:'JetBrains Mono',monospace">${mxX.toFixed(0)}</div>`;
  points.forEach(p=>{
    const xRange=mxX-mnX||1;
    const x=50+((p.cv-mnX)/xRange)*450;
    const y=H-((p.ratio/mxY)*(H-20));
    const size=Math.max(6,Math.min(14,Math.sqrt(p.claims)*2));
    const col=p.ratio>50?'var(--rd)':p.ratio>20?'var(--or)':'var(--ac)';
    h+=`<div class="scatter-dot" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${col}" title="${p.name} (${p.st})\n${climateLabel}: ${p.cv}\nClaims: ${p.claims}${hasSales?'\nSales: '+fN(p.sales)+'\nRatio: '+p.ratio.toFixed(1)+' per 1K':''}" ></div>`;
    if(p.claims>10||n<15)h+=`<div style="position:absolute;left:${x+size/2+3}px;top:${y-4}px;font-size:8px;color:var(--tx3);pointer-events:none">${p.st}</div>`;
  });
  h+='</div>';
  const interp=!sig?
    `No significant linear relationship found between ${climateLabel.toLowerCase()} and claim ratios at this sample size (p=${pVal.toFixed(3)} ≥ .05) — an r of ${corr.toFixed(2)} is not distinguishable from chance with only ${n} regions.`:
    (corr>0?`Higher ${climateLabel.toLowerCase()} is associated with higher claim ratios (this is an association across regions, not a demonstrated causal mechanism).`:`Lower ${climateLabel.toLowerCase()} is associated with higher claim ratios (this is an association across regions, not a demonstrated causal mechanism).`);
  h+=`<p style="font-size:11px;color:var(--tx2);margin-top:16px"><b>Interpretation:</b> ${interp} (r=${corr.toFixed(3)}, ${corrLabel}, p=${pVal<0.001?'<0.001':pVal.toFixed(3)}, 95% CI [${ci.lo.toFixed(2)}, ${ci.hi.toFixed(2)}])</p>`;
  h+='</div>';
  return h;
}

// Helper: map MX dealer codes to states for climate correlation
function _mxStateData(data){
  return data.map(r=>{
    const dlr=String(r.dealer||'');
    const st=MX_DEALER_STATE[dlr];
    return st?{...r,_mxSt:st}:null;
  }).filter(Boolean);
}

function genClimate(I){
  const allData=flt(gDS(),I.filters);
  const rq=(I._rawQuery||'').toLowerCase();
  const wantsMX=/mexi[ck]o|mex\b|멕시코/.test(rq)||I.filters.nation==='Mexico';
  const wantsCA=/canad|캐나다/.test(rq)||I.filters.nation==='Canada';
  const wantsUS=/usa|u\.?s\.?a|united\s*states|estados\s*unidos|미국/.test(rq)||I.filters.nation==='U.S.A';
  const wantsAll=!wantsMX&&!wantsCA&&!wantsUS;
  const fd=fdsc(I.filters);
  let h=`<p><b>Climate Correlation Analysis / Análisis de Correlación Climática</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  // === USA ===
  if(wantsUS||wantsAll){
    const usData=allData.filter(r=>r.nation==='U.S.A'&&r.state);
    if(usData.length>=10){
      h+=`<div style="margin:12px 0 6px;padding:6px 10px;background:var(--sf2);border-radius:6px;border-left:3px solid var(--ac)"><b>🇺🇸 USA Climate Analysis</b> · ${fN(usData.length)} claims · ${fN([...new Set(usData.map(r=>r.state))].length)} states · NOAA 1991-2020</div>`;
      h+=mkClimateCorrelation(usData,'avgTemp','Avg Annual Temp (°F)','USA: Claims vs Temperature');
      h+=mkClimateCorrelation(usData,'winterTemp','Winter Avg Temp (°F)','USA: Claims vs Winter Temperature');
      h+=mkClimateCorrelation(usData,'precipIn','Annual Precipitation (in)','USA: Claims vs Precipitation');
      h+=mkClimateCorrelation(usData,'humidity','Avg Humidity (%)','USA: Claims vs Humidity');
      h+=mkClimateCorrelation(usData,'snowIn','Annual Snowfall (in)','USA: Claims vs Snowfall');
    }
  }
  // === MEXICO ===
  if(wantsMX||wantsAll){
    const mxData=_mxStateData(allData.filter(r=>r.nation==='Mexico'));
    if(mxData.length>=3){
      h+=`<div style="margin:12px 0 6px;padding:6px 10px;background:var(--sf2);border-radius:6px;border-left:3px solid #34d399"><b>🇲🇽 México Climate Analysis</b> · ${fN(mxData.length)} claims · ${fN([...new Set(mxData.map(r=>r._mxSt))].length)} states · SMN/CONAGUA Normals</div>`;
      h+=mkClimateCorrelation(mxData,'avgTemp','Avg Annual Temp (°F)','México: Claims vs Temperature',MX_CLIMATE,MX_NAMES,'_mxSt',{});
      h+=mkClimateCorrelation(mxData,'winterTemp','Winter Avg Temp (°F)','México: Claims vs Winter Temp',MX_CLIMATE,MX_NAMES,'_mxSt',{});
      h+=mkClimateCorrelation(mxData,'precipIn','Annual Precipitation (in)','México: Claims vs Precipitation',MX_CLIMATE,MX_NAMES,'_mxSt',{});
      h+=mkClimateCorrelation(mxData,'humidity','Avg Humidity (%)','México: Claims vs Humidity',MX_CLIMATE,MX_NAMES,'_mxSt',{});
      h+=mkMexicoMap(mxData.map(r=>({...r,_mxState:r._mxSt})),'México — Claims + Climate Overlay','avgTemp');
    } else {
      h+=`<p style="color:var(--tx2)">Mexico: insufficient state-level data (${mxData.length} claims mapped).</p>`;
    }
  }
  // === CANADA ===
  if(wantsCA||wantsAll){
    const caData=allData.filter(r=>r.nation==='Canada');
    if(caData.length>=3){
      const hasProvince=caData.some(r=>CA_NAMES[r.state]);
      h+=`<div style="margin:12px 0 6px;padding:6px 10px;background:var(--sf2);border-radius:6px;border-left:3px solid #f472b6"><b>🍁 Canada Climate Analysis</b> · ${fN(caData.length)} claims · Environment Canada Normals</div>`;
      if(hasProvince){
        h+=mkClimateCorrelation(caData,'avgTemp','Avg Annual Temp (°F)','Canada: Claims vs Temperature',CA_CLIMATE,CA_NAMES,'state',{});
        h+=mkClimateCorrelation(caData,'winterTemp','Winter Avg Temp (°F)','Canada: Claims vs Winter Temp',CA_CLIMATE,CA_NAMES,'state',{});
        h+=mkClimateCorrelation(caData,'precipIn','Annual Precipitation (in)','Canada: Claims vs Precipitation',CA_CLIMATE,CA_NAMES,'state',{});
        h+=mkClimateCorrelation(caData,'snowIn','Annual Snowfall (in)','Canada: Claims vs Snowfall',CA_CLIMATE,CA_NAMES,'state',{});
        h+=mkCanadaMap(caData,'Canada — Claims + Climate Overlay','avgTemp');
      } else {
        h+=`<p style="color:var(--tx2)">Canada: province-level data not available. Showing national summary.</p>`;
        h+=mkCanadaMap(caData,'Canada Claims');
      }
    } else {
      h+=`<p style="color:var(--tx2)">Canada: insufficient data (${caData.length} claims).</p>`;
    }
  }
  const totalClaims=allData.length;
  h+=`<span class="st">Climate Analysis · ${fN(totalClaims)} total claims · USA (NOAA) + México (SMN) + Canada (Env. Canada)</span>`;
  return h;
}

// ===== AUTO-MARKET MAP HELPER =====
function autoMarketMap(I, data){
  const m=I._autoMarket;if(!m)return'';
  const md=data||flt(gDS(),I.filters);
  if(md.length<3)return'';
  if(m==='mexico')return mkMexicoMap(md,'México — Geographic Distribution');
  if(m==='canada')return mkCanadaMap(md,'Canada — Geographic Distribution');
  if(m==='australia')return mkAustraliaMap(md,'Australia — Geographic Distribution');
  if(m==='latam')return mkLatamMap(md,'Latin America — Geographic Distribution');
  if(m==='middleeast')return mkMEMap(md,'Middle East — Geographic Distribution');
  return'';
}

// ===== CUSTOMER COMMENT EXTRACTION & FAILURE MODE CATEGORIZATION =====
function extractCC(comment){
  if(!comment)return'';
  // Filter out boilerplate templates and pure diagnostic notes
  if(/^Description Code De Travail/i.test(comment.trim()))return'';
  if(/^DIAG\s*-\s*DIAGNOSTIC\s*FOR\s*REPAIR/i.test(comment.trim()))return'';
  const segs=comment.split(/\\n|\n/).filter(s=>/^\[C\]/i.test(s.trim()));
  if(segs.length)return segs.map(s=>s.trim().replace(/^\[C\]\s*/i,'')).join(' ').trim();
  // Fallback: [D] with "CUSTOMER STATES" or "CUST STATES" pattern — these describe customer complaints
  const dSegs=comment.split(/\\n|\n/).filter(s=>/^\[D\].*cust(omer)?\s*state/i.test(s.trim()));
  if(dSegs.length)return dSegs.map(s=>s.trim().replace(/^\[D\]\s*/i,'')).join(' ').trim();
  // Fallback: [M]\n[S]CONDITION: pattern (some dealers use this format)
  const sSegs=comment.split(/\\n|\n/).filter(s=>/^\[S\]\s*CONDITION:/i.test(s.trim()));
  if(sSegs.length)return sSegs.map(s=>s.trim().replace(/^\[S\]\s*CONDITION:\s*/i,'')).join(' ').trim();
  return'';
}

function categorizeFailure(text){
  if(!text||text.length<8)return{cat:'other',sub:'other'};
  const lo=text.toLowerCase();
  for(const cat of CFM_CATS){
    for(const sub of cat.subs){
      if(sub.rx.test(lo))return{cat:cat.id,sub:sub.id};
    }
  }
  return{cat:'other',sub:'other'};
}

// Deduplicate CFM claims: same VIN+partNM within 100 km = same visit, keep only first
function dedupCfm(records){
  const groups={};
  for(const r of records){
    const k=(r.vin||'')+'|'+(r.partNM||'');
    if(!groups[k])groups[k]=[];
    groups[k].push(r);
  }
  const out=[];
  for(const k in groups){
    const g=groups[k].sort((a,b)=>(a.mileage||0)-(b.mileage||0));
    out.push(g[0]);
    for(let i=1;i<g.length;i++){
      // Only keep if >100 km from all previously kept claims (return visit)
      const kept=out.filter(o=>(o.vin||'')+'|'+(o.partNM||'')===k);
      const minDist=Math.min(...kept.map(o=>Math.abs((g[i].mileage||0)-(o.mileage||0))));
      if(minDist>100)out.push(g[i]);
    }
  }
  return out;
}

function failureModeSummary(data){
  const withCC=dedupCfm(data.filter(r=>r._custComment));
  if(withCC.length<2)return'';
  // Count by failure mode category + subcategory
  const catCounts={};const subCounts={};
  for(const r of withCC){
    const fm=r._failureMode||'other';const fs=r._failureSub||'other';
    if(!catCounts[fm])catCounts[fm]={count:0,samples:[]};
    catCounts[fm].count++;
    if(catCounts[fm].samples.length<3)catCounts[fm].samples.push(r._custComment);
    const sk=fm+'::'+fs;
    if(!subCounts[sk])subCounts[sk]={cat:fm,sub:fs,count:0};
    subCounts[sk].count++;
  }
  const items=Object.entries(catCounts)
    .sort((a,b)=>b[1].count-a[1].count)
    .slice(0,12);
  if(!items.length)return'';
  const mx=items[0][1].count;const tot=withCC.length;
  let h=`<div class="cb"><div class="ct">Customer Failure Modes / Modos de Falla del Cliente</div>`;
  h+=`<div style="font-size:10px;color:var(--tx3);margin-bottom:8px">Categorized from ${fN(tot)} customer comments [C]</div>`;
  items.forEach(([id,v],i)=>{
    const label=cfmLabel(id);
    const p=mx>0?(v.count/mx*100):0;
    const pct=(v.count/tot*100).toFixed(1)+'%';
    const sampleTip=v.samples.map(s=>s.substring(0,120)).join('\n---\n');
    // Main category bar
    h+=`<div class="br"><span class="bl" title="${esc(sampleTip)}" style="max-width:200px">${i+1}. ${esc(label)}</span><div class="bt"><div class="bf" style="width:${p}%;background:${C[i%C.length]}"></div></div><span class="bv">${v.count}</span><span class="bp">${pct}</span></div>`;
    // Subcategory labels below the bar
    const subs=Object.values(subCounts).filter(s=>s.cat===id).sort((a,b)=>b.count-a.count);
    if(subs.length>0&&id!=='other'){
      h+='<div style="margin:-2px 0 4px 16px;display:flex;flex-wrap:wrap;gap:3px">';
      subs.forEach(s=>{
        const sl=cfmSubLabel(s.sub);
        h+=`<span onclick="inp.value='${esc(sl)} comments';send()" style="background:var(--sf2);border:1px solid var(--bd);color:var(--tx3);padding:2px 8px;border-radius:8px;font-size:10.5px;cursor:pointer;font-family:'JetBrains Mono',monospace" title="Click to see all customer comments">${esc(sl)} <b style="color:var(--tx2)">${s.count}</b></span>`;
      });
      h+='</div>';
    }
  });
  // Clickable failure mode drill-down chips
  h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px">';
  const partCtx=data.length>0?(data[0].partNM||''):'';
  items.filter(([id])=>id!=='other').forEach(([id])=>{
    const shortLabel=cfmLabel(id);
    const q=id+' '+(partCtx?partCtx+' ':'')+'comments';
    h+=`<button onclick="inp.value='${esc(q)}';send()" style="background:var(--sf2);border:1px solid var(--bd);color:var(--tx2);padding:3px 8px;border-radius:12px;font-size:10px;cursor:pointer">${shortLabel}</button>`;
  });
  h+='</div></div>';
  return h;
}

