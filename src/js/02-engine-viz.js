// ===== DATA HELPERS =====
function flt(data,filters){
  return data.filter(r=>{
    for(const[k,v]of Object.entries(filters)){
      if(k==='_sysCategory'){
        const cfg=SYS_CAT[v];if(!cfg)continue;
        const nm=(r.partNM||'').toUpperCase();
        const sys=r.system||'';
        const nat=(r.natName||'').toLowerCase();
        const matchSys=cfg.systems.length===0||cfg.systems.includes(sys);
        const matchPart=cfg.parts?cfg.parts.test(nm):false;
        const matchNat=cfg.kw.test(nat);
        if(!matchSys&&!matchPart&&!matchNat)return false;
      }
      else if(k==='_hvac'){
        const nm=(r.partNM||'').toUpperCase();
        const nat=(r.natName||'').toLowerCase();
        const isHvac=/heater|blower|compressor|evaporator|condenser|a\/c|hvac|clima|cool|thermal/.test(nm.toLowerCase())||/cool|heat|a\/c|hvac|clima|temperature/.test(nat);
        if(!isHvac)return false;
      }
      else if(k==='_months'){
        // Level 5B: temporal month filter (array of YYYY-MM)
        if(Array.isArray(v)&&!v.includes(r.confMonth))return false;
      }
      else if(k==='_natSearch'){
        // Failure mode / symptom text search — match any term in natName or comment
        const nat=(r.natName||'').toLowerCase();
        const com=(r.comment||'').toLowerCase();
        const matched=v.some(term=>nat.includes(term)||com.includes(term));
        if(!matched)return false;
      }
      else if(k==='_failureMode'){
        if(r._failureMode!==v)return false;
      }
      else if(k==='_failureSub'){
        if(r._failureSub!==v)return false;
      }
      else if(k==='partNM'){if(!r.partNM||!r.partNM.toUpperCase().includes(v.toUpperCase()))return false;}
      else if(k.startsWith('!')){
        // Level 5A: negation filter
        const realKey=k.slice(1);
        if(Array.isArray(v)){if(v.includes(r[realKey]))return false;}
        else if(r[realKey]===v)return false;
      }
      else if(k.startsWith('_'))continue;
      else if(Array.isArray(v)){
        // Level 5A: compound OR filter
        if(!v.includes(r[k]))return false;
      }
      else if(r[k]!==v)return false;
    }
    return true;
  });
}

function ag(data,gBy,metric){
  const g={};
  for(const r of data){
    const k=r[gBy]||'Unknown';
    if(!g[k])g[k]={count:0,cost:0,mileage:0,n:0,pCost:0,lCost:0};
    g[k].count+=(r.claims||1);g[k].cost+=(r.totalCost||0);
    g[k].pCost+=(r.partCost||0);g[k].lCost+=(r.laborCost||0);
    g[k].mileage+=(r.mileage||0);g[k].n++;
  }
  for(const k in g){g[k].avgM=g[k].n>0?g[k].mileage/g[k].n:0;g[k].avgC=g[k].n>0?g[k].cost/g[k].n:0;}
  const vk=metric==='cost'?'cost':metric==='mileage'?'avgM':'count';
  const res=Object.entries(g).map(([key,v])=>({key,value:v[vk],...v})).sort((a,b)=>b.value-a.value);
  // Remap _failureMode/_failureSub IDs to human-readable labels
  if(gBy==='_failureMode')res.forEach(r=>{r.key=cfmLabel(r.key);});
  if(gBy==='_failureSub')res.forEach(r=>{r.key=cfmSubLabel(r.key);});
  if(gBy==='causeCode')res.forEach(r=>{if(CAUSE_CODES[r.key])r.key=r.key+' — '+CAUSE_CODES[r.key];});
  return res;
}

function fdsc(f){return Object.entries(f).filter(([k])=>!k.startsWith('_')||k==='_natSearch'||k==='_failureMode'||k==='_failureSub').map(([k,v])=>k==='_natSearch'?`symptom=${v.join('|')}`:k==='_failureMode'?`mode=${cfmLabel(v)}`:k==='_failureSub'?`sub=${cfmSubLabel(v)}`:`${k}=${v}`).join(', ');}
function dsl(){return aDS==='all'?'All':'Sheet '+aDS;}

