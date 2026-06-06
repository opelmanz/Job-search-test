//
// -----------------------------
// Fake job dataset (we'll replace with real APIs later)
// -----------------------------
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
// -----------------------------
// MAIN SEARCH FUNCTION
// -----------------------------
//
function runSearch() {
  const resumeText = document.getElementById("resume").value.toLowerCase();
  const locationInput = document.getElementById("location").value.toLowerCase();
  const radius = parseInt(document.getElementById("radius").value);
  const recencyDays = parseInt(document.getElementById("recency").value);

  results = jobs.map(job => ({
    ...job,
    score: scoreJob(job, resumeText, locationInput, radius, recencyDays)
  }));

  results.sort((a, b) => b.score - a.score);

  renderTable();
}

//
// -----------------------------
// SCORING ENGINE
// -----------------------------
//
function scoreJob(job, resumeText, locationInput, radius, recencyDays) {
  let score = 0;

  // -----------------------------
  // 1. Resume skill matching
  // -----------------------------
  job.skills.forEach(skill => {
    if (resumeText.includes(skill)) {
      score += 15;
    }
  });

  // -----------------------------
  // 2. Location matching (simple version for now)
  // -----------------------------
  if (locationInput && job.location.toLowerCase().includes(locationInput)) {
    score += 10;
  }

  // -----------------------------
  // 3. Radius bonus (placeholder logic for now)
  //    (we'll make this real geo-distance later)
  // -----------------------------
  if (radius >= 50) score += 2;
  if (radius >= 100) score += 4;

  // -----------------------------
  // 4. Recency scoring
  // -----------------------------
  if (job.postedDaysAgo <= recencyDays) {
    score += 8;
  } else {
    // small penalty for older jobs outside range
    score -= 2;
  }

  return score;
}

//
// -----------------------------
// TABLE RENDERING
// -----------------------------
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
// -----------------------------
// CSV EXPORT
// -----------------------------
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
