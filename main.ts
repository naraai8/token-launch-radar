// token-radar-01 entry: ranks pre-token protocols by implied launch value.
// Node 22, stdlib only. Reads /input/snapshot.json (or --input <file|dir>),
// writes /output/board.json, /output/data.js, copies dashboard/ + screenshots/,
// and writes /output/dossier.json via the vendored make.fun library.

import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq === undefined ? fallback : eq.slice(name.length + 3);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const snap = JSON.parse(readFileSync(inputFile, 'utf8'));
const watch = new Set<string>(snap.watchlist);

const BADCAT = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const EXC = ['binance', 'coinbase', 'bybit', 'kraken', 'bitget', 'okx', 'bitfinex', 'gemini'];
const VER = /\s(v2|v3|v4|2\.0|3\.0)$/i;
const WRAP = /\b(wrapped|staked|staking)\b/i;

function preToken(p: any): boolean {
  if (p.gecko_id || p.symbol) return false;
  const n = String(p.name).toLowerCase();
  if (p.category && BADCAT.has(p.category)) return false;
  if (VER.test(n) || WRAP.test(n)) return false;
  if (EXC.some((e) => n.startsWith(e))) return false;
  return true;
}

// Category multipliers: which kinds of protocol issue valuable tokens.
const CAT: Record<string, number> = {
  'Derivatives': 1.45, 'Perps': 1.45, 'Prediction Market': 1.4, 'Dexs': 1.3,
  'Lending': 1.25, 'CDP': 1.15, 'CDP Manager': 1.1, 'Yield': 1.15, 'Yield Aggregator': 1.15,
  'Onchain Capital Allocator': 1.05, 'Farm': 1.05, 'Basis Trading': 0.95,
  'RWA': 0.9, 'OTC Marketplace': 0.85, 'Cross Chain Bridge': 0.9, 'Risk Curators': 0.8,
};

function implied(p: any): number {
  let v = p.tvl_usd * 0.055 * (CAT[p.category ?? ''] ?? 1.0);
  const chg = p.change_7d ?? 0;
  v *= 1 + Math.max(-0.25, Math.min(0.4, chg / 100));
  v *= 1 + 0.06 * Math.min((p.chains?.length ?? 1) - 1, 5);
  const yr = Number(String(p.listed_at ?? '2025').slice(0, 4));
  if (yr >= 2026 && p.tvl_usd >= 100e6) v *= 1.35;      // new and already huge: hottest farm
  else if (yr >= 2026) v *= 1.15;
  else if (yr <= 2022 && p.tvl_usd >= 100e6) v *= 1.2;  // veteran, overdue token
  else if (yr <= 2022) v *= 1.05;
  if (watch.has(p.slug)) v *= 1.08;
  return Math.max(1e6, Math.round(v));
}

const T = 'tvl_usd';
const usd = (n: number) => '$' + (n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : Math.round(n / 1e6) + 'M');

function steps(p: any): string[] {
  const c0 = p.chains?.[0] ?? 'Ethereum';
  const cat = p.category ?? 'other';
  const tvl = usd(p.tvl_usd);
  const base = [
    `Deposit or trade on ${p.name} (${cat}, ${usd(p.tvl_usd)} TVL) and keep the position for weeks — snapshots score time-weighted activity over bursts.`,
    `Repeat a small real action every week on ${c0}: launch snapshots typically reward consistent wallets, not one-off size.`,
    `If ${p.name} runs a points, referral or governance surface, use it: votes and referrals are the cheapest visible loyalty signal a farmer can leave.`,
  ];
  const extra: Record<string, string[]> = {
    'Dexs': [`Route real volume through ${p.name} pools rather than a single swap — many DEX drops weight cumulative volume per wallet.`],
    'Lending': [`Supply and borrow a small amount on ${p.name}, repay on schedule — lenders and borrowers are usually weighted separately at launch.`],
    'Yield': [`Park a position in a ${p.name} vault for a month+ (${usd(p.tvl_usd)} sits there already) — yield vaults favor deposit duration over churn.`],
    'Onchain Capital Allocator': [`Subscribe to a ${p.name} strategy and leave it allocated — allocator drops tend to score deposit age and strategy diversity.`],
    'Risk Curators': [`Curators distribute by vault exposure: hold a ${p.name}-curated vault position on ${c0} and add to it over time.`],
    'CDP': [`Mint a small amount of ${p.name}'s stablecoin and hold or LP it — CDP launches commonly score minters, not just depositors.`],
    'RWA': [`RWA launches favour verified holders: complete ${p.name}'s KYC early so your position is registered before any snapshot.`],
    'Derivatives': [`Open and close a few small perp positions on ${p.name} over several weeks — derivatives airdrops usually score trading frequency.`],
    'Prediction Market': [`Trade a few positions on ${p.name} markets and hold through resolution — resolved-market history is the cleanest activity signal.`],
  };
  return [...base, ...(extra[cat] ?? [])].slice(0, 5);
}

const rows = snap.protocols
  .filter(preToken)
  .map((p: any) => ({
    slug: p.slug, name: p.name,
    v: implied(p), t: p.tvl_usd, c: p.category, g: p.change_7d,
    ch: (p.chains ?? []).length, l: p.listed_at, w: watch.has(p.slug) ? 1 : 0,
  }))
  .sort((a: any, b: any) => b.v - a.v)
  .slice(0, 100)
  .map((r: any, i: number) => ({ ...r, r: i + 1 }));

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), JSON.stringify({
  rows: rows.map((r: any) => ({
    slug: r.slug, name: r.name, rank: r.r, implied_value_usd: r.v,
    farm_steps: steps(snap.protocols.find((p: any) => p.slug === r.slug)),
  })),
}));

for (const dir of ['dashboard', 'screenshots']) {
  const src = join(here, dir);
  if (existsSync(src)) cpSync(src, join(out, dir), { recursive: true });
}

const farm: Record<string, string[]> = {};
for (const r of rows) farm[r.slug] = steps(snap.protocols.find((p: any) => p.slug === r.slug)).slice(0, 3);
writeFileSync(join(out, 'dashboard', 'data.js'),
  'const DATA=' + JSON.stringify({ asof: snap.as_of, floor: snap.floor_usd, rows }) + ';\nconst FARM=' + JSON.stringify(farm) + ';\n');

writeFileSync(join(out, 'dossier.json'), buildDossier(out, {
  text_max_bytes: 65_536,
  screenshots: { max: 4, max_bytes: 524_288 },
  dashboard: { max_files: 400, max_bytes: 4_194_304 },
}));

console.log(`board: ${rows.length} rows, top ${rows[0]?.slug} @ ${usd(rows[0]?.v)} implied`);
