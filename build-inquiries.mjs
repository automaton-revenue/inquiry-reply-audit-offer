// Build inquiries.json for the 2 human inquiries identified in raw-inbound.json.
import { writeFileSync, readFileSync } from "node:fs";

const key = process.env.AGENTMAIL_API_KEY;
const inbox = "automaton-revenue@agentmail.to";
const h = { Authorization: `Bearer ${key}` };
const base = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages`;

const inbound = JSON.parse(readFileSync(new URL("./raw-inbound.json", import.meta.url), "utf8"));
const targets = inbound.filter((m) =>
  /theadamandeve@hotmail\.com|robertogelatooffice@gmail\.com/i.test(m.from));
console.log("targets:", targets.length);

const out = [];
for (const m of targets) {
  const d = await (await fetch(`${base}/${encodeURIComponent(m.message_id)}`, { headers: h })).json();
  const body = (d.text ?? (d.html ? d.html.replace(/<[^>]+>/g, " ") : "") ?? "").trim();
  const urls = [...new Set((body.match(/https?:\/\/[^\s<>"')\]]+/g) ?? []).map((u) => u.replace(/[.,;)\]]+$/, "")))]
    .filter((u) => !/agentmail\.to|amazonaws\.com|amazonses\.com|gumroad\.com|github\.com/i.test(u));
  const firstUrl = urls[0] ?? null;
  out.push({
    id: m.message_id,
    from: m.from,
    subject: d.subject ?? m.subject,
    body,
    extractedUrl: firstUrl,
    receivedAt: d.timestamp ?? m.timestamp,
  });
  console.log("\n=====", m.from, "|", d.subject);
  console.log(body.slice(0, 1200));
  console.log("extractedUrl:", firstUrl, "| allUrls:", urls.join(" "));
}
writeFileSync(new URL("./inquiries.json", import.meta.url), JSON.stringify(out, null, 2));
// also copy into shared workspace root for downstream goals
try { writeFileSync("C:\\Users\\samvs\\.automaton\\workspace\\inquiries.json", JSON.stringify(out, null, 2)); console.log("\nshared copy written"); } catch (e) { console.log("shared copy failed:", e.message); }
console.log("entries:", out.length);
