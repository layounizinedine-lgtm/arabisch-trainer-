// Nimmt Wortfehler-Meldungen aus der App entgegen und legt dafür ein GitHub Issue an.
// Braucht die Umgebungsvariable GITHUB_TOKEN (Fine-grained Personal Access Token mit
// "Issues: Read and write"-Recht NUR für dieses Repo) in den Netlify-Umgebungsvariablen.
const REPO_OWNER = "layounizinedine-lgtm";
const REPO_NAME = "arabisch-trainer-";

function clip(s, max) {
  s = String(s || "");
  return s.length > max ? s.slice(0, max) + "…" : s;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const body = JSON.parse(event.body || "{}");
    const wordType = clip(body.wordType, 40);
    const arabic = clip(body.arabic, 100);
    const projectName = clip(body.projectName, 100);
    const description = clip(body.description, 2000);
    const reporterEmail = clip(body.reporterEmail, 200);

    if (!description.trim()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Keine Beschreibung übermittelt" }) };
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "GITHUB_TOKEN fehlt in den Netlify-Umgebungsvariablen" }) };
    }

    const title = `[Wortfehler] ${arabic || "(ohne Wort)"} (${wordType || "?"})`;
    const issueBody = [
      `**Wort:** ${arabic || "–"}`,
      `**Typ:** ${wordType || "–"}`,
      `**Projekt/Thema:** ${projectName || "–"}`,
      `**Meldende E-Mail:** ${reporterEmail || "–"}`,
      `**Zeitpunkt:** ${new Date().toISOString()}`,
      ``,
      `**Beschreibung:**`,
      description,
    ].join("\n");

    const ghRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "markaz-al-tawfiq-report-error",
      },
      body: JSON.stringify({ title, body: issueBody }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: "GitHub-Fehler", details: errText }) };
    }

    const issue = await ghRes.json();
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, issueUrl: issue.html_url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
