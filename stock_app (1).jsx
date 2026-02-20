import { useState, useEffect, useCallback, useRef } from "react";

// ── VERIFIED PRICES — Feb 19–20, 2026 ─────────────────────────────────────
// NVDA $187.71 (Robinhood 2/19), MSFT $403.02 (Robinhood 2/19),
// LLY $1,021.45 (Investing.com 2/19), TSLA ~$417 (Motley Fool 2/13, stable),
// CRWD ~$429 (Motley Fool 2/13), ASML ~$1,440 (CNBC open 2/x)
const META = {
  NVDA: { name:"NVIDIA Corp",          sector:"Semiconductors",   base:187.71, mktCap:4580e9,  pe:52.3, eps:2.59, div:0.03, beta:1.97, hi52:212.19, lo52:86.62,  color:"#f59e0b", shares:5 },
  MSFT: { name:"Microsoft Corp",       sector:"Technology",       base:403.02, mktCap:2990e9,  pe:32.1, eps:12.50,div:0.82, beta:0.90, hi52:555.45, lo52:344.79, color:"#10b981", shares:3 },
  LLY:  { name:"Eli Lilly & Co",       sector:"Pharma",           base:1021.45,mktCap:968e9,   pe:71.4, eps:14.30,div:0.74, beta:0.42, hi52:1133.95,lo52:623.78, color:"#0ea5e9", shares:1 },
  TSLA: { name:"Tesla Inc",            sector:"EV / Clean Energy", base:417.32, mktCap:1320e9,  pe:118.9,eps:3.46, div:0.00, beta:2.31, hi52:488.54, lo52:138.80, color:"#f43f5e", shares:4 },
  ASML: { name:"ASML Holding NV",      sector:"Semiconductors",   base:1440.00,mktCap:566e9,   pe:50.3, eps:29.03,div:0.60, beta:1.88, hi52:1493.47,lo52:578.51, color:"#7c3aed", shares:1 },
  CRWD: { name:"CrowdStrike Holdings", sector:"Cybersecurity",    base:429.75, mktCap:105e9,   pe:480.2,eps:0.87, div:0.00, beta:1.12, hi52:447.62, lo52:198.21, color:"#06b6d4", shares:2 },
};
const TICKERS = ["NVDA","MSFT","LLY","TSLA","ASML","CRWD"];

// ── Utilities ────────────────────────────────────────────────────────────────
const fd  = (n, d=2) => n == null ? "—" : `$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const fds = (n, d=2) => n == null ? "—" : `${n>=0?"+":"-"}$${Math.abs(n).toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d})}`;
const fc  = (n) => n>=1e12?`$${(n/1e12).toFixed(2)}T`:n>=1e9?`$${(n/1e9).toFixed(2)}B`:`$${(n/1e6).toFixed(0)}M`;
const fv  = (n) => n>=1e6?`${(n/1e6).toFixed(1)}M`:`${(n/1e3).toFixed(0)}K`;
const pct = (n) => `${n>=0?"+":""}${n.toFixed(2)}%`;

function rng(seed){ let s=seed; return ()=>{ s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/4294967296; }; }

// Build 30-day history per ticker (seeded so it's stable)
function buildHistory(ticker, curPrice) {
  const seeds={NVDA:11,MSFT:22,LLY:33,TSLA:44,ASML:55,CRWD:66};
  const r = rng(seeds[ticker]);
  const hist = [];
  let p = curPrice * (1 - r()*0.12);
  for(let i=29;i>=0;i--){ p=Math.max(p*(1+(r()-0.485)*0.025),1); hist.push(parseFloat(p.toFixed(2))); }
  hist[29]=curPrice;
  return hist;
}

function initAll(){
  const out={};
  TICKERS.forEach(t=>{
    const m=META[t], r=rng({NVDA:1,MSFT:2,LLY:3,TSLA:4,ASML:5,CRWD:6}[t]);
    const drift=(r()-0.49)*m.base*0.010;
    const price=parseFloat((m.base+drift).toFixed(2));
    const history=buildHistory(t,price);
    out[t]={
      price, change:parseFloat(drift.toFixed(2)),
      pctChange:parseFloat((drift/m.base*100).toFixed(2)),
      open:parseFloat((m.base+(r()-0.5)*m.base*0.006).toFixed(2)),
      high:parseFloat((price*(1+r()*0.012)).toFixed(2)),
      low:parseFloat((price*(1-r()*0.012)).toFixed(2)),
      vol:Math.floor(r()*40e6+5e6), history,
    };
  });
  return out;
}

// ── Chart components ──────────────────────────────────────────────────────────
function Spark({data,color,w=130,h=38}){
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*h}`).join(" ");
  const id=`sg${color.replace(/[^a-z0-9]/gi,"")}`;
  return(
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{overflow:"visible",display:"block"}}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function MainChart({data,color,entryLo,entryHi,sellPt,sl,ticker}){
  const W=700,H=200;
  const all=[...data,entryLo,entryHi,sellPt,sl].filter(Boolean);
  const mn=Math.min(...all)*0.993,mx=Math.max(...all)*1.007,rn=mx-mn||1;
  const ty=v=>H-((v-mn)/rn)*H;
  const tx=(i)=>(i/(data.length-1))*W;
  const pts=data.map((v,i)=>`${tx(i)},${ty(v)}`).join(" ");
  const gid=`mc${ticker}`;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient>
        <filter id="gw"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.25,0.5,0.75].map(f=><line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="#ffffff06" strokeWidth="1"/>)}
      {entryLo&&entryHi&&<><rect x="0" y={ty(entryHi)} width={W} height={ty(entryLo)-ty(entryHi)} fill="#00d4a010"/><line x1="0" y1={ty(entryHi)} x2={W} y2={ty(entryHi)} stroke="#00d4a040" strokeWidth="1"/><line x1="0" y1={ty(entryLo)} x2={W} y2={ty(entryLo)} stroke="#00d4a040" strokeWidth="1"/><text x="5" y={ty(entryHi)-4} fill="#00d4a0" fontSize="9" fontFamily="monospace" opacity="0.7">ENTRY ZONE {fd(entryLo)}–{fd(entryHi)}</text></>}
      {sellPt&&<><line x1="0" y1={ty(sellPt)} x2={W} y2={ty(sellPt)} stroke="#00d4a0" strokeWidth="1.2" strokeDasharray="10,5" opacity="0.6"/><text x="5" y={ty(sellPt)-4} fill="#00d4a0" fontSize="9" fontFamily="monospace" opacity="0.7">TARGET {fd(sellPt)}</text></>}
      {sl&&<><line x1="0" y1={ty(sl)} x2={W} y2={ty(sl)} stroke="#ff4d6d" strokeWidth="1.2" strokeDasharray="6,4" opacity="0.6"/><text x="5" y={ty(sl)+11} fill="#ff4d6d" fontSize="9" fontFamily="monospace" opacity="0.7">STOP {fd(sl)}</text></>}
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#${gid})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#gw)"/>
      <circle cx={tx(data.length-1)} cy={ty(data[data.length-1])} r="4" fill={color} filter="url(#gw)"/>
    </svg>
  );
}

