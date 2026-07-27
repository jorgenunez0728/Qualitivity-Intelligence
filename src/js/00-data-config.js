// ===== US TILE MAP (FiveThirtyEight style) =====
const TILE={
AK:[0,0],ME:[0,10],
WI:[1,5],VT:[1,9],NH:[1,10],
WA:[2,0],ID:[2,1],MT:[2,2],ND:[2,3],MN:[2,4],IL:[2,5],MI:[2,6],NY:[2,7],MA:[2,9],CT:[2,10],
OR:[3,0],NV:[3,1],WY:[3,2],SD:[3,3],IA:[3,4],IN:[3,5],OH:[3,6],PA:[3,7],NJ:[3,8],RI:[3,9],
CA:[4,0],UT:[4,1],CO:[4,2],NE:[4,3],MO:[4,4],KY:[4,5],WV:[4,6],VA:[4,7],MD:[4,8],DE:[4,9],
AZ:[5,1],NM:[5,2],KS:[5,3],AR:[5,4],TN:[5,5],NC:[5,6],SC:[5,7],
OK:[6,3],LA:[6,4],MS:[6,5],AL:[6,6],GA:[6,7],
HI:[7,0],TX:[7,3],FL:[7,7],
};
const ST_NAMES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};

// ===== WORLD TILE MAPS =====
// Mexico — dealer zone codes mapped to approximate regions (6 rows x 8 cols)
const MX_ZONES={
  // Northern border region
  BC:[0,0],SON:[0,1],CHH:[0,2],COA:[0,3],NLE:[0,4],TAM:[0,5],
  // Northwest + central north
  BCS:[1,0],SIN:[1,1],DUR:[1,2],ZAC:[1,3],SLP:[1,4],
  // Central west
  NAY:[2,1],AGS:[2,2],JAL:[2,3],GTO:[2,4],QRO:[2,5],HID:[2,6],
  // Central
  COL:[3,2],MIC:[3,3],MEX:[3,4],CDMX:[3,5],TLX:[3,6],PUE:[3,7],
  // South
  GRO:[4,3],MOR:[4,4],OAX:[4,5],VER:[4,6],
  // Southeast
  TAB:[5,4],CHP:[5,5],CAM:[5,6],YUC:[5,7],QROO:[5,8]
};
const MX_NAMES={AGS:'Aguascalientes',BC:'Baja California',BCS:'Baja California Sur',CAM:'Campeche',CHP:'Chiapas',CHH:'Chihuahua',CDMX:'Ciudad de México',COA:'Coahuila',COL:'Colima',DUR:'Durango',GTO:'Guanajuato',GRO:'Guerrero',HID:'Hidalgo',JAL:'Jalisco',MEX:'Estado de México',MIC:'Michoacán',MOR:'Morelos',NAY:'Nayarit',NLE:'Nuevo León',OAX:'Oaxaca',PUE:'Puebla',QRO:'Querétaro',QROO:'Quintana Roo',SLP:'San Luis Potosí',SIN:'Sinaloa',SON:'Sonora',TAB:'Tabasco',TAM:'Tamaulipas',TLX:'Tlaxcala',VER:'Veracruz',YUC:'Yucatán',ZAC:'Zacatecas'};

// Dealer code prefix → Mexico state mapping (based on KMX dealer coding)
const MX_DEALER_STATE={
  'AC':'CDMX','AD':'CDMX','AM':'MEX','AN':'MEX','AT':'MEX','AQ':'QRO','AG':'AGS',
  'AJ':'JAL','AP':'PUE','AV':'VER','AO':'OAX','AH':'HID','AZ':'ZAC','AA':'AGS',
  'AB':'BC','AS':'SIN','BB':'BCS','BM':'MIC','BS':'SON','BT':'TAM','BD':'DUR',
  'BQ':'QRO','CA':'CAM','CC':'COA','CD':'DUR','CG':'GTO','CJ':'JAL','CM':'MOR',
  'CN':'NLE','CO':'COL','CQ':'QRO','CT':'CHP','CV':'VER',
  'DB':'BC','DC':'CHH','DJ':'JAL','DN':'NAY','DP':'PUE','DQ':'QRO','DS':'SLP','DT':'TAM',
  'EC':'COA','ED':'DUR','EJ':'JAL','EM':'MIC','EN':'NLE','EO':'OAX','EP':'PUE','ES':'SIN','ET':'TAB',
  'FD':'CDMX','FJ':'JAL','FP':'PUE','FS':'SON','FT':'TAM',
  'GO':'GRO','HS':'SON','HP':'PUE','HO':'HID','OH':'OAX','SJ':'SLP'
};

// World regions tile map (4 rows x 7 cols)
const WORLD_TILE={
  CA:[0,0],US:[0,1],MX:[0,2],PR:[0,3],
  CO:[1,2],VE:[1,3],PE:[1,4],EC:[1,5],
  CL:[2,2],AR:[2,3],BR:[2,4],PY:[2,5],UY:[2,6],
  SA:[3,0],AE:[3,1],KW:[3,2],QA:[3,3],AU:[3,5],NZ:[3,6]
};
const WORLD_NAMES={
  US:'United States',CA:'Canada',MX:'Mexico',PR:'Puerto Rico',
  CO:'Colombia',VE:'Venezuela',PE:'Peru',EC:'Ecuador',CL:'Chile',
  AR:'Argentina',BR:'Brazil',PY:'Paraguay',UY:'Uruguay',
  SA:'Saudi Arabia',AE:'U.A.E',KW:'Kuwait',QA:'Qatar',
  AU:'Australia',NZ:'New Zealand',
  GT:'Guatemala',SV:'El Salvador',HN:'Honduras',NI:'Nicaragua',CR:'Costa Rica',PA:'Panama',
  DO:'Dominican Republic',JM:'Jamaica',
  EG:'Egypt',NG:'Nigeria',IQ:'Iraq',JO:'Jordan',OM:'Oman',BH:'Bahrain',LY:'Libya',
  GU:'Guam',AW:'Aruba'
};
// Nation name → country code mapping for world map
const NATION_CODE={
  'U.S.A':'US','Canada':'CA','Mexico':'MX','Puerto Rico':'PR',
  'Colombia':'CO','Peru':'PE','Ecuador':'EC','Chile':'CL',
  'Argentina':'AR','Paraguay':'PY','Uruguay':'UY',
  'Panama':'PA','Costa Rica':'CR','El Salvador':'SV','Guatemala':'GT',
  'Honduras':'HN','Nicaragua':'NI','Dominican Republic':'DO',
  'Saudi':'SA','U.A.E':'AE','Kuwait':'KW','Qatar':'QA',
  'Iraq':'IQ','Jordan':'JO','Oman':'OM','Bahrain':'BH',
  'Egypt':'EG','Nigeria':'NG','Libya':'LY',
  'Australia':'AU','Guam':'GU','Aruba N.A':'AW',
  'Curacao':'CW','Turks and Caicos Islands':'TC'
};

