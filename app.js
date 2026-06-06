//
// =============================
// CONFIG (ADD API KEYS)
// =============================
//
const ADZUNA_APP_ID = "YOUR_APP_ID";
const ADZUNA_APP_KEY = "YOUR_APP_KEY";

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
  // 1. Build search query from resume (simple parsing)
  // -----------------------------
  const resumeKeywords = extractResumeKeywords(resumeText);

  // Use first keyword as primary query (simple but effective baseline)
  const searchQuery = resumeKeywords[0] || "jobs";

  let allJobs = [];

  // -----------------------------
  // 2. Fetch real jobs (NO engineering bias anymore)
  // -----------------------------
  try {
    const realJobs = await fetchRealJobs(locationInput || "Los Angeles", searchQuery);
    allJobs = allJobs.concat(realJobs);
  } catch (err) {
    console.log("API not used or failed:", err);
  }

  // -----------------------------
  // 3. Score jobs
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
// BASIC RESUME PARSER (VERY SIMPLE v1)
// =============================
//
function extractResumeKeywords(text) {
  if (!text) return [];

  // Lightweight keyword extraction (NOT AI yet)
  const keywords = [
    "engineer",
    "mechanical",
    "manufacturing",
    "robotics",
    "welding",
    "cad",
    "design",
    "systems",
    "electronics",
    "software",
    "python"
  ];

  return keywords.filter(k => text.includes(k));
}

//
// =============================
// REAL JOB FETCH (NO FIXED DOMAIN BIAS)
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
    skills: [], // intentionally empty for now
    postedDaysAgo: calculateDaysAgo(job.created)
  }));
}

//
// =============================
// DATE HELPERS
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

  // -----------------------------
  // 1. Manual skills (strongest signal for testing)
  // -----------------------------
  userSkills.forEach(skill => {
    if (job.skills.includes(skill)) {
      score += 15;
    }
  });

  // -----------------------------
  // 2. Resume keyword match (improved signal)
  // -----------------------------
  job.skills.forEach(skill => {
    if (resumeText.includes(skill)) {
      score += 10;
    }
  });

  // -----------------------------
  // 3. Location match
  // -----------------------------
  if (
    locationInput &&
    job.location.toLowerCase().includes(locationInput.toLowerCase())
  ) {
    score += 10;
  }

  // -----------------------------
  // 4. Radius (still placeholder)
  // -----------------------------
  if (radius >= 50) score += 2;
  if (radius >= 100) score += 4;

  // -----------------------------
  // 5. Recency filter
  // -----------------------------
  if (job.postedDaysAgo <= recencyDays) {
    score += 8;
  } else {
    score -= 2;
  }

  return score;
}

//
// =============================
// RENDER TABLE
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
