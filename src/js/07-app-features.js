// ===== QUERY PROCESSOR =====
// ===== FEATURE: SPARKLINE TREND INDICATORS =====
function mkSpk(allData,key,val){
  // Build monthly counts for this key value
  const months=[...new Set(allData.map(r=>r.confMonth))].filter(Boolean).sort();
  if(months.length<2)return'';
  const counts=months.map(m=>allData.filter(r=>r.confMonth===m&&(key?r[key]===val:true)).reduce((s,r)=>s+(r.claims||1),0));
  const mx=Math.max(...counts,1);const mn=Math.min(...counts,0);
  const W=56,H=16,pts=counts.map((v,i)=>`${(i/(counts.length-1))*W},${H-((v-mn)/(mx-mn||1))*H}`).join(' ');
  // Slope for color
  const n=counts.length,sx=counts.reduce((_,__,i)=>_+i,0),sy=counts.reduce((s,v)=>s+v,0);
  const sxy=counts.reduce((s,v,i)=>s+i*v,0),sx2=counts.reduce((s,_,i)=>s+i*i,0);
  const slope=(n*sxy-sx*sy)/(n*sx2-sx*sx||1);
  const col=slope>0.3?'#f87171':slope<-0.3?'#34d399':'#94a3b8';
  return`<svg width="${W}" height="${H}" style="vertical-align:middle;margin:0 4px"><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/><circle cx="${W}" cy="${H-((counts[counts.length-1]-mn)/(mx-mn||1))*H}" r="2" fill="${col}"/></svg>`;
}

// ===== FEATURE: AI NARRATIVE ENGINE =====
function narrate(data,context){
  if(!data||data.length<3)return'';
  const tc=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const parts=ag(data,'partNM','count');
  const topPart=parts[0];
  const nations=ag(data,'nation','count');
  const topNation=nations[0];
  const dealers=[...new Set(data.map(r=>r.dealer))].length;
  const avgCost=tc/data.length;
  const topPartPct=topPart?(topPart.value/data.length*100):0;
  const topPartCost=data.filter(r=>r.partNM===topPart?.key).reduce((s,r)=>s+(r.totalCost||0),0);
  // Early-life detection
  const earlyLife=data.filter(r=>(r.mileage||99999)<5000).length;
  const earlyPct=(earlyLife/data.length*100);
  // Build narrative
  let txt=`<blockquote style="border-left:3px solid var(--ac);padding:14px 18px;margin:12px 0;background:var(--sf2);border-radius:0 8px 8px 0;font-size:13.5px;line-height:1.8;color:var(--tx2)">`;
  txt+=`<div style="font-size:14px;font-weight:700;color:var(--ac);margin-bottom:8px;letter-spacing:.02em">Executive Summary</div>`;
  txt+=`This dataset contains <b>${fN(data.length)}</b> warranty claims totaling <b>${f$(tc)}</b>`;
  if(context)txt+=` ${context}`;
  txt+=`. `;
  if(topPart){
    txt+=`<b>${esc(topPart.key)}</b> is the primary cost driver, representing <b>${topPartPct.toFixed(0)}%</b> of claim volume`;
    txt+=` with <b>${f$(topPartCost)}</b> in warranty cost`;
    if(topPartPct>25)txt+=` — this concentration warrants immediate supplier quality review`;
    else if(topPartPct>15)txt+=` — recommended for engineering investigation within 30 days`;
    txt+=`. `;
  }
  if(dealers>0){
    const topDealers=ag(data,'dealer','count').slice(0,3);
    const top3Pct=topDealers.reduce((s,d)=>s+d.value,0)/data.length*100;
    if(top3Pct>40)txt+=`Top 3 dealers account for <b>${top3Pct.toFixed(0)}%</b> of claims — consider targeted dealer audit. `;
  }
  if(earlyPct>20)txt+=`<span style="color:var(--rd)"><b>${earlyPct.toFixed(0)}%</b> of failures occur under 5,000km</span>, indicating potential manufacturing or assembly defect. `;
  if(topNation&&nations.length>1)txt+=`Geographically, <b>${esc(topNation.key)}</b> leads with <b>${fN(topNation.value)}</b> claims (${(topNation.value/data.length*100).toFixed(0)}%). `;
  // Recommended Actions with severity indicators
  txt+=`<div style="font-size:14px;font-weight:700;color:var(--ac);margin:12px 0 8px;letter-spacing:.02em">Recommended Actions</div>`;
  if(topPartPct>25)txt+=`<div style="margin:4px 0"><span style="background:var(--rd);color:#fff;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.03em">CRITICAL</span> Immediate quality alert for ${esc(topPart?.key||'top part')} — convene supplier review</div>`;
  else txt+=`<div style="margin:4px 0"><span style="background:var(--yl);color:#000;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.03em">MONITOR</span> Track ${esc(topPart?.key||'top part')} trend — set threshold alert at +20% MoM</div>`;
  if(earlyPct>20)txt+=`<div style="margin:4px 0"><span style="background:var(--rd);color:#fff;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.03em">CRITICAL</span> Launch early-life failure investigation — audit assembly process</div>`;
  else txt+=`<div style="margin:4px 0"><span style="background:var(--gn);color:#000;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.03em">ON TRACK</span> Early-life failure rate at ${earlyPct.toFixed(0)}% — continue preventive monitoring</div>`;
  txt+=`<div style="margin:4px 0"><span style="background:var(--yl);color:#000;padding:1px 8px;border-radius:4px;font-size:11px;font-weight:700;letter-spacing:.03em">MONITOR</span> Evaluate top-cost dealers for training and process improvement</div>`;
  txt+=`</blockquote>`;
  return txt;
}

