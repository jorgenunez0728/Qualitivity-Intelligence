// ===== INIT =====
function init(){
  const all=[...D['3M'],...D['DC'],...D['12M']];
  document.getElementById('pC').innerHTML=`Claims: <b>${fN(all.length)}</b>`;
  buildIdx(); // Level 2: build fuzzy entity index
  mkChips();
  addM(`<p style="font-size:17px;margin-bottom:6px"><b>Warranty 2 Prevention</b></p>
<p style="color:var(--tx2);font-size:13.5px">Quality analytics for KIA warranty operations. Ask a question or select an analysis below.</p>`,false);
  // Hide loader, show splash, then focus
  document.getElementById('lo').style.display='none';
  showSplash(()=>{
    inp.focus();
    // Auto-start tour on first visit
    if(!localStorage.getItem('qi_tour_done')){
      setTimeout(()=>startTour(),600);
    }
  });
  // Restore presentation mode
  if(localStorage.getItem('qi_pres')==='1')document.body.classList.add('pres');
  // Setup keyboard shortcuts
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();showCmdPal();}
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key==='P'){e.preventDefault();togglePres();}
  });
}

window.addEventListener('load',()=>{
  if(typeof QUALITIVITY_DATA!=='undefined'){
    D['3M']=QUALITIVITY_DATA['3M']||[];
    D['DC']=QUALITIVITY_DATA['DC']||[];
    if(typeof QUALITIVITY_12M_COLS!=='undefined'){
      const cols=QUALITIVITY_12M_COLS;
      D['12M']=QUALITIVITY_12M_ROWS.map(row=>{const o={};cols.forEach((c,i)=>{o[c]=row[i]});return o;});
    }
    if(typeof US_SALES_BY_STATE!=='undefined')SALES_ST=US_SALES_BY_STATE;
    if(typeof QUALITIVITY_DATA!=='undefined'&&QUALITIVITY_DATA.monthly_sales)KPI_MONTHLY_SALES=QUALITIVITY_DATA.monthly_sales;
    // Normalize DC salesMonth from retailSalesMonth when salesMonth is bad
    const _MO_NAMES={'January':'01','February':'02','March':'03','April':'04','May':'05','June':'06','July':'07','August':'08','September':'09','October':'10','November':'11','December':'12'};
    for(const r of D['DC']){
      if((!r.salesMonth||r.salesMonth==='1900-01')&&r.retailSalesMonth){
        const mo=_MO_NAMES[r.retailSalesMonth];
        if(mo&&r.confMonth){const cY=+r.confMonth.slice(0,4),cM=+r.confMonth.slice(5,7),sM=+mo;r.salesMonth=(sM>cM?cY-1:cY)+'-'+mo;}
      }
    }
    // Pre-compute customer failure modes from [C] comments
    for(const ds of['3M','DC','12M']){if(!D[ds])continue;for(const r of D[ds]){r._custComment=extractCC(r.comment);const _cfmR=categorizeFailure(r._custComment);r._failureMode=_cfmR.cat;r._failureSub=_cfmR.sub;}}
    // Load any previously imported data from IndexedDB
    loadImportedData().then(()=>init());
  } else {
    // Even without embedded data, check IndexedDB for imported data
    loadImportedData().then(()=>{
      if(D['3M'].length||D['12M'].length)init();
      else document.getElementById('lo').querySelector('p').textContent='No data found. Use 📥 Import to load data.';
    });
  }
});

// ===== V7: DATA IMPORT MODULE =====
// Supports CSV/TSV file upload, parses in browser, merges with existing data (dedup by VIN+confMonth+partNM)