// LATAM tile map (5 rows x 4 cols)
const LATAM_TILE={
  MX:[0,0],GT:[0,1],HN:[0,2],PR:[0,3],
  SV:[1,1],NI:[1,2],DO:[1,3],
  CR:[2,1],PA:[2,2],CO:[2,3],
  EC:[3,0],PE:[3,1],VE:[3,2],
  CL:[4,0],AR:[4,1],PY:[4,2],UY:[4,3]
};

// Middle East tile map (3 rows x 4 cols)
const ME_TILE={
  IQ:[0,1],JO:[0,2],
  KW:[1,0],SA:[1,1],BH:[1,2],QA:[1,3],
  OM:[2,1],AE:[2,2],EG:[2,3]
};
const ME_NAMES={IQ:'Iraq',JO:'Jordan',KW:'Kuwait',SA:'Saudi Arabia',BH:'Bahrain',QA:'Qatar',OM:'Oman',AE:'U.A.E',EG:'Egypt'};

// Canada provinces tile map (5 rows x 8 cols)
const CA_TILE={YT:[0,0],NT:[0,1],NU:[0,4],BC:[2,0],AB:[2,1],SK:[2,2],MB:[2,3],ON:[3,4],QC:[3,5],NL:[3,7],NB:[4,5],NS:[4,6],PE:[4,7]};
const CA_NAMES={AB:'Alberta',BC:'British Columbia',MB:'Manitoba',NB:'New Brunswick',NL:'Newfoundland',NS:'Nova Scotia',NT:'Northwest Territories',NU:'Nunavut',ON:'Ontario',PE:'Prince Edward Island',QC:'Quebec',SK:'Saskatchewan',YT:'Yukon'};

// Australia states tile map (3 rows x 5 cols)
const AU_TILE={NT:[0,2],QLD:[0,3],WA:[1,0],SA:[1,2],NSW:[1,3],ACT:[1,4],VIC:[2,3],TAS:[2,4]};
const AU_NAMES={WA:'Western Australia',NT:'Northern Territory',QLD:'Queensland',SA:'South Australia',NSW:'New South Wales',ACT:'Australian Capital Territory',VIC:'Victoria',TAS:'Tasmania'};

// Canada dealer code prefix → province mapping (KMX coding)
const CA_DEALER_PROV={};  // TODO: populate when dealer coding scheme is known