// ===== FEATURE: SMART SUGGESTIONS =====
function suggest(I,data){
  const suggestions=[];
  const parts=ag(data||[],'partNM','count');
  const topPart=parts[0]?.key;
  const topPartSafe=topPart?esc(topPart).replace(/'/g,"\\'"):'';
  switch(I.type){
    case'ranking':case'pareto':case'donut':
      if(topPart)suggestions.push({l:`Drill into ${tr(topPart,25)}`,q:`Analysis ${topPart}`});
      if(topPart)suggestions.push({l:`Forecast ${tr(topPart,20)} trend`,q:`Forecast trend ${topPart}`});
      suggestions.push({l:'Flag dealer anomalies',q:'Flag dealer anomalies'});
      break;
    case'analysis':
      suggestions.push({l:'Customer failure modes',q:`failure mode analysis ${I.filters.partNM||''}`});
      suggestions.push({l:'Forecast this part',q:`Forecast ${I.filters.partNM||'trend'}`});
      suggestions.push({l:'Which dealers are affected?',q:`Anomalies ${I.filters.partNM||''}`});
      suggestions.push({l:'Climate correlation',q:`Climate correlation analysis`});
      break;
    case'failuremode':
      if(I.filters.partNM)suggestions.push({l:'Map by failure mode',q:`map ${I.filters._failureMode||''} ${I.filters.partNM} USA`});
      suggestions.push({l:'Climate correlation',q:`Climate correlation analysis ${I.filters.partNM||''}`});
      if(topPart)suggestions.push({l:`Full analysis: ${tr(topPart,20)}`,q:`Analysis ${topPart}`});
      break;
    case'cfm_comments':
      suggestions.push({l:'Full failure mode analysis',q:'failure mode analysis'});
      suggestions.push({l:'Dashboard summary',q:'Summary dashboard overview'});
      if(I.filters._failureMode)suggestions.push({l:`${cfmLabel(I.filters._failureMode)} analysis`,q:`${I.filters._failureMode} failure mode analysis`});
      break;
    case'map':case'mexicomap':case'canadamap':case'worldmap':
      suggestions.push({l:'Climate correlation analysis',q:'Climate correlation analysis'});
      suggestions.push({l:'Dealer anomaly detection',q:'Flag dealer anomalies'});
      if(topPart)suggestions.push({l:`Why is ${tr(topPart,20)} #1?`,q:`Analysis ${topPart}`});
      break;
    case'anomaly':
      if(topPart)suggestions.push({l:`Investigate ${tr(topPart,20)}`,q:`Analysis ${topPart}`});
      suggestions.push({l:'Supplier risk scorecard',q:'Supplier risk scorecard'});
      suggestions.push({l:'What-if cost reduction',q:'What if savings simulator'});
      break;
    case'climate':
      suggestions.push({l:'HVAC/AC system breakdown',q:'HVAC analysis'});
      suggestions.push({l:'USA map with temperature',q:'Map USA temperature'});
      suggestions.push({l:'México map with climate',q:'Mexico map temperature'});
      break;
    case'insights':
      suggestions.push({l:'Cost savings simulator',q:'What if savings simulator'});
      suggestions.push({l:'Failure flow analysis',q:'Failure flow sankey'});
      if(topPart)suggestions.push({l:`Deep dive: ${tr(topPart,20)}`,q:`Analysis ${topPart}`});
      break;
    case'forecast':
      suggestions.push({l:'What-if savings simulator',q:'What if savings simulator'});
      suggestions.push({l:'Period comparison 3M vs 12M',q:'Period comparison 3M vs 12M'});
      suggestions.push({l:'Intelligence briefing',q:'Intelligence briefing'});
      break;
    default:
      suggestions.push({l:'Intelligence briefing',q:'Intelligence briefing'});
      suggestions.push({l:'What-if cost savings',q:'What if savings simulator'});
      suggestions.push({l:'Failure flow diagram',q:'Failure flow sankey'});
  }
  if(!suggestions.length)return'';
  let h='<div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px">';
  h+='<span style="font-size:9px;color:var(--tx3);align-self:center">Next:</span>';
  suggestions.slice(0,3).forEach(s=>{
    h+=`<button onclick="inp.value='${esc(s.q).replace(/'/g,"\\'")}';send();" style="background:transparent;border:1px solid var(--ac);color:var(--ac);padding:4px 10px;border-radius:14px;font:11px 'DM Sans',sans-serif;cursor:pointer;transition:all .15s" onmouseenter="this.style.background='var(--acd)'" onmouseleave="this.style.background='transparent'">${esc(s.l)}</button>`;
  });
  h+='</div>';
  return h;
}

// ===== FEATURE: WHAT-IF SAVINGS SIMULATOR =====
function genWhatIf(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No data for simulation.</p>';
  const fd=fdsc(I.filters);
  const topCost=ag(data,'partNM','cost').slice(0,8);
  const totalCost=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const uid=_uid('wif');
  let h=`<p><b>What-If Savings Simulator / Simulador de Ahorros</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=`<p style="font-size:11px;color:var(--tx2);margin-bottom:8px">Drag sliders to simulate claim reduction → see projected annual savings.</p>`;
  h+=`<div id="${uid}_kpi" class="kg"><div class="kc kc-anim"><div class="kcl">Current Annual Cost</div><div class="kcv" style="color:var(--rd)">${f$(totalCost*4)}</div><div class="kcs">Projected from ${dsl()}</div></div><div class="kc kc-anim" style="animation-delay:.06s"><div class="kcl">Projected Savings</div><div class="kcv" style="color:var(--gn)" id="${uid}_sav">$0</div><div class="kcs">Annual estimate</div></div><div class="kc kc-anim" style="animation-delay:.12s"><div class="kcl">New Annual Cost</div><div class="kcv" style="color:var(--ac)" id="${uid}_new">${f$(totalCost*4)}</div></div></div>`;
  h+=`<div class="cb" style="padding:14px">`;
  topCost.forEach((it,i)=>{
    const annCost=it.value*4;
    h+=`<div style="margin-bottom:14px;animation:fadeUp .4s ease ${i*0.06}s both">`;
    h+=`<div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:11px;color:var(--tx)">${esc(tr(it.key,30))}</span><span style="font-size:10px;color:var(--tx3)">${f$(annCost)}/yr</span></div>`;
    h+=`<div style="display:flex;align-items:center;gap:8px"><input type="range" min="0" max="100" value="0" data-cost="${annCost}" class="${uid}_sl" style="flex:1;accent-color:var(--ac);height:6px" oninput="_wifCalc('${uid}')"><span class="${uid}_pct" style="font:700 12px 'JetBrains Mono',monospace;color:var(--gn);min-width:36px">0%</span></div>`;
    h+=`<div style="font-size:9px;color:var(--tx3);margin-top:2px">Saving: <span class="${uid}_sv" style="color:var(--gn)">$0</span></div>`;
    h+=`</div>`;
  });
  h+=`</div>`;
  h+=narrate(data,`across ${fN(topCost.length)} top cost drivers`);
  h+=`<script>function _wifCalc(id){let tot=0;document.querySelectorAll('.'+id+'_sl').forEach((sl,i)=>{const pct=parseInt(sl.value);const save=parseFloat(sl.dataset.cost)*pct/100;tot+=save;const pcts=document.querySelectorAll('.'+id+'_pct');const svs=document.querySelectorAll('.'+id+'_sv');if(pcts[i])pcts[i].textContent=pct+'%';if(svs[i])svs[i].textContent='$'+Math.round(save).toLocaleString();});document.getElementById(id+'_sav').textContent='$'+Math.round(tot).toLocaleString();document.getElementById(id+'_new').textContent='$'+Math.round(${totalCost*4}-tot).toLocaleString();}<\/script>`;
  h+=suggest(I,data);
  h+=`<span class="st">What-If Simulator · ${fN(data.length)} claims · ${fN(topCost.length)} cost drivers</span>`;
  return h;
}

