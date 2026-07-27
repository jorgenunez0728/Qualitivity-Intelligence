// ===== NLP v2: FUZZY MATCHING (Level 2) =====
function _trigram(s){const t=new Set();const p='  '+s.toLowerCase()+'  ';for(let i=0;i<p.length-2;i++)t.add(p.slice(i,i+3));return t;}
function _jaccard(a,b){let inter=0;for(const x of a)if(b.has(x))inter++;return inter/(a.size+b.size-inter)||0;}
function fuzzyMatch(q,candidates,thresh){
  if(!candidates||!candidates.length)return null;
  // tokenize query — extract words > 2 chars
  const qWords=q.toLowerCase().replace(/[^a-z0-9\s]/g,'').split(/\s+/).filter(w=>w.length>2);
  if(!qWords.length)return null;
  const qTri=_trigram(qWords.join(' '));
  let best=null,bestScore=0;
  for(const c of candidates){
    const cl=c.toLowerCase();
    const cTri=_trigram(cl);
    let score=_jaccard(qTri,cTri);
    // Substring bonus: if any query word appears in candidate
    for(const w of qWords){if(cl.includes(w))score+=0.25;}
    // Token overlap: how many query words appear in candidate tokens
    const cWords=cl.replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2);
    let overlap=0;for(const w of qWords)for(const cw of cWords){if(cw.includes(w)||w.includes(cw))overlap++;}
    score+=overlap*0.15;
    if(score>bestScore){bestScore=score;best=c;}
  }
  return bestScore>=thresh?best:null;
}
function buildIdx(){
  const all=gDS();
  _IDX={
    parts:[...new Set(all.map(r=>r.partNM).filter(Boolean))],
    dealers:[...new Set(all.map(r=>String(r.dealer||'')).filter(Boolean))],
    suppliers:[...new Set(all.map(r=>r.devName).filter(Boolean))],
    failures:[...new Set(all.map(r=>r.natName).filter(Boolean))]
  };
}

// ===== NLP v2: TEMPORAL LOGIC (Level 5B) =====
function parseTemporal(lo){
  const now=new Date();const cy=now.getFullYear();const cm=now.getMonth();
  // Month name map — EN/ES/KO short+long
  const _MN={jan:0,ene:0,feb:1,mar:2,apr:3,abr:3,may:4,jun:5,jul:6,aug:7,ago:7,sep:8,oct:9,nov:10,dec:11,dic:11,
    january:0,enero:0,february:1,febrero:1,march:2,marzo:2,april:3,abril:3,mayo:4,june:5,junio:5,july:6,julio:6,
    august:7,agosto:7,september:8,septiembre:8,october:9,octubre:9,november:10,noviembre:10,december:11,diciembre:11,
    '1월':0,'2월':1,'3월':2,'4월':3,'5월':4,'6월':5,'7월':6,'8월':7,'9월':8,'10월':9,'11월':10,'12월':11};
  // Q1-Q4 with optional year
  let m=lo.match(/q([1-4])\s*(\d{4})?/);
  if(m){const q=+m[1],y=m[2]?+m[2]:cy;return{monthFilter:[(q-1)*3+1,(q-1)*3+2,(q-1)*3+3].map(mo=>`${y}-${String(mo).padStart(2,'0')}`)};}
  // "last quarter" / "último trimestre"
  if(/last\s*quarter|ultimo\s*trimestre|지난\s*분기/.test(lo)){
    let pq=Math.floor(cm/3)-1,py=cy;if(pq<0){pq=3;py--;}
    return{monthFilter:[pq*3+1,pq*3+2,pq*3+3].map(mo=>`${py}-${String(mo).padStart(2,'0')}`)};
  }
  // "this quarter" / "este trimestre"
  if(/this\s*quarter|este\s*trimestre|이번\s*분기/.test(lo)){
    const cq=Math.floor(cm/3);
    return{monthFilter:[cq*3+1,cq*3+2,cq*3+3].map(mo=>`${cy}-${String(mo).padStart(2,'0')}`)};
  }
  // "last N months" / "últimos N meses"
  m=lo.match(/last\s*(\d+)\s*months?|ultimos?\s*(\d+)\s*meses?|지난\s*(\d+)\s*개월/);
  if(m){
    const n=+(m[1]||m[2]||m[3]);const months=[];
    for(let i=1;i<=n;i++){const d=new Date(cy,cm-i,1);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}
    return{monthFilter:months};
  }
  // "this year" / "este año"
  if(/this\s*year|este\s*a[nñ]o|올해/.test(lo)){
    return{monthFilter:Array.from({length:12},(_,i)=>`${cy}-${String(i+1).padStart(2,'0')}`)};
  }
  // "last year" / "año pasado"
  if(/last\s*year|a[nñ]o\s*pasado|지난\s*해/.test(lo)){
    return{monthFilter:Array.from({length:12},(_,i)=>`${cy-1}-${String(i+1).padStart(2,'0')}`)};
  }
  // "year over year" / "yoy"
  if(/year\s*over\s*year|yoy|a[nñ]o\s*(contra|vs|sobre)\s*a[nñ]o|전년\s*대비/.test(lo)){
    return{comparison:'yoy'};
  }
  // Season detection — winter/summer/etc
  if(/winter|invierno|겨울/.test(lo)){return{monthFilter:[12,1,2].flatMap(mo=>[cy,cy-1].map(y=>`${y}-${String(mo).padStart(2,'0')}`))};}
  if(/summer|verano|여름/.test(lo)){return{monthFilter:[6,7,8].flatMap(mo=>[cy,cy-1].map(y=>`${y}-${String(mo).padStart(2,'0')}`))};}
  if(/spring|primavera|봄/.test(lo)){return{monthFilter:[3,4,5].flatMap(mo=>[cy,cy-1].map(y=>`${y}-${String(mo).padStart(2,'0')}`))};}
  if(/fall|autumn|oto[nñ]o|가을/.test(lo)){return{monthFilter:[9,10,11].flatMap(mo=>[cy,cy-1].map(y=>`${y}-${String(mo).padStart(2,'0')}`))};}
  // Month name detection — "January", "febrero", "julio 2025", "en marzo", "during july"
  // Check for explicit year + month first
  m=lo.match(/(\d{4})\s*[-\/]?\s*(\d{1,2})\b/);
  if(m){const y=+m[1],mo=+m[2];if(mo>=1&&mo<=12)return{monthFilter:[`${y}-${String(mo).padStart(2,'0')}`]};}
  // Then named months — with optional year
  for(const[name,idx]of Object.entries(_MN)){
    if(typeof name==='string'&&name.length>=3&&lo.includes(name)){
      const moNum=idx+1;
      // Check for an adjacent year: "january 2025" / "2025 enero"
      const yrM=lo.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(\\d{4})|(\\d{4})\\s*'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
      if(yrM){
        const yr=+(yrM[1]||yrM[2]);
        return{monthFilter:[`${yr}-${String(moNum).padStart(2,'0')}`]};
      }
      // No year specified — match across all years in data
      const allYears=[cy-2,cy-1,cy,cy+1];
      return{monthFilter:allYears.map(y=>`${y}-${String(moNum).padStart(2,'0')}`)};
    }
  }
  // YYYY-MM format at end of string
  m=lo.match(/(\d{4})-(\d{2})/);
  if(m)return{monthFilter:[m[0]]};
  return null;
}

