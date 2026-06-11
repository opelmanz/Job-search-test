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

document.getElementById("debugBanner").textContent = "reformatting page";
console.log("APP JS LOADED ✔");

window.runSearch = runSearch;

//
// =============================
// MAIN FLOW
// =============================
//
async function runSearch() {
  console.log("SEARCH STARTED ✔");

  const skillsRaw = document.getElementById("skills").value || "";
  const location = document.getElementById("location").value || "Los Angeles, CA";
  const radius = parseInt(document.getElementById("radius").value) || 25;
  const recency = parseInt(document.getElementById("recency").value) || 2;

  const skills = parseSkills(skillsRaw);

  document.getElementById("requestPreview").textContent =
    JSON.stringify(
      {
        skills,
        location,
        radius,
        recency
      },
      null,
      2
    );

  try {
    let allRawJobs = [];

    // If no skills entered, do one broad search
    if (skills.length === 0) {
      const url = buildUrl(location, "", recency);

      console.log("FETCH:", url);

      const raw = await fetchJobs(url);

      allRawJobs.push(...raw);
    } else {
      // One search per skill/title = OR behavior
      for (const skill of skills) {
        const url = buildUrl(location, skill, recency);

        console.log("FETCH:", url);

        const raw = await fetchJobs(url);

        allRawJobs.push(...raw);
      }
    }

    // STEP 1: normalize EVERYTHING
    const normalized = allRawJobs.map(normalizeJob);

    // STEP 2: filter + dedupe
    results = dedupe(
      filterByDistance(normalized, radius)
    );

    console.log("TOTAL RESULTS:", results.length);
  } catch (err) {
    console.error("API ERROR:", err);
    results = [];
  }

  render();
}

//
// =====================
// NORMALIZATION LAYER
// =====================
//
function normalizeJob(job) {
  return {
    title: job.title,
    company: job.company?.display_name || "Unknown",
    location: job.location?.display_name || "Unknown",
    lat: job.location?.latitude,
    lon: job.location?.longitude,
    created: job.created,
    link: job.redirect_url,

    // preserve raw salary fields
    salary_min: job.salary_min,
    salary_max: job.salary_max
  };
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

//
// =====================
// API
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

  return data.results || [];
}

//
// =====================
// DISTANCE FILTER
// =====================
//
function filterByDistance(jobs, radiusMiles) {
  return jobs.filter(job => {
    if (job.lat == null || job.lon == null) {
      return true;
    }

    const d = haversineMiles(
      LA_LAT,
      LA_LON,
      job.lat,
      job.lon
    );

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

  return jobs.filter(job => {
    const key =
      job.title +
      "|" +
      job.company +
      "|" +
      job.location;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

//
// =====================
// SALARY DISPLAY
// =====================
//
function formatSalary(job) {
  let min = cleanSalary(job.salary_min);
  let max = cleanSalary(job.salary_max);

  if (min == null && max == null) {
    return "Not listed";
  }

  const format = value =>
    `$${Number(value).toLocaleString()}`;

  if (min != null && max != null) {
    return `${format(min)} - ${format(max)}`;
  }

  if (min != null) {
    return `${format(min)}+`;
  }

  if (max != null) {
    return `Up to ${format(max)}`;
  }

  return "Not listed";
}

function cleanSalary(val) {
  if (val == null) {
    return null;
  }

  if (typeof val === "string") {
    val = val
      .replace(/\$/g, "")
      .replace(/,/g, "")
      .trim();
  }

  const num = parseFloat(val);

  return isNaN(num) ? null : num;
}

//
// =====================
// RENDER
// =====================
//
function render() {
  const tbody =
    document.querySelector("#resultsTable tbody");

  tbody.innerHTML = "";

  for (const job of results) {
    const salary = formatSalary(job);

    tbody.innerHTML += `
      <tr>
        <td title="${job.title}">
          ${
            job.title.length > 60
              ? job.title.slice(0, 60) + "..."
              : job.title
          }
        </td>
        <td>${job.company}</td>
        <td>${job.location}</td>
        <td>${salary}</td>
        <td>${
          job.created
            ? new Date(job.created).toLocaleDateString()
            : ""
        }</td>
        <td>
          <a href="${job.link}" target="_blank">
            View
          </a>
        </td>
      </tr>
    `;
  }
}
