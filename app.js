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
// QUERY BUILDER
// =============================
//
function buildQuery(resumeText, skills) {
  const resumeSignal = extractResumeKeywords(resumeText);
  const skillSignal = skills.join(" ");

  return [skillSignal, resumeSignal]
    .filter(Boolean)
    .join(" ")
    .trim() || "jobs";
}

//
// =============================
// RESUME KEYWORD EXTRACTION
// =============================
//
function extractResumeKeywords(text) {
  if (!text) return "";

  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);

  const stopWords = new Set([
    "the","and","to","of","in","a","for","with","on","at",
    "by","an","is","it","this","that","i","you","we","they",
    "was","were","be","as","are","from","or","have","has","had"
  ]);

  const filtered = words.filter(w => w.length > 2 && !stopWords.has(w));

  // keep more signal without truncating too aggressively
  return filtered.slice(0, 40).join(" ");
}

//
// =============================
// API CALL
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
// FIXED LOCATION PARSER (IMPORTANT FIX)
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

  let city = parts[0] || "";
  let state = "";

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i].toLowerCase().trim();

    // already abbreviation
    if (/^[a-z]{2}$/.test(p)) {
      state = p.toUpperCase();
      break;
    }

    // full state name
    if (US_STATES[p]) {
      state = US_STATES[p];
      break;
    }
  }

  return state ? `${city}, ${state}` : city;
}

//
// =============================
// DATE FORMAT
// =============================
//
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