// ===== NLP v2: SCORED MULTI-INTENT (Level 3) =====
const INTENT_DEFS=[
  {type:'kpimetrics',kw:[{p:/kpi|indicador/,w:10},{p:/claim\s*trend|tendencia.*reclam/,w:12},{p:/dc\s*trend|dc\s*claim/,w:12},{p:/3m\s*trend|3m\s*claim|3m\s*status/,w:12},{p:/wm\s*trend|wm\s*claim|12m\s*trend|12m\s*claim|12m\s*status/,w:12},{p:/metricas|metrics|index.*sales|indice.*ventas/,w:10},{p:/status\s*report|reporte.*status/,w:9},{p:/overall.*status|status.*general/,w:9}],min:9},
  {type:'climate',kw:[{p:/climate\s*correlat|correlacion.*clima|clima.*correlaci|기후.*상관/,w:12},{p:/weather\s*correlat|analisis.*climatico/,w:12},{p:/climate\s*analy/,w:10},{p:/temperature.*claim|claim.*temperature|temperatura.*reclam/,w:8},{p:/humidity|humedad/,w:4},{p:/climate|clima|기후/,w:3}],min:6},
  {type:'insights',kw:[{p:/intelligence\s*brief/,w:12},{p:/insights?|briefing|hallazgos|인사이트/,w:8},{p:/informe\s*inteligencia/,w:10}],min:7},
  {type:'alert',kw:[{p:/early\s*warn|deteccion\s*temprana/,w:12},{p:/\balert|alerta|경고/,w:8},{p:/spike|pico/,w:6},{p:/warning/,w:5}],min:6,neg:/flag|anomal/},
  {type:'forecast',kw:[{p:/forecast|pronostico|예측/,w:10},{p:/proyecc?ion|predict|predic|projection/,w:8}],min:7},
  {type:'repeatvin',kw:[{p:/repeat.*vin|vin.*repeat|repetido.*vin|reincidente/,w:12},{p:/re-?claim|반복|재발/,w:6},{p:/vin|vehic|vehicle|auto/,w:3}],min:9},
  {type:'costbreakdown',kw:[{p:/cost\s*split|labor.*cost|labour|mano\s*de\s*obra|비용\s*분석/,w:10},{p:/\bbreakdown\b|desglose|waterfall/,w:7}],min:7,neg:/stratif/},
  {type:'mileagehist',kw:[{p:/histogram/,w:10},{p:/distribuc?ion.*mileage|mileage\s*distribu|주행\s*분포/,w:12},{p:/분포/,w:5}],min:7},
  {type:'report',kw:[{p:/executive.*report|reporte.*ejecutivo|보고서/,w:12},{p:/\breport\b|reporte/,w:7},{p:/print|imprimir/,w:5}],min:6,neg:/climate|anomal/},
  {type:'exportxls',kw:[{p:/excel|xlsx|xls/,w:8},{p:/export|exportar|download|descargar|다운로드/,w:5}],min:12},
  {type:'export',kw:[{p:/\bexport\b|exportar|\bcsv\b|download|descargar|다운로드/,w:8}],min:7},
  {type:'dashbuilder',kw:[{p:/dashboard\s*build|constructor.*dashboard|custom\s*dashboard|build.*dashboard|armar.*dashboard/,w:12}],min:10},
  {type:'snapshots',kw:[{p:/snapshot|version|versiones/,w:6},{p:/histor.*datos|data\s*version/,w:8},{p:/data|dato/,w:2}],min:8},
  {type:'vizstudio',kw:[{p:/viz\s*studio/,w:12},{p:/estudio|combina|combine|mixer|mezcla|customize|personaliza/,w:5},{p:/drag|swap|mix\s*viz|studio/,w:6}],min:7},
  {type:'whatif',kw:[{p:/what.?if|simulad|절감/,w:10},{p:/savings|ahorro|si\s*reduci|cost\s*reduc/,w:8}],min:8},
  {type:'sankey',kw:[{p:/sankey/,w:12},{p:/flow|flujo|경로/,w:6},{p:/pathway|ruta.*falla/,w:8}],min:6,neg:/cash|caja/},
  {type:'dealerscore',kw:[{p:/dealer\s*score|scorecard\s*dealer|evaluar\s*dealer|딜러\s*평가/,w:12},{p:/radar.*dealer|dealer\s*radar|dealer\s*perf/,w:10}],min:9},
  {type:'presentation',kw:[{p:/modo\s*present|demo\s*mode|pantalla\s*completa|프레젠테이션/,w:12},{p:/present.*mode|presentation/,w:10},{p:/fullscreen/,w:8}],min:8},
  {type:'worldmap',kw:[{p:/world\s*map|global\s*map|mapa\s*mundo|mapa\s*global|세계\s*지도/,w:12},{p:/all\s*markets|todos.*mercados/,w:10}],min:10},
  {type:'mexicomap',kw:[{p:/mexi[ck]o\s*map|mapa\s*mexi[ck]o|멕시코\s*지도/,w:12}],min:10},
  {type:'canadamap',kw:[{p:/canad[a]?\s*map|mapa\s*canad[a]?|캐나다\s*지도/,w:12}],min:10},
  {type:'australiamap',kw:[{p:/australi[a]?\s*map|mapa\s*australi[a]?|호주\s*지도/,w:12}],min:10},
  {type:'supplierrisk',kw:[{p:/supplier\s*risk|riesgo\s*proveedor|공급업체\s*위험/,w:12},{p:/scorecard/,w:5}],min:10},
  {type:'periodcompare',kw:[{p:/period\s*compar|기간\s*비교/,w:12},{p:/3m\s*vs\s*12m/,w:12},{p:/improvement|mejora|deterioro|getting\s*better|getting\s*worse/,w:8},{p:/periodo/,w:5}],min:7},
  {type:'map',kw:[{p:/\bmap\b|mapa\b|지도/,w:8},{p:/geographic|geografic/,w:7}],min:6},
  {type:'ranking',kw:[{p:/top|ranking|principales/,w:7},{p:/mas\s+|mayor|상위/,w:5},{p:/best|worst|mejor|peor/,w:6}],min:5},
  {type:'trend',kw:[{p:/trend|tendencia|evolucion|추세/,w:8},{p:/mensual|monthly|월/,w:5},{p:/over\s*time|a\s*lo\s*largo|historico|historico/,w:6}],min:5},
  {type:'heatmap',kw:[{p:/heatmap|mapa\s*de\s*calor|히트맵/,w:10}],min:8},
  {type:'pareto',kw:[{p:/pareto/,w:12}],min:10},
  {type:'scatter',kw:[{p:/scatter|dispersi|산점도/,w:10}],min:8},
  {type:'summary',kw:[{p:/summary|resumen|dashboard|요약|개요/,w:8},{p:/overview|vista\s*general|general|panorama|status|estado\s*general/,w:7},{p:/how\s*(are|is)\s*(the|my|our|los|las|el)|como\s*(est[aá]n?|van|anda)\s*(los|las|el|mi)/,w:8}],min:6},
  {type:'comparison',kw:[{p:/compare|comparar|비교/,w:8},{p:/\bvs\b/,w:5}],min:6},
  {type:'anomaly',kw:[{p:/flag|anomal|이상|abus/,w:8},{p:/anormal/,w:7}],min:6},
  {type:'detail',kw:[{p:/detail|detalle|list|lista|목록/,w:7}],min:5},
  {type:'donut',kw:[{p:/donut|pie|pastel|원형|dona/,w:10}],min:8},
  {type:'stratification',kw:[{p:/stratif|estratif/,w:10},{p:/breakdown|분석/,w:5}],min:8},
  {type:'failuremode',kw:[{p:/failure\s*mode|modo\s*de\s*falla|modos?\s*de\s*falla|고장\s*모드/,w:12},{p:/customer\s*(complaint|failure)|queja.*cliente/,w:10},{p:/failure\s*mode\s*analy/,w:14}],min:9},
  {type:'analysis',kw:[{p:/analysis|analisis|분석/,w:6},{p:/que\s*pasa|what.?s\s*(happening|going|wrong)|como\s*(est[aá]|van|anda)/,w:7},{p:/show\s*me|muestr|ensena|dame/,w:3}],min:5},
];