function showImportModal(){
  let existing=document.getElementById('importModal');
  if(existing){existing.style.display='flex';return;}
  const modal=document.createElement('div');
  modal.id='importModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML=`<div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:16px;color:var(--ac)">📥 Import Qualitivity Data</h3>
      <button onclick="document.getElementById('importModal').style.display='none'" style="background:none;border:none;color:var(--tx2);font-size:18px;cursor:pointer">✕</button>
    </div>
    <p style="font-size:12px;color:var(--tx2);margin-bottom:12px">Upload a CSV or TSV file exported from Qualitivity. Data will be <b>merged</b> with existing records — duplicates (same VIN + month + part) are skipped.</p>
    <div id="importDropZone" style="border:2px dashed var(--bd2);border-radius:10px;padding:30px;text-align:center;cursor:pointer;transition:border-color .2s" onclick="document.getElementById('importFileInput').click()" ondragover="event.preventDefault();this.style.borderColor='var(--ac)'" ondragleave="this.style.borderColor='var(--bd2)'" ondrop="event.preventDefault();this.style.borderColor='var(--bd2)';handleImportFile(event.dataTransfer.files[0])">
      <p style="font-size:28px;margin-bottom:8px">📁</p>
      <p style="font-size:13px;color:var(--tx2)">Drop CSV/TSV file here or click to browse</p>
      <p style="font-size:10px;color:var(--tx3);margin-top:4px">Supports: .csv, .tsv, .txt (tab/comma separated)</p>
    </div>
    <input type="file" id="importFileInput" accept=".csv,.tsv,.txt" style="display:none" onchange="handleImportFile(this.files[0])">
    <div id="importStatus" style="margin-top:12px"></div>
    <div style="margin-top:12px;padding:10px;background:var(--sf2);border-radius:8px;font-size:11px;color:var(--tx3)">
      <b>Expected columns:</b> proj, partNM, system, natCode, natName, causeCode, confMonth, useP, mileage, claims, totalCost, nation, region, dealer, devName, state<br>
      <b>Optional:</b> vin, partNo, brand, model, partCost, laborCost, outsource, comment, safety, faultCorp, no, keyParts<br>
      <b>Target dataset:</b> <select id="importTarget" style="background:var(--sf);color:var(--tx);border:1px solid var(--bd);border-radius:4px;padding:2px 6px;font-size:11px">
        <option value="3M">3M (3-Month)</option>
        <option value="12M">12M (12-Month)</option>
        <option value="DC">DC (Dealer Claims)</option>
      </select>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
}

function handleImportFile(file){
  if(!file)return;
  const status=document.getElementById('importStatus');
  status.innerHTML=`<p style="color:var(--ac)">⏳ Reading ${esc(file.name)} (${(file.size/1024).toFixed(1)} KB)...</p>`;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const text=e.target.result;
      const sep=text.indexOf('\t')!==-1?'\t':',';
      const lines=text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){status.innerHTML='<p style="color:var(--rd)">❌ File has no data rows.</p>';return;}
      // Parse header
      const hdr=parseCSVLine(lines[0],sep).map(h=>h.trim().replace(/^["']|["']$/g,''));
      // Map column names to our expected fields
      const colMap=mapImportColumns(hdr);
      if(!colMap._hasMinCols){
        status.innerHTML=`<p style="color:var(--rd)">❌ Could not find minimum required columns. Found: ${hdr.join(', ')}</p>`;return;
      }
      // Parse data rows
      const records=[];
      const errors=[];
      for(let i=1;i<lines.length;i++){
        try{
          const vals=parseCSVLine(lines[i],sep);
          const rec={};
          for(const[ourField,colIdx]of Object.entries(colMap)){
            if(ourField.startsWith('_'))continue;
            const v=vals[colIdx];
            if(v===undefined)continue;
            const clean=v.trim().replace(/^["']|["']$/g,'');
            // Numeric fields
            if(['claims','totalCost','partCost','laborCost','outsource','mileage','useP','no'].includes(ourField)){
              rec[ourField]=parseFloat(clean)||0;
            } else rec[ourField]=clean;
          }
          if(rec.partNM||rec.system)records.push(rec);
        }catch(err){errors.push(i);}
      }
      if(!records.length){status.innerHTML='<p style="color:var(--rd)">❌ No valid records parsed.</p>';return;}
      // Merge with existing data
      const target=document.getElementById('importTarget').value;
      const existing=D[target]||[];
      // Build dedup key set from existing
      const dedupSet=new Set();
      existing.forEach(r=>{
        const key=`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}|${r.dealer||''}`;
        dedupSet.add(key);
      });
      // Filter new records, skip duplicates
      let added=0,skipped=0;
      records.forEach(r=>{
        const key=`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}|${r.dealer||''}`;
        if(dedupSet.has(key)){skipped++;return;}
        dedupSet.add(key);
        D[target].push(r);added++;
      });
      // Save to IndexedDB for persistence
      saveImportedData();
      // Run anomaly detection on new data
      const anomalyReport=detectImportAnomalies(records,existing,target);
      // Refresh KPI strip
      refreshKPIs();
      status.innerHTML=`<div style="padding:10px;background:var(--sf2);border-radius:8px;border-left:3px solid var(--gn)">
        <p style="color:var(--gn);font-weight:600">✅ Import Complete</p>
        <p style="font-size:12px;color:var(--tx2);margin-top:4px">
          <b>${fN(records.length)}</b> records parsed from ${esc(file.name)}<br>
          <b style="color:var(--gn)">${fN(added)}</b> new records added to <b>${target}</b><br>
          <b style="color:var(--or)">${fN(skipped)}</b> duplicates skipped
        </p>
        ${anomalyReport}
        <p style="font-size:10px;color:var(--tx3);margin-top:6px">Data saved to browser storage. Will persist across sessions.</p>
      </div>`;
      // Show alert in chat
      if(added>0){
        addM(`<p><b>📥 Data imported:</b> ${fN(added)} new claims added to ${target} from <i>${esc(file.name)}</i>. ${skipped>0?fN(skipped)+' duplicates skipped.':''}</p>${anomalyReport?'<p style="margin-top:6px"><b>🚨 Import Anomalies Detected:</b></p>'+anomalyReport:''}`,false);
      }
    }catch(err){
      status.innerHTML=`<p style="color:var(--rd)">❌ Parse error: ${esc(err.message)}</p>`;
    }
  };
  reader.readAsText(file);
}

function parseCSVLine(line,sep){
  const result=[];let current='';let inQuotes=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){inQuotes=!inQuotes;continue;}
    if(ch===sep&&!inQuotes){result.push(current);current='';continue;}
    current+=ch;
  }
  result.push(current);return result;
}

