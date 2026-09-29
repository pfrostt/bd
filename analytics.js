// Custom GA4 events for bd.roamer.se. The Google tag itself (G-ZQHLR63QDS, its
// own property so it doesn't tie this site to roamer.se) sits in each page's
// <head>, where Tag Assistant and Search Console can detect it.
(() => {
  if (typeof window.gtag !== 'function') return;
  const lang = document.documentElement.lang;

  // "Det börjar här" button: someone is interested enough to open the form.
  document.querySelectorAll('[data-open-contact]').forEach((b) =>
    b.addEventListener('click', () => gtag('event', 'form_open', { language: lang }))
  );

  // SV / EN switch.
  document.querySelectorAll('.lang a:not([aria-current])').forEach((a) =>
    a.addEventListener('click', () =>
      gtag('event', 'language_switch', { to: a.hreflang, transport_type: 'beacon' })
    )
  );
})();