// ===== FEATURE: SANKEY FLOW DIAGRAM =====
function mkSankey(data,title){
  if(!data||data.length<5)return'<p>Need more data for flow diagram.</p>';
  // Build nodes: System → Part → FailureMode → Nation
  const systems=ag(data,'system','count').slice(0,6);
  const parts=ag(data,'partNM','count').slice(0,8);
  const modes=ag(data,'natName','count').slice(0,6);
  const nations=ag(data,'nation','count').slice(0,5);
  if(!systems.length||!parts.length)return'';
  const W=700,H=400,PAD=20,COL_W=100,NODE_PAD=4;
  const cols=[systems,parts,modes,nations];
  const colX=[PAD,PAD+170,PAD+370,W-COL_W-PAD];
  const colLabels=['System','Part','Failure Mode','Market'];
  // Calculate node positions
  function layoutCol(items,x,totalH){
    const usable=totalH-PAD*2-(items.length-1)*NODE_PAD;
    const tot=items.reduce((s,it)=>s+it.value,0);
    let y=PAD;
    return items.map(it=>{
      const h=Math.max(usable*(it.value/tot),12);
      const node={key:it.key,value:it.value,x,y,h,w:COL_W};
      y+=h+NODE_PAD;
      return node;
    });
  }
  const nodes=cols.map((c,i)=>layoutCol(c,colX[i],H));
  // Build flows between adjacent columns
  function buildFlows(srcNodes,dstNodes,srcField,dstField){
    const flows=[];
    for(const src of srcNodes){
      const srcData=data.filter(r=>r[srcField]===src.key);
      for(const dst of dstNodes){
        const count=srcData.filter(r=>r[dstField]===dst.key).reduce((s,r)=>s+(r.claims||1),0);
        if(count>0)flows.push({src,dst,value:count});
      }
    }
    return flows;
  }
  const flows1=buildFlows(nodes[0],nodes[1],'system','partNM');
  const flows2=buildFlows(nodes[1],nodes[2],'partNM','natName');
  const flows3=buildFlows(nodes[2],nodes[3],'natName','nation');
  const allFlows=[...flows1,...flows2,...flows3];
  const maxFlow=Math.max(...allFlows.map(f=>f.value),1);
  // SVG
  let svg=`<svg viewBox="0 0 ${W} ${H+30}" width="100%" style="max-width:${W}px">`;
  // Column labels
  colLabels.forEach((l,i)=>svg+=`<text x="${colX[i]+COL_W/2}" y="12" text-anchor="middle" fill="var(--tx3)" font-size="10" font-family="DM Sans">${l}</text>`);
  // Flows (curved paths)
  allFlows.forEach((f,fi)=>{
    const srcMidY=f.src.y+f.src.h/2;
    const dstMidY=f.dst.y+f.dst.h/2;
    const srcX=f.src.x+f.src.w;
    const dstX=f.dst.x;
    const cpx1=srcX+(dstX-srcX)*0.4;
    const cpx2=srcX+(dstX-srcX)*0.6;
    const thick=Math.max(1,Math.min(20,(f.value/maxFlow)*20));
    const ci=nodes[0].findIndex(n=>n.key===f.src.key);
    const col=C[ci>=0?ci%C.length:fi%C.length];
    svg+=`<path d="M${srcX},${srcMidY} C${cpx1},${srcMidY} ${cpx2},${dstMidY} ${dstX},${dstMidY}" fill="none" stroke="${col}" stroke-width="${thick}" opacity=".3" style="transition:opacity .2s"><title>${esc(f.src.key)} → ${esc(f.dst.key)}: ${f.value}</title></path>`;
  });
  // Nodes
  nodes.forEach((col,ci)=>col.forEach((n,ni)=>{
    const c=C[ci===0?ni%C.length:(ci===1?ni%C.length:ci*2+ni)%C.length];
    svg+=`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="4" fill="${c}" opacity=".7"/>`;
    if(n.h>14)svg+=`<text x="${n.x+n.w/2}" y="${n.y+n.h/2+3}" text-anchor="middle" fill="#fff" font-size="${n.h>20?'9':'7'}" font-family="DM Sans">${esc(tr(n.key,14))}</text>`;
  }));
  svg+='</svg>';
  return`<div class="cb"><div class="ct">${esc(title)}</div><div style="overflow-x:auto">${svg}</div></div>`;
}

function genSankey(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  let h=`<p><b>Failure Flow Analysis / Flujo de Fallas</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)'],['Systems',fN([...new Set(data.map(r=>r.system))].length),'var(--pu)'],['Parts',fN([...new Set(data.map(r=>r.partNM))].length),'var(--or)'],['Markets',fN([...new Set(data.map(r=>r.nation))].length),'var(--gn)']]);
  h+=mkSankey(data,'System → Part → Failure Mode → Market');
  h+=narrate(data,'visualized as failure flow pathways');
  h+=suggest(I,data);
  h+=`<span class="st">Sankey Flow · ${fN(data.length)} claims</span>`;
  return h;
}

// ===== FEATURE: DEALER SCORECARD + RADAR CHART =====
function mkRadar(dealers,title){
  if(!dealers.length)return'';
  const AXES=['Volume','Avg Cost','Part Diversity','Early-Life %','Concentration','Cost Total'];
  const N=AXES.length;
  const CX=150,CY=150,R=120;
  let svg=`<svg viewBox="0 0 300 310" width="300" style="max-width:100%">`;
  // Concentric pentagons
  [0.2,0.4,0.6,0.8,1.0].forEach(s=>{
    let pts='';
    for(let i=0;i<N;i++){const a=(Math.PI*2*i/N)-Math.PI/2;pts+=`${CX+R*s*Math.cos(a)},${CY+R*s*Math.sin(a)} `;}
    svg+=`<polygon points="${pts}" fill="none" stroke="var(--bd)" stroke-width=".5"/>`;
  });
  // Axis lines + labels
  for(let i=0;i<N;i++){
    const a=(Math.PI*2*i/N)-Math.PI/2;
    const ex=CX+R*Math.cos(a),ey=CY+R*Math.sin(a);
    svg+=`<line x1="${CX}" y1="${CY}" x2="${ex}" y2="${ey}" stroke="var(--bd)" stroke-width=".5"/>`;
    const lx=CX+(R+18)*Math.cos(a),ly=CY+(R+18)*Math.sin(a);
    svg+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--tx3)" font-size="8" font-family="DM Sans">${AXES[i]}</text>`;
  }
  // Dealer polygons
  dealers.slice(0,5).forEach((d,di)=>{
    let pts='';
    d.scores.forEach((s,i)=>{
      const a=(Math.PI*2*i/N)-Math.PI/2;
      pts+=`${CX+R*(s/100)*Math.cos(a)},${CY+R*(s/100)*Math.sin(a)} `;
    });
    svg+=`<polygon points="${pts}" fill="${C[di%C.length]}" fill-opacity=".15" stroke="${C[di%C.length]}" stroke-width="2" stroke-opacity=".8"><title>${d.dealer}</title></polygon>`;
  });
  svg+='</svg>';
  // Legend
  let lg='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">';
  dealers.slice(0,5).forEach((d,i)=>lg+=`<span style="font-size:10px;color:${C[i%C.length]}">● ${esc(tr(d.dealer,15))}</span>`);
  lg+='</div>';
  return`<div class="cb"><div class="ct">${esc(title)}</div><div style="display:flex;justify-content:center">${svg}</div>${lg}</div>`;
}