function mapImportColumns(headers){
  const map={};let minFound=0;
  const aliases={
    proj:['proj','project','proyecto','model'],
    partNM:['partnm','part_nm','part name','partname','part','parte','nombre parte'],
    system:['system','sistema','sys'],
    natCode:['natcode','nat_code','nature code','naturaleza codigo'],
    natName:['natname','nat_name','nature name','naturaleza nombre','nature','failure mode'],
    causeCode:['causecode','cause_code','cause code','causa','cause'],
    confMonth:['confmonth','conf_month','confirmation month','mes confirmacion','month','mes'],
    useP:['usep','use_period','use period','periodo uso','months in service'],
    mileage:['mileage','km','kilometraje','odometer'],
    claims:['claims','claim count','reclamos','qty'],
    totalCost:['totalcost','total_cost','total cost','costo total','cost'],
    nation:['nation','country','pais','nacion','market'],
    region:['region','zona'],
    dealer:['dealer','distribuidor','dlr','dealer code'],
    devName:['devname','dev_name','developer','supplier','proveedor','supplier name'],
    state:['state','estado','province','provincia'],
    vin:['vin','vehicle','vehiculo'],
    partNo:['partno','part_no','part number','numero parte'],
    brand:['brand','marca'],
    partCost:['partcost','part_cost','part cost','costo parte'],
    laborCost:['laborcost','labor_cost','labor cost','costo mano obra'],
    outsource:['outsource','outsource cost','subcontratado'],
    comment:['comment','comments','comentario','remark','observacion'],
    safety:['safety','seguridad'],
    faultCorp:['faultcorp','fault_corp','fault corporation','corporacion falla'],
    no:['no','number','numero','#'],
    keyParts:['keyparts','key_parts','key parts','partes clave'],
    model:['model','modelo']
  };
  const headerLower=headers.map(h=>h.toLowerCase().trim());
  for(const[field,names]of Object.entries(aliases)){
    for(let i=0;i<headerLower.length;i++){
      if(names.includes(headerLower[i])){
        map[field]=i;
        if(['partNM','system','nation','totalCost'].includes(field))minFound++;
        break;
      }
    }
  }
  map._hasMinCols=minFound>=2;
  return map;
}