function scoreIntent(lo,I){
  const scores=[];
  for(const def of INTENT_DEFS){
    if(def.neg&&def.neg.test(lo))continue;
    let s=0;
    for(const kw of def.kw){if(kw.p.test(lo))s+=kw.w;}
    if(s>=def.min)scores.push({type:def.type,score:s});
  }
  scores.sort((a,b)=>b.score-a.score);
  if(!scores.length)return;
  I.type=scores[0].type;
  I._confidence=scores[0].score;
  // Check for ambiguity — top 2 within 25%
  if(scores.length>=2&&scores[1].score>=scores[0].score*0.75){
    I._ambiguous=[scores[0].type,scores[1].type];
  }
  // Special: map + normalized
  if(I.type==='map'&&/normaliz|ponder|weight|index|per\s*capita|adjust/.test(lo))I.normalized=true;
  // Special: ranking auto-groupBy
  if(I.type==='ranking'&&!I.groupBy){
    if(/part|parte|부품/.test(lo))I.groupBy='partNM';
    else if(/supplier|proveedor|공급/.test(lo))I.groupBy='devName';
    else if(/dealer|딜러/.test(lo))I.groupBy='dealer';
    else if(/state|estado|주/.test(lo))I.groupBy='state';
    else if(/pais|country|nation|국가/.test(lo))I.groupBy='nation';
    else I.groupBy='partNM';
  }
  if(I.type==='trend')I.groupBy='salesMonth';
}