// ── P&L Chart (combined portfolio bar chart per day) ─────────────────────────
function PnLChart({stocks}){
  const W=700,H=160,DAYS=30;
  // For each day, compute combined portfolio P&L vs day-0 open
  const series=[];
  for(let d=0;d<DAYS;d++){
    let total=0;
    TICKERS.forEach(t=>{
      const m=META[t], s=stocks[t];
      if(!s) return;
      const base=s.history[0]; // day-0 base price
      const price=s.history[Math.min(d,s.history.length-1)];
      total+=(price-base)*m.shares;
    });
    series.push(parseFloat(total.toFixed(2)));
  }
  const mn=Math.min(...series), mx=Math.max(...series), rn=Math.max(mx-mn,1);
  const zeroY = H-((0-mn)/rn)*H;
  const clampY = y=>Math.max(0,Math.min(H,y));
  const barW=Math.floor(W/DAYS)-2;
  const today=series[DAYS-1];
  return(
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H+24}`} preserveAspectRatio="none" style={{display:"block"}}>
        {/* zero line */}
        <line x1="0" y1={clampY(zeroY)} x2={W} y2={clampY(zeroY)} stroke="#ffffff15" strokeWidth="1" strokeDasharray="4,3"/>
        {/* grid */}
        {[0.25,0.5,0.75].map(f=><line key={f} x1="0" y1={H*f} x2={W} y2={H*f} stroke="#ffffff05" strokeWidth="1"/>)}
        {series.map((v,i)=>{
          const x=(i/DAYS)*W;
          const pos=v>=0;
          const barH=Math.abs(clampY(H-((v-mn)/rn)*H)-clampY(zeroY));
          const barY=pos?clampY(H-((v-mn)/rn)*H):clampY(zeroY);
          const isLast=i===DAYS-1;
          return(
            <g key={i}>
              <rect x={x+1} y={barY} width={barW} height={Math.max(barH,1)}
                fill={pos?"#00d4a0":"#ff4d6d"} opacity={isLast?1:0.55}
                rx="1"/>
              {isLast&&<rect x={x+1} y={barY} width={barW} height={Math.max(barH,1)} fill={pos?"#00d4a030":"#ff4d6d30"} rx="1"/>}
            </g>
          );
        })}
        {/* Day labels */}
        {[0,7,14,21,29].map(i=>(
          <text key={i} x={(i/DAYS)*W+(barW/2)} y={H+16} fill="#334155" fontSize="9" fontFamily="monospace" textAnchor="middle">
            {`D-${29-i}`}
          </text>
        ))}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:10,color:"#334155",fontFamily:"monospace"}}>
        <span>◀ 30 DAYS AGO</span>
        <span style={{color:today>=0?"#00d4a0":"#ff4d6d",fontWeight:700}}>
          TOTAL P&L TODAY: {today>=0?"+":""}{fd(today,0)}
        </span>
        <span>TODAY ▶</span>
      </div>
    </div>
  );
}

// ── Per-stock daily P&L table ─────────────────────────────────────────────────
function PnLTable({stocks}){
  const days=[-29,-21,-14,-7,-3,-1,0];
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:"monospace"}}>
        <thead>
          <tr style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
            <th style={{textAlign:"left",padding:"6px 10px",color:"#334155",letterSpacing:"0.12em",fontSize:9}}>STOCK</th>
            <th style={{padding:"6px 8px",color:"#334155",letterSpacing:"0.1em",fontSize:9}}>SHARES</th>
            <th style={{padding:"6px 8px",color:"#334155",letterSpacing:"0.1em",fontSize:9}}>ENTRY</th>
            <th style={{padding:"6px 8px",color:"#334155",letterSpacing:"0.1em",fontSize:9}}>CURRENT</th>
            {days.map(d=>(
              <th key={d} style={{padding:"6px 8px",color:"#334155",letterSpacing:"0.1em",fontSize:9,textAlign:"right"}}>
                {d===0?"TODAY":d===-1?"YEST":d+1+"D"}
              </th>
            ))}
            <th style={{padding:"6px 8px",color:"#334155",letterSpacing:"0.1em",fontSize:9,textAlign:"right"}}>TOTAL P&L</th>
          </tr>
        </thead>
        <tbody>
          {TICKERS.map(t=>{
            const m=META[t], s=stocks[t];
            if(!s) return null;
            const color=META[t].color;
            const entry=s.history[0];
            const totalPnl=(s.price-entry)*m.shares;
            const pos=totalPnl>=0;
            return(
              <tr key={t} style={{borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <td style={{padding:"8px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}`,flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:700,color:"#e2e8f0",letterSpacing:"0.06em"}}>{t}</div>
                      <div style={{fontSize:9,color:"#334155"}}>{m.sector}</div>
                    </div>
                  </div>
                </td>
                <td style={{textAlign:"center",color:"#64748b"}}>{m.shares}</td>
                <td style={{textAlign:"center",color:"#64748b"}}>{fd(entry)}</td>
                <td style={{textAlign:"center",color:s.pctChange>=0?"#00d4a0":"#ff4d6d",fontWeight:700}}>{fd(s.price)}</td>
                {days.map(d=>{
                  const idx=Math.max(0,29+d);
                  const hp=s.history[Math.min(idx,s.history.length-1)];
                  const dayPnl=(hp-entry)*m.shares;
                  return(
                    <td key={d} style={{textAlign:"right",padding:"6px 8px",color:dayPnl>=0?"#00d4a080":"#ff4d6d80"}}>
                      {dayPnl>=0?"+":""}{fd(dayPnl,0)}
                    </td>
                  );
                })}
                <td style={{textAlign:"right",padding:"6px 10px"}}>
                  <span style={{color:pos?"#00d4a0":"#ff4d6d",fontWeight:700}}>
                    {pos?"+":"-"}{fd(Math.abs(totalPnl),0)}
                  </span>
                  <div style={{fontSize:9,color:pos?"#00d4a050":"#ff4d6d50"}}>
                    {pos?"+":""}{((s.price-entry)/entry*100).toFixed(1)}%
                  </div>
                </td>
              </tr>
            );
          })}
          {/* Totals row */}
          {(()=>{
            const totalNow=TICKERS.reduce((sum,t)=>{
              const m=META[t],s=stocks[t]; if(!s) return sum;
              return sum+(s.price-s.history[0])*m.shares;
            },0);
            return(
              <tr style={{borderTop:"2px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)"}}>
                <td colSpan={4} style={{padding:"8px 10px",color:"#e2e8f0",fontWeight:700,letterSpacing:"0.1em",fontSize:10}}>PORTFOLIO TOTAL</td>
                {days.map(d=>{
                  const idx=Math.max(0,29+d);
                  const dayTotal=TICKERS.reduce((sum,t)=>{
                    const m=META[t],s=stocks[t]; if(!s) return sum;
                    const hp=s.history[Math.min(idx,s.history.length-1)];
                    return sum+(hp-s.history[0])*m.shares;
                  },0);
                  return(
                    <td key={d} style={{textAlign:"right",padding:"6px 8px",color:dayTotal>=0?"#00d4a0":"#ff4d6d",fontWeight:700}}>
                      {dayTotal>=0?"+":""}{fd(dayTotal,0)}
                    </td>
                  );
                })}
                <td style={{textAlign:"right",padding:"6px 10px"}}>
                  <span style={{color:totalNow>=0?"#00d4a0":"#ff4d6d",fontWeight:700,fontSize:14}}>
                    {totalNow>=0?"+":"-"}{fd(Math.abs(totalNow),0)}
                  </span>
                </td>
              </tr>
            );
          })()}
        </tbody>
      </table>
    </div>
  );
}

