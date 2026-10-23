'use strict';
/* ============ 資料定義（收入／支出類別、平台） ============ */
const LS_KEY='taxiLedgerV1';
const DEFAULT_PLATFORMS=[
 {id:'uber',name:'Uber'},{id:'yoxi',name:'yoxi'},{id:'taxigo',name:'TaxiGo'},{id:'bolt',name:'Bolt'},
 {id:'taiwan',name:'台灣大車隊'},{id:'linego',name:'LINE GO'},{id:'metro',name:'大都會'},
 {id:'direct',name:'直客／現金'},{id:'other',name:'其他平台'}
];
const DEFAULT_INCOME_CATS=[
 {id:'fare',name:'車資收入'},{id:'surge',name:'加乘收入'},{id:'tip',name:'小費'},
 {id:'airport',name:'機場接送'},{id:'charter',name:'包車'},{id:'bonus',name:'平台獎勵'},
 {id:'refer',name:'推薦獎金'},{id:'other',name:'其他收入'}
];
const DEFAULT_EXPENSE_CATS=[
 {id:'fuel',name:'油費'},{id:'charge',name:'充電費'},{id:'maintain',name:'保養維修'},
 {id:'tire',name:'輪胎耗材'},{id:'insure',name:'保險費'},{id:'loan',name:'車貸／租賃'},
 {id:'toll',name:'通行費ETC'},{id:'park',name:'停車費'},{id:'fine',name:'罰單'},
 {id:'wash',name:'洗車美容'},{id:'food',name:'餐飲伙食'},{id:'phone',name:'手機網路'},
 {id:'platform',name:'平台費用'},{id:'tax',name:'稅費'},{id:'other',name:'其他支出'}
];
const PAY_METHODS=['現金','信用卡','行動支付','銀行轉帳','自動扣款'];
const QUICK_IN=[500,1000,1500,2000,3000];
const QUICK_OUT=[100,200,500,1000,2000];

/* ============ 狀態與儲存 ============ */
let state=load();
if(!state){
  state={platforms:DEFAULT_PLATFORMS.map(x=>({...x})),incomeCats:DEFAULT_INCOME_CATS.map(x=>({...x})),expenseCats:DEFAULT_EXPENSE_CATS.map(x=>({...x})),payMethods:[...PAY_METHODS],records:[]};
  save();
}
function load(){try{const raw=localStorage.getItem(LS_KEY);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function save(){try{localStorage.setItem(LS_KEY,JSON.stringify(state));}catch(e){toast('儲存失敗：瀏覽器空間不足');}}
const PLATFORM_ORDER=['uber','yoxi','taxigo','bolt','taiwan','linego','metro','direct','other'];
function migrateState(){
  let changed=false;
  DEFAULT_PLATFORMS.forEach(d=>{if(!state.platforms.find(p=>p.id===d.id)){state.platforms.push({...d});changed=true;}});
  if(state.version!==1){
    const custom=state.platforms.filter(p=>!PLATFORM_ORDER.includes(p.id));
    const ordered=[];
    PLATFORM_ORDER.forEach(id=>{const p=state.platforms.find(x=>x.id===id);if(p)ordered.push(p);});
    state.platforms=ordered.concat(custom);
    state.version=1;changed=true;
  }
  if(changed)save();
}
migrateState();

/* ============ 工具函式 ============ */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function pad2(n){return (n<10?'0':'')+n;}
function dateStr(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function todayStr(){return dateStr(new Date());}
function nowTime(){const d=new Date();return pad2(d.getHours())+':'+pad2(d.getMinutes());}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(n){const v=Math.round(n*100)/100;return 'NT$ '+(Number.isInteger(v)?v.toLocaleString('zh-TW'):v.toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2}));}
function parseAmount(s){const n=parseFloat(String(s).replace(/[^\d.]/g,''));return isFinite(n)&&n>0?Math.round(n*100)/100:null;}
function daysInMonth(y,m){return new Date(y,m,0).getDate();}
function fmtDateCN(ds){const p=ds.split('-');return parseInt(p[1],10)+'月'+parseInt(p[2],10)+'日';}
function weekCN(ds){const d=new Date(ds+'T00:00:00');return '星期'+'日一二三四五六'[d.getDay()];}
let toastTimer=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1900);}
function recPlatform(r){return state.platforms.find(p=>p.id===r.platformId);}
function recCat(r){const arr=r.type==='in'?state.incomeCats:state.expenseCats;return arr.find(c=>c.id===r.catId)||{id:'?',name:'未分類'};}

