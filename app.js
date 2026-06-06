//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

let results = [];

const ADZUNA_APP_ID = "PASTE_YOUR_APP_ID";
const ADZUNA_APP_KEY = "PASTE_YOUR_APP_KEY";

let results = [];

//
// =====================
// MAIN ENTRY
// =====================
//
async function runSearch() {
  console.log("RUN SEARCH");

  const resumeText = document.getElementById("resume").value || "";
  const skillsRaw = document.getElementById("skills").value || "";
  const location = document.getElementById("location").value || "Los Angeles";
  const recency = parseInt(document.getElementById("recency").value) || 7;

  const skills = skillsRaw
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const query = buildQuery(resumeText, skills);

  console.log("FINAL QUERY:", query);

  const jobs = await fetchJobs(location, query, recency);

  results = jobs;

  render();
}

//
// =====================
// QUERY BUILDER
// =====================
//
function buildQuery(resume, skills) {
  const resumeWords = extractWords(resume);

  const combined = [...skills, resumeWords]
    .filter(Boolean)
    .join(" ");

  // HARD LIMIT: prevents API breakage from long resumes
  return combined.split(" ").slice(0, 35).join(" ");
}

//
// =====================
// RESUME PARSER (FIXED)
// =====================
//
function extractWords(text) {
  if (!text) return "";

  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");

  const words = cleaned.split(" ");

  const stop = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","is","it","this","that","was","were","be","as","are",
    "from","or","have","has","had","i","you","we","they",
    "responsible","experience","worked","working","manage","managed"
  ]);

  const filtered = words.filter(w =>
    w && w.length > 2 && !stop.has(w)
  );

  // frequency weighting (critical fix)
  const freq = {};
  for (const w of filtered) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, 25)
    .join(" ");
}

//
// =====================
// API CALL
// =====================
//
async function fetchJobs(location, query, recency) {
  console.log("FETCHING API");

  const url =
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&max_days_old=${recency}` +
    `&results_per_page=10`;

  console.log("URL:", url);

  const res = await fetch(url);
  const data = await res.json();

  console.log("API RESPONSE:", data);

  // DEBUG OUTPUT (safe)
  const debug = document.getElementById("debugOutput");
  if (debug) {
    debug.textContent = JSON.stringify(data, null, 2);
  }

  if (!data.results) return [];

  return data.results.map(j => ({
    title: j.title,
    employer: j.company?.display_name || "Unknown",
    location: formatLocation(j.location?.display_name || ""),
    posted: new Date(j.created).toLocaleDateString(),
    link: j.redirect_url || "#"
  }));
}

//
// =====================
// LOCATION FORMAT (simple + stable)
// =====================
//
function formatLocation(str) {
  if (!str) return "Unknown";

  const parts = str.split(",").map(p => p.trim());

  const city = parts[0] || "";
  const state = parts[1] ? parts[1].slice(0, 2).toUpperCase() : "";

  return state ? `${city}, ${state}` : city;
}

//
// =====================
// RENDER TABLE
// =====================
//
function render() {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  if (!results || results.length === 0) {
    console.warn("NO RESULTS");
    return;
  }

  for (const j of results) {
    tbody.innerHTML += `
      <tr>
        <td>${j.title}</td>
        <td>${j.employer}</td>
        <td>${j.location}</td>
        <td>${j.posted}</td>
        <td><a href="${j.link}" target="_blank">View</a></td>
      </tr>
    `;
  }
}
