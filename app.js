// -----------------------------
// Fake job dataset (replace later with API)
// -----------------------------
const jobs = [
  {
    title: "Manufacturing Engineer",
    location: "Los Angeles",
    skills: ["welding", "cad", "manufacturing"]
  },
  {
    title: "Product Engineer",
    location: "Remote",
    skills: ["design", "systems", "cad"]
  },
  {
    title: "Robotics Technician",
    location: "Los Angeles",
    skills: ["robotics", "maintenance", "electronics"]
  }
];

let results = [];

// -----------------------------
// Scoring function
// -----------------------------
function scoreJob(job, userSkills, userLocation) {
  let score = 0;

  job.skills.forEach(skill => {
    if (userSkills.includes(skill)) {
      score += 10;
    }
  });

  if (job.location.toLowerCase() === userLocation.toLowerCase()) {
    score += 5;
  }

  return score;
}

// -----------------------------
// Run search
// -----------------------------
function runSearch() {
  const skillsInput = document.getElementById("skills").value;
  const locationInput = document.getElementById("location").value;

  const userSkills = skillsInput
    .toLowerCase()
    .split(",")
    .map(s => s.trim());

  results = jobs.map(job => ({
    ...job,
    score: scoreJob(job, userSkills, locationInput)
  }));

  results.sort((a, b) => b.score - a.score);

  renderTable();
}

// -----------------------------
// Render table
// -----------------------------
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

// -----------------------------
// CSV export
// -----------------------------
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