// ===== VIZ BUILDERS =====
function mkBar(items,metric,title,rawData){
  if(!items.length)return'<p>No data.</p>';
  const mx=Math.max(...items.map(x=>x.value));
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  const tot=items.reduce((s,x)=>s+x.value,0);
  items.forEach((it,i)=>{
    const p=mx>0?Math.max(it.value/mx*100,4):0;
    const vs=metric==='cost'?f$(it.value):fN(it.value,metric==='mileage'?0:0);
    const spk=rawData?mkSpk(rawData,'partNM',it.key):'';
    h+=`<div class="br br-click" style="animation-delay:${i*0.05}s" onclick="drill('partNM','${esc(it.key).replace(/'/g,"\\'")}')" title="Click to drill into ${esc(it.key)}"><span class="bl" title="${esc(it.key)}">${i+1}. ${esc(tr(it.key,22))}</span>${spk}<div class="bt"><div class="bf" style="--tw:${p}%;width:${p}%;background:${C[i%C.length]};animation-delay:${i*0.06}s"></div></div><span class="bv">${vs}</span><span class="bp">${pc(it.value,tot)}</span></div>`;
  });
  h+='</div>';return h;
}

function mkTbl(items,cols){
  let h='<div class="tw"><table><thead><tr>';
  cols.forEach(c=>h+=`<th>${esc(c.l)}</th>`);
  h+='</tr></thead><tbody>';
  items.forEach(it=>{h+='<tr>';cols.forEach(c=>h+=`<td>${c.f?c.f(it[c.k],it):esc(String(it[c.k]??''))}</td>`);h+='</tr>';});
  h+='</tbody></table></div>';return h;
}

function mkHeat(data,rF,cF,title){
  const _fmMap=k=>(rF==='_failureMode'||cF==='_failureMode')?cfmLabel(k):(rF==='_failureSub'||cF==='_failureSub')?cfmSubLabel(k):k;
  const rows=[...new Set(data.map(r=>r[rF]))].filter(Boolean).sort();
  const cols=[...new Set(data.map(r=>r[cF]))].filter(Boolean).sort();
  if(!rows.length||!cols.length)return'';
  const grid={};let mx=0;
  for(const r of data){const rk=r[rF],ck=r[cF];if(!rk||!ck)continue;const k=rk+'||'+ck;grid[k]=(grid[k]||0)+(r.claims||1);if(grid[k]>mx)mx=grid[k];}
  let h=`<div class="cb"><div class="ct">${esc(title)}</div><div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><div class="hmg" style="grid-template-columns:100px repeat(${cols.length},minmax(32px,1fr));min-width:${Math.max(300,cols.length*36+100)}px">`;
  h+='<div class="hmh"></div>';
  cols.forEach(c=>h+=`<div class="hmh">${esc(tr(_fmMap(c),12))}</div>`);
  rows.forEach(row=>{
    h+=`<div class="hmh" style="text-align:right;padding-right:6px">${esc(tr(_fmMap(row),20))}</div>`;
    cols.forEach(col=>{
      const v=grid[row+'||'+col]||0;
      const ci=mx>0?Math.min(Math.floor(v/mx*10),10):0;
      const bg=HC[ci];const fg=ci>4?'#fff':'var(--tx3)';
      h+=`<div class="hmc" style="background:${bg};color:${fg};animation-delay:${(rows.indexOf(row)*0.03+cols.indexOf(col)*0.02).toFixed(2)}s" title="${esc(row)} × ${esc(col)}: ${v}">${v||''}</div>`;
    });
  });
  h+='</div></div></div>';return h;
}

function mkPareto(items,title){
  if(!items.length)return'';
  const tot=items.reduce((s,x)=>s+x.value,0);
  let cum=0;const mx=items[0].value;
  let h=`<div class="cb"><div class="ct">${esc(title)} — Pareto</div>`;
  items.forEach((it,i)=>{
    cum+=it.value;const p=mx>0?Math.max(it.value/mx*100,4):0;const cp=tot>0?(cum/tot*100):0;
    h+=`<div class="br" style="animation-delay:${i*0.05}s"><span class="bl">${esc(tr(it.key,24))}</span><div class="bt" style="position:relative"><div class="bf" style="--tw:${p}%;width:${p}%;background:${C[i%C.length]};animation-delay:${i*0.06}s"></div><div style="position:absolute;right:4px;top:2px;font-size:9px;color:var(--yl);font-family:'JetBrains Mono',monospace">${cp.toFixed(0)}%</div></div><span class="bv">${fN(it.value)}</span></div>`;
  });
  let c80=0,n80=0;for(const it of items){c80+=it.value;n80++;if(c80/tot>=.8)break;}
  h+=`<p style="font-size:11px;color:var(--yl);margin-top:8px">⚡ ${n80} of ${items.length} items = 80% (${fN(c80)} / ${fN(tot)})</p></div>`;
  return h;
}