// ===== MEXICO CLIMATE DATA (SMN / CONAGUA Normals) =====
const MX_CLIMATE={
  "AGS":{"avgTemp":63.5,"winterTemp":52,"summerTemp":75,"precipIn":20.5,"snowIn":0,"humidity":52},
  "BC":{"avgTemp":64.4,"winterTemp":54,"summerTemp":79,"precipIn":10.2,"snowIn":0,"humidity":45},
  "BCS":{"avgTemp":73.4,"winterTemp":64,"summerTemp":86,"precipIn":7.1,"snowIn":0,"humidity":48},
  "CAM":{"avgTemp":80.6,"winterTemp":75,"summerTemp":86,"precipIn":47.2,"snowIn":0,"humidity":78},
  "CHP":{"avgTemp":75.2,"winterTemp":68,"summerTemp":82,"precipIn":59.1,"snowIn":0,"humidity":76},
  "CHH":{"avgTemp":61.7,"winterTemp":43,"summerTemp":81,"precipIn":18.5,"snowIn":3,"humidity":40},
  "CDMX":{"avgTemp":62.6,"winterTemp":55,"summerTemp":68,"precipIn":31.5,"snowIn":0,"humidity":55},
  "COA":{"avgTemp":66.2,"winterTemp":50,"summerTemp":84,"precipIn":14.2,"snowIn":1,"humidity":42},
  "COL":{"avgTemp":77.0,"winterTemp":72,"summerTemp":82,"precipIn":37.0,"snowIn":0,"humidity":68},
  "DUR":{"avgTemp":62.1,"winterTemp":48,"summerTemp":77,"precipIn":18.9,"snowIn":1,"humidity":45},
  "GTO":{"avgTemp":65.3,"winterTemp":55,"summerTemp":74,"precipIn":25.6,"snowIn":0,"humidity":54},
  "GRO":{"avgTemp":77.0,"winterTemp":73,"summerTemp":82,"precipIn":39.4,"snowIn":0,"humidity":65},
  "HID":{"avgTemp":64.4,"winterTemp":55,"summerTemp":72,"precipIn":22.8,"snowIn":0,"humidity":55},
  "JAL":{"avgTemp":68.0,"winterTemp":59,"summerTemp":77,"precipIn":35.4,"snowIn":0,"humidity":58},
  "MEX":{"avgTemp":59.0,"winterTemp":50,"summerTemp":66,"precipIn":31.9,"snowIn":0,"humidity":58},
  "MIC":{"avgTemp":68.0,"winterTemp":61,"summerTemp":75,"precipIn":31.5,"snowIn":0,"humidity":58},
  "MOR":{"avgTemp":72.5,"winterTemp":66,"summerTemp":79,"precipIn":35.4,"snowIn":0,"humidity":58},
  "NAY":{"avgTemp":73.4,"winterTemp":66,"summerTemp":82,"precipIn":45.3,"snowIn":0,"humidity":68},
  "NLE":{"avgTemp":69.8,"winterTemp":55,"summerTemp":86,"precipIn":23.6,"snowIn":0,"humidity":55},
  "OAX":{"avgTemp":71.6,"winterTemp":64,"summerTemp":79,"precipIn":31.5,"snowIn":0,"humidity":62},
  "PUE":{"avgTemp":62.6,"winterTemp":55,"summerTemp":70,"precipIn":35.4,"snowIn":0,"humidity":58},
  "QRO":{"avgTemp":64.4,"winterTemp":55,"summerTemp":73,"precipIn":22.0,"snowIn":0,"humidity":52},
  "QROO":{"avgTemp":80.6,"winterTemp":75,"summerTemp":86,"precipIn":49.2,"snowIn":0,"humidity":80},
  "SLP":{"avgTemp":64.4,"winterTemp":54,"summerTemp":75,"precipIn":15.7,"snowIn":0,"humidity":52},
  "SIN":{"avgTemp":75.2,"winterTemp":66,"summerTemp":86,"precipIn":27.6,"snowIn":0,"humidity":62},
  "SON":{"avgTemp":71.6,"winterTemp":57,"summerTemp":90,"precipIn":15.7,"snowIn":0,"humidity":35},
  "TAB":{"avgTemp":80.6,"winterTemp":75,"summerTemp":86,"precipIn":78.7,"snowIn":0,"humidity":82},
  "TAM":{"avgTemp":73.4,"winterTemp":61,"summerTemp":86,"precipIn":31.5,"snowIn":0,"humidity":62},
  "TLX":{"avgTemp":59.0,"winterTemp":50,"summerTemp":66,"precipIn":27.6,"snowIn":0,"humidity":58},
  "VER":{"avgTemp":73.4,"winterTemp":66,"summerTemp":81,"precipIn":59.1,"snowIn":0,"humidity":72},
  "YUC":{"avgTemp":80.6,"winterTemp":75,"summerTemp":86,"precipIn":39.4,"snowIn":0,"humidity":75},
  "ZAC":{"avgTemp":59.0,"winterTemp":48,"summerTemp":70,"precipIn":18.9,"snowIn":1,"humidity":48}
};
const MX_MONTHLY_TEMP={
  "AGS":[52,55,61,66,72,73,70,70,68,64,57,53],
  "BC":[54,56,59,63,68,74,82,83,79,70,60,54],
  "BCS":[64,65,68,72,77,82,88,88,86,81,72,65],
  "CAM":[75,77,81,84,86,84,84,84,83,81,78,76],
  "CHP":[68,70,75,79,81,79,79,79,78,76,72,69],
  "CHH":[43,48,55,63,72,79,78,76,72,63,52,44],
  "CDMX":[55,57,61,64,66,65,63,63,63,61,58,55],
  "COA":[50,55,62,70,78,83,84,83,78,70,59,51],
  "COL":[72,73,73,75,79,82,82,82,81,79,76,73],
  "DUR":[48,52,57,63,70,75,73,72,70,64,55,49],
  "GTO":[55,58,63,68,72,72,70,70,68,65,59,56],
  "GRO":[73,73,75,78,81,79,79,79,79,78,76,73],
  "HID":[55,57,62,66,68,68,66,66,66,63,59,56],
  "JAL":[59,61,63,68,73,75,73,73,72,70,64,60],
  "MEX":[50,52,57,61,63,63,61,61,61,57,53,50],
  "MIC":[61,63,66,70,73,72,70,70,70,68,64,61],
  "MOR":[66,68,73,77,79,77,75,75,75,73,70,66],
  "NAY":[66,68,70,73,77,81,82,82,81,79,73,68],
  "NLE":[55,59,66,73,81,84,84,84,81,73,63,57],
  "OAX":[64,66,72,75,77,75,73,73,73,72,68,64],
  "PUE":[55,57,63,66,68,66,64,64,64,63,59,55],
  "QRO":[55,57,63,68,72,72,70,70,68,64,59,55],
  "QROO":[75,77,79,82,84,84,84,84,82,81,78,75],
  "SLP":[54,57,63,68,73,73,72,72,70,66,59,55],
  "SIN":[66,68,70,73,79,84,86,86,86,82,75,68],
  "SON":[57,59,64,70,79,88,91,90,88,79,66,57],
  "TAB":[75,77,81,84,86,84,84,84,82,81,78,75],
  "TAM":[61,64,70,75,81,84,84,84,82,77,68,63],
  "TLX":[50,52,57,61,64,63,61,61,61,59,55,50],
  "VER":[66,68,73,77,79,79,77,77,77,75,70,66],
  "YUC":[75,77,81,84,86,84,84,84,82,81,77,75],
  "ZAC":[48,50,55,61,68,70,68,68,66,61,54,48]
};
const MX_MONTHLY_PRECIP={
  "AGS":[0.5,0.3,0.2,0.4,1.2,3.5,4.2,3.9,3.5,1.8,0.6,0.4],
  "BC":[1.8,1.5,1.2,0.4,0.1,0.0,0.1,0.3,0.3,0.5,0.8,1.2],
  "BCS":[0.5,0.2,0.1,0.0,0.0,0.1,1.0,1.8,2.0,0.8,0.3,0.3],
  "CAM":[1.6,1.2,0.8,1.0,3.2,6.3,6.7,7.1,7.5,5.0,2.8,2.0],
  "CHP":[1.5,1.2,1.0,2.0,5.5,9.8,8.5,8.8,9.0,5.5,2.8,1.5],
  "CHH":[0.6,0.4,0.2,0.2,0.5,1.8,4.0,3.8,2.8,1.2,0.5,0.5],
  "CDMX":[0.4,0.3,0.4,1.0,2.2,5.5,5.8,5.5,5.0,2.5,0.6,0.3],
  "COA":[0.5,0.5,0.3,0.6,1.5,2.5,2.0,2.5,3.0,1.5,0.5,0.3],
  "COL":[0.5,0.2,0.1,0.1,0.8,5.5,7.5,7.0,6.5,3.5,0.8,0.5],
  "DUR":[0.6,0.3,0.2,0.2,0.5,2.8,4.5,4.2,3.5,1.5,0.5,0.3],
  "GTO":[0.5,0.3,0.2,0.5,1.5,4.5,5.0,4.5,4.0,2.0,0.5,0.3],
  "GRO":[0.3,0.1,0.1,0.2,1.5,7.0,7.5,7.0,7.5,4.0,1.0,0.2],
  "HID":[0.6,0.5,0.4,1.0,2.0,4.0,3.8,3.5,3.5,2.0,0.8,0.5],
  "JAL":[0.6,0.3,0.2,0.3,1.0,5.8,7.5,6.5,5.5,2.5,0.8,0.5],
  "MEX":[0.4,0.3,0.4,1.2,2.8,6.0,6.5,6.0,5.5,2.5,0.6,0.3],
  "MIC":[0.4,0.2,0.2,0.3,1.2,5.5,6.5,6.0,5.5,2.5,0.5,0.3],
  "MOR":[0.3,0.2,0.3,0.8,2.5,6.5,7.0,6.5,6.0,3.0,0.5,0.3],
  "NAY":[1.0,0.5,0.2,0.2,0.5,5.5,9.0,8.5,7.5,3.5,1.0,0.8],
  "NLE":[0.8,0.6,0.5,1.0,2.0,3.0,2.0,2.8,5.5,3.0,0.8,0.6],
  "OAX":[0.4,0.3,0.3,0.8,2.5,5.5,5.0,5.5,6.0,3.5,0.8,0.3],
  "PUE":[0.5,0.4,0.5,1.5,3.0,6.0,5.5,5.5,5.5,3.5,0.8,0.4],
  "QRO":[0.5,0.3,0.2,0.6,1.8,4.0,4.5,4.0,3.5,2.0,0.5,0.3],
  "QROO":[2.0,1.5,1.0,1.5,4.0,6.5,5.5,6.5,7.5,5.5,3.5,2.5],
  "SLP":[0.5,0.4,0.3,0.6,1.0,2.5,2.5,2.5,3.0,2.0,0.5,0.4],
  "SIN":[0.8,0.3,0.1,0.0,0.1,1.5,5.5,5.8,5.0,2.0,0.5,0.5],
  "SON":[0.8,0.5,0.3,0.1,0.1,0.5,3.5,3.8,2.5,0.8,0.5,0.5],
  "TAB":[3.0,2.5,1.8,2.0,4.5,8.5,7.5,8.5,9.5,8.0,5.5,3.5],
  "TAM":[1.0,0.8,0.6,1.2,2.5,3.5,2.5,3.0,5.5,3.5,1.2,0.8],
  "TLX":[0.4,0.3,0.5,1.5,3.0,5.5,5.0,5.0,5.0,2.5,0.5,0.3],
  "VER":[1.5,1.0,0.8,1.5,3.5,7.5,7.0,7.5,8.5,5.5,2.5,1.5],
  "YUC":[1.5,1.0,0.8,1.0,3.5,5.5,5.5,6.0,6.5,4.5,2.5,1.5],
  "ZAC":[0.5,0.3,0.2,0.3,0.8,3.5,4.5,4.0,3.5,1.5,0.5,0.4]
};

