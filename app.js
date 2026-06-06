//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

let results = [];

//
// =====================
// ENTRY
// =====================
//
async function runSearch() {
  console.log("RUN SEARCH");

  const resume = document.getElementById("resume").value || "";
  const skillsRaw = document.getElementById("skills").value || "";
  const location = document.getElementById("location").value || "Los Angeles";
  const recency = parseInt(document.getElementById("recency").value) || 7;

  const skills = skillsRaw
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const query = buildQuery(resume, skills);

  console.log("QUERY:", query);

  const jobs = await fetchJobs(location, query, recency);

  results = jobs;

  render();
}

//
// =====================
// QUERY BUILD
// =====================
//
function buildQuery(resume, skills) {
  const resumeWords = extractWords(resume);
  return [...skills, resumeWords].filter(Boolean).join(" ");
}

//
// =====================
// RESUME PARSER
// =====================
//
function extractWords(text) {
  if (!text) return "";

  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/);

  const stop = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","is","it","this","that","was","were","be","as","are"
  ]);

  return words
    .filter(w => w && w.length > 2 && !stop.has(w))
    .slice(0, 40)
    .join(" ");
}

//
// =====================
// API
// =====================
//
async function fetchJobs(location, query, recency) {
  console.log("FETCH API");

  const url =
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&max_days_old=${recency}` +
    `&results_per_page=10`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("API DATA:", data);

  // ALWAYS WRITE DEBUG (no failure possible)
  document.getElementById("debugOutput").textContent =
    JSON.stringify(data, null, 2);

  if (!data.results) return [];

  return data.results.map(j => ({
    title: j.title,
    employer: j.company?.display_name || "Unknown",
    location: formatLocation(j.location?.display_name || ""),
    posted: new Date(j.created).toLocaleDateString(),
    link: j.redirect_url
  }));
}

//
// =====================
// LOCATION FIX
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
// RENDER
// =====================
//
function render() {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  results.forEach(j => {
    const row = `
      <tr>
        <td>${j.title}</td>
        <td>${j.employer}</td>
        <td>${j.location}</td>
        <td>${j.posted}</td>
        <td><a href="${j.link}" target="_blank">View</a></td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}
