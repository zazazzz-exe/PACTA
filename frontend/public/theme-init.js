// Runs before first paint (loaded from <head> in index.html) so the page never
// flashes the wrong theme. A same-origin file, not an inline script, because the
// Content-Security-Policy in vercel.json blocks inline scripts.
// Choice order: the saved per-device choice, else the OS setting, else dark.
// Keep the storage key and logic in sync with src/lib/theme.ts.
(function () {
  var theme = 'dark';
  try {
    var saved = window.localStorage.getItem('pacta-theme');
    if (saved === 'dark' || saved === 'light') {
      theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (e) {
    /* storage blocked (private mode): fall back to the OS setting or dark */
    try {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) theme = 'light';
    } catch (e2) {}
  }
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F4F6FC' : '#0D1018');
})();
