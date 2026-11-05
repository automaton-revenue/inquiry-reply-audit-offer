// READ-ONLY: paginate AgentMail inbox, keep true INBOUND mail (sender not our own
// address, not agentmail.to/mailer-daemon/DSN), last 7 days, fetch full bodies.
import { writeFileSync } from "node:fs";

const key = process.env.AGENTMAIL_API_KEY;
if (!key) { console.error("no key"); process.exit(2); }
const inbox = "automaton-revenue@agentmail.to";
const h = { Authorization: `Bearer ${key}` };
const base = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages`;
const SELF = "automaton-revenue@agentmail.to";
const CUTOFF = Date.now() - 7 * 864e5;

const emailOf = (f) => {
  const s = typeof f === "string" ? f : (f?.email ?? f?.address ?? JSON.stringify(f) ?? "");
  const m = String(s).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : String(s).toLowerCase();
};
const nameOf = (f) => {
  const s = typeof f === "string" ? f : (f?.name && f?.email ? `${f.name} <${f.email}>` : String(f?.email ?? f ?? ""));
  return s.trim();
};
const isNoise = (m) => {
  const e = emailOf(m.from);
  return e === SELF || e.endsWith("@agentmail.to") || e === "mailer-daemon@amazonses.com" ||
    /delivery status|mail delivery|undeliver|delivery failure|bounce|returned mail|notification|auto-reply|out of office/i.test(m.subject ?? "");
};

const inbound = [];
let token, oldest = Infinity, done = false;
for (let page = 0; page < 30 && !done; page++) {
  const url = base + "?limit=100" + (token ? `&page_token=${encodeURIComponent(token)}` : "");
  const j = await (await fetch(url, { headers: h })).json();
  const msgs = j.messages ?? [];
  if (!msgs.length) break;
  let kept = 0;
  for (const m of msgs) {
    const t = Date.parse(m.timestamp ?? "");
    if (isFinite(t)) oldest = Math.min(oldest, t);
    if (isNoise(m)) continue;
    if (isFinite(t) && t < CUTOFF) { done = true; continue; } // older than 7d
    inbound.push(m); kept++;
  }
  console.log(`page ${page}: ${msgs.length} msgs, kept ${kept} inbound (total ${inbound.length}), oldest seen: ${new Date(oldest).toISOString()}`);
  if (oldest < CUTOFF) done = true;
  token = j.next_page_token;
  if (!token) break;
}

inbound.sort((a, b) => Date.parse(b.timestamp ?? 0) - Date.parse(a.timestamp ?? 0));
console.log("\nTRUE inbound, last 7 days:", inbound.length);
for (const m of inbound) console.log("  ", m.timestamp, "|", nameOf(m.from), "|", m.subject);
writeFileSync(new URL("./raw-inbound.json", import.meta.url), JSON.stringify(inbound.map(m => ({ ...m, from: nameOf(m.from) })), null, 2));

const out = [];
for (const m of inbound.slice(0, 12)) {
  const d = await (await fetch(`${base}/${encodeURIComponent(m.message_id)}`, { headers: h })).json();
  const body = (d.text ?? (d.html ? d.html.replace(/<[^>]+>/g, " ") : "") ?? "").trim();
  const urls = [...new Set((body.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []).map((u) => u.replace(/[.,;)\]]+$/, "")))]
    .filter((u) => !/agentmail\.to|amazonaws\.com|amazonses\.com/i.test(u));
  out.push({ id: m.message_id, from: nameOf(m.from), subject: d.subject ?? m.subject, body: body.slice(0, 5000), urls, receivedAt: d.timestamp ?? m.timestamp, detail: d });
  console.log("--- fetched:", m.timestamp, "|", nameOf(m.from), "|", (d.subject ?? m.subject).slice(0, 60), "| urls:", urls.join(" ") || "(none)");
}
writeFileSync(new URL("./raw-candidates.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("done.");