/* ============ 路由與畫面狀態 ============ */
let curView='home';
function goView(v){
  curView=v;
  $$('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+v));
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  renderCurrent();
}
function renderCurrent(){
  if(curView==='home')renderHome();
  else if(curView==='entry')renderEntry();
  else if(curView==='records')renderRecords();
  else if(curView==='stats')renderStats();
}

/* ============ 首頁 ============ */
function renderHome(){
  const t=todayStr(),now=new Date();
  const month=now.getFullYear()+'-'+pad2(now.getMonth()+1),y=now.getFullYear();
  $('#home-date').textContent=(now.getMonth()+1)+'月'+now.getDate()+'日 '+weekCN(t)+' · '+now.getFullYear()+'年';
  const todayIn=state.records.filter(r=>r.type==='in'&&r.date===t);
  const todayOut=state.records.filter(r=>r.type==='out'&&r.date===t);
  const mIn=state.records.filter(r=>r.type==='in'&&r.date.slice(0,7)===month);
  const mOut=state.records.filter(r=>r.type==='out'&&r.date.slice(0,7)===month);
  const yIn=state.records.filter(r=>r.type==='in'&&r.date.slice(0,4)===''+y);
  const yOut=state.records.filter(r=>r.type==='out'&&r.date.slice(0,4)===''+y);
  const sum=a=>a.reduce((s,r)=>s+r.amount,0);
  $('#hero-today').textContent=money(sum(todayIn));
  $('#hero-note').textContent=todayIn.length?('共 '+todayIn.length+' 筆收入'):'今天還沒有收入紀錄';
  const plats={};
  todayIn.forEach(r=>{const p=recPlatform(r);const k=p?p.name:'其他';plats[k]=(plats[k]||0)+r.amount;});
  const ph=$('#hero-plats');ph.innerHTML='';
  if(todayIn.length){
    Object.entries(plats).forEach(([k,v])=>{
      const el=document.createElement('span');el.className='plat';
      el.textContent=k+' '+Math.round(v).toLocaleString('zh-TW');ph.appendChild(el);
    });
  }
  $('#sum-today-out').textContent=money(sum(todayOut));
  $('#sum-month-in').textContent=money(sum(mIn));
  $('#sum-month-out').textContent=money(sum(mOut));
  $('#sum-year-net').textContent=money(sum(yIn)-sum(yOut));
  renderRecent();
}
function renderRecent(){
  const el=$('#home-recent');
  const recs=state.records.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)).slice(0,5);
  if(!recs.length){el.innerHTML='<div class="empty">還沒有任何紀錄，按「記收入」或「記支出」開始第一筆。</div>';return;}
  el.innerHTML=recs.map(r=>{
    const c=recCat(r),p=recPlatform(r);
    let sub=r.type==='in'?(p?p.name:'其他'):(r.pay||'');
    sub+=r.note?(' · '+esc(r.note)):'';
    return '<div class="rgroup" style="margin-top:6px"><div class="rlist"><div class="rrow" data-action="open-edit" data-id="'+r.id+'">'
      +'<div class="ricon '+(r.type==='in'?'in':'out')+'"><svg class="i" style="width:18px;height:18px"><use href="#i-'+(r.type==='in'?'up':'down')+'" xlink:href="#i-'+(r.type==='in'?'up':'down')+'"/></svg></div>'
      +'<div class="rmid"><div class="t">'+esc(c.name)+'</div><div class="s">'+esc(sub)+'</div></div>'
      +'<div class="ramt '+(r.type==='in'?'in':'out')+'">'+(r.type==='in'?'+':'−')+Math.round(r.amount).toLocaleString('zh-TW')+'</div>'
      +'</div></div></div>';
  }).join('');
}
/* ============ 記帳輸入 ============ */
let entryMode='in',editId=null,entryPlat=state.platforms[0]?state.platforms[0].id:null,entryCat=null,entryPay='現金';
function resetEntryFields(){$('#in-amount').value='';$('#in-note').value='';$('#in-date').value=todayStr();$('#in-time').value=nowTime();}
function setMode(m){
  entryMode=m;editId=null;entryCat=null;entryPlat=state.platforms[0]?state.platforms[0].id:null;
  resetEntryFields();renderEntry();
}
function renderEntry(){
  const isIn=entryMode==='in',isEdit=!!editId;
  $('#entry-title').textContent=isEdit?'修改紀錄':(isIn?'記收入':'記支出');
  $('#entry-sub').textContent=isEdit?'點「更新」儲存修改，或刪除此筆':(isIn?'選平台與類別，輸入金額':'選類別與支付方式，輸入金額');
  $('#entry-cancel').classList.toggle('hidden',!isEdit);
  $('#seg-in').classList.toggle('on',isIn);$('#seg-in').classList.toggle('inc',isIn);
  $('#seg-out').classList.toggle('on',!isIn);$('#seg-out').classList.toggle('out',!isIn);
  const pp=$('#entry-platforms');
  if(isIn){
    $('#lbl-platform').classList.remove('hidden');pp.classList.remove('hidden');
    pp.innerHTML=state.platforms.map(p=>'<button class="chip'+(entryPlat===p.id?' on':'')+'" data-action="pick-plat" data-id="'+p.id+'">'+esc(p.name)+'</button>').join('');
  }else{$('#lbl-platform').classList.add('hidden');pp.classList.add('hidden');}
  const cats=isIn?state.incomeCats:state.expenseCats;
  $('#entry-cats').innerHTML=cats.map(c=>'<button class="cat'+(entryCat===c.id?' on':'')+'" data-action="pick-cat" data-id="'+c.id+'"><span class="dot"></span>'+esc(c.name)+'</button>').join('');
  const qs=isIn?QUICK_IN:QUICK_OUT;
  $('#quick-amounts').innerHTML=qs.map(n=>'<button class="qchip" data-action="quick" data-v="'+n+'">'+n.toLocaleString('zh-TW')+'</button>').join('');
  const b=$('#btn-save');b.className='btn '+(isIn?'btn-inc':'btn-out');
  b.innerHTML=(isEdit?'更新':'儲存')+(isIn?'收入':'支出');
  renderPayRow(isIn);
  const sw=document.querySelector('.save-wrap');
  let db=document.getElementById('btn-del');
  if(isEdit&&!db){db=document.createElement('button');db.id='btn-del';db.className='btn btn-ghost';db.style.marginBottom='10px';db.style.color='var(--out-strong)';db.style.borderColor='#F3D8CF';db.style.background='var(--out-soft)';db.dataset.action='del-record';db.textContent='刪除此筆';sw.prepend(db);}
  else if(!isEdit&&db){db.remove();}
}
function renderPayRow(isIn){
  const sw=document.querySelector('.save-wrap');
  let pr=document.getElementById('pay-row');
  if(isIn){if(pr)pr.remove();return;}
  if(!pr){pr=document.createElement('div');pr.id='pay-row';pr.className='frow-in';sw.before(pr);}
  pr.innerHTML='<div><label>支付方式</label><select id="in-pay" style="width:100%;height:46px;border:1px solid var(--line);border-radius:12px;padding:0 12px;font-size:16px;font-family:inherit;color:var(--ink);background:var(--card);outline:none">'+state.payMethods.map(pm=>'<option'+(entryPay===pm?' selected':'')+'>'+esc(pm)+'</option>').join('')+'</select></div>';
}
function saveRecord(){
  const isIn=entryMode==='in';
  const amt=parseAmount($('#in-amount').value);
  if(!amt){toast('請輸入正確金額');return;}
  if(isIn&&!entryPlat){toast('請選擇平台');return;}
  if(!entryCat){toast('請選擇類別');return;}
  const paySel=$('#in-pay');
  const rec={id:editId||uid(),type:isIn?'in':'out',date:$('#in-date').value||todayStr(),time:$('#in-time').value||nowTime(),platformId:isIn?entryPlat:null,catId:entryCat,amount:amt,pay:isIn?'':(paySel?paySel.value:'現金'),note:$('#in-note').value.trim(),createdAt:Date.now()};
  if(editId){
    const i=state.records.findIndex(r=>r.id===editId);if(i>-1)state.records[i]=rec;
    save();toast('已更新');editId=null;goView('records');
  }else{
    state.records.push(rec);save();toast('已儲存'+(isIn?'收入':'支出'));
    try{if(dbxIsLinked())setTimeout(function(){dbxSync(false);},600);}catch(e){}
    $('#in-amount').value='';$('#in-note').value='';$('#in-time').value=nowTime();
    renderEntry();
  }
}
function openEdit(id){
  const r=state.records.find(x=>x.id===id);if(!r)return;
  entryMode=r.type;editId=r.id;
  entryPlat=r.platformId||(state.platforms[0]&&state.platforms[0].id);
  entryCat=r.catId;entryPay=r.pay||'現金';
  goView('entry');
  $('#in-amount').value=r.amount;
  $('#in-date').value=r.date;$('#in-time').value=r.time||'';
  $('#in-note').value=r.note||'';
}
function delRecord(){
  if(!editId)return;
  const r=state.records.find(x=>x.id===editId);if(!r)return;
  if(!confirm('確定刪除這筆紀錄？刪除後無法復原。'))return;
  state.records=state.records.filter(x=>x.id!==editId);
  save();toast('已刪除');editId=null;goView('records');
  try{if(dbxIsLinked())setTimeout(function(){dbxSync(false);},600);}catch(e){}
}

