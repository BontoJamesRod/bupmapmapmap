// Applies the saved theme before first paint (no light/dark flash). External file so the CSP can stay 'self'.
try {
  var t = localStorage.getItem("bupc-navi:theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) { /* storage blocked: follow the device setting */ }
