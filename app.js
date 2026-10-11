/* MotoCare — onderhoud, kilometers en tankbeurten. Alles lokaal op je toestel. */
(function () {
'use strict';
var KEY = 'motocare.state.v1';
var MND = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
var SOON_KM = 500, SOON_DAYS = 30;

/* ---------- hulpjes ---------- */
function pad(n){ return String(n).padStart(2,'0'); }
function iso(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function validISO(s){ return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseISO(s).getTime()); }
function parseISO(s){ var p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function todayISO(){ return iso(new Date()); }
function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return iso(d); }
function monthsAgo(n){ var d=new Date(); d.setMonth(d.getMonth()-n); return iso(d); }
function addMonths(s,n){ var d=parseISO(s); d.setMonth(d.getMonth()+n); return iso(d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function thou(n){ return (n<0?'-':'')+Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
function fmtKm(n){ return thou(n)+' km'; }
function fmtEur(n){ return '€ '+Number(n).toFixed(2).replace('.',','); }
function fmtNum(n,d){ return Number(n).toFixed(d).replace('.',','); }
function fmtDate(s){ var d=parseISO(s); return d.getDate()+' '+MND[d.getMonth()]+' '+d.getFullYear(); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function uid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function isObj(x){ return x && typeof x==='object' && !Array.isArray(x); }
function $(s,r){ return (r||document).querySelector(s); }
function val(id){ var e=document.getElementById(id); return e?e.value.trim():''; }
function num(s){ if(s===''||s==null) return null; var v=parseFloat(String(s).replace(',','.')); return isFinite(v)?v:NaN; }
function int(s){ if(s===''||s==null) return null; var v=parseInt(s,10); return isFinite(v)?v:NaN; }

var ICON = {
  home:'<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  fuel:'<path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3M7 8h6"/>',
  euro:'<path d="M18 6.5A7 7 0 1 0 18 17.5M4 10h9M4 14h9"/>',
  more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'
};
function icon(n){ return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+ICON[n]+'</svg>'; }

/* ---------- gegevens ---------- */
var DEFAULT_TYPES = [
  {name:'Olie verversen',km:10000,months:null},{name:'Oliefilter',km:10000,months:null},{name:'Luchtfilter',km:20000,months:null},
  {name:'Bougies',km:20000,months:null},{name:'Kleppen stellen',km:40000,months:null},{name:'Remvloeistof',km:null,months:24},
  {name:'Koelvloeistof',km:null,months:24},{name:'Ketting',km:null,months:null},{name:'Banden',km:null,months:null}
];
var state = null, storageOK = true;
function defaultTypes(){ return DEFAULT_TYPES.map(function(t){ return {id:uid(),name:t.name,km:t.km,months:t.months,custom:false}; }); }
function emptyState(){ return {v:1,bikes:[],activeId:null,types:defaultTypes(),records:[],fuel:[],seeded:false}; }

function seedSample(s){
  var id=uid();
  s.bikes.push({id:id,make:'Yamaha',model:'FZS1000 Fazer',year:2005,engineSize:998,mileage:64000,name:null,purchaseDate:monthsAgo(96),purchaseMileage:42000,
    notes:'Dit is voorbeeldgegevens, zodat je ziet hoe MotoCare werkt. Verwijder ze wanneer je wilt via Instellingen.',isSample:true});
  var d=new Date(); d.setFullYear(d.getFullYear()-2); d.setDate(d.getDate()+15);
  var R=[['Olie verversen',daysAgo(45),63200,65,'Olie + filter','Motul 5100 10W40','diy',null,10000,null],
    ['Banden',daysAgo(60),62000,180,'Achterband','Michelin Pilot Road 4','workshop','Nieuwe achterband',null,null],
    ['Ketting',daysAgo(25),63400,12,'Kettingspray + afstellen',null,'diy',null,500,null],
    ['Remvloeistof',iso(d),54000,18,'DOT 4','','diy',null,null,24],
    ['Bougies',monthsAgo(14),46000,35,'Iridium bougies (set van 4)','NGK','workshop',null,20000,null]];
  R.forEach(function(r){ s.records.push({id:uid(),bikeId:id,typeName:r[0],date:r[1],mileage:r[2],cost:r[3],parts:r[4],brand:r[5]||null,location:r[6],notes:r[7],nextKm:r[8],nextMonths:r[9],isSample:true}); });
  [[40,63000,18.9,35.4],[28,63320,19.4,36.7],[12,63680,21.6,40.3],[3,64000,19.8,37.6]].forEach(function(f){
    s.fuel.push({id:uid(),bikeId:id,date:daysAgo(f[0]),mileage:f[1],liters:f[2],cost:f[3],full:true,isSample:true}); });
  s.activeId=id; s.seeded=true;
}
function normalize(raw){
  var s=emptyState(); if(!isObj(raw)) return s;
  if(Array.isArray(raw.types)&&raw.types.length){
    var t=raw.types.filter(function(x){ return isObj(x)&&typeof x.name==='string'&&x.name; }).map(function(x){
      return {id:typeof x.id==='string'?x.id:uid(),name:x.name,km:isFinite(x.km)&&x.km>0?x.km:null,months:isFinite(x.months)&&x.months>0?x.months:null,custom:x.custom===true}; });
    if(t.length) s.types=t;
  }
  if(Array.isArray(raw.bikes)) s.bikes=raw.bikes.filter(function(b){ return isObj(b)&&typeof b.id==='string'&&b.make&&b.model&&isFinite(b.mileage); }).map(function(b){
    return {id:b.id,make:String(b.make),model:String(b.model),year:isFinite(b.year)?b.year:null,engineSize:isFinite(b.engineSize)?b.engineSize:null,mileage:b.mileage,
      name:b.name?String(b.name):null,purchaseDate:validISO(b.purchaseDate)?b.purchaseDate:null,purchaseMileage:isFinite(b.purchaseMileage)&&b.purchaseMileage!==null?b.purchaseMileage:null,
      notes:b.notes?String(b.notes):null,isSample:b.isSample===true}; });
  var ids={}; s.bikes.forEach(function(b){ ids[b.id]=1; });
  if(Array.isArray(raw.records)) s.records=raw.records.filter(function(r){ return isObj(r)&&ids[r.bikeId]&&typeof r.id==='string'&&r.typeName&&validISO(r.date)&&isFinite(r.mileage); }).map(function(r){
    return {id:r.id,bikeId:r.bikeId,typeName:String(r.typeName),date:r.date,mileage:r.mileage,cost:isFinite(r.cost)&&r.cost!==null?r.cost:null,parts:r.parts?String(r.parts):null,
      brand:r.brand?String(r.brand):null,location:r.location==='diy'||r.location==='workshop'?r.location:null,notes:r.notes?String(r.notes):null,
      nextKm:isFinite(r.nextKm)&&r.nextKm>0?r.nextKm:null,nextMonths:isFinite(r.nextMonths)&&r.nextMonths>0?r.nextMonths:null,isSample:r.isSample===true}; });
  if(Array.isArray(raw.fuel)) s.fuel=raw.fuel.filter(function(f){ return isObj(f)&&ids[f.bikeId]&&typeof f.id==='string'&&validISO(f.date)&&isFinite(f.mileage)&&isFinite(f.liters); }).map(function(f){
    return {id:f.id,bikeId:f.bikeId,date:f.date,mileage:f.mileage,liters:f.liters,cost:isFinite(f.cost)&&f.cost!==null?f.cost:null,full:f.full!==false,isSample:f.isSample===true}; });
  s.seeded=raw.seeded===true;
  s.activeId=ids[raw.activeId]?raw.activeId:(s.bikes[0]?s.bikes[0].id:null);
  return s;
}
function load(){
  try{
    var t=localStorage.getItem(KEY);
    if(t){ state=normalize(JSON.parse(t)); }
    else { state=emptyState(); seedSample(state); save(); }
  }catch(e){ state=emptyState(); seedSample(state); storageOK=false; }
}
function save(){ try{ localStorage.setItem(KEY,JSON.stringify(state)); storageOK=true; }catch(e){ storageOK=false; } }

function bikeById(id){ return state.bikes.filter(function(b){ return b.id===id; })[0]||null; }
function activeBike(){ return bikeById(state.activeId)||state.bikes[0]||null; }
function bikeTitle(b){ return b.name?b.name:b.make+' '+b.model; }
function recordsOf(bid){ return state.records.filter(function(r){ return r.bikeId===bid; }).sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:b.mileage-a.mileage; }); }
function fuelOf(bid){ return state.fuel.filter(function(f){ return f.bikeId===bid; }).sort(function(a,b){ return a.date<b.date?-1:a.date>b.date?1:a.mileage-b.mileage; }); }
function typeByName(n){ return state.types.filter(function(t){ return t.name.toLowerCase()===String(n).toLowerCase(); })[0]||null; }
function raiseMileage(b,km){ if(km>b.mileage) b.mileage=km; }

/* ---------- berekeningen ---------- */
function calcStatus(i){
  var kmRem=null,dueKm=null,days=null,dueDate=null;
  if(i.intervalKm!=null&&i.baseMileage!=null){ dueKm=i.baseMileage+i.intervalKm; kmRem=dueKm-i.currentMileage; }
  if(i.intervalMonths!=null&&i.baseDate){ dueDate=addMonths(i.baseDate,i.intervalMonths); days=daysBetween(todayISO(),dueDate); }
  var st='ok';
  if((kmRem!=null&&kmRem<=0)||(days!=null&&days<=0)) st='overdue';
  else if((kmRem!=null&&kmRem<=SOON_KM)||(days!=null&&days<=SOON_DAYS)) st='soon';
  return {status:st,kmRem:kmRem,days:days,dueKm:dueKm,dueDate:dueDate};
}
function rank(s){ return s==='overdue'?0:s==='soon'?1:2; }
function urgency(x){ var a=x.kmRem==null?Infinity:x.kmRem, b=x.days==null?Infinity:x.days*30; return Math.min(a,b); }
function upcoming(b){
  var out=[];
  state.types.forEach(function(t){
    var last=recordsOf(b.id).filter(function(r){ return r.typeName.toLowerCase()===t.name.toLowerCase(); })[0]||null;
    var ik=last&&last.nextKm!=null?last.nextKm:t.km, im=last&&last.nextMonths!=null?last.nextMonths:t.months;
    if(ik==null&&im==null) return;
    var r=calcStatus({baseMileage:last?last.mileage:b.purchaseMileage,baseDate:last?last.date:b.purchaseDate,currentMileage:b.mileage,intervalKm:ik,intervalMonths:im});
    r.name=t.name; r.hasRecord=!!last; out.push(r);
  });
  return out.sort(function(a,b2){ return rank(a.status)-rank(b2.status)||urgency(a)-urgency(b2); });
}
function overall(items){ return items.some(function(i){ return i.status==='overdue'; })?'overdue':items.some(function(i){ return i.status==='soon'; })?'soon':'ok'; }
function kmText(k){ return k<=0?'Te laat: '+thou(Math.abs(k))+' km':thou(k)+' km te gaan'; }
function dayText(d){ if(d<=0){ var o=Math.abs(d); return o<60?'Te laat: '+o+' dagen':'Te laat: '+Math.round(o/30)+' maanden'; } return d<60?d+' dagen te gaan':Math.round(d/30)+' maanden te gaan'; }
function remText(i){
  if(i.kmRem!=null&&i.days!=null) return Math.abs(i.kmRem)<=Math.abs(i.days)*30?kmText(i.kmRem):dayText(i.days);
  if(i.kmRem!=null) return kmText(i.kmRem);
  if(i.days!=null) return dayText(i.days);
  return 'Nog niet te berekenen';
}
var STATUS_NL={ok:'In orde',soon:'Binnenkort',overdue:'Te laat'};
function badge(s,label){ return '<span class="badge '+s+'">'+esc(label||STATUS_NL[s])+'</span>'; }
function consumption(list){
  var res={}, lastFull=null, acc=0;
  list.forEach(function(f){
    if(lastFull){ acc+=f.liters; }
    if(f.full){ if(lastFull && f.mileage>lastFull.mileage){ res[f.id]=acc/(f.mileage-lastFull.mileage)*100; } lastFull=f; acc=0; }
  });
  return res;
}

/* ---------- UI-hulpjes ---------- */
function toast(m){ var t=$('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('on'); },2600); }
function modal(o){
  return new Promise(function(res){
    var root=$('#modal-root');
    root.innerHTML='<div class="ov"><div class="box" role="dialog" aria-modal="true"><h2>'+esc(o.title)+'</h2>'+(o.html||'')+'<div class="acts">'+(o.actions||[]).map(function(a){ return '<button class="btn '+(a.cls||'')+'" data-val="'+a.val+'">'+esc(a.label)+'</button>'; }).join('')+'</div></div></div>';
    function close(v,d){ root.innerHTML=''; root.onclick=null; res({val:v,data:d}); }
    root.onclick=function(e){ var b=e.target.closest('[data-val]'); if(b){ var v=b.getAttribute('data-val'); close(v, v==='ok'&&o.collect?o.collect():null); return; } if(e.target.classList.contains('ov')) close(null); };
  });
}
function confirmBox(title,text,ok,danger){ return modal({title:title,html:'<p class="muted">'+text+'</p>',actions:[{label:ok,val:'ok',cls:danger?'danger':'primary'},{label:'Annuleren',val:'no',cls:'ghost'}]}).then(function(r){ return r.val==='ok'; }); }
function field(id,label,type,value,extra){
  extra=extra||{};
  var a=(extra.attrs||'');
  var inner = type==='textarea'?'<textarea id="'+id+'" '+a+'>'+esc(value==null?'':value)+'</textarea>':'<input id="'+id+'" type="'+type+'" value="'+esc(value==null?'':value)+'" '+a+'>';
  return '<div><label class="f" for="'+id+'">'+esc(label)+'</label>'+inner+'<div class="err" id="e-'+id+'"></div></div>';
}
function showErrors(map){
  Array.prototype.forEach.call(document.querySelectorAll('.err'),function(e){ e.textContent=''; });
  var first=null;
  Object.keys(map).forEach(function(k){ var e=document.getElementById('e-'+k); if(e){ e.textContent=map[k]; if(!first) first=k; } });
  if(first){ var el=document.getElementById(first); if(el){ el.scrollIntoView({block:'center'}); el.focus(); } }
}
function kv(a,b){ return '<div class="kv"><span>'+esc(a)+'</span><span>'+b+'</span></div>'; }
function empty(t,p,btn,href){ return '<div class="card empty"><h2>'+esc(t)+'</h2><p class="muted">'+esc(p)+'</p>'+(btn?'<a class="btn primary" href="'+href+'">'+esc(btn)+'</a>':'')+'</div>'; }
function sampleNote(){ return state.bikes.some(function(b){ return b.isSample; })?'<div class="sample">Je ziet voorbeeldgegevens. Verwijder ze via Meer → Instellingen.</div>':''; }
function needBike(title){ return '<div class="top"><h1>'+title+'</h1></div>'+empty('Nog geen motorfiets','Voeg eerst een motorfiets toe.','Motorfiets toevoegen','#/motor-form/new'); }

/* ---------- schermen ---------- */
function viewHome(){
  var b=activeBike(); if(!b) return needBike('MotoCare');
  var up=upcoming(b), ov=overall(up), next=up[0], rec=recordsOf(b.id).slice(0,3);
  var h='<div class="top"><div><h1>'+esc(bikeTitle(b))+'</h1><p class="muted small">'+esc([b.name?b.make+' '+b.model:'',b.year,b.engineSize?b.engineSize+' cc':''].filter(Boolean).join(' · '))+'</p></div></div>';
  if(state.bikes.length>1) h+='<div style="margin-bottom:12px"><label class="f" for="bikeSel">Actieve motor</label><select id="bikeSel" data-chg="bike">'+state.bikes.map(function(x){ return '<option value="'+x.id+'"'+(x.id===b.id?' selected':'')+'>'+esc(bikeTitle(x))+'</option>'; }).join('')+'</select></div>';
  if(!storageOK) h+='<div class="sample" style="color:var(--bad);border-color:var(--bad)">Opslaan lukt niet in deze browser. Je gegevens blijven mogelijk niet bewaard.</div>';
  h+=sampleNote()+'<div class="stack"><button class="odo" data-act="mileage"><span class="cap" style="margin:0">Kilometerstand</span><b>'+fmtKm(b.mileage)+'</b><span class="tiny muted">Tik om bij te werken</span></button>';
  h+='<div class="card"><div class="row between"><span class="cap" style="margin:0">Onderhoudsstatus</span>'+badge(ov)+'</div>'+
    (next?'<div style="margin-top:10px"><span class="cap" style="margin:0">Volgend onderhoud</span><p style="font-weight:700;margin-top:2px">'+esc(next.name)+' <span class="muted" style="font-weight:500">· '+esc(next.hasRecord?remText(next):'nog niets geregistreerd')+'</span></p></div>':'<p class="muted small" style="margin-top:8px">Geen intervallen ingesteld.</p>')+'</div>';
  h+='<a class="btn primary" href="#/onderhoud-form/new">Onderhoud toevoegen</a><div class="grid2"><a class="btn" href="#/tank-form/new">Tanken</a><a class="btn" href="#/motor/'+b.id+'">Bekijk motor</a></div></div>';
  h+='<div class="cap">Aankomend</div>'+(up.length?up.map(upRow).join(''):'<div class="card muted">Nog geen onderhoud met een interval.</div>');
  h+='<div class="cap">Recent</div>'+(rec.length?rec.map(recRow).join(''):'<div class="card muted">Nog geen onderhoud geregistreerd.</div>');
  return h;
}
function upRow(i){
  return '<div class="card item"><span class="dot '+i.status+'"></span><div class="grow"><b>'+esc(i.name)+'</b><div class="small muted">'+esc(i.hasRecord?remText(i):'Nog niet geregistreerd, gerekend vanaf aankoop')+'</div></div>'+badge(i.status)+'</div>';
}
function recRow(r){
  return '<a class="card item" href="#/onderhoud-item/'+r.id+'"><div class="grow"><b>'+esc(r.typeName)+'</b><div class="small muted">'+fmtDate(r.date)+' · '+fmtKm(r.mileage)+'</div></div>'+(r.cost!=null?'<span>'+fmtEur(r.cost)+'</span>':'')+'</a>';
}
var histFilter='';
function viewMaint(arg){
  var b=activeBike(); if(!b) return needBike('Onderhoud');
  var hist=arg==='historie';
  var h='<div class="top"><h1>Onderhoud</h1><a class="btn primary sm" href="#/onderhoud-form/new">+ Toevoegen</a></div><div class="seg"><a href="#/onderhoud" class="'+(hist?'':'on')+'">Aankomend</a><a href="#/onderhoud/historie" class="'+(hist?'on':'')+'">Geschiedenis</a></div>';
  if(!hist){ var up=upcoming(b); return h+(up.length?up.map(upRow).join(''):'<div class="card muted">Nog geen onderhoud met een interval.</div>'); }
  var names=state.types.map(function(t){ return t.name; });
  var recs=recordsOf(b.id).filter(function(r){ return !histFilter||r.typeName===histFilter; });
  h+='<div style="margin-bottom:12px"><label class="f" for="hf">Filter op type</label><select id="hf" data-chg="filter"><option value="">Alle typen</option>'+names.map(function(n){ return '<option'+(n===histFilter?' selected':'')+'>'+esc(n)+'</option>'; }).join('')+'</select></div>';
  return h+(recs.length?recs.map(recRow).join(''):'<div class="card muted">Geen onderhoud gevonden.</div>');
}
function viewRecord(id){
  var r=state.records.filter(function(x){ return x.id===id; })[0]; if(!r) return viewMaint();
  return '<div class="top"><div><a class="small" href="#/onderhoud/historie">‹ Geschiedenis</a><h1 style="margin-top:6px">'+esc(r.typeName)+'</h1></div></div><div class="card">'+
    kv('Datum',fmtDate(r.date))+kv('Kilometerstand',fmtKm(r.mileage))+kv('Kosten',r.cost!=null?fmtEur(r.cost):'—')+kv('Onderdelen',esc(r.parts||'—'))+kv('Merk',esc(r.brand||'—'))+
    kv('Uitgevoerd',r.location==='diy'?'Zelf gedaan':r.location==='workshop'?'Garage':'—')+kv('Volgende na',(r.nextKm?fmtKm(r.nextKm):'')+(r.nextKm&&r.nextMonths?' of ':'')+(r.nextMonths?r.nextMonths+' maanden':'')||'—')+kv('Notities',esc(r.notes||'—'))+
    '</div><div class="stack" style="margin-top:14px"><a class="btn" href="#/onderhoud-form/'+r.id+'">Bewerken</a><button class="btn danger" data-act="delrec" data-id="'+r.id+'">Verwijderen</button></div>';
}
function viewRecordForm(id){
  var b=activeBike(); if(!b) return needBike('Onderhoud');
  var r=id!=='new'?state.records.filter(function(x){ return x.id===id; })[0]:null;
  if(id!=='new'&&!r) return viewMaint();
  var t0=r?typeByName(r.typeName):null;
  var h='<div class="top"><h1>'+(r?'Onderhoud bewerken':'Onderhoud toevoegen')+'</h1></div><div class="stack">';
  h+='<div><label class="f" for="f-type">Type</label><select id="f-type" data-chg="typesel" data-new="'+(r?'0':'1')+'">'+state.types.map(function(t){ return '<option'+((r&&r.typeName.toLowerCase()===t.name.toLowerCase())||(!r&&t===state.types[0])?' selected':'')+'>'+esc(t.name)+'</option>'; }).join('')+(r&&!t0?'<option selected>'+esc(r.typeName)+'</option>':'')+'<option value="__new">+ Eigen type toevoegen…</option></select><div class="err" id="e-f-type"></div></div>';
  h+='<div id="newtype" class="card hide stack">'+field('f-tname','Naam van het nieuwe type','text','')+'<div class="grid2">'+field('f-tkm','Standaard interval (km)','number','',{attrs:'inputmode="numeric" min="1"'})+field('f-tmo','Standaard interval (maanden)','number','',{attrs:'inputmode="numeric" min="1"'})+'</div></div>';
  var d0=state.types[0];
  h+=field('f-date','Datum','date',r?r.date:todayISO(),{attrs:'max="'+todayISO()+'"'})+field('f-km','Kilometerstand','number',r?r.mileage:b.mileage,{attrs:'inputmode="numeric" min="0"'})+field('f-cost','Kosten (€)','text',r&&r.cost!=null?String(r.cost).replace('.',','):'',{attrs:'inputmode="decimal" placeholder="optioneel"'})+
    field('f-parts','Onderdelen','text',r?r.parts:'')+field('f-brand','Merk','text',r?r.brand:'')+
    '<div><label class="f" for="f-loc">Uitgevoerd door</label><select id="f-loc"><option value="">—</option><option value="diy"'+(r&&r.location==='diy'?' selected':'')+'>Zelf gedaan</option><option value="workshop"'+(r&&r.location==='workshop'?' selected':'')+'>Garage</option></select></div>'+
    '<div class="grid2">'+field('f-nkm','Volgende na (km)','number',r?r.nextKm:(d0?d0.km:''),{attrs:'inputmode="numeric" min="1"'})+field('f-nmo','Volgende na (maanden)','number',r?r.nextMonths:(d0?d0.months:''),{attrs:'inputmode="numeric" min="1"'})+'</div>'+
    field('f-notes','Notities','textarea',r?r.notes:'');
  h+='<button class="btn primary" data-act="saverec" data-id="'+(r?r.id:'new')+'">Opslaan</button><a class="btn ghost" href="'+(r?'#/onderhoud-item/'+r.id:'#/onderhoud')+'">Annuleren</a></div>';
  return h;
}

function viewFuel(){
  var b=activeBike(); if(!b) return needBike('Tanken');
  var list=fuelOf(b.id), cons=consumption(list), vals=Object.keys(cons).map(function(k){ return cons[k]; });
  var tl=list.reduce(function(a,f){ return a+f.liters; },0), tc=list.reduce(function(a,f){ return a+(f.cost||0); },0);
  var h='<div class="top"><h1>Tanken</h1><a class="btn primary sm" href="#/tank-form/new">+ Tanken</a></div>';
  h+='<div class="grid2"><div class="card"><span class="cap" style="margin:0">Gem. verbruik</span><div class="big">'+(vals.length?fmtNum(vals.reduce(function(a,x){ return a+x; },0)/vals.length,1)+' l/100':'—')+'</div></div><div class="card" style="margin:0"><span class="cap" style="margin:0">Totaal brandstof</span><div class="big">'+fmtNum(tl,1)+' l</div><div class="small muted">'+fmtEur(tc)+'</div></div></div><div class="cap">Tankbeurten</div>';
  if(!list.length) return h+'<div class="card muted">Nog geen tankbeurten.</div>';
  return h+list.slice().reverse().map(function(f){
    return '<a class="card item" href="#/tank-form/'+f.id+'"><div class="grow"><b>'+fmtNum(f.liters,2)+' l</b> <span class="muted">· '+fmtDate(f.date)+'</span><div class="small muted">'+fmtKm(f.mileage)+(cons[f.id]?' · '+fmtNum(cons[f.id],1)+' l/100 km':'')+(f.full?'':' · niet vol')+'</div></div>'+(f.cost!=null?'<span>'+fmtEur(f.cost)+'</span>':'')+'</a>'; }).join('');
}
function viewFuelForm(id){
  var b=activeBike(); if(!b) return needBike('Tanken');
  var f=id!=='new'?state.fuel.filter(function(x){ return x.id===id; })[0]:null;
  if(id!=='new'&&!f) return viewFuel();
  return '<div class="top"><h1>'+(f?'Tankbeurt bewerken':'Tanken')+'</h1></div><div class="stack">'+
    field('t-date','Datum','date',f?f.date:todayISO(),{attrs:'max="'+todayISO()+'"'})+field('t-km','Kilometerstand','number',f?f.mileage:b.mileage,{attrs:'inputmode="numeric" min="0"'})+
    field('t-l','Liters','text',f?String(f.liters).replace('.',','):'',{attrs:'inputmode="decimal"'})+field('t-cost','Totaalbedrag (€)','text',f&&f.cost!=null?String(f.cost).replace('.',','):'',{attrs:'inputmode="decimal" placeholder="optioneel"'})+
    '<label class="chk"><input type="checkbox" id="t-full"'+(!f||f.full?' checked':'')+'> Tank helemaal vol (nodig voor verbruik)</label>'+
    '<button class="btn primary" data-act="savefuel" data-id="'+(f?f.id:'new')+'">Opslaan</button>'+(f?'<button class="btn danger" data-act="delfuel" data-id="'+f.id+'">Verwijderen</button>':'')+'<a class="btn ghost" href="#/tanken">Annuleren</a></div>';
}
function viewCosts(){
  var b=activeBike(); if(!b) return needBike('Kosten');
  var years={};
  recordsOf(b.id).forEach(function(r){ var y=r.date.slice(0,4); (years[y]=years[y]||{m:0,f:0}).m+=r.cost||0; });
  fuelOf(b.id).forEach(function(f){ var y=f.date.slice(0,4); (years[y]=years[y]||{m:0,f:0}).f+=f.cost||0; });
  var ys=Object.keys(years).sort().reverse(), tm=0, tf=0; ys.forEach(function(y){ tm+=years[y].m; tf+=years[y].f; });
  var h='<div class="top"><h1>Kosten</h1></div><div class="card"><span class="cap" style="margin:0">Totaal</span><div class="big">'+fmtEur(tm+tf)+'</div>'+kv('Onderhoud',fmtEur(tm))+kv('Brandstof',fmtEur(tf))+'</div><div class="cap">Per jaar</div>';
  return h+(ys.length?ys.map(function(y){ return '<div class="card"><div class="row between"><b>'+y+'</b><b>'+fmtEur(years[y].m+years[y].f)+'</b></div><div class="small muted">Onderhoud '+fmtEur(years[y].m)+' · Brandstof '+fmtEur(years[y].f)+'</div></div>'; }).join(''):'<div class="card muted">Nog geen kosten.</div>');
}
function viewMore(){
  return '<div class="top"><h1>Meer</h1></div><a class="card item" href="#/motoren"><b class="grow">Mijn motoren</b><span class="muted">›</span></a><a class="card item" href="#/instellingen"><b class="grow">Instellingen</b><span class="muted">›</span></a><p class="tiny dim" style="margin-top:16px">MotoCare 1.0 · alles blijft op je eigen toestel.</p>';
}
function viewBikes(){
  var h='<div class="top"><h1>Mijn motoren</h1><a class="btn primary sm" href="#/motor-form/new">+ Toevoegen</a></div>'+sampleNote();
  if(!state.bikes.length) return h+empty('Nog geen motorfiets','Voeg je eerste motor toe.','Motorfiets toevoegen','#/motor-form/new');
  return h+state.bikes.map(function(b){ return '<a class="card item" href="#/motor/'+b.id+'"><div class="grow"><b>'+esc(bikeTitle(b))+'</b><div class="small muted">'+fmtKm(b.mileage)+(b.year?' · '+b.year:'')+'</div></div>'+(b.id===state.activeId?'<span class="badge ok">Actief</span>':'')+'</a>'; }).join('');
}
function viewBike(id){
  var b=bikeById(id); if(!b) return viewBikes();
  var recs=recordsOf(b.id), cost=recs.reduce(function(a,r){ return a+(r.cost||0); },0);
  return '<div class="top"><div><a class="small" href="#/motoren">‹ Mijn motoren</a><h1 style="margin-top:6px">'+esc(bikeTitle(b))+'</h1></div></div>'+(b.isSample?'<div class="sample">Dit zijn voorbeeldgegevens.</div>':'')+'<div class="card">'+
    kv('Merk',esc(b.make))+kv('Model',esc(b.model))+kv('Bouwjaar',b.year||'—')+kv('Motorinhoud',b.engineSize?b.engineSize+' cc':'—')+kv('Kilometerstand',fmtKm(b.mileage))+kv('Aankoopdatum',b.purchaseDate?fmtDate(b.purchaseDate):'—')+kv('Aankoop-km',b.purchaseMileage!=null?fmtKm(b.purchaseMileage):'—')+kv('Notities',esc(b.notes||'—'))+'</div>'+
    '<div class="card" style="margin-top:8px">'+kv('Onderhoudsregistraties',recs.length)+kv('Totale onderhoudskosten',fmtEur(cost))+'</div><div class="stack" style="margin-top:14px">'+
    (b.id!==state.activeId?'<button class="btn primary" data-act="activate" data-id="'+b.id+'">Maak actieve motor</button>':'')+'<a class="btn" href="#/motor-form/'+b.id+'">Bewerken</a><button class="btn danger" data-act="delbike" data-id="'+b.id+'">Motorfiets verwijderen</button></div>';
}
function viewBikeForm(id){
  var b=id!=='new'?bikeById(id):null; if(id!=='new'&&!b) return viewBikes();
  return '<div class="top"><h1>'+(b?'Motor bewerken':'Motorfiets toevoegen')+'</h1></div><div class="stack">'+
    field('m-make','Merk *','text',b?b.make:'')+field('m-model','Model *','text',b?b.model:'')+field('m-name','Kenteken of bijnaam','text',b?b.name:'')+
    '<div class="grid2">'+field('m-year','Bouwjaar','number',b?b.year:'',{attrs:'inputmode="numeric"'})+field('m-cc','Motorinhoud (cc)','number',b?b.engineSize:'',{attrs:'inputmode="numeric"'})+'</div>'+
    field('m-km','Kilometerstand *','number',b?b.mileage:'',{attrs:'inputmode="numeric" min="0"'})+field('m-pdate','Aankoopdatum','date',b?b.purchaseDate:'',{attrs:'max="'+todayISO()+'"'})+
    field('m-pkm','Kilometerstand bij aankoop','number',b&&b.purchaseMileage!=null?b.purchaseMileage:'',{attrs:'inputmode="numeric" min="0"'})+field('m-notes','Notities','textarea',b?b.notes:'')+
    '<button class="btn primary" data-act="savebike" data-id="'+(b?b.id:'new')+'">Opslaan</button><a class="btn ghost" href="'+(b?'#/motor/'+b.id:'#/motoren')+'">Annuleren</a></div>';
}
function viewSettings(){
  var hasSample=state.bikes.some(function(b){ return b.isSample; })||state.records.some(function(r){ return r.isSample; });
  return '<div class="top"><div><a class="small" href="#/meer">‹ Meer</a><h1 style="margin-top:6px">Instellingen</h1></div></div><div class="stack">'+
    (hasSample?'<div class="card"><h2>Voorbeeldgegevens</h2><p class="small muted" style="margin-bottom:10px">De voorbeeldmotor laat zien hoe MotoCare werkt. Je eigen gegevens blijven staan.</p><button class="btn" data-act="clearsample">Voorbeeldgegevens verwijderen</button></div>':'')+
    '<div class="card"><h2>Gegevens</h2><p class="small muted" style="margin-bottom:10px">Alles staat alleen op dit toestel. Maak regelmatig een back-up, zeker voordat je browsergegevens wist of de app verwijdert.</p><div class="stack"><button class="btn" data-act="export">Exporteer alle gegevens (JSON)</button><button class="btn" data-act="importbtn">Importeer back-up</button><input type="file" id="imp" accept="application/json,.json" class="hide"><button class="btn danger" data-act="wipe">Alle gegevens verwijderen</button></div></div>'+
    '<div class="card"><h2>Over</h2>'+kv('App','MotoCare')+kv('Versie','1.0.0')+'</div></div>';
}

/* ---------- routing ---------- */
var route={name:'home',arg:''}, lastKey='';
function parseRoute(){ var h=location.hash.replace(/^#\/?/,''), i=h.indexOf('/'); route=i<0?{name:h||'home',arg:''}:{name:h.slice(0,i),arg:h.slice(i+1)}; }
function nav(h){ if(location.hash===h) render(); else location.hash=h; }
function tabOf(n){
  if(n==='onderhoud'||n==='onderhoud-form'||n==='onderhoud-item') return 'onderhoud';
  if(n==='tanken'||n==='tank-form') return 'tanken';
  if(n==='kosten') return 'kosten';
  if(['meer','motoren','motor','motor-form','instellingen'].indexOf(n)>=0) return 'meer';
  return 'home';
}
function renderNav(){
  var tabs=[['home','Home','home'],['onderhoud','Onderhoud','wrench'],['tanken','Tanken','fuel'],['kosten','Kosten','euro'],['meer','Meer','more']], on=tabOf(route.name);
  $('#nav').innerHTML='<div class="nav-in">'+tabs.map(function(t){ return '<a href="#/'+t[0]+'" class="'+(t[0]===on?'on':'')+'"'+(t[0]===on?' aria-current="page"':'')+'>'+icon(t[2])+'<span>'+t[1]+'</span></a>'; }).join('')+'</div>';
}
function render(){
  parseRoute();
  var h;
  switch(route.name){
    case 'onderhoud': h=viewMaint(route.arg); break;
    case 'onderhoud-item': h=viewRecord(route.arg); break;
    case 'onderhoud-form': h=viewRecordForm(route.arg); break;
    case 'tanken': h=viewFuel(); break;
    case 'tank-form': h=viewFuelForm(route.arg); break;
    case 'kosten': h=viewCosts(); break;
    case 'meer': h=viewMore(); break;
    case 'motoren': h=viewBikes(); break;
    case 'motor': h=viewBike(route.arg); break;
    case 'motor-form': h=viewBikeForm(route.arg); break;
    case 'instellingen': h=viewSettings(); break;
    default: h=viewHome(); route={name:'home',arg:''};
  }
  var y=window.scrollY; $('#view').innerHTML=h;
  var key=route.name+'/'+route.arg; if(key!==lastKey){ window.scrollTo(0,0); lastKey=key; } else window.scrollTo(0,y);
  renderNav();
}

/* ---------- acties ---------- */
function validDateField(id,errs,label){ var d=val(id); if(!validISO(d)) errs[id]=label+': kies een geldige datum.'; return d; }
var ACT = {
  mileage:function(){
    var b=activeBike(); if(!b) return;
    modal({title:'Kilometerstand bijwerken',html:'<label class="f" for="nkm">Nieuwe kilometerstand</label><input id="nkm" type="number" inputmode="numeric" min="0" value="'+b.mileage+'"><div class="err" id="e-nkm"></div>',
      actions:[{label:'Opslaan',val:'ok',cls:'primary'},{label:'Annuleren',val:'no',cls:'ghost'}],collect:function(){ return val('nkm'); }}).then(function(r){
      if(r.val!=='ok') return; var n=int(r.data);
      if(n===null||isNaN(n)||n<0){ toast('Vul een geldige kilometerstand in.'); return; }
      function apply(){ b.mileage=n; save(); render(); toast('Kilometerstand bijgewerkt.'); }
      if(n<b.mileage) confirmBox('Lagere kilometerstand?','De nieuwe stand ('+thou(n)+' km) is lager dan de huidige ('+thou(b.mileage)+' km). Weet je het zeker?','Ja, opslaan').then(function(ok){ if(ok) apply(); }); else apply();
    });
  },
  saverec:function(d){
    var b=activeBike(), errs={}, sel=val('f-type'), name=sel, typeObj=null;
    if(sel==='__new'){
      name=val('f-tname'); var tk=int(val('f-tkm')), tm=int(val('f-tmo'));
      if(!name) errs['f-tname']='Vul een naam in.'; else if(typeByName(name)) errs['f-tname']='Dit type bestaat al.';
      if(tk!==null&&(isNaN(tk)||tk<=0)) errs['f-tkm']='Vul een geldig interval in.';
      if(tm!==null&&(isNaN(tm)||tm<=0)) errs['f-tmo']='Vul een geldig interval in.';
      typeObj={id:uid(),name:name,km:tk,months:tm,custom:true};
    }
    var date=validDateField('f-date',errs,'Datum'), km=int(val('f-km')), cost=num(val('f-cost')), nk=int(val('f-nkm')), nm=int(val('f-nmo'));
    if(km===null||isNaN(km)||km<0) errs['f-km']='Vul een geldige kilometerstand in.';
    if(cost!==null&&(isNaN(cost)||cost<0)) errs['f-cost']='Vul een geldig bedrag in.';
    if(nk!==null&&(isNaN(nk)||nk<=0)) errs['f-nkm']='Vul een geldig interval in km in.';
    if(nm!==null&&(isNaN(nm)||nm<=0)) errs['f-nmo']='Vul een geldig interval in maanden in.';
    if(Object.keys(errs).length){ showErrors(errs); return; }
    if(typeObj) state.types.push(typeObj);
    var rec={typeName:name,date:date,mileage:km,cost:cost,parts:val('f-parts')||null,brand:val('f-brand')||null,location:val('f-loc')||null,notes:val('f-notes')||null,nextKm:nk,nextMonths:nm};
    var id=d.id;
    if(id==='new'){ rec.id=uid(); rec.bikeId=b.id; rec.isSample=false; state.records.push(rec); id=rec.id; }
    else { var old=state.records.filter(function(x){ return x.id===id; })[0]; Object.keys(rec).forEach(function(k){ old[k]=rec[k]; }); }
    raiseMileage(b,km); save(); nav('#/onderhoud-item/'+id); toast('Opgeslagen.');
  },
  delrec:function(d){ confirmBox('Registratie verwijderen?','Deze onderhoudsregistratie wordt gewist.','Verwijderen',true).then(function(ok){ if(ok){ state.records=state.records.filter(function(r){ return r.id!==d.id; }); save(); nav('#/onderhoud/historie'); toast('Verwijderd.'); } }); },
  savefuel:function(d){
    var b=activeBike(), errs={}, date=validDateField('t-date',errs,'Datum'), km=int(val('t-km')), l=num(val('t-l')), c=num(val('t-cost'));
    if(km===null||isNaN(km)||km<0) errs['t-km']='Vul een geldige kilometerstand in.';
    if(l===null||isNaN(l)||l<=0) errs['t-l']='Vul het aantal liters in.';
    if(c!==null&&(isNaN(c)||c<0)) errs['t-cost']='Vul een geldig bedrag in.';
    if(Object.keys(errs).length){ showErrors(errs); return; }
    var full=document.getElementById('t-full').checked;
    if(d.id==='new') state.fuel.push({id:uid(),bikeId:b.id,date:date,mileage:km,liters:l,cost:c,full:full,isSample:false});
    else { var f=state.fuel.filter(function(x){ return x.id===d.id; })[0]; f.date=date; f.mileage=km; f.liters=l; f.cost=c; f.full=full; }
    raiseMileage(b,km); save(); nav('#/tanken'); toast('Opgeslagen.');
  },
  delfuel:function(d){ confirmBox('Tankbeurt verwijderen?','Deze tankbeurt wordt gewist.','Verwijderen',true).then(function(ok){ if(ok){ state.fuel=state.fuel.filter(function(f){ return f.id!==d.id; }); save(); nav('#/tanken'); } }); },
  savebike:function(d){
    var errs={}, make=val('m-make'), model=val('m-model'), yr=int(val('m-year')), cc=int(val('m-cc')), km=int(val('m-km')), pk=int(val('m-pkm')), pd=val('m-pdate'), maxY=new Date().getFullYear()+1;
    if(!make) errs['m-make']='Merk is verplicht.'; if(!model) errs['m-model']='Model is verplicht.';
    if(yr!==null&&(isNaN(yr)||yr<1900||yr>maxY)) errs['m-year']='Vul een jaartal tussen 1900 en '+maxY+' in.';
    if(cc!==null&&(isNaN(cc)||cc<=0)) errs['m-cc']='Vul een geldige motorinhoud in.';
    if(km===null||isNaN(km)||km<0) errs['m-km']='Vul een geldige kilometerstand in.';
    if(pk!==null){ if(isNaN(pk)||pk<0) errs['m-pkm']='Vul een geldige stand in.'; else if(km!==null&&!isNaN(km)&&pk>km) errs['m-pkm']='Kan niet hoger zijn dan de huidige stand.'; }
    if(pd&&!validISO(pd)) errs['m-pdate']='Kies een geldige datum.';
    if(Object.keys(errs).length){ showErrors(errs); return; }
    var data={make:make,model:model,year:yr,engineSize:cc,mileage:km,name:val('m-name')||null,purchaseDate:pd||null,purchaseMileage:pk,notes:val('m-notes')||null};
    var id=d.id;
    if(id==='new'){ data.id=uid(); data.isSample=false; state.bikes.push(data); id=data.id; state.activeId=id; }
    else { var b=bikeById(id); Object.keys(data).forEach(function(k){ b[k]=data[k]; }); }
    save(); nav('#/motor/'+id); toast('Opgeslagen.');
  },
  delbike:function(d){
    var b=bikeById(d.id);
    confirmBox('Motorfiets verwijderen?',esc(bikeTitle(b))+' en alle bijbehorende onderhoud en tankbeurten worden gewist. Dit kan niet ongedaan worden gemaakt.','Verwijderen',true).then(function(ok){
      if(!ok) return;
      state.bikes=state.bikes.filter(function(x){ return x.id!==d.id; }); state.records=state.records.filter(function(r){ return r.bikeId!==d.id; }); state.fuel=state.fuel.filter(function(f){ return f.bikeId!==d.id; });
      if(state.activeId===d.id) state.activeId=state.bikes[0]?state.bikes[0].id:null;
      save(); nav('#/motoren'); toast('Verwijderd.');
    });
  },
  activate:function(d){ state.activeId=d.id; save(); render(); toast('Actieve motor gewijzigd.'); },
  clearsample:function(){
    confirmBox('Voorbeeldgegevens verwijderen?','Alleen de voorbeeldgegevens worden gewist. Wat je zelf hebt toegevoegd blijft staan.','Verwijderen',true).then(function(ok){
      if(!ok) return;
      var gone={}; state.bikes.forEach(function(b){ if(b.isSample) gone[b.id]=1; });
      state.bikes=state.bikes.filter(function(b){ return !b.isSample; });
      state.records=state.records.filter(function(r){ return !r.isSample&&!gone[r.bikeId]; });
      state.fuel=state.fuel.filter(function(f){ return !f.isSample&&!gone[f.bikeId]; });
      if(!bikeById(state.activeId)) state.activeId=state.bikes[0]?state.bikes[0].id:null;
      save(); render(); toast('Voorbeeldgegevens verwijderd.');
    });
  },
  export:function(){
    var blob=new Blob([JSON.stringify({app:'motocare',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='motocare-backup-'+todayISO()+'.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); },5000); toast('Back-up gedownload.');
  },
  importbtn:function(){ var f=$('#imp'); if(f) f.click(); },
  wipe:function(){
    confirmBox('Alle gegevens verwijderen?','Alles wordt gewist: motoren, onderhoud en tankbeurten. Dit kan niet ongedaan worden gemaakt. Maak eerst een back-up als je die nog wilt.','Alles verwijderen',true).then(function(ok){
      if(!ok) return; state=emptyState(); state.seeded=true; save(); history.replaceState(null,'','#/home'); render(); toast('Alle gegevens zijn verwijderd.');
    });
  }
};
function importFile(file){
  var r=new FileReader();
  r.onload=function(){
    var obj; try{ obj=JSON.parse(r.result); if(!isObj(obj)||obj.app!=='motocare'||!isObj(obj.data)) throw 0; }
    catch(e){ modal({title:'Dit bestand kan niet worden gelezen',html:'<p class="muted">Kies een JSON-bestand dat je eerder met MotoCare hebt geëxporteerd.</p>',actions:[{label:'Sluiten',val:'x',cls:'primary'}]}); return; }
    var n=normalize(obj.data);
    confirmBox('Back-up terugzetten?','Dit vervangt alle huidige gegevens door de back-up ('+n.bikes.length+' motoren, '+n.records.length+' onderhoudsregistraties, '+n.fuel.length+' tankbeurten).','Terugzetten',true).then(function(ok){ if(ok){ state=n; state.seeded=true; save(); nav('#/home'); render(); toast('Back-up teruggezet.'); } });
  };
  r.readAsText(file);
}

function init(){
  load();
  document.addEventListener('click',function(e){ var el=e.target.closest('[data-act]'); if(!el) return; var f=ACT[el.getAttribute('data-act')]; if(f){ e.preventDefault(); f(el.dataset); } });
  document.addEventListener('change',function(e){
    var t=e.target;
    if(t.id==='imp'&&t.files&&t.files[0]){ importFile(t.files[0]); t.value=''; return; }
    var c=t.getAttribute&&t.getAttribute('data-chg'); if(!c) return;
    if(c==='bike'){ state.activeId=t.value; save(); render(); }
    else if(c==='filter'){ histFilter=t.value; render(); }
    else if(c==='typesel'){
      var nt=document.getElementById('newtype'); if(nt) nt.classList.toggle('hide',t.value!=='__new');
      var ty=typeByName(t.value);
      if(t.getAttribute('data-new')==='1'){ var k=document.getElementById('f-nkm'), m=document.getElementById('f-nmo'); if(k) k.value=ty&&ty.km?ty.km:''; if(m) m.value=ty&&ty.months?ty.months:''; }
    }
  });
  window.addEventListener('hashchange',render);
  window.addEventListener('pagehide',save);
  render();
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist(); }catch(e){}
  if('serviceWorker' in navigator) window.addEventListener('load',function(){ navigator.serviceWorker.register('service-worker.js').catch(function(){}); });
}
init();
})();