function mkDonut(items,title){
  if(!items.length)return'';
  const tot=items.reduce((s,x)=>s+x.value,0);
  const t8=items.slice(0,8);const ov=items.slice(8).reduce((s,x)=>s+x.value,0);
  if(ov>0)t8.push({key:'Others',value:ov});
  const R=42,CX=60,CY=60,CIRC=2*Math.PI*R;
  let svg=`<svg viewBox="0 0 120 120" width="140" height="140">`;
  let offset=0;
  t8.forEach((it,i)=>{
    const frac=tot>0?it.value/tot:0;
    const len=frac*CIRC;
    svg+=`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${C[i%C.length]}" stroke-width="16" stroke-dasharray="${len} ${CIRC-len}" stroke-dashoffset="${-offset}" opacity=".85" style="transform:rotate(-90deg);transform-origin:center;animation:sweepIn .8s cubic-bezier(.25,.8,.25,1) ${i*0.1}s both;--sl:${CIRC}"/>`;
    offset+=len;
  });
  svg+=`<circle cx="${CX}" cy="${CY}" r="28" fill="var(--sf2)"/><text x="${CX}" y="58" text-anchor="middle" fill="var(--tx)" font-size="16" font-weight="700" font-family="JetBrains Mono">${fN(tot)}</text><text x="${CX}" y="72" text-anchor="middle" fill="var(--tx3)" font-size="9">claims</text></svg>`;
  let lg='<div class="dl">';
  t8.forEach((it,i)=>lg+=`<div class="di"><div class="dd" style="background:${C[i%C.length]}"></div>${esc(tr(it.key,25))} <span style="color:var(--tx3);font:10px 'JetBrains Mono',monospace">${it.value} (${pc(it.value,tot)})</span></div>`);
  lg+='</div>';
  return`<div class="cb"><div class="ct">${esc(title)}</div><div class="dc">${svg}${lg}</div></div>`;
}

function mkScatter(data,title){
  if(!data.length)return'';
  const sub=data.slice(0,250);
  const mxM=Math.max(...sub.map(r=>r.mileage||0),1);
  const mxC=Math.max(...sub.map(r=>r.totalCost||0),1);
  const H=200;const pc2={'CL4':'#38bdf8','NX4M':'#a78bfa','BL7M':'#34d399'};
  let h=`<div class="cb"><div class="ct">${esc(title)}</div><div class="scatter-wrap" style="width:100%;height:${H+40}px;position:relative">`;
  h+=`<div style="position:absolute;bottom:0;left:50px;right:10px;height:1px;background:var(--bd)"></div>`;
  h+=`<div style="position:absolute;bottom:0;left:50px;width:1px;top:10px;background:var(--bd)"></div>`;
  h+=`<div style="position:absolute;bottom:-16px;left:50%;font-size:10px;color:var(--tx3)">Mileage (km)</div>`;
  h+=`<div style="position:absolute;left:2px;top:50%;transform:rotate(-90deg);font-size:10px;color:var(--tx3)">Cost (USD)</div>`;
  // X-axis tick labels (mileage)
  for(let i=0;i<=4;i++){const v=Math.round(mxM*i/4);const x=50+(i/4)*450;h+=`<div style="position:absolute;bottom:-12px;left:${x}px;transform:translateX(-50%);font:9px 'JetBrains Mono',monospace;color:var(--tx3)">${v>=1000?Math.round(v/1000)+'k':v}</div>`;}
  // Y-axis tick labels (cost)
  for(let i=1;i<=4;i++){const v=Math.round(mxC*i/4);const y=H-((i/4)*(H-20));h+=`<div style="position:absolute;left:0;top:${y-5}px;font:9px 'JetBrains Mono',monospace;color:var(--tx3);text-align:right;width:46px">${v>=1000?'$'+Math.round(v/1000)+'k':'$'+v}</div>`;}
  sub.forEach((r,idx)=>{
    const x=50+((r.mileage||0)/mxM)*450;const y=H-((r.totalCost||0)/mxC)*(H-20);
    h+=`<div class="scatter-dot" style="left:${x}px;top:${y}px;width:7px;height:7px;background:${pc2[r.proj]||'#fb923c'};animation-delay:${(idx*0.008).toFixed(3)}s" title="${esc(r.partNM||'')} | ${esc(r.proj||'')} | ${fN(r.mileage)}km | ${f$(r.totalCost)}"></div>`;
  });
  h+=`<div style="position:absolute;top:4px;right:8px;display:flex;gap:10px">`;
  for(const[k,c]of Object.entries(pc2))h+=`<span style="font-size:10px;color:${c}">● ${k}</span>`;
  h+='</div></div></div>';return h;
}