// ===== NLP v2: CONVERSATIONAL CONTEXT (Level 4) =====
const FOLLOWUP=[
  {p:/^(same|mismo|lo mismo|igual)\s*(but|pero|for|para|in|en|with|con)\s*/i,action:'modify'},
  {p:/^(now|ahora)\s*(by|por|in|en|with|con)\s*/i,action:'modify'},
  {p:/^(add|agregar?|include|incluir|tambien|also|y tambien)\s*/i,action:'add'},
  {p:/^(remove|quitar?|without|sin|except|excepto|excluding|excluy)\s*/i,action:'remove'},
  {p:/^(show more|mas resultados|more results|ampliar|top \d+)/i,action:'expand'},
  {p:/^(same|igual|lo mismo|repeat|repetir)$/i,action:'repeat'},
];

function parseFollowUp(q,lastI){
  if(!lastI)return null;
  const lo=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for(const f of FOLLOWUP){
    const m=lo.match(f.p);
    if(!m)continue;
    const clone=JSON.parse(JSON.stringify(lastI));
    clone._followUp=true;
    clone._ambiguous=null;
    const rest=lo.slice(m[0].length).trim();
    if(f.action==='repeat')return clone;
    if(f.action==='expand'){
      const nm=lo.match(/(\d+)/);if(nm)clone.limit=+nm[1];else clone.limit=Math.min(clone.limit+10,50);
      return clone;
    }
    // Parse the remainder for entities
    const delta=parse(rest);
    if(f.action==='modify'){
      // Merge new filters/metric/groupBy into clone
      if(delta.metric!=='count')clone.metric=delta.metric;
      if(delta.groupBy)clone.groupBy=delta.groupBy;
      for(const[k,v]of Object.entries(delta.filters)){
        if(!k.startsWith('_')||k==='_sysCategory'||k==='_hvac'||k==='_months')clone.filters[k]=v;
      }
      if(delta.viz)clone.viz=delta.viz;
      if(delta.limit!==10)clone.limit=delta.limit;
      return clone;
    }
    if(f.action==='add'){
      for(const[k,v]of Object.entries(delta.filters)){
        if(clone.filters[k]&&!Array.isArray(clone.filters[k])){
          clone.filters[k]=[clone.filters[k],v];
        }else if(Array.isArray(clone.filters[k])){
          clone.filters[k].push(v);
        }else{
          clone.filters[k]=v;
        }
      }
      return clone;
    }
    if(f.action==='remove'){
      for(const k of Object.keys(delta.filters)){
        delete clone.filters[k];
      }
      // Also remove matching internal filters
      if(delta.filters._sysCategory)delete clone.filters._sysCategory;
      return clone;
    }
  }
  return null;
}

