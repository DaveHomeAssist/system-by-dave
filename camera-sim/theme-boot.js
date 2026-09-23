// Applies the FMP suite theme preference (localStorage "fmpTheme") before first paint.
// A first visit is light; "auto" follows the system. The app keeps it in sync afterwards.
(function () {
  var preference = "light";
  try {
    var stored = window.localStorage.getItem("fmpTheme");
    if (stored === "light" || stored === "dark" || stored === "auto") preference = stored;
  } catch (error) {
    preference = "light";
  }
  var dark = preference === "dark" || (preference === "auto" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