function refreshKPIs(){
  const all=[...D['3M'],...D['DC'],...D['12M']];
  const tc=all.reduce((s,r)=>s+(r.totalCost||0),0);
  document.getElementById('pC').innerHTML=`Claims: <b>${fN(all.length)}</b>`;
  const ks=document.getElementById('ks');
  if(ks){
    ks.innerHTML=`
    <div class="kp"><div class="kl">3M</div><div class="kv" style="color:var(--ac)">${fN(D['3M'].length)}</div><div class="ks">${D['3M'].filter(r=>r.proj==='CL4').length} CL4 · ${D['3M'].filter(r=>r.proj==='NX4M').length} NX4M · ${D['3M'].filter(r=>r.proj==='BL7M').length} BL7M</div></div>
    <div class="kp"><div class="kl">DC</div><div class="kv" style="color:var(--gn)">${fN(D['DC'].length)}</div><div class="ks">Dealer Claims</div></div>
    <div class="kp"><div class="kl">12M</div><div class="kv" style="color:var(--or)">${fN(D['12M'].length)}</div><div class="ks">12-Month</div></div>
    <div class="kp"><div class="kl">Total Cost</div><div class="kv" style="color:var(--rd)">${f$(tc)}</div><div class="ks">All datasets</div></div>`;
  }
}

// ===== V7: ANOMALY ALERTS ON IMPORT =====
function detectImportAnomalies(newRecords, existingRecords, target){
  if(!newRecords.length||!existingRecords.length)return'';
  let alerts=[];
  // 1. New parts not seen before
  const existingParts=new Set(existingRecords.map(r=>r.partNM).filter(Boolean));
  const newParts=[...new Set(newRecords.map(r=>r.partNM).filter(p=>p&&!existingParts.has(p)))];
  if(newParts.length>0)alerts.push(`<b>🆕 ${newParts.length} new part(s)</b> not in existing data: ${newParts.slice(0,5).map(p=>esc(p)).join(', ')}${newParts.length>5?' ...':'.'}`);
  // 2. Cost spikes: avg cost in new data vs existing
  const existAvgCost=existingRecords.reduce((s,r)=>s+(r.totalCost||0),0)/existingRecords.length;
  const newAvgCost=newRecords.reduce((s,r)=>s+(r.totalCost||0),0)/newRecords.length;
  if(existAvgCost>0&&newAvgCost>existAvgCost*1.5)alerts.push(`<b>💰 Cost spike:</b> New data avg cost ${f$(newAvgCost)} is ${((newAvgCost/existAvgCost-1)*100).toFixed(0)}% higher than existing ${f$(existAvgCost)}`);
  // 3. New markets
  const existingNations=new Set(existingRecords.map(r=>r.nation).filter(Boolean));
  const newNations=[...new Set(newRecords.map(r=>r.nation).filter(n=>n&&!existingNations.has(n)))];
  if(newNations.length)alerts.push(`<b>🌍 New market(s):</b> ${newNations.join(', ')}`);
  // 4. Volume spike per part
  const existPartCount={};existingRecords.forEach(r=>{if(r.partNM)existPartCount[r.partNM]=(existPartCount[r.partNM]||0)+1;});
  const newPartCount={};newRecords.forEach(r=>{if(r.partNM)newPartCount[r.partNM]=(newPartCount[r.partNM]||0)+1;});
  const spikes=[];
  for(const[part,cnt]of Object.entries(newPartCount)){
    const prev=existPartCount[part]||0;
    if(prev>5&&cnt>prev*2)spikes.push({part,prev,now:cnt,ratio:cnt/prev});
  }
  spikes.sort((a,b)=>b.ratio-a.ratio);
  if(spikes.length)alerts.push(`<b>📈 Volume spikes:</b> ${spikes.slice(0,3).map(s=>esc(s.part)+` (${s.prev}→${s.now}, ${((s.ratio-1)*100).toFixed(0)}%↑)`).join(', ')}`);
  if(!alerts.length)return'';
  return`<div style="margin-top:8px;padding:8px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);border-radius:6px;font-size:11px">${alerts.map(a=>'<p style="margin:3px 0;color:var(--tx2)">'+a+'</p>').join('')}</div>`;
}

