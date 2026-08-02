(function () {
  "use strict";

  var sticky = document.querySelector(".cv-sticky");
  var hero = document.querySelector(".cv-hero, .cv-article-hero");
  if (!sticky || !hero) return;

  var link = sticky.querySelector("a");
  var scheduled = false;
  var lastScrollY = window.scrollY;
  var readingTimer = 0;

  function updateSticky() {
    scheduled = false;
    var visible = hero.getBoundingClientRect().bottom <= 88;
    var currentScrollY = window.scrollY;
    var scrollingDown = currentScrollY > lastScrollY + 5;
    sticky.classList.toggle("cv-sticky--visible", visible);
    if (visible && scrollingDown && document.activeElement !== link) {
      sticky.classList.add("cv-sticky--reading");
      window.clearTimeout(readingTimer);
      readingTimer = window.setTimeout(function () {
        sticky.classList.remove("cv-sticky--reading");
        if (sticky.classList.contains("cv-sticky--visible")) {
          sticky.setAttribute("aria-hidden", "false");
          if (link) link.tabIndex = 0;
        }
      }, 850);
    } else if (!scrollingDown) {
      sticky.classList.remove("cv-sticky--reading");
    }
    var available = visible && !sticky.classList.contains("cv-sticky--reading");
    sticky.setAttribute("aria-hidden", available ? "false" : "true");
    if (link) link.tabIndex = available ? 0 : -1;
    lastScrollY = currentScrollY;
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
