// Auto-sliding photos in the frame. The slides are in the page's HTML
// (written by tools/blur_boudoir_photos.py) so Google can index them.
// Click the left half of a photo for the previous one, the right half for the
// next; arrow keys do the same.
(() => {
  const INTERVAL = 6000;
  const frame = document.querySelector('.frame');
  const track = frame?.querySelector('.track');
  const slides = track ? [...track.querySelectorAll('.slide')] : [];
  if (!slides.length) return;
  const n = slides.length;

  // Clone of the first slide at the end so the loop never slides backwards.
  // It repeats slide 1, so hide it from screen readers.
  if (n > 1) {
    const clone = slides[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    const img = clone.querySelector('img');
    img.alt = '';
    img.removeAttribute('fetchpriority');
    track.appendChild(clone);
  }

  let index = 0;
  let timer = null;

  const place = () => { track.style.transform = `translateX(${-100 * index}%)`; };

  // jump without animation (used to wrap around through the clone)
  const snap = (i) => {
    index = i;
    track.classList.add('no-anim');
    place();
    void track.offsetWidth;
    track.classList.remove('no-anim');
  };

  const go = (i) => { index = i; place(); };

  const next = () => {
    if (index >= n) snap(0);
    go(index + 1);
  };
  const prev = () => {
    if (index <= 0) snap(n); // the clone of slide 1 sits at position n
    go(index - 1);
  };

  track.addEventListener('transitionend', () => {
    if (index >= n) snap(0);
  });

  const start = () => {
    if (n < 2 || timer) return;
    timer = setInterval(next, INTERVAL);
  };
  const stop = () => { clearInterval(timer); timer = null; };
  // after a manual change, give the visitor a full interval before moving on
  const restart = () => { stop(); start(); };

  if (n > 1) {
    const side = (e) => {
      const r = frame.getBoundingClientRect();
      return e.clientX - r.left < r.width / 2 ? 'prev' : 'next';
    };

    frame.addEventListener('click', (e) => {
      side(e) === 'prev' ? prev() : next();
      restart();
    });
    frame.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') frame.dataset.side = side(e);
    });
    frame.addEventListener('pointerleave', () => { delete frame.dataset.side; });

    document.addEventListener('keydown', (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.key === 'ArrowLeft') { prev(); restart(); }
      if (e.key === 'ArrowRight') { next(); restart(); }
    });
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.frame')) e.preventDefault();
  });

  start();
})();
