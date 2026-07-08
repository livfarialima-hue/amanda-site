document.addEventListener("DOMContentLoaded", function () {
  var frames = document.querySelectorAll("iframe[data-instagram-src]");
  var loadFrame = function (frame) {
    if (!frame.getAttribute("src")) {
      frame.setAttribute("src", frame.getAttribute("data-instagram-src"));
    }
  };

  if (!("IntersectionObserver" in window)) {
    frames.forEach(loadFrame);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        loadFrame(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "220px 0px" });

  frames.forEach(function (frame) {
    observer.observe(frame);
  });
});
