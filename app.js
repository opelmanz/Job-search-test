//
// =============================
// CONFIG (ADD YOUR KEYS HERE)
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

//
// =============================
// FAKE DATA (kept for fallback/testing)
// =============================
//
const jobs = [
  {
    title: "Manufacturing Engineer",
    location: "Los Angeles, CA",
    skills: ["welding", "cad", "manufacturing"],
    postedDaysAgo: 2
  },
  {
    title: "Product Engineer",
    location: "Remote",
    skills: ["design", "systems", "cad"],
    postedDaysAgo: 10
  },
  {
    title: "Robotics Technician",
    location: "Los Angeles, CA",
    skills: ["robotics", "maintenance", "electronics"],
    postedDaysAgo: 5
  }
];

let results = [];

//
// =============================
// MAIN ENTRY
// =============================
//
async function runSearch() {
  const resumeText = document.getElementById("resume").value.toLowerCase();
  const locationInput = document.getElementById("location").value;
  const radius = parseInt(document.getElementById("radius").value) || 50;
  const recencyDays = parseInt(document.getElementById("recency").value) || 7;

  let allJobs = [...jobs];

  // Try to fetch real jobs (fails gracefully if API not set)
  try {
    const realJobs = await fetchRealJobs(locationInput || "Los Angeles", "engineering");
    allJobs = allJobs.concat(realJobs);
  } catch (err) {
    console.log("Real job fetch failed or not configured yet:", err);
  }

  // Score everything
  results = allJobs.map(job => ({
    ...job,
    score: scoreJob(job, resumeText, locationInput, radius, recencyDays)
  }));

  results.sort((a, b) => b.score - a.score);

  renderTable();
}

//
// =============================
// REAL JOB FETCH (ADZUNA)
// =============================
//
async function fetchRealJobs(location, query = "engineering") {
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
    skills: extractSkillsFromText(job.description || ""),
    postedDaysAgo: calculateDaysAgo(job.created)
  }));
}

//
// =============================
// SKILL EXTRACTION (simple baseline)
// =============================
//
function extractSkillsFromText(text) {
  const keywords = [
    "welding",
    "cad",
    "robotics",
    "manufacturing",
    "engineering",
    "mechanical",
    "python",
    "design",
    "systems",
    "electronics"
  ];

  const lower = text.toLowerCase();

  return keywords.filter(skill => lower.includes(skill));
}

//
// =============================
// DATE HANDLING
// =============================
//
function calculateDaysAgo(dateString) {
  const posted = new Date(dateString);
  const now = new Date();
  const diff = (now - posted) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

//
// =============================
// SCORING ENGINE
// =============================
//
function scoreJob(job, resumeText, locationInput, radius, recencyDays) {
  let score = 0;

  // Resume skill match
  job.skills.forEach(skill => {
    if (resumeText.includes(skill)) {
      score += 15;
    }
  });

  // Location match (basic)
  if (
    locationInput &&
    job.location.toLowerCase().includes(locationInput.toLowerCase())
  ) {
    score += 10;
  }

  // Radius (placeholder logic for now)
  if (radius >= 50) score += 2;
  if (radius >= 100) score += 4;

  // Recency scoring
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
    const row = `
      <tr>
        <td>${job.title}</td>
        <td>${job.location}</td>
        <td>${job.score}</td>
      </tr>
    `;
    tbody.innerHTML += row;
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
