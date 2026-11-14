// draws assets/stats.svg and assets/commits.svg from my github data
// runs daily in .github/workflows/stats.yml
// local preview: node .github/scripts/cards.js --data some.json

const fs = require("fs");
const path = require("path");

const LOGIN = "Anas2103";
const OUT_DIR = path.join(__dirname, "..", "..", "assets");
const W = 768;

// black cards, white neon
const C = {
  bg: "#050505",
  border: "#262626",
  text: "#ffffff",
  dim: "#7a7a7a",
};
const HEAT = ["#151515", "#3a3a3a", "#6e6e6e", "#b0b0b0", "#ffffff"];
const LANG_SHADES = ["#ffffff", "#c4c4c4", "#949494", "#6e6e6e", "#4f4f4f", "#383838"];
const SWEEP = 6; // seconds between neon sweeps
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const num = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);

// ---- data ----

const QUERY = `query($login: String!) {
  user(login: $login) {
    pullRequests { totalCount }
    issues { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchData(token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  const u = json.data.user;
  const cc = u.contributionsCollection;

  const langs = {};
  for (const repo of u.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      langs[node.name] ??= { name: node.name, color: node.color || "#8fa9d0", size: 0 };
      langs[node.name].size += size;
    }
  }

  return {
    stats: {
      commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
      prs: u.pullRequests.totalCount,
      issues: u.issues.totalCount,
      repos: u.repositories.totalCount,
      stars: u.repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0),
    },
    languages: Object.values(langs),
    total: cc.contributionCalendar.totalContributions,
    days: cc.contributionCalendar.weeks.flatMap(w => w.contributionDays)
      .map(d => ({ date: d.date, count: d.contributionCount })),
  };
}

// ---- shared bits ----

function card(h, title, body, css) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">
<title>${esc(title)}</title>
<defs>
  <filter id="neon" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
    <feComponentTransfer in="b" result="soft"><feFuncA type="linear" slope=".45"/></feComponentTransfer>
    <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<style>
  text { font-family: ${FONT}; }
  .title { font-size: 13px; font-weight: 700; fill: ${C.text}; letter-spacing: 1px; }
  .label { font-size: 13px; fill: ${C.dim}; }
  .value { font-size: 14px; font-weight: 700; fill: ${C.text}; }
  .in { opacity: 0; animation: in .5s ease-out forwards; }
  @keyframes in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
  .glint { opacity: 0; animation: glint ${SWEEP}s infinite; }
  @keyframes glint { 0% { opacity: 0 } 4% { opacity: 1 } 16%, 100% { opacity: 0 } }
  ${css}
</style>
<rect x=".75" y=".75" width="${W - 1.5}" height="${h - 1.5}" rx="14" fill="${C.bg}" stroke="${C.border}" stroke-width="1.5"/>
${body}
</svg>
`;
}

const neonTitle = (x, y, text) =>
  `<text x="${x}" y="${y}" class="title in" filter="url(#neon)">${text}</text>`;

// ---- stats card ----

