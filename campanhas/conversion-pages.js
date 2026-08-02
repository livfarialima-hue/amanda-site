(function () {
  "use strict";

  var sticky = document.querySelector(".cv-sticky");
  var hero = document.querySelector(".cv-hero, .cv-article-hero");
  if (!sticky || !hero) return;

  var link = sticky.querySelector("a");
  var scheduled = false;

  function updateSticky() {
    scheduled = false;
    var visible = hero.getBoundingClientRect().bottom <= 88;
    sticky.classList.toggle("cv-sticky--visible", visible);
    sticky.setAttribute("aria-hidden", visible ? "false" : "true");
    if (link) link.tabIndex = visible ? 0 : -1;
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(updateSticky);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateSticky();
}());
