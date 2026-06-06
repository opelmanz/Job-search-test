//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
const ADZUNA_APP_ID = "YOUR_APP_ID";
const ADZUNA_APP_KEY = "YOUR_APP_KEY";

//
// =============================
// FAKE DATA (for fallback only)
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
// MAIN SEARCH
// =============================
//
async function runSearch() {
  const resumeText = document.getElementById("resume").value.toLowerCase();

  // NEW: manual skills input (your testing control knob)
  const skillsInput = document.getElementById("skills").value.toLowerCase();
  const userSkills = skillsInput
    ? skillsInput.split(",").map(s => s.trim())
    : [];

  const locationInput = document.getElementById("location").value;
  const radius = parseInt(document.getElementById("radius").value) || 50;
  const recencyDays = parseInt(document.getElementById("recency").value) || 7;

  let allJobs = [...jobs];

  // Try real jobs (safe fallback)
  try {
    const realJobs = await fetchRealJobs(locationInput || "Los Angeles", "engineering");
    allJobs = allJobs.concat(realJobs);
  } catch (err) {
    console.log("API not used or failed:", err);
  }

  results = allJobs.map(job => ({
    ...job,
    score: scoreJob(job, resumeText, userSkills, locationInput, radius, recencyDays)
  }));

  results.sort((a, b) => b.score - a.score);

  renderTable();
}

//
// =============================
// REAL JOB FETCH (NO SKILL GUESSING)
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

    // IMPORTANT CHANGE:
    // no fake skill extraction anymore
    skills: [],

    postedDaysAgo: calculateDaysAgo(job.created)
  }));
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
// SCORING ENGINE (CLEAN + CONTROLLED)
// =============================
//
function scoreJob(job, resumeText, userSkills, locationInput, radius, recencyDays) {
  let score = 0;

  // -----------------------------
  // 1. Manual skills input match (PRIMARY TEST SIGNAL)
  // -----------------------------
  userSkills.forEach(skill => {
    if (skill && job.skills.includes(skill)) {
      score += 15;
    }
  });

  // -----------------------------
  // 2. Resume keyword match (secondary signal)
  // -----------------------------
  if (resumeText) {
    job.skills.forEach(skill => {
      if (resumeText.includes(skill)) {
        score += 10;
      }
    });
  }

  // -----------------------------
  // 3. Location match (basic)
  // -----------------------------
  if (
    locationInput &&
    job.location.toLowerCase().includes(locationInput.toLowerCase())
  ) {
    score += 10;
  }

  // -----------------------------
  // 4. Radius (placeholder logic)
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
// RENDER RESULTS
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
