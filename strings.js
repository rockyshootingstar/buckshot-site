// Buckshot's background, the same as the app's (SignalBackground.swift): six guitar strings across a warm
// near-black field (cream in light mode), thin at the top to thick at the bottom, one in Buckshot orange. Each
// string sways slowly in wide curves with its ends pinned. A soft glow runs along a string now and then (on load,
// and when you point at a button or card), never shaking it. Reduce Motion: still strings.
(function () {
  const canvas = document.getElementById("strings");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const STRINGS = 6, ACCENT = 3;
  const accent = [229, 122, 79];
  const pale = [245, 230, 214], brown = [92, 66, 48];
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const plucks = [];
  let w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Resting height at u (0…1 across): spread over the middle, narrowing towards the right like a guitar neck.
  function restingY(s, u) {
    const gap = h * 0.12 * (1 - 0.38 * u);
    return h * 0.52 + (s - 2.5) * gap;
  }

  // Three gentle waves at different lengths and speeds, slowly swelling and calming; ends pinned.
  const waves = [[0.55, 0.030, 6.0], [0.31, 0.045, 3.5], [0.19, 0.060, 2.0]];
  function hum(s, u, t) {
    const high = STRINGS - 1 - s, seed = s * 1.7, tighter = 1 - high * 0.04;
    let y = 0;
    waves.forEach(([len, speed, size], i) => {
      y += size * Math.sin(2 * Math.PI * (u - speed * t) / (len * tighter) + seed * (i + 1));
    });
    const breath = 0.6 + 0.4 * Math.sin(2 * Math.PI * t / (40 + s * 7) + seed);
    // A little bigger than the app, since a web page is usually a wider canvas.
    const scale = (0.8 + s * 0.05) * breath * Math.max(1, w / 1100);
    return y * scale * Math.pow(Math.sin(Math.PI * u), 0.6);
  }

  function trace(s, t, from, to) {
    const steps = Math.max(2, Math.round((to - from) * 160));
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = from + (to - from) * i / steps;
      const x = u * w, y = restingY(s, u) + hum(s, u, t);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  function draw(now) {
    const t = now / 1000;
    const light = !darkQuery.matches;
    const line = light ? brown : pale;
    ctx.clearRect(0, 0, w, h);
    // A faint warm lift at the bottom, so the field isn't flat.
    const g = ctx.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, h * 0.9);
    g.addColorStop(0, rgba(accent, 0.07)); g.addColorStop(1, rgba(accent, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    for (let i = plucks.length - 1; i >= 0; i--) if (t - plucks[i].start > plucks[i].duration) plucks.splice(i, 1);

    for (let s = 0; s < STRINGS; s++) {
      const isAccent = s === ACCENT;
      const width = 0.6 + s * 0.28;
      ctx.lineCap = "butt";
      ctx.strokeStyle = isAccent ? rgba(accent, light ? 0.45 : 0.32) : rgba(line, (light ? 0.11 : 0.08) + s * 0.008);
      ctx.lineWidth = width;
      trace(s, t, 0, 1); ctx.stroke();

      for (const p of plucks) {
        if (p.string !== s) continue;
        const progress = (t - p.start) / p.duration;
        if (progress <= 0 || progress >= 1) continue;
        const head = progress * 1.2 - 0.1, length = 0.14;
        const strength = (p.strong ? 0.9 : 0.45) * Math.sin(progress * Math.PI);
        const c = isAccent ? accent : line;
        ctx.lineCap = "round";
        for (const [extra, alpha] of [[6, 0.10], [2.5, 0.30], [0.8, 1.0]]) {
          for (let k = 0; k < 12; k++) {
            const a = head - length * (k + 1) / 12, b = head - length * k / 12;
            if (b <= 0 || a >= 1) continue;
            ctx.strokeStyle = rgba(c, alpha * strength * (1 - k / 12));
            ctx.lineWidth = width + extra;
            trace(s, t, Math.max(0, a), Math.min(1, b)); ctx.stroke();
          }
        }
      }
    }
  }

  function loop(now) { draw(now); if (!still.matches) requestAnimationFrame(loop); }

  // Plucks only add a glow; at most one running per string.
  function pluck(string, strong = true) {
    if (still.matches) return;
    const t = performance.now() / 1000;
    if (plucks.some(p => p.string === string && t - p.start < p.duration * 0.6)) return;
    plucks.push({ string, start: t, strong, duration: strong ? 5 : 7 });
  }

  resize();
  addEventListener("resize", () => { resize(); if (still.matches) draw(0); });
  darkQuery.addEventListener("change", () => { if (still.matches) draw(0); });
  still.addEventListener("change", () => still.matches ? draw(0) : requestAnimationFrame(loop));
  still.matches ? draw(0) : requestAnimationFrame(loop);

  // Lifts the hero so its "Coming soon" pill sits halfway between the two strings around it
  // (at their resting heights), whatever the window size. Layout positions only, so the fade-in doesn't skew it.
  const badge = document.querySelector(".hero .badge"), chip = badge && badge.querySelector(".chip");
  function align() {
    if (!chip) return;
    let top = 0;
    for (let el = chip; el; el = el.offsetParent) top += el.offsetTop;
    // Page position before any lift (offsetTop includes the hero's relative `top`).
    const current = parseFloat(badge.parentElement.style.getPropertyValue("--lift")) || 0;
    const centre = top - current + chip.offsetHeight / 2;     // page position (the strings are drawn for the top of the page)
    const u = Math.min(1, Math.max(0, (chip.getBoundingClientRect().left + chip.offsetWidth / 2) / w));
    let target = null;
    for (let s = 0; s < STRINGS - 1; s++) {
      const mid = (restingY(s, u) + restingY(s + 1, u)) / 2;
      if (mid <= centre) target = mid;              // the nearest gap at or above where the pill is now
    }
    const lift = target === null ? 0 : Math.max(-140, target - centre);
    badge.parentElement.style.setProperty("--lift", `${lift}px`);
  }
  align();
  addEventListener("resize", align);
  addEventListener("load", align);

  // Links to #privacy open the privacy dropdown.
  const privacy = document.getElementById("google");
  const openPrivacy = () => { if (privacy && location.hash === "#privacy") privacy.open = true; };
  addEventListener("hashchange", openPrivacy); openPrivacy();
  document.querySelectorAll('a[href="#privacy"]').forEach(a => a.addEventListener("click", () => { if (privacy) privacy.open = true; }));

  setTimeout(() => pluck(ACCENT), 900);
  document.querySelectorAll(".pill.orange").forEach(el => el.addEventListener("mouseenter", () => pluck(ACCENT)));
  document.querySelectorAll(".card, .pill:not(.orange)").forEach((el, i) =>
    el.addEventListener("mouseenter", () => pluck([0, 1, 2, 4, 5][i % 5], false)));
})();
