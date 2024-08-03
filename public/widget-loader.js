(function () {
  var iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.bottom = "20px";
  iframe.style.right = "20px";
  iframe.style.width = "300px";
  iframe.style.height = "400px";
  iframe.style.border = "none";
  iframe.style.zIndex = "9999";

  // ToDo: set to localhost or deployed URL, depending on the environment
  iframe.src = "https://your-nextjs-app.com/widget";

  document.body.appendChild(iframe);

  window.addEventListener("message", function (event) {
    if (event.origin !== "https://your-nextjs-app.com") return;
  });
})();
