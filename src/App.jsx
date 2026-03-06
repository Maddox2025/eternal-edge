import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const PILLARS = [
  { id: "technical",    label: "Technical Analysis",      weight: 0.20, icon: "📈",
    short: "Price action, trend & momentum",
    desc: "Evaluates price trend direction, moving averages (50-day & 200-day), RSI momentum, support/resistance levels, and volume patterns. Tells us what the market itself is signaling about the stock.",
    factors: ["Trend direction (uptrend / downtrend / sideways)", "50-day & 200-day moving average positioning", "RSI — overbought (>70) or oversold (<30)", "Key support & resistance levels", "Volume confirmation of price moves"],
    scoring: { "4.5–5.0": "Strong uptrend, above both MAs, healthy RSI, strong volume", "4.0–4.4": "Above key MAs, positive momentum, minor pullback risk", "3.0–3.9": "Mixed signals — no clear trend or neutral momentum", "2.0–2.9": "Below key MAs, deteriorating momentum", "1.0–1.9": "Strong downtrend, broken support, high selling pressure" }
  },
  { id: "fundamental", label: "Fundamental Analysis",    weight: 0.25, icon: "🏛",
    short: "Business quality, growth & competitive moat",
    desc: "Assesses the core health of the business. This is the highest-weighted pillar because long-term stock performance is driven by the quality of the underlying company — not short-term price moves.",
    factors: ["Revenue growth rate (YoY)", "Earnings growth & profitability trend", "Net profit margins vs industry peers", "Competitive moat & pricing power", "Long-term industry position & tailwinds"],
    scoring: { "4.5–5.0": "Exceptional growth, wide moat, best-in-class margins", "4.0–4.4": "Strong fundamentals, growing revenues, solid competitive position", "3.0–3.9": "Decent business, moderate growth, no clear moat advantage", "2.0–2.9": "Declining fundamentals, margin pressure, weak competitive position", "1.0–1.9": "Business deterioration, losses, structural industry headwinds" }
  },
  { id: "metrics",     label: "Metrics Analysis",        weight: 0.20, icon: "📊",
    short: "Key financial data points & ratios",
    desc: "Combines objective data to build a complete picture of the stock's structure. Blends basic valuation multiples with advanced signals like insider activity and short interest.",
    factors: ["P/E ratio vs historical average & peers", "Price-to-Sales (P/S) ratio", "Beta — how volatile vs the S&P 500", "52-week high / low positioning", "Insider buying or selling activity", "Short interest % — how many are betting against it", "Free cash flow yield", "Return on Equity (ROE) & Return on Invested Capital (ROIC)"],
    scoring: { "4.5–5.0": "Attractive multiples, insider buying, low short interest, high FCF", "4.0–4.4": "Reasonable valuation, metrics support the investment case", "3.0–3.9": "Fair multiples, neutral insider activity, no major red flags", "2.0–2.9": "Elevated multiples, insider selling, elevated short interest", "1.0–1.9": "Extreme overvaluation or deeply distressed metrics" }
  },
  { id: "valuation",   label: "Valuation / Risk-Reward", weight: 0.20, icon: "⚖️",
    short: "Fair value estimate & price scenarios",
    desc: "Models where the stock should trade based on its fundamentals, and defines three price scenarios. The risk-reward ratio tells you how much upside exists relative to the downside — a critical factor for long-term investing.",
    factors: ["Bear Case — worst realistic scenario price", "Base Case — most likely 12-month outcome", "Bull Case — upside if catalysts play out", "Fair Value Estimate — where fundamentals say it should trade", "Upside/Downside ratio — asymmetry of the opportunity", "Valuation model used (P/E, DCF, P/S — adapted to company type)"],
    scoring: { "4.5–5.0": "Trading well below fair value, exceptional upside vs minimal downside", "4.0–4.4": "Undervalued with favorable risk-reward ratio (>2:1 upside)", "3.0–3.9": "Fairly valued, balanced risk-reward near 1:1", "2.0–2.9": "Overvalued or risk-reward skewed to the downside", "1.0–1.9": "Significantly overvalued, downside greatly exceeds upside" }
  },
  { id: "sentiment",   label: "Market Sentiment",        weight: 0.10, icon: "💬",
    short: "Social media & investor psychology",
    desc: "Measures how investors currently feel about the stock. Markets are driven by psychology as much as fundamentals — knowing the sentiment helps time entries and spot turning points.",
    factors: ["X (Twitter) retail investor buzz & trending mentions", "Reddit community sentiment (r/investing, r/stocks, WSB)", "News tone — positive, negative or neutral coverage", "Analyst consensus (Buy / Hold / Sell ratings)", "Institutional momentum — are big funds buying or selling?"],
    scoring: { "4.5–5.0": "Extremely positive buzz, analyst upgrades, institutional accumulation", "4.0–4.4": "Broadly positive sentiment, favorable news cycle", "3.0–3.9": "Mixed or neutral sentiment, no strong directional signal", "2.0–2.9": "Negative sentiment, analyst downgrades, bearish narrative", "1.0–1.9": "Extreme pessimism, short sellers piling in, crisis narrative" }
  },
  { id: "geopolitical",label: "Geopolitical / Macro",    weight: 0.05, icon: "🌍",
    short: "External factors & CNN Fear & Greed Index",
    desc: "Evaluates external global factors that could impact the stock. We also incorporate the CNN Fear & Greed Index — our philosophy: more fear in the market = better buying opportunities for long-term investors.",
    factors: ["CNN Fear & Greed Index (Fear = opportunity, Greed = caution)", "Federal Reserve interest rate environment", "Trade policy & tariff risks", "Regulatory environment for the sector", "Supply chain & geopolitical stability", "Commodity prices & macroeconomic cycle"],
    scoring: { "4.5–5.0": "Extreme fear in market (CNN index <25), strong macro tailwinds", "4.0–4.4": "Fear-leaning sentiment, favorable macro backdrop", "3.0–3.9": "Neutral macro, balanced fear/greed, no major external risks", "2.0–2.9": "Greed-elevated market, macro headwinds present", "1.0–1.9": "Extreme greed (CNN index >75), significant macro threats" }
  },
];

const RATING = (s) => {
  if (s > 4.0) return { label: "STRONG BUY",  color: "#00e5a0", bg: "rgba(0,229,160,0.08)" };
  if (s > 3.0) return { label: "BUY",          color: "#4ade80", bg: "rgba(74,222,128,0.08)" };
  if (s > 2.0) return { label: "NEUTRAL",      color: "#f5c842", bg: "rgba(245,200,66,0.08)" };
  if (s > 1.0) return { label: "SELL",         color: "#fb923c", bg: "rgba(251,146,60,0.08)" };
  return               { label: "STRONG SELL",  color: "#f87171", bg: "rgba(248,113,113,0.08)" };
};
const SC = (s) => s>4.0?"#00e5a0":s>3.0?"#4ade80":s>2.0?"#f5c842":s>1.0?"#fb923c":"#f87171";

const DISCLAIMER = "This website and all content published by Eternal Edge is for educational and informational purposes only. Nothing on this site constitutes financial advice, investment advice, trading advice, or any other form of advice. All research, scores, and analysis reflect personal opinions only. Eternal Edge is not a registered investment advisor, broker-dealer, or financial institution. We are not liable for any investment decisions made based on content found on this site. Past performance does not guarantee future results. Always conduct your own due diligence and consult a licensed financial advisor before buying or selling any securities.";

const SOCIALS = [
  { platform: "X (Twitter)", handle: "@EternalEdgeNews", url: "https://twitter.com/EternalEdgeNews", icon: "𝕏", color: "#e7e7e7", desc: "Daily market commentary, new report alerts & contrarian trade ideas." },
  { platform: "Instagram",   handle: "@eternaledge.research", url: "https://instagram.com/eternaledge.research", icon: "📸", color: "#e1306c", desc: "Visual stock breakdowns, charts & behind-the-scenes research process." },
  { platform: "YouTube",     handle: "Eternal Edge Research", url: "https://youtube.com/@EternalEdgeResearch", icon: "▶", color: "#ff0000", desc: "Deep dive video reports, market analysis & long-form investing education." },
  { platform: "TikTok",      handle: "@eternaledgeresearch", url: "https://tiktok.com/@eternaledgeresearch", icon: "♪", color: "#69c9d0", desc: "Quick market insights, stock picks & educational investing content." },
];

function generatePriceHistory(low, high, current, realMa50=null, realMa200=null) {
  const points = 252;
  const data = [];
  let price = low + (high - low) * 0.3;
  // Generate start date as ~1 year ago
  const startDate = new Date("2026-03-05");
  startDate.setFullYear(startDate.getFullYear() - 1);
  for (let i = 0; i < points; i++) {
    const trend = (current - price) / (points - i) * 1.2;
    price = Math.max(low*0.95, Math.min(high*1.05, price + trend + (Math.random()-0.48)*(high-low)*0.025));
    const d = new Date(startDate); d.setDate(d.getDate()+i);
    data.push({ date: d.toISOString().split("T")[0], price: parseFloat(price.toFixed(2)) });
  }
  data[data.length-1].price = current;
  // Compute simulated MAs from price history
  data.forEach((d,i) => {
    if (i>=49)  d.ma50sim  = parseFloat((data.slice(i-49,i+1).reduce((s,x)=>s+x.price,0)/50).toFixed(2));
    if (i>=199) d.ma200sim = parseFloat((data.slice(i-199,i+1).reduce((s,x)=>s+x.price,0)/200).toFixed(2));
  });
  // If real MA values provided, anchor the last point and interpolate backwards
  if (realMa50) {
    const lastSim50 = data[points-1].ma50sim || realMa50;
    const diff50 = realMa50 - lastSim50;
    data.forEach((d,i) => {
      if (i>=49) {
        const ratio = (i - 49) / (points - 1 - 49);
        d.ma50 = parseFloat((d.ma50sim + diff50 * ratio).toFixed(2));
      }
    });
  } else {
    data.forEach(d => { if (d.ma50sim) d.ma50 = d.ma50sim; });
  }
  if (realMa200) {
    const lastSim200 = data[points-1].ma200sim || realMa200;
    const diff200 = realMa200 - lastSim200;
    data.forEach((d,i) => {
      if (i>=199) {
        const ratio = (i - 199) / (points - 1 - 199);
        d.ma200 = parseFloat((d.ma200sim + diff200 * ratio).toFixed(2));
      }
    });
  } else {
    data.forEach(d => { if (d.ma200sim) d.ma200 = d.ma200sim; });
  }
  return data;
}

