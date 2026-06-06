//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
const ADZUNA_APP_ID = "5df668db";
const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

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
  const location = document.getElementById("location").value || "Los Angeles";
  const radius = parseInt(document.getElementById("radius").value) || 0;
  const recency = parseInt(document.getElementById("recency").value) || 7;

  const skills = parseSkills(skillsRaw);
  const query = buildQuery(skills);
  const locations = expandLocation(location, radius);

  const requestInfo = {
    skills,
    query,
    baseLocation: location,
    radius,
    expandedLocations: locations,
    recency
  };

  console.log("REQUEST:", requestInfo);

  document.getElementById("requestPreview").textContent =
    JSON.stringify(requestInfo, null, 2);

  let allResults = [];

  try {
    for (const loc of locations) {
      const url = buildUrl(loc, query, recency);
      console.log("FETCH:", url);

      const data = await fetchJobs(url);
      allResults = allResults.concat(data);
    }

    results = dedupe(allResults);

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
// DISTANCE EXPANSION
// =====================
//
function expandLocation(base, radius) {
  if (!radius || radius <= 0) return [base];

  const loc = base.toLowerCase();

  const map = {
    "los angeles": [
      "Los Angeles",
      "Long Beach",
      "Pasadena",
      "Glendale",
      "Anaheim",
      "Santa Monica"
    ],
    "new york": [
      "New York",
      "Brooklyn",
      "Jersey City",
      "Newark"
    ],
    "san francisco": [
      "San Francisco",
      "Oakland",
      "Berkeley",
      "San Jose"
    ]
  };

  for (const key in map) {
    if (loc.includes(key)) return map[key];
  }

  return [base];
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

  return data.results.map(job => ({
    title: job.title,
    employer: job.company?.display_name || "Unknown",
    location: job.location?.display_name || "Unknown",
    posted: job.created
      ? new Date(job.created).toLocaleDateString()
      : "Unknown",
    link: job.redirect_url || "#"
  }));
}

//
// =====================
// URL BUILDER
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
    `&results_per_page=10`
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
    const key = j.title + j.employer + j.location;
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
        <td>${job.employer}</td>
        <td>${job.location}</td>
        <td>${job.posted}</td>
        <td><a href="${job.link}" target="_blank">View</a></td>
      </tr>
    `;
  }
}