function statsCard({ stats, languages }) {
  const H = 200;
  const rows = [
    ["commits (last year)", stats.commits],
    ["pull requests", stats.prs],
    ["issues", stats.issues],
    ["repositories", stats.repos],
    ["stars", stats.stars],
  ];

  let body = neonTitle(32, 38, "GITHUB STATS");
  rows.forEach(([label, value], i) => {
    const y = 72 + i * 26;
    const sweep = `animation-delay:${(0.8 + i * 0.12).toFixed(2)}s`;
    body += `<g class="in" style="animation-delay:${0.15 + i * 0.1}s">`
      + `<rect x="32" y="${y - 9}" width="6" height="6" rx="1" fill="#4a4a4a"/>`
      + `<rect class="glint" style="${sweep}" x="32" y="${y - 9}" width="6" height="6" rx="1" fill="#fff" filter="url(#neon)"/>`
      + `<text x="48" y="${y - 1}" class="label">${label}</text>`
      + `<text x="340" y="${y - 1}" class="value" text-anchor="end">${num(value)}</text>`
      + `<text class="glint value" style="${sweep}" x="340" y="${y - 1}" text-anchor="end" filter="url(#neon)">${num(value)}</text>`
      + `</g>`;
  });

  body += `<line x1="376" y1="30" x2="376" y2="170" stroke="${C.border}" stroke-width="1.5"/>`;

  // languages, in shades of white so the card stays black and white
  const total = languages.reduce((n, l) => n + l.size, 0);
  const top = languages.sort((a, b) => b.size - a.size).slice(0, 6);
  body += neonTitle(408, 38, "MOST USED LANGUAGES");

  if (!total) {
    body += `<text x="408" y="80" class="label in">nothing to show yet</text>`;
  } else {
    const BX = 408, BY = 58, BW = 328, BH = 10;
    body += `<clipPath id="bar"><rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="5"/></clipPath>`;
    body += `<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="5" fill="#151515"/>`;
    let x = BX;
    body += `<g clip-path="url(#bar)">`;
    top.forEach((l, i) => {
      const w = (l.size / total) * BW;
      body += `<rect class="grow" style="animation-delay:${0.3 + i * 0.12}s" x="${x.toFixed(2)}" y="${BY}" width="${(w + 0.5).toFixed(2)}" height="${BH}" fill="${LANG_SHADES[i]}"/>`;
      x += w;
    });
    // a streak of light that runs along the bar
    body += `<rect class="shine" x="${BX - 60}" y="${BY}" width="60" height="${BH}" fill="url(#shine)"/>`;
    body += `</g>`;

    top.forEach((l, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const lx = BX + col * 168, ly = 98 + row * 26;
      const pct = ((l.size / total) * 100).toFixed(1);
      const sweep = `animation-delay:${(1.2 + i * 0.12).toFixed(2)}s`;
      body += `<g class="in" style="animation-delay:${0.5 + i * 0.1}s">`
        + `<circle cx="${lx + 4}" cy="${ly - 5}" r="4.5" fill="${LANG_SHADES[i]}"/>`
        + `<text x="${lx + 16}" y="${ly - 1}" class="label" style="fill:#d0d0d0">${esc(l.name)}</text>`
        + `<text class="glint label" style="${sweep};fill:#fff" x="${lx + 16}" y="${ly - 1}" filter="url(#neon)">${esc(l.name)}</text>`
        + `<text x="${lx + 150}" y="${ly - 1}" class="label" text-anchor="end">${pct}%</text>`
        + `</g>`;
    });
  }

  const css = `
  .grow { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: grow .7s ease-out forwards; }
  @keyframes grow { to { transform: scaleX(1) } }
  .shine { animation: shine ${SWEEP}s 1s infinite; }
  @keyframes shine { 0% { transform: translateX(0) } 25%, 100% { transform: translateX(400px) } }`;
  const defs = `<linearGradient id="shine" x1="0" x2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>`;
  body = defs + body;
  return card(H, "github stats", body, css);
}

// ---- commits card ----

function streaks(days) {
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // current streak can end yesterday if nothing has been pushed yet today
  let i = days.length - 1, current = 0;
  if (i >= 0 && days[i].count === 0) i--;
  while (i >= 0 && days[i].count > 0) { current++; i--; }
  return { current, longest };
}

function level(count, max) {
  if (count === 0) return 0;
  return Math.min(4, Math.ceil((count / max) * 4));
}

function commitsCard({ days, total }) {
  const H = 230;
  const CELL = 10, STEP = 13;
  const weeks = [];
  // group into weeks starting on sunday, like github
  days.forEach(d => {
    const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
    if (!weeks.length || dow === 0) weeks.push([]);
    weeks[weeks.length - 1][dow] = d;
  });

  const gridW = weeks.length * STEP - (STEP - CELL);
  const GX = Math.round((W - gridW) / 2), GY = 92;
  const max = Math.max(1, ...days.map(d => d.count));
  const { current, longest } = streaks(days);

  let body = neonTitle(32, 38, "CONTRIBUTIONS");
  const summary = [
    [num(total), "last year"],
    [current, "current streak"],
    [longest, "longest streak"],
  ];
  summary.forEach(([v, label], i) => {
    const x = W - 32 - (2 - i) * 150;
    body += `<g class="in" style="animation-delay:${0.1 + i * 0.1}s">`
      + `<text x="${x}" y="38" class="value" text-anchor="end">${v} <tspan class="label">${label}</tspan></text>`
      + `</g>`;
  });

  // month labels
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const first = w.find(Boolean);
    if (!first) return;
    const m = new Date(first.date + "T00:00:00Z").getUTCMonth();
    if (m !== lastMonth && i < weeks.length - 2) {
      const name = new Date(first.date + "T00:00:00Z").toLocaleString("en", { month: "short", timeZone: "UTC" });
      body += `<text x="${GX + i * STEP}" y="${GY - 10}" class="label" style="font-size:11px">${name}</text>`;
    }
    lastMonth = m;
  });

  const today = days[days.length - 1]?.date;
  weeks.forEach((w, i) => {
    w.forEach((d, dow) => {
      if (!d) return;
      const lv = level(d.count, max);
      const cls = d.date === today ? "cell today" : "cell";
      const x = GX + i * STEP, y = GY + dow * STEP;
      body += `<rect class="${cls}" style="animation-delay:${(i * 0.025).toFixed(3)}s" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${HEAT[lv]}"><title>${d.count} on ${d.date}</title></rect>`;
      // neon sweep runs across the grid column by column;
      // days with commits flare up bright, empty days only flicker
      const sweep = `animation-delay:${(1 + i * 0.03).toFixed(2)}s`;
      body += lv
        ? `<rect class="glint" style="${sweep}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="#fff" filter="url(#neon)"/>`
        : `<rect class="glint" style="${sweep}" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="#fff" fill-opacity=".18"/>`;
    });
  });

  // legend
  const LY = GY + 7 * STEP + 18;
  const lx = W - 32 - (HEAT.length * STEP) - 40;
  body += `<text x="${lx - 8}" y="${LY + 9}" class="label" style="font-size:11px" text-anchor="end">less</text>`;
  HEAT.forEach((c, i) => body += `<rect x="${lx + i * STEP}" y="${LY}" width="${CELL}" height="${CELL}" rx="2" fill="${c}"/>`);
  body += `<text x="${lx + HEAT.length * STEP + 4}" y="${LY + 9}" class="label" style="font-size:11px">more</text>`;

  const css = `
  .cell { opacity: 0; transform-box: fill-box; transform-origin: center; animation: pop .35s ease-out forwards; }
  @keyframes pop { from { opacity: 0; transform: scale(.3) } to { opacity: 1; transform: scale(1) } }
  .today { animation: pop .35s ease-out forwards, glow 2s 2s ease-in-out infinite; }
  @keyframes glow { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }`;
  return card(H, "contributions", body, css);
}