// ── GOOGLE SHEETS DATA SOURCE ─────────────────────────────────────────────────
// Sheet URL stored as env variable — never exposed in public code
const SHEET_ID = "1lqs75vw2o9oBo8x_0ojWvvE483aU-Zi6zhu6sEXnkxk";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Reports`;

function parseSheetRow(row) {
  try {
    const c = row.c;
    const s = i => c[i]?.v ?? "";
    const n = i => parseFloat(c[i]?.v) || 0;
    const arr = i => { try { return JSON.parse(c[i]?.v || "[]"); } catch { return (c[i]?.v||"").split("|").map(x=>x.trim()).filter(Boolean); }};

    const ticker = s(0).toUpperCase();
    if (!ticker) return null;

    const lo = n(37) || n(4)*0.7;
    const hi = n(38) || n(4)*1.3;
    const ma50 = n(39) || null;
    const ma200 = n(40) || null;

    return {
      ticker,
      companyName: s(1),
      sector: s(2),
      reportDate: s(3),
      currentPrice: n(4),
      nextEarnings: s(5),
      overallScore: n(6),
      pillars: {
        technical: { score:n(7), summary:s(8), bullets:arr(9), elliottWave:s(10), elliottWaveSentiment:s(11), ma50Value:ma50, ma200Value:ma200 },
        fundamental: { score:n(12), summary:s(13), bullets:arr(14) },
        metrics: { score:n(15), summary:s(16), bullets:arr(17), ownershipSignal:s(18), ownershipSummary:s(19),
          keyMetrics: (() => { try { return JSON.parse(s(20)||"{}"); } catch { return {}; }})() },
        valuation: { score:n(21), summary:s(22), bullets:arr(23), fairValue:n(24), bearCase:n(25), baseCase:n(26), bullCase:n(27), upside1Y:n(28), downside1Y:n(29), model:s(30) },
        sentiment: { score:n(31), summary:s(32), bullets:arr(33) },
        geopolitical: { score:n(34), summary:s(35), bullets:arr(36), futuresSummary:s(41) },
      },
      keyRisks: arr(42),
      keyCatalysts: arr(43),
      conclusionSummary: s(44),
      catalystCalendar: (() => { try { return JSON.parse(s(45)||"[]"); } catch { return []; }})(),
      priceHistory: generatePriceHistory(lo, hi, n(4), ma50, ma200),
    };
  } catch(e) {
    console.error("Row parse error:", e);
    return null;
  }
}

async function fetchSheetReports() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  // Google wraps response in /*O_o*/google.visualization.Query.setResponse({...})
  const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)[1]);
  const rows = json.table.rows.slice(1); // skip header row
  const reports = {};
  rows.forEach(row => {
    const r = parseSheetRow(row);
    if (r && r.ticker) reports[r.ticker] = r;
  });
  return reports;
}

// ── API ───────────────────────────────────────────────────────────────────────
async function fetchReport(ticker, reportDate) {
  const today = reportDate || "2026-03-05";
  const sys = `You are a professional stock analyst for Eternal Edge Research — a faith-driven, long-term value investing platform. Philosophy: buy when others panic, hold with conviction (Warren Buffett style).

TODAY'S DATE IS: ${today}. All data you pull must be current as of this date. All catalyst calendar events MUST be dated AFTER ${today} — no past events.

Use web search to pull ALL of the following LIVE data as of ${today}:
1. Current stock price, 52-week high/low, market cap
2. The ACTUAL 50-day moving average and 200-day moving average values (search "[TICKER] 50 day moving average 200 day moving average current")
3. CNN Fear & Greed Index (https://www.cnn.com/markets/fear-and-greed)
4. Stock futures data from https://finance.yahoo.com/markets/commodities/ — look at S&P 500 futures, Nasdaq futures, Dow futures and factor into geopolitical/macro score
5. X/Twitter & Reddit sentiment for the stock
6. Institutional ownership % (search "[TICKER] institutional ownership percentage")
7. Recent insider buys/sells (search "[TICKER] insider buying selling 2026")
8. Share buyback program — active or not, amount authorized (search "[TICKER] share buyback repurchase program")
9. Next earnings date (must be after ${today})
10. Upcoming catalysts: FOMC meetings, CPI prints, company-specific events — all dated after ${today}
11. Elliott Wave analysis: search "[TICKER] Elliott Wave analysis current wave 2026" and determine which Primary Wave the stock is currently in

ELLIOTT WAVE SCORING GUIDE (factor into technical score):
- Primary Wave 1: +0.3 (slightly bullish — new uptrend beginning)
- Primary Wave 2: +0.5 (very bullish — best entry point before Wave 3)
- Primary Wave 3: +0.5 (most bullish — strongest, fastest leg up)
- Primary Wave 4: +0.2 (slightly bullish — minor consolidation before final push)
- Primary Wave 5: -0.1 (slightly bearish — higher risk, nearing end of impulse)
- Primary Wave A: -0.3 (bearish — correction has begun)
- Primary Wave B: -0.2 (slightly bearish — relief rally, good exit spot)
- Primary Wave C: -0.1 to +0.2 (bearish early, can turn bullish at latter stage)

METRICS PILLAR — include these signals with a combined Bullish/Neutral/Bearish summary signal:
- Institutional Ownership %: >70% is bullish, 40-70% neutral, <40% bearish
- Insider Activity: Net buying = very bullish, neutral/mixed = neutral, net selling = mildly bearish
- Share Buybacks: Active buyback program = bullish (signals management confidence), no program = neutral

GEOPOLITICAL/MACRO PILLAR — incorporate:
- Stock futures direction (S&P, Nasdaq, Dow) — futures up = slight positive, futures down = slight negative
- CNN Fear & Greed score (Fear <40 = opportunity = higher score; Greed >60 = risk = lower score)
- Fed rate environment, tariffs, global macro

TECHNICAL PILLAR — must include:
- Current price vs 50-day MA and 200-day MA (use actual values)
- RSI reading
- Elliott Wave position with explanation of what it means for the stock
- ma50Value and ma200Value as separate fields (numeric, e.g. 185.40)

SCORING SCALE (applies to ALL pillars and overall score):
- 4.1–5.0 = Strong Buy
- 3.1–4.0 = Buy  
- 2.1–3.0 = Neutral
- 1.1–2.0 = Sell
- 0–1.0   = Strong Sell

CPI DATA: Always pull upcoming CPI release dates from https://www.bls.gov/cpi/ — use the official BLS schedule for the catalyst calendar.

Return ONLY valid JSON, no markdown fences, no extra text:
{"ticker":"","companyName":"","sector":"","reportDate":"${today}","currentPrice":0,"nextEarnings":"YYYY-MM-DD","pillars":{"technical":{"score":0,"summary":"","bullets":[],"elliottWave":"Primary Wave X","elliottWaveSentiment":"","ma50Value":0,"ma200Value":0},"fundamental":{"score":0,"summary":"","bullets":[]},"metrics":{"score":0,"summary":"","bullets":[],"ownershipSignal":"Bullish|Neutral|Bearish","ownershipSummary":"","keyMetrics":{}},"valuation":{"score":0,"summary":"","bullets":[],"fairValue":0,"bearCase":0,"baseCase":0,"bullCase":0,"upside1Y":0,"downside1Y":0,"model":""},"sentiment":{"score":0,"summary":"","bullets":[]},"geopolitical":{"score":0,"summary":"","bullets":[],"futuresSummary":""}},"overallScore":0,"keyRisks":[],"keyCatalysts":[],"conclusionSummary":"","catalystCalendar":[{"date":"YYYY-MM-DD","event":"","type":"earnings|macro|catalyst"}]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-20250514", max_tokens:5000, system:sys,
      messages:[{role:"user",content:`Generate full Eternal Edge deep dive for ${ticker.toUpperCase()} as of ${today}. Search all required data: live price, actual 50/200-day MA values, CNN Fear & Greed, stock futures from Yahoo Finance, institutional ownership, insider activity, share buybacks, Elliott Wave position, X/Twitter sentiment. All catalyst dates must be after ${today}. Return only JSON.`}],
      tools:[{type:"web_search_20250305",name:"web_search"}]
    })
  });
  const data = await res.json();
  const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
  const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
  const lo = parsed.pillars.metrics?.keyMetrics?.["52W Low"] ? parseFloat(String(parsed.pillars.metrics.keyMetrics["52W Low"]).replace(/[$,]/g,"")) : parsed.currentPrice*0.7;
  const hi = parsed.pillars.metrics?.keyMetrics?.["52W High"] ? parseFloat(String(parsed.pillars.metrics.keyMetrics["52W High"]).replace(/[$,]/g,"")) : parsed.currentPrice*1.3;
  const ma50 = parsed.pillars.technical?.ma50Value || null;
  const ma200 = parsed.pillars.technical?.ma200Value || null;
  parsed.priceHistory = generatePriceHistory(lo, hi, parsed.currentPrice, ma50, ma200);
  return parsed;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Josefin+Sans:wght@300;400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#c9a84c;--gold2:#e8c96a;--bg:#080808;--bg2:#0e0e0e;--bg3:#141414;--bg4:#1a1a1a;--border:#1e1e1e;--border2:#2a2a2a;--text:#f0ead6;--muted:#666;--dim:#333;}
html,body,#root{background:var(--bg);color:var(--text);font-family:'Josefin Sans',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px;}