/* ============ 明細 ============ */
const recFilter={type:'all',period:'month',platform:'all'};
function inPeriod(rec,period){
  const now=new Date(),ym=now.getFullYear()+'-'+pad2(now.getMonth()+1);
  if(period==='today')return rec.date===todayStr();
  if(period==='month')return rec.date.slice(0,7)===ym;
  if(period==='year')return rec.date.slice(0,4)===''+now.getFullYear();
  return true;
}
function filteredRecords(f){
  return state.records.filter(r=>(f.type==='all'||r.type===f.type)&&inPeriod(r,f.period)&&(f.platform==='all'||r.platformId===f.platform));
}
function renderRecords(){
  $$('#f-type .fchip').forEach(b=>b.classList.toggle('on',b.dataset.v===recFilter.type));
  $$('#f-period .fchip').forEach(b=>b.classList.toggle('on',b.dataset.v===recFilter.period));
  const row=$('#f-platform-row');
  if(recFilter.type!=='out'){
    row.innerHTML='<select class="fsel" id="f-platform"><option value="all">全部平台</option>'+state.platforms.map(p=>'<option value="'+p.id+'"'+(recFilter.platform===p.id?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>';
    const sel=$('#f-platform');if(sel)sel.onchange=()=>{recFilter.platform=sel.value;renderRecords();};
  }else{row.innerHTML='';recFilter.platform='all';}
  const recs=filteredRecords(recFilter).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
  const el=$('#records-list');
  if(!recs.length){el.innerHTML='<div class="empty">這個範圍內還沒有紀錄。</div>';return;}
  const groups={};recs.forEach(r=>{(groups[r.date]=groups[r.date]||[]).push(r);});
  let html='';
  Object.keys(groups).forEach(ds=>{
    const g=groups[ds];
    const net=g.reduce((s,r)=>s+(r.type==='in'?r.amount:-r.amount),0);
    html+='<div class="rgroup"><div class="rdate"><span>'+fmtDateCN(ds)+' · '+weekCN(ds)+'</span><span>當日 <b>'+(net>=0?'+':'−')+Math.abs(Math.round(net)).toLocaleString('zh-TW')+'</b></span></div><div class="rlist">';
    g.forEach(r=>{
      const c=recCat(r),p=recPlatform(r);
      let sub=r.type==='in'?(p?p.name:'其他'):(r.pay||'');
      sub+=r.note?(' · '+esc(r.note)):'';
      html+='<div class="rrow" data-action="open-edit" data-id="'+r.id+'">'
        +'<div class="ricon '+(r.type==='in'?'in':'out')+'"><svg class="i" style="width:18px;height:18px"><use href="#i-'+(r.type==='in'?'up':'down')+'" xlink:href="#i-'+(r.type==='in'?'up':'down')+'"/></svg></div>'
        +'<div class="rmid"><div class="t">'+esc(c.name)+'</div><div class="s">'+esc(sub)+'</div></div>'
        +'<div class="ramt '+(r.type==='in'?'in':'out')+'">'+(r.type==='in'?'+':'−')+Math.round(r.amount).toLocaleString('zh-TW')+'</div>'
        +'</div>';
    });
    html+='</div></div>';
  });
  el.innerHTML=html;
}

/* ============ 統計 ============ */
let statsUnit='month';
const _now0=new Date();
let statsAnchor=_now0.getFullYear()+'-'+pad2(_now0.getMonth()+1);
let statsYear=''+_now0.getFullYear();
function statsNav(d){
  if(statsUnit==='month'){
    const p=statsAnchor.split('-').map(Number);
    const dt=new Date(p[0],p[1]-1+d,1);statsAnchor=dt.getFullYear()+'-'+pad2(dt.getMonth()+1);
  }else{statsYear=String(parseInt(statsYear,10)+d);}
  renderStats();
}
function renderStats(){
  $('#seg-month').classList.toggle('on',statsUnit==='month');$('#seg-month').classList.toggle('inc',statsUnit==='month');
  $('#seg-year').classList.toggle('on',statsUnit==='year');$('#seg-year').classList.toggle('out',statsUnit==='year');
  $('#stats-label').textContent=statsUnit==='month'?(statsAnchor.slice(0,4)+'年'+parseInt(statsAnchor.slice(5,7),10)+'月'):(statsYear+'年');
  renderStatsBody();
}
function hbar(arr,isIn){
  if(!arr.length)return '<div class="bars"><div class="empty" style="padding:14px 0">本月尚無資料</div></div>';
  const max=Math.max(1,...arr.map(a=>a[1]));
  return '<div class="bars">'+arr.map((a)=>{
    const pct=Math.max(3,Math.round(a[1]/max*100));
    return '<div class="brow"><span class="bname">'+esc(a[0])+'</span><span class="btrack"><span class="bfill" style="width:'+pct+'%;background:'+(isIn?'var(--inc)':'var(--out)')+'"></span></span><span class="bval">'+Math.round(a[1]).toLocaleString('zh-TW')+'</span></div>';
  }).join('')+'</div>';
}
function dailyChart(y,m,recs){
  const days=daysInMonth(y,m),dayIn={},dayOut={};
  recs.forEach(r=>{const d=parseInt(r.date.slice(8,10),10);if(r.type==='in')dayIn[d]=(dayIn[d]||0)+r.amount;else dayOut[d]=(dayOut[d]||0)+r.amount;});
  const max=Math.max(1,...Object.values(dayIn),...Object.values(dayOut));
  const W=320,H=148,P=6,base=H-14,dayW=(W-P*2)/days,cap=base-P-4;
  let s='<div class="legend"><span><i style="background:var(--inc)"></i>收入</span><span><i style="background:var(--out)"></i>支出</span></div>';
  s+='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="每日收支"><line x1="'+P+'" y1="'+base+'" x2="'+(W-P)+'" y2="'+base+'" stroke="#DFE6EB" stroke-width="1"/>';
  for(let d=1;d<=days;d++){
    const x=P+dayW*(d-1)+dayW*0.16,w=dayW*0.68,half=w/2-0.6;
    const hIn=(dayIn[d]||0)/max*cap,hOut=(dayOut[d]||0)/max*cap;
    s+='<rect x="'+x.toFixed(1)+'" y="'+(base-hIn).toFixed(1)+'" width="'+half.toFixed(1)+'" height="'+Math.max(hIn,0.4).toFixed(1)+'" rx="1" fill="var(--inc)"><title>'+d+'日 收入 '+Math.round(dayIn[d]||0).toLocaleString('zh-TW')+'</title></rect>';
    s+='<rect x="'+(x+half+1.2).toFixed(1)+'" y="'+(base-hOut).toFixed(1)+'" width="'+half.toFixed(1)+'" height="'+Math.max(hOut,0.4).toFixed(1)+'" rx="1" fill="var(--out)"><title>'+d+'日 支出 '+Math.round(dayOut[d]||0).toLocaleString('zh-TW')+'</title></rect>';
    if(d===1||d===Math.round(days/2)||d===days){s+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(H-4)+'" font-size="8" fill="#9AA7B1" text-anchor="middle">'+d+'</text>';}
  }
  return s+'</svg>';
}
function yearChart(y){
  const W=320,H=150,P=8,mIn={},mOut={};
  for(let m=1;m<=12;m++){mIn[m]=0;mOut[m]=0;}
  state.records.forEach(r=>{
    if(r.date.slice(0,4)!==String(y))return;
    const m=parseInt(r.date.slice(5,7),10);
    if(r.type==='in')mIn[m]+=r.amount;else mOut[m]+=r.amount;
  });
  const max=Math.max(1,...Object.values(mIn),...Object.values(mOut));
  const gw=(W-P*2)/12,bw=gw*0.34,base=H-18,cap=base-P;
  let s='<div class="legend"><span><i style="background:var(--inc)"></i>收入</span><span><i style="background:var(--out)"></i>支出</span></div>';
  s+='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="每月收支"><line x1="'+P+'" y1="'+base+'" x2="'+(W-P)+'" y2="'+base+'" stroke="#DFE6EB"/>';
  for(let m=1;m<=12;m++){
    const cx=P+gw*(m-1)+gw/2;
    const hIn=mIn[m]/max*cap,hOut=mOut[m]/max*cap;
    s+='<rect x="'+(cx-bw-1).toFixed(1)+'" y="'+(base-hIn).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(hIn,0.4).toFixed(1)+'" rx="1.5" fill="var(--inc)"><title>'+m+'月 收入 '+Math.round(mIn[m]).toLocaleString('zh-TW')+'</title></rect>';
    s+='<rect x="'+(cx+1).toFixed(1)+'" y="'+(base-hOut).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(hOut,0.4).toFixed(1)+'" rx="1.5" fill="var(--out)"><title>'+m+'月 支出 '+Math.round(mOut[m]).toLocaleString('zh-TW')+'</title></rect>';
    s+='<text x="'+cx.toFixed(1)+'" y="'+(H-6)+'" font-size="8" fill="#9AA7B1" text-anchor="middle">'+m+'</text>';
  }
  return s+'</svg>';
}
function renderStatsBody(){
  const body=$('#stats-body');
  const now=new Date();
  if(statsUnit==='month'){
    const p=statsAnchor.split('-').map(Number),y=p[0],m=p[1];
    const recs=state.records.filter(r=>r.date.slice(0,7)===statsAnchor);
    if(!recs.length){body.innerHTML='<div class="empty">'+y+'年'+m+'月還沒有紀錄，去「記帳」記一筆吧。</div>';return;}
    const mIn=recs.filter(r=>r.type==='in'),mOut=recs.filter(r=>r.type==='out');
    const sumIn=mIn.reduce((s,r)=>s+r.amount,0),sumOut=mOut.reduce((s,r)=>s+r.amount,0);
    const day=(now.getFullYear()===y&&now.getMonth()+1===m)?now.getDate():daysInMonth(y,m);
    let html='<div class="sum-grid">'
      +'<div class="sum"><div class="k">本月收入</div><div class="v inc">'+money(sumIn)+'</div></div>'
      +'<div class="sum"><div class="k">本月支出</div><div class="v out">'+money(sumOut)+'</div></div>'
      +'<div class="sum"><div class="k">本月結餘</div><div class="v net">'+money(sumIn-sumOut)+'</div></div>'
      +'<div class="sum"><div class="k">日均收入（'+day+'天）</div><div class="v">'+money(day?sumIn/day:0)+'</div></div>'
      +'</div>';
    const platMap={};mIn.forEach(r=>{const k=recPlatform(r)?recPlatform(r).name:'其他';platMap[k]=(platMap[k]||0)+r.amount;});
    html+='<div class="chart-card"><h3>平台收入</h3><div class="sub">'+y+'年'+m+'月，各平台收入</div>'+hbar(Object.entries(platMap).sort((a,b)=>b[1]-a[1]),true)+'</div>';
    const catMap={};mOut.forEach(r=>{const k=recCat(r).name;catMap[k]=(catMap[k]||0)+r.amount;});
    html+='<div class="chart-card"><h3>支出類別</h3><div class="sub">'+m+'月支出最多的項目</div>'+hbar(Object.entries(catMap).sort((a,b)=>b[1]-a[1]),false)+'</div>';
    html+='<div class="chart-card"><h3>每日收支</h3><div class="sub">'+m+'月每一天的收入與支出</div>'+dailyChart(y,m,recs)+'</div>';
    body.innerHTML=html;
  }else{
    const y=parseInt(statsYear,10);
    const recs=state.records.filter(r=>r.date.slice(0,4)===String(y));
    if(!recs.length){body.innerHTML='<div class="empty">'+y+'年還沒有紀錄。</div>';return;}
    const yIn=recs.filter(r=>r.type==='in'),yOut=recs.filter(r=>r.type==='out');
    const sumIn=yIn.reduce((s,r)=>s+r.amount,0),sumOut=yOut.reduce((s,r)=>s+r.amount,0);
    let html='<div class="sum-grid">'
      +'<div class="sum"><div class="k">今年收入</div><div class="v inc">'+money(sumIn)+'</div></div>'
      +'<div class="sum"><div class="k">今年支出</div><div class="v out">'+money(sumOut)+'</div></div>'
      +'<div class="sum"><div class="k">今年結餘</div><div class="v net">'+money(sumIn-sumOut)+'</div></div>'
      +'<div class="sum"><div class="k">月均結餘</div><div class="v">'+money((sumIn-sumOut)/12)+'</div></div>'
      +'</div>';
    html+='<div class="chart-card"><h3>每月收支</h3><div class="sub">'+y+'年，綠＝收入、紅＝支出</div>'+yearChart(y)+'</div>';
    body.innerHTML=html;
  }
}

/* ============ 設定 ============ */
function renderSettings(){
  const b=$('#settings-body');
  b.innerHTML=
   '<div class="lbl" style="padding:8px 0 4px">我的平台</div>'
   +'<div>'+state.platforms.map(p=>'<div class="srow"><span class="name">'+esc(p.name)+'</span><button class="mini danger" data-action="del-plat" data-id="'+p.id+'"><svg class="i" style="width:16px;height:16px"><use href="#i-trash" xlink:href="#i-trash"/></svg></button></div>').join('')+'</div>'
   +'<div class="addrow"><input id="add-plat" placeholder="新增平台名稱"><button class="sbtn" data-action="add-plat">新增</button></div>'
   +'<div class="lbl" style="padding:10px 0 4px">收入類別</div>'
   +'<div>'+state.incomeCats.map(c=>'<div class="srow"><span class="name">'+esc(c.name)+'</span><button class="mini danger" data-action="del-cat" data-type="in" data-id="'+c.id+'"><svg class="i" style="width:16px;height:16px"><use href="#i-trash" xlink:href="#i-trash"/></svg></button></div>').join('')+'</div>'
   +'<div class="addrow"><input id="add-cat-in" placeholder="新增收入類別"><button class="sbtn" data-action="add-cat" data-type="in">新增</button></div>'
   +'<div class="lbl" style="padding:10px 0 4px">支出類別</div>'
   +'<div>'+state.expenseCats.map(c=>'<div class="srow"><span class="name">'+esc(c.name)+'</span><button class="mini danger" data-action="del-cat" data-type="out" data-id="'+c.id+'"><svg class="i" style="width:16px;height:16px"><use href="#i-trash" xlink:href="#i-trash"/></svg></button></div>').join('')+'</div>'
   +'<div class="addrow"><input id="add-cat-out" placeholder="新增支出類別"><button class="sbtn" data-action="add-cat" data-type="out">新增</button></div>'
   +'<div class="lbl" style="padding:10px 0 4px">Dropbox 同步</div>'
   +'<div class="srow"><span class="name" id="dbx-status">尚未連結</span><button class="sbtn" style="height:36px;padding:0 14px" id="dbx-btn" data-action="dbx-action">連結 Dropbox</button></div>'
   +'<div class="srow"><span class="name">立即同步</span><button class="mini" data-action="dbx-now"><svg class="i" style="width:16px;height:16px"><use href="#i-refresh" xlink:href="#i-refresh"/></svg></button></div>'
   +'<div class="snote">同步檔：Dropbox 的 Apps/豆子帳務/豆子帳務資料.xlsx。每次儲存後自動同步；電腦端 Dropbox 會自動留底。</div>'
   +'<div class="lbl" style="padding:10px 0 4px">資料</div>'
   +'<div class="srow"><span class="name">匯出 CSV（Excel 可開）</span><button class="mini" data-action="export-csv" title="匯出"><svg class="i" style="width:16px;height:16px"><use href="#i-download" xlink:href="#i-download"/></svg></button></div>'
   +'<div class="srow"><span class="name">清除所有資料</span><button class="mini danger" data-action="clear-all"><svg class="i" style="width:16px;height:16px"><use href="#i-trash" xlink:href="#i-trash"/></svg></button></div>';
}
function addPlat(){
  const inp=$('#add-plat'),v=inp.value.trim();
  if(!v){toast('請輸入平台名稱');return;}
  if(state.platforms.some(p=>p.name===v)){toast('這個平台已存在');return;}
  state.platforms.push({id:uid(),name:v});save();inp.value='';renderSettings();toast('已新增平台');
}
function delPlat(id){
  const p=state.platforms.find(x=>x.id===id);if(!p)return;
  if(!confirm('刪除平台「'+p.name+'」？既有紀錄仍會保留。'))return;
  state.platforms=state.platforms.filter(x=>x.id!==id);save();renderSettings();
}
function addCat(type){
  const key=type==='in'?'incomeCats':'expenseCats';
  const inp=$('#add-cat-'+type),v=inp.value.trim();
  if(!v){toast('請輸入類別名稱');return;}
  if(state[key].some(c=>c.name===v)){toast('這個類別已存在');return;}
  state[key].push({id:uid(),name:v});save();inp.value='';renderSettings();toast('已新增類別');
}
function delCat(type,id){
  const key=type==='in'?'incomeCats':'expenseCats';
  const c=state[key].find(x=>x.id===id);if(!c)return;
  if(!confirm('刪除類別「'+c.name+'」？既有紀錄仍會保留。'))return;
  state[key]=state[key].filter(x=>x.id!==id);save();renderSettings();
}
function exportCSV(){
  if(!state.records.length){toast('尚無資料可匯出');return;}
  const head=['日期','時間','類型','平台','類別','金額','支付方式','備註'];
  const rows=state.records.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(r=>{
    const p=recPlatform(r),c=recCat(r);
    return [r.date,r.time,r.type==='in'?'收入':'支出',p?p.name:'其他',c.name,r.amount,r.pay||'',r.note||''].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',');
  });
  const csv='\ufeff'+head.join(',')+'\n'+rows.join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='豆子帳務系統-匯出-'+todayStr()+'.csv';
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},120);
  toast('已匯出 CSV');
}

