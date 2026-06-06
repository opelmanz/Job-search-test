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
  // Build search query (resume + skills)
  // -----------------------------
  const searchQuery = buildQuery(resumeText, userSkills);

  let allJobs = [];

  try {
    const jobs = await fetchRealJobs(
      locationInput || "Los Angeles",
      searchQuery,
      recencyDays
    );

    allJobs = allJobs.concat(jobs);
  } catch (err) {
    console.log("API failed:", err);
  }

  results = allJobs;

  renderTable();
}

//
// =============================
// BUILD QUERY FROM RESUME + SKILLS
// =============================
//
function buildQuery(resumeText, skills) {
  const resumeQuery = extractWords(resumeText);
  const skillsQuery = skills.join(" ");

  return [resumeQuery, skillsQuery]
    .filter(Boolean)
    .join(" ")
    .trim() || "jobs";
}

//
// =============================
// SIMPLE TEXT PARSER
// =============================
//
function extractWords(text) {
  if (!text) return "";

  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);

  const stopWords = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","an","is","it","this","that","i","you","we","they",
    "was","were","be","as","are","from","or","have","has","had"
  ]);

  return words
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5)
    .join(" ");
}

//
// =============================
// ADZUNA API CALL (RECENCY FIXED)
// =============================
//
async function fetchRealJobs(location, query, recencyDays) {
  const url =
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&max_days_old=${recencyDays}` +
    `&results_per_page=10` +
    `&content-type=application/json`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("ADZUNA RESPONSE:", data);

  if (!data.results) return [];

  return data.results.map(job => {
    return {
      title: job.title,
      employer: job.company?.display_name || "Unknown",
      location: formatLocation(job.location?.display_name || ""),
      posted: formatDate(job.created),
      link: job.redirect_url || "#"
    };
  });
}

//
// =============================
// FORMAT LOCATION (City, ST)
// =============================
//
function formatLocation(str) {
  if (!str) return "Unknown";

  const parts = str.split(",");

  const city = parts[0]?.trim() || "";
  const state = parts[1]?.trim()?.slice(0, 2)?.toUpperCase() || "";

  return state ? `${city}, ${state}` : city;
}

//
// =============================
// FORMAT DATE
// =============================
//
function formatDate(dateStr) {
  if (!dateStr) return "Unknown";

  const d = new Date(dateStr);
  return d.toLocaleDateString();
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
        <td>${job.employer}</td>
        <td>${job.location}</td>
        <td>${job.posted}</td>
        <td><a href="${job.link}" target="_blank">View</a></td>
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
  let csv = "Title,Employer,Location,Posted,Link\n";

  results.forEach(job => {
    csv += `${job.title},${job.employer},${job.location},${job.posted},${job.link}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "jobs.csv";
  a.click();
}
