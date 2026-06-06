//
// =============================
// CONFIG (OPTIONAL API KEYS)
// =============================
//
//const ADZUNA_APP_ID = "5df668db";
//const ADZUNA_APP_KEY = "3a8ebf8494b25d4ee83289b29fb84393";

//let results = [];

console.log("APP JS LOADED ✔");

window.onload = function () {
  console.log("WINDOW LOADED ✔");

  const btn = document.querySelector("button");

  if (!btn) {
    console.error("BUTTON NOT FOUND ❌");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("BUTTON CLICKED ✔");

    const skills = document.getElementById("skills")?.value;
    const location = document.getElementById("location")?.value;
    const radius = document.getElementById("radius")?.value;

    console.log("INPUT VALUES:", { skills, location, radius });

    document.getElementById("requestPreview").textContent =
      "JS IS WORKING ✔\n\n" +
      JSON.stringify({ skills, location, radius }, null, 2);
  });
};