// ===== CANADA CLIMATE DATA (Environment Canada Normals 1991-2020) =====
const CA_CLIMATE={
  "AB":{"avgTemp":37.4,"winterTemp":14,"summerTemp":61,"precipIn":16.9,"snowIn":50,"humidity":58},
  "BC":{"avgTemp":44.6,"winterTemp":32,"summerTemp":61,"precipIn":39.4,"snowIn":40,"humidity":68},
  "MB":{"avgTemp":33.8,"winterTemp":3,"summerTemp":65,"precipIn":19.7,"snowIn":45,"humidity":65},
  "NB":{"avgTemp":41.0,"winterTemp":18,"summerTemp":64,"precipIn":43.3,"snowIn":100,"humidity":72},
  "NL":{"avgTemp":37.4,"winterTemp":19,"summerTemp":57,"precipIn":41.3,"snowIn":130,"humidity":75},
  "NS":{"avgTemp":43.7,"winterTemp":26,"summerTemp":63,"precipIn":55.1,"snowIn":75,"humidity":74},
  "NT":{"avgTemp":14.0,"winterTemp":-18,"summerTemp":57,"precipIn":10.6,"snowIn":55,"humidity":62},
  "NU":{"avgTemp":-0.4,"winterTemp":-27,"summerTemp":41,"precipIn":8.7,"snowIn":40,"humidity":68},
  "ON":{"avgTemp":41.0,"winterTemp":18,"summerTemp":66,"precipIn":35.4,"snowIn":70,"humidity":70},
  "PE":{"avgTemp":42.8,"winterTemp":23,"summerTemp":64,"precipIn":45.3,"snowIn":115,"humidity":75},
  "QC":{"avgTemp":37.4,"winterTemp":12,"summerTemp":65,"precipIn":39.4,"snowIn":110,"humidity":72},
  "SK":{"avgTemp":33.8,"winterTemp":1,"summerTemp":63,"precipIn":14.2,"snowIn":40,"humidity":60},
  "YT":{"avgTemp":23.0,"winterTemp":-8,"summerTemp":57,"precipIn":10.2,"snowIn":55,"humidity":60}
};
const CA_MONTHLY_TEMP={
  "AB":[14,17,25,39,50,57,63,61,52,40,26,16],
  "BC":[32,35,39,45,52,57,63,63,56,46,37,33],
  "MB":[3,6,18,36,52,62,67,64,54,39,21,7],
  "NB":[18,19,28,39,50,59,65,64,56,45,35,23],
  "NL":[19,18,25,34,43,52,59,59,52,43,34,24],
  "NS":[26,25,31,40,50,59,65,65,58,48,39,30],
  "NT":[-18,-14,-1,18,39,55,61,56,42,25,1,-14],
  "NU":[-27,-27,-20,-3,19,37,45,41,32,16,-7,-22],
  "ON":[18,20,29,41,54,64,69,67,59,47,36,23],
  "PE":[23,22,28,38,48,58,65,65,57,47,38,27],
  "QC":[12,14,24,38,52,62,67,64,55,43,31,17],
  "SK":[1,5,18,37,52,61,66,63,52,38,19,4],
  "YT":[-8,-2,14,32,46,55,59,55,43,28,7,-6]
};
const CA_MONTHLY_PRECIP={
  "AB":[0.7,0.5,0.7,0.9,1.8,3.0,2.5,2.0,1.5,0.8,0.7,0.6],
  "BC":[5.5,4.0,3.8,2.8,2.2,1.8,1.2,1.3,2.0,4.0,5.8,5.5],
  "MB":[0.7,0.6,0.8,1.0,2.2,3.2,3.0,2.5,2.0,1.2,0.8,0.7],
  "NB":[3.5,2.8,3.2,3.2,3.5,3.8,3.8,3.5,3.5,3.8,3.8,3.8],
  "NL":[3.8,3.2,3.5,3.2,3.2,3.5,3.2,3.5,3.8,4.2,4.0,3.8],
  "NS":[4.8,3.8,4.2,4.0,4.0,3.8,3.5,3.8,3.8,4.5,5.0,4.8],
  "NT":[0.5,0.3,0.4,0.4,0.6,1.0,1.3,1.5,1.2,0.8,0.6,0.5],
  "NU":[0.3,0.2,0.3,0.3,0.4,0.6,1.0,1.2,1.0,0.7,0.4,0.3],
  "ON":[2.5,2.0,2.5,2.8,3.2,3.5,3.2,3.2,3.5,3.0,3.2,2.8],
  "PE":[4.0,3.2,3.5,3.5,3.5,3.5,3.0,3.5,3.8,4.2,4.5,4.2],
  "QC":[2.8,2.2,2.5,2.8,3.2,3.8,4.0,3.8,3.5,3.2,3.2,2.8],
  "SK":[0.5,0.4,0.5,0.7,1.5,2.8,2.5,1.8,1.2,0.7,0.5,0.5],
  "YT":[0.6,0.4,0.4,0.3,0.5,1.2,1.5,1.5,1.2,0.7,0.6,0.5]
};

