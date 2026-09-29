// GA4 for bd.roamer.se. Its own property on purpose: sharing roamer.se's
// measurement ID would publicly tie the two sites together.
(() => {
  const GA_ID = 'G-ZQHLR63QDS';

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { dataLayer.push(arguments); };
  if (!/^G-[A-Z0-9]{6,}$/.test(GA_ID)) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  gtag('js', new Date());
  gtag('config', GA_ID);

  const lang = document.documentElement.lang;

  // "Det börjar här" button: someone is interested enough to open the form.
  document.querySelectorAll('[data-open-contact]').forEach((b) =>
    b.addEventListener('click', () => gtag('event', 'form_open', { language: lang }))
  );

  // SV / EN switch.
  document.querySelectorAll('.lang a:not([aria-current])').forEach((a) =>
    a.addEventListener('click', () => gtag('event', 'language_switch', { to: a.hreflang }))
  );
})();