function clearAllAction(){
  if(!confirm('確定清除所有紀錄？無法復原。'))return;
  state.records=[];save();renderCurrent();toast('已清除所有資料');
}


/* ============ Dropbox 同步 ============ */
const DBX_APP_KEY='dqv70jwk549lca7';
const DBX_REDIRECT='https://marathon-briefing.github.io/';
const DBX_FILE='/豆子帳務資料.xlsx';
const DBX_LS='taxiLedgerDbxV1';
let dbxBusy=false;
function dbxTokens(){try{const raw=localStorage.getItem(DBX_LS);return raw?JSON.parse(raw):null;}catch(e){return null;}}
function dbxSaveTokens(t){try{localStorage.setItem(DBX_LS,JSON.stringify(t));}catch(e){toast('同步設定儲存失敗');}}
function dbxClearTokens(){try{localStorage.removeItem(DBX_LS);}catch(e){}}
function dbxIsLinked(){const t=dbxTokens();return !!(t&&t.refresh_token);}
function dbxLastSync(){try{const t=dbxTokens();return t&&t.lastSyncAt?t.lastSyncAt:'';}catch(e){return '';}}
function dbxQ(params){return Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');}
function dbxArgRaw(obj){let j='{}';try{j=JSON.stringify(obj);}catch(e){}return j.replace(/[\u0080-\uffff]/g,function(c){return '\\u'+('000'+c.charCodeAt(0).toString(16)).slice(-4);});}
function dbxArg(obj){let j='{}';try{j=JSON.stringify(obj);}catch(e){}const a=dbxArgRaw(obj);try{return btoa(a);}catch(e){return a;}}
async function dbxFetch(url,opts){
  const res=await fetch(url,opts);
  const text=await res.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch(e){data=null;}
  if(!res.ok){
    let m='HTTP '+res.status;
    if(data){
      if(data.error_summary)m=String(data.error_summary).slice(0,160);
      else if(typeof data.error==='string')m=data.error+(data.error_description?(' '+data.error_description):'');
      else if(data.error&&data.error['.tag'])m=data.error['.tag']+(data.error.reason?(' '+JSON.stringify(data.error.reason).slice(0,80)):'');
      else if(data.error)m=JSON.stringify(data.error).slice(0,160);
    }
    const err=new Error(m);err.status=res.status;throw err;
  }
  return data;
}
async function dbxRefresh(){
  const t=dbxTokens();if(!t||!t.refresh_token)throw new Error('尚未連結');
  if(t.access_token&&t.expires_at&&Date.now()<t.expires_at-60000)return t.access_token;
  const body=dbxQ({grant_type:'refresh_token',refresh_token:t.refresh_token,client_id:DBX_APP_KEY});
  const r=await dbxFetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
  t.access_token=r.access_token;t.expires_at=Date.now()+(r.expires_in||14400)*1000;
  dbxSaveTokens(t);return t.access_token;
}
async function dbxDownload(){
  const token=await dbxRefresh();
  const args=[dbxArg({path:DBX_FILE}),dbxArgRaw({path:DBX_FILE})];
  let lastErr=null;
  for(const a of args){
    const res=await fetch('https://content.dropboxapi.com/2/files/download',{method:'POST',headers:{'Authorization':'Bearer '+token,'Dropbox-API-Arg':a}});
    if(res.status===200)return res.arrayBuffer();
    if(res.status===409){
      try{const d=await res.json();if(d&&d.error&&d.error['.tag']==='path')return null;}catch(e){}
      throw new Error('讀取雲端檔失敗 HTTP 409');
    }
    let detail='';
    try{const d=await res.json();detail=(d&&(d.error_summary||(d.error&&(d.error['.tag']||JSON.stringify(d.error)))))||'';}catch(e){try{detail=(await res.text()).slice(0,160);}catch(e2){detail='';}}
    lastErr=new Error('下載失敗 '+res.status+(detail?(' · '+detail):''));
  }
  throw lastErr;
}
async function dbxUpload(buf){
  const token=await dbxRefresh();
  const args=[dbxArg({path:DBX_FILE,mode:'overwrite',mute:true}),dbxArgRaw({path:DBX_FILE,mode:'overwrite',mute:true})];
  let lastErr=null;
  for(const a of args){
    const res=await fetch('https://content.dropboxapi.com/2/files/upload',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/octet-stream','Dropbox-API-Arg':a},body:buf});
    if(res.ok)return res.json();
    let detail='';
    try{const d=await res.json();detail=(d&&(d.error_summary||(d.error&&(d.error['.tag']||JSON.stringify(d.error)))))||'';}catch(e){try{detail=(await res.text()).slice(0,160);}catch(e2){detail='';}}
    lastErr=new Error('上傳失敗 '+res.status+(detail?(' · '+detail):''));
  }
  throw lastErr;
}
async function dbxStartAuth(){
  if(typeof crypto==='undefined'||!crypto.subtle){toast('此瀏覽器不支援加密，無法連結 Dropbox');return;}
  const v=new Uint8Array(32);crypto.getRandomValues(v);
  let verifier='';
  for(let i=0;i<16;i++){verifier+=String.fromCharCode(97+(v[i]%26));}
  verifier+=btoa(String.fromCharCode.apply(null,v)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const chal=btoa(String.fromCharCode.apply(null,new Uint8Array(h))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const st=Math.random().toString(36).slice(2);
  localStorage.setItem('dbx_pkce',JSON.stringify({verifier:verifier,state:st}));
  const q=dbxQ({client_id:DBX_APP_KEY,response_type:'code',code_challenge:chal,code_challenge_method:'S256',token_access_type:'offline',redirect_uri:DBX_REDIRECT,state:st});
  location.href='https://www.dropbox.com/oauth2/authorize?'+q;
}
async function dbxHandleRedirect(){
  if(typeof location==='undefined'||!location.search)return;
  const p=new URLSearchParams(location.search);
  const code=p.get('code');
  if(!code)return;
  let pkce={};
  try{pkce=JSON.parse(localStorage.getItem('dbx_pkce')||'{}');}catch(e){}
  const st=p.get('state');
  if(st&&pkce.state&&st!==pkce.state){toast('授權驗證失敗，請重試');try{history.replaceState({},'','/');}catch(e){}return;}
  localStorage.removeItem('dbx_pkce');
  const body=dbxQ({grant_type:'authorization_code',code:code,code_verifier:pkce.verifier||'',client_id:DBX_APP_KEY,redirect_uri:DBX_REDIRECT});
  try{
    const r=await dbxFetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body});
    dbxSaveTokens({access_token:r.access_token,refresh_token:r.refresh_token,expires_at:Date.now()+(r.expires_in||14400)*1000,lastSyncAt:''});
    try{history.replaceState({},'','/');}catch(e){}
    toast('已連結 Dropbox');
    setTimeout(function(){dbxSync(true);},400);
  }catch(e){toast('連結失敗：'+e.message);try{history.replaceState({},'','/');}catch(e2){}}
}
function dbxBuildWb(){
  const head=['日期','時間','類型','平台','類別','金額','支付方式','備註','系統ID','系統時間'];
  const rows=state.records.slice().sort(function(a,b){return a.date.localeCompare(b.date)||a.time.localeCompare(b.time);}).map(function(r){
    const p=recPlatform(r),c=recCat(r);
    return [r.date,r.time,r.type==='in'?'收入':'支出',r.type==='in'?(p?p.name:''):'',c.name,r.amount,r.pay||'',r.note||'',r.id,r.createdAt||0];
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([head].concat(rows)),'紀錄');
  const set=[['類型','ID','名稱']];
  state.platforms.forEach(function(x){set.push(['平台',x.id,x.name]);});
  state.incomeCats.forEach(function(x){set.push(['收入',x.id,x.name]);});
  state.expenseCats.forEach(function(x){set.push(['支出',x.id,x.name]);});
  state.payMethods.forEach(function(x){set.push(['支付',x,x]);});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(set),'設定');
  return XLSX.write(wb,{bookType:'xlsx',type:'array'});
}
function dbxParseWb(buf){
  const wb=XLSX.read(new Uint8Array(buf),{type:'array'});
  const out=[];
  const ws=wb.Sheets['紀錄'];
  if(ws){
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
    for(let i=1;i<rows.length;i++){
      const r=rows[i];if(!r||!r[0])continue;
      const date=String(r[0]).trim();
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))continue;
      out.push({id:String(r[8]||uid()),type:(r[2]==='支出'?'out':'in'),date:date,time:String(r[1]||''),platformName:String(r[3]||''),platformId:null,catId:null,amount:parseFloat(r[5])||0,pay:String(r[6]||''),note:String(r[7]||''),createdAt:Number(r[9])||0});
    }
  }
  let platforms=null,incomeCats=null,expenseCats=null,payMethods=null;
  const ws2=wb.Sheets['設定'];
  if(ws2){
    const cat={platform:[],income:[],expense:[]},pm=[];
    const s=XLSX.utils.sheet_to_json(ws2,{header:1,defval:''});
    for(let i=1;i<s.length;i++){
      const row=s[i];if(!row||!row[0])continue;
      if(row[0]==='平台')cat.platform.push({id:String(row[1]||uid()),name:String(row[2]||'')});
      else if(row[0]==='收入')cat.income.push({id:String(row[1]||uid()),name:String(row[2]||'')});
      else if(row[0]==='支出')cat.expense.push({id:String(row[1]||uid()),name:String(row[2]||'')});
      else if(row[0]==='支付')pm.push(String(row[1]||''));
    }
    if(cat.platform.length)platforms=cat.platform;
    if(cat.income.length)incomeCats=cat.income;
    if(cat.expense.length)expenseCats=cat.expense;
    if(pm.length)payMethods=pm;
  }
  return {records:out,platforms:platforms,incomeCats:incomeCats,expenseCats:expenseCats,payMethods:payMethods};
}
function dbxMergeLists(custom,def){
  const ids={};custom.forEach(function(x){ids[x.id]=1;});
  return custom.concat(def.filter(function(d){return !ids[d.id];}));
}
function dbxApplySettings(s){
  if(!s)return;
  if(Array.isArray(s.platforms)&&s.platforms.length){state.platforms=dbxMergeLists(s.platforms,DEFAULT_PLATFORMS);dbxOrderPlatforms();}
  if(Array.isArray(s.incomeCats)&&s.incomeCats.length)state.incomeCats=dbxMergeLists(s.incomeCats,DEFAULT_INCOME_CATS);
  if(Array.isArray(s.expenseCats)&&s.expenseCats.length)state.expenseCats=dbxMergeLists(s.expenseCats,DEFAULT_EXPENSE_CATS);
  if(Array.isArray(s.payMethods)&&s.payMethods.length)state.payMethods=s.payMethods;
}
function dbxOrderPlatforms(){
  const custom=state.platforms.filter(function(p){return PLATFORM_ORDER.indexOf(p.id)<0;});
  const ordered=[];
  PLATFORM_ORDER.forEach(function(id){const p=state.platforms.find(function(x){return x.id===id;});if(p)ordered.push(p);});
  state.platforms=ordered.concat(custom);
}
function dbxMapPlatforms(){
  state.records.forEach(function(r){
    if(r.type!=='in'||!r.platformName)return;
    const p=state.platforms.find(function(x){return x.name===r.platformName;});
    if(p)r.platformId=p.id;
  });
}
function dbxMergeRecords(localArr,cloudArr){
  const map={};
  localArr.forEach(function(r){const k=r.id||(r.createdAt+'_'+r.amount+'_'+r.date);map[k]=r;});
  cloudArr.forEach(function(r){
    const k=r.id||(r.createdAt+'_'+r.amount+'_'+r.date);
    const ex=map[k];
    if(!ex){map[k]=r;}
    else if(r.id&&r.id===ex.id&&(r.createdAt||0)>(ex.createdAt||0)){map[k]=r;}
  });
  return Object.keys(map).map(function(k){return map[k];});
}
function fmtSyncTime(iso){if(!iso)return '';const d=new Date(iso);return (d.getMonth()+1)+'月'+d.getDate()+'日 '+pad2(d.getHours())+':'+pad2(d.getMinutes());}
function dbxSetErr(msg){try{localStorage.setItem('taxiLedgerDbxErr',JSON.stringify({msg:msg,at:Date.now()}));}catch(e){}}
function dbxClearErr(){try{localStorage.removeItem('taxiLedgerDbxErr');}catch(e){}}
function dbxErrText(){try{const raw=localStorage.getItem('taxiLedgerDbxErr');if(!raw)return '';const o=JSON.parse(raw);return o.msg?('上次同步失敗：'+o.msg):'';}catch(e){return '';}}
async function dbxSync(force){
  if(dbxBusy)return;
  if(typeof XLSX==='undefined'){toast('Excel 套件未載入（需網路），請稍後再試');return;}
  if(!dbxIsLinked()){toast('尚未連結 Dropbox');return;}
  dbxBusy=true;
  try{
    let cloudBuf=null;
    try{cloudBuf=await dbxDownload();}
    catch(e){dbxSetErr('下載雲端檔失敗（已繼續上傳）：'+e.message);}
    let cloudRecords=[],cloudSet=null;
    try{
      if(cloudBuf){const parsed=dbxParseWb(cloudBuf);cloudRecords=parsed.records;cloudSet=parsed;}
    }catch(e){const m='讀取雲端 Excel 失敗：'+e.message;dbxSetErr(m);dbxBusy=false;toast('同步失敗：'+e.message);return;}
    const merged=dbxMergeRecords(state.records,cloudRecords);
    const changed=merged.length!==state.records.length;
    if(changed||force){
      state.records=merged;
      dbxApplySettings(cloudSet);
      dbxMapPlatforms();
      save();
      renderCurrent();
    }
    let buf;
    try{buf=dbxBuildWb();}catch(e){const m='產生 Excel 失敗：'+e.message;dbxSetErr(m);dbxBusy=false;toast('同步失敗：'+e.message);return;}
    try{await dbxUpload(buf);}catch(e){const m='上傳失敗：'+e.message;dbxSetErr(m);dbxBusy=false;toast('同步失敗：'+e.message);refreshDbxUI();return;}
    const t=dbxTokens()||{};t.lastSyncAt=new Date().toISOString();dbxSaveTokens(t);
    dbxClearErr();
    dbxBusy=false;
    toast('已同步 Dropbox · '+fmtSyncTime(t.lastSyncAt));
    refreshDbxUI();
  }catch(e){
    const m='同步失敗：'+e.message;dbxSetErr(m);dbxBusy=false;toast(m);refreshDbxUI();
  }
}
function refreshDbxUI(){
  const st=$('#dbx-status');const btn=$('#dbx-btn');
  if(!st)return;
  const err=dbxErrText();
  if(dbxIsLinked()){
    st.textContent='已連結 · 上次同步 '+fmtSyncTime(dbxLastSync());
    if(err)st.textContent=err;
    btn.textContent='解除連結';
    btn.style.background='#E8EDF1';btn.style.color='var(--ink2)';
  }else{
    st.textContent=err||'尚未連結（紀錄僅存本機瀏覽器）';
    btn.textContent='連結 Dropbox';
    btn.style.background='';btn.style.color='';
  }
}
function dbxAction(){
  if(dbxIsLinked()){dbxClearTokens();refreshDbxUI();toast('已解除連結（雲端檔仍保留）');}
  else{dbxStartAuth();}
}