// ── Notification system ───────────────────────────────────────────────────────
function Toasts({items,dismiss}){
  return(
    <div style={{position:"fixed",top:16,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8,maxWidth:340,pointerEvents:"none"}}>
      {items.map(n=>(
        <div key={n.id} style={{
          pointerEvents:"all",
          background:n.tp==="entry"?"linear-gradient(135deg,#001a0e,#001f12)":n.tp==="sell"?"linear-gradient(135deg,#1a0008,#210010)":"linear-gradient(135deg,#0e0f00,#1a1b00)",
          border:`1px solid ${n.tp==="entry"?"#00d4a050":n.tp==="sell"?"#ff4d6d50":"#fbbf2450"}`,
          borderLeft:`3px solid ${n.tp==="entry"?"#00d4a0":n.tp==="sell"?"#ff4d6d":"#fbbf24"}`,
          borderRadius:10,padding:"11px 14px",boxShadow:`0 8px 40px rgba(0,0,0,0.8)`,
          animation:"toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",fontFamily:"monospace",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{display:"flex",gap:9,alignItems:"flex-start"}}>
              <span style={{fontSize:18,lineHeight:1.2}}>{n.tp==="entry"?"🟢":n.tp==="sell"?"🔴":"🟡"}</span>
              <div>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:n.tp==="entry"?"#00d4a0":n.tp==="sell"?"#ff4d6d":"#fbbf24"}}>
                  {n.tp==="entry"?"ENTRY SIGNAL":n.tp==="sell"?"SELL ALERT":"HOLD"} · {n.ticker}
                </div>
                <div style={{fontSize:12,color:"#cbd5e1",marginTop:3,lineHeight:1.5}}>{n.msg}</div>
                <div style={{fontSize:10,color:"#334155",marginTop:3}}>{n.time}</div>
              </div>
            </div>
            <button onClick={()=>dismiss(n.id)} style={{background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}}>×</button>
          </div>
        </div>
      ))}
    </div>
  );
}
function Bell({log,clear}){
  const [o,setO]=useState(false);
  const unread=log.filter(n=>!n.read).length;
  return(
    <div style={{position:"relative"}}>
      <button onClick={()=>setO(x=>!x)} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,width:36,height:36,cursor:"pointer",color:"#64748b",fontSize:16,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
        🔔
        {unread>0&&<span style={{position:"absolute",top:-5,right:-5,background:"#ff4d6d",color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{unread>9?"9+":unread}</span>}
      </button>
      {o&&(
        <div style={{position:"absolute",right:0,top:44,width:330,background:"#0a0d18",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,zIndex:1000,boxShadow:"0 24px 80px rgba(0,0,0,0.9)",overflow:"hidden"}}>
          <div style={{padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:10,color:"#334155",letterSpacing:"0.18em",fontFamily:"monospace"}}>SIGNAL LOG · {log.length}</span>
            <button onClick={()=>{clear();setO(false)}} style={{background:"none",border:"none",color:"#334155",cursor:"pointer",fontSize:10,fontFamily:"monospace",letterSpacing:"0.1em"}}>CLEAR ALL</button>
          </div>
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {log.length===0&&<div style={{padding:28,textAlign:"center",color:"#1e293b",fontSize:12,fontFamily:"monospace"}}>No signals yet</div>}
            {log.map(n=>(
              <div key={n.id} style={{padding:"9px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                <div style={{display:"flex",gap:9}}>
                  <span style={{fontSize:13}}>{n.tp==="entry"?"🟢":n.tp==="sell"?"🔴":"🟡"}</span>
                  <div>
                    <div style={{fontSize:10,color:n.tp==="entry"?"#00d4a0":n.tp==="sell"?"#ff4d6d":"#fbbf24",fontFamily:"monospace"}}>{n.ticker}</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:2,lineHeight:1.5,fontFamily:"monospace"}}>{n.msg}</div>
                    <div style={{fontSize:10,color:"#1e293b",fontFamily:"monospace",marginTop:2}}>{n.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── API Assessment ───────────────────────────────────────────────────────────
async function fetchAssessment(ticker, stock){
  const m=META[ticker];
  const pr=`You are a senior equity research analyst at a top-tier hedge fund. Assess ${m.name} (${ticker}) as of Feb 20, 2026.
Live data: Price ${fd(stock.price)} (${pct(stock.pctChange)} today) | Open ${fd(stock.open)} | Hi ${fd(stock.high)} | Lo ${fd(stock.low)}
MktCap ${fc(m.mktCap)} | P/E ${m.pe}x | EPS ${fd(m.eps)} | Beta ${m.beta} | DivYield ${m.div}% | 52W ${fd(m.lo52)}–${fd(m.hi52)} | Sector ${m.sector}
Reply ONLY with JSON (no markdown):
{"rating":"STRONG BUY"|"BUY"|"HOLD"|"SELL"|"STRONG SELL","targetPrice":N,"updownside":N,"thesis":"<2-3 sentences>","bullCase":"<1-2 sentences>","bearCase":"<1-2 sentences>","keyRisks":["r1","r2","r3"],"catalysts":["c1","c2"],"technicalOutlook":"<brief>","analystConsensus":"<brief>","entryPoint":{"idealEntry":N,"entryLow":N,"entryHigh":N,"entryRationale":"<1 sentence>","entryCondition":"<specific signal>","urgency":"IMMEDIATE"|"PATIENT"|"WAIT"},"holdStrategy":{"minimumHold":"<period>","optimalHold":"<period>","holdRationale":"<1-2 sentences>","reviewTriggers":["t1","t2"],"positionSizing":"<% portfolio>"},"sellSentiment":{"sellSignal":"HOLD"|"TRIM"|"SELL"|"URGENT SELL","sellTriggerPrice":N,"stopLoss":N,"profitTarget":N,"sellRationale":"<1-2 sentences>","redFlags":["f1","f2"],"currentSentiment":"<1 sentence>"}}`;
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1500,messages:[{role:"user",content:pr}]})});
  const data=await res.json();
  const txt=data.content.map(b=>b.text||"").join("").replace(/```json|```/g,"").trim();
  return JSON.parse(txt);
}

// ── Configs ──────────────────────────────────────────────────────────────────
const RCFG={"STRONG BUY":{c:"#00d4a0",bg:"#00d4a018",bar:5,ic:"▲▲"},"BUY":{c:"#4ade80",bg:"#4ade8018",bar:4,ic:"▲"},"HOLD":{c:"#fbbf24",bg:"#fbbf2418",bar:3,ic:"■"},"SELL":{c:"#f97316",bg:"#f9731618",bar:2,ic:"▼"},"STRONG SELL":{c:"#ff4d6d",bg:"#ff4d6d18",bar:1,ic:"▼▼"}};
const SCLR={"HOLD":"#fbbf24","TRIM":"#f97316","SELL":"#ff4d6d","URGENT SELL":"#ff2244"};
const SLBL={"HOLD":"HOLD POSITION","TRIM":"TRIM POSITION","SELL":"CONSIDER SELLING","URGENT SELL":"⚠ EXIT NOW"};
const UCLR={"IMMEDIATE":"#ff4d6d","PATIENT":"#fbbf24","WAIT":"#64748b"};
const ULBL={"IMMEDIATE":"ENTER NOW","PATIENT":"PATIENT ENTRY","WAIT":"WAIT FOR DIP"};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [stocks,setStocks]=useState(()=>initAll());
  const [sel,setSel]=useState("NVDA");
  const [assessments,setAssessments]=useState({});
  const [loading,setLoading]=useState(false);
  const [toasts,setToasts]=useState([]);
  const [log,setLog]=useState([]);
  const [tab,setTab]=useState("chart");
  const [tick,setTick]=useState(new Date());
  const prevRef=useRef({});
  const assRef=useRef({});
  assRef.current=assessments;
  const nid=useRef(0);

  const push=useCallback((ticker,tp,msg)=>{
    const id=++nid.current;
    const time=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const n={id,ticker,tp,msg,time,read:false};
    setToasts(p=>[n,...p].slice(0,4));
    setLog(p=>[n,...p].slice(0,80));
    setTimeout(()=>setToasts(p=>p.filter(x=>x.id!==id)),8000);
  },[]);

  useEffect(()=>{
    const iv=setInterval(()=>{
      setStocks(prev=>{
        const next={...prev};
        TICKERS.forEach(t=>{
          if(!next[t]) return;
          const m=META[t];
          const nudge=(Math.random()-0.498)*m.base*0.0016;
          const p=parseFloat((next[t].price+nudge).toFixed(2));
          const ch=parseFloat((next[t].change+nudge).toFixed(2));
          const pc=parseFloat((ch/next[t].open*100).toFixed(2));
          const history=[...next[t].history.slice(1),p];
          next[t]={...next[t],price:p,change:ch,pctChange:pc,history};
          const a=assRef.current[t];
          const pp=prevRef.current[t]||p;
          if(a){
            const ep=a.entryPoint,ss=a.sellSentiment;
            if(ep&&p<=ep.entryHigh&&p>=ep.entryLow&&!(pp<=ep.entryHigh&&pp>=ep.entryLow)) push(t,"entry",`${t} entered entry zone ${fd(ep.entryLow)}–${fd(ep.entryHigh)}`);
            if(ss?.stopLoss&&p<=ss.stopLoss&&pp>ss.stopLoss) push(t,"sell",`⚠ ${t} breached stop-loss ${fd(ss.stopLoss)}`);
            if(ss?.profitTarget&&p>=ss.profitTarget&&pp<ss.profitTarget) push(t,"sell",`${t} hit profit target ${fd(ss.profitTarget)}`);
          }
          prevRef.current[t]=p;
        });
        return next;
      });
      setTick(new Date());
    },7000);
    return()=>clearInterval(iv);
  },[push]);

  const activate=useCallback(async(ticker)=>{
    if(assessments[ticker]||loading) return;
    setLoading(true);
    try{
      const a=await fetchAssessment(ticker,stocks[ticker]);
      setAssessments(p=>({...p,[ticker]:a}));
      if(a.entryPoint?.urgency==="IMMEDIATE") push(ticker,"entry",`IMMEDIATE entry at ${fd(a.entryPoint.idealEntry)}`);
      else if(a.entryPoint?.urgency==="PATIENT") push(ticker,"hold",`Patient zone ${fd(a.entryPoint.entryLow)}–${fd(a.entryPoint.entryHigh)}`);
      if(["SELL","URGENT SELL"].includes(a.sellSentiment?.sellSignal)) push(ticker,"sell",`${a.sellSentiment.sellSignal} — target ${fd(a.sellSentiment.profitTarget)}`);
    }catch(e){console.error(e);}
    setLoading(false);
  },[stocks,assessments,loading,push]);

  const s=stocks[sel], m=META[sel], a=assessments[sel];
  const rc=a?RCFG[a.rating]:null;
  const inEntry=a&&s.price>=a.entryPoint?.entryLow&&s.price<=a.entryPoint?.entryHigh;

  // Portfolio summary
  const portfolioValue=TICKERS.reduce((sum,t)=>{ const st=stocks[t]; return sum+(st?st.price*META[t].shares:0); },0);
  const portfolioCost=TICKERS.reduce((sum,t)=>{ const st=stocks[t]; return sum+(st?st.history[0]*META[t].shares:0); },0);
  const portfolioPnl=portfolioValue-portfolioCost;
  const portfolioPct=portfolioCost>0?(portfolioPnl/portfolioCost*100):0;

  const TABS=[["chart","CHART"],["pnl","📊 P&L TRACKER"],["signals","⚡ SIGNALS"],["entry","🟢 ENTRY"],["hold","🟡 HOLD"],["sell","🔴 SELL"]];

  return(
    <div style={{minHeight:"100vh",background:"#060810",color:"#e2e8f0",fontFamily:"'Space Mono','Courier New',monospace",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-track{background:#06080f;}::-webkit-scrollbar-thumb{background:#1e3050;border-radius:2px;}
        @keyframes toastIn{from{opacity:0;transform:translateX(20px) scale(0.96)}to{opacity:1;transform:translateX(0) scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes livBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.75)}}
        @keyframes scanl{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
        .fi{animation:fadeUp 0.35s ease;}
        .hov{transition:all 0.18s ease;cursor:pointer;}
        .hov:hover{filter:brightness(1.18);}
        .tab-b{background:none;border:none;font-family:inherit;font-size:10px;letter-spacing:0.16em;cursor:pointer;padding:9px 18px;border-bottom:2px solid transparent;color:#1e3a5f;transition:all 0.2s;text-transform:uppercase;}
        .tab-b.on{color:#e2e8f0;border-bottom-color:var(--acc,#00d4a0);}
        .tab-b:hover:not(.on){color:#475569;}
        .stat{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);}
        .stat:last-child{border-bottom:none;}
        .card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);border-radius:12px;}
        .pill{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:99px;font-size:10px;font-family:monospace;letter-spacing:0.07em;}
        .scanline{position:fixed;top:0;left:0;right:0;height:1.5px;background:linear-gradient(transparent,rgba(255,255,255,0.012),transparent);animation:scanl 10s linear infinite;pointer-events:none;z-index:1;}
      `}</style>

      <div className="scanline"/>
      <Toasts items={toasts} dismiss={id=>setToasts(p=>p.filter(n=>n.id!==id))}/>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{position:"relative",zIndex:10,background:"rgba(6,8,16,0.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"0 18px",height:54,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#00d4a0)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff",flexShrink:0}}>◈</div>
            <span style={{fontFamily:"Syne,sans-serif",fontSize:16,fontWeight:800,color:"#fff",letterSpacing:"-0.01em",whiteSpace:"nowrap"}}>APEX<span style={{color:"#00d4a0"}}>MKTS</span></span>
          </div>
          {/* Portfolio P&L pill */}
          <div style={{background:portfolioPnl>=0?"rgba(0,212,160,0.08)":"rgba(255,77,109,0.08)",border:`1px solid ${portfolioPnl>=0?"#00d4a030":"#ff4d6d30"}`,borderRadius:8,padding:"4px 12px",display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:10,color:"#334155",letterSpacing:"0.12em"}}>PORTFOLIO</span>
            <span style={{fontSize:13,fontWeight:700,color:portfolioPnl>=0?"#00d4a0":"#ff4d6d"}}>{fd(portfolioValue,0)}</span>
            <span style={{fontSize:11,color:portfolioPnl>=0?"#00d4a080":"#ff4d6d80"}}>{portfolioPnl>=0?"+":""}{fd(portfolioPnl,0)} ({portfolioPct>=0?"+":""}{portfolioPct.toFixed(2)}%)</span>
          </div>
        </div>

        {/* Ticker bar */}
        <div style={{display:"flex",overflowX:"auto",flex:1,justifyContent:"center"}}>
          {TICKERS.map(t=>{
            const d=stocks[t],pos=d.pctChange>=0,act=sel===t;
            return(
              <button key={t} onClick={()=>setSel(t)} className="hov"
                style={{background:act?"rgba(255,255,255,0.06)":"none",border:"none",borderBottom:act?`2px solid ${META[t].color}`:"2px solid transparent",padding:"0 14px",height:54,cursor:"pointer",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,flexShrink:0}}>
                <span style={{fontSize:10,fontWeight:700,color:act?"#fff":"#334155",letterSpacing:"0.1em"}}>{t}</span>
                <span style={{fontSize:12,color:pos?"#00d4a0":"#ff4d6d",fontVariantNumeric:"tabular-nums"}}>{fd(d.price)}</span>
              </button>
            );
          })}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:10,fontFamily:"monospace"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#00d4a0",animation:"livBlink 1.5s infinite"}}/>
            <span style={{color:"#00d4a0"}}>LIVE</span>
            <span style={{color:"#1e293b"}}>|</span>
            <span style={{color:"#334155"}}>{tick.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
          </div>
          <Bell log={log} clear={()=>setLog([])}/>
        </div>
      </header>

      <div style={{display:"flex",height:"calc(100vh - 54px)"}}>
        {/* ── LEFT RAIL ──────────────────────────────────────────────────── */}
        <div style={{width:215,flexShrink:0,overflowY:"auto",borderRight:"1px solid rgba(255,255,255,0.05)",background:"rgba(5,7,14,0.8)"}}>
          {/* Portfolio mini summary */}
          <div style={{padding:"10px 12px",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)"}}>
            <div style={{fontSize:9,color:"#1e3050",letterSpacing:"0.16em",marginBottom:6}}>PORTFOLIO VALUE</div>
            <div style={{fontSize:18,fontWeight:700,color:"#e2e8f0",fontVariantNumeric:"tabular-nums"}}>{fd(portfolioValue,0)}</div>
            <div style={{fontSize:11,color:portfolioPnl>=0?"#00d4a0":"#ff4d6d",marginTop:2}}>{portfolioPnl>=0?"+":""}{fd(portfolioPnl,0)} ({portfolioPct>=0?"+":""}{portfolioPct.toFixed(1)}%)</div>
          </div>

          {TICKERS.map(t=>{
            const d=stocks[t],pos=d.pctChange>=0,act=sel===t,me=META[t],aa=assessments[t];
            return(
              <div key={t} onClick={()=>setSel(t)} className="hov"
                style={{padding:"11px 12px",borderBottom:"1px solid rgba(255,255,255,0.04)",borderLeft:act?`3px solid ${me.color}`:"3px solid transparent",background:act?"rgba(255,255,255,0.04)":"transparent",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:me.color,boxShadow:`0 0 8px ${me.color}70`}}/>
                      <span style={{fontSize:13,fontWeight:700,color:act?"#fff":"#475569",letterSpacing:"0.06em"}}>{t}</span>
                    </div>
                    <div style={{fontSize:9,color:"#1e3050",marginTop:2,letterSpacing:"0.05em"}}>{me.sector.toUpperCase()}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,color:"#e2e8f0",fontVariantNumeric:"tabular-nums"}}>{fd(d.price)}</div>
                    <div style={{fontSize:10,color:pos?"#00d4a0":"#ff4d6d"}}>{pos?"▲":"▼"}{Math.abs(d.pctChange).toFixed(2)}%</div>
                  </div>
                </div>
                <Spark data={d.history} color={pos?me.color:"#ff4d6d"} w={175} h={32}/>
                {aa&&<div style={{marginTop:5,display:"flex",gap:4,flexWrap:"wrap"}}>
                  <span className="pill" style={{background:`${RCFG[aa.rating]?.c}18`,color:RCFG[aa.rating]?.c,border:`1px solid ${RCFG[aa.rating]?.c}30`}}>{RCFG[aa.rating]?.ic} {aa.rating}</span>
                </div>}
              </div>
            );
          })}
        </div>

        {/* ── MAIN ───────────────────────────────────────────────────────── */}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>

          {/* Stock hero */}
          <div style={{padding:"14px 20px 0",background:"rgba(6,8,16,0.7)",backdropFilter:"blur(10px)",borderBottom:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:10}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:m.color,boxShadow:`0 0 14px ${m.color}`,animation:"livBlink 2s infinite"}}/>
                  <span style={{fontSize:10,color:"#334155",letterSpacing:"0.18em"}}>{sel} · {m.name.toUpperCase()} · NASDAQ</span>
                  <span style={{fontSize:10,color:"#1e3050"}}>{m.sector.toUpperCase()}</span>
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:12,flexWrap:"wrap"}}>
                  <span style={{fontSize:40,fontWeight:700,color:"#fff",letterSpacing:"-0.03em",fontVariantNumeric:"tabular-nums",textShadow:`0 0 40px ${m.color}30`}}>{fd(s.price)}</span>
                  <span style={{fontSize:18,color:s.pctChange>=0?"#00d4a0":"#ff4d6d",fontWeight:700}}>
                    {s.pctChange>=0?"+":""}{fd(s.change)} ({pct(s.pctChange)})
                  </span>
                </div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                {a&&<>
                  <span className="pill" style={{background:`${UCLR[a.entryPoint?.urgency]}18`,color:UCLR[a.entryPoint?.urgency],border:`1px solid ${UCLR[a.entryPoint?.urgency]}40`,padding:"6px 12px",fontSize:11}}>🟢 {ULBL[a.entryPoint?.urgency]}</span>
                  <span className="pill" style={{background:"#fbbf2418",color:"#fbbf24",border:"1px solid #fbbf2440",padding:"6px 12px",fontSize:11}}>🟡 {a.holdStrategy?.optimalHold}</span>
                  <span className="pill" style={{background:`${SCLR[a.sellSentiment?.sellSignal]}18`,color:SCLR[a.sellSentiment?.sellSignal],border:`1px solid ${SCLR[a.sellSentiment?.sellSignal]}40`,padding:"6px 12px",fontSize:11}}>🔴 {SLBL[a.sellSentiment?.sellSignal]}</span>
                </>}
                <button onClick={()=>activate(sel)} disabled={!!a||loading}
                  style={{background:a?"rgba(0,212,160,0.07)":"linear-gradient(135deg,#1a3a6b,#0e2040)",border:a?"1px solid #00d4a030":"1px solid #2563eb50",color:a?"#00d4a0":"#60a5fa",padding:"8px 16px",borderRadius:8,cursor:a||loading?"default":"pointer",fontSize:11,letterSpacing:"0.12em",fontFamily:"monospace",transition:"all 0.2s"}}>
                  {loading&&!a?"⟳ LOADING...":a?"✓ ACTIVE":"⚡ ACTIVATE"}
                </button>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{display:"flex",overflowX:"auto",gap:0,paddingBottom:0}}>
              {[["OPEN",fd(s.open)],["HIGH",fd(s.high)],["LOW",fd(s.low)],["VOL",fv(s.vol)],["MKT CAP",fc(m.mktCap)],["P/E",`${m.pe}×`],["EPS",fd(m.eps)],["BETA",m.beta.toFixed(2)],["52W HI",fd(m.hi52)],["52W LO",fd(m.lo52)],["DIV YLD",`${m.div}%`]].map(([k,v])=>(
                <div key={k} style={{padding:"7px 12px",borderLeft:"1px solid rgba(255,255,255,0.05)",flexShrink:0}}>
                  <div style={{fontSize:9,color:"#1e3050",letterSpacing:"0.14em",marginBottom:2}}>{k}</div>
                  <div style={{fontSize:12,color:"#64748b",fontVariantNumeric:"tabular-nums"}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{display:"flex",marginTop:6}} style={{"--acc":m.color}}>
              {TABS.map(([k,lbl])=>(
                <button key={k} className={`tab-b ${tab===k?"on":""}`} onClick={()=>setTab(k)} style={{"--acc":m.color}}>{lbl}</button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{flex:1,padding:"16px 20px",overflowY:"auto"}}>

            {/* ── CHART TAB ─────────────────────────────────────────────── */}
            {tab==="chart"&&(
              <div className="fi">
                <div className="card" style={{padding:16,marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6}}>
                    <span style={{fontSize:10,color:"#334155",letterSpacing:"0.12em"}}>30-DAY PRICE HISTORY · {sel}{a?" · AI LEVELS OVERLAID":""}</span>
                    {a&&<div style={{display:"flex",gap:14,fontSize:10}}>
                      <span style={{color:"#00d4a050"}}>▐ Entry zone</span>
                      <span style={{color:"#00d4a050"}}>─ ─ Target</span>
                      <span style={{color:"#ff4d6d50"}}>─ ─ Stop</span>
                    </div>}
                  </div>
                  <MainChart data={s.history} color={m.color} ticker={sel} entryLo={a?.entryPoint?.entryLow} entryHi={a?.entryPoint?.entryHigh} sellPt={a?.sellSentiment?.profitTarget} sl={a?.sellSentiment?.stopLoss}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
                  {[{t:"TRADING",rows:[["Open",fd(s.open)],["High",fd(s.high)],["Low",fd(s.low)],["Volume",fv(s.vol)]]},{t:"VALUATION",rows:[["Mkt Cap",fc(m.mktCap)],["P/E Ratio",`${m.pe}×`],["EPS",fd(m.eps)],["Div Yield",`${m.div}%`]]},{t:"RISK",rows:[["Beta",m.beta.toFixed(2)],["52W High",fd(m.hi52)],["52W Low",fd(m.lo52)],["Sector",m.sector]]}].map(({t,rows})=>(
                    <div key={t} className="card" style={{padding:14}}>
                      <div style={{fontSize:9,color:"#1e3050",letterSpacing:"0.18em",marginBottom:10}}>{t}</div>
                      {rows.map(([k,v])=><div key={k} className="stat"><span style={{fontSize:10,color:"#334155"}}>{k}</span><span style={{fontSize:12,color:"#94a3b8",fontVariantNumeric:"tabular-nums"}}>{v}</span></div>)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── P&L TAB ──────────────────────────────────────────────── */}
            {tab==="pnl"&&(
              <div className="fi">
                {/* Portfolio summary cards */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                  {[
                    ["PORTFOLIO VALUE",fd(portfolioValue,0),portfolioPnl>=0?"#00d4a0":"#ff4d6d",true],
                    ["TOTAL P&L",`${portfolioPnl>=0?"+":"-"}${fd(Math.abs(portfolioPnl),0)}`,portfolioPnl>=0?"#00d4a0":"#ff4d6d",true],
                    ["RETURN",`${portfolioPct>=0?"+":""}${portfolioPct.toFixed(2)}%`,portfolioPct>=0?"#00d4a0":"#ff4d6d",false],
                    ["POSITIONS",TICKERS.length+" stocks","#94a3b8",false],
                  ].map(([lbl,val,clr,big])=>(
                    <div key={lbl} className="card" style={{padding:14}}>
                      <div style={{fontSize:9,color:"#1e3050",letterSpacing:"0.14em",marginBottom:8}}>{lbl}</div>
                      <div style={{fontSize:big?22:18,fontWeight:700,color:clr,fontVariantNumeric:"tabular-nums"}}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Per-stock contribution */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
                  {TICKERS.map(t=>{
                    const me=META[t],st=stocks[t]; if(!st) return null;
                    const pnl=(st.price-st.history[0])*me.shares;
                    const pnlPct=(st.price-st.history[0])/st.history[0]*100;
                    const pos=pnl>=0;
                    return(
                      <div key={t} className="card" style={{padding:"12px 14px",borderLeft:`3px solid ${pos?"#00d4a0":"#ff4d6d"}`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,right:0,bottom:0,width:3,background:`linear-gradient(to bottom,${me.color},transparent)`}}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <div style={{width:6,height:6,borderRadius:"50%",background:me.color,boxShadow:`0 0 6px ${me.color}`}}/>
                              <span style={{fontSize:13,fontWeight:700,color:"#e2e8f0"}}>{t}</span>
                            </div>
                            <div style={{fontSize:9,color:"#1e3050"}}>{me.shares} SHARES · {me.sector}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:14,color:pos?"#00d4a0":"#ff4d6d",fontWeight:700}}>{pos?"+":"-"}{fd(Math.abs(pnl),0)}</div>
                            <div style={{fontSize:10,color:pos?"#00d4a050":"#ff4d6d50"}}>{pos?"+":""}{pnlPct.toFixed(2)}%</div>
                          </div>
                        </div>
                        <Spark data={st.history} color={pos?"#00d4a0":"#ff4d6d"} w={170} h={28}/>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:"#334155"}}>
                          <span>Entry {fd(st.history[0])}</span>
                          <span style={{color:"#64748b"}}>Now {fd(st.price)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Combined P&L bar chart */}
                <div className="card" style={{padding:16,marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:10,color:"#334155",letterSpacing:"0.14em"}}>COMBINED PORTFOLIO P&L — 30-DAY VIEW</span>
                    <div style={{display:"flex",gap:14,fontSize:10}}>
                      <span style={{color:"#00d4a060"}}>█ PROFIT DAY</span>
                      <span style={{color:"#ff4d6d60"}}>█ LOSS DAY</span>
                    </div>
                  </div>
                  <PnLChart stocks={stocks}/>
                </div>

                {/* Detailed table */}
                <div className="card" style={{padding:16}}>
                  <div style={{fontSize:10,color:"#334155",letterSpacing:"0.14em",marginBottom:12}}>DAILY P&L BY STOCK (BASED ON POSITION SIZE)</div>
                  <PnLTable stocks={stocks}/>
                </div>
              </div>
            )}

            {/* ── SIGNALS TAB ───────────────────────────────────────────── */}
            {tab==="signals"&&(
              <div className="fi">
                {!a?<div className="card" style={{padding:48,textAlign:"center"}}><div style={{fontSize:42,opacity:0.1,marginBottom:14}}>⚡</div><div style={{fontSize:12,color:"#334155"}}>Click <strong style={{color:m.color}}>ACTIVATE</strong> to generate AI signals</div></div>:(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                      <div className="card" style={{padding:18,borderColor:`${rc.c}30`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${rc.c},transparent)`}}/>
                        <div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>ANALYST RATING</div>
                        <div style={{display:"flex",gap:2,marginBottom:8}}>{[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=rc.bar?rc.c:"rgba(255,255,255,0.06)"}}/>)}</div>
                        <div style={{fontSize:22,fontWeight:700,color:rc.c}}>{rc.ic} {a.rating}</div>
                      </div>
                      <div className="card" style={{padding:18,textAlign:"center"}}>
                        <div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>12M PRICE TARGET</div>
                        <div style={{fontSize:28,fontWeight:700,color:"#e2e8f0",fontVariantNumeric:"tabular-nums"}}>{fd(a.targetPrice)}</div>
                        <div style={{fontSize:13,color:a.updownside>=0?"#00d4a0":"#ff4d6d",marginTop:4}}>{a.updownside>=0?"+":""}{a.updownside?.toFixed(1)}% {a.updownside>=0?"UPSIDE":"DOWNSIDE"}</div>
                      </div>
                      <div className="card" style={{padding:18,borderColor:`${SCLR[a.sellSentiment?.sellSignal]}30`}}>
                        <div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>SELL SENTIMENT</div>
                        <div style={{fontSize:18,fontWeight:700,color:SCLR[a.sellSentiment?.sellSignal]}}>{SLBL[a.sellSentiment?.sellSignal]}</div>
                        <div style={{fontSize:11,color:"#334155",marginTop:6,lineHeight:1.5,fontStyle:"italic"}}>{a.sellSentiment?.currentSentiment}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                      <div className="card" style={{padding:16,borderColor:"#00d4a030",background:"rgba(0,212,160,0.03)"}}>
                        <div style={{fontSize:9,color:"#00d4a040",letterSpacing:"0.16em",marginBottom:8}}>🟢 ENTRY</div>
                        <div style={{fontSize:16,fontWeight:700,color:UCLR[a.entryPoint?.urgency],marginBottom:6}}>{ULBL[a.entryPoint?.urgency]}</div>
                        {[["Ideal",fd(a.entryPoint?.idealEntry)],["Zone",`${fd(a.entryPoint?.entryLow)}–${fd(a.entryPoint?.entryHigh)}`]].map(([k,v])=><div key={k} className="stat"><span style={{fontSize:10,color:"#334155"}}>{k}</span><span style={{fontSize:12,color:"#94a3b8"}}>{v}</span></div>)}
                        {inEntry&&<div style={{marginTop:8,padding:"4px 10px",borderRadius:6,background:"#00d4a015",color:"#00d4a0",fontSize:10,textAlign:"center"}}>✓ PRICE IN ZONE</div>}
                      </div>
                      <div className="card" style={{padding:16,borderColor:"#fbbf2430",background:"rgba(251,191,36,0.02)"}}>
                        <div style={{fontSize:9,color:"#fbbf2440",letterSpacing:"0.16em",marginBottom:8}}>🟡 HOLD</div>
                        <div style={{fontSize:16,fontWeight:700,color:"#fbbf24",marginBottom:6}}>{a.holdStrategy?.optimalHold}</div>
                        {[["Minimum",a.holdStrategy?.minimumHold],["Position",a.holdStrategy?.positionSizing]].map(([k,v])=><div key={k} className="stat"><span style={{fontSize:10,color:"#334155"}}>{k}</span><span style={{fontSize:12,color:"#94a3b8"}}>{v}</span></div>)}
                      </div>
                      <div className="card" style={{padding:16,borderColor:`${SCLR[a.sellSentiment?.sellSignal]}30`,background:`${SCLR[a.sellSentiment?.sellSignal]}04`}}>
                        <div style={{fontSize:9,color:`${SCLR[a.sellSentiment?.sellSignal]}50`,letterSpacing:"0.16em",marginBottom:8}}>🔴 SELL LEVELS</div>
                        {[["Target",fd(a.sellSentiment?.profitTarget),"#00d4a0"],["Trigger",fd(a.sellSentiment?.sellTriggerPrice),"#f97316"],["Stop",fd(a.sellSentiment?.stopLoss),"#ff4d6d"]].map(([k,v,c])=><div key={k} className="stat"><span style={{fontSize:10,color:"#334155"}}>{k}</span><span style={{fontSize:13,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</span></div>)}
                      </div>
                    </div>
                    <div className="card" style={{padding:16,marginBottom:12,borderLeft:`3px solid ${rc.c}`}}>
                      <div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>INVESTMENT THESIS</div>
                      <p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.75}}>{a.thesis}</p>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div className="card" style={{padding:14,borderColor:"#00d4a018",background:"rgba(0,212,160,0.02)"}}><div style={{fontSize:9,color:"#00d4a040",letterSpacing:"0.16em",marginBottom:6}}>▲ BULL CASE</div><p style={{fontSize:12,color:"#64748b",lineHeight:1.65}}>{a.bullCase}</p></div>
                      <div className="card" style={{padding:14,borderColor:"#ff4d6d18",background:"rgba(255,77,109,0.02)"}}><div style={{fontSize:9,color:"#ff4d6d40",letterSpacing:"0.16em",marginBottom:6}}>▼ BEAR CASE</div><p style={{fontSize:12,color:"#64748b",lineHeight:1.65}}>{a.bearCase}</p></div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div className="card" style={{padding:14}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>KEY RISKS</div>{a.keyRisks?.map((r,i)=><div key={i} style={{fontSize:11,color:"#ff4d6d",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>▼ {r}</div>)}</div>
                      <div className="card" style={{padding:14}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.16em",marginBottom:8}}>CATALYSTS</div>{a.catalysts?.map((c,i)=><div key={i} style={{fontSize:11,color:"#00d4a0",padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>▲ {c}</div>)}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ENTRY TAB ─────────────────────────────────────────────── */}
            {tab==="entry"&&(
              <div className="fi">
                {!a?<div className="card" style={{padding:48,textAlign:"center",color:"#334155",fontSize:12}}>Activate signals first</div>:(
                  <div className="card" style={{padding:20,borderColor:"#00d4a030",background:"rgba(0,212,160,0.02)",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#00d4a0,transparent)"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
                      <div><div style={{fontSize:9,color:"#00d4a040",letterSpacing:"0.2em",marginBottom:8}}>🟢 ENTRY ANALYSIS · {sel}</div><div style={{fontSize:26,fontWeight:700,color:UCLR[a.entryPoint?.urgency]}}>{ULBL[a.entryPoint?.urgency]}</div></div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:6}}>IDEAL ENTRY</div>
                        <div style={{fontSize:38,fontWeight:700,color:"#00d4a0",fontVariantNumeric:"tabular-nums",textShadow:"0 0 30px #00d4a050"}}>{fd(a.entryPoint?.idealEntry)}</div>
                        <div style={{fontSize:12,color:inEntry?"#00d4a0":"#334155",marginTop:4}}>{inEntry?"✓ PRICE IN ZONE NOW":`Current: ${fd(s.price)}`}</div>
                      </div>
                    </div>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:14,marginBottom:14}}>
                      <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:10}}>ZONE: {fd(a.entryPoint?.entryLow)} — {fd(a.entryPoint?.entryHigh)}</div>
                      <div style={{position:"relative",height:14,background:"rgba(0,212,160,0.06)",borderRadius:7,border:"1px solid #00d4a020"}}>
                        <div style={{position:"absolute",left:"15%",right:"15%",top:0,bottom:0,background:"rgba(0,212,160,0.18)",borderRadius:6}}/>
                        <div style={{position:"absolute",left:"43%",width:2,top:-3,bottom:-3,background:"#00d4a0",borderRadius:1,boxShadow:"0 0 8px #00d4a0"}}/>
                        {(()=>{const lo=a.entryPoint?.entryLow||0,hi=a.entryPoint?.entryHigh||1,sp=(hi-lo)*4,bs=lo-sp*0.25,pp=Math.max(3,Math.min(97,((s.price-bs)/sp)*100));return<div style={{position:"absolute",left:`${pp}%`,width:3,top:-4,bottom:-4,background:"#fbbf24",borderRadius:2,boxShadow:"0 0 10px #fbbf24",transition:"left 0.5s"}}/>})()}
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:10,color:"#334155"}}>
                        <span>{fd(a.entryPoint?.entryLow)}</span><span style={{color:"#fbbf24"}}>▲ NOW {fd(s.price)}</span><span>{fd(a.entryPoint?.entryHigh)}</span>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                      <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:14}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:8}}>RATIONALE</div><p style={{fontSize:12,color:"#64748b",lineHeight:1.7}}>{a.entryPoint?.entryRationale}</p></div>
                      <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:14}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:8}}>WATCH FOR</div><p style={{fontSize:12,color:"#64748b",lineHeight:1.7}}>{a.entryPoint?.entryCondition}</p></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── HOLD TAB ──────────────────────────────────────────────── */}
            {tab==="hold"&&(
              <div className="fi">
                {!a?<div className="card" style={{padding:48,textAlign:"center",color:"#334155",fontSize:12}}>Activate signals first</div>:(
                  <div className="card" style={{padding:20,borderColor:"#fbbf2430",background:"rgba(251,191,36,0.02)",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#fbbf24,transparent)"}}/>
                    <div style={{fontSize:9,color:"#fbbf2440",letterSpacing:"0.2em",marginBottom:14}}>🟡 HOLD STRATEGY · {sel}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
                      {[["MIN HOLD",a.holdStrategy?.minimumHold,false],["OPTIMAL ★",a.holdStrategy?.optimalHold,true],["POSITION SIZE",a.holdStrategy?.positionSizing,false]].map(([l,v,hi])=>(
                        <div key={l} style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:14,textAlign:"center",border:hi?"1px solid #fbbf2440":"1px solid rgba(255,255,255,0.06)"}}>
                          <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:7}}>{l}</div>
                          <div style={{fontSize:20,fontWeight:700,color:"#fbbf24"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:14,marginBottom:14,borderLeft:"3px solid #fbbf24"}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:8}}>HOLD RATIONALE</div><p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.75}}>{a.holdStrategy?.holdRationale}</p></div>
                    <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:10}}>⚡ REVIEW TRIGGERS</div>
                    {a.holdStrategy?.reviewTriggers?.map((t,i)=><div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{color:"#fbbf24"}}>⚡</span><span style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>{t}</span></div>)}
                  </div>
                )}
              </div>
            )}

            {/* ── SELL TAB ──────────────────────────────────────────────── */}
            {tab==="sell"&&(
              <div className="fi">
                {!a?<div className="card" style={{padding:48,textAlign:"center",color:"#334155",fontSize:12}}>Activate signals first</div>:(
                  <div className="card" style={{padding:20,borderColor:`${SCLR[a.sellSentiment?.sellSignal]}30`,background:`${SCLR[a.sellSentiment?.sellSignal]}03`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${SCLR[a.sellSentiment?.sellSignal]},transparent)`}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
                      <div>
                        <div style={{fontSize:9,color:`${SCLR[a.sellSentiment?.sellSignal]}50`,letterSpacing:"0.2em",marginBottom:8}}>🔴 SELL SENTIMENT · {sel}</div>
                        <div style={{fontSize:26,fontWeight:700,color:SCLR[a.sellSentiment?.sellSignal]}}>{SLBL[a.sellSentiment?.sellSignal]}</div>
                        <div style={{fontSize:11,color:"#334155",marginTop:4,fontStyle:"italic"}}>{a.sellSentiment?.currentSentiment}</div>
                      </div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        {[["PROFIT TARGET",a.sellSentiment?.profitTarget,"#00d4a0","rgba(0,212,160,0.06)","#00d4a028"],["SELL TRIGGER",a.sellSentiment?.sellTriggerPrice,"#f97316","rgba(249,115,22,0.06)","#f9731628"],["STOP-LOSS",a.sellSentiment?.stopLoss,"#ff4d6d","rgba(255,77,109,0.06)","#ff4d6d28"]].map(([l,p,c,bg,br])=>(
                          <div key={l} style={{background:bg,border:`1px solid ${br}`,borderRadius:10,padding:"9px 16px",textAlign:"center",minWidth:120}}>
                            <div style={{fontSize:9,color:"#334155",letterSpacing:"0.1em",marginBottom:4}}>{l}</div>
                            <div style={{fontSize:22,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{fd(p)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{background:"rgba(0,0,0,0.35)",borderRadius:10,padding:14,marginBottom:14}}>
                      <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:10}}>PRICE LADDER</div>
                      {[{l:"Profit Target",p:a.sellSentiment?.profitTarget,c:"#00d4a0"},{l:"Sell Trigger",p:a.sellSentiment?.sellTriggerPrice,c:"#f97316"},{l:"◄ Current Price",p:s.price,c:"#fbbf24",now:true},{l:"Stop-Loss",p:a.sellSentiment?.stopLoss,c:"#ff4d6d"}].filter(x=>x.p).sort((a,b)=>b.p-a.p).map(({l,p,c,now})=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                          <div style={{width:3,height:22,background:c,borderRadius:2,boxShadow:`0 0 6px ${c}`,flexShrink:0}}/>
                          <span style={{fontSize:11,color:"#334155",width:140,flexShrink:0}}>{l}</span>
                          <span style={{fontSize:16,color:c,fontWeight:now?700:400,fontVariantNumeric:"tabular-nums"}}>{fd(p)}</span>
                          {now&&<span style={{fontSize:9,background:"#fbbf2215",border:"1px solid #fbbf2440",color:"#fbbf24",borderRadius:4,padding:"1px 7px"}}>LIVE</span>}
                        </div>
                      ))}
                    </div>
                    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:8,padding:14,marginBottom:14,borderLeft:`3px solid ${SCLR[a.sellSentiment?.sellSignal]}`}}><div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:8}}>SELL RATIONALE</div><p style={{fontSize:13,color:"#cbd5e1",lineHeight:1.75}}>{a.sellSentiment?.sellRationale}</p></div>
                    <div style={{fontSize:9,color:"#334155",letterSpacing:"0.12em",marginBottom:10}}>▼ RED FLAGS</div>
                    {a.sellSentiment?.redFlags?.map((f,i)=><div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}><span style={{color:"#ff4d6d"}}>▼</span><span style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>{f}</span></div>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{padding:"7px 20px",fontSize:9,color:"#1e293b",letterSpacing:"0.08em",borderTop:"1px solid rgba(255,255,255,0.04)",background:"rgba(6,8,16,0.9)",flexShrink:0,fontFamily:"monospace"}}>
            ⚠ Prices sourced Feb 19–20 2026: NVDA $187.71 · MSFT $403.02 · LLY $1,021.45 · TSLA $417.32 · ASML $1,440.00 · CRWD $429.75 · For informational purposes only. Not financial advice.
          </div>
        </div>
      </div>
    </div>
  );
}