// ===== SMART SYSTEM CATEGORIES =====
const SYS_CAT={
  'electrical':{label:'Electrical / Eléctrico / 전기',kw:/electric|electr|bateria|battery|wiring|arnes|cable|배선|배터리|fuse|fusible|bdc|junction|fob|smart.*key|llave|horn|claxon|bocina|혼|sensor|lamp|faro|luz|bulb|foco|light|alternator|starter|arranque|charging|carga/,systems:['Electron'],parts:/BATTERY|WIRING|BDC|JUNCTION|FOB|HORN|LAMP|BULB|STARTER|SENSOR/},
  'powertrain':{label:'Powertrain / Tren Motriz / 파워트레인',kw:/powertrain|tren\s*motriz|파워|engine|motor|엔진|cvt|transmis|변속|transaxle|tm|torque|throttle|injector|inyector|turbo|oil|aceite|camshaft|valvula|valve|piston|head.*cylinder|catalytic|catalizador|exhaust|escape|oxygen|o2/,systems:['Engine','TM'],parts:/TRANSAXLE|CVT|ENGINE|SENSOR.*OXYGEN|ELECTRONIC.*CONTROL|ATA|THROTTLE|INJECTOR|VALVE|CONVERTER|STARTER|HEAD.*CYLINDER|BEARING|COIL.*IGNITION|SEAL.*OIL/},
  'hvac':{label:'HVAC / Clima / 공조',kw:/hvac|a\/?c|air.*cond|aire.*acond|clima|cooling|enfri|not.*cool|no.*enfr|heater|calefac|blower|ventilador|compressor|compresor|evaporator|condenser|thermal|heat|温度|공조/,systems:[],parts:/HEATER|BLOWER|A\/C|COMPRESSOR|EVAPORATOR|CONDENSER|THERMAL|CLIMATE/},
  'braking':{label:'Braking / Frenos / 제동',kw:/brak|freno|브레이크|제동|abs|caliper|calibrador|pad|pastilla|rotor|disco|hydraulic|hidraulic|master.*cylinder|booster|pedal.*freno/,systems:['Chassis'],parts:/BRAKE|CALIPER|PAD|HYDRAULIC|CYLINDER.*BRAKE/},
  'steering':{label:'Steering & Suspension / Dirección / 조향',kw:/steer|direccion|조향|suspension|suspens|서스펜션|alignment|alineacion|shock|amortiguador|strut|rack|pinion|tie.*rod|pull|drift|jale|tpms/,systems:['Chassis'],parts:/ALIGNMENT|SHOCK|WHEEL|TPMS|STEERING|RACK|TIE.*ROD|STRUT/},
  'infotainment':{label:'Infotainment / 인포테인먼트',kw:/infotainment|인포|display|pantalla|screen|monitor|audio|speaker|bocina|altavoz|radio|navigation|navegacion|cluster|tablero|head.*unit|avn|bluetooth|usb|camera|camara|카메라/,systems:['Infotainment'],parts:/MONITOR|SPEAKER|HEAD.*UNIT|CLUSTER|AVN|CAMERA|UNIT.*REAR.*VIEW|KEYBOARD/},
  'body':{label:'Body & Trim / Carrocería / 차체',kw:/body|carroceria|차체|trim|트림|door|puerta|문|handle|manija|window|ventana|창문|mirror|espejo|거울|seat|asiento|시트|belt|cinturon|안전벨|molding|moldura|panel|windshield|parabrisas|wiper|limpiaparabrisas|roof|techo/,systems:['Trim','Body'],parts:/HANDLE|LATCH|MOULDING|LAMP.*HEAD|LAMP.*REAR|GLASS|WIPER|BELT|SEAT|MIRROR|PANEL|STRIP|BEZEL|DOOR/},
  'safety':{label:'Safety / Seguridad / 안전',kw:/safety|seguridad|안전|airbag|bolsa.*aire|에어백|srs|restraint|abs|collision|colision|충돌|sensor.*crash/,systems:[],parts:/AIR.*BAG|SRS|RESTRAINT/},
};

// ===== CAUSE CODE DESCRIPTIONS (Qualitivity ZZ codes) =====
const CAUSE_CODES={'ZZ1':'Structural issues','ZZ2':'Part exterior defect','ZZ3':'Part function defect','ZZ4':'Part material defect','ZZ5':'Vehicle performance defect','ZZ6':'External defect out of vehicle','ZZ7':'Assembly failure','ZZ8':'Vehicle body defect','ZZ9':'Vehicle system defect (comm.)'};