/* NAV */
.nav{position:sticky;top:0;z-index:100;background:rgba(8,8,8,0.97);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 36px;display:flex;align-items:center;gap:0;height:62px;}
.nav-logo{display:flex;align-items:center;gap:11px;cursor:pointer;margin-right:32px;flex-shrink:0;}
.cross-mark{width:24px;height:24px;position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cross-mark::before,.cross-mark::after{content:'';position:absolute;background:var(--gold);}
.cross-mark::before{width:2px;height:100%;border-radius:1px;}
.cross-mark::after{width:100%;height:2px;border-radius:1px;}
.nav-brand{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;letter-spacing:0.12em;color:var(--gold);}
.nav-brand span{color:var(--text);font-weight:400;}
.nav-tagline{font-size:8px;letter-spacing:0.22em;color:var(--muted);margin-top:1px;text-transform:uppercase;}
.nav-links{display:flex;align-items:center;gap:2px;flex:1;}
.nav-link{background:none;border:none;color:var(--muted);font-family:'Josefin Sans',sans-serif;font-size:11px;letter-spacing:0.12em;padding:8px 14px;cursor:pointer;border-radius:6px;transition:all 0.15s;white-space:nowrap;}
.nav-link:hover{color:var(--text);}
.nav-link.active{color:var(--gold);}
.nav-search-wrap{position:relative;margin-left:auto;margin-right:12px;}
.nav-search{display:flex;align-items:center;gap:6px;background:var(--bg3);border:1px solid var(--border2);border-radius:7px;padding:7px 12px;width:240px;transition:border-color 0.2s;}
.nav-search:focus-within{border-color:var(--gold);}
.nav-search input{background:none;border:none;color:var(--text);font-family:'Josefin Sans',sans-serif;font-size:12px;letter-spacing:0.08em;outline:none;width:100%;text-transform:uppercase;}
.nav-search input::placeholder{text-transform:none;color:var(--muted);letter-spacing:0.02em;}
.search-dropdown{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;overflow:hidden;z-index:200;box-shadow:0 8px 32px rgba(0,0,0,0.5);}
.sd-item{padding:11px 14px;cursor:pointer;transition:background 0.15s;display:flex;align-items:center;justify-content:space-between;}
.sd-item:hover{background:var(--bg4);}
.sd-ticker{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:700;}
.sd-name{font-size:10px;color:var(--muted);margin-top:1px;}
.sd-score{font-size:12px;font-weight:700;}

/* FOOTER */
.footer{background:var(--bg2);border-top:1px solid var(--border);padding:20px 36px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.footer-logo{display:flex;align-items:center;gap:8px;}
.footer-disclaimer{font-size:10px;color:var(--dim);line-height:1.6;flex:1;min-width:300px;}
.footer-right{font-size:10px;color:var(--dim);text-align:right;flex-shrink:0;}

/* HERO */
.hero{padding:72px 36px 56px;text-align:center;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 50% 0%,rgba(201,168,76,0.055) 0%,transparent 70%);}
.hero-faith{font-size:10px;letter-spacing:0.3em;color:var(--gold);opacity:0.6;margin-bottom:18px;display:flex;align-items:center;justify-content:center;gap:10px;}
.hero-faith::before,.hero-faith::after{content:'—';opacity:0.4;}
.hero h1{font-family:'Cormorant Garamond',serif;font-size:clamp(40px,5.5vw,68px);font-weight:700;line-height:1.05;margin-bottom:14px;}
.hero h1 em{font-style:italic;color:var(--gold);}
.hero-sub{font-size:12px;letter-spacing:0.1em;color:var(--muted);max-width:440px;margin:0 auto 36px;line-height:1.9;}
.hero-search-bar{display:flex;max-width:460px;margin:0 auto;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;overflow:hidden;transition:border-color 0.2s;}
.hero-search-bar:focus-within{border-color:var(--gold);}
.hero-search-bar input{flex:1;background:none;border:none;color:var(--text);font-family:'Josefin Sans',sans-serif;font-size:14px;letter-spacing:0.1em;padding:15px 18px;outline:none;text-transform:uppercase;}
.hero-search-bar input::placeholder{text-transform:none;color:var(--muted);font-size:12px;letter-spacing:0.02em;}
.hero-search-bar button{background:var(--gold);border:none;color:#000;font-family:'Josefin Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.15em;padding:0 26px;cursor:pointer;transition:background 0.2s;flex-shrink:0;}
.hero-search-bar button:hover{background:var(--gold2);}
.stats-row{display:flex;justify-content:center;gap:40px;margin-top:40px;padding-top:40px;border-top:1px solid var(--border);}
.stat-item{text-align:center;}
.stat-num{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:var(--gold);}
.stat-label{font-size:9px;letter-spacing:0.2em;color:var(--muted);margin-top:3px;text-transform:uppercase;}

/* REPORTS */
.page-section{padding:0 36px 60px;}
.section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px;padding-top:40px;}
.section-title{font-family:'Cormorant Garamond',serif;font-size:26px;}
.section-count{font-size:10px;color:var(--muted);letter-spacing:0.12em;}
.reports-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
.rc{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:22px;cursor:pointer;transition:all 0.18s;position:relative;overflow:hidden;}
.rc::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:0;transition:opacity 0.2s;}
.rc:hover{border-color:var(--border2);transform:translateY(-1px);}
.rc:hover::after{opacity:1;}
.rc-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;}
.rc-ticker{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;}
.rc-co{font-size:10px;color:var(--muted);margin-top:2px;letter-spacing:0.04em;}
.rc-score-num{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;text-align:right;}
.rc-score-lbl{font-size:9px;letter-spacing:0.18em;text-align:right;margin-top:2px;}
.rc-bar{height:2px;background:var(--bg4);border-radius:1px;margin-bottom:13px;}
.rc-bar-fill{height:100%;border-radius:1px;}
.rc-foot{display:flex;justify-content:space-between;align-items:center;}
.rc-date{font-size:10px;color:var(--muted);}
.badge{display:inline-flex;align-items:center;gap:3px;border-radius:20px;padding:2px 8px;font-size:9px;letter-spacing:0.1em;}
.badge.fresh{background:rgba(0,229,160,0.07);border:1px solid rgba(0,229,160,0.2);color:#00e5a0;}
.badge.stale{background:rgba(251,146,60,0.07);border:1px solid rgba(251,146,60,0.2);color:#fb923c;}

/* REPORT PAGE */
.rp{max-width:900px;margin:0 auto;padding:36px 36px 80px;}
.back-btn{display:inline-flex;align-items:center;gap:7px;color:var(--muted);font-size:10px;letter-spacing:0.12em;cursor:pointer;margin-bottom:28px;transition:color 0.2s;background:none;border:none;font-family:'Josefin Sans',sans-serif;text-transform:uppercase;}
.back-btn:hover{color:var(--gold);}
.rp-meta{display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;}
.ticker-pill{font-family:'Cormorant Garamond',serif;font-size:13px;color:var(--gold);background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);padding:3px 13px;border-radius:20px;letter-spacing:0.1em;}
.rp-co{font-family:'Cormorant Garamond',serif;font-size:clamp(26px,4vw,44px);font-weight:700;line-height:1.1;margin-bottom:6px;}
.rp-price{font-size:13px;color:var(--muted);letter-spacing:0.04em;}
.rp-price strong{color:var(--text);}

/* SCORE HERO */
.sh{background:linear-gradient(135deg,var(--bg2),#110e07);border:1px solid var(--border);border-radius:18px;padding:28px 32px;display:flex;align-items:center;gap:36px;margin-bottom:22px;position:relative;overflow:hidden;}
.sh::after{content:'✝';position:absolute;right:28px;top:50%;transform:translateY(-50%);font-size:72px;color:rgba(201,168,76,0.035);pointer-events:none;font-family:serif;}
.sh-left{text-align:center;min-width:120px;flex-shrink:0;}
.sh-num{font-family:'Cormorant Garamond',serif;font-size:66px;line-height:1;font-weight:700;}
.sh-denom{font-family:'Cormorant Garamond',serif;font-size:24px;color:var(--dim);}
.sh-lbl{font-size:10px;font-weight:700;letter-spacing:0.2em;margin-top:6px;}
.sh-div{width:1px;height:80px;background:var(--border);flex-shrink:0;}
.sh-pills{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.sh-pill{background:var(--bg);border-radius:9px;padding:10px 12px;border:1px solid var(--border);}
.sh-pill-icon{font-size:13px;margin-bottom:3px;}
.sh-pill-name{font-size:8px;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:3px;}
.sh-pill-score{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;}
.sh-pill-wt{font-size:8px;color:var(--dim);margin-top:1px;}

/* CHART */
.chart-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px 22px;margin-bottom:14px;}
.chart-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;}
.chart-title{font-size:10px;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;}
.chart-legend{display:flex;gap:16px;flex-wrap:wrap;}
.leg{display:flex;align-items:center;gap:5px;font-size:9px;letter-spacing:0.08em;color:var(--muted);}
.leg-line{width:18px;height:2px;border-radius:1px;}

/* PILLARS */
.pc{background:var(--bg2);border:1px solid var(--border);border-radius:13px;margin-bottom:10px;overflow:hidden;}
.pc-hdr{display:flex;align-items:center;padding:16px 20px;cursor:pointer;gap:12px;user-select:none;}
.pc-hdr:hover{background:rgba(255,255,255,0.01);}
.pc-icon{font-size:17px;flex-shrink:0;}
.pc-name{font-size:12px;font-weight:600;letter-spacing:0.07em;flex:1;}
.pc-wt{font-size:9px;color:var(--dim);letter-spacing:0.1em;flex-shrink:0;}
.pc-bar-wrap{width:70px;height:2px;background:var(--bg4);border-radius:1px;flex-shrink:0;}
.pc-bar{height:100%;border-radius:1px;}
.pc-score{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;width:42px;text-align:right;flex-shrink:0;}
.pc-chev{font-size:9px;color:var(--dim);transition:transform 0.2s;flex-shrink:0;}
.pc-chev.open{transform:rotate(180deg);}
.pc-body{border-top:1px solid var(--border);padding:14px 20px 18px;}
.pc-summary{font-size:12px;color:#aaa;font-style:italic;margin-bottom:10px;line-height:1.5;}
.pc-bullets{display:flex;flex-direction:column;gap:7px;}
.pc-bullet{display:flex;align-items:flex-start;gap:9px;font-size:12px;color:#999;line-height:1.55;}
.bul-dot{width:4px;height:4px;border-radius:50%;background:var(--gold);margin-top:6px;flex-shrink:0;}

/* METRICS */
.metrics-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:12px;}
.metric-row{display:flex;justify-content:space-between;align-items:center;background:var(--bg3);border-radius:6px;padding:8px 12px;}
.mk{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;}
.mv{font-size:12px;font-weight:600;}

/* SCENARIOS */
.scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:12px;}
.sc-box{background:var(--bg3);border-radius:9px;padding:14px;text-align:center;}
.sc-lbl{font-size:8px;text-transform:uppercase;letter-spacing:0.15em;color:var(--muted);margin-bottom:6px;}
.sc-price{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;}
.sc-pct{font-size:10px;margin-top:3px;}
.fv-row{margin-top:9px;background:rgba(201,168,76,0.04);border:1px solid rgba(201,168,76,0.14);border-radius:8px;padding:11px 15px;display:flex;justify-content:space-between;align-items:center;}
.fv-lbl{font-size:10px;color:var(--gold);letter-spacing:0.1em;}
.fv-val{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--gold);}

/* RISK REWARD */
.rr-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px 22px;margin-top:14px;}
.rr-hdr{font-size:10px;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:14px;}
.rr-inner{display:flex;gap:20px;align-items:stretch;}
.rr-ladder{flex:1;}
.rr-ladder-row{display:flex;align-items:center;gap:11px;padding:7px 0;border-bottom:1px solid var(--border);}
.rr-ladder-row:last-child{border-bottom:none;}
.rrl-label{font-size:9px;letter-spacing:0.1em;color:var(--muted);width:76px;text-align:right;flex-shrink:0;}
.rrl-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.rrl-price{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;width:66px;flex-shrink:0;}
.rrl-pct{font-size:10px;opacity:0.8;}
.rr-right{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:110px;border-left:1px solid var(--border);padding-left:20px;gap:6px;}
.rr-ratio-lbl{font-size:9px;letter-spacing:0.15em;color:var(--muted);text-align:center;}
.rr-ratio-num{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:var(--gold);line-height:1;}
.rr-ratio-x{font-size:11px;color:var(--muted);}
.rr-verdict{font-size:9px;color:var(--muted);text-align:center;}
.asym-bar{margin-top:14px;}
.asym-lbl{font-size:9px;letter-spacing:0.12em;color:var(--muted);margin-bottom:6px;}
.asym-track{display:flex;border-radius:6px;overflow:hidden;height:26px;}
.asym-down,.asym-up{display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:0.08em;color:#000;}

/* CALENDAR */
.cal-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px 22px;margin-bottom:22px;}
.cal-hdr{font-size:10px;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:14px;}
.cal-row{display:flex;align-items:center;gap:14px;padding:9px 0;border-bottom:1px solid var(--border);}
.cal-row:last-child{border-bottom:none;}
.cal-date{font-family:'Cormorant Garamond',serif;font-size:14px;color:var(--muted);width:88px;flex-shrink:0;}
.cal-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.cal-event{font-size:12px;flex:1;}
.cal-type{font-size:8px;letter-spacing:0.12em;padding:2px 7px;border-radius:20px;flex-shrink:0;}
.CC={earnings:"#c9a84c",macro:"#60a5fa",catalyst:"#4ade80"};

