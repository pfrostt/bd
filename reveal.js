// Blur reveal. A canvas over the slider paints an extra-blurred copy of each
// slide; the cursor (or a finger) wipes holes in it so the photo underneath
// shows at its normal blur, and the extra blur slowly returns.
// The photo files are blurred themselves, so nothing sharp is ever revealed.
(() => {
  const frame = document.querySelector('.frame');
  const track = frame?.querySelector('.track');
  const canvas = frame?.querySelector('.veil');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const mask = document.createElement('canvas');
  const mctx = mask.getContext('2d');

  const SCALE = 0.5;        // output resolution; it is a blur, half res is plenty
  const MASK_SCALE = 0.125; // low-res mask: bilinear upscaling gives soft edges for free
  const SHRINK = 5;         // how much extra blur: downscale factor before upscaling
  const RETURN = 0.012;     // how fast the extra blur comes back, per frame
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const textures = new Map(); // img src -> extra-blurred canvas
  let fw = 0, fh = 0, last = null, raf = 0;

  // Downscale-then-upscale blur: works in every browser, no ctx.filter needed.
  const blurred = (img) => {
    const W = Math.max(1, Math.round(fw * SCALE));
    const H = Math.max(1, Math.round(fh * SCALE));
    // cover-fit crop, matching object-fit: cover on the <img>
    const ir = img.naturalWidth / img.naturalHeight, fr = W / H;
    let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
    if (ir > fr) { sw = sh * fr; sx = (img.naturalWidth - sw) / 2; }
    else { sh = sw / fr; sy = (img.naturalHeight - sh) / 2; }

    // shrink, then grow back in two steps (the middle step only smooths, it adds no blur)
    const tiny = Math.max(2, Math.round(W / SHRINK));
    const steps = [tiny, Math.min(W, tiny * 2), W];
    let src = img, rect = [sx, sy, sw, sh];
    for (const sw2 of steps) {
      const c = document.createElement('canvas');
      c.width = sw2;
      c.height = Math.max(2, Math.round(sw2 / fr));
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(src, ...rect, 0, 0, c.width, c.height);
      src = c;
      rect = [0, 0, c.width, c.height];
    }
    return src;
  };

  // Load the small file on its own: an <img> with srcset reports density-corrected
  // natural sizes, which would make the cover crop (and the blur) land off-target.
  const build = (img) => {
    const url = (img.getAttribute('srcset') || '').split(' ')[0] || img.src;
    const raw = new Image();
    raw.decoding = 'async';
    raw.onload = () => textures.set(img.src, blurred(raw));
    raw.src = url;
  };

  const resize = () => {
    const r = frame.getBoundingClientRect();
    fw = r.width; fh = r.height;
    canvas.width = Math.max(1, Math.round(fw * SCALE));
    canvas.height = Math.max(1, Math.round(fh * SCALE));
    mask.width = Math.max(1, Math.round(fw * MASK_SCALE));
    mask.height = Math.max(1, Math.round(fh * MASK_SCALE));
    mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, mask.width, mask.height);
    textures.clear();
    track.querySelectorAll('img').forEach(build);
  };

  const render = () => {
    const f = frame.getBoundingClientRect();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // paint the extra-blurred version of whatever slides are in view right now
    track.querySelectorAll('.slide').forEach((slide) => {
      const r = slide.getBoundingClientRect();
      if (r.right <= f.left || r.left >= f.right) return;
      const tex = textures.get(slide.querySelector('img').src);
      if (tex) ctx.drawImage(tex, (r.left - f.left) * SCALE, 0, r.width * SCALE, canvas.height);
    });
    // keep it only where the mask is still "blurred"
    ctx.globalCompositeOperation = 'destination-in';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';

    // the extra blur slowly returns
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = `rgba(255,255,255,${RETURN})`;
    mctx.fillRect(0, 0, mask.width, mask.height);

    raf = document.hidden ? 0 : requestAnimationFrame(render);
  };

  const dab = (x, y) => {
    const r = mask.width * 0.2;
    const g = mctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.arc(x, y, r, 0, Math.PI * 2);
    mctx.fill();
  };

  const wipe = (x, y) => {
    mctx.globalCompositeOperation = 'destination-out';
    if (last) {
      // fill the gap between pointer events so fast strokes stay continuous
      const dx = x - last.x, dy = y - last.y;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 1.2));
      for (let i = 1; i <= steps; i++) dab(last.x + (dx * i) / steps, last.y + (dy * i) / steps);
    } else {
      dab(x, y);
    }
    mctx.globalCompositeOperation = 'source-over';
    last = { x, y };
  };

  const local = (e) => {
    const r = frame.getBoundingClientRect();
    return [(e.clientX - r.left) * MASK_SCALE, (e.clientY - r.top) * MASK_SCALE];
  };

  frame.addEventListener('pointermove', (e) => {
    // mouse reveals on hover; touch and pen reveal while pressed
    if (e.pointerType !== 'mouse' && e.buttons === 0) return;
    wipe(...local(e));
  });
  frame.addEventListener('pointerdown', (e) => { last = null; wipe(...local(e)); });
  frame.addEventListener('pointerleave', () => { last = null; });
  frame.addEventListener('pointerup', () => { last = null; });

  // One slow sweep after load, so visitors see the photo reacts.
  const demo = () => {
    const dur = 1700, t0 = performance.now();
    last = null;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      wipe(mask.width * (0.12 + 0.76 * e), mask.height * (0.44 + 0.04 * Math.sin(e * Math.PI * 2)));
      if (p < 1) requestAnimationFrame(step);
      else last = null;
    };
    requestAnimationFrame(step);
  };

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !raf) raf = requestAnimationFrame(render);
  });

  // slider.js builds the slides first; wait a tick so they exist
  requestAnimationFrame(() => {
    resize();
    raf = requestAnimationFrame(render);
    if (!reduced) setTimeout(demo, 2200);
  });
})();