// ===== NLP v2: PARSE TRANSPARENCY BAR (Level 1) =====
function mkParseBar(I,dataLen){
  const tags=[];
  const tip=typeof PARSE_TIPS!=='undefined'&&PARSE_TIPS[I.type]?` data-tip="${PARSE_TIPS[I.type]}"`:'';
  tags.push(`<span class="pt hi"${tip}>${I.type}</span>`);
  if(I.groupBy)tags.push(`<span class="pt" data-tip="Grouped by ${I.groupBy} field">by ${I.groupBy}</span>`);
  if(I.metric!=='count')tags.push(`<span class="pt" data-tip="Sorting/measuring by ${I.metric}">${I.metric}</span>`);
  for(const[k,v]of Object.entries(I.filters||{})){
    if(k.startsWith('_')&&k!=='_sysCategory'&&k!=='_hvac'&&k!=='_months'&&k!=='_natSearch'&&k!=='_failureMode'&&k!=='_failureSub')continue;
    if(k==='_sysCategory')tags.push(`<span class="pt pf" data-tip="Smart category filter: ${v}">${v}</span>`);
    else if(k==='_hvac')tags.push(`<span class="pt pf" data-tip="Heating, ventilation & air conditioning filter">HVAC</span>`);
    else if(k==='_months')tags.push(`<span class="pt pf" data-tip="Temporal filter: specific months">${Array.isArray(v)?v.length+' months':v}</span>`);
    else if(k==='_natSearch')tags.push(`<span class="pt pf" data-tip="Searching failure modes/comments for: ${v.join(', ')}">symptom: ${v.join(' | ')}</span>`);
    else if(k==='_failureMode')tags.push(`<span class="pt pf" data-tip="Customer failure mode category: ${cfmLabel(v)}" style="background:var(--ac);color:var(--bg)">⚡ ${cfmLabel(v)}</span>`);
    else if(k==='_failureSub')tags.push(`<span class="pt pf" data-tip="Sub-category: ${cfmSubLabel(v)}" style="background:var(--pu);color:#fff">→ ${cfmSubLabel(v)}</span>`);
    else if(k.startsWith('!')){tags.push(`<span class="pt" style="color:var(--rd)" data-tip="Excluding this value">NOT ${k.slice(1)}=${Array.isArray(v)?v.join(','):v}</span>`);}
    else tags.push(`<span class="pt pf" data-tip="Filter: ${k}">${k}=${Array.isArray(v)?v.join(' | '):v}</span>`);
  }
  tags.push(`<span class="pt" data-tip="Records matching all filters">${fN(dataLen)} claims</span>`);
  if(I.limit&&I.limit!==10)tags.push(`<span class="pt" data-tip="Max results to show">limit ${I.limit}</span>`);
  if(I._confidence)tags.push(`<span class="pt pc" data-tip="Parser confidence score (higher = more certain)">conf:${I._confidence}</span>`);
  if(I._followUp)tags.push(`<span class="pt pc" data-tip="Modified from previous query">↩ follow-up</span>`);
  if(I._fuzzyMatch)tags.push(`<span class="pt pc" data-tip="Part name matched approximately from data index">≈ fuzzy: ${I._fuzzyMatch}</span>`);
  return`<div class="pb">${tags.join(' · ')}</div>`;
}