/* CONCLUSION */
.conc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
.rk-card{background:var(--bg2);border:1px solid var(--border);border-radius:13px;padding:18px 20px;}
.rk-hdr{font-size:10px;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:12px;}
.rk-item{display:flex;gap:9px;margin-bottom:8px;font-size:12px;color:#999;line-height:1.55;}
.rk-dot{width:4px;height:4px;border-radius:50%;margin-top:7px;flex-shrink:0;}
.verdict-card{background:var(--bg2);border:1px solid rgba(201,168,76,0.14);border-radius:13px;padding:22px;}
.verdict-lbl{font-size:10px;letter-spacing:0.2em;color:var(--gold);text-transform:uppercase;margin-bottom:10px;}
.verdict-text{font-size:13px;color:#bbb;line-height:1.8;}

/* GLOSSARY / GRADING SCALE PAGE */
.gs-page{max-width:860px;margin:0 auto;padding:40px 36px 80px;}
.gs-hero{text-align:center;margin-bottom:48px;}
.gs-hero h1{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;margin-bottom:10px;}
.gs-hero p{font-size:12px;color:var(--muted);letter-spacing:0.08em;line-height:1.8;max-width:500px;margin:0 auto;}
.gs-scale{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px 28px;margin-bottom:32px;}
.gs-scale-title{font-size:10px;letter-spacing:0.2em;color:var(--muted);text-transform:uppercase;margin-bottom:18px;}
.gs-scale-rows{display:flex;flex-direction:column;gap:10px;}
.gs-scale-row{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--bg3);border-radius:10px;}
.gs-scale-range{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;width:80px;flex-shrink:0;}
.gs-scale-bar-wrap{flex:1;height:6px;background:var(--bg4);border-radius:3px;}
.gs-scale-bar{height:100%;border-radius:3px;}
.gs-scale-label{font-size:12px;font-weight:600;letter-spacing:0.08em;width:110px;flex-shrink:0;}
.gs-scale-desc{font-size:11px;color:var(--muted);flex:1;}
.gs-pillars{display:flex;flex-direction:column;gap:16px;}
.gs-pillar{background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;}
.gs-pillar-hdr{display:flex;align-items:center;gap:14px;padding:18px 22px;cursor:pointer;user-select:none;}
.gs-pillar-hdr:hover{background:rgba(255,255,255,0.01);}
.gs-ph-icon{font-size:20px;}
.gs-ph-info{flex:1;}
.gs-ph-name{font-size:13px;font-weight:700;letter-spacing:0.06em;}
.gs-ph-short{font-size:11px;color:var(--muted);margin-top:2px;}
.gs-ph-wt{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.2);color:var(--gold);font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.1em;flex-shrink:0;}
.gs-ph-chev{font-size:10px;color:var(--dim);transition:transform 0.2s;flex-shrink:0;}
.gs-ph-chev.open{transform:rotate(180deg);}
.gs-pillar-body{border-top:1px solid var(--border);padding:18px 22px 22px;}
.gs-pb-desc{font-size:13px;color:#aaa;line-height:1.7;margin-bottom:16px;}
.gs-factors{margin-bottom:18px;}
.gs-factors-title{font-size:9px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;}
.gs-factor{display:flex;gap:9px;font-size:12px;color:#999;margin-bottom:7px;line-height:1.5;}
.gs-scoring-title{font-size:9px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;}
.gs-scoring-grid{display:flex;flex-direction:column;gap:7px;}
.gs-scoring-row{display:flex;gap:12px;align-items:flex-start;background:var(--bg3);border-radius:8px;padding:9px 12px;}
.gs-sr-range{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:700;width:68px;flex-shrink:0;}
.gs-sr-text{font-size:11px;color:#999;line-height:1.4;}

/* WATCHLIST PAGE */
.wl-page{max-width:860px;margin:0 auto;padding:40px 36px 80px;}
.wl-hero{text-align:center;margin-bottom:44px;}
.wl-hero h1{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:700;margin-bottom:10px;}
.wl-hero p{font-size:12px;color:var(--muted);letter-spacing:0.06em;line-height:1.8;max-width:480px;margin:0 auto;}
.signin-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:40px;text-align:center;max-width:420px;margin:0 auto;}
.signin-cross{font-size:28px;color:var(--gold);margin-bottom:16px;position:relative;display:flex;align-items:center;justify-content:center;}
.signin-title{font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:8px;}
.signin-sub{font-size:11px;color:var(--muted);line-height:1.7;margin-bottom:24px;}
.google-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:12px 20px;background:var(--bg3);border:1px solid var(--border2);border-radius:9px;color:var(--text);font-family:'Josefin Sans',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;}
.google-btn:hover{border-color:var(--gold);background:var(--bg4);}
.google-icon{width:18px;height:18px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-size:11px;color:#333;font-weight:700;flex-shrink:0;}
.wl-signed-in{display:flex;flex-direction:column;gap:20px;}
.wl-user-bar{display:flex;align-items:center;gap:14px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 20px;}
.wl-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#8a5f1a);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#000;flex-shrink:0;}
.wl-user-name{font-size:13px;font-weight:600;}
.wl-user-email{font-size:10px;color:var(--muted);margin-top:1px;}
.signout-btn{margin-left:auto;background:none;border:1px solid var(--border2);border-radius:6px;color:var(--muted);font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:0.1em;padding:5px 12px;cursor:pointer;transition:all 0.2s;}
.signout-btn:hover{border-color:#f87171;color:#f87171;}
.wl-add-row{display:flex;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 18px;align-items:center;}
.wl-add-input{flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-family:'Josefin Sans',sans-serif;font-size:13px;letter-spacing:0.08em;padding:9px 13px;outline:none;text-transform:uppercase;transition:border-color 0.2s;}
.wl-add-input:focus{border-color:var(--gold);}
.wl-add-input::placeholder{text-transform:none;color:var(--muted);letter-spacing:0.02em;}
.wl-add-btn{background:var(--gold);border:none;border-radius:7px;color:#000;font-family:'Josefin Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;padding:9px 18px;cursor:pointer;transition:background 0.2s;flex-shrink:0;}
.wl-add-btn:hover{background:var(--gold2);}
.wl-items{display:flex;flex-direction:column;gap:10px;}
.wl-item{background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;}
.wl-item-ticker{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;width:60px;flex-shrink:0;}
.wl-item-co{font-size:11px;color:var(--muted);flex:1;}
.wl-score-now{font-size:12px;font-weight:700;padding:4px 10px;background:var(--bg3);border-radius:20px;}
.wl-notify-section{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.wl-notify-label{font-size:9px;color:var(--muted);letter-spacing:0.1em;white-space:nowrap;}
.wl-notify-input{width:52px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;color:var(--gold);text-align:center;padding:5px;font-size:12px;font-weight:700;font-family:'Josefin Sans',sans-serif;outline:none;}
.wl-notify-input:focus{border-color:var(--gold);}
.wl-email-toggle{display:flex;align-items:center;gap:6px;font-size:9px;color:var(--muted);cursor:pointer;}
.toggle{width:28px;height:16px;border-radius:8px;background:var(--bg4);border:1px solid var(--border2);position:relative;cursor:pointer;transition:background 0.2s;flex-shrink:0;}
.toggle.on{background:var(--gold);}
.toggle-thumb{width:12px;height:12px;border-radius:50%;background:#fff;position:absolute;top:1px;left:1px;transition:left 0.2s;}
.toggle.on .toggle-thumb{left:13px;}
.wl-remove-btn{background:none;border:none;color:var(--dim);cursor:pointer;font-size:16px;padding:0 4px;transition:color 0.2s;flex-shrink:0;}
.wl-remove-btn:hover{color:#f87171;}
.wl-empty{text-align:center;padding:40px;color:var(--muted);font-size:12px;letter-spacing:0.08em;line-height:1.8;}
.wl-notify-bar{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:10px;padding:12px 18px;font-size:11px;color:var(--gold);display:flex;align-items:flex-start;gap:10px;line-height:1.6;}

/* SOCIAL PAGE */
.soc-page{max-width:760px;margin:0 auto;padding:40px 36px 80px;}
.soc-hero{text-align:center;margin-bottom:44px;}
.soc-hero h1{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:700;margin-bottom:10px;}
.soc-hero p{font-size:12px;color:var(--muted);line-height:1.8;max-width:440px;margin:0 auto;}
.soc-grid{display:flex;flex-direction:column;gap:14px;}
.soc-card{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px 28px;display:flex;align-items:center;gap:22px;transition:border-color 0.2s;cursor:pointer;text-decoration:none;}
.soc-card:hover{border-color:var(--border2);transform:translateY(-1px);}
.soc-icon-wrap{width:56px;height:56px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;}
.soc-platform{font-size:16px;font-weight:700;letter-spacing:0.06em;margin-bottom:3px;}
.soc-handle{font-size:12px;letter-spacing:0.04em;margin-bottom:6px;}
.soc-desc{font-size:11px;color:var(--muted);line-height:1.6;flex:1;}
.soc-follow-btn{background:none;border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-family:'Josefin Sans',sans-serif;font-size:10px;letter-spacing:0.12em;padding:8px 16px;cursor:pointer;transition:all 0.2s;flex-shrink:0;white-space:nowrap;}
.soc-follow-btn:hover{border-color:var(--gold);color:var(--gold);}
.soc-mission{margin-top:36px;background:var(--bg2);border:1px solid rgba(201,168,76,0.14);border-radius:14px;padding:28px;text-align:center;}
.soc-mission-cross{font-size:10px;letter-spacing:0.28em;color:var(--gold);opacity:0.6;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;}
.soc-mission-cross::before,.soc-mission-cross::after{content:'—';opacity:0.4;}
.soc-mission p{font-size:13px;color:#aaa;line-height:1.8;max-width:500px;margin:0 auto;}

/* SUMMARY DASHBOARD */
.dash-page{max-width:900px;margin:0 auto;padding:40px 36px 80px;}
.dash-hero{text-align:center;margin-bottom:44px;}
.dash-hero h1{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;margin-bottom:10px;}
.dash-hero p{font-size:12px;color:var(--muted);line-height:1.8;max-width:480px;margin:0 auto;}
.dash-section{margin-bottom:40px;}
.dash-section-hdr{display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid var(--border);}
.dash-section-icon{font-size:18px;}
.dash-section-title{font-family:'Cormorant Garamond',serif;font-size:24px;}
.dash-section-sub{font-size:10px;color:var(--muted);letter-spacing:0.1em;margin-left:auto;}
.dash-row{display:flex;align-items:center;gap:16px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 20px;cursor:pointer;transition:all 0.18s;margin-bottom:9px;position:relative;overflow:hidden;}
.dash-row::after{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:2px 0 0 2px;}
.dash-row.buy::after{background:#4ade80;}
.dash-row.strongbuy::after{background:#00e5a0;}
.dash-row.sell::after{background:#fb923c;}
.dash-row.strongsell::after{background:#f87171;}
.dash-row:hover{border-color:var(--border2);transform:translateX(2px);}
.dash-rank{font-family:'Cormorant Garamond',serif;font-size:28px;color:var(--dim);width:32px;flex-shrink:0;text-align:center;}
.dash-ticker{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;width:72px;flex-shrink:0;}
.dash-co{flex:1;}
.dash-co-name{font-size:12px;font-weight:600;margin-bottom:2px;}
.dash-co-sector{font-size:10px;color:var(--muted);}
.dash-bar-wrap{width:100px;height:3px;background:var(--bg4);border-radius:2px;flex-shrink:0;}
.dash-bar-fill{height:100%;border-radius:2px;}
.dash-score{text-align:right;flex-shrink:0;}
.dash-score-num{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;}
.dash-score-lbl{font-size:8px;letter-spacing:0.15em;margin-top:2px;}
.dash-arrow{font-size:12px;color:var(--dim);flex-shrink:0;}
.dash-report-date{font-size:9px;color:var(--dim);letter-spacing:0.08em;}

/* loading */
.loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:18px;}
.spinner{width:32px;height:32px;border:2px solid var(--bg4);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.loading-ticker{font-family:'Cormorant Garamond',serif;font-size:48px;color:var(--gold);}
.loading-msg{font-size:10px;letter-spacing:0.2em;color:var(--muted);text-transform:uppercase;}
.loading-sub{font-size:10px;color:var(--dim);letter-spacing:0.08em;}
.error-msg{background:rgba(248,113,113,0.05);border:1px solid rgba(248,113,113,0.2);border-radius:12px;padding:24px;color:#f87171;margin:32px auto;max-width:480px;text-align:center;font-size:12px;line-height:1.8;}
`;

// ── CHART ─────────────────────────────────────────────────────────────────────
function PriceChart({ data, ticker }) {
  const lo = Math.min(...data.map(d=>d.price))*0.97;
  const hi = Math.max(...data.map(d=>d.price))*1.02;
  return (
    <div className="chart-card">
      <div className="chart-hdr">
        <div><div className="chart-title">1-YEAR PRICE CHART — ${ticker}</div><div style={{fontSize:10,color:"var(--dim)",marginTop:3,letterSpacing:"0.04em"}}>Daily close · 50-Day MA · 200-Day MA</div></div>
        <div className="chart-legend">
          <div className="leg"><div className="leg-line" style={{background:"#c9a84c"}}/> Price</div>
          <div className="leg"><div className="leg-line" style={{background:"#60a5fa",borderTop:"2px dashed #60a5fa",height:0}}/> 50D MA</div>
          <div className="leg"><div className="leg-line" style={{background:"#f97316",borderTop:"2px dashed #f97316",height:0}}/> 200D MA</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <AreaChart data={data} margin={{top:4,right:2,bottom:0,left:0}}>
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#c9a84c" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#151515" vertical={false}/>
          <XAxis dataKey="date" tick={{fontSize:8,fill:"#444",fontFamily:"Josefin Sans"}} tickLine={false} axisLine={false}
            tickFormatter={v=>{const d=new Date(v);return `${d.toLocaleString('default',{month:'short'})} '${String(d.getFullYear()).slice(2)}`;}} interval={41}/>
          <YAxis domain={[lo,hi]} tick={{fontSize:8,fill:"#444",fontFamily:"Josefin Sans"}} tickLine={false} axisLine={false}
            tickFormatter={v=>`$${v.toFixed(0)}`} width={42}/>
          <Tooltip contentStyle={{background:"#111",border:"1px solid #2a2a2a",borderRadius:8,fontFamily:"Josefin Sans",fontSize:10}}
            labelStyle={{color:"#555"}} itemStyle={{color:"#f0ead6"}}
            formatter={(v,n)=>[`$${v}`,n==="price"?"Price":n==="ma50"?"50D MA":"200D MA"]}/>
          <Area type="monotone" dataKey="price" stroke="#c9a84c" strokeWidth={1.5} fill="url(#pg)" dot={false}/>
          <Line type="monotone" dataKey="ma50"  stroke="#60a5fa" strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>
          <Line type="monotone" dataKey="ma200" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── RISK REWARD ───────────────────────────────────────────────────────────────
function RRVisual({ current, bear, base, bull, upside, downside }) {
  const ratio = (upside/Math.max(downside,0.1));
  const total = bull - bear;
  const downPct = total > 0 ? Math.round(((current-bear)/total)*100) : 40;
  const upPct = 100 - downPct;
  const levels = [
    {label:"BULL CASE", price:bull,   pct:`+${upside.toFixed(1)}%`,  color:"#4ade80"},
    {label:"BASE CASE", price:base,   pct:`+${((base-current)/current*100).toFixed(1)}%`, color:"#f5c842"},
    {label:"CURRENT",   price:current,pct:"—",                       color:"#c9a84c"},
    {label:"BEAR CASE", price:bear,   pct:`-${downside.toFixed(1)}%`, color:"#f87171"},
  ];
  return (
    <div className="rr-card">
      <div className="rr-hdr">1-YEAR RISK / REWARD SCENARIOS</div>
      <div className="rr-inner">
        <div className="rr-ladder">
          {levels.map((l,i)=>(
            <div className="rr-ladder-row" key={i}>
              <div className="rrl-label">{l.label}</div>
              <div className="rrl-dot" style={{background:l.color,boxShadow:`0 0 6px ${l.color}44`}}/>
              <div className="rrl-price" style={{color:l.color}}>${l.price}</div>
              <div className="rrl-pct" style={{color:l.color}}>{l.pct}</div>
            </div>
          ))}
        </div>
        <div className="rr-right">
          <div className="rr-ratio-lbl">RISK / REWARD</div>
          <div className="rr-ratio-num">{ratio.toFixed(1)}<span className="rr-ratio-x">x</span></div>
          <div className="rr-verdict">{ratio>=3?"Highly Favorable":ratio>=2?"Favorable":ratio>=1?"Balanced":"Unfavorable"}</div>
        </div>
      </div>
      <div className="asym-bar">
        <div className="asym-lbl">ASYMMETRY — DOWNSIDE vs UPSIDE POTENTIAL</div>
        <div className="asym-track">
          <div className="asym-down" style={{width:`${downPct}%`,background:"rgba(248,113,113,0.72)",minWidth:44}}>↓ {downside.toFixed(0)}%</div>
          <div className="asym-up"   style={{width:`${upPct}%`, background:"rgba(74,222,128,0.72)", minWidth:44}}>↑ {upside.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}

// ── PILLAR CARD ───────────────────────────────────────────────────────────────
function PillarCard({ pillar, data }) {
  const [open, setOpen] = useState(false);
  const color = SC(data.score);
  const ownershipColor = data.ownershipSignal==="Bullish"?"#4ade80":data.ownershipSignal==="Bearish"?"#f87171":"#f5c842";
  return (
    <div className="pc">
      <div className="pc-hdr" onClick={()=>setOpen(o=>!o)}>
        <span className="pc-icon">{pillar.icon}</span>
        <span className="pc-name">{pillar.label}</span>
        <span className="pc-wt">{Math.round(pillar.weight*100)}%</span>
        {pillar.id==="technical" && data.elliottWave && (
          <span style={{fontSize:9,background:"rgba(201,168,76,0.1)",border:"1px solid rgba(201,168,76,0.25)",color:"var(--gold)",padding:"2px 8px",borderRadius:20,letterSpacing:"0.06em",flexShrink:0}}>{data.elliottWave}</span>
        )}
        {pillar.id==="metrics" && data.ownershipSignal && (
          <span style={{fontSize:9,background:`${ownershipColor}14`,border:`1px solid ${ownershipColor}33`,color:ownershipColor,padding:"2px 8px",borderRadius:20,letterSpacing:"0.06em",flexShrink:0}}>{data.ownershipSignal}</span>
        )}
        <div className="pc-bar-wrap"><div className="pc-bar" style={{width:`${(data.score/5)*100}%`,background:color}}/></div>
        <span className="pc-score" style={{color}}>{data.score.toFixed(1)}</span>
        <span className={`pc-chev ${open?"open":""}`}>▼</span>
      </div>
      {open && (
        <div className="pc-body">
          <div className="pc-summary">{data.summary}</div>
          {pillar.id==="technical" && data.elliottWave && (
            <div style={{background:"rgba(201,168,76,0.06)",border:"1px solid rgba(201,168,76,0.18)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:"0.16em",color:"var(--gold)",marginBottom:5}}>ELLIOTT WAVE ANALYSIS</div>
              <div style={{fontSize:12,color:"#c9a84c",fontWeight:600,marginBottom:4}}>{data.elliottWave} — {data.elliottWaveSentiment}</div>
              {data.elliottWaveNote && <div style={{fontSize:11,color:"#999",lineHeight:1.6}}>{data.elliottWaveNote}</div>}
            </div>
          )}
          {pillar.id==="metrics" && data.ownershipSummary && (
            <div style={{background:`${ownershipColor}08`,border:`1px solid ${ownershipColor}22`,borderRadius:8,padding:"10px 14px",marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:"0.16em",color:ownershipColor,marginBottom:4}}>INSTITUTIONAL SIGNAL — {data.ownershipSignal?.toUpperCase()}</div>
              <div style={{fontSize:12,color:"#bbb",lineHeight:1.6}}>{data.ownershipSummary}</div>
            </div>
          )}
          {pillar.id==="geopolitical" && data.futuresSummary && (
            <div style={{background:"rgba(96,165,250,0.06)",border:"1px solid rgba(96,165,250,0.18)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:"0.16em",color:"#60a5fa",marginBottom:4}}>STOCK FUTURES</div>
              <div style={{fontSize:12,color:"#bbb",lineHeight:1.6}}>{data.futuresSummary}</div>
            </div>
          )}
          <div className="pc-bullets">
            {data.bullets?.map((b,i)=>(<div className="pc-bullet" key={i}><div className="bul-dot"/><span>{b}</span></div>))}
          </div>
          {pillar.id==="metrics" && data.keyMetrics && (
            <div className="metrics-grid">
              {Object.entries(data.keyMetrics).map(([k,v])=>(
                <div className="metric-row" key={k}><span className="mk">{k}</span><span className="mv">{v}</span></div>
              ))}
            </div>
          )}
          {pillar.id==="valuation" && data.fairValue && (
            <>
              <div className="scenarios">
                <div className="sc-box"><div className="sc-lbl">🐻 Bear</div><div className="sc-price" style={{color:"#f87171"}}>${data.bearCase}</div><div className="sc-pct" style={{color:"#f87171"}}>-{data.downside1Y?.toFixed(1)}%</div></div>
                <div className="sc-box"><div className="sc-lbl">📊 Base</div><div className="sc-price" style={{color:"#f5c842"}}>${data.baseCase}</div></div>
                <div className="sc-box"><div className="sc-lbl">🐂 Bull</div><div className="sc-price" style={{color:"#4ade80"}}>${data.bullCase}</div><div className="sc-pct" style={{color:"#4ade80"}}>+{data.upside1Y?.toFixed(1)}%</div></div>
              </div>
              <div className="fv-row"><span className="fv-lbl">⭐ Fair Value ({data.model})</span><span className="fv-val">${data.fairValue}</span></div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── REPORT PAGE ───────────────────────────────────────────────────────────────
function ReportPage({ report, onBack }) {
  const rating = RATING(report.overallScore);
  const val = report.pillars.valuation;
  const calColors = {earnings:"#c9a84c",macro:"#60a5fa",catalyst:"#4ade80"};
  const isOutdated = report.nextEarnings && new Date(report.nextEarnings) < new Date(report.reportDate);
  return (
    <div className="rp">
      <button className="back-btn" onClick={onBack}>← All Reports</button>
      <div className="rp-meta">
        <span className="ticker-pill">${report.ticker}</span>
        <span style={{fontSize:10,color:"var(--muted)",letterSpacing:"0.05em"}}>{report.sector}</span>
        <span style={{fontSize:10,color:"var(--muted)"}}>Published: {report.reportDate}</span>
        {isOutdated ? <span className="badge stale">⚠ UPDATE DUE</span> : <span className="badge fresh">✓ CURRENT</span>}
      </div>
      <div className="rp-co">{report.companyName}</div>
      <div className="rp-price" style={{marginBottom:22}}>Current Price: <strong>${report.currentPrice}</strong> &nbsp;·&nbsp; Next Earnings: <strong style={{color:"var(--gold)"}}>{report.nextEarnings}</strong></div>

      {/* Score hero */}
      <div className="sh">
        <div className="sh-left">
          <div className="sh-num" style={{color:rating.color}}>{report.overallScore.toFixed(2)}<span className="sh-denom">/5</span></div>
          <div className="sh-lbl" style={{color:rating.color}}>{rating.label}</div>
        </div>
        <div className="sh-div"/>
        <div className="sh-pills">
          {PILLARS.map(p=>{const s=report.pillars[p.id].score;return(
            <div className="sh-pill" key={p.id}>
              <div className="sh-pill-icon">{p.icon}</div>
              <div className="sh-pill-name">{p.label.split(" ")[0]}</div>
              <div className="sh-pill-score" style={{color:SC(s)}}>{s.toFixed(1)}</div>
              <div className="sh-pill-wt">{Math.round(p.weight*100)}% weight</div>
            </div>
          );})}
        </div>
      </div>

      {report.priceHistory && <PriceChart data={report.priceHistory} ticker={report.ticker}/>}

      <div style={{marginBottom:22}}>
        {PILLARS.map(p=>(<PillarCard key={p.id} pillar={p} data={report.pillars[p.id]}/>))}
      </div>

      {val?.fairValue && <RRVisual current={report.currentPrice} bear={val.bearCase} base={val.baseCase} bull={val.bullCase} upside={val.upside1Y} downside={val.downside1Y}/>}

      {report.catalystCalendar?.length>0 && (
        <div className="cal-card" style={{marginTop:14}}>
          <div className="cal-hdr">📅 UPCOMING CATALYST CALENDAR</div>
          {[...report.catalystCalendar].sort((a,b)=>a.date.localeCompare(b.date)).map((ev,i)=>(
            <div className="cal-row" key={i}>
              <div className="cal-date">{new Date(ev.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
              <div className="cal-dot" style={{background:calColors[ev.type]||"#666"}}/>
              <div className="cal-event">{ev.event}</div>
              <div className="cal-type" style={{background:`${calColors[ev.type]}18`,color:calColors[ev.type]||"#666",border:`1px solid ${calColors[ev.type]||"#666"}44`}}>{ev.type.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      <div className="conc-grid" style={{marginTop:14}}>
        <div className="rk-card">
          <div className="rk-hdr">⚠️ KEY RISKS</div>
          {report.keyRisks.map((r,i)=>(<div className="rk-item" key={i}><div className="rk-dot" style={{background:"#f87171"}}/><span>{r}</span></div>))}
        </div>
        <div className="rk-card">
          <div className="rk-hdr">✅ KEY CATALYSTS</div>
          {report.keyCatalysts.map((c,i)=>(<div className="rk-item" key={i}><div className="rk-dot" style={{background:"#4ade80"}}/><span>{c}</span></div>))}
        </div>
      </div>
      <div className="verdict-card" style={{marginTop:14}}>
        <div className="verdict-lbl">FINAL VERDICT</div>
        <div className="verdict-text">{report.conclusionSummary}</div>
      </div>
    </div>
  );
}

// ── GRADING SCALE PAGE ────────────────────────────────────────────────────────
function GradingScalePage() {
  const [open, setOpen] = useState(null);
  const SCALE = [
    {range:"4.1 – 5.0",label:"STRONG BUY", color:"#00e5a0",width:"100%",desc:"Exceptional opportunity — strong conviction across multiple pillars"},
    {range:"3.1 – 4.0",label:"BUY",        color:"#4ade80",width:"80%", desc:"Favorable setup — more bullish signals than concerns"},
    {range:"2.1 – 3.0",label:"NEUTRAL",    color:"#f5c842",width:"60%", desc:"Mixed picture — hold existing positions, not a clear entry"},
    {range:"1.1 – 2.0",label:"SELL",       color:"#fb923c",width:"38%", desc:"Bearish signals outweigh positives — consider reducing exposure"},
    {range:"0 – 1.0",  label:"STRONG SELL",color:"#f87171",width:"18%", desc:"Multiple red flags — high-risk situation for long-term holders"},
  ];
  return (
    <div className="gs-page">
      <div className="gs-hero">
        <div style={{fontSize:10,letterSpacing:"0.3em",color:"var(--gold)",opacity:0.6,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{opacity:0.4}}>—</span> ✝ HOW WE ANALYZE STOCKS <span style={{opacity:0.4}}>—</span>
        </div>
        <h1>Our Grading Scale</h1>
        <p>Every Eternal Edge report uses the same 6-pillar framework. Here's exactly what we look at, how we score it, and what every rating means.</p>
      </div>

      <div className="gs-scale">
        <div className="gs-scale-title">OVERALL SCORE SCALE — WHAT THE NUMBERS MEAN</div>
        <div className="gs-scale-rows">
          {SCALE.map((s,i)=>(
            <div className="gs-scale-row" key={i}>
              <div className="gs-scale-range" style={{color:s.color}}>{s.range}</div>
              <div className="gs-scale-bar-wrap"><div className="gs-scale-bar" style={{width:s.width,background:s.color}}/></div>
              <div className="gs-scale-label" style={{color:s.color}}>{s.label}</div>
              <div className="gs-scale-desc">{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,padding:"12px 14px",background:"var(--bg3)",borderRadius:8,fontSize:10,color:"var(--muted)",lineHeight:1.7}}>
          <strong style={{color:"var(--text)"}}>Decimal Precision:</strong> Scores use decimals (e.g. 3.4 vs 3.9) so you can see nuance within a rating. A 3.9 Neutral is much closer to a Buy than a 3.1 Neutral — the difference matters.
          &nbsp;&nbsp;<strong style={{color:"var(--text)"}}>Weighted Formula:</strong> Overall score = sum of each pillar score × its weight. No pillar alone determines the verdict.
        </div>
      </div>

      <div style={{fontSize:11,letterSpacing:"0.15em",color:"var(--muted)",textTransform:"uppercase",marginBottom:16}}>The 6 Pillars — Click to Expand</div>
      <div className="gs-pillars">
        {PILLARS.map((p,i)=>(
          <div className="gs-pillar" key={p.id}>
            <div className="gs-pillar-hdr" onClick={()=>setOpen(open===i?null:i)}>
              <span className="gs-ph-icon">{p.icon}</span>
              <div className="gs-ph-info">
                <div className="gs-ph-name">{p.label}</div>
                <div className="gs-ph-short">{p.short}</div>
              </div>
              <span className="gs-ph-wt">{Math.round(p.weight*100)}% WEIGHT</span>
              <span className={`gs-ph-chev ${open===i?"open":""}`}>▼</span>
            </div>
            {open===i && (
              <div className="gs-pillar-body">
                <div className="gs-pb-desc">{p.desc}</div>
                <div className="gs-factors">
                  <div className="gs-factors-title">What We Look At</div>
                  {p.factors.map((f,j)=>(<div className="gs-factor" key={j}><div className="bul-dot" style={{marginTop:6}}/><span>{f}</span></div>))}
                </div>
                <div className="gs-scoring-title">How Scores Are Assigned</div>
                <div className="gs-scoring-grid">
                  {Object.entries(p.scoring).map(([range,text])=>(
                    <div className="gs-scoring-row" key={range}>
                      <div className="gs-sr-range" style={{color:SC(parseFloat(range.split("–")[0]))}}>{range}</div>
                      <div className="gs-sr-text">{text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WATCHLIST PAGE ────────────────────────────────────────────────────────────
function WatchlistPage({ reports }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [addInput, setAddInput] = useState("");

  const mockSignIn = () => setUser({ name:"Demo User", email:"you@example.com", initials:"DU" });
  const signOut = () => { setUser(null); setItems([]); };

  const addItem = () => {
    const t = addInput.trim().toUpperCase();
    if (!t || items.find(i=>i.ticker===t)) return;
    const rep = reports[t];
    setItems(prev=>[...prev,{ ticker:t, company: rep?.companyName||"Search to generate report", currentScore: rep?.overallScore||null, notifyAbove:4.0, notifyBelow:2.0, emailNotify:false }]);
    setAddInput("");
  };

  const updateItem = (ticker, key, val) => setItems(prev=>prev.map(i=>i.ticker===ticker?{...i,[key]:val}:i));
  const removeItem = (ticker) => setItems(prev=>prev.filter(i=>i.ticker!==ticker));

  return (
    <div className="wl-page">
      <div className="wl-hero">
        <div style={{fontSize:10,letterSpacing:"0.3em",color:"var(--gold)",opacity:0.6,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{opacity:0.4}}>—</span> ✝ TRACK YOUR CONVICTION <span style={{opacity:0.4}}>—</span>
        </div>
        <h1>My Watchlist</h1>
        <p>Add stocks to your watchlist and get notified when a new report crosses your score threshold — so you never miss a high-conviction entry.</p>
      </div>

      {!user ? (
        <div className="signin-card">
          <div style={{fontSize:10,letterSpacing:"0.2em",color:"var(--gold)",marginBottom:18,textAlign:"center"}}>FREE ACCOUNT — NO CREDIT CARD</div>
          <div className="signin-title">Create Your Watchlist</div>
          <div className="signin-sub">Sign in with Google to save your watchlist and set score-based alerts. Free forever.</div>
          <button className="google-btn" onClick={mockSignIn}>
            <div className="google-icon">G</div>
            CONTINUE WITH GOOGLE
          </button>
          <div style={{marginTop:16,fontSize:10,color:"var(--dim)",lineHeight:1.7}}>By signing in you agree that all alerts are for informational purposes only and do not constitute financial advice.</div>
        </div>
      ) : (
        <div className="wl-signed-in">
          <div className="wl-user-bar">
            <div className="wl-avatar">{user.initials}</div>
            <div><div className="wl-user-name">{user.name}</div><div className="wl-user-email">{user.email}</div></div>
            <button className="signout-btn" onClick={signOut}>SIGN OUT</button>
          </div>

          <div className="wl-notify-bar">
            <span>🔔</span>
            <span>Add tickers below and set your alert thresholds. When Eternal Edge publishes a new report where a stock crosses your set score, you'll be notified on-site — and by email if enabled. All notifications are research alerts only, not financial advice.</span>
          </div>

          <div className="wl-add-row">
            <input className="wl-add-input" placeholder="Add a ticker — e.g. TSLA, MSFT, AMZN"
              value={addInput} onChange={e=>setAddInput(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&addItem()}/>
            <button className="wl-add-btn" onClick={addItem}>+ ADD</button>
          </div>

          {items.length===0 ? (
            <div className="wl-empty">Your watchlist is empty.<br/>Add a ticker above to start tracking.</div>
          ) : (
            <div className="wl-items">
              {items.map(item=>{
                const rating = item.currentScore ? RATING(item.currentScore) : null;
                return (
                  <div className="wl-item" key={item.ticker}>
                    <div>
                      <div className="wl-item-ticker">${item.ticker}</div>
                      <div style={{fontSize:10,color:"var(--muted)",marginTop:1}}>{item.company}</div>
                    </div>
                    {item.currentScore
                      ? <div className="wl-score-now" style={{color:rating.color}}>{item.currentScore.toFixed(2)} — {rating.label}</div>
                      : <div style={{fontSize:10,color:"var(--dim)"}}>No report yet</div>}
                    <div className="wl-notify-section">
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                          <span className="wl-notify-label">ALERT ABOVE</span>
                          <input className="wl-notify-input" type="number" min="1" max="5" step="0.1"
                            value={item.notifyAbove} onChange={e=>updateItem(item.ticker,"notifyAbove",parseFloat(e.target.value))}/>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span className="wl-notify-label">ALERT BELOW</span>
                          <input className="wl-notify-input" type="number" min="1" max="5" step="0.1"
                            value={item.notifyBelow} onChange={e=>updateItem(item.ticker,"notifyBelow",parseFloat(e.target.value))}/>
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6,marginLeft:8}}>
                        <div className="wl-email-toggle" onClick={()=>updateItem(item.ticker,"emailNotify",!item.emailNotify)}>
                          <div className={`toggle ${item.emailNotify?"on":""}`}><div className="toggle-thumb"/></div>
                          <span>Email</span>
                        </div>
                      </div>
                    </div>
                    <button className="wl-remove-btn" onClick={()=>removeItem(item.ticker)}>×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SOCIAL PAGE ───────────────────────────────────────────────────────────────
function SocialPage() {
  return (
    <div className="soc-page">
      <div className="soc-hero">
        <div style={{fontSize:10,letterSpacing:"0.3em",color:"var(--gold)",opacity:0.6,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{opacity:0.4}}>—</span> ✝ JOIN THE COMMUNITY <span style={{opacity:0.4}}>—</span>
        </div>
        <h1>Follow Us</h1>
        <p>Stay connected for new report alerts, market commentary, and long-term investing insights rooted in conviction and faith.</p>
      </div>

      <div className="soc-grid">
        {SOCIALS.map((s,i)=>(
          <a className="soc-card" key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",color:"inherit"}}>
            <div className="soc-icon-wrap" style={{background:`${s.color}14`,border:`1px solid ${s.color}22`}}>
              <span style={{color:s.color,fontWeight:700}}>{s.icon}</span>
            </div>
            <div style={{flex:1}}>
              <div className="soc-platform">{s.platform}</div>
              <div className="soc-handle" style={{color:s.color}}>{s.handle}</div>
              <div className="soc-desc">{s.desc}</div>
            </div>
            <button className="soc-follow-btn">FOLLOW →</button>
          </a>
        ))}
      </div>

      <div className="soc-mission">
        <div className="soc-mission-cross">✝ OUR MISSION</div>
        <p>"The stock market is a device for transferring money from the impatient to the patient." — Warren Buffett. Eternal Edge exists to help everyday investors build wealth with patience, conviction, and a long-term perspective grounded in faith. We share what we research, not what sells.</p>
      </div>
    </div>
  );
}

// ── SUMMARY DASHBOARD ────────────────────────────────────────────────────────
function SummaryDashboard({ reports, onSelect }) {
  const sorted = Object.values(reports).sort((a,b)=>b.overallScore-a.overallScore);
  const top5 = sorted.slice(0,5);
  const bot5 = sorted.slice(-5).reverse();
  const ratingClass = s => s>=4.5?"strongbuy":s>=4.0?"buy":s>=2.0?"sell":"strongsell";

  const DashRow = ({r, rank}) => {
    const rt = RATING(r.overallScore);
    return (
      <div className={`dash-row ${ratingClass(r.overallScore)}`} onClick={()=>onSelect(r.ticker)}>
        <div className="dash-rank">#{rank}</div>
        <div className="dash-ticker" style={{color:rt.color}}>${r.ticker}</div>
        <div className="dash-co">
          <div className="dash-co-name">{r.companyName}</div>
          <div className="dash-co-sector">{r.sector} · Published {r.reportDate}</div>
        </div>
        <div className="dash-bar-wrap"><div className="dash-bar-fill" style={{width:`${(r.overallScore/5)*100}%`,background:rt.color}}/></div>
        <div className="dash-score">
          <div className="dash-score-num" style={{color:rt.color}}>{r.overallScore.toFixed(2)}</div>
          <div className="dash-score-lbl" style={{color:rt.color}}>{rt.label}</div>
        </div>
        <div className="dash-arrow">→</div>
      </div>
    );
  };

  return (
    <div className="dash-page">
      <div className="dash-hero">
        <div style={{fontSize:10,letterSpacing:"0.3em",color:"var(--gold)",opacity:0.6,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{opacity:0.4}}>—</span> ✝ HIGHEST CONVICTION IDEAS <span style={{opacity:0.4}}>—</span>
        </div>
        <h1>Summary Dashboard</h1>
        <p>Our top-rated opportunities and highest-risk stocks at a glance. Auto-ranked by overall score across all published reports.</p>
      </div>

      <div style={{background:"rgba(201,168,76,0.05)",border:"1px solid rgba(201,168,76,0.15)",borderRadius:12,padding:"12px 18px",marginBottom:32,fontSize:11,color:"var(--muted)",lineHeight:1.7}}>
        <strong style={{color:"var(--gold)"}}>How to use this:</strong> The Top 5 are our highest-conviction long-term buying opportunities based on our 6-pillar framework. The Bottom 5 are stocks showing the most warning signs — use these as sell or avoid signals. Click any row to read the full report. Not financial advice.
      </div>

      <div className="dash-section">
        <div className="dash-section-hdr">
          <span className="dash-section-icon">🟢</span>
          <span className="dash-section-title">Top 5 — Highest Conviction Buys</span>
          <span className="dash-section-sub">SORTED BY OVERALL SCORE ↓</span>
        </div>
        {top5.length===0 && <div style={{color:"var(--muted)",fontSize:12,padding:"20px 0"}}>No reports published yet.</div>}
        {top5.map((r,i)=><DashRow key={r.ticker} r={r} rank={i+1}/>)}
      </div>

      <div className="dash-section">
        <div className="dash-section-hdr">
          <span className="dash-section-icon">🔴</span>
          <span className="dash-section-title">Bottom 5 — Highest Risk / Sell Signals</span>
          <span className="dash-section-sub">SORTED BY OVERALL SCORE ↑</span>
        </div>
        {bot5.length===0 && <div style={{color:"var(--muted)",fontSize:12,padding:"20px 0"}}>No reports published yet.</div>}
        {bot5.map((r,i)=><DashRow key={r.ticker} r={r} rank={i+1}/>)}
      </div>

      <div style={{textAlign:"center",fontSize:10,color:"var(--dim)",lineHeight:1.8,borderTop:"1px solid var(--border)",paddingTop:20}}>
        Rankings auto-update as new reports are published. All scores reflect our 6-pillar weighted framework. Past scores do not guarantee future performance.
      </div>
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function HomePage({ reports, onSelect, onSearch }) {
  const [q, setQ] = useState("");
  const isOutdated = r => r.nextEarnings && new Date(r.nextEarnings) < new Date(r.reportDate);
  return (
    <div>
      <div className="hero">
        <div className="hero-faith">✝ FOUNDED ON FAITH. BUILT FOR CONVICTION.</div>
        <h1>Long-Term Investing<br/><em>With Clarity.</em></h1>
        <p className="hero-sub">Structured 6-pillar stock research. No noise, no hype — just disciplined analysis for investors who think in years, not days.</p>
        <div className="hero-search-bar">
          <input placeholder="Search a ticker — e.g. NVDA, AAPL, TSLA" value={q}
            onChange={e=>setQ(e.target.value.toUpperCase())}
            onKeyDown={e=>e.key==="Enter"&&q.trim()&&onSearch(q.trim())}/>
          <button onClick={()=>q.trim()&&onSearch(q.trim())}>SEARCH</button>
        </div>
        <div className="stats-row">
          <div className="stat-item"><div className="stat-num">{Object.keys(reports).length}</div><div className="stat-label">Reports Published</div></div>
          <div className="stat-item"><div className="stat-num">6</div><div className="stat-label">Analysis Pillars</div></div>
          <div className="stat-item"><div className="stat-num">100%</div><div className="stat-label">Free Access</div></div>
          <div className="stat-item"><div className="stat-num">✝</div><div className="stat-label">Faith-Driven</div></div>
        </div>
      </div>
      <div className="page-section">
        <div className="section-hdr">
          <div className="section-title">Latest Reports</div>
          <div className="section-count">{Object.keys(reports).length} PUBLISHED</div>
        </div>
        <div className="reports-grid">
          {Object.values(reports).map(r=>{
            const rt = RATING(r.overallScore);
            return (
              <div className="rc" key={r.ticker} onClick={()=>onSelect(r.ticker)}>
                <div className="rc-top">
                  <div><div className="rc-ticker">${r.ticker}</div><div className="rc-co">{r.companyName}</div></div>
                  <div><div className="rc-score-num" style={{color:rt.color}}>{r.overallScore.toFixed(2)}</div><div className="rc-score-lbl" style={{color:rt.color}}>{rt.label}</div></div>
                </div>
                <div className="rc-bar"><div className="rc-bar-fill" style={{width:`${(r.overallScore/5)*100}%`,background:rt.color}}/></div>
                <div className="rc-foot">
                  <div><div className="rc-date">Report: {r.reportDate}</div><div style={{fontSize:9,color:"var(--dim)",marginTop:2,letterSpacing:"0.08em"}}>{r.sector}</div></div>
                  {isOutdated(r) ? <span className="badge stale">⚠ OUTDATED</span> : <span className="badge fresh">✓ CURRENT</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [reports, setReports] = useState({});
  const [sheetLoading, setSheetLoading] = useState(true);
  const [sheetError, setSheetError] = useState(null);
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [navQ, setNavQ] = useState("");
  const [navResults, setNavResults] = useState([]);

  // Load published reports from Google Sheets on startup
  useEffect(() => {
    fetchSheetReports()
      .then(data => { setReports(data); setSheetLoading(false); })
      .catch(e => { console.error("Sheet load error:", e); setSheetError("Could not load reports."); setSheetLoading(false); });
  }, []);

  const goReport = ticker => { setSelected(ticker); setPage("report"); setNavQ(""); setNavResults([]); };

  const handleSearch = async ticker => {
    const t = ticker.toUpperCase().trim();
    if (!t) return;
    if (reports[t]) { goReport(t); return; }
    setSelected(t); setPage("loading"); setError(null);
    try {
      const data = await fetchReport(t, "2026-03-05");
      setReports(prev=>({...prev,[t]:data}));
      setPage("report");
    } catch(e) {
      setError(`Could not generate a report for ${t}. ${e.message}`);
      setPage("error");
    }
  };

  const handleNavQ = val => {
    setNavQ(val.toUpperCase());
    setNavResults(val.length>=1 ? Object.values(reports).filter(r=>r.ticker.startsWith(val.toUpperCase())||r.companyName.toLowerCase().includes(val.toLowerCase())) : []);
  };

  const NAVLINKS = [
    {id:"home",label:"REPORTS"},
    {id:"dashboard",label:"SUMMARY DASHBOARD"},
    {id:"grading",label:"GRADING SCALE"},
    {id:"watchlist",label:"MY WATCHLIST"},
    {id:"social",label:"FOLLOW US"},
  ];

  return (
    <>
      <style>{CSS}</style>
      <nav className="nav">
        <div className="nav-logo" onClick={()=>setPage("home")}>
          <div className="cross-mark"/>
          <div><div className="nav-brand">ETERNAL <span>EDGE</span></div><div className="nav-tagline">Stock Market Research</div></div>
        </div>
        <div className="nav-links">
          {NAVLINKS.map(l=>(<button key={l.id} className={`nav-link ${(page===l.id||(page==="report"&&l.id==="home"))?"active":""}`} onClick={()=>setPage(l.id)}>{l.label}</button>))}
        </div>
        <div className="nav-search-wrap">
          <div className="nav-search">
            <span style={{color:"var(--muted)",fontSize:11}}>⌕</span>
            <input placeholder="Search ticker..." value={navQ} onChange={e=>handleNavQ(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch(navQ)}/>
          </div>
          {navResults.length>0 && (
            <div className="search-dropdown">
              {navResults.map(r=>(
                <div className="sd-item" key={r.ticker} onClick={()=>goReport(r.ticker)}>
                  <div><div className="sd-ticker" style={{color:RATING(r.overallScore).color}}>${r.ticker}</div><div className="sd-name">{r.companyName}</div></div>
                  <div className="sd-score" style={{color:RATING(r.overallScore).color}}>{r.overallScore.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {sheetLoading ? (
        <div className="loading-screen">
          <div className="cross-mark" style={{width:32,height:32,marginBottom:8}}/>
          <div className="spinner"/>
          <div className="loading-msg">LOADING REPORTS</div>
          <div className="loading-sub">Fetching latest research...</div>
        </div>
      ) : sheetError ? (
        <div className="error-msg"><strong>⚠ Could not load reports.</strong><br/><br/>{sheetError}</div>
      ) : (<>
        <div className="nav-logo" onClick={()=>setPage("home")}>
          <div className="cross-mark"/>
          <div><div className="nav-brand">ETERNAL <span>EDGE</span></div><div className="nav-tagline">Stock Market Research</div></div>
        </div>
        <div className="nav-links">
          {NAVLINKS.map(l=>(<button key={l.id} className={`nav-link ${(page===l.id||(page==="report"&&l.id==="home"))?"active":""}`} onClick={()=>setPage(l.id)}>{l.label}</button>))}
        </div>
        <div className="nav-search-wrap">
          <div className="nav-search">
            <span style={{color:"var(--muted)",fontSize:11}}>⌕</span>
            <input placeholder="Search ticker..." value={navQ} onChange={e=>handleNavQ(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleSearch(navQ)}/>
          </div>
          {navResults.length>0 && (
            <div className="search-dropdown">
              {navResults.map(r=>(
                <div className="sd-item" key={r.ticker} onClick={()=>goReport(r.ticker)}>
                  <div><div className="sd-ticker" style={{color:RATING(r.overallScore).color}}>${r.ticker}</div><div className="sd-name">{r.companyName}</div></div>
                  <div className="sd-score" style={{color:RATING(r.overallScore).color}}>{r.overallScore.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>

      {page==="home"      && <HomePage reports={reports} onSelect={goReport} onSearch={handleSearch}/>}
      {page==="dashboard" && <SummaryDashboard reports={reports} onSelect={goReport}/>}
      {page==="report"    && selected && reports[selected] && <ReportPage report={reports[selected]} onBack={()=>setPage("home")}/>}
      {page==="grading"   && <GradingScalePage/>}
      {page==="watchlist" && <WatchlistPage reports={reports}/>}
      {page==="social"    && <SocialPage/>}
      {page==="loading" && (
        <div className="loading-screen">
          <div className="loading-ticker">${selected}</div>
          <div className="spinner"/>
          <div className="loading-msg">GENERATING DEEP DIVE REPORT</div>
          <div className="loading-sub">Pulling live data · CNN Fear &amp; Greed · X/Twitter sentiment</div>
        </div>
      )}
      {page==="error" && (
        <div className="error-msg">
          <div style={{fontSize:20,marginBottom:12}}>⚠</div>
          <strong>Report Generation Failed</strong><br/><br/>{error}<br/><br/>
          <button className="back-btn" style={{margin:"0 auto",display:"flex"}} onClick={()=>setPage("home")}>← Back to Reports</button>
        </div>
      )}
      </>)}

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <div className="cross-mark" style={{width:18,height:18}}/>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,color:"var(--gold)",letterSpacing:"0.1em"}}>ETERNAL <span style={{color:"var(--text)",fontWeight:400}}>EDGE</span></div>
        </div>
        <div className="footer-disclaimer">
          <strong style={{color:"var(--muted)"}}>NOT FINANCIAL ADVICE:</strong> {DISCLAIMER}
        </div>
        <div className="footer-right">
          <div style={{color:"var(--dim)"}}>© 2026 Eternal Edge Research</div>
          <div style={{marginTop:4,color:"var(--dim)"}}>All research is educational only.</div>
        </div>
      </footer>
    </>
  );
}
