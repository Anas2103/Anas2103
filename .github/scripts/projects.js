// draws a card for each project in assets/ and updates the projects part of README.md
// to add a project: add an entry below and push. add `demo` once it's deployed.
// logos are simple-icons names: https://simpleicons.org

const PROJECTS = [
  {
    file: "project-relay",
    title: "Relay · Real-time Chat",
    lines: ["Telegram-style chat with E2EE secret", "chats, voice/video calls. $0 hosting."],
    logos: [["cloudflare", "#F38020"], ["react", "#61DAFB"], ["typescript", "#3178C6"], ["tailwindcss", "#06B6D4"], ["sqlite", "#5A9FD4"]],
    tech: "React 19 · TypeScript · Workers · Durable Objects",
    repo: "Relay",
    demo: "https://relay-chat.bunbunchat.workers.dev",
  },
  {
    file: "project-ecommerce",
    title: "Full Stack E-Commerce",
    lines: ["Multi-vendor store with Stripe & PayPal,", "FR / EN / AR (RTL), tested in CI."],
    logos: [["laravel", "#FF2D20"], ["react", "#61DAFB"], ["redux", "#764ABC"], ["tailwindcss", "#06B6D4"], ["stripe", "#635BFF"], ["paypal", "#009CDE"]],
    tech: "Laravel 12 · React 19 · Redux Toolkit · Stripe",
    repo: "Ecommerce",
    demo: "https://anas2103-ecommerce.vercel.app",
  },
  {
    file: "project-aijobboard",
    title: "HireMatch · AI Job Board",
    lines: ["Job board where AI scores each CV", "against the job (0-100) with feedback."],
    logos: [["laravel", "#FF2D20"], ["react", "#61DAFB"], ["openai", "#ffffff"], ["tailwindcss", "#06B6D4"], ["jsonwebtokens", "#d63aff"]],
    tech: "Laravel 12 · React 19 · OpenAI · JWT · Zustand",
    repo: "AiJobBoard",
  },
  {
    file: "project-smartcourse",
    title: "SmartCourse · Learning Platform",
    lines: ["Online courses with lessons, quizzes,", "PDF certificates and Stripe payments."],
    logos: [["laravel", "#FF2D20"], ["react", "#61DAFB"], ["reactquery", "#FF4154"], ["tailwindcss", "#06B6D4"], ["stripe", "#635BFF"]],
    tech: "Laravel 11 · React 18 · TanStack Query · Stripe",
    repo: "SmartCoursePlatform",
  },
  {
    file: "project-carsrental",
    title: "CarsRental · Rental Manager",
    lines: ["Car rental system with bookings, roles", "& permissions and PayPal payments."],
    logos: [["laravel", "#FF2D20"], ["react", "#61DAFB"], ["tailwindcss", "#06B6D4"], ["paypal", "#009CDE"], ["jsonwebtokens", "#d63aff"]],
    tech: "Laravel 12 · React 19 · Spatie Permission · JWT",
    repo: "CarsRental",
  },
  {
    file: "project-students",
    title: "Student & Course Manager",
    lines: ["School management app with 4 roles,", "grades, attendance and EN / FR / AR."],
    logos: [["laravel", "#FF2D20"], ["react", "#61DAFB"], ["tailwindcss", "#06B6D4"]],
    tech: "Laravel 11 · React 18 · Tailwind · Sanctum",
    repo: "StudentsCourseManager",
  },
];

const fs = require("fs");
const path = require("path");

const USER = "Anas2103";
const ROOT = path.join(__dirname, "..", "..");
const ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@11.14.0/icons/";
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

async function iconPath(name) {
  const res = await fetch(ICONS + name + ".svg");
  if (!res.ok) throw new Error(`no icon called "${name}"`);
  return (await res.text()).match(/<path d="([^"]+)"/)[1];
}

async function card(p) {
  const W = 380, H = 200;
  let body = "";
  body += `<rect class="trace" x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="13" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.3" pathLength="100" filter="url(#glow)"/>`;
  body += `<text x="22" y="40" class="title">${esc(p.title)}</text>`;
  p.lines.forEach((l, i) => body += `<text x="22" y="${68 + i * 18}" class="desc">${esc(l)}</text>`);
  for (const [i, [name, color]] of p.logos.entries()) {
    body += `<g transform="translate(${22 + i * 34} 112) scale(${22 / 24})"><path d="${await iconPath(name)}" fill="${color}"/></g>`;
  }
  body += `<text x="22" y="${H - 38}" class="tech">${esc(p.tech)}</text>`;
  body += `<text x="22" y="${H - 16}" class="repo">github.com/${USER}/${esc(p.repo)} →</text>`;
  if (p.demo) body += `<text x="${W - 22}" y="${H - 16}" class="demo" text-anchor="end">● live demo</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(p.title)}</title>
<defs>
  <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b"/>
    <feComponentTransfer in="b" result="soft"><feFuncA type="linear" slope=".45"/></feComponentTransfer>
    <feMerge><feMergeNode in="soft"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<style>
  text { font-family: ${FONT}; }
  .title { font-size: 15px; font-weight: 700; fill: #f2f2f2; }
  .desc { font-size: 12px; fill: #c8c8c8; }
  .tech { font-size: 10.5px; fill: #7a7a7a; }
  .repo { font-size: 10.5px; fill: #7EBAE4; }
  .demo { font-size: 10.5px; fill: #98c379; }
  .trace { stroke-dasharray: 18 82; animation: trace 6s linear infinite; }
  @keyframes trace { to { stroke-dashoffset: -100 } }
</style>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="14" fill="#050505" stroke="#262626" stroke-width="1.5"/>
${body}
</svg>
`;
}

// the README part between the two markers gets replaced
function readmeBlock() {
  let md = "";
  for (let i = 0; i < PROJECTS.length; i += 2) {
    md += "<p>\n";
    for (const p of PROJECTS.slice(i, i + 2)) {
      const alt = `${p.title}: ${p.lines.join(" ")} ${p.tech}`;
      md += `  <a href="https://github.com/${USER}/${p.repo}"><img src="assets/${p.file}.svg" width="49%" alt="${esc(alt)}" /></a>\n`;
    }
    md += "</p>\n";
  }
  const demos = PROJECTS.filter(p => p.demo);
  if (demos.length) md += "\nlive demos: " + demos.map(p => `[${p.title}](${p.demo})`).join(" · ") + "\n";
  return md;
}

(async () => {
  for (const p of PROJECTS) {
    fs.writeFileSync(path.join(ROOT, "assets", p.file + ".svg"), await card(p));
  }
  const readmePath = path.join(ROOT, "README.md");
  const readme = fs.readFileSync(readmePath, "utf8");
  const updated = readme.replace(
    /<!-- projects:start -->[\s\S]*<!-- projects:end -->/,
    `<!-- projects:start -->\n${readmeBlock()}<!-- projects:end -->`
  );
  fs.writeFileSync(readmePath, updated);
  console.log(`${PROJECTS.length} project cards updated`);
})().catch(e => { console.error(e); process.exit(1); });
