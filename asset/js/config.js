(function(){
  const params = new URLSearchParams(location.search);
  const q = params.get("backend");
  if (q) localStorage.setItem("BACKEND_URL", q);
  const saved = localStorage.getItem("BACKEND_URL");
  window.BACKEND_URL = saved || "http://localhost:8000";
  console.log("[config] BACKEND_URL", window.BACKEND_URL);
})();