// ===== SHARE URL (change this to your hosting URL) =====
const SHARE_URL='https://qualitivity.kia-mx.internal/app';

// ===== CUSTOMER FAILURE MODE TAXONOMY =====
// ===== 2-LEVEL CUSTOMER FAILURE MODE (CFM) CLASSIFIER =====
const CFM_CATS=[
  {id:'not_starting',label:'Not Starting',labelES:'No Arranca',
   subs:[
     {id:'no_crank',label:'No Crank / Dead',
      rx:/won.?t\s*(start|turn\s*on)|will\s*not\s*(start|turn)|no\s*(start|crank|arranca|enciende|prende)|does\s*n.?t\s*(start|turn\s*on)|doesn.?t\s*start|ne\s*(d[ée]marre|part)\s*pas|v[ée]hicule\s*ne\s*(part|d[ée]marr)|not\s*start|can.?t\s*start|\bno\s*power\b|sin\s*(corriente|energ)|no\s*enciende/i},
     {id:'dead_battery',label:'Dead Battery / Jump',
      rx:/dead\s*battery|jump\s*start|jumpe?d|boost(er|é)?|survolté?|had\s*to\s*be\s*jump|needs?\s*to\s*be\s*jump|faire\s*boost|low\s*volt|battery\s*(dead|drained|low)|bater[ií]a?\s*(baja|muerta|descargad)|voltage\s*low/i},
     {id:'stall_dies',label:'Stalls / Dies',
      rx:/\b(stall|se\s*apag[oa]|shut\s*(off|down)|dies\b|cuts?\s*out|se\s*muri[oó]|shuts?\s*off|turns?\s*off)/i}
   ]},
  {id:'warning_light',label:'Warning Light',labelES:'Testigo Encendido',
   subs:[
     {id:'check_engine',label:'Check Engine / CEL',
      rx:/\b(check\s*engine|engine\s*light|CEL\b|MIL\b|luz\s*d?el?\s*motor|testigo\s*d?el?\s*motor|check\s*motor|engine\s*warning)\b/i},
     {id:'airbag_warning',label:'Airbag / SRS',
      rx:/\b(airbag|air\s*bag|SRS)\s*(light|warn|alert|testigo|luz|on|lamp|came|appeared)/i},
     {id:'brake_warning',label:'Brake Light',
      rx:/\b(brake|freno)\s*(light|warn|alert|testigo|luz|indicator|lamp)/i},
     {id:'tpms_warning',label:'TPMS Alert',
      rx:/\b(tpms|tire\s*pressure)\s*(light|warn|alert|flash|on|allum)/i},
     {id:'abs_warning',label:'ABS Light',
      rx:/\b(abs|epb|tcs)\s*(light|warn|alert|testigo|luz|on|lamp|came)/i},
     {id:'other_warning',label:'Other Warning',
      rx:/warning|light\s*on|lights?\s*(came|all|appear|flash|on)|testigo|alert[ae]?|indicator|dash(board)?\s*(light|message|warning)|DTC\b|luz\s*(encendid|prendid)|voyant|t[ée]moin|message\s*(on|appear)|notification|check\s*haptic/i}
   ]},
  {id:'not_working',label:'Not Working',labelES:'No Funciona',
   subs:[
     {id:'inoperative',label:'Inoperative',
      rx:/not\s*work|does\s*n.?t\s*work|no\s*(funciona|sirve|responde)|ne\s*fonctionne\s*pas|stopped?\s*work|inoper|unresponsive|failed\b|ceased|won.?t\s*work|will\s*not\s*work|disabled|stop\s*work|are\s*inop/i},
     {id:'wont_open',label:'Won\'t Open',
      rx:/\b(won.?t\s*open|will\s*not\s*open|not\s*open|no\s*abre|does\s*n.?t\s*open|ouvre\s*pas|tiens?\s*pas|can.?t\s*open|no\s*se\s*abre)\b/i},
     {id:'wont_close',label:'Won\'t Close',
      rx:/\b(won.?t\s*close|will\s*not\s*close|not\s*clos|no\s*cierra|does\s*n.?t\s*close|no\s*se\s*cierra)\b/i},
     {id:'horn_inop',label:'Horn Inop',
      rx:/\b(horn|claxon|pito|klaxon)\s*(inop|not|no\s*(suena|funciona)|does\s*n|won)|electric\s*horn\s*inop/i},
     {id:'wiper_inop',label:'Wiper Inop',
      rx:/\b(wiper|limpiaparabrisas|essuie)\s*(inop|not|no|won|does\s*n)/i},
     {id:'blower_inop',label:'Blower / Fan Inop',
      rx:/blower\s*(stop|inop|not|no|won|will\s*not|does|quit)|ventilador\s*(no|se\s*par)|fan\s*(stop|inop|not|quit)/i}
   ]},
  {id:'noise_vibration',label:'Noise / Vibration',labelES:'Ruido / Vibración',
   subs:[
     {id:'rattle_clunk',label:'Rattle / Clunk',
      rx:/\b(rattle|clunk|traquete|cascabel|tronido|bang|golpe|golpeteo|cognement)\b/i},
     {id:'squeak_grind',label:'Squeak / Grinding',
      rx:/\b(squeak|squeal|rechinido|grince|chirp|grinding|grind)\b/i},
     {id:'knock',label:'Knock / Tap',
      rx:/\b(knock|tap|golpeteo\s*met[aá]l|toc|tictac)\b/i},
     {id:'buzz_hum',label:'Buzz / Hum / Vibration',
      rx:/\b(buzz|hum(m)?|vibra[tc]|zumbido)\b/i},
     {id:'general_noise',label:'General Noise',
      rx:/\b(noise|ruido|bruit|sonido|abnormal\s*sound|sound|se\s*escucha)\b/i}
   ]},
  {id:'fluid_leak',label:'Fluid Leak',labelES:'Fuga de Fluido',
   subs:[
     {id:'water_leak',label:'Water Ingress',
      rx:/water\s*(leak|entry|intrusion|coming\s*in)|filtra(ci[oó]n)?\s*(de\s*)?agua|moisture|humid(ad|ity)|wet\s*(floor|carpet|inside)|fuite\s*d.?eau|entra\s*agua|llena\s*de\s*humedad/i},
     {id:'oil_leak',label:'Oil Leak',
      rx:/\b(oil\s*leak|fuga\s*(de\s*)?aceite|aceite\s*fuga|fuite\s*d.?huile|leaking\s*oil|huile)\b/i},
     {id:'coolant_leak',label:'Coolant Leak',
      rx:/\b(coolant\s*leak|refrigerante|antifreeze|antigel)\b/i},
     {id:'other_leak',label:'Other Leak / Fluid',
      rx:/\b(leak|fuga|fuite|seep|drip|gotea|fluid|fluido)\b/i}
   ]},
  {id:'physical_damage',label:'Physical Damage',labelES:'Daño Físico',
   subs:[
     {id:'broken_crack',label:'Broken / Cracked',
      rx:/\b(broken|roto|crack|craque|bris[ée]|cass[ée]|snap|fractur)\b/i},
     {id:'loose_detach',label:'Loose / Falling Off',
      rx:/\b(loose|suelto|floj|falling\s*off|coming\s*(off|apart)|desprend|detach|se\s*cay[oó]|came\s*off)\b/i},
     {id:'peeling_cosmetic',label:'Peeling / Cosmetic',
      rx:/\b(peeling|peel|desgast|stitch|costura|stitching|paint|pintura|emblem|emblema|deform|bosseler|tache|stain|mancha|chip|descarapel)\b/i},
     {id:'scratch_dent',label:'Scratch / Dent',
      rx:/\b(scratch|raya|dent|rayado|abollad)\b/i},
     {id:'rust',label:'Rust / Corrosion',
      rx:/\b(rust|oxid|corrosi|corros)\b/i},
     {id:'missing_part',label:'Missing Part',
      rx:/\b(missing|faltante|fell\s*off)\b/i}
   ]},
  {id:'performance',label:'Performance Issue',labelES:'Problema de Rendimiento',
   subs:[
     {id:'pulling_drift',label:'Pulling / Drift',
      rx:/pull(s|ing)?\s*(left|right|to\s*(the\s*)?(left|right))|drift|jala|tira\s*(a|para|hacia)|d[ée]salign|wobble|wander|wonder/i},
     {id:'vibration_shake',label:'Shaking / Shimmy',
      rx:/\b(shak(e|ing|y)|shimmy|vibration\s*at\s*(highway|high\s*speed))\b/i},
     {id:'brake_hard',label:'Hard Brake Pedal',
      rx:/\b(hard\s*(brake|pedal|to\s*brake|to\s*stop)|brake\s*pedal\s*(hard|stiff)|pedal\s*(duro|pesad))\b/i},
     {id:'brake_soft',label:'Soft / Spongy Brake',
      rx:/soft\s*(pedal|brake)|spongy|low\s*brake|\bno\s*brake|sin\s*freno|freno\s*suave|pedal\s*(de\s*freno\s*)?(muy\s*)?(bajo|suave)/i},
     {id:'rough_idle',label:'Rough Idle / Surge',
      rx:/\b(rough\s*idle|idle\s*(high|low|rough|fluctuat)|rpm\s*(high|up|unstable|fluctuat)|idle|ralent[ií]|surge|hesitat|revoluciones\s*(sub|baj|inestab)|se\s*ahoga)\b/i},
     {id:'sluggish',label:'Sluggish / Weak',
      rx:/\bslow\b|lento|weak|d[ée]bil|sluggish|reduced|lag\b|poor\s*(performance|acceleration)|faible|lack\s*(of\s*)?power|low\s*power|pas\s*bien/i},
     {id:'trans_shift',label:'Shift / Jerk',
      rx:/\b(shift|jerk|jalonea|tironea|gear|hard\s*to\s*shift|stuck\s*in\s*(gear|park|drive)|transmis|cvt|engranaje|levier\s*de\s*vitesse|bump)\b/i}
   ]},
  {id:'ac_climate',label:'A/C & Climate',labelES:'Clima / A/C',
   subs:[
     {id:'no_cooling',label:'No Cooling',
      rx:/\ba\/?c\b|air\s*cond|aire\s*acond|no\s*enfr[ií]|not\s*cool|no\s*cool|not\s*blowing\s*cold|no\s*cold|no\s*fr[ií]o/i},
     {id:'no_heating',label:'No Heating',
      rx:/\b(no\s*calien|heat\s*(not|does\s*n|won)|no\s*heat|calefac\s*(no|not)|not\s*blowing\s*hot|chauffage\s*ne)\b/i},
     {id:'smoke_odor',label:'Smoke / Odor',
      rx:/\b(smoke|humo|olor|odor|smell|fum[ée]e|quem[aá]|burning\s*smell)\b/i}
   ]},
  {id:'electrical',label:'Electrical',labelES:'Eléctrico',
   subs:[
     {id:'battery_charging',label:'Battery / Charging',
      rx:/\b(charg(e|ing|er|dock)?|battery|bater[ií]a|batterie|volt|12v|recharge|no\s*charg)\b/i},
     {id:'light_out',label:'Light Out / Lamp',
      rx:/\b(light\s*(is\s*)?(out|off|burn)|bulb|foco|led\s*out|tail\s*light|head\s*light|lamp|faro|no\s*ilumina|luz\s*no\s*(funciona|enciende)|turn\s*signal|lumiè|out\s*(in|on)\s*(driver|passenger|rear|front))\b/i},
     {id:'wiring_short',label:'Wiring / Short',
      rx:/\b(electr|short\s*circuit|corto\s*circuito|wiring|cablead|fus[ie]b?le|fuse)\b/i},
     {id:'sensor_issue',label:'Sensor Issue',
      rx:/\b(sensor|detect|proximi|no\s*detect|can.?t\s*detect|won.?t\s*detect)\b/i}
   ]},
  {id:'infotainment',label:'Infotainment',labelES:'Infotainment',
   subs:[
     {id:'screen_display',label:'Screen / Display',
      rx:/\b(screen|display|monitor|pantalla|infotainment|cluster|tableau|black\s*screen|blank|freeze|frozen|tablero|cadran|no\s*signal|pop\s*up|touch\s*screen|negro|noir)\b/i},
     {id:'camera_issue',label:'Camera Issue',
      rx:/\b(camera|c[aá]mara|rear\s*view|backup\s*cam|reverse\s*cam|green\s*screen|blurry|borrosa|fuzzy)\b/i},
     {id:'speaker_audio',label:'Speaker / Audio',
      rx:/\b(speaker|sound|audio|radio|bocina|altavoz|no\s*sound|blown|distort|haut.?parleur|parlant|crackle)\b/i},
     {id:'connectivity',label:'Connectivity / App',
      rx:/\b(bluetooth|usb|carplay|android\s*auto|kia\s*connect|blue\s*link|modem|app|remote\s*start|connect|wireless|wifi|telemati|telematic)\b/i}
   ]},
  {id:'body_access',label:'Body & Access',labelES:'Carrocería y Acceso',
   subs:[
     {id:'door_window',label:'Door / Window',
      rx:/\b(door|puerta|porte|window|ventana|vitre|vidrio|cristal|doesn.?t\s*latch|no\s*cierra\s*bien|flush)\b/i},
     {id:'trunk_hatch',label:'Trunk / Hatch',
      rx:/\b(hatch|cajuela|valise|trunk|liftgate|tailgate|hayon|coffre|lift\s*gate)\b/i},
     {id:'seat_belt',label:'Seat Belt',
      rx:/\b(seat\s*belt|cintur[oó]n|buckle|retract|ceinture|belt\s*(not|does|won|no))\b/i},
     {id:'key_fob',label:'Key Fob / Lock',
      rx:/\b(key\s*fob|smart\s*key|llave|remote|fob|proximity|locking|unlock|keyfob|control\s*remoto|locked\s*out|can.?t\s*(lock|unlock)|program)\b/i},
     {id:'mirror_issue',label:'Mirror',
      rx:/\b(mirror|espejo|retrovisor|r[ée]troviseur)\b/i},
     {id:'seat_issue',label:'Seat Problem',
      rx:/\b(seat\s*(not|inop|stuck|won|does|broken|heat)|asiento|si[eè]ge|lumbar|heated\s*seat)\b/i},
     {id:'windshield',label:'Windshield / Glass',
      rx:/\b(windshield|parabrisas|pare.?brise|glass|molding|moldura|seal|weather\s*strip|wind\s*noise)\b/i}
   ]},
  {id:'intermittent',label:'Intermittent',labelES:'Intermitente',
   subs:[
     {id:'comes_goes',label:'Comes and Goes',
      rx:/\b(intermit|sometimes|occasional|comes\s*and\s*goes|a\s*veces|sporadic|random|par\s*(intermit|moment)|parfois|1\s*fois\s*sur)\b/i}
   ]},
  {id:'pdi_delivery',label:'PDI / Delivery',labelES:'PDI / Entrega',
   subs:[
     {id:'pdi_issue',label:'PDI Finding',
      rx:/\b(pdi|pre.?delivery|pre.?entrega|inspection\s*report|during\s*pdi|upon\s*delivery)\b/i},
     {id:'delivery_damage',label:'Delivery Damage',
      rx:/\b(delivery|transport|entrega|transit|recib)\b/i}
   ]}
];