// ===== V7: INDEXEDDB DATA PERSISTENCE =====
function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('QualitivityIntelligence',2);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('datasets'))db.createObjectStore('datasets',{keyPath:'id'});
      if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots',{keyPath:'id'});
      if(!db.objectStoreNames.contains('savedQueries'))db.createObjectStore('savedQueries',{keyPath:'id'});
      if(!db.objectStoreNames.contains('history'))db.createObjectStore('history',{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function saveImportedData(){
  try{
    const db=await openDB();
    const tx=db.transaction('datasets','readwrite');
    const store=tx.objectStore('datasets');
    // Save each dataset
    store.put({id:'3M',data:D['3M']});
    store.put({id:'DC',data:D['DC']});
    store.put({id:'12M',data:D['12M']});
    // Also save a snapshot with timestamp
    const snapTx=db.transaction('snapshots','readwrite');
    const snapStore=snapTx.objectStore('snapshots');
    const ts=new Date().toISOString().slice(0,19).replace('T',' ');
    const all=[...D['3M'],...D['DC'],...D['12M']];
    snapStore.put({id:ts,timestamp:ts,counts:{m3:D['3M'].length,dc:D['DC'].length,m12:D['12M'].length,total:all.length},totalCost:all.reduce((s,r)=>s+(r.totalCost||0),0)});
  }catch(e){console.warn('IndexedDB save failed:',e);}
}

async function loadImportedData(){
  try{
    const db=await openDB();
    const tx=db.transaction('datasets','readonly');
    const store=tx.objectStore('datasets');
    const get3M=store.get('3M');
    const getDC=store.get('DC');
    const get12M=store.get('12M');
    return new Promise(resolve=>{
      tx.oncomplete=()=>{
        // Merge imported data with embedded data (embedded takes precedence, then imported adds on top)
        if(get3M.result&&get3M.result.data){
          const existKeys=new Set(D['3M'].map(r=>`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`));
          get3M.result.data.forEach(r=>{
            const k=`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`;
            if(!existKeys.has(k)){D['3M'].push(r);existKeys.add(k);}
          });
        }
        if(getDC.result&&getDC.result.data){
          const existKeys=new Set(D['DC'].map(r=>`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`));
          getDC.result.data.forEach(r=>{
            const k=`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`;
            if(!existKeys.has(k)){D['DC'].push(r);existKeys.add(k);}
          });
        }
        if(get12M.result&&get12M.result.data){
          const existKeys=new Set(D['12M'].map(r=>`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`));
          get12M.result.data.forEach(r=>{
            const k=`${r.vin||''}|${r.confMonth||''}|${r.partNM||''}`;
            if(!existKeys.has(k)){D['12M'].push(r);existKeys.add(k);}
          });
        }
        // Pre-compute failure modes for imported records
        for(const ds of['3M','DC','12M']){if(!D[ds])continue;for(const r of D[ds]){if(r._failureMode===undefined){r._custComment=extractCC(r.comment);const _cfmR=categorizeFailure(r._custComment);r._failureMode=_cfmR.cat;r._failureSub=_cfmR.sub;}}}
        resolve();
      };
      tx.onerror=()=>resolve();
    });
  }catch(e){console.warn('IndexedDB load failed:',e);return Promise.resolve();}
}

// ===== V7: SAVED QUERIES =====
const SAVED_QUERIES_KEY='qi_saved_queries';

function getSavedQueries(){
  try{return JSON.parse(localStorage.getItem(SAVED_QUERIES_KEY)||'[]');}
  catch(e){return[];}
}

function saveQuery(name,query){
  const queries=getSavedQueries();
  queries.unshift({id:Date.now(),name,query,ts:new Date().toISOString().slice(0,16)});
  if(queries.length>50)queries.length=50;
  localStorage.setItem(SAVED_QUERIES_KEY,JSON.stringify(queries));
}

function deleteSavedQuery(id){
  const queries=getSavedQueries().filter(q=>q.id!==id);
  localStorage.setItem(SAVED_QUERIES_KEY,JSON.stringify(queries));
  showSavedQueries();
}

function showSavedQueries(){
  let modal=document.getElementById('savedModal');
  if(modal){modal.remove();}
  modal=document.createElement('div');
  modal.id='savedModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999';
  const queries=getSavedQueries();
  let content=`<div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:24px;max-width:500px;width:90%;max-height:70vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;color:var(--yl)">⭐ Saved Queries / Consultas Guardadas</h3>
      <button onclick="document.getElementById('savedModal').remove()" style="background:none;border:none;color:var(--tx2);font-size:18px;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <input type="text" id="saveQueryName" placeholder="Name / Nombre..." style="flex:1;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;color:var(--tx);font-size:12px">
      <input type="text" id="saveQueryText" placeholder="Query..." style="flex:1;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;color:var(--tx);font-size:12px">
      <button onclick="saveQuery(document.getElementById('saveQueryName').value,document.getElementById('saveQueryText').value);showSavedQueries();" style="background:var(--acd);border:1px solid var(--ac);border-radius:6px;padding:6px 12px;color:var(--ac);font-size:12px;cursor:pointer">Save</button>
    </div>`;
  if(!queries.length){
    content+=`<p style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">No saved queries yet. Save your favorite queries above, or type a query and use the ⭐ button.</p>`;
  } else {
    queries.forEach(q=>{
      content+=`<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--sf2);border-radius:6px;margin:4px 0;cursor:pointer" onmouseenter="this.style.background='var(--sf3)'" onmouseleave="this.style.background='var(--sf2)'">
        <div style="flex:1" onclick="document.getElementById('savedModal').remove();inp.value='${esc(q.query)}';send();">
          <div style="font-size:12px;font-weight:600;color:var(--tx)">${esc(q.name||q.query)}</div>
          <div style="font-size:10px;color:var(--tx3)">${esc(q.query)} · ${q.ts||''}</div>
        </div>
        <button onclick="event.stopPropagation();deleteSavedQuery(${q.id})" style="background:none;border:none;color:var(--rd);cursor:pointer;font-size:12px">🗑</button>
      </div>`;
    });
  }
  content+=`</div>`;
  modal.innerHTML=content;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

// ===== V7: QUERY HISTORY WITH SEARCH =====
const HISTORY_KEY='qi_query_history';
let _queryHistory=[];

function loadHistory(){
  try{_queryHistory=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');}catch(e){_queryHistory=[];}
}
function addToHistory(query){
  loadHistory();
  // Don't add duplicates of the last entry
  if(_queryHistory.length&&_queryHistory[0].q===query)return;
  _queryHistory.unshift({q:query,ts:new Date().toISOString().slice(0,16)});
  if(_queryHistory.length>200)_queryHistory.length=200;
  localStorage.setItem(HISTORY_KEY,JSON.stringify(_queryHistory));
}
function showHistory(){
  loadHistory();
  let modal=document.getElementById('histModal');
  if(modal)modal.remove();
  modal=document.createElement('div');
  modal.id='histModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999';
  let content=`<div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:24px;max-width:500px;width:90%;max-height:70vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;color:var(--cy)">📜 Query History / Historial</h3>
      <button onclick="document.getElementById('histModal').remove()" style="background:none;border:none;color:var(--tx2);font-size:18px;cursor:pointer">✕</button>
    </div>
    <input type="text" id="histSearch" placeholder="🔍 Search history / Buscar..." oninput="filterHistory(this.value)" style="width:100%;background:var(--sf2);border:1px solid var(--bd);border-radius:6px;padding:8px 12px;color:var(--tx);font-size:12px;margin-bottom:10px">
    <div id="histList">`;
  if(!_queryHistory.length){
    content+=`<p style="color:var(--tx3);font-size:12px;text-align:center;padding:20px">No query history yet.</p>`;
  } else {
    _queryHistory.forEach((h,i)=>{
      content+=`<div class="hist-item" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:12px;color:var(--tx2)" onmouseenter="this.style.background='var(--sf2)'" onmouseleave="this.style.background='transparent'" onclick="document.getElementById('histModal').remove();inp.value='${esc(h.q)}';send();">
        <span style="color:var(--tx3);font-size:10px;min-width:100px">${h.ts||''}</span>
        <span style="flex:1">${esc(h.q)}</span>
        <button onclick="event.stopPropagation();saveQuery(&quot;&quot;,&quot;${esc(h.q)}&quot;);this.textContent='✓';this.style.color='var(--gn)'" style="background:none;border:none;color:var(--yl);cursor:pointer;font-size:11px" title="Save">⭐</button>
      </div>`;
    });
  }
  content+=`</div></div>`;
  modal.innerHTML=content;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

function filterHistory(term){
  const items=document.querySelectorAll('#histList .hist-item');
  const lo=term.toLowerCase();
  items.forEach(item=>{
    const text=item.textContent.toLowerCase();
    item.style.display=text.includes(lo)?'flex':'none';
  });
}

// ===== V7: MULTI-LANGUAGE UI TOGGLE =====
let _uiLang='en';
const UI_STRINGS={
  en:{insights:'Intelligence briefing',alerts:'Early warning spike detection',forecast:'Warranty cost forecast',dashboard:'Summary dashboard overview',welcome:'Type a question or click a chip below',noData:'No claims found.',import:'Import',saved:'Saved',history:'History',export:'Export'},
  es:{insights:'Briefing de inteligencia',alerts:'Detección temprana de picos',forecast:'Pronóstico de costos de garantía',dashboard:'Resumen general dashboard',welcome:'Escribe una pregunta o haz clic en un chip',noData:'Sin resultados encontrados.',import:'Importar',saved:'Guardados',history:'Historial',export:'Exportar'},
  ko:{insights:'인텔리전스 브리핑',alerts:'조기 경보 스파이크 감지',forecast:'보증 비용 예측',dashboard:'요약 대시보드 개요',welcome:'질문을 입력하거나 아래 칩을 클릭하세요',noData:'클레임을 찾을 수 없습니다.',import:'가져오기',saved:'저장됨',history:'기록',export:'내보내기'}
};

function togglePres(){document.body.classList.toggle('pres');localStorage.setItem('qi_pres',document.body.classList.contains('pres')?'1':'0');}
function toggleLang(){
  const langs=['en','es','ko'];
  const idx=langs.indexOf(_uiLang);
  _uiLang=langs[(idx+1)%langs.length];
  const btn=document.getElementById('langBtn');
  if(btn)btn.textContent='🌐 '+_uiLang.toUpperCase();
  // Update placeholder
  const inp2=document.getElementById('inp');
  if(inp2)inp2.placeholder=UI_STRINGS[_uiLang].welcome;
}

// ===== V7: EXCEL EXPORT =====
function exportXLSX(data,filename){
  // Generate a proper Excel XML Spreadsheet (no external library needed)
  filename=filename||'qualitivity_export.xlsx';
  if(!data||!data.length){alert('No data to export.');return;}
  const cols=Object.keys(data[0]);
  let xml='<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>';
  xml+='<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
  xml+='<Worksheet ss:Name="Qualitivity"><Table>';
  // Header row
  xml+='<Row>';cols.forEach(c=>xml+=`<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`);xml+='</Row>';
  // Data rows
  data.forEach(r=>{
    xml+='<Row>';
    cols.forEach(c=>{
      const v=r[c];
      const type=typeof v==='number'?'Number':'String';
      xml+=`<Cell><Data ss:Type="${type}">${type==='Number'?(v||0):esc(String(v||''))}</Data></Cell>`;
    });
    xml+='</Row>';
  });
  xml+='</Table></Worksheet></Workbook>';
  const blob=new Blob([xml],{type:'application/vnd.ms-excel'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename.replace(/\.xlsx$/,'.xml.xls');
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== V7: DASHBOARD BUILDER =====
let _dashSlots=[];
let _dashCounter=0;

function genDashboard(I){
  const data=flt(gDS(),I.filters);
  if(!data.length)return'<p>No data.</p>';
  const fd=fdsc(I.filters);
  let h=`<p><b>📊 Dashboard Builder / Constructor de Dashboard</b>${fd?' | '+fd:''} | ${dsl()} (${fN(data.length)} claims)</p>`;
  h+=`<p style="font-size:11px;color:var(--tx2);margin-bottom:8px">Build your custom dashboard by adding panels. Each panel is independent and can be rearranged.</p>`;
  h+=mkKPIs([['Claims',fN(data.length),'var(--ac)'],['Cost',f$(data.reduce((s,r)=>s+(r.totalCost||0),0)),'var(--or)'],
    ['Parts',fN([...new Set(data.map(r=>r.partNM))].length),'var(--pu)'],['Markets',fN([...new Set(data.map(r=>r.nation))].length),'var(--gn)']]);
  _vizData=data;_vizFilters=I.filters;
  // Dashboard layout with 2-column grid
  const dashId=_dashCounter++;
  h+=`<div id="dash${dashId}" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0">`;
  // Pre-populate with overview panels
  const panels=[
    {title:'Top Parts',html:mkBar(ag(data,'partNM','count').slice(0,8),'count','Top 8 Parts')},
    {title:'System Distribution',html:mkDonut(ag(data,'system','count'),'By System')},
    {title:'Trend by Sale Month',html:mkBar(ag(data,'salesMonth','count').filter(d=>d.key&&d.key>'2000').sort((a,b)=>String(a.key).localeCompare(String(b.key))),'count','Trend by Sale Month')},
    {title:'Markets',html:mkDonut(ag(data,'nation','count'),'By Market')},
  ];
  panels.forEach((p,i)=>{
    h+=`<div class="dash-panel" style="background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px;position:relative;min-height:200px">
      <div style="position:absolute;top:4px;right:4px;display:flex;gap:2px">
        <button onclick="this.closest('.dash-panel').remove()" style="background:none;border:none;color:var(--rd);cursor:pointer;font-size:10px">✕</button>
      </div>
      ${p.html}
    </div>`;
  });
  h+=`</div>`;
  // Add more panels button bar
  h+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0"><span style="font-size:10px;color:var(--tx3);align-self:center">Add panel:</span>`;
  VIZ_TYPES.forEach(vt=>{
    h+=`<button class="viz-btn" onclick="addDashPanel('${vt.id}',${dashId})" title="${vt.label}">${vt.icon}</button>`;
  });
  h+=`</div>`;
  h+=`<span class="st">Dashboard Builder · ${fN(data.length)} claims</span>`;
  return h;
}

function addDashPanel(vizId,dashId){
  const vt=VIZ_TYPES.find(v=>v.id===vizId);
  if(!vt||!_vizData)return;
  const container=document.getElementById('dash'+dashId);
  if(!container)return;
  const panel=document.createElement('div');
  panel.className='dash-panel';
  panel.style.cssText='background:var(--sf2);border:1px solid var(--bd);border-radius:8px;padding:10px;position:relative;min-height:200px';
  const closeBtn=`<div style="position:absolute;top:4px;right:4px"><button onclick="this.closest('.dash-panel').remove()" style="background:none;border:none;color:var(--rd);cursor:pointer;font-size:10px">✕</button></div>`;
  try{
    panel.innerHTML=closeBtn+vt.fn(_vizData,_vizFilters);
  }catch(e){panel.innerHTML=closeBtn+'<p style="color:var(--rd);font-size:11px">Error: '+e.message+'</p>';}
  container.appendChild(panel);
  setTimeout(animKPIs,60);
}

// ===== V7: DATA VERSION SNAPSHOTS =====
async function showSnapshots(){
  try{
    const db=await openDB();
    const tx=db.transaction('snapshots','readonly');
    const store=tx.objectStore('snapshots');
    const req=store.getAll();
    req.onsuccess=()=>{
      const snaps=req.result||[];
      let h=`<p><b>📸 Data Snapshots / Versiones de Datos</b></p>`;
      if(!snaps.length){h+=`<p style="color:var(--tx3)">No snapshots yet. Import data to create snapshots automatically.</p>`;addM(h,false);return;}
      h+=`<div class="tw"><table><thead><tr><th>Timestamp</th><th>3M</th><th>DC</th><th>12M</th><th>Total</th><th>Cost</th></tr></thead><tbody>`;
      snaps.sort((a,b)=>b.id.localeCompare(a.id));
      snaps.forEach(s=>{
        h+=`<tr><td>${s.timestamp}</td><td>${fN(s.counts.m3)}</td><td>${fN(s.counts.dc)}</td><td>${fN(s.counts.m12)}</td><td>${fN(s.counts.total)}</td><td>${f$(s.totalCost)}</td></tr>`;
      });
      h+=`</tbody></table></div>`;
      h+=`<span class="st">Data Versioning · ${snaps.length} snapshots</span>`;
      addM(h,false);
    };
  }catch(e){addM('<p>Error loading snapshots: '+e.message+'</p>',false);}
}

// History loaded on init
loadHistory();
