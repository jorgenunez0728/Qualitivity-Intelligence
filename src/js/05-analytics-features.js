// ===== V6: LINEAR REGRESSION UTILITY =====
function linReg(pts){
  const n=pts.length;if(n<2)return{m:0,b:0,se:0,r2:0};
  const sx=pts.reduce((s,p)=>s+p.x,0),sy=pts.reduce((s,p)=>s+p.y,0);
  const sxy=pts.reduce((s,p)=>s+p.x*p.y,0),sx2=pts.reduce((s,p)=>s+p.x*p.x,0);
  const sy2=pts.reduce((s,p)=>s+p.y*p.y,0);
  const denom=n*sx2-sx*sx;if(denom===0)return{m:0,b:sy/n,se:0,r2:0};
  const m=(n*sxy-sx*sy)/denom;const b=(sy-m*sx)/n;
  const yMean=sy/n;const ssTot=pts.reduce((s,p)=>s+Math.pow(p.y-yMean,2),0);
  const ssRes=pts.reduce((s,p)=>s+Math.pow(p.y-(m*p.x+b),2),0);
  const r2=ssTot>0?1-ssRes/ssTot:0;
  const se=n>2?Math.sqrt(ssRes/(n-2)):0;
  return{m,b,se,r2};
}

// ===== V6: EXPORT CSV UTILITY =====
let _lastExport=null;
function exportCSV(data,filename){
  if(!data||!data.length)return;
  const keys=Object.keys(data[0]).filter(k=>k!=='vins'&&typeof data[0][k]!=='object');
  const csvRows=[keys.join(',')];
  data.forEach(row=>{
    csvRows.push(keys.map(k=>{
      let v=row[k]??'';if(typeof v==='string'&&(v.includes(',')||v.includes('"')))v='"'+v.replace(/"/g,'""')+'"';
      return v;
    }).join(','));
  });
  const blob=new Blob(['\uFEFF'+csvRows.join('\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename||'qualitivity_export.csv';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function mkExpBtn(data,label){
  _lastExport=data;
  return`<button class="exp-btn" onclick="exportCSV(_lastExport,'qualitivity_${Date.now()}.csv')">📥 ${label||'Export CSV'}</button>`;
}

// ===== V6: ANIMATED KPIs =====
function animKPIs(){
  document.querySelectorAll('.anim-kpi:not(.animated)').forEach(el=>{
    el.classList.add('animated');
    const raw=el.getAttribute('data-target');const isDollar=raw.startsWith('$');
    const num=parseFloat(raw.replace(/[$,%]/g,'').replace(/,/g,''));
    const suffix=raw.includes('%')?'%':'';const prefix=isDollar?'$':'';
    const hasDecimal=raw.includes('.');
    if(isNaN(num)){el.textContent=raw;return;}
    const start=performance.now();const dur=1200;
    function tick(now){
      const t=Math.min((now-start)/dur,1);
      const ease=1-Math.pow(1-t,3);
      const cur=num*ease;
      el.textContent=prefix+cur.toLocaleString('en-US',{maximumFractionDigits:hasDecimal?1:0})+suffix;
      if(t<1)requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// ===== V6: SMART INSIGHTS GENERATOR =====
function genInsights(I){
  const all=gDS();if(!all.length)return'<p>No data available.</p>';
  const insights=[];
  // 1. Highest-cost part
  const byPartCost=ag(all,'partNM','cost');
  if(byPartCost.length){
    const top=byPartCost[0];const totalCost=all.reduce((s,r)=>s+(r.totalCost||0),0);
    const pct=totalCost>0?(top.cost/totalCost*100).toFixed(1):0;
    insights.push({icon:'💰',sev:pct>15?'crit':pct>8?'high':'med',sevCls:pct>15?'sev-red':pct>8?'sev-or':'sev-yl',
      text:`<span class="ins-badge ${pct>15?'crit':pct>8?'high':'med'}">${pct>15?'CRITICAL':pct>8?'HIGH':'MEDIUM'}</span><b>${esc(top.key)}</b> is the highest-cost part at <b>${f$(top.cost)}</b> (${pct}% of total warranty cost).`});
  }
  // 2. Month-over-month spike detection (handle incomplete current month)
  const byMonth=ag(all,'confMonth','count').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  if(byMonth.length>=2){
    // Check if latest month is current (incomplete) month
    const now=new Date();const curMKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    const lastM=byMonth[byMonth.length-1];
    const isIncomplete=String(lastM.key)===curMKey;
    if(isIncomplete&&byMonth.length>=3){
      // Compare the two most recent COMPLETE months + project current month
      const prev2=byMonth[byMonth.length-3],prev1=byMonth[byMonth.length-2];
      const chg=prev2.count>0?((prev1.count-prev2.count)/prev2.count*100).toFixed(0):0;
      if(Math.abs(chg)>20){
        const up=chg>0;
        insights.push({icon:up?'📈':'📉',sev:up&&chg>50?'crit':up?'high':'low',sevCls:up&&chg>50?'sev-red':up?'sev-or':'sev-gn',
          text:`<span class="ins-badge ${up&&chg>50?'crit':up?'high':'low'}">${up?'SPIKE':'IMPROVING'}</span>Claims ${up?'increased':'decreased'} <b>${Math.abs(chg)}%</b> from ${esc(prev2.key)} (${prev2.count}) to ${esc(prev1.key)} (${prev1.count}).`});
      }
      // Project current month based on days elapsed
      const dayOfMonth=now.getDate();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      const projCount=Math.round(lastM.count*(daysInMonth/dayOfMonth));
      const projChg=prev1.count>0?((projCount-prev1.count)/prev1.count*100).toFixed(0):0;
      insights.push({icon:'📅',sev:'med',sevCls:'sev-yl',
        text:`<span class="ins-badge med">IN PROGRESS</span><b>${esc(lastM.key)}</b> has <b>${lastM.count}</b> claims so far (${dayOfMonth}/${daysInMonth} days). Projected end-of-month: ~<b>${fN(projCount)}</b> claims (${projChg>0?'+':''}${projChg}% vs ${esc(prev1.key)}).`});
    } else if(!isIncomplete){
      const last=byMonth[byMonth.length-1],prev=byMonth[byMonth.length-2];
      const chg=prev.count>0?((last.count-prev.count)/prev.count*100).toFixed(0):0;
      if(Math.abs(chg)>20){
        const up=chg>0;
        insights.push({icon:up?'📈':'📉',sev:up&&chg>50?'crit':up?'high':'low',sevCls:up&&chg>50?'sev-red':up?'sev-or':'sev-gn',
          text:`<span class="ins-badge ${up&&chg>50?'crit':up?'high':'low'}">${up?'SPIKE':'IMPROVING'}</span>Claims ${up?'increased':'decreased'} <b>${Math.abs(chg)}%</b> from ${esc(prev.key)} (${prev.count}) to ${esc(last.key)} (${last.count}).`});
      }
    }
  }
  // 3. Dealer concentration
  const byDealer=ag(all,'dealer','count');
  if(byDealer.length>=5){
    const top5=byDealer.slice(0,5).reduce((s,d)=>s+d.count,0);
    const pct=all.length>0?(top5/all.length*100).toFixed(1):0;
    if(pct>30)insights.push({icon:'🏢',sev:'high',sevCls:'sev-or',
      text:`<span class="ins-badge high">CONCENTRATION</span>Top 5 dealers account for <b>${pct}%</b> of all claims (${top5} of ${all.length}). Consider dealer-level investigation.`});
  }
  // 4. Part with most repeat VINs
  const vinParts={};
  for(const r of all){if(!r.vin)continue;const k=r.vin;if(!vinParts[k])vinParts[k]=new Set();vinParts[k].add(r.partNM);}
  const repeatVINs=Object.entries(vinParts).filter(([_,s])=>s.size>=2);
  if(repeatVINs.length>0){
    const pct=(repeatVINs.length/Object.keys(vinParts).length*100).toFixed(1);
    insights.push({icon:'🔁',sev:pct>5?'high':'med',sevCls:pct>5?'sev-or':'sev-yl',
      text:`<span class="ins-badge ${pct>5?'high':'med'}">${pct>5?'HIGH':'WATCH'}</span><b>${repeatVINs.length} vehicles</b> have claims on multiple different parts (${pct}% of VINs). Possible systemic quality issues.`});
  }
  // 5. Early-life failures (< 5000 km)
  const earlyLife=all.filter(r=>r.mileage>0&&r.mileage<5000);
  if(earlyLife.length>0){
    const pct=(earlyLife.length/all.length*100).toFixed(1);
    const topEarly=ag(earlyLife,'partNM','count')[0];
    insights.push({icon:'🚗',sev:pct>20?'high':'med',sevCls:pct>20?'sev-or':'sev-yl',
      text:`<span class="ins-badge ${pct>20?'high':'med'}">${pct>20?'HIGH':'MEDIUM'}</span><b>${pct}% of claims</b> occur under 5,000 km (early-life failures). Top early-life part: <b>${topEarly?esc(topEarly.key):'N/A'}</b> (${topEarly?topEarly.count:0} claims).`});
  }
  // 6. Market concentration
  const byNation=ag(all,'nation','count');
  if(byNation.length>=2){
    const topMkt=byNation[0];const pct=(topMkt.count/all.length*100).toFixed(1);
    if(pct>60)insights.push({icon:'🌍',sev:'med',sevCls:'sev-yl',
      text:`<span class="ins-badge med">MARKET</span><b>${esc(topMkt.key)}</b> represents <b>${pct}%</b> of all claims (${topMkt.count}). ${byNation.length} markets reporting.`});
  }
  // 7. Project with highest avg cost
  const byProj=ag(all,'proj','cost');
  if(byProj.length>=2){
    const highest=byProj.reduce((best,p)=>p.avgC>best.avgC?p:best,byProj[0]);
    insights.push({icon:'📊',sev:'med',sevCls:'sev-yl',
      text:`<span class="ins-badge med">COST</span><b>${esc(highest.key)}</b> has the highest average claim cost at <b>${f$(highest.avgC)}</b> per claim (${highest.count} claims, ${f$(highest.cost)} total).`});
  }
  let h=`<p><b>🧠 Intelligence Briefing / Informe de Inteligencia</b> — ${dsl()} (${fN(all.length)} claims)</p>`;
  h+=`<div style="margin:10px 0">`;
  insights.forEach((ins,i)=>{
    h+=`<div class="ins-row ${ins.sevCls}" style="animation-delay:${i*0.08}s">`
      +`<span class="ins-icon">${ins.icon}</span>`
      +`<div class="ins-txt">${ins.text}</div></div>`;
  });
  h+=`</div>`;
  h+=`<p style="font-size:10px;color:var(--tx3);margin-top:8px">Auto-generated from ${fN(all.length)} claims · ${dsl()} dataset</p>`;
  h+=`<span class="st">Warranty 2 Prevention Briefing · v6</span>`;
  return h;
}

// ===== V6: EARLY WARNING / SPIKE DETECTION =====
function genAlerts(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  // Group by part + month
  const pm={};
  for(const r of data){
    const k=r.partNM||'Unknown';const m=r.confMonth||'Unknown';
    if(!pm[k])pm[k]={};pm[k][m]=(pm[k][m]||0)+(r.claims||1);
  }
  const alerts=[];
  for(const[part,months]of Object.entries(pm)){
    const sorted=Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0]));
    if(sorted.length<2)continue;
    const last=sorted[sorted.length-1],prev=sorted[sorted.length-2];
    const lc=last[1],pc2=prev[1];
    if(pc2>=2&&lc>=3){
      const chg=((lc-pc2)/pc2*100);
      if(chg>50){
        const sev=chg>200?'crit':chg>100?'high':'watch';
        alerts.push({part,prevMonth:prev[0],prevCount:pc2,lastMonth:last[0],lastCount:lc,change:chg,sev});
      }
    }
    // New part appearing (only in last month)
    if(sorted.length===1&&sorted[0][1]>=3){
      alerts.push({part,prevMonth:'—',prevCount:0,lastMonth:sorted[0][0],lastCount:sorted[0][1],change:999,sev:'crit',isNew:true});
    }
  }
  alerts.sort((a,b)=>b.change-a.change);
  if(!alerts.length)return'<p><b>Early Warning System</b></p><p style="color:var(--gn)">✅ No significant spikes detected. All parts within normal variation.</p>';
  let h=`<p><b>🚨 Early Warning System / Detección Temprana</b> — ${dsl()}</p>`;
  h+=`<p style="font-size:11px;color:var(--tx2);margin-bottom:8px">Parts with >50% month-over-month claim increase (minimum 3 claims)</p>`;
  h+=mkKPIs([['Alerts',fN(alerts.length),alerts.some(a=>a.sev==='crit')?'var(--rd)':'var(--or)'],
    ['Critical',fN(alerts.filter(a=>a.sev==='crit').length),'var(--rd)'],
    ['High',fN(alerts.filter(a=>a.sev==='high').length),'var(--or)'],
    ['Watch',fN(alerts.filter(a=>a.sev==='watch').length),'var(--yl)']]);
  h+='<div class="tw"><table><thead><tr><th>Severity</th><th>Part</th><th>Prev Month</th><th>Prev</th><th>Last Month</th><th>Last</th><th>Change</th></tr></thead><tbody>';
  alerts.slice(0,20).forEach(a=>{
    const badge=`<span class="alert-badge ${a.sev}">${a.sev==='crit'?'CRITICAL':a.sev==='high'?'HIGH':'WATCH'}</span>`;
    const arrow=a.isNew?'🆕':a.change>0?'⬆️':'⬇️';
    h+=`<tr><td>${badge}</td><td>${esc(tr(a.part,28))}</td><td>${esc(a.prevMonth)}</td><td>${a.prevCount}</td><td>${esc(a.lastMonth)}</td><td><b>${a.lastCount}</b></td><td style="color:${a.sev==='crit'?'var(--rd)':a.sev==='high'?'var(--or)':'var(--yl)'}">${arrow} ${a.isNew?'NEW':'+'+a.change.toFixed(0)+'%'}</td></tr>`;
  });
  h+='</tbody></table></div>';
  h+=mkBar(alerts.slice(0,10).map(a=>({key:a.part,value:a.lastCount})),'count','Top Alert Parts — Latest Month');
  h+=`<span class="st">Early Warning · ${fN(alerts.length)} spikes detected</span>`;
  return h;
}

// ===== V6: FORECAST / PROJECTION =====
function mkForecast(data,title){
  const byM={};
  for(const r of data){const m=r.confMonth;if(!m)continue;byM[m]=(byM[m]||{count:0,cost:0});byM[m].count+=(r.claims||1);byM[m].cost+=(r.totalCost||0);}
  const months=Object.keys(byM).sort();
  if(months.length<3)return'<p>Need at least 3 months of data for forecast.</p>';
  // Adjust incomplete current month by projecting to full month
  const now=new Date();const curMKey=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const lastMonth=months[months.length-1];
  if(lastMonth===curMKey){
    const dayOfMonth=now.getDate();const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const ratio=daysInMonth/Math.max(dayOfMonth,1);
    byM[lastMonth].count=Math.round(byM[lastMonth].count*ratio);
    byM[lastMonth].cost=Math.round(byM[lastMonth].cost*ratio);
  }
  const pts=months.map((m,i)=>({x:i,y:byM[m].count,m,cost:byM[m].cost,isProjected:m===curMKey}));
  const reg=linReg(pts);
  const costPts=months.map((m,i)=>({x:i,y:byM[m].cost}));
  const costReg=linReg(costPts);
  // Project 3 months
  const lastIdx=pts.length-1;
  const projMonths=[];
  const lastDate=months[months.length-1].split('-');
  let yr=parseInt(lastDate[0]),mo=parseInt(lastDate[1]);
  for(let i=1;i<=3;i++){
    mo++;if(mo>12){mo=1;yr++;}
    projMonths.push({x:lastIdx+i,label:`${yr}-${String(mo).padStart(2,'0')}`,
      count:Math.max(0,Math.round(reg.m*(lastIdx+i)+reg.b)),
      cost:Math.max(0,Math.round(costReg.m*(lastIdx+i)+costReg.b))});
  }
  // SVG chart
  const allPts=[...pts,...projMonths.map(p=>({x:p.x,y:p.count}))];
  const mxY=Math.max(...allPts.map(p=>p.y),1)*1.15;
  const W=500,H=180,pad=50;
  const xScale=(x)=>pad+(x/(allPts.length-1||1))*(W-pad-10);
  const yScale=(y)=>H-20-(y/mxY)*(H-40);
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px">`;
  // Grid lines
  for(let i=0;i<=4;i++){
    const y=H-20-i/4*(H-40);
    svg+=`<line x1="${pad}" y1="${y}" x2="${W-10}" y2="${y}" stroke="var(--bd)" stroke-width=".5"/>`;
    svg+=`<text x="${pad-4}" y="${y+3}" fill="var(--tx3)" font-size="8" text-anchor="end" font-family="JetBrains Mono">${Math.round(mxY*i/4)}</text>`;
  }
  // Historical bars
  pts.forEach((p,i)=>{
    const x=xScale(p.x);const bw=Math.max(12,Math.min(30,(W-pad-10)/(allPts.length*1.4)));
    const bh=(p.y/mxY)*(H-40);
    svg+=`<rect x="${x-bw/2}" y="${yScale(p.y)}" width="${bw}" height="${bh}" rx="3" fill="var(--ac)" opacity=".8"/>`;
    svg+=`<text x="${x}" y="${H-4}" fill="var(--tx3)" font-size="7" text-anchor="middle" font-family="JetBrains Mono">${p.m.slice(5)}</text>`;
    svg+=`<text x="${x}" y="${yScale(p.y)-4}" fill="var(--tx)" font-size="8" text-anchor="middle" font-family="JetBrains Mono">${p.y}</text>`;
  });
  // Projected bars (hatched)
  svg+=`<defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.5" height="4" fill="var(--pu)" opacity=".6"/></pattern></defs>`;
  projMonths.forEach(p=>{
    const x=xScale(p.x);const bw=Math.max(12,Math.min(30,(W-pad-10)/(allPts.length*1.4)));
    const bh=(p.count/mxY)*(H-40);
    svg+=`<rect x="${x-bw/2}" y="${yScale(p.count)}" width="${bw}" height="${bh}" rx="3" fill="url(#hatch)" stroke="var(--pu)" stroke-width="1" stroke-dasharray="3,2"/>`;
    svg+=`<text x="${x}" y="${H-4}" fill="var(--pu)" font-size="7" text-anchor="middle" font-family="JetBrains Mono">${p.label.slice(5)}</text>`;
    svg+=`<text x="${x}" y="${yScale(p.count)-4}" fill="var(--pu)" font-size="8" text-anchor="middle" font-family="JetBrains Mono">${p.count}</text>`;
  });
  // Trend line
  const x1=xScale(0),y1=yScale(reg.m*0+reg.b),x2=xScale(lastIdx+3),y2=yScale(reg.m*(lastIdx+3)+reg.b);
  svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--or)" stroke-width="1.5" stroke-dasharray="6,3"/>`;
  // Legend
  svg+=`<rect x="${W-160}" y="4" width="12" height="10" rx="2" fill="var(--ac)" opacity=".8"/><text x="${W-144}" y="12" fill="var(--tx2)" font-size="8">Historical</text>`;
  svg+=`<rect x="${W-90}" y="4" width="12" height="10" rx="2" fill="url(#hatch)" stroke="var(--pu)"/><text x="${W-74}" y="12" fill="var(--tx2)" font-size="8">Projected</text>`;
  svg+='</svg>';
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>${svg}`;
  h+=`<div style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--tx3)">`;
  h+=`<span>R² = ${reg.r2.toFixed(3)}</span>`;
  h+=`<span>Trend: ${reg.m>0?'↑ +':'↓ '}${(reg.m).toFixed(1)} claims/month</span>`;
  h+=`<span>SE: ±${reg.se.toFixed(1)}</span></div></div>`;
  return{html:h,projMonths,reg,costReg};
}

function genForecast(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  let h=`<p><b>🔮 Warranty Cost Forecast / Pronóstico</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  // Claims forecast
  const fcResult=mkForecast(data,'Claims Forecast — Next 3 Months');
  if(typeof fcResult==='string')return h+fcResult;
  const projTotClaims=fcResult.projMonths.reduce((s,p)=>s+p.count,0);
  const projTotCost=fcResult.projMonths.reduce((s,p)=>s+p.cost,0);
  const avgMonthlyCost=data.reduce((s,r)=>s+(r.totalCost||0),0)/Math.max(1,new Set(data.map(r=>r.confMonth)).size);
  const trendDir=fcResult.reg.m>0?'↑ Increasing':'↓ Decreasing';
  h+=mkKPIs([['Projected Claims (3mo)',fN(projTotClaims),'var(--pu)','next quarter'],
    ['Projected Cost (3mo)',f$(projTotCost),'var(--or)','estimated'],
    ['Trend',trendDir,fcResult.reg.m>0?'var(--rd)':'var(--gn)',`${Math.abs(fcResult.reg.m).toFixed(1)}/mo`],
    ['R²',fcResult.reg.r2.toFixed(3),'var(--ac)',fcResult.reg.r2>.7?'Strong fit':fcResult.reg.r2>.4?'Moderate':'Weak']]);
  h+=fcResult.html;
  // Cost forecast
  const costFc=mkForecast(data,'Cost Forecast (USD) — Next 3 Months');
  if(typeof costFc!=='string')h+=costFc.html;
  // KPI Impact Projections
  const totalCost=data.reduce((s,r)=>s+(r.totalCost||0),0);
  const avgCostPerClaim=data.length>0?totalCost/data.length:0;
  const projAvgMonthlyClaims=projTotClaims/3;
  const projAvgMonthlyCost=projTotCost/3;
  const byPart=ag(data,'partNM','cost');
  const topPartProjCost=byPart[0]?(byPart[0].cost/totalCost)*projTotCost:0;
  h+=`<div style="margin:12px 0 6px;padding:8px 12px;background:var(--sf2);border-radius:8px;border-left:3px solid var(--pu)">`;
  h+=`<b style="color:var(--pu)">📊 KPI Impact Projection / Proyección de KPIs</b></div>`;
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0">`;
  h+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px">`;
  h+=`<div style="font-size:9px;color:var(--tx3);text-transform:uppercase">Avg Monthly Claims (Proj.)</div>`;
  h+=`<div style="font:700 18px 'JetBrains Mono',monospace;color:var(--ac)">${fN(Math.round(projAvgMonthlyClaims))}</div>`;
  h+=`<div style="font-size:10px;color:${fcResult.reg.m>0?'var(--rd)':'var(--gn)'}">${fcResult.reg.m>0?'↑':'↓'} ${Math.abs(fcResult.reg.m).toFixed(1)}/mo trend</div></div>`;
  h+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px">`;
  h+=`<div style="font-size:9px;color:var(--tx3);text-transform:uppercase">Avg Monthly Cost (Proj.)</div>`;
  h+=`<div style="font:700 18px 'JetBrains Mono',monospace;color:var(--or)">${f$(Math.round(projAvgMonthlyCost))}</div>`;
  h+=`<div style="font-size:10px;color:var(--tx2)">Avg ${f$(avgCostPerClaim)}/claim</div></div>`;
  h+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px">`;
  h+=`<div style="font-size:9px;color:var(--tx3);text-transform:uppercase">Top Part Risk (Proj.)</div>`;
  h+=`<div style="font:700 14px 'JetBrains Mono',monospace;color:var(--rd)">${f$(Math.round(topPartProjCost))}</div>`;
  h+=`<div style="font-size:10px;color:var(--tx2)">${byPart[0]?esc(tr(byPart[0].key,20)):'-'}</div></div>`;
  h+=`<div style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px">`;
  h+=`<div style="font-size:9px;color:var(--tx3);text-transform:uppercase">6-Month Projected Cost</div>`;
  const proj6m=Math.max(0,Array.from({length:6},(_,i)=>Math.round(fcResult.costReg.m*(fcResult.projMonths[0].x+i)+fcResult.costReg.b)).reduce((a,b)=>a+b,0));
  h+=`<div style="font:700 18px 'JetBrains Mono',monospace;color:var(--yl)">${f$(proj6m)}</div>`;
  h+=`<div style="font-size:10px;color:var(--tx2)">extended forecast</div></div></div>`;
  h+=`<p style="font-size:10px;color:var(--tx3);margin-top:8px">⚠️ Projections based on linear regression. Actual results may vary due to seasonal, production, or policy changes. Incomplete months are auto-projected to full month.</p>`;
  h+=`<span class="st">Forecast · ${fN(data.length)} claims · R²=${fcResult.reg.r2.toFixed(3)}</span>`;
  return h;
}

// ===== V6: REPEAT VIN DETECTION =====
function genRepeatVIN(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  const vinMap={};
  for(const r of data){
    if(!r.vin)continue;
    if(!vinMap[r.vin])vinMap[r.vin]={claims:[],parts:new Set(),dealers:new Set(),proj:'',cost:0,minM:Infinity,maxM:0};
    const v=vinMap[r.vin];
    v.claims.push(r);v.parts.add(r.partNM);v.dealers.add(r.dealer);
    v.proj=r.proj;v.cost+=(r.totalCost||0);
    if(r.mileage>0){v.minM=Math.min(v.minM,r.mileage);v.maxM=Math.max(v.maxM,r.mileage);}
  }
  const repeats=Object.entries(vinMap).filter(([_,v])=>v.claims.length>=2)
    .map(([vin,v])=>({vin,count:v.claims.length,parts:[...v.parts].join(', '),partCount:v.parts.size,
      dealers:[...v.dealers].join(', '),proj:v.proj,cost:v.cost,
      minM:v.minM===Infinity?0:v.minM,maxM:v.maxM,
      mileageRange:v.minM===Infinity?'—':`${fN(v.minM)}-${fN(v.maxM)} km`}))
    .sort((a,b)=>b.count-a.count||b.cost-a.cost);
  if(!repeats.length)return'<p><b>Repeat VIN Detection</b></p><p style="color:var(--gn)">✅ No vehicles with multiple claims found.</p>';
  const totalRepeatCost=repeats.reduce((s,r)=>s+r.cost,0);
  const fd=fdsc(I.filters);
  let h=`<p><b>🔁 Repeat VIN Detection / Vehículos Reincidentes</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Repeat Vehicles',fN(repeats.length),'var(--rd)'],
    ['% of All Claims',pc(repeats.reduce((s,r)=>s+r.count,0),data.length),'var(--or)'],
    ['Total Cost',f$(totalRepeatCost),'var(--yl)'],
    ['Max Claims/VIN',fN(repeats[0].count),'var(--pu)']]);
  h+='<div class="tw"><table><thead><tr><th>VIN (last 6)</th><th>Project</th><th>Claims</th><th>Parts</th><th>Cost</th><th>Mileage Range</th><th>Dealers</th></tr></thead><tbody>';
  repeats.slice(0,30).forEach(r=>{
    const sevColor=r.count>=4?'var(--rd)':r.count>=3?'var(--or)':'var(--yl)';
    h+=`<tr><td style="font-family:'JetBrains Mono',monospace">…${r.vin.slice(-6)}</td><td>${esc(r.proj)}</td><td style="color:${sevColor};font-weight:700">${r.count}</td><td title="${esc(r.parts)}">${esc(tr(r.parts,35))}</td><td>${f$(r.cost)}</td><td style="font-size:10px">${r.mileageRange}</td><td>${esc(tr(r.dealers,20))}</td></tr>`;
  });
  h+='</tbody></table></div>';
  // Distribution
  h+=mkBar(ag(repeats.flatMap(r=>r.claims),'partNM','count').slice(0,10),'count','Top Parts in Repeat VINs');
  // === TRUE RECIDIVISM: Same VIN + Same Part ===
  const vinPartMap={};
  for(const r of data){
    if(!r.vin||!r.partNM)continue;
    const k=r.vin+'||'+r.partNM;
    if(!vinPartMap[k])vinPartMap[k]={vin:r.vin,part:r.partNM,proj:r.proj,count:0,cost:0,months:[],dealers:new Set(),causeCode:r.causeCode||''};
    vinPartMap[k].count++;vinPartMap[k].cost+=(r.totalCost||0);
    if(r.confMonth)vinPartMap[k].months.push(r.confMonth);
    vinPartMap[k].dealers.add(r.dealer);
    if(r.causeCode)vinPartMap[k].causeCode=r.causeCode;
  }
  const trueRecid=Object.values(vinPartMap).filter(v=>v.count>=2).sort((a,b)=>b.count-a.count||b.cost-a.cost);
  if(trueRecid.length>0){
    const recidCost=trueRecid.reduce((s,r)=>s+r.cost,0);
    h+=`<div style="margin:14px 0 6px;padding:8px 12px;background:var(--sf2);border-radius:8px;border-left:3px solid var(--rd)">`;
    h+=`<b style="color:var(--rd)">🔴 True Recidivism / Reincidencia Real</b> — Same VIN + Same Part`;
    h+=`<span style="margin-left:12px;font-size:11px;color:var(--tx2)">${fN(trueRecid.length)} cases · ${f$(recidCost)} total cost</span></div>`;
    h+='<div class="tw"><table><thead><tr><th>VIN (last 6)</th><th>Part</th><th>Project</th><th>Repeat Count</th><th>Cause Code</th><th>Cost</th><th>Months</th><th>Dealers</th></tr></thead><tbody>';
    trueRecid.slice(0,25).forEach(r=>{
      const sevColor=r.count>=3?'var(--rd)':'var(--or)';
      h+=`<tr><td style="font-family:'JetBrains Mono',monospace">…${r.vin.slice(-6)}</td><td>${esc(tr(r.part,25))}</td><td>${esc(r.proj)}</td><td style="color:${sevColor};font-weight:700">${r.count}×</td><td style="font-family:'JetBrains Mono',monospace">${esc(r.causeCode)}</td><td>${f$(r.cost)}</td><td style="font-size:10px">${r.months.sort().join(', ')}</td><td>${esc([...r.dealers].join(', '))}</td></tr>`;
    });
    h+='</tbody></table></div>';
    h+=mkBar(ag(trueRecid.map(r=>({partNM:r.part})),'partNM','count').slice(0,10),'count','Parts with Most Recidivism');
  } else {
    h+=`<p style="color:var(--gn);margin-top:10px">✅ No true recidivism found (no VIN claimed twice for the same part).</p>`;
  }
  _lastExport=repeats;
  h+=mkExpBtn(repeats,'Export Repeat VINs');
  h+=`<span class="st">Repeat VIN · ${fN(repeats.length)} vehicles · ${fN(trueRecid.length)} true recidivism</span>`;
  return h;
}

// ===== V6: COST BREAKDOWN / WATERFALL =====
function mkWaterfall(items,title){
  if(!items.length)return'';
  const mx=Math.max(...items.map(i=>i.pCost+i.lCost));
  let h=`<div class="cb"><div class="ct">${esc(title)}</div>`;
  h+=`<div style="display:flex;gap:8px;margin-bottom:8px;font-size:9px"><span style="color:#60a5fa">● Part Cost</span><span style="color:#a78bfa">● Labor Cost</span><span style="color:#fb923c">● Outsource</span></div>`;
  items.forEach((it,i)=>{
    const total=it.pCost+it.lCost+(it.outsource||0);
    const pW=mx>0?(it.pCost/mx*100):0;
    const lW=mx>0?(it.lCost/mx*100):0;
    const oW=mx>0?((it.outsource||0)/mx*100):0;
    h+=`<div class="br"><span class="bl" title="${esc(it.key)}">${esc(tr(it.key,22))}</span><div class="bt"><div class="wf-seg" style="width:${pW}%;background:#60a5fa;border-radius:4px 0 0 4px" title="Part: ${f$(it.pCost)}"></div><div class="wf-seg" style="width:${lW}%;background:#a78bfa" title="Labor: ${f$(it.lCost)}"></div>${oW>0?`<div class="wf-seg" style="width:${oW}%;background:#fb923c;border-radius:0 4px 4px 0" title="Outsource: ${f$(it.outsource||0)}"></div>`:''}</div><span class="bv">${f$(total)}</span></div>`;
  });
  h+='</div>';return h;
}

function genCostBreakdown(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  const totalP=data.reduce((s,r)=>s+(r.partCost||0),0);
  const totalL=data.reduce((s,r)=>s+(r.laborCost||0),0);
  const totalO=data.reduce((s,r)=>s+(r.outsource||0),0);
  const total=totalP+totalL+totalO;
  let h=`<p><b>💧 Warranty Cost Breakdown / Desglose de Costos</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Part Cost',f$(totalP),'#60a5fa',pc(totalP,total)],['Labor Cost',f$(totalL),'#a78bfa',pc(totalL,total)],
    ['Outsource',f$(totalO),'#fb923c',pc(totalO,total)],['Labor/Part Ratio',(totalP>0?(totalL/totalP).toFixed(2):'—'),'var(--tx2)']]);
  // By system
  const bySys=ag(data,'system','cost');
  const sysItems=bySys.slice(0,10).map(s=>{
    const sysData=data.filter(r=>r.system===s.key);
    return{key:s.key,...s,pCost:sysData.reduce((s2,r)=>s2+(r.partCost||0),0),
      lCost:sysData.reduce((s2,r)=>s2+(r.laborCost||0),0),
      outsource:sysData.reduce((s2,r)=>s2+(r.outsource||0),0)};
  });
  h+=mkWaterfall(sysItems,'Cost Breakdown by System');
  // By project
  const byProj=ag(data,'proj','cost');
  const projItems=byProj.map(p=>{
    const pData=data.filter(r=>r.proj===p.key);
    return{key:p.key,...p,pCost:pData.reduce((s,r)=>s+(r.partCost||0),0),
      lCost:pData.reduce((s,r)=>s+(r.laborCost||0),0),
      outsource:pData.reduce((s,r)=>s+(r.outsource||0),0)};
  });
  h+=mkWaterfall(projItems,'Cost Breakdown by Project');
  // Table
  h+=mkTbl(sysItems,[{l:'System',k:'key',f:v=>esc(v)},{l:'Part Cost',k:'pCost',f:v=>f$(v)},{l:'Labor Cost',k:'lCost',f:v=>f$(v)},
    {l:'Outsource',k:'outsource',f:v=>f$(v)},{l:'Total',k:'cost',f:v=>f$(v)},{l:'L/P Ratio',k:'key',f:(_,it)=>it.pCost>0?(it.lCost/it.pCost).toFixed(2):'—'}]);
  h+=`<span class="st">Cost Breakdown · ${fN(data.length)} claims · ${f$(total)}</span>`;
  return h;
}

// ===== V6: MILEAGE DISTRIBUTION HISTOGRAM =====
function mkHistogram(data,title){
  const bands=[{label:'0-1K',min:0,max:1000},{label:'1-5K',min:1000,max:5000},{label:'5-10K',min:5000,max:10000},
    {label:'10-20K',min:10000,max:20000},{label:'20-30K',min:20000,max:30000},{label:'30-50K',min:30000,max:50000},{label:'50K+',min:50000,max:Infinity}];
  const counts=bands.map(b=>({...b,count:data.filter(r=>r.mileage>=b.min&&r.mileage<b.max).length}));
  const mx=Math.max(...counts.map(c=>c.count),1);
  let h=`<div class="cb"><div class="ct">${esc(title)}</div><div class="hist-wrap">`;
  const colors=['#34d399','#38bdf8','#60a5fa','#a78bfa','#f472b6','#fb923c','#f87171'];
  counts.forEach((c,i)=>{
    const pct=mx>0?(c.count/mx*100):0;
    h+=`<div class="hist-bar" style="height:${Math.max(pct,2)}%;background:${colors[i]}" title="${c.label}: ${c.count} claims">`;
    if(c.count>0)h+=`<div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);font:600 10px 'JetBrains Mono',monospace;color:${colors[i]}">${c.count}</div>`;
    h+=`</div>`;
  });
  h+=`</div><div style="display:flex;gap:4px;padding:0 4px">`;
  counts.forEach(c=>h+=`<div class="hist-lbl" style="flex:1">${c.label}</div>`);
  h+=`</div></div>`;
  return h;
}

function genMileageDist(I){
  const data=flt(gDS(),I.filters).filter(r=>r.mileage>0);
  if(!data.length)return'<p>No mileage data available.</p>';
  const fd=fdsc(I.filters);
  const sorted=data.map(r=>r.mileage).sort((a,b)=>a-b);
  const mean=sorted.reduce((s,v)=>s+v,0)/sorted.length;
  const median=sorted[Math.floor(sorted.length/2)];
  const earlyLife=data.filter(r=>r.mileage<5000).length;
  const highMileage=data.filter(r=>r.mileage>30000).length;
  let h=`<p><b>📊 Mileage Distribution / Distribución por Kilometraje</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Mean Mileage',fN(mean)+' km','var(--ac)'],['Median',fN(median)+' km','var(--gn)'],
    ['Early-Life (<5K)',fN(earlyLife),'var(--or)',pc(earlyLife,data.length)],
    ['High Mileage (>30K)',fN(highMileage),'var(--pu)',pc(highMileage,data.length)]]);
  h+=mkHistogram(data,'Overall Mileage Distribution (km)');
  // Per-project comparison
  const projs=[...new Set(data.map(r=>r.proj))].filter(Boolean);
  if(projs.length>1){
    projs.forEach(p=>{
      const pData=data.filter(r=>r.proj===p);
      if(pData.length>=5)h+=mkHistogram(pData,`${p} — Mileage Distribution (${pData.length} claims)`);
    });
  }
  h+=`<span class="st">Mileage Distribution · ${fN(data.length)} claims</span>`;
  return h;
}

// ===== V6: INTERACTIVE DRILL-DOWN =====
function drill(field,value){
  let q='';
  if(field==='partNM')q=`Analysis of ${value}`;
  else if(field==='dealer')q=`Top 10 parts for dealer ${value}`;
  else if(field==='system')q=`Top 10 parts by ${value} system`;
  else if(field==='devName')q=`Top 10 parts by supplier ${value}`;
  else if(field==='nation')q=`Top 10 parts ${value}`;
  else if(field==='proj')q=`Analysis of project ${value}`;
  else q=`Top 10 by ${field} ${value}`;
  inp.value=q;send();
}

// ===== V6: EXECUTIVE REPORT =====
function genExecReport(I){
  const all=gDS();if(!all.length)return'<p>No data.</p>';
  const tc=all.reduce((s,r)=>s+(r.totalCost||0),0);
  const today=new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  let h=`<div class="print-hdr"><h1>Executive Quality Report — Warranty 2 Prevention</h1><p>${today} · ${dsl()} · ${fN(all.length)} warranty claims</p></div>`;
  h+=`<p><b>🖨️ Executive Quality Report / Reporte Ejecutivo</b> — ${today}</p>`;
  h+=mkKPIs([['Total Claims',fN(all.length),'var(--ac)'],['Total Cost',f$(tc),'var(--or)'],
    ['Avg Cost',f$(all.length?tc/all.length:0),'var(--yl)'],['Unique Parts',fN([...new Set(all.map(r=>r.partNM))].length),'var(--pu)']]);
  h+=mkBar(ag(all,'partNM','count').slice(0,10),'count','Top 10 Parts by Claims');
  h+=mkBar(ag(all,'partNM','cost').slice(0,10),'cost','Top 10 Parts by Cost');
  // By project
  const prjs=[...new Set(all.map(r=>r.proj))].filter(Boolean);
  const rows=prjs.map(p=>{const d=all.filter(r=>r.proj===p);const tc2=d.reduce((s,r)=>s+(r.totalCost||0),0);
    return{proj:p,claims:d.length,cost:tc2,avgC:d.length?tc2/d.length:0};});
  h+=mkTbl(rows,[{l:'Project',k:'proj',f:v=>`<b>${v}</b>`},{l:'Claims',k:'claims',f:v=>fN(v)},{l:'Cost',k:'cost',f:v=>f$(v)},{l:'Avg Cost',k:'avgC',f:v=>f$(v)}]);
  // Monthly trend
  const byM=ag(all,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key)));
  h+=mkBar(byM,'count','Trend by Sale Month');
  // Top systems
  h+=mkDonut(ag(all,'system','count'),'By System');
  // Map
  const usData=all.filter(r=>r.nation==='U.S.A'&&r.state);
  if(usData.length>=5)h+=mkMap(usData,'USA Geographic Distribution',false);
  h+=`<p style="margin-top:12px;font-size:10px;color:var(--tx3)">Generated by Warranty 2 Prevention v6 · ${today}</p>`;
  h+=`<span class="st print-hide">Executive Report · ${dsl()}</span>`;
  setTimeout(()=>window.print(),500);
  return h;
}

// ===== V6: SUPPLIER RISK SCORECARD =====
function mkRiskGauge(score){
  const angle=-90+score*1.8; // -90 to 90 degrees
  const color=score>80?'var(--rd)':score>60?'var(--or)':score>30?'var(--yl)':'var(--gn)';
  return`<svg class="risk-gauge" viewBox="0 0 60 35" width="50" height="30">
    <path d="M5,30 A25,25 0 0,1 55,30" fill="none" stroke="var(--bd)" stroke-width="5" stroke-linecap="round"/>
    <path d="M5,30 A25,25 0 0,1 55,30" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${score*0.785},100"/>
    <text x="30" y="28" text-anchor="middle" fill="${color}" font-size="10" font-weight="700" font-family="JetBrains Mono">${score}</text></svg>`;
}

function genSupplierRisk(I){
  const data=flt(gDS(),I.filters);if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  const byDev={};
  for(const r of data){
    const k=r.devName||'Unknown';
    if(!byDev[k])byDev[k]={count:0,cost:0,parts:new Set(),systems:new Set()};
    byDev[k].count+=(r.claims||1);byDev[k].cost+=(r.totalCost||0);
    byDev[k].parts.add(r.partNM);byDev[k].systems.add(r.system);
  }
  const suppliers=Object.entries(byDev).map(([k,v])=>({key:k,count:v.count,cost:v.cost,
    partCount:v.parts.size,sysCount:v.systems.size}));
  if(!suppliers.length)return'<p>No supplier data.</p>';
  // Normalize 0-100
  const mxCount=Math.max(...suppliers.map(s=>s.count));
  const mxCost=Math.max(...suppliers.map(s=>s.cost));
  const mxDiv=Math.max(...suppliers.map(s=>s.partCount));
  suppliers.forEach(s=>{
    const nVol=mxCount>0?s.count/mxCount*100:0;
    const nCost=mxCost>0?s.cost/mxCost*100:0;
    const nDiv=mxDiv>0?s.partCount/mxDiv*100:0;
    s.riskScore=Math.round(0.4*nVol+0.4*nCost+0.2*nDiv);
  });
  suppliers.sort((a,b)=>b.riskScore-a.riskScore);
  const top5claims=suppliers.slice(0,5).reduce((s,x)=>s+x.count,0);
  const top5pct=data.length>0?(top5claims/data.length*100).toFixed(1):0;
  let h=`<p><b>🏭 Supplier Risk Scorecard / Evaluación de Riesgo</b>${fd?' | '+fd:''} | ${dsl()}</p>`;
  h+=mkKPIs([['Suppliers Analyzed',fN(suppliers.length),'var(--ac)'],
    ['Top 5 Concentration',top5pct+'%','var(--or)',`${top5claims} of ${data.length} claims`],
    ['Highest Risk',esc(tr(suppliers[0].key,18)),'var(--rd)',`Score: ${suppliers[0].riskScore}`],
    ['Claims Total',fN(data.length),'var(--pu)']]);
  // Risk table with gauges
  h+='<div class="tw"><table><thead><tr><th>Risk</th><th>Supplier</th><th>Score</th><th>Claims</th><th>Cost</th><th>Parts</th><th>Systems</th></tr></thead><tbody>';
  suppliers.slice(0,20).forEach(s=>{
    const sevColor=s.riskScore>80?'var(--rd)':s.riskScore>60?'var(--or)':s.riskScore>30?'var(--yl)':'var(--gn)';
    h+=`<tr><td>${mkRiskGauge(s.riskScore)}</td><td>${esc(tr(s.key,25))}</td><td style="color:${sevColor};font-weight:700">${s.riskScore}</td><td>${fN(s.count)}</td><td>${f$(s.cost)}</td><td>${s.partCount}</td><td>${s.sysCount}</td></tr>`;
  });
  h+='</tbody></table></div>';
  h+=mkBar(suppliers.slice(0,10).map(s=>({key:s.key,value:s.riskScore})),'count','Supplier Risk Ranking (Score 0-100)');
  h+=mkTreemap(suppliers.slice(0,12).map(s=>({key:s.key,value:s.count})),'Supplier Claim Distribution');
  _lastExport=suppliers;
  h+=mkExpBtn(suppliers,'Export Supplier Risk');
  h+=`<span class="st">Supplier Risk · ${fN(suppliers.length)} suppliers</span>`;
  return h;
}

// ===== V6: PERIOD COMPARISON (3M vs 12M) =====
function genPeriodCompare(I){
  const d3m=flt(D['3M']||[],I.filters);
  const d12m=flt(D['12M']||[],I.filters);
  if(!d3m.length&&!d12m.length)return'<p>No data for period comparison.</p>';
  const fd=fdsc(I.filters);
  // Compute top parts for both
  const top3m=ag(d3m,'partNM','count').slice(0,15);
  const top12m=ag(d12m,'partNM','count');
  const map12m={};top12m.forEach(p=>map12m[p.key]={count:p.count,cost:p.cost});
  // Months in each dataset
  const months3m=new Set(d3m.map(r=>r.confMonth)).size||1;
  const months12m=new Set(d12m.map(r=>r.confMonth)).size||1;
  // Build comparison
  const items=top3m.map(p=>{
    const m12=map12m[p.key]||{count:0,cost:0};
    const rate3m=p.count/months3m;
    const rate12m=m12.count/months12m;
    const rateChange=rate12m>0?((rate3m-rate12m)/rate12m*100):rate3m>0?100:0;
    return{key:p.key,count3m:p.count,count12m:m12.count,rate3m,rate12m,rateChange,
      cost3m:p.cost,cost12m:m12.cost};
  });
  items.sort((a,b)=>b.rateChange-a.rateChange);
  const improving=items.filter(i=>i.rateChange<-10);
  const worsening=items.filter(i=>i.rateChange>10);
  let h=`<p><b>📐 Period Comparison: 3M vs 12M / Comparación de Período</b>${fd?' | '+fd:''}</p>`;
  h+=mkKPIs([['3M Claims/Month',fN(d3m.length/months3m,1),'var(--ac)',`${fN(d3m.length)} total`],
    ['12M Claims/Month',fN(d12m.length/months12m,1),'var(--or)',`${fN(d12m.length)} total`],
    ['Worsening Parts',fN(worsening.length),'var(--rd)'],
    ['Improving Parts',fN(improving.length),'var(--gn)']]);
  // Delta table
  h+='<div class="tw"><table><thead><tr><th>Part</th><th>3M Count</th><th>3M Rate/Mo</th><th>12M Rate/Mo</th><th>Change</th><th>Direction</th></tr></thead><tbody>';
  items.forEach(it=>{
    const dir=it.rateChange>10?'⬆️ Worsening':it.rateChange<-10?'⬇️ Improving':'➡️ Stable';
    const color=it.rateChange>10?'var(--rd)':it.rateChange<-10?'var(--gn)':'var(--tx2)';
    h+=`<tr><td>${esc(tr(it.key,28))}</td><td>${it.count3m}</td><td>${it.rate3m.toFixed(1)}</td><td>${it.rate12m.toFixed(1)}</td><td style="color:${color};font-weight:700">${it.rateChange>0?'+':''}${it.rateChange.toFixed(0)}%</td><td>${dir}</td></tr>`;
  });
  h+='</tbody></table></div>';
  // Delta bar chart
  const deltaItems=items.slice(0,10).map(it=>({key:it.key,value:Math.abs(it.rateChange),_dir:it.rateChange>0?'up':'down'}));
  h+=`<div class="cb"><div class="ct">Rate Change Magnitude (Top 10)</div>`;
  const dMx=Math.max(...deltaItems.map(d=>d.value),1);
  deltaItems.forEach((it,i)=>{
    const p=dMx>0?(it.value/dMx*100):0;
    const col=it._dir==='up'?'var(--rd)':'var(--gn)';
    h+=`<div class="br"><span class="bl">${esc(tr(it.key,22))}</span><div class="bt"><div class="bf" style="width:${p}%;background:${col}"></div></div><span class="bv" style="color:${col}">${it._dir==='up'?'+':'−'}${it.value.toFixed(0)}%</span></div>`;
  });
  h+='</div>';
  h+=`<span class="st">Period Compare · 3M (${months3m}mo) vs 12M (${months12m}mo)</span>`;
  return h;
}

