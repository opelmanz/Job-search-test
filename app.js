//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

let results = [];

//
// =============================
// MAIN SEARCH
// =============================
//
async function runSearch() {
  const resumeText = document.getElementById("resume").value.toLowerCase();

  const skillsInput = document.getElementById("skills").value.toLowerCase();
  const userSkills = skillsInput
    ? skillsInput.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const locationInput = document.getElementById("location").value;
  const radius = parseInt(document.getElementById("radius").value) || 50;
  const recencyDays = parseInt(document.getElementById("recency").value) || 7;

  // -----------------------------
  // Resume-driven search query (neutral)
  // -----------------------------
  const searchQuery = extractResumeQuery(resumeText);

  let allJobs = [];

  // -----------------------------
  // Fetch real jobs (no domain bias)
  // -----------------------------
  try {
    const realJobs = await fetchRealJobs(
      locationInput || "Los Angeles",
      searchQuery
    );
    allJobs = allJobs.concat(realJobs);
  } catch (err) {
    console.log("API not used or failed:", err);
  }

  // -----------------------------
  // Score jobs
  // -----------------------------
  results = allJobs.map(job => ({
    ...job,
    score: scoreJob(job, resumeText, userSkills, locationInput, radius, recencyDays)
  }));

  results.sort((a, b) => b.score - a.score);

  renderTable();
}

//
// =============================
// NEUTRAL RESUME QUERY BUILDER
// (NO INDUSTRY ASSUMPTIONS)
// =============================
//
function extractResumeQuery(text) {
  if (!text) return "jobs";

  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  const words = cleaned.split(/\s+/).filter(Boolean);

  const stopWords = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","an","is","it","this","that","i","you","we","they",
    "was","were","be","as","are","from","or","have","has","had"
  ]);

  const filtered = words.filter(w => w.length > 2 && !stopWords.has(w));

  // take most frequent words (simple heuristic)
  const freq = {};
  filtered.forEach(w => {
    freq[w] = (freq[w] || 0) + 1;
  });

  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0]);

  return sorted[0] || "jobs";
}

//
// =============================
// REAL JOB FETCH
// =============================
//
async function fetchRealJobs(location, query) {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    throw new Error("Missing API keys");
  }

  const url =
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&results_per_page=10` +
    `&content-type=application/json`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results) return [];

  return data.results.map(job => ({
    title: job.title,
    location: job.location?.display_name || "Unknown",
    skills: [],
    postedDaysAgo: calculateDaysAgo(job.created)
  }));
}

//
// =============================
// DATE CALCULATION
// =============================
//
function calculateDaysAgo(dateString) {
  const posted = new Date(dateString);
  const now = new Date();
  return Math.floor((now - posted) / (1000 * 60 * 60 * 24));
}

//
// =============================
// SCORING ENGINE
// =============================
//
function scoreJob(job, resumeText, userSkills, locationInput, radius, recencyDays) {
  let score = 0;

  // manual skills (strong signal)
  userSkills.forEach(skill => {
    if (job.skills.includes(skill)) {
      score += 15;
    }
  });

  // resume text match (neutral)
  job.skills.forEach(skill => {
    if (resumeText.includes(skill)) {
      score += 10;
    }
  });

  // location match
  if (
    locationInput &&
    job.location.toLowerCase().includes(locationInput.toLowerCase())
  ) {
    score += 10;
  }

  // radius placeholder
  if (radius >= 50) score += 2;
  if (radius >= 100) score += 4;

  // recency
  if (job.postedDaysAgo <= recencyDays) {
    score += 8;
  } else {
    score -= 2;
  }

  return score;
}

//
// =============================
// RENDER RESULTS
// =============================
//
function renderTable() {
  const tbody = document.querySelector("#resultsTable tbody");
  tbody.innerHTML = "";

  results.forEach(job => {
    tbody.innerHTML += `
      <tr>
        <td>${job.title}</td>
        <td>${job.location}</td>
        <td>${job.score}</td>
      </tr>
    `;
  });
}

//
// =============================
// CSV EXPORT
// =============================
//
function downloadCSV() {
  let csv = "Title,Location,Score\n";

  results.forEach(job => {
    csv += `${job.title},${job.location},${job.score}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "job_results.csv";
  a.click();
}
