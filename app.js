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
  const recency = parseInt(document.getElementById("recency").value) || 7;

  const skills = parseSkills(skillsRaw);
  const query = buildQuery(skills);

  const requestInfo = {
    skills,
    query,
    location,
    radius,
    recency
  };

  document.getElementById("requestPreview").textContent =
    JSON.stringify(requestInfo, null, 2);

  try {
    const url = buildUrl(location, query, recency, radius);

    console.log("FETCH:", url);

    const data = await fetchJobs(url);

    // 🔥 HARD FILTER BY DISTANCE (REAL FIX)
    results = dedupe(filterByDistance(data, radius));

    console.log("TOTAL RESULTS (after filter):", results.length);

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
// API CALL
// =====================
//
async function fetchJobs(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  document.getElementById("debugOutput").textContent =
    JSON.stringify(data, null, 2);

  if (!data.results) return [];

  return data.results;
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

    // If no coordinates, keep it (can't evaluate)
    if (!lat || !lon) return true;

    const distance = haversineMiles(LA_LAT, LA_LON, lat, lon);

    return distance <= radiusMiles;
  });
}

//
// Haversine formula
//
function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

//
// =====================
// URL BUILDER
// =====================
//
function buildUrl(location, query, recency, radius) {
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
    const key = j.title + j.company?.display_name + j.location?.display_name;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

//
// =====================
// RENDER
// =====================
//
function render() {
  const tbody = document.querySelector("#resultsTable tbody");

  tbody.innerHTML = "";

  for (const job of results) {
    tbody.innerHTML += `
      <tr>
        <td>${job.title}</td>
        <td>${job.company?.display_name || "Unknown"}</td>
        <td>${job.location?.display_name || "Unknown"}</td>
        <td>${job.created ? new Date(job.created).toLocaleDateString() : ""}</td>
        <td><a href="${job.redirect_url}" target="_blank">View</a></td>
      </tr>
    `;
  }
}