// Build lookup and helper functions
const CFM_CAT_LOOKUP={};const CFM_SUB_LOOKUP={};
for(const cat of CFM_CATS){CFM_CAT_LOOKUP[cat.id]=cat;for(const sub of cat.subs){CFM_SUB_LOOKUP[sub.id]={cat:cat.id,catLabel:cat.label,...sub};}}
function cfmLabel(catId){const c=CFM_CAT_LOOKUP[catId];return c?c.label:catId==='other'?'Other / Otro':catId;}
function cfmSubLabel(subId){const s=CFM_SUB_LOOKUP[subId];return s?s.label:subId;}
function cfmFullLabel(catId,subId){return cfmLabel(catId)+(subId&&subId!==catId?' → '+cfmSubLabel(subId):'');}

// Legacy compatibility
const FAILURE_MODES=CFM_CATS.map(c=>({id:c.id,label:c.label,labelES:c.labelES,rx:new RegExp(c.subs.map(s=>s.rx.source).join('|'),'i')}));
const FM_LOOKUP=Object.fromEntries(FAILURE_MODES.map(f=>[f.id,f]));
function fmLabel(id){return cfmLabel(id);}

// ===== GLOBALS =====
let D={'3M':[],'DC':[],'12M':[]};
let aDS='all';
let SALES_ST={};
let _IDX=null; // Level 2: fuzzy entity index
// Contador monotónico para IDs de elementos generados dinámicamente.
// Reemplaza Date.now() (dos mapas en la misma respuesta síncrona, como en
// genSummary, pueden caer en el mismo milisegundo) por algo garantizado sin
// colisión, sin depender de Math.random().
let _uidSeq=0;
function _uid(prefix){return prefix+(++_uidSeq);}
let _lastI=null; // Level 4: conversational context
const C=['#38bdf8','#a78bfa','#34d399','#fb923c','#f472b6','#fbbf24','#22d3ee','#f87171','#818cf8','#2dd4bf','#e879f9','#a3e635','#fb7185','#67e8f9','#fdba74'];
const HC=['#0d1219','#0c2135','#0e3150','#11456e','#185a8c','#2070aa','#2889c8','#38a8e0','#50c4f0','#7dd3fc','#bae6fd'];

function f$(n){return'$'+(n||0).toLocaleString('en-US',{maximumFractionDigits:0})}
function fN(n,d){return(n||0).toLocaleString('en-US',{maximumFractionDigits:d||0})}
function pc(n,t){return t>0?(n/t*100).toFixed(1)+'%':'0%'}
function gDS(){if(aDS==='all')return[...D['3M'],...D['DC'],...D['12M']];return D[aDS]||[]}
function tr(s,n){return s&&s.length>n?s.slice(0,n)+'…':s||''}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