/* ============ 事件與初始化 ============ */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const act=el.dataset.action;
  switch(act){
    case 'go-view':
      if(el.dataset.v==='entry'){editId=null;entryCat=null;entryPlat=state.platforms[0]?state.platforms[0].id:null;resetEntryFields();}
      goView(el.dataset.v);
      break;
    case 'go-entry':entryMode=el.dataset.mode;editId=null;entryCat=null;entryPlat=state.platforms[0]?state.platforms[0].id:null;resetEntryFields();goView('entry');break;
    case 'set-mode':setMode(el.dataset.mode);break;
    case 'pick-plat':entryPlat=el.dataset.id;renderEntry();break;
    case 'pick-cat':entryCat=el.dataset.id;renderEntry();break;
    case 'quick':$('#in-amount').value=el.dataset.v;break;
    case 'save-record':saveRecord();break;
    case 'entry-cancel':editId=null;goView('records');break;
    case 'open-edit':openEdit(el.dataset.id);break;
    case 'del-record':delRecord();break;
    case 'go-records':recFilter.period='month';goView('records');break;
    case 'f-type':recFilter.type=el.dataset.v;recFilter.platform='all';renderRecords();break;
    case 'f-period':recFilter.period=el.dataset.v;renderRecords();break;
    case 'stats-unit':statsUnit=el.dataset.v;renderStats();break;
    case 'stats-nav':statsNav(parseInt(el.dataset.d,10));break;
    case 'open-settings':renderSettings();refreshDbxUI();$('#mask-settings').classList.remove('hidden');break;
    case 'close-settings':$('#mask-settings').classList.add('hidden');break;
    case 'add-plat':addPlat();break;
    case 'del-plat':delPlat(el.dataset.id);break;
    case 'add-cat':addCat(el.dataset.type);break;
    case 'del-cat':delCat(el.dataset.type,el.dataset.id);break;
    case 'export-csv':exportCSV();break;
    case 'dbx-action':dbxAction();break;
    case 'dbx-now':dbxSync(true);break;
    case 'clear-all':clearAllAction();break;
  }
});
function init(){
  const amt=$('#in-amount');
  amt.addEventListener('input',function(){this.value=this.value.replace(/[^\d.]/g,'').replace(/(\..*)\./g,'$1');});
  amt.addEventListener('keydown',function(e){if(e.key==='Enter')saveRecord();});
  $('#mask-settings').addEventListener('click',e=>{if(e.target.id==='mask-settings')e.target.classList.add('hidden');});
  renderHome();
  try{dbxHandleRedirect();}catch(e){}
  try{if(dbxIsLinked())setTimeout(function(){dbxSync(false);},900);}catch(e){}
}
init();
