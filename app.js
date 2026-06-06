//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
//const ADZUNA_APP_ID = "5df668db";
//const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

//let results = [];

console.log("APP JS LOADED ✔");

// run immediately when script loads
setup();

function setup() {
  console.log("SETUP RUNNING ✔");

  const btn = document.querySelector("button");
  const skills = document.getElementById("skills");
  const location = document.getElementById("location");
  const radius = document.getElementById("radius");
  const preview = document.getElementById("requestPreview");

  console.log("ELEMENT CHECK:", {
    btn: !!btn,
    skills: !!skills,
    location: !!location,
    radius: !!radius,
    preview: !!preview
  });

  if (!btn) {
    console.error("BUTTON NOT FOUND ❌");
    return;
  }

  btn.onclick = function () {
    console.log("BUTTON CLICKED ✔");

    const data = {
      skills: skills?.value || "",
      location: location?.value || "",
      radius: radius?.value || ""
    };

    console.log("FORM DATA:", data);

    if (preview) {
      preview.textContent =
        "WORKING ✔\n\n" +
        JSON.stringify(data, null, 2);
    }
  };
}
