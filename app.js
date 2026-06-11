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

document.getElementById("debugBanner").textContent = "API MUSE category select all button V2";
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
  const minSalary = parseInt(document.getElementById("minSalary").value) || 0;
  const skills = parseSkills(skillsRaw);
  const museCategories = getSelectedCategories();

  const adzunaEnabled = document.getElementById("enableAdzuna").checked;
  const museEnabled = document.getElementById("enableMuse").checked;

  document.getElementById("requestPreview").textContent =
    JSON.stringify(
      {
        skills,
        location,
        radius,
        recency,
        minSalary,
        museCategories,
        adzunaEnabled,
        museEnabled
      },
      null,
      2
    );

  try {
    let allRawJobs = [];

    // ---- ADZUNA ----
    if (adzunaEnabled) {
      if (skills.length === 0) {
        const url = buildAdzunaUrl(location, "", recency, minSalary);
        console.log("ADZUNA FETCH:", url);
        const raw = await fetchAdzunaJobs(url);
        allRawJobs.push(...raw.map(job => normalizeAdzunaJob(job)));
      } else {
        for (const skill of skills) {
          const url = buildAdzunaUrl(location, skill, recency, minSalary);
          console.log("ADZUNA FETCH:", url);
          const raw = await fetchAdzunaJobs(url);
          allRawJobs.push(...raw.map(job => normalizeAdzunaJob(job)));
        }
      }
    }

    // ---- MUSE ----
    if (museEnabled) {
      if (museCategories.length === 0) {
        const url = buildMuseUrl(location, "");
        console.log("MUSE FETCH (broad):", url);
        const raw = await fetchMuseJobs(url);
        allRawJobs.push(...raw.map(job => normalizeMuseJob(job)));
      } else {
        for (const category of museCategories) {
          const url = buildMuseUrl(location, category);
          console.log("MUSE FETCH:", url);
          const raw = await fetchMuseJobs(url);
          allRawJobs.push(...raw.map(job => normalizeMuseJob(job)));
        }
      }
    }

    // STEP 1: filter + dedupe
    results = dedupe(
      filterByDistance(allRawJobs, radius)
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
// ADZUNA NORMALIZATION
// =====================
//
function normalizeAdzunaJob(job) {
  return {
    title: job.title,
    company: job.company?.display_name || "Unknown",
    location: job.location?.display_name || "Unknown",
    lat: job.location?.latitude,
    lon: job.location?.longitude,
    created: job.created,
    link: job.redirect_url,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    source: "Adzuna"
  };
}

//
// =====================
// MUSE NORMALIZATION
// =====================
//
function normalizeMuseJob(job) {
  const locationName = job.locations?.[0]?.name || "Unknown";
  return {
    title: job.name || "Unknown",
    company: job.company?.name || "Unknown",
    location: locationName,
    lat: null,
    lon: null,
    created: job.publication_date,
    link: job.refs?.landing_page || "#",
    salary_min: null,
    salary_max: null,
    source: "Muse"
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
// ADZUNA API
// =====================
//
async function fetchAdzunaJobs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);
  const data = await res.json();
  document.getElementById("debugOutput").textContent =
    JSON.stringify(data, null, 2);
  return data.results || [];
}

//
// =====================
// MUSE API
// =====================
//
async function fetchMuseJobs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Muse HTTP ${res.status}`);
  const data = await res.json();
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
// ADZUNA URL
// =====================
//
function buildAdzunaUrl(location, query, recency, minSalary) {
  return (
    `https://api.adzuna.com/v1/api/jobs/us/search/1` +
    `?app_id=${ADZUNA_APP_ID}` +
    `&app_key=${ADZUNA_APP_KEY}` +
    `&what=${encodeURIComponent(query)}` +
    `&where=${encodeURIComponent(location)}` +
    `&max_days_old=${recency}` +
    `&results_per_page=50` +
    (minSalary ? `&salary_min=${minSalary}` : ``)
  );
}

//
// =====================
// MUSE URL
// =====================
//
function buildMuseUrl(location, category) {
  const cityOnly = location.split(",")[0].trim();
  let url =
    `https://www.themuse.com/api/public/jobs?page=0` +
    `&location=${encodeURIComponent(cityOnly)}`;
  if (category) {
    url += `&category=${encodeURIComponent(category)}`;
  }
  return url;
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
    if (seen.has(key)) return false;
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
  if (min != null) return `${format(min)}+`;
  if (max != null) return `Up to ${format(max)}`;
  return "Not listed";
}

function cleanSalary(val) {
  if (val == null) return null;
  if (typeof val === "string") {
    val = val.replace(/\$/g, "").replace(/,/g, "").trim();
  }
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

//
// =====================
// CATEGORY DROPDOWN
// =====================
//
function toggleCategoryDropdown() {
  const list = document.getElementById("categoryDropdownList");
  list.style.display = list.style.display === "none" ? "block" : "none";
}

function getSelectedCategories() {
  const checkboxes = document.querySelectorAll(
    "#categoryDropdownList input[type='checkbox']:checked"
  );
  return Array.from(checkboxes).map(cb => cb.value);
}

function updateCategoriesSelected() {
  const selected = getSelectedCategories();
  const box = document.getElementById("categoriesSelected");
  if (selected.length === 0) {
    box.style.color = "#888";
    box.textContent =
      "Failure to select MUSE category may lead to poor search results";
  } else {
    box.style.color = "#000";
    box.textContent = selected.join(", ");
  }
}

function toggleSelectAll(checkbox) {
  const allBoxes = document.querySelectorAll(
    "#categoryDropdownList input[type='checkbox']"
  );
  allBoxes.forEach(cb => {
    if (cb.id !== "selectAllCategories") {
      cb.checked = checkbox.checked;
    }
  });
  updateCategoriesSelected();
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
        <td>${job.source || ""}</td>
      </tr>
    `;
  }
}