// ===== NLP PARSER =====
function parse(q){
const lo=q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const I={type:'unknown',filters:{},groupBy:null,limit:10,metric:'count',viz:null};
const lm=lo.match(/top\s*(\d+)|primeros?\s*(\d+)|(\d+)\s*(?:principales|primeros)/);
if(lm)I.limit=parseInt(lm[1]||lm[2]||lm[3]);
if(/cost|costo|precio|gasto|비용/.test(lo))I.metric='cost';
else if(/mileage|kilometr|km|주행/.test(lo))I.metric='mileage';
if(/by\s*part|por\s*parte|부품별|per\s*part/.test(lo))I.groupBy='partNM';
else if(/by\s*system|por\s*sistema|시스템별|per\s*system/.test(lo))I.groupBy='system';
else if(/by\s*project|por\s*proyecto|por\s*modelo|by\s*model|모델별|per\s*project/.test(lo))I.groupBy='proj';
else if(/by\s*nation|por\s*pais|by\s*country|국가별|시장별|by\s*market|per\s*market|por\s*mercado/.test(lo))I.groupBy='nation';
else if(/by\s*nature|modo\s*de\s*falla|failure\s*mode|불량유형/.test(lo))I.groupBy='natName';
else if(/by\s*supplier|por\s*proveedor|공급업체별|per\s*supplier/.test(lo))I.groupBy='devName';
else if(/by\s*dealer|por\s*dealer|딜러별|per\s*dealer|por\s*distribuidor/.test(lo))I.groupBy='dealer';
else if(/by\s*month|por\s*mes|월별|monthly|mensual|per\s*month/.test(lo))I.groupBy='salesMonth';
else if(/by\s*state|por\s*estado|주별|per\s*state/.test(lo))I.groupBy='state';
else if(/by\s*cause|por\s*causa|원인별|per\s*cause/.test(lo))I.groupBy='causeCode';
// Viz hints
if(/\bmap\b|mapa\b|지도|geographic|geografic/.test(lo))I.viz='map';
else if(/heatmap|mapa de calor|히트맵/.test(lo)&&/state|estado|usa|region|geographic|geografic/.test(lo))I.viz='map';
else if(/heatmap|mapa de calor|히트맵/.test(lo))I.viz='heatmap';
else if(/pareto/.test(lo))I.viz='pareto';
else if(/scatter|dispersi|산점도/.test(lo))I.viz='scatter';
else if(/pie|pastel|donut|dona|원형/.test(lo))I.viz='donut';
else if(/treemap/.test(lo))I.viz='treemap';
// Intent — Level 3: scored multi-intent system
scoreIntent(lo,I);
// Fallback: smart routing based on detected context
if(I.type==='unknown'){
  // Casual question patterns → analysis or summary
  const _casual=/que\s*pasa|what.?s\s*(happening|going|wrong|up)|como\s*(est[aá]|van|anda)|show\s*me|muestr|dame|ensena|how\s*(are|is|many)|cuantos?|cuantas?|dime|tell\s*me/;
  if(I.filters._sysCategory)I.type='analysis';
  else if(/cost|costo/.test(lo)&&/part|parte/.test(lo)){I.type='ranking';I.groupBy='partNM';I.metric='cost';}
  else if(/supplier|proveedor|공급/.test(lo)){I.type='ranking';I.groupBy='devName';}
  else if(/common|comun|frecuente|repair|reparacion/.test(lo)){I.type='ranking';if(!I.groupBy)I.groupBy='natName';}
  else if(/state|estado/.test(lo)&&/claim|garanti|reclam/.test(lo))I.type='map';
  // If a specific part or HVAC was detected with casual language → analysis
  else if((I.filters.partNM||I.filters._hvac)&&_casual.test(lo))I.type='analysis';
  // If a specific part was detected → analysis (user wants to know about that part)
  else if(I.filters.partNM)I.type='analysis';
  // If casual question with nation/project → summary for that context
  else if(_casual.test(lo)&&(I.filters.nation||I.filters.proj))I.type='summary';
  else{I.type='ranking';if(!I.groupBy)I.groupBy='partNM';}
}
// Symptom search detected later will override groupBy if not set — handled after _natSearch detection
// Filters — Level 5A: compound nation detection (OR logic)
const _negation=/\b(except|excepto|sin|without|excluding|excluy)\s+/i.test(lo);
const _negWord=lo.match(/\b(?:except|excepto|sin|without|excluding|excluy)\s+(\S+)/i);
const nations=[];
const NAT_MAP=[
  [/\busa\b|\bu\.?s\.?a\.?\b|united states|estados unidos|미국/,'U.S.A'],
  [/\bmexi[ck]o\b|\bmex\b|멕시코/,'Mexico',/nuevo|pesqu/],
  [/\bcanad[a]?\b|캐나다/,'Canada'],
  [/\baustrali[a]?\b|호주/,'Australia'],
  [/\bcolombi[a]?\b/,'Colombia'],
  [/\bper[uú]\b/,'Peru'],
  [/\bpanama?\b/,'Panama'],
  [/\bchile\b/,'Chile'],
  [/\bpuerto\s*rico\b/,'Puerto Rico'],
  [/\bsaud[ií]\b|saudi/,'Saudi'],
  [/\bkuwait\b/,'Kuwait'],
  [/\bqatar\b/,'Qatar'],
  [/\bu\.?a\.?e\.?\b|emirates|emiratos/,'U.A.E'],
  [/\bira[qk]\b/,'Iraq'],
  [/\begypt|egipto/,'Egypt'],
  [/\bnigeri[a]?\b/,'Nigeria'],
  [/domestic|nacional|내수/,'Mexico'],
];
for(const[rx,nat,neg]of NAT_MAP){if(rx.test(lo)&&(!neg||!neg.test(lo)))nations.push(nat);}
if(nations.length===1){
  if(_negation)I.filters['!nation']=nations[0];
  else I.filters.nation=nations[0];
} else if(nations.length>1){
  I.filters.nation=nations; // array = OR
}
if(!nations.length){
  if(/north america|norteameric|북미/.test(lo))I.filters.region='North America';
  else if(/latin america|latinoamerica|latam|중남미/.test(lo))I.filters.region='Latin America';
  else if(/middle east|medio oriente|중동/.test(lo))I.filters.region='Middle East';
  else if(/pacific|pacifico|태평양/.test(lo))I.filters.region='Pacific';
}
if(/\bcl4\b/.test(lo))I.filters.proj='CL4';
else if(/\bnx4m?\b|tucson/.test(lo))I.filters.proj='NX4M';
else if(/\bbl7m?\b/.test(lo))I.filters.proj='BL7M';
else if(/\bbdm\b/.test(lo))I.filters.proj='BDM';
else if(/\bsc\b/.test(lo)&&!/scorecard|scatter/.test(lo))I.filters.proj='SC';
if(/\belectron\b|electrico|electrical|전자/.test(lo))I.filters.system='Electron';
else if(/\btrim\b|트림/.test(lo))I.filters.system='Trim';
else if(/\bchassis\b|chasis|샤시|suspension|suspens/.test(lo))I.filters.system='Chassis';
else if(/\bengine\b|motor\b|엔진/.test(lo)&&!/warning|light/.test(lo))I.filters.system='Engine';
else if(/\btm\b|transmisi|변속|transmission/.test(lo))I.filters.system='TM';
else if(/infotainment|인포|multimedia|pantalla|screen|display/.test(lo)&&!/infotainment/.test(I.filters.partNM||''))I.filters.system='Infotainment';
// Part filters — hardcoded known parts first, then fuzzy fallback (Level 2)
if(/batter[yia]|배터리/.test(lo))I.filters.partNM='BATTERY ASSY';
else if(/oxygen|oxigeno|o2.*sensor|산소/.test(lo))I.filters.partNM='SENSOR ASSY-OXYGEN';
else if(/\bhorn\b|claxon|bocina|혼/.test(lo))I.filters.partNM='HORN ASSY-LOW PITCH';
else if(/\bcvt\b|transaxle/.test(lo))I.filters.partNM='TRANSAXLE ASSY-CVT';
else if(/\bbdc\b/.test(lo))I.filters.partNM='UNIT ASSY-BDC';
else if(/tpms/.test(lo))I.filters.partNM='VALVE-TPMS';
else if(/brake|freno|브레이크/.test(lo))I.filters.partNM='CYLINDER ASSY-BRAKE MASTER';
else if(/smart.*key|fob|llave/.test(lo))I.filters.partNM='FOB-SMART KEY';
else if(/wiring.*main|arnes.*main|배선/.test(lo))I.filters.partNM='WIRING ASSY-MAIN';
else if(/\bac\s|a\/c|hvac|air\s*cond|aire\s*acond|cooling\b|enfri|not\s*cool|no\s*enfr|climatiza|calefac|heater|heating|에어컨/.test(lo)){
  I.filters._hvac=true;
}
// Failure mode / symptom text search — detect symptom keywords in query
const _SYMPTOM_KW=/noise|ruido|crack|pop\b|vibra|leak|fuga|squeak|rechinido|inoper|short|corto|malfunc|rattle|traqueteo|loose|floj|stuck|atorad|overheat|sobreca|flicker|parpadea|intermit|drain|descarg|corrosi|corros|warp|deform|misalign|desalinea|no\s*(funciona|enciende|arranca|enfr[ií]a|program|responde|abre|cierra|trabaja|prende|sirve|jala|detecta|comunica|sincroniza)|not\s*(work|start|cool|open|clos|respond|function|detect|program|recogni|pair|sync|communicat)|can\s*(?:not|'t|t)\s*(program|be\s*program|start|open|close|detect|pair|sync|recogni|communicat|be\s*detect|be\s*recogni)|will\s*not\s*(work|start|program|detect|open|close|function)|won.?t\s*(work|start|program|detect|open|close)|does\s*n.?t\s*(work|start|program|detect|respond|open|close)|소음|진동|누수/;
if(_SYMPTOM_KW.test(lo)){
  // Strip NLP noise + known part names + known filters to isolate symptom description
  const _partWords=(I.filters.partNM||'').toLowerCase().replace(/[_-]/g,' ').split(/\s+/).filter(w=>w.length>2);
  const natQ=lo.replace(/\b(cuantos?|cuantas?|how\s*many|of\b|claims?|garanti|warranty|que|tienen?|tiene|que\s*ver|con|del?|los?|las?|el|la|en|por|usa|u\.?s\.?a|mexi[ck]o|canada|australia|colombia|peru|panama|chile|saudi|kuwait|qatar|analysis|analisis|modo\s*de\s*falla|failure\s*mode|ranking|top\s*\d*|show|me|the|for|with|during|cl4|nx4m?|bl7m?|map|mapa|temperature|temperatura|trend|tendencia|heatmap|scatter|pareto|donut|treemap|monthly|mensual|geographic|geografic|climate|clima|correlation|correlacion|normalized|ponderado|average|avg|promedio|january|febrero|march|marzo|april|abril|mayo|june|junio|july|julio|august|agosto|september|septiembre|october|octubre|november|noviembre|december|diciembre|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dic)\b/g,'').replace(new RegExp('\\b('+_partWords.join('|')+')\\b','gi'),'').replace(/\s+/g,' ').trim();
  if(natQ.length>2){
    const terms=natQ.split(/\s+(?:o\b|or\b|y\b|and\b)\s+/).map(t=>t.trim()).filter(t=>t.length>2);
    I.filters._natSearch=terms.length?terms:[natQ];
  }
}
// No se filtra por safety='Y': el campo 'safety part' viene 'N' en el 100%
// de los 31,664 registros de los tres datasets (verificado), así que ese
// filtro garantizaba 0 resultados siempre para cualquier consulta de
// seguridad. La categoría inteligente 'safety' (más abajo) sí encuentra
// señal real vía nombre de parte (AIRBAG/SRS/RESTRAINT, 82 reclamos).
// Smart system category detection — skip when searching by symptom text.
// Runs BEFORE the fuzzy part matcher (Level 2, below): a category match like
// "powertrain" or "safety" is more useful than a weak fuzzy hit on an
// obscure, low-volume part name ("CASE-TRANSMISSION", "BOLT-SAFETY LOCK")
// that happens to share a token with the query. Running fuzzy match first
// used to win by construction, since line below deletes _sysCategory
// whenever partNM is already set — silently turning "Powertrain analysis"
// into a 0-claim report on a single unrelated part.
if(!I.filters._natSearch)for(const[cat,cfg]of Object.entries(SYS_CAT)){
  if(cfg.kw.test(lo)){
    I.filters._sysCategory=cat;
    break;
  }
}
// Don't add system category when an explicit (hardcoded) part is already set — it's redundant and can cause false negatives
if(I.filters.partNM&&I.filters._sysCategory)delete I.filters._sysCategory;
// Level 2: Fuzzy part matching — only if no hardcoded match, no smart category, and no symptom search
if(!I.filters.partNM&&!I.filters._hvac&&!I.filters._sysCategory&&!I.filters._natSearch&&_IDX){
  // Strip common NLP words to get potential part name fragment
  const partQ=lo.replace(/\b(top|ranking|analysis|trend|map|by|cost|show|me|the|in|for|with|usa|mexico|canada|claims?|parts?|por|de|los|las|del|en|con|que|mas|el|la|un|una)\b/g,'').trim();
  if(partQ.length>3){
    const pm=fuzzyMatch(partQ,_IDX.parts,0.4);
    if(pm){I.filters.partNM=pm;I._fuzzyMatch=pm;}
  }
}
// When searching by symptom, default to groupBy natName and route to analysis for detailed view
if(I.filters._natSearch&&!I.groupBy)I.groupBy='natName';
if(I.filters._natSearch&&(I.filters.partNM||I.filters._sysCategory||I.filters._hvac))I.type='analysis';
// Failure mode category filter — detect failure mode keywords and set _failureMode filter
const _FM_PARSE={not_starting:/\bnot\s*start|no\s*(arranca|enciende|prende)|won.?t\s*start|dead\s*battery|jump\s*start|stall|se\s*apag/i,warning_light:/\bwarning|testigo|check\s*engine|light\s*on|dtc|airbag\s*light|alert|alerta/i,not_working:/\binoper|not\s*work|no\s*funciona|won.?t\s*work|won.?t\s*open|horn\s*inop|wiper|blower/i,noise_vibration:/\b(noise|ruido|vibra(tion|ci[oó]n)|squeak|rattle|knock|clunk|grind|bruit)/i,fluid_leak:/\b(leak|fuga|fluid|oil\b|aceite|moisture|coolant|water\s*leak)/i,physical_damage:/\b(broken|roto|crack|damage|da[ñn]o|loose|scratch|rust|peel|missing)/i,performance:/\b(performance|pull(ing|s)?\s*(left|right)|hard\s*to|soft\s*(pedal|brake)|rough\s*idle|shift|jerk|jalonea|sluggish|weak)/i,ac_climate:/\b(a\/?c|air\s*cond|aire\s*acond|no\s*enfr|not\s*cool|no\s*heat|smoke|humo|olor)/i,electrical:/\b(battery|bater|charg|light\s*out|lamp|faro|wiring|sensor|electr|fuse)/i,infotainment:/\b(screen|display|camera|speaker|audio|radio|bluetooth|infotainment|monitor|pantalla)/i,body_access:/\b(door|puerta|window|ventana|trunk|hatch|cajuela|seat\s*belt|key\s*fob|mirror|espejo|windshield)/i,intermittent:/\bintermit|err[aá]tic|sporadic|comes\s*and\s*goes/i,pdi_delivery:/\bpdi|pre.?delivery/i};
// Build a version of the query without part-name words to avoid false FM matches
let _fmLo=lo;
if(I.filters.partNM){
  const _pw=I.filters.partNM.toLowerCase().replace(/[_-]/g,' ').split(/\s+/).filter(w=>w.length>2);
  if(_pw.length)_fmLo=lo.replace(new RegExp('\\b('+_pw.join('|')+')\\b','gi'),'');
}
for(const[fmId,fmRx]of Object.entries(_FM_PARSE)){if(fmRx.test(_fmLo)){I.filters._failureMode=fmId;break;}}
// When _failureMode matched AND _natSearch is set, prefer _failureMode (pre-classified, more reliable than raw text)
if(I.filters._failureMode&&I.filters._natSearch)delete I.filters._natSearch;
// Subcategory detection — match subcategory labels as query terms
if(!I.filters._failureSub){for(const sub of Object.values(CFM_SUB_LOOKUP)){const sl=sub.label.toLowerCase().replace(/[^a-z0-9\s]/g,'');if(lo.includes(sl)&&sl.length>4){I.filters._failureSub=sub.id;if(!I.filters._failureMode)I.filters._failureMode=sub.cat;break;}}}
// VIN detail intent
if(/^vin\s+\w/i.test(lo))I.type='vin_detail';
// CFM comments table intent — when failure mode/subcategory with "comments"/"comentarios" etc.
if((I.filters._failureSub||I.filters._failureMode)&&/comment|comentario|detail|drill|show|ver|lista|list|table|tabla/i.test(lo))I.type='cfm_comments';
// If a subcategory is detected and no other explicit type, default to cfm_comments (drill-down behavior)
if(I.filters._failureSub&&(I.type==='unknown'||I.type==='ranking'))I.type='cfm_comments';
// Failure mode analysis intent detection
if(/failure\s*mode|modo\s*de\s*falla|modos?\s*de\s*falla|customer\s*(complaint|failure)|queja.*cliente|고장\s*모드|failure\s*mode\s*analysis/i.test(lo))I.type='failuremode';
// When failure mode filter active with part/system, route to failuremode (shows full breakdown with focus)
if((I.filters._failureMode||I.filters._failureSub)&&(I.filters.partNM||I.filters._sysCategory)&&I.type!=='cfm_comments'&&I.type!=='vin_detail'&&I.type!=='map'&&I.type!=='climate')I.type='failuremode';
// Normalized map hint
if(/normaliz|ponder|weight|index|per\s*capita|adjust|por\s*venta|per\s*sale|sales\s*volume/.test(lo))I.normalized=true;
// Level 5B: Temporal logic
const _temporal=parseTemporal(lo);
if(_temporal){
  if(_temporal.monthFilter)I.filters._months=_temporal.monthFilter;
  if(_temporal.comparison)I._comparison=_temporal.comparison;
}
// Auto-detect market context: if nation/region filter set but no specific map type, hint the right map
I._autoMarket=null;
if(I.filters.nation==='Mexico')I._autoMarket='mexico';
else if(I.filters.nation==='Canada')I._autoMarket='canada';
else if(I.filters.nation==='Australia')I._autoMarket='australia';
else if(I.filters.region==='Latin America')I._autoMarket='latam';
else if(I.filters.region==='Middle East')I._autoMarket='middleeast';
else if(['Colombia','Peru','Panama','Chile','Puerto Rico','Ecuador','Argentina','Paraguay','Uruguay','El Salvador','Guatemala','Honduras','Nicaragua','Costa Rica','Dominican Republic'].includes(I.filters.nation))I._autoMarket='latam';
else if(['Saudi','Kuwait','Qatar','U.A.E','Iraq','Jordan','Oman','Bahrain','Egypt'].includes(I.filters.nation))I._autoMarket='middleeast';
I._rawQuery=q;
return I;
}