function genDealerScore(I){
  const data=flt(gDS(),I.filters);
  if(data.length<10)return'<p>Need more data for dealer scoring.</p>';
  const fd=fdsc(I.filters);
  // Compute per-dealer metrics
  const dlrMap={};
  for(const r of data){
    const d=r.dealer;if(!d)continue;
    if(!dlrMap[d])dlrMap[d]={dealer:d,claims:0,cost:0,parts:new Set(),vins:new Set(),earlyLife:0,nation:r.nation};
    dlrMap[d].claims++;dlrMap[d].cost+=(r.totalCost||0);dlrMap[d].parts.add(r.partNM);
    if(r.vin)dlrMap[d].vins.add(r.vin);
    if((r.mileage||99999)<5000)dlrMap[d].earlyLife++;
  }
  const dealers=Object.values(dlrMap).filter(d=>d.claims>=3).map(d=>{
    const topPart=data.filter(r=>r.dealer===d.dealer);
    const partCounts=ag(topPart,'partNM','count');
    const concentration=partCounts[0]?(partCounts[0].value/d.claims*100):0;
    // Count repeat VINs
    const vinCounts={};topPart.forEach(r=>{if(r.vin){vinCounts[r.vin]=(vinCounts[r.vin]||0)+1;}});
    const repeatVins=Object.values(vinCounts).filter(c=>c>=2).length;
    const repeatRate=d.vins.size>0?(repeatVins/d.vins.size*100):0;
    return{...d,parts:d.parts.size,vins:d.vins.size,avgCost:d.cost/d.claims,earlyPct:d.claims>0?(d.earlyLife/d.claims*100):0,concentration,repeatRate};
  });
  if(!dealers.length)return'<p>Not enough dealer data for scoring.</p>';
  // Normalize to 0-100
  const maxClaims=Math.max(...dealers.map(d=>d.claims));
  const maxAvgCost=Math.max(...dealers.map(d=>d.avgCost));
  const maxParts=Math.max(...dealers.map(d=>d.parts));
  const maxCost=Math.max(...dealers.map(d=>d.cost));
  const scored=dealers.map(d=>({
    ...d,
    scores:[
      Math.min(100,(d.claims/maxClaims)*100),
      Math.min(100,(d.avgCost/maxAvgCost)*100),
      Math.min(100,(d.parts/maxParts)*100),
      Math.min(100,d.earlyPct),
      Math.min(100,d.concentration),
      Math.min(100,(d.cost/maxCost)*100)
    ],
    composite:((d.claims/maxClaims)*25+(d.avgCost/maxAvgCost)*20+(d.parts/maxParts)*15+d.earlyPct*0.15+d.concentration*0.15+(d.cost/maxCost)*10)
  })).sort((a,b)=>b.composite-a.composite);
  let h=`<p><b>Dealer Performance Scorecard / Scorecard de Dealers</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Dealers Scored',fN(scored.length),'var(--ac)'],['Highest Risk',esc(tr(scored[0]?.dealer||'',15)),'var(--rd)'],['Lowest Risk',esc(tr(scored[scored.length-1]?.dealer||'',15)),'var(--gn)']]);
  h+=mkRadar(scored,'Top 5 Highest-Risk Dealers — Radar Profile');
  // Table
  h+=mkTbl(scored.slice(0,20).map((d,i)=>({rank:i+1,dealer:d.dealer,claims:d.claims,avgCost:d.avgCost,parts:d.parts,earlyPct:d.earlyPct,concentration:d.concentration,composite:d.composite,nation:d.nation||''})),[
    {l:'#',k:'rank',f:v=>v},
    {l:'Dealer',k:'dealer',f:v=>esc(tr(v,15))},
    {l:'Claims',k:'claims',f:v=>`<b>${fN(v)}</b>`},
    {l:'Avg $',k:'avgCost',f:v=>f$(v)},
    {l:'Parts',k:'parts',f:v=>v},
    {l:'Early%',k:'earlyPct',f:v=>`<span style="color:${v>25?'var(--rd)':v>15?'var(--or)':'var(--gn)'}">${v.toFixed(0)}%</span>`},
    {l:'Score',k:'composite',f:v=>`<span style="color:${v>60?'var(--rd)':v>40?'var(--or)':'var(--gn)'}">${v.toFixed(0)}</span>`}
  ]);
  h+=narrate(data,'evaluated through 6-axis dealer quality scoring');
  h+=suggest(I,data);
  h+=`<span class="st">Dealer Scorecard · ${fN(scored.length)} dealers · ${fN(data.length)} claims</span>`;
  return h;
}

// ===== FEATURE: PRESENTATION MODE =====
function genPresentation(I){
  const data=flt(gDS(),I.filters);
  const all=[...D['3M'],...D['DC'],...D['12M']];
  const tc=all.reduce((s,r)=>s+(r.totalCost||0),0);
  const topParts=ag(all,'partNM','count').slice(0,10);
  const topCost=ag(all,'partNM','cost').slice(0,8);
  const bySys=ag(all,'system','count');
  const byNation=ag(all,'nation','count');
  const usData=all.filter(r=>r.nation==='U.S.A'&&r.state);
  const mxData=all.filter(r=>r.nation==='Mexico');
  // Build slides
  const slides=[];
  // Slide 1: Executive KPIs
  slides.push(`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%">
    <h1 style="font:700 36px 'JetBrains Mono',monospace;color:var(--ac);margin-bottom:30px">Warranty 2 Prevention</h1>
    <div style="font-size:14px;color:var(--tx3);margin-bottom:40px">KMX Warranty Analytics · ${dsl()}</div>
    ${mkKPIs([['Total Claims',fN(all.length),'var(--ac)','All datasets'],['Warranty Cost',f$(tc),'var(--rd)','Annualized: '+f$(tc*4)],['Top Defect',topParts[0]?.key||'—','var(--yl)',topParts[0]?.value+' claims'],['Markets',fN(byNation.length),'var(--gn)','Active regions']])}
  </div>`);
  // Slide 2: Top 10 Parts
  slides.push(`<div><h2 style="color:var(--ac);margin-bottom:16px;font-size:20px">Top 10 Warranty Parts</h2>${mkBar(topParts,'count','Claims by Part')}</div>`);
  // Slide 3: System & Market
  slides.push(`<div><h2 style="color:var(--ac);margin-bottom:16px;font-size:20px">System & Market Distribution</h2><div style="display:flex;flex-wrap:wrap;gap:16px">${mkDonut(bySys,'By System')}${mkDonut(byNation,'By Market')}</div></div>`);
  // Slide 4: Geographic
  slides.push(`<div><h2 style="color:var(--ac);margin-bottom:16px;font-size:20px">Geographic Analysis</h2>${usData.length>5?mkMap(usData,'USA Claims',true):''}${mxData.length>3?mkMexicoMap(mxData,'México Claims'):''}</div>`);
  // Slide 5: Cost drivers
  slides.push(`<div><h2 style="color:var(--ac);margin-bottom:16px;font-size:20px">Cost Drivers — Warranty Savings Opportunity</h2>${mkBar(topCost,'cost','Annual Cost by Part')}${narrate(all,'across all markets and projects')}</div>`);
  const uid=_uid('pres');
  let h=`<div id="${uid}" style="background:var(--bg);padding:20px;border-radius:12px;min-height:500px;position:relative">`;
  slides.forEach((sl,i)=>h+=`<div class="${uid}_slide" style="display:${i===0?'block':'none'};animation:fadeUp .5s ease both">${sl}</div>`);
  h+=`<div style="position:absolute;bottom:10px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:12px">`;
  h+=`<button onclick="_presNav('${uid}',-1)" style="background:var(--sf2);border:1px solid var(--bd);color:var(--tx);padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px">← Prev</button>`;
  h+=`<span id="${uid}_pg" style="font:12px 'JetBrains Mono',monospace;color:var(--tx3)">1 / ${slides.length}</span>`;
  h+=`<button onclick="_presNav('${uid}',1)" style="background:var(--sf2);border:1px solid var(--bd);color:var(--tx);padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px">Next →</button>`;
  h+=`<button onclick="showSplash(()=>{document.documentElement.requestFullscreen().catch(()=>{})})" style="background:var(--acd);border:1px solid var(--ac);color:var(--ac);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px">Fullscreen</button>`;
  h+=`</div>`;
  h+=`<div style="position:absolute;bottom:0;left:0;height:3px;background:var(--ac);border-radius:2px;transition:width .3s" id="${uid}_bar" style="width:${100/slides.length}%"></div>`;
  h+=`</div>`;
  h+=`<script>window._presIdx=window._presIdx||{};window._presIdx['${uid}']=0;function _presNav(id,dir){const slides=document.querySelectorAll('.'+id+'_slide');const n=slides.length;let cur=window._presIdx[id]||0;slides[cur].style.display='none';cur=(cur+dir+n)%n;slides[cur].style.display='block';slides[cur].style.animation='none';slides[cur].offsetHeight;slides[cur].style.animation='fadeUp .5s ease both';window._presIdx[id]=cur;document.getElementById(id+'_pg').textContent=(cur+1)+' / '+n;const bar=document.getElementById(id+'_bar');if(bar)bar.style.width=((cur+1)/n*100)+'%';}<\/script>`;
  h+=`<p style="margin-top:8px;font-size:11px;color:var(--tx2)">Use ← → buttons or click <b>Fullscreen</b> for presentation mode. ${slides.length} slides prepared.</p>`;
  h+=suggest(I,data);
  h+=`<span class="st">Presentation Mode · ${slides.length} slides · ${fN(all.length)} claims</span>`;
  return h;
}

function proc(q){
  // Level 4: Conversational context — check for follow-up queries
  let I;
  const followUp=parseFollowUp(q,_lastI);
  if(followUp){
    I=followUp;
  }else{
    I=parse(q);
  }
  _lastI=I; // Save for next follow-up
  const _data=flt(gDS(),I.filters);
  const _pb=mkParseBar(I,_data.length);
  // Level 3: Disambiguation check
  let _disambig='';
  if(I._ambiguous&&I._ambiguous.length>=2){
    _disambig=`<div class="disambig"><span style="font-size:11px;color:var(--tx3);margin-right:4px">Also matches:</span>`;
    for(const alt of I._ambiguous){
      if(alt===I.type)continue;
      _disambig+=`<button onclick="inp.value='${alt} '+inp.value;send()" title="Re-interpret as ${alt}">${alt}</button>`;
    }
    _disambig+=`</div>`;
  }
  function _wrap(html){
    const skipSuggest=/whatif|sankey|dealerscore|presentation|export|vizstudio|dashbuilder|snapshots/.test(I.type);
    const addNarrative=/ranking|analysis|summary|comparison|pareto|donut|failuremode/.test(I.type)&&_data.length>=10;
    let out=_pb+_disambig+html;
    if(addNarrative&&!out.includes('Executive Summary'))out+=narrate(_data);
    if(!skipSuggest&&!out.includes('Next:'))out+=suggest(I,_data);
    return out;
  }
  switch(I.type){
    case'kpimetrics':return _pb+genKPIMetrics(I);
    case'repeatvin':return _pb+genRepeatVIN(I);
    case'costbreakdown':return _pb+genCostBreakdown(I);
    case'mileagehist':return _pb+genMileageDist(I);
    case'report':return _pb+genExecReport(I);
    case'export':{const d=flt(gDS(),I.filters);_lastExport=d;exportCSV(d);return _pb+`<p>📥 Exported ${fN(d.length)} claims to CSV.</p>`;}
    case'exportxls':{const d=flt(gDS(),I.filters);exportXLSX(d,'qualitivity_export');return _pb+`<p>📊 Exported ${fN(d.length)} claims to Excel (.xls).</p>`;}
    case'supplierrisk':return _pb+genSupplierRisk(I);
    case'periodcompare':return _pb+genPeriodCompare(I);
    case'vizstudio':return _pb+genVizStudio(I);
    case'dashbuilder':return _pb+genDashboard(I);
    case'snapshots':{showSnapshots();return _pb+'<p>Loading data snapshots...</p>';}
    case'worldmap':return _pb+genWorldMap(I);
    case'mexicomap':return _pb+genMexicoMap(I);
    case'canadamap':return _pb+genCanadaMap(I);
    case'australiamap':return _pb+genAustraliaMap(I);
    case'whatif':return _pb+genWhatIf(I);
    case'sankey':return _pb+genSankey(I);
    case'dealerscore':return _pb+genDealerScore(I);
    case'presentation':return _pb+genPresentation(I);
    case'ranking':return _wrap(genRanking(I));
    case'analysis':return _wrap(genAnalysis(I));
    case'failuremode':return _wrap(genFailureMode(I));
    case'trend':return _wrap(genTrend(I));
    case'summary':return _wrap(genSummary(I));
    case'comparison':return _wrap(genComparison(I));
    case'anomaly':return _wrap(genEnhancedAnomaly(I));
    case'climate':return _wrap(genClimate(I));
    case'map':return _wrap(genMap(I));
    case'heatmap':return _wrap(genHeatmap(I));
    case'pareto':I.viz='pareto';return _wrap(genRanking(I));
    case'donut':I.viz='donut';return _wrap(genRanking(I));
    case'scatter':return _wrap(mkScatter(flt(gDS(),I.filters).slice(0,300),'Mileage vs Cost'));
    case'stratification':return _wrap((I.filters.partNM||I.filters.system||I.filters._hvac)?genAnalysis(I):genSummary(I));
    case'detail':return _wrap(genDetail(I));
    case'cfm_comments':return _wrap(genCfmComments(I));
    case'vin_detail':return _wrap(genVinDetail(I));
    case'insights':return _wrap(genInsights(I));
    case'alert':return _wrap(genAlerts(I));
    case'forecast':return _wrap(genForecast(I));
    default:return _wrap(genRanking(I));
  }
}

// ===== CHAT UI =====
const ch=document.getElementById('ch');
const inp=document.getElementById('inp');
function addM(c,u){const d=document.createElement('div');d.className=`m ${u?'u':'b'}`;if(u)d.textContent=c;else d.innerHTML=c;ch.appendChild(d);if(u){ch.scrollTop=ch.scrollHeight;}else{setTimeout(()=>{d.scrollIntoView({behavior:'smooth',block:'start'});},80);setTimeout(animKPIs,60);}}
function showT(){const d=document.createElement('div');d.className='m b';d.id='typ';d.innerHTML='<div class="typing"><span></span><span></span><span></span></div>';ch.appendChild(d);ch.scrollTop=ch.scrollHeight;}
function hideT(){const e=document.getElementById('typ');if(e)e.remove();}
function send(){const q=inp.value.trim();if(!q)return;const drop=document.getElementById('acDrop');if(drop)drop.style.display='none';_acIdx=-1;addM(q,true);inp.value='';inp.style.height='auto';addToHistory(q);showT();setTimeout(()=>{hideT();try{addM(proc(q),false);}catch(e){addM('<p style="color:var(--rd)">Error: '+e.message+'</p>',false);console.error('proc error:',e);}},250+Math.random()*350);}
inp.addEventListener('keydown',e=>{
  const drop=document.getElementById('acDrop');
  const acVisible=drop&&drop.style.display==='block';
  if(e.key==='ArrowDown'&&acVisible){e.preventDefault();_acNav(1);return;}
  if(e.key==='ArrowUp'&&acVisible){e.preventDefault();_acNav(-1);return;}
  if(e.key==='Escape'&&acVisible){drop.style.display='none';_acIdx=-1;return;}
  if(e.key==='Tab'&&acVisible){
    e.preventDefault();
    const sel=drop.querySelector('.ac-item.sel');
    if(sel){inp.value=sel.dataset.q;drop.style.display='none';_acIdx=-1;}
    return;
  }
  if(e.key==='Enter'&&!e.shiftKey){
    e.preventDefault();
    if(acVisible&&_acIdx>=0){
      const sel=drop.querySelector('.ac-item.sel');
      if(sel){inp.value=sel.dataset.q;drop.style.display='none';_acIdx=-1;send();return;}
    }
    send();
  }
});
inp.addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px';_acUpdate(this.value.trim());});
document.addEventListener('click',e=>{const drop=document.getElementById('acDrop');if(drop&&!e.target.closest('.ir'))drop.style.display='none';});
document.getElementById('snd').addEventListener('click',send);

// ===== CLEAR CHAT =====
function clearChat(){ch.innerHTML='';inp.value='';_lastI=null;document.getElementById('rstBtn').style.display='none';mkChips();}
// Show reset button when there are messages
const _origAddM=addM;
addM=function(c,u){_origAddM(c,u);document.getElementById('rstBtn').style.display='flex';const cps=document.getElementById('cps');if(cps)cps.innerHTML='';};

// ===== SHARE / QR =====
function showShareModal(){
  const url=SHARE_URL;
  const old=document.querySelector('.share-modal');if(old)old.remove();
  const m=document.createElement('div');m.className='share-modal';
  m.onclick=e=>{if(e.target===m)m.remove();};
  let qrHtml='<div class="qr-wrap" id="qrCanvas"></div>';
  let shareBtn='';
  if(navigator.share)shareBtn=`<button class="primary" onclick="navigator.share({title:'Warranty 2 Prevention',url:'${url.replace(/'/g,"\\'")}' }).catch(()=>{})">📤 Share</button>`;
  m.innerHTML=`<div class="share-box">
    <h3>📤 Share / Compartir</h3>
    ${qrHtml}
    <div class="share-url" id="shareUrl">${url.length>120?url.slice(0,120)+'…':url}</div>
    <div>
      <button class="primary" onclick="navigator.clipboard.writeText('${url.replace(/'/g,"\\'")}');this.textContent='✓ Copied!'">📋 Copy URL</button>
      ${shareBtn}
      <button onclick="this.closest('.share-modal').remove()">Close</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  // Generate real QR code using qrcode-generator library
  try{_drawQR(document.getElementById('qrCanvas'),url);}catch(e){document.getElementById('qrCanvas').innerHTML='<p style="color:#666;font-size:11px">QR: '+url.slice(0,50)+'…</p>';}
}
// Real QR code renderer using qrcode-generator library
function _drawQR(container,text){
  const qr=qrcode(0,'M');qr.addData(text);qr.make();
  const size=180,mod=qr.getModuleCount(),cell=size/mod;
  const c=document.createElement('canvas');c.width=size;c.height=size;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size);
  ctx.fillStyle='#000';
  for(let r=0;r<mod;r++)for(let cc=0;cc<mod;cc++)if(qr.isDark(r,cc))ctx.fillRect(cc*cell,r*cell,cell,cell);
  container.appendChild(c);
}
document.getElementById('dst').addEventListener('click',e=>{if(e.target.classList.contains('dt')){aDS=e.target.dataset.d;document.querySelectorAll('.dt').forEach(b=>b.classList.toggle('a',b.dataset.d===aDS));}});

// ===== CHIPS =====
const CHIPS=[
{l:'KPI Metrics: DC / 3M / 12M Claim Trend',q:'KPI claim trend metrics'},
{l:'Executive intelligence briefing',q:'Intelligence briefing'},
{l:'Top 10 defects driving warranty cost',q:'Top 10 parts by cost'},
{l:'Customer failure modes: steering & alignment',q:'failure mode analysis steering'},
{l:'Battery failure mode analysis by region',q:'failure mode analysis battery'},
{l:'Compare projects: warranty performance',q:'Compare projects'},
{l:'Early warning: quality spike alerts',q:'Alert spikes'},
];

function mkChips(){const c=document.getElementById('cps');c.innerHTML='';CHIPS.forEach(ch=>{const b=document.createElement('button');b.className='cp';b.textContent=ch.l;b.onclick=()=>{inp.value=ch.q;send();};c.appendChild(b);});}

// ===== v8: SPLASH SCREEN =====
function showSplash(cb){
  const sp=document.getElementById('splash');
  sp.style.display='flex';sp.classList.remove('out');
  setTimeout(()=>{sp.classList.add('out');setTimeout(()=>{sp.style.display='none';if(cb)cb();},800);},2600);
}

// ===== v8: WALKTHROUGH TOUR =====
const TOUR=[
  {el:'inp',t:'Ask Anything',d:'Type questions in natural language — English, Spanish, or Korean. Try <b>"top 10 parts by cost USA"</b> or <b>"análisis de batería México"</b>.',pos:'top'},
  {el:'cps',t:'Smart Suggestions',d:'Click any chip to instantly run a powerful analysis. These showcase climate correlation, intelligence briefing, and HVAC analysis.',pos:'top'},
  {el:'ch',t:'Interactive Results',d:'Charts, maps, tables, and AI narratives appear here. <b>Click any bar</b> to drill deeper. Try follow-ups like <b>"same but for Mexico"</b> or <b>"now by cost"</b>.',pos:'bottom'},
  {el:'dst',t:'Dataset & Tools',d:'Switch between 3-Month, DC, 12-Month, or All data. Use ⚙️ Custom Vars for advanced configuration.',pos:'top'},
  {el:'pills',t:'Power Tools',d:'⭐ Save favorite queries · 📜 View history · 📥 Import data · 🌐 Language toggle · 🖨️ Executive report · <b>Ctrl+K</b> for command palette.',pos:'bottom'},
  {el:null,t:'You\'re Ready',d:'Try these power commands:<br>• <b>"presentation mode"</b> — fullscreen executive dashboard<br>• <b>"dealer scorecard"</b> — radar chart analysis<br>• <b>"failure flow"</b> — Sankey cost flow<br>• <b>"what if savings"</b> — interactive simulator',pos:'center'},
];
let _tourIdx=-1;
function startTour(){
  localStorage.removeItem('qi_tour_done');
  _tourIdx=0;_tourStep(0);
}
function _tourStep(idx){
  _tourIdx=idx;
  // Remove existing
  const old=document.getElementById('tourSpot');if(old)old.remove();
  const oldTip=document.getElementById('tourTip');if(oldTip)oldTip.remove();
  if(idx>=TOUR.length){endTour();return;}
  const step=TOUR[idx];
  const total=TOUR.length;
  // Spotlight
  if(step.el){
    const target=document.getElementById(step.el);
    if(target){
      const r=target.getBoundingClientRect();
      const pad=8;
      const spot=document.createElement('div');
      spot.className='tour-spot';spot.id='tourSpot';
      spot.style.cssText=`left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px`;
      document.body.appendChild(spot);
    }
  } else {
    // Center spotlight (no element)
    const spot=document.createElement('div');
    spot.className='tour-spot';spot.id='tourSpot';
    spot.style.cssText='left:50%;top:50%;width:0;height:0;transform:translate(-50%,-50%);border:none;box-shadow:0 0 0 4000px rgba(0,0,0,.78)';
    document.body.appendChild(spot);
  }
  // Tooltip
  const tip=document.createElement('div');
  tip.className='tour-tip';tip.id='tourTip';
  tip.innerHTML=`<h4>${step.t}</h4><p>${step.d}</p><div class="tour-nav"><span class="tour-step">${idx+1} / ${total}</span><div><button class="tour-skip" onclick="endTour()">Skip</button><button class="tour-next" onclick="_tourStep(${idx+1})">${idx===total-1?'Done':'Next →'}</button></div></div>`;
  document.body.appendChild(tip);
  // Position tooltip
  if(step.el){
    const target=document.getElementById(step.el);
    if(target){
      const r=target.getBoundingClientRect();
      if(step.pos==='top'){
        tip.style.left=Math.max(12,r.left)+'px';
        tip.style.bottom=(window.innerHeight-r.top+16)+'px';
      } else {
        tip.style.left=Math.max(12,r.left)+'px';
        tip.style.top=(r.bottom+16)+'px';
      }
    }
  } else {
    tip.style.left='50%';tip.style.top='50%';tip.style.transform='translate(-50%,-50%)';
  }
}
function endTour(){
  _tourIdx=-1;
  const s=document.getElementById('tourSpot');if(s)s.remove();
  const t=document.getElementById('tourTip');if(t)t.remove();
  localStorage.setItem('qi_tour_done','1');
}

// ===== v8: AUTO-COMPLETE =====
const AC_TEMPLATES=[
  {l:'Top 10 parts by cost',q:'top 10 parts by cost',c:'💡'},
  {l:'Climate correlation analysis',q:'climate correlation analysis',c:'💡'},
  {l:'Dealer scorecard radar',q:'dealer scorecard',c:'💡'},
  {l:'Failure flow Sankey',q:'failure flow sankey',c:'💡'},
  {l:'What-if savings simulator',q:'what if savings',c:'💡'},
  {l:'Presentation mode',q:'presentation mode',c:'💡'},
  {l:'Intelligence briefing',q:'intelligence briefing',c:'💡'},
  {l:'Pareto top 15 parts',q:'pareto top 15 parts',c:'💡'},
  {l:'Monthly trend',q:'monthly trend',c:'💡'},
  {l:'HVAC analysis USA July temperature',q:'HVAC analysis USA July map temperature',c:'💡'},
  {l:'Battery analysis CL4',q:'battery analysis CL4',c:'💡'},
  {l:'Customer failure modes FOB key',q:'failure mode analysis fob key',c:'💡'},
  {l:'Customer failure modes battery',q:'failure mode analysis battery',c:'💡'},
  {l:'Map inoperable claims with temperature',q:'map inoperable battery USA temperature',c:'💡'},
  {l:'Map USA claims normalized',q:'map USA claims normalized by sales',c:'💡'},
  {l:'Compare projects',q:'compare projects',c:'💡'},
  {l:'Flag dealer anomalies',q:'flag dealer anomalies',c:'💡'},
  {l:'Cost breakdown waterfall',q:'cost breakdown waterfall',c:'💡'},
  {l:'Last quarter trend',q:'last quarter trend',c:'💡'},
  {l:'USA and Mexico top parts',q:'top parts USA and Mexico',c:'💡'},
];
let _acIdx=-1;
function _acDebounce(fn,ms){let t;return function(...a){clearTimeout(t);t=setTimeout(()=>fn.apply(this,a),ms);};}
const _acUpdate=_acDebounce(function(q){
  const drop=document.getElementById('acDrop');
  if(!q||q.length<2){drop.style.display='none';_acIdx=-1;return;}
  const lo=q.toLowerCase();
  const items=[];
  // 1. History
  try{const h=JSON.parse(localStorage.getItem('qi_query_history')||'[]');
    for(const x of h){if(x.toLowerCase().includes(lo)&&items.length<2)items.push({l:x,q:x,c:'📜'});}
  }catch(e){}
  // 2. Saved
  try{const s=JSON.parse(localStorage.getItem('qi_saved_queries')||'[]');
    for(const x of s){if(x.q&&x.q.toLowerCase().includes(lo)&&items.length<3)items.push({l:x.q,q:x.q,c:'⭐'});}
  }catch(e){}
  // 3. Templates
  for(const t of AC_TEMPLATES){if(t.l.toLowerCase().includes(lo)&&items.length<5)items.push(t);}
  // 4. Part names from index
  if(_IDX&&lo.length>3){
    const partQ=lo.replace(/\b(top|ranking|analysis|trend|map|cost|show|me|the|in|for)\b/g,'').trim();
    if(partQ.length>2){
      for(const p of _IDX.parts){
        if(p.toLowerCase().includes(partQ)&&items.length<6)items.push({l:p,q:p+' analysis',c:'🔧'});
      }
    }
  }
  // Deduplicate
  const seen=new Set();const unique=[];
  for(const it of items){if(!seen.has(it.q.toLowerCase())){seen.add(it.q.toLowerCase());unique.push(it);}}
  if(!unique.length){drop.style.display='none';_acIdx=-1;return;}
  drop.innerHTML=unique.map((it,i)=>{
    const hl=it.l.replace(new RegExp('('+lo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');
    return`<div class="ac-item${i===_acIdx?' sel':''}" data-idx="${i}" data-q="${esc(it.q)}"><span class="ac-cat">${it.c}</span><span>${hl}</span></div>`;
  }).join('');
  drop.style.display='block';
  // Click handlers
  drop.querySelectorAll('.ac-item').forEach(el=>{
    el.addEventListener('click',()=>{inp.value=el.dataset.q;drop.style.display='none';_acIdx=-1;send();});
  });
},150);

function _acNav(dir){
  const drop=document.getElementById('acDrop');
  const items=drop.querySelectorAll('.ac-item');
  if(!items.length)return;
  items.forEach(el=>el.classList.remove('sel'));
  _acIdx=(_acIdx+dir+items.length)%items.length;
  items[_acIdx].classList.add('sel');
  items[_acIdx].scrollIntoView({block:'nearest'});
}

// ===== v8: COMMAND PALETTE =====
const CMDS=[
  {cat:'📊 Analysis',l:'Top parts ranking',q:'top 10 parts by cost',k:'Ctrl+1'},
  {cat:'📊 Analysis',l:'Climate correlation',q:'climate correlation analysis',k:''},
  {cat:'📊 Analysis',l:'Dealer scorecard + radar',q:'dealer scorecard',k:''},
  {cat:'📊 Analysis',l:'Intelligence briefing',q:'intelligence briefing',k:''},
  {cat:'📊 Analysis',l:'Battery deep dive',q:'battery analysis',k:''},
  {cat:'📊 Analysis',l:'Period comparison (3M vs 12M)',q:'period comparison improvement',k:''},
  {cat:'📊 Analysis',l:'Supplier risk scorecard',q:'supplier risk scorecard',k:''},
  {cat:'📊 Analysis',l:'Customer failure modes',q:'failure mode analysis',k:''},
  {cat:'📊 Analysis',l:'FOB key failure modes',q:'failure mode analysis fob key',k:''},
  {cat:'📊 Analysis',l:'Inoperable claims analysis',q:'inoperable analysis',k:''},
  {cat:'📈 Visualization',l:'Failure flow Sankey',q:'failure flow sankey',k:''},
  {cat:'📈 Visualization',l:'Heatmap: system × month',q:'heatmap',k:''},
  {cat:'📈 Visualization',l:'Pareto chart',q:'pareto top 15',k:''},
  {cat:'📈 Visualization',l:'Scatter: mileage vs cost',q:'scatter mileage cost',k:''},
  {cat:'📈 Visualization',l:'Donut: by system',q:'donut by system',k:''},
  {cat:'🗺️ Maps',l:'USA map',q:'map USA claims',k:''},
  {cat:'🗺️ Maps',l:'Mexico map',q:'mexico map',k:''},
  {cat:'🗺️ Maps',l:'Canada map',q:'canada map',k:''},
  {cat:'🗺️ Maps',l:'World map',q:'world map',k:''},
  {cat:'🔧 Tools',l:'What-If savings simulator',q:'what if savings',k:''},
  {cat:'🔧 Tools',l:'Presentation mode',q:'presentation mode',k:'F5'},
  {cat:'🔧 Tools',l:'Monthly trend',q:'monthly trend',k:''},
  {cat:'🔧 Tools',l:'Export to CSV',q:'export csv',k:''},
  {cat:'🔧 Tools',l:'Export to Excel',q:'export excel',k:''},
  {cat:'🔧 Tools',l:'Flag anomalies',q:'flag dealer anomalies',k:''},
  {cat:'🔧 Tools',l:'Executive report',q:'executive report',k:''},
  {cat:'🎯 Guide',l:'Start guided tour',q:'_tour',k:''},
  {cat:'🎯 Guide',l:'Temporal: last quarter',q:'last quarter trend',k:''},
  {cat:'🎯 Guide',l:'Compound: USA + Mexico',q:'top parts USA and Mexico',k:''},
  {cat:'🎯 Guide',l:'Follow-up: "same but for..."',q:'same but for Mexico',k:''},
];
let _cmdIdx=0;
function showCmdPal(){
  if(document.getElementById('cmdBg'))return;
  const bg=document.createElement('div');bg.className='cmd-bg';bg.id='cmdBg';
  bg.innerHTML=`<div class="cmd-pal"><input class="cmd-inp" id="cmdInp" placeholder="Type a command... / Escribe un comando..." autocomplete="off"><div class="cmd-list" id="cmdList"></div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click',e=>{if(e.target===bg)closeCmdPal();});
  const inp2=document.getElementById('cmdInp');
  inp2.focus();
  filterCmds('');
  inp2.addEventListener('input',()=>filterCmds(inp2.value));
  inp2.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeCmdPal();return;}
    if(e.key==='ArrowDown'){e.preventDefault();_cmdNav(1);return;}
    if(e.key==='ArrowUp'){e.preventDefault();_cmdNav(-1);return;}
    if(e.key==='Enter'){e.preventDefault();execCmd();return;}
  });
}
function closeCmdPal(){const bg=document.getElementById('cmdBg');if(bg)bg.remove();}
function filterCmds(q){
  const lo=q.toLowerCase();
  const filtered=lo?CMDS.filter(c=>c.l.toLowerCase().includes(lo)||c.cat.toLowerCase().includes(lo)):CMDS;
  const list=document.getElementById('cmdList');
  let html='';let lastCat='';_cmdIdx=0;let idx=0;
  for(const c of filtered){
    if(c.cat!==lastCat){html+=`<div class="cmd-cat">${c.cat}</div>`;lastCat=c.cat;}
    const hl=lo?c.l.replace(new RegExp('('+lo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark style="background:transparent;color:var(--ac);font-weight:600">$1</mark>'):c.l;
    html+=`<div class="cmd-it${idx===0?' sel':''}" data-idx="${idx}" data-q="${esc(c.q)}">${hl}${c.k?`<span class="cmd-k">${c.k}</span>`:''}</div>`;
    idx++;
  }
  if(!filtered.length)html='<div style="padding:20px;text-align:center;color:var(--tx3);font-size:12px">No commands match</div>';
  list.innerHTML=html;
  list.querySelectorAll('.cmd-it').forEach(el=>{
    el.addEventListener('click',()=>{const q2=el.dataset.q;closeCmdPal();if(q2==='_tour'){startTour();}else{inp.value=q2;send();}});
  });
}
function _cmdNav(dir){
  const list=document.getElementById('cmdList');
  const items=list.querySelectorAll('.cmd-it');
  if(!items.length)return;
  items.forEach(el=>el.classList.remove('sel'));
  _cmdIdx=(_cmdIdx+dir+items.length)%items.length;
  items[_cmdIdx].classList.add('sel');
  items[_cmdIdx].scrollIntoView({block:'nearest'});
}
function execCmd(){
  const list=document.getElementById('cmdList');
  const sel=list.querySelector('.cmd-it.sel');
  if(!sel)return;
  const q2=sel.dataset.q;
  closeCmdPal();
  if(q2==='_tour'){startTour();}
  else{inp.value=q2;send();}
}

// ===== v8: PARSE BAR TOOLTIPS =====
const PARSE_TIPS={
  ranking:'Top items sorted by volume or cost',
  analysis:'Deep dive into a specific part or system',
  climate:'Temperature/humidity correlation with claims',
  trend:'Monthly evolution over time',
  map:'Geographic distribution by state/region',
  heatmap:'2D matrix showing intensity patterns',
  pareto:'80/20 analysis — vital few vs trivial many',
  summary:'High-level dashboard overview',
  comparison:'Side-by-side project or market comparison',
  anomaly:'Flag unusual dealer or part patterns',
  whatif:'Interactive cost savings simulator',
  sankey:'Flow: System → Part → Failure → Region',
  dealerscore:'Multi-axis dealer quality scorecard',
  presentation:'Fullscreen executive dashboard slides',
  insights:'AI-generated intelligence briefing',
  alert:'Early warning spike detection',
  forecast:'Linear regression trend projection',
  detail:'Raw claim records table',
  donut:'Proportional distribution chart',
  scatter:'Mileage vs cost correlation plot',
  export:'Download data as CSV file',
  exportxls:'Download data as Excel file',
  report:'Printable executive summary report',
  costbreakdown:'Parts vs labor cost waterfall',
  mileagehist:'Mileage distribution histogram',
  repeatvin:'Vehicles with multiple warranty claims',
  supplierrisk:'Supplier quality risk assessment',
  periodcompare:'3-month vs 12-month improvement',
  stratification:'Hierarchical breakdown analysis',
  worldmap:'Global market distribution',
  mexicomap:'México state-level analysis',
  canadamap:'Canada province-level analysis',
  failuremode:'Customer failure mode categorization from [C] comments',
};

