//
// =============================
// CONFIG
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

const LA_LAT = 34.0522;
const LA_LON = -118.2437;

let results = [];

console.log("APP JS LOADED ✔");

window.runSearch = runSearch;

//
// =====================
// MAIN
// =====================
//
async function runSearch() {
  console.log("SEARCH STARTED ✔");

  const skillsRaw = document.getElementById("skills").value || "";
  const location = document.getElementById("location").value || "Los Angeles, CA";
  const radius = parseInt(document.getElementById("radius").value) || 25;
  const recency = parseInt(document.getElementById("recency").value) || 2;

  const skills = parseSkills(skillsRaw);
  const query = buildQuery(skills);

  document.getElementById("requestPreview").textContent =
    JSON.stringify({ skills, query, location, radius, recency }, null, 2);

  try {
    const url = buildUrl(location, query, recency);

    console.log("FETCH:", url);

    const data = await fetchJobs(url);

    results = dedupe(filterByDistance(data, radius));

    console.log("TOTAL RESULTS:", results.length);

  } catch (err) {
    console.error("API ERROR:", err);
    results = [];
  }

  render();
}

//
// =====================
// SKILLS
// =====================
//
function parseSkills(input) {
  return input
    .toLowerCase()
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function buildQuery(skills) {
  return skills.slice(0, 8).join(" ");
}

//
// =====================
// API
// =====================
//
async function fetchJobs(url) {
  const res = await fetch(url);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();

  document.getElementById("debugOutput").textContent =
    JSON.stringify(data, null, 2);

  return data.results || [];
}

//
// =====================
// DISTANCE FILTER
// =====================
//
function filterByDistance(jobs, radiusMiles) {
  return jobs.filter(job => {
    const lat = job.location?.latitude;
    const lon = job.location?.longitude;

    if (!lat || !lon) return true;

    const d = haversineMiles(LA_LAT, LA_LON, lat, lon);
    return d <= radiusMiles;
  });
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function toRad(v) {
  return (v * Math.PI) / 180;
}

//
// =====================
// URL
// =====================
//
function buildUrl(location, query, recency) {
  return (
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&max_days_old=${recency}` +
    `&results_per_page=50`
  );
}

//
// =====================
// DEDUPE
// =====================
//
function dedupe(jobs) {
  const seen = new Set();

  return jobs.filter(j => {
    const key =
      (j.title || "") +
      (j.company?.display_name || "") +
      (j.location?.display_name || "");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

//
// =====================
// SALARY (FIXED + ROBUST)
// =====================
//
function formatSalary(job) {
  const min = job.salary_min;
  const max = job.salary_max;

  // Adzuna often returns NOTHING for US jobs
  if (min == null && max == null) {
    return "Not listed";
  }

  if (min != null && max != null) {
    return `$${Number(min).toLocaleString()} - $${Number(max).toLocaleString()}`;
  }

  if (min != null) return `$${Number(min).toLocaleString()}+`;

  if (max != null) return `Up to $${Number(max).toLocaleString()}`;

  return "Not listed";
}

//
// =====================
// RENDER (MATCHES YOUR TABLE ORDER)
// =====================
//
function render() {
  const tbody = document.querySelector("#resultsTable tbody");

  tbody.innerHTML = "";

  for (const job of results) {
    const salary = formatSalary(job);

    tbody.innerHTML += `
      <tr>
        <td title="${job.title}">
          ${job.title.length > 60 ? job.title.slice(0, 60) + "..." : job.title}
        </td>
        <td>${job.company?.display_name || "Unknown"}</td>
        <td>${job.location?.display_name || "Unknown"}</td>
        <td>${salary}</td>
        <td>${job.created ? new Date(job.created).toLocaleDateString() : ""}</td>
        <td><a href="${job.redirect_url}" target="_blank">View</a></td>
      </tr>
    `;
  }
}