function mkTreemap(items,title){
  if(!items.length)return'';
  const tot=items.reduce((s,x)=>s+x.value,0);
  let h=`<div class="cb"><div class="ct">${esc(title)}</div><div style="display:flex;flex-wrap:wrap;gap:3px">`;
  items.slice(0,12).forEach((it,i)=>{
    const p=tot>0?(it.value/tot*100):0;const c=C[i%C.length];
    h+=`<div style="flex:${Math.max(p,5)};min-width:${Math.max(p*3,60)}px;background:${c}22;border:1px solid ${c}44;border-radius:6px;padding:8px;min-height:50px;animation:cellPop .4s cubic-bezier(.34,1.56,.64,1) ${i*0.06}s both" title="${esc(it.key)}: ${it.value}"><div style="font-size:9px;color:${c};font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tr(it.key,20))}</div><div style="font:700 16px 'JetBrains Mono',monospace;color:${c}">${fN(it.value)}</div><div style="font-size:8px;color:var(--tx3)">${p.toFixed(1)}%</div></div>`;
  });
  h+='</div></div>';return h;
}

function mkKPIs(pairs){
  let h='<div class="kg">';
  pairs.forEach(([l,v,c,s],i)=>{
    const isNum=/^[\$]?[\d,.]+[%]?$/.test(String(v).replace(/,/g,''));
    h+=`<div class="kc kc-anim" style="animation-delay:${i*0.06}s"><div class="kcl">${esc(l)}</div><div class="kcv${isNum?' anim-kpi':''}" style="color:${c||'var(--ac)'}"${isNum?` data-target="${v}"`:``}>${isNum?'—':v}</div>${s?`<div class="kcs">${esc(s)}</div>`:''}</div>`;
  });
  h+='</div>';return h;
}

// ===== SHARED HELPERS FOR gen* FUNCTIONS =====
// Source tag footer used by 18+ generators
function srcTag(n,label){return`<span class="st">Qualitivity ${dsl()} · ${fN(n)} ${label||'claims'}</span>`;}
// Comment highlight — wraps matching terms in <mark>
function hlTerms(html,terms){
  if(!terms||!terms.length)return html;
  for(const t of terms){
    html=html.replace(new RegExp('('+t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),
      '<mark style="background:var(--ac);color:var(--bg);padding:0 2px;border-radius:2px">$1</mark>');
  }
  return html;
}
// Common metrics from data array
function calcMetrics(data){
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const am=data.length?data.reduce((s,r)=>s+(r.mileage||0),0)/data.length:0;
  const au=data.length?data.reduce((s,r)=>s+(r.misMonths||0),0)/data.length:0;
  return{tc,am,au,avg:data.length?tc/data.length:0};
}

