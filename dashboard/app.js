// Token Launch Radar — static board, no network. DATA comes from /output/data.js.
const $=s=>document.querySelector(s);
const usd=n=>n>=1e9?'$'+(n/1e9).toFixed(2)+'B':'$'+Math.round(n/1e6)+'M';
const rows=DATA.rows;
let sortK='r',sortDir=1;

$('#asof').textContent=`DefiLlama snapshot as of ${DATA.asof} · floor ${usd(DATA.floor)} · ${rows.length} pre-token protocols`;

const totT=rows.reduce((s,r)=>s+r.t,0),totV=rows.reduce((s,r)=>s+r.v,0),wlN=rows.filter(r=>r.w).length;
$('#hero').innerHTML=[
 ['pre-token protocols',rows.length],['combined TVL',usd(totT)],
 ['combined implied value',usd(totV)],['house watchlist rows',wlN],
].map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('');

const cats=[...new Set(rows.map(r=>r.c).filter(Boolean))].sort();
for(const c of cats){const o=document.createElement('option');o.value=o.textContent=c;$('#fcat').append(o);}

function filt(){
  const q=$('#q').value.toLowerCase(),fc=$('#fcat').value,fmin=+$('#fmin').value,fw=$('#fw').checked;
  return rows.filter(r=>(!q||r.name.toLowerCase().includes(q)||r.slug.includes(q))&&(!fc||r.c===fc)&&r.t>=fmin&&(!fw||r.w));
}
function render(){
  const rs=filt().sort((a,b)=>sortDir*(a[sortK]>b[sortK]?1:a[sortK]<b[sortK]?-1:0));
  $('#count').textContent=rs.length+' rows';
  $('#board tbody').innerHTML=rs.map(r=>`<tr data-s="${r.slug}">
    <td>${r.r}</td><td>${r.name}${r.w?'<span class="wl">WL</span>':''}</td>
    <td class="v">${usd(r.v)}</td><td>${usd(r.t)}</td><td>${r.c??'—'}</td>
    <td class="${(r.g??0)>=0?'up':'dn'}">${r.g==null?'—':(r.g>=0?'+':'')+r.g.toFixed(1)+'%'}</td>
    <td>${r.ch}</td><td>${r.l??'—'}</td><td>›</td></tr>`).join('');
}
document.querySelectorAll('th[data-k]').forEach(th=>th.onclick=()=>{
  const k=th.dataset.k;sortDir=sortK===k?-sortDir:1;sortK=k;render();});
['#q','#fcat','#fmin','#fw'].forEach(s=>$(s).oninput=render);

function openDetail(slug){
  const r=rows.find(x=>x.slug===slug);if(!r)return;
  $('#dn').textContent=r.name;
  $('#dmeta').textContent=`${r.slug} · rank #${r.r} of ${rows.length}`;
  $('#dstats').innerHTML=[
    ['Implied value',usd(r.v)],['TVL',usd(r.t)],
    ['Category',r.c??'—'],['7d change',r.g==null?'—':r.g.toFixed(1)+'%'],
    ['Chains',r.ch],['Listed',r.l??'—'],
    ['Watchlist',r.w?'yes':'below floor'],['Records token','none on DefiLlama'],
  ].map(([k,v])=>`<div><b>${v}</b><span>${k}</span></div>`).join('');
  const bits=[];
  bits.push(`${usd(r.t)} of TVL — the single biggest driver of a token's launch size.`);
  if(r.c)bits.push(`${r.c} protocols carry a ${r.c==='Derivatives'||r.c==='Dexs'?'high':'solid'} historical token premium.`);
  if(r.g!=null)bits.push(`TVL ${r.g>=0?'grew':'fell'} ${Math.abs(r.g).toFixed(1)}% in seven days — momentum ${r.g>=0?'adds to':'trims'} the estimate.`);
  if(r.l&&+r.l.slice(0,4)>=2026&&r.t>=1e8)bits.push(`New and already large: listed ${r.l} and past $100M fast — the classic airdrop-window profile.`);
  else if(r.l&&+r.l.slice(0,4)<=2022)bits.push(`Tracked since ${r.l} with no token recorded — a veteran the market still waits on.`);
  if(!r.w)bits.push(`Below the house floor, not on its watchlist — exactly the kind of early row a radar exists to surface.`);
  $('#dwhy').textContent=' '+bits.join(' ');
  $('#dsteps').innerHTML=(FARM[r.slug]??[]).map(s=>`<li>${s}</li>`).join('');
  $('#detail').hidden=false;
}
$('#close').onclick=()=>{$('#detail').hidden=true;history.replaceState(0,'','#')};
$('#board tbody').onclick=e=>{const tr=e.target.closest('tr');if(tr)location.hash='d='+tr.dataset.s};

// hash routes for deep links + screenshots: #d=slug opens detail, #f=... presets filters
const h=new URLSearchParams(location.hash.slice(1));
if(h.get('cat'))$('#fcat').value=h.get('cat');
if(h.get('w'))$('#fw').checked=true;
if(h.get('q'))$('#q').value=h.get('q');
render();
if(h.get('d'))openDetail(h.get('d'));
