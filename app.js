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
  const resumeText = document.getElementById("resume").value;
  const skillsInput = document.getElementById("skills").value.toLowerCase();

  const userSkills = skillsInput
    ? skillsInput.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const locationInput = document.getElementById("location").value;
  const recencyDays = parseInt(document.getElementById("recency").value) || 7;

  const searchQuery = buildQuery(resumeText, userSkills);

  let allJobs = [];

  try {
    const jobs = await fetchRealJobs(
      locationInput || "Los Angeles",
      searchQuery,
      recencyDays
    );

    allJobs = jobs;
  } catch (err) {
    console.log("API failed:", err);
  }

  results = allJobs;

  renderTable();
}

//
// =============================
// QUERY BUILDER (UPDATED)
// =============================
//
function buildQuery(resumeText, skills) {
  const skillSignal = buildSkillSignal(skills);
  const resumeSignal = extractResumeSignals(resumeText);

  return [skillSignal, resumeSignal]
    .filter(Boolean)
    .join(" ")
    .trim() || "jobs";
}

//
// =============================
// SKILLS (HIGHEST PRIORITY)
// =============================
//
function buildSkillSignal(skills) {
  // keep full user input as strongest signal
  return skills.join(" ");
}

//
// =============================
// RESUME SIGNAL EXTRACTION
// =============================
//
function extractResumeSignals(text) {
  if (!text) return "";

  const sections = splitIntoSections(text);

  const recentRoles = extractRecentRoles(sections);
  const resumeKeywords = extractKeywords(text, 40);

  return [
    recentRoles,
    resumeKeywords
  ]
    .filter(Boolean)
    .join(" ");
}

//
// =============================
// SPLIT INTO ROUGH "POSITIONS"
// =============================
// (heuristic, not perfect but useful)
// =============================
//
function splitIntoSections(text) {
  // try splitting by common resume delimiters
  return text
    .split(/\n(?=[A-Z][a-z]+\s|Experience|EXPERIENCE|Work|WORK|Employment)/)
    .slice(0, 5);
}

//
// =============================
// EXTRACT RECENT ROLES
// =============================
//
function extractRecentRoles(sections) {
  return sections
    .slice(0, 5)
    .map(sec => extractKeywords(sec, 10))
    .join(" ");
}

//
// =============================
// KEYWORD EXTRACTION
// =============================
//
function extractKeywords(text, limit) {
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);

  const stopWords = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","an","is","it","this","that","i","you","we","they",
    "was","were","be","as","are","from","or","have","has","had"
  ]);

  const filtered = words.filter(w => w.length > 2 && !stopWords.has(w));

  return filtered.slice(0, limit).join(" ");
}

//
// =============================
// API
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

  if (!data.results) return [];

  return data.results.map(job => ({
    title: job.title,
    employer: job.company?.display_name || "Unknown",
    location: formatLocation(job.location?.display_name || ""),
    posted: formatDate(job.created),
    link: job.redirect_url || "#"
  }));
}

//
// =============================
// FORMAT HELPERS
// =============================
//
function formatLocation(str) {
  if (!str) return "Unknown";

  const US_STATES = {
    "alabama":"AL","alaska":"AK","arizona":"AZ","arkansas":"AR","california":"CA",
    "colorado":"CO","connecticut":"CT","delaware":"DE","florida":"FL","georgia":"GA",
    "hawaii":"HI","idaho":"ID","illinois":"IL","indiana":"IN","iowa":"IA",
    "kansas":"KS","kentucky":"KY","louisiana":"LA","maine":"ME","maryland":"MD",
    "massachusetts":"MA","michigan":"MI","minnesota":"MN","mississippi":"MS",
    "missouri":"MO","montana":"MT","nebraska":"NE","nevada":"NV","new hampshire":"NH",
    "new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC",
    "north dakota":"ND","ohio":"OH","oklahoma":"OK","oregon":"OR","pennsylvania":"PA",
    "rhode island":"RI","south carolina":"SC","south dakota":"SD","tennessee":"TN",
    "texas":"TX","utah":"UT","vermont":"VT","virginia":"VA","washington":"WA",
    "west virginia":"WV","wisconsin":"WI","wyoming":"WY"
  };

  const parts = str.split(",").map(p => p.trim());

  const city = parts[0] || "";

  let state = "";

  if (parts[1]) {
    const raw = parts[1].toLowerCase().trim();

    // already abbreviation (CA, NY, etc.)
    if (raw.length === 2) {
      state = raw.toUpperCase();
    } else {
      state = US_STATES[raw] || "";
    }
  }

  return state ? `${city}, ${state}` : city;
}

function formatDate(dateStr) {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString();
}

//
// =============================
// TABLE RENDER
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