// ===== TILE MAP BUILDER =====
function mkMap(data, title, normalized){
  const stClaims={};
  for(const r of data){const st=r.state;if(st&&ST_NAMES[st])stClaims[st]=(stClaims[st]||0)+(r.claims||1);}
  const stValues={};let maxVal=0;
  for(const[st,cnt]of Object.entries(stClaims)){
    let val=cnt;
    if(normalized&&SALES_ST[st]>0)val=cnt/SALES_ST[st]; // simple ratio
    stValues[st]=val;if(val>maxVal)maxVal=val;
  }
  const metricLabel=normalized?'Claim Ratio (Claims÷Sales)':'Raw Claims';
  const mapId=_uid('tm');
  const cellSize=48,gap=3,cols=11,rows=8;
  const W=(cellSize+gap)*cols,H=(cellSize+gap)*rows;
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  h+=`<div id="${mapId}" style="position:relative;width:${W}px;max-width:100%;margin:0 auto">`;
  h+=`<div style="display:grid;grid-template-columns:repeat(${cols},${cellSize}px);grid-template-rows:repeat(${rows},${cellSize}px);gap:${gap}px">`;
  // Empty grid first
  for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){
    // Check if a state goes here
    let stHere=null;
    for(const[st,[sr,sc]]of Object.entries(TILE)){if(sr===r&&sc===c){stHere=st;break;}}
    if(stHere){
      const val=stValues[stHere]||0;
      const claims=stClaims[stHere]||0;
      const sales=SALES_ST[stHere]||0;
      const intensity=maxVal>0?Math.sqrt(val/maxVal):0;
      const ci=Math.min(Math.round(intensity*10),10);
      const bg=val>0?HC[ci]:'#0a0f18';
      const fg=ci>4?'#fff':'var(--tx3)';
      const tip=`${ST_NAMES[stHere]}\nClaims: ${claims}${sales?'\nSales: '+fN(sales):''}${sales>0?'\nRatio: '+(claims/sales*1000).toFixed(1)+' per 1K':''}`;
      h+=`<div style="background:${bg};color:${fg};border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:default;transition:transform .15s;font-family:'JetBrains Mono',monospace;border:1px solid ${ci>2?'transparent':'var(--bd)'}" title="${tip}" onmouseenter="this.style.transform='scale(1.15)';this.style.zIndex='10'" onmouseleave="this.style.transform='scale(1)';this.style.zIndex='0'">
        <div style="font-size:10px;font-weight:700">${stHere}</div>
        <div style="font-size:${normalized?'7':'9'}px;margin-top:1px">${normalized?(sales>0?(claims/sales*1000).toFixed(1):'-'):claims||''}</div>
      </div>`;
    } else {
      h+=`<div></div>`;
    }
  }}
  h+='</div>';
  // Legend
  h+=`<div style="display:flex;align-items:center;gap:4px;margin-top:10px;justify-content:center"><span style="font-size:9px;color:var(--tx3);font-family:'JetBrains Mono',monospace">Low</span><div style="height:10px;width:180px;border-radius:3px;background:linear-gradient(90deg,${HC[0]},${HC[3]},${HC[6]},${HC[9]},${HC[10]})"></div><span style="font-size:9px;color:var(--tx3);font-family:'JetBrains Mono',monospace">High</span></div>`;
  h+=`<div style="text-align:center;margin-top:4px;font-size:9px;color:var(--tx3)">${metricLabel}${normalized?' · Min 10 sales threshold applied':''}</div>`;
  h+=`</div>`;
  // Top states table
  const stArr=Object.entries(stValues).filter(([st])=>!normalized||SALES_ST[st]>=10).sort((a,b)=>b[1]-a[1]).slice(0,15);
  if(stArr.length){
    h+=`<p style="font-size:11px;color:var(--tx2);margin:10px 0 6px"><b>Top States — ${metricLabel}:</b></p>`;
    h+='<div class="tw"><table><thead><tr><th>#</th><th>State</th><th>Claims</th><th>Sales</th><th>Ratio (per 1K)</th></tr></thead><tbody>';
    stArr.forEach(([st,val],i)=>{
      const claims=stClaims[st]||0;const sales=SALES_ST[st]||0;
      const ratio=sales>0?(claims/sales*1000).toFixed(1):'—';
      const r1k=sales>0?claims/sales*1000:0;const flagColor=r1k>50?'color:var(--rd)':r1k>30?'color:var(--or)':'';
      h+=`<tr><td>${i+1}</td><td>${ST_NAMES[st]||st}</td><td>${claims}</td><td>${fN(sales)}</td><td style="${flagColor};font-weight:600">${ratio}</td></tr>`;
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';return h;
}



// ===== REAL GEOGRAPHIC MAP (D3 + TopoJSON) =====
let US_TOPO = null; // loaded async from CDN
let CUSTOM_VARS = {}; // user-defined variables per state

async function loadTopoJSON(){
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json');
    US_TOPO = await res.json();
    console.log('TopoJSON loaded:', Object.keys(US_TOPO.objects));
  } catch(e){ console.log('TopoJSON unavailable (offline), using tile map fallback'); }
}
if(typeof d3!=='undefined') loadTopoJSON();

// FIPS → state abbrev
const FIPS={1:'AL',2:'AK',4:'AZ',5:'AR',6:'CA',8:'CO',9:'CT',10:'DE',11:'DC',12:'FL',13:'GA',15:'HI',16:'ID',17:'IL',18:'IN',19:'IA',20:'KS',21:'KY',22:'LA',23:'ME',24:'MD',25:'MA',26:'MI',27:'MN',28:'MS',29:'MO',30:'MT',31:'NE',32:'NV',33:'NH',34:'NJ',35:'NM',36:'NY',37:'NC',38:'ND',39:'OH',40:'OK',41:'OR',42:'PA',44:'RI',45:'SC',46:'SD',47:'TN',48:'TX',49:'UT',50:'VT',51:'VA',53:'WA',54:'WV',55:'WI',56:'WY'};

function mkRealMap(data, title, normalized, overlayVar, overlayLabel, monthIdx){
  if(!US_TOPO||typeof d3==='undefined'||typeof topojson==='undefined'){
    return mkMap(data, title+' (tile fallback)', normalized); // fallback
  }
  // Aggregate claims by state
  const stClaims={};
  for(const r of data){const st=r.state;if(st&&ST_NAMES[st])stClaims[st]=(stClaims[st]||0)+(r.claims||1);}
  const stVals={};let mx=0;
  for(const[st,cnt]of Object.entries(stClaims)){
    let v=cnt;
    if(normalized&&SALES_ST[st]>=10)v=cnt/SALES_ST[st];
    else if(normalized)continue;
    stVals[st]=v;if(v>mx)mx=v;
  }
  const mapId=_uid('rm');
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  h+=`<div id="${mapId}" style="width:100%;max-width:700px;margin:0 auto;position:relative"></div>`;
  // Legend
  h+=`<div style="display:flex;align-items:center;gap:4px;margin-top:6px;justify-content:center"><span style="font-size:9px;color:var(--tx3)">Low</span><div style="height:10px;width:180px;border-radius:3px;background:linear-gradient(90deg,${HC[0]},${HC[3]},${HC[6]},${HC[9]},${HC[10]})"></div><span style="font-size:9px;color:var(--tx3)">High</span></div>`;
  h+=`<div style="text-align:center;font-size:9px;color:var(--tx3);margin-top:2px">${normalized?'Claim Ratio (Claims÷Sales)':'Raw Claims'}${overlayLabel?' + '+overlayLabel:''}</div>`;
  // Table
  const stArr=Object.entries(stVals).sort((a,b)=>b[1]-a[1]).slice(0,15);
  if(stArr.length){
    h+='<div class="tw" style="margin-top:10px"><table><thead><tr><th>#</th><th>State</th><th>Claims</th><th>Sales</th><th>Ratio (per 1K)</th>';
    if(overlayVar)h+=`<th>${esc(overlayLabel||overlayVar)}</th>`;
    h+='</tr></thead><tbody>';
    stArr.forEach(([st,val],i)=>{
      const cl=stClaims[st]||0;const sl=SALES_ST[st]||0;
      const ratio=sl>0?(cl/sl*1000).toFixed(1):'—';
      let ovVal='';
      if(overlayVar){
        if(monthIdx!==undefined&&US_MONTHLY_TEMP&&US_MONTHLY_TEMP[st])
          ovVal=overlayVar==='temp'?US_MONTHLY_TEMP[st][monthIdx]+'°F':US_MONTHLY_PRECIP[st]?US_MONTHLY_PRECIP[st][monthIdx]+' in':'';
        else if(US_CLIMATE&&US_CLIMATE[st])
          ovVal=US_CLIMATE[st][overlayVar]!==undefined?US_CLIMATE[st][overlayVar]:'';
        else if(CUSTOM_VARS[overlayVar]&&CUSTOM_VARS[overlayVar][st])
          ovVal=CUSTOM_VARS[overlayVar][st];
      }
      h+=`<tr><td>${i+1}</td><td>${ST_NAMES[st]||st}</td><td>${cl}</td><td>${fN(sl)}</td><td style="font-weight:600">${ratio}</td>`;
      if(overlayVar)h+=`<td>${ovVal}</td>`;
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  }
  h+='</div>';
  // Render D3 map after DOM insert
  setTimeout(()=>{
    const container=document.getElementById(mapId);
    if(!container||!US_TOPO)return;
    const W=Math.min(700,container.clientWidth||700),H=W*0.625;
    const svg=d3.select('#'+mapId).append('svg')
      .attr('viewBox','0 0 975 610')
      .attr('width',W).attr('height',H)
      .style('width','100%').style('height','auto');
    const path=d3.geoPath();
    const features=topojson.feature(US_TOPO,US_TOPO.objects.states).features;
    svg.selectAll('path').data(features).join('path')
      .attr('d',path)
      .attr('fill',d=>{
        const st=FIPS[parseInt(d.id)];if(!st)return'#0a0f18';
        const v=stVals[st]||0;const intensity=mx>0?Math.sqrt(v/mx):0;
        const ci=Math.min(Math.round(intensity*10),10);
        return v>0?HC[ci]:'#0a0f18';
      })
      .attr('stroke','#1a2536').attr('stroke-width',0.5)
      .style('cursor','pointer')
      .on('mouseover',function(ev,d){
        d3.select(this).attr('stroke','#fff').attr('stroke-width',1.5);
        const st=FIPS[parseInt(d.id)];if(!st)return;
        const cl=stClaims[st]||0;const sl=SALES_ST[st]||0;
        const ratio=sl>0?(cl/sl*1000).toFixed(1)+' per 1K':'—';
        let tipHtml=`<b>${ST_NAMES[st]}</b><br>Claims: ${cl}<br>Sales: ${fN(sl)}<br>Ratio: ${ratio}`;
        if(overlayVar&&monthIdx!==undefined&&US_MONTHLY_TEMP&&US_MONTHLY_TEMP[st]){
          tipHtml+=`<br>${overlayLabel}: ${overlayVar==='temp'?US_MONTHLY_TEMP[st][monthIdx]+'°F':US_MONTHLY_PRECIP[st]?US_MONTHLY_PRECIP[st][monthIdx]+' in':''}`;
        }
        let tip=document.getElementById(mapId+'_tip');
        if(!tip){tip=document.createElement('div');tip.id=mapId+'_tip';tip.className='map-tip';
          tip.style.cssText='position:absolute;background:var(--sf);border:1px solid var(--bd);border-radius:8px;padding:8px 12px;font-size:11px;pointer-events:none;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,.5)';
          container.appendChild(tip);}
        tip.innerHTML=tipHtml;tip.style.display='block';
      })
      .on('mousemove',function(ev){
        const tip=document.getElementById(mapId+'_tip');if(!tip)return;
        const rect=container.getBoundingClientRect();
        tip.style.left=(ev.clientX-rect.left+12)+'px';tip.style.top=(ev.clientY-rect.top-10)+'px';
      })
      .on('mouseout',function(){
        d3.select(this).attr('stroke','#1a2536').attr('stroke-width',0.5);
        const tip=document.getElementById(mapId+'_tip');if(tip)tip.style.display='none';
      });
    // State borders
    svg.append('path')
      .datum(topojson.mesh(US_TOPO,US_TOPO.objects.states,(a,b)=>a!==b))
      .attr('fill','none').attr('stroke','#1e2d44').attr('stroke-width',0.5)
      .attr('d',path);
    // Overlay labels (temp/precip) on states
    if(overlayVar&&features.length){
      const centroids=features.map(d=>{const c=path.centroid(d);const st=FIPS[parseInt(d.id)];return{st,x:c[0],y:c[1]};}).filter(d=>d.st&&d.x);
      svg.selectAll('text.ov').data(centroids.filter(d=>{
        let v='';
        if(monthIdx!==undefined&&overlayVar==='temp'&&US_MONTHLY_TEMP&&US_MONTHLY_TEMP[d.st])v=US_MONTHLY_TEMP[d.st][monthIdx];
        else if(monthIdx!==undefined&&overlayVar==='precip'&&US_MONTHLY_PRECIP&&US_MONTHLY_PRECIP[d.st])v=US_MONTHLY_PRECIP[d.st][monthIdx];
        return v!=='';
      })).join('text').attr('class','ov')
        .attr('x',d=>d.x).attr('y',d=>d.y+4)
        .attr('text-anchor','middle').attr('font-size','7px').attr('font-weight','600')
        .attr('font-family','JetBrains Mono,monospace')
        .attr('fill','rgba(255,255,255,0.7)').attr('pointer-events','none')
        .text(d=>{
          if(monthIdx!==undefined&&overlayVar==='temp'&&US_MONTHLY_TEMP[d.st])return US_MONTHLY_TEMP[d.st][monthIdx]+'°';
          if(monthIdx!==undefined&&overlayVar==='precip'&&US_MONTHLY_PRECIP[d.st])return US_MONTHLY_PRECIP[d.st][monthIdx]+'"';
          return '';
        });
    }
  },150);
  return h;
}

// ===== CUSTOM VARIABLES PANEL =====
function openCustomVarPanel(){
  let modal=document.getElementById('cvModal');
  if(modal){modal.style.display='flex';return;}
  modal=document.createElement('div');modal.id='cvModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:2000;';
  const box=document.createElement('div');
  box.style.cssText='background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:20px;width:500px;max-width:90vw;max-height:80vh;overflow-y:auto;';
  box.innerHTML=`<h3 style="margin-bottom:12px;font-size:15px;color:var(--ac)">⚙️ Custom Variables / Variables Personalizadas</h3>
<p style="font-size:11px;color:var(--tx2);margin-bottom:12px">Add custom environmental or operational variables per US state. These will appear in correlation analysis and can be overlaid on maps.</p>
<div style="margin-bottom:12px">
  <label style="font-size:11px;color:var(--tx2)">Variable Name:</label>
  <input id="cvName" style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;color:var(--tx);font-size:13px;margin-top:4px" placeholder="e.g. Road Salt Usage, Altitude, UV Index">
</div>
<div style="margin-bottom:12px">
  <label style="font-size:11px;color:var(--tx2)">Paste CSV data (State,Value):</label>
  <textarea id="cvData" rows="8" style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:8px 10px;color:var(--tx);font-size:12px;font-family:'JetBrains Mono',monospace;margin-top:4px;resize:vertical" placeholder="FL,85\nCA,20\nTX,45\nNY,70"></textarea>
</div>
<div style="display:flex;gap:8px">
  <button onclick="saveCustomVar()" style="flex:1;background:var(--ac);color:var(--bg);border:none;border-radius:8px;padding:8px;font-weight:600;cursor:pointer">Save Variable</button>
  <button onclick="document.getElementById('cvModal').style.display='none'" style="flex:1;background:var(--sf2);color:var(--tx2);border:1px solid var(--bd);border-radius:8px;padding:8px;cursor:pointer">Close</button>
</div>
<div id="cvList" style="margin-top:12px"></div>`;
  modal.appendChild(box);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
  document.body.appendChild(modal);
  refreshCVList();
}

function saveCustomVar(){
  const name=document.getElementById('cvName').value.trim();
  const raw=document.getElementById('cvData').value.trim();
  if(!name||!raw){alert('Please provide name and data');return;}
  const vals={};
  raw.split('\n').forEach(line=>{
    const parts=line.split(',');
    if(parts.length>=2){const st=parts[0].trim().toUpperCase();const v=parseFloat(parts[1].trim());if(st&&!isNaN(v))vals[st]=v;}
  });
  if(Object.keys(vals).length===0){alert('No valid data found. Format: STATE,VALUE');return;}
  CUSTOM_VARS[name]=vals;
  document.getElementById('cvName').value='';
  document.getElementById('cvData').value='';
  refreshCVList();
  addM(`<p>✅ Custom variable "<b>${esc(name)}</b>" saved with ${Object.keys(vals).length} state values.</p><p style="font-size:11px;color:var(--tx2)">Try: "correlate claims with ${name}" or "map with ${name}"</p>`,false);
}

function refreshCVList(){
  const el=document.getElementById('cvList');if(!el)return;
  const keys=Object.keys(CUSTOM_VARS);
  if(!keys.length){el.innerHTML='<p style="font-size:11px;color:var(--tx3)">No custom variables yet.</p>';return;}
  el.innerHTML='<p style="font-size:11px;color:var(--tx2);margin-bottom:6px"><b>Saved Variables:</b></p>'+
    keys.map(k=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:var(--sf2);border-radius:4px;margin:2px 0;font-size:11px"><span>${esc(k)} (${Object.keys(CUSTOM_VARS[k]).length} states)</span><button onclick="delete CUSTOM_VARS['${k}'];refreshCVList()" style="background:none;border:none;color:var(--rd);cursor:pointer;font-size:10px">✕ Remove</button></div>`).join('');
}

// ===== ENHANCED MONTH PARSER =====
function parseMonth(q){
  const lo=q.toLowerCase();
  const monthMap={'jan':0,'ene':0,'feb':1,'mar':2,'apr':3,'abr':3,'may':4,'jun':5,'jul':6,'aug':7,'ago':7,'sep':8,'oct':9,'nov':10,'dec':11,'dic':11,
    'january':0,'enero':0,'february':1,'febrero':1,'march':2,'marzo':2,'april':3,'abril':3,'mayo':4,'june':5,'junio':5,'july':6,'julio':6,
    'august':7,'agosto':7,'september':8,'septiembre':8,'october':9,'octubre':9,'november':10,'noviembre':10,'december':11,'diciembre':11,
    '1월':0,'2월':1,'3월':2,'4월':3,'5월':4,'6월':5,'7월':6,'8월':7,'9월':8,'10월':9,'11월':10,'12월':11};
  // \b evita falsos positivos por subcadena: "smart key"/"market" contienen
  // "mar" (marzo), "junction" contiene "jun" (junio), "general" contiene
  // "ene" (enero) — con includes() cualquiera de esas consultas quedaba
  // silenciosamente filtrada por mes. Los tokens en coreano no son \w para
  // el motor de regex de JS, así que \b no aplica iguial; en su lugar '2월'
  // es literalmente subcadena de '12월', así que se exige que no haya un
  // dígito justo antes (si no, "12월" se leía como "2월" = febrero).
  for(const[k,v]of Object.entries(monthMap)){
    const pat=/[가-힣]/.test(k)?'(?<!\\d)'+k:'\\b'+k+'\\b';
    if(new RegExp(pat).test(lo))return v;
  }
  return undefined;
}

