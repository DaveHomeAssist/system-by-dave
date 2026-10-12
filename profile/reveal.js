// Profile contact controls. The shared public reader owns layout and deep links.
(function () {
  "use strict";

  /* ---------------- Copy to clipboard (CSP-safe, no inline handlers) ---------------- */
  var status = document.getElementById("copy-status");
  document.querySelectorAll(".copy-btn").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      function confirm() {
        btn.textContent = "Copied ✓";
        btn.setAttribute("data-copied", "true");
        if (status) { status.textContent = text + " copied to clipboard"; }
        window.setTimeout(function () {
          btn.textContent = label;
          btn.removeAttribute("data-copied");
        }, 1600);
      }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) { /* no-op */ }
        document.body.removeChild(ta);
        confirm();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(confirm).catch(fallback);
      } else {
        fallback();
      }
    });
  });

})();
