// Interaction + motion controller.
// Copy-to-clipboard runs always. Motion runs only if GSAP loaded (progressive
// enhancement: if GSAP is blocked/missing, CSS keeps all content visible).
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

  /* ---------------- Motion (GSAP) ---------------- */
  var gsap = window.gsap;
  if (!gsap) { return; } // No GSAP -> CSS leaves everything visible. Done.

  var ST = window.ScrollTrigger || null;
  if (ST) { gsap.registerPlugin(ST); }

  // Take ownership of initial hidden states (see html.js rules in styles.css).
  document.documentElement.classList.add("js");

  var mm = gsap.matchMedia();

  // Full motion
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    // Hero entrance
    gsap.set(".hero .anim-in", { opacity: 0, y: 20 });
    gsap.set(".hero-portrait img", { opacity: 0, scale: 1.05 });

    var tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });
    tl.to(".hero .eyebrow", { opacity: 1, y: 0 })
      .to(".hero h1", { opacity: 1, y: 0 }, "-=0.45")
      .to(".hero .lede", { opacity: 1, y: 0 }, "-=0.45")
      .to(".hero .chips", { opacity: 1, y: 0 }, "-=0.45")
      .to(".hero-portrait img", { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" }, "-=0.75");

    if (ST) {
      // Section reveals, staggered as each enters
      gsap.set(".reveal", { opacity: 0, y: 24 });
      ScrollTrigger.batch(".reveal", {
        start: "top 86%",
        onEnter: function (batch) {
          gsap.to(batch, {
            opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
            stagger: 0.12, overwrite: true
          });
        }
      });

      // Stat count-up
      gsap.utils.toArray(".stat .num").forEach(function (el) {
        var target = parseInt(el.textContent, 10) || 0;
        var obj = { v: 0 };
        ScrollTrigger.create({
          trigger: el, start: "top 90%", once: true,
          onEnter: function () {
            gsap.to(obj, {
              v: target, duration: 1.2, ease: "power2.out",
              onUpdate: function () { el.textContent = Math.round(obj.v); }
            });
          }
        });
      });

      // Recompute positions after fonts/images settle
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
    } else {
      // No ScrollTrigger: reveal everything so nothing stays hidden
      gsap.set(".reveal", { opacity: 1, y: 0 });
    }
  });

  // Reduced motion: snap to final, no scroll choreography, no count-up
  mm.add("(prefers-reduced-motion: reduce)", function () {
    gsap.set(".reveal, .hero .anim-in", { opacity: 1, y: 0 });
    gsap.set(".hero-portrait img", { opacity: 1, scale: 1 });
  });
})();