// ---- wakatime card ----

async function fetchWakatime(key) {
  const res = await fetch("https://wakatime.com/api/v1/users/current/stats/last_7_days", {
    headers: { Authorization: "Basic " + Buffer.from(key).toString("base64") },
  });
  if (!res.ok) throw new Error("wakatime " + res.status);
  const { data } = await res.json();
  return {
    total: data.human_readable_total || "0 mins",
    languages: (data.languages || []).slice(0, 5).map(l => ({ name: l.name, text: l.text, percent: l.percent })),
  };
}

function wakatimeCard(w) {
  const H = 200;
  let body = neonTitle(32, 38, "CODING TIME · LAST 7 DAYS");

  if (!w || !w.languages.length) {
    body += `<text x="32" y="90" class="label in">no coding time tracked yet</text>`;
    return card(120, "coding time", body, "");
  }

  body += `<text x="${W - 32}" y="38" class="value in" text-anchor="end" filter="url(#neon)">${esc(w.total)}</text>`;
  w.languages.forEach((l, i) => {
    const y = 72 + i * 26;
    const BX = 190, BW = 380;
    const sweep = `animation-delay:${(0.8 + i * 0.12).toFixed(2)}s`;
    body += `<g class="in" style="animation-delay:${0.15 + i * 0.1}s">`
      + `<text x="32" y="${y}" class="label" style="fill:#d0d0d0">${esc(l.name)}</text>`
      + `<rect x="${BX}" y="${y - 9}" width="${BW}" height="8" rx="4" fill="#151515"/>`
      + `<rect class="grow" style="animation-delay:${0.3 + i * 0.1}s" x="${BX}" y="${y - 9}" width="${Math.max(4, (l.percent / 100) * BW).toFixed(1)}" height="8" rx="4" fill="${LANG_SHADES[i]}"/>`
      + `<rect class="glint" style="${sweep}" x="${BX}" y="${y - 9}" width="${Math.max(4, (l.percent / 100) * BW).toFixed(1)}" height="8" rx="4" fill="#fff" filter="url(#neon)"/>`
      + `<text x="${W - 32}" y="${y}" class="label" text-anchor="end">${esc(l.text)}</text>`
      + `</g>`;
  });
  const css = `
  .grow { transform-box: fill-box; transform-origin: left; transform: scaleX(0); animation: grow .7s ease-out forwards; }
  @keyframes grow { to { transform: scaleX(1) } }`;
  return card(H, "coding time", body, css);
}

// ---- main ----

(async () => {
  const i = process.argv.indexOf("--data");
  let data;
  if (i > -1) {
    data = JSON.parse(fs.readFileSync(process.argv[i + 1], "utf8"));
  } else {
    const token = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN;
    if (!token) throw new Error("set STATS_TOKEN");
    data = await fetchData(token);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "stats.svg"), statsCard(data));
  fs.writeFileSync(path.join(OUT_DIR, "commits.svg"), commitsCard(data));

  // wakatime is optional: without a key the card just says nothing's tracked yet
  let waka = data.wakatime || null;
  if (!waka && process.env.WAKATIME_API_KEY) {
    try { waka = await fetchWakatime(process.env.WAKATIME_API_KEY); }
    catch (e) { console.error(e.message); }
  }
  fs.writeFileSync(path.join(OUT_DIR, "wakatime.svg"), wakatimeCard(waka));
  console.log("cards updated");
})().catch(e => { console.error(e); process.exit(1); });
