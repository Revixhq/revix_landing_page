/* ═══════════════════════════════════════════════════════════════
   REVIX — Landing behaviour
   Built to docs/design.md v1.0 (+ §11 addendum).

   The centrepiece is the approach gauge: an instrument cluster that
   sweeps as the mechanic closes in. It shows coarse milestones and
   an approximate ETA because that is what the product actually
   ships (ADR-017) — compliance.md §7 forbids marketing a capability
   we deliberately don't build, so there is no moving map pin here.

   No dependencies. No external requests.
   ═══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     CONFIG

     ⚠️  PRICE BANDS ARE BLOCKED — docs/pricing.md P-2, task.md B-2.

     Leave `priceBands` null until David signs the real figures.
     Never put a plausible-looking naira number here: a price on a
     public page is a public promise. design.md §10 asks for these
     fields to stay tokenised so they drop in without redesign.

     Shape when unblocked (integer kobo, money.md §0 rule 1):
       priceBands: { 'R-03': { low: <band_low_kobo>, high: <band_high_kobo> } }
     ───────────────────────────────────────────────────────────── */
  const REVIX = {
    priceBands: null,
    waitlistEndpoint: null      // → POST /api/waitlist once the backend exists
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ═══════════════════════════════════════════════════════════
     1 · THE APPROACH GAUGE
     ═══════════════════════════════════════════════════════════ */

  const R = 88;                       // sweep radius, matches the CSS circle
  const CIRC = 2 * Math.PI * R;
  const TICKS = 60;

  const STAGES = [
    { state: 'Assigned',  step: 0, fill: .12, eta: 12 },
    { state: 'On the way', step: 1, fill: .48, eta: 8  },
    { state: 'Nearby',     step: 2, fill: .82, eta: 2  },
    { state: 'Arrived',    step: 3, fill: 1,   eta: 0, done: true }
  ];

  /* Instrument bezel. 60 ticks, every fifth longer — the detail that
     separates a real dial from a progress ring. Generated rather
     than hand-written so the geometry stays exact. */
  function bezel(g) {
    const NS = 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment();

    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2 - Math.PI / 2;
      const major = i % 5 === 0;
      const r1 = major ? 100 : 104;
      const r2 = 110;

      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', (120 + Math.cos(a) * r1).toFixed(2));
      line.setAttribute('y1', (120 + Math.sin(a) * r1).toFixed(2));
      line.setAttribute('x2', (120 + Math.cos(a) * r2).toFixed(2));
      line.setAttribute('y2', (120 + Math.sin(a) * r2).toFixed(2));
      if (major) line.setAttribute('stroke-width', '2.25');
      line.dataset.i = i;
      frag.appendChild(line);
    }
    g.appendChild(frag);
  }

  function gauge() {
    const dial = $('#sweep-arc');
    if (!dial) return;

    const ticksG = $('#ticks');
    const head   = $('#sweep-head');
    const needle = $('#needle');
    const eta    = $('#eta');
    const state  = $('#state');
    const steps  = $$('#track li');
    const ticks  = (bezel(ticksG), $$('#ticks line'));

    dial.style.strokeDasharray = CIRC;
    dial.style.strokeDashoffset = CIRC;

    let i = 0;

    const render = () => {
      const s = STAGES[i];
      const lit = Math.round(s.fill * TICKS);

      dial.style.strokeDashoffset = CIRC * (1 - s.fill);
      dial.classList.toggle('is-done', !!s.done);

      // Head and needle both ride the end of the sweep. The needle is
      // the brand device lifted straight off the Revix mark.
      const ang = s.fill * 360;
      head.style.transform = `rotate(${-ang}deg)`;
      head.classList.toggle('is-done', !!s.done);
      if (needle) needle.style.transform = `rotate(${-ang}deg)`;

      ticks.forEach((t, n) => {
        t.classList.toggle('on', n >= TICKS - lit && !s.done);
        t.classList.toggle('on-done', n >= TICKS - lit && !!s.done);
      });

      state.textContent = s.state;
      state.classList.toggle('is-done', !!s.done);

      eta.textContent = s.done ? '0' : s.eta;
      $('.dial__unit').textContent = s.done ? 'here now' : 'min away';

      steps.forEach((el, n) => {
        el.classList.toggle('on', n <= s.step);
        el.classList.toggle('on-done', n <= s.step && !!s.done);
      });
    };

    // Reduced motion settles on the reassuring mid-state, not a freeze.
    if (reduced) { i = 1; render(); return; }

    /* Instrument power-on. Turn the key on any car with a tachometer and
       the needle sweeps to MAX and drops back — it is the most recognisable
       automotive gesture there is, and the Revix mark is a tachometer, so
       the logo is what animates. Runs once, on load, never again. */
    const powerOn = () => {
      dial.style.strokeDashoffset = 0;
      head.style.transform = 'rotate(-360deg)';
      if (needle) needle.style.transform = 'rotate(-360deg)';

      // Ticks light in sequence behind the needle rather than snapping
      // on together — they have to arrive with it, or the dial reads as
      // two unrelated animations.
      ticks.forEach((t, n) => setTimeout(() => t.classList.add('on'), ((TICKS - 1 - n) / TICKS) * 1000));

      setTimeout(() => {
        ticks.forEach(t => t.classList.remove('on'));
        render();                       // settle to the real first stage
      }, 1500);
    };

    render();
    setTimeout(powerOn, 320);

    let t;
    const tick = () => {
      i = (i + 1) % STAGES.length;
      render();
      t = setTimeout(tick, STAGES[i].done ? 3200 : 2700);
    };
    t = setTimeout(tick, 3900);   // let the power-on land before cycling

    // Don't burn cycles off-screen. Battery and paint cost are real
    // on the cheap Android hardware this market runs on (design.md §7).
    document.addEventListener('visibilitychange', () => {
      clearTimeout(t);
      if (!document.hidden) t = setTimeout(tick, 1400);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     2 · HERO SEQUENCE — one orchestrated entrance
     ═══════════════════════════════════════════════════════════ */
  function heroIn() {
    const items = $$('[data-r]').sort((a, b) => a.dataset.r - b.dataset.r);
    if (reduced) { items.forEach(el => el.classList.add('in')); return; }
    items.forEach(el => {
      setTimeout(() => el.classList.add('in'), 100 + (Number(el.dataset.r) - 1) * 95);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     3 · SCROLL REVEALS — dark run only.
     `.trust .reveal` is neutralised in CSS: that section does not
     animate in, by design.
     ═══════════════════════════════════════════════════════════ */
  function reveals() {
    const items = $$('.reveal:not([data-r])');
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const sibs = [...e.target.parentElement.children].filter(n => n.classList.contains('reveal'));
        setTimeout(() => e.target.classList.add('in'), Math.max(0, sibs.indexOf(e.target)) * 75);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .12 });
    items.forEach(el => io.observe(el));
  }

  /* ═══════════════════════════════════════════════════════════
     4 · THE STEP INSTRUMENTS

     Three drawn mechanisms in section 03, one per step. Same
     IntersectionObserver shape as the reveals above, with a higher
     threshold: a 900ms draw that starts at 12% visibility finishes
     off-screen on a fast scroll, so it waits until the instrument is
     properly in frame.

     Each plays ONCE and is then unobserved. Nothing on this page
     loops except the ticker — and this is the section where the copy
     turns to money, which is exactly where design.md §1 says the
     motion goes quiet. Three looping SVGs would also mean three live
     paint loops for as long as the section is on screen, on hardware
     that cannot spare them.

     Stages are cumulative classes, so the resting state is simply all
     three applied. Reduced motion therefore settles on the FINISHED
     state — same principle as the gauge, except here the outcome is
     the entire point: the price is shown, the mechanic is verified,
     the money is released. A half-drawn escrow box with nothing in it
     would say the opposite of what it means.
     ═══════════════════════════════════════════════════════════ */

  const INS_STAGES = ['s1', 's2', 's3'];

  function instruments() {
    const items = $$('.ins');
    if (!items.length) return;

    const settle = el => el.classList.add(...INS_STAGES);

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach(settle);
      return;
    }

    // 820ms apart: long enough that a stage's 900ms draw has mostly
    // landed before the next starts, short enough that the sequence
    // reads as one movement rather than three.
    const play = el => INS_STAGES.forEach(
      (c, n) => setTimeout(() => el.classList.add(c), 120 + n * 820)
    );

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        play(e.target);
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .35 });

    items.forEach(el => io.observe(el));
  }

  /* ═══════════════════════════════════════════════════════════
     5 · NAV
     ═══════════════════════════════════════════════════════════ */
  function nav() {
    const el = $('#nav');
    if (!el) return;
    const f = () => el.classList.toggle('is-stuck', scrollY > 8);
    f();
    addEventListener('scroll', f, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════════
     6 · WAITLIST — two lists behind one form (design.md §5.3).
     The mechanic count feeds the traction numbers for the deck,
     so the side is always recorded.
     ═══════════════════════════════════════════════════════════ */

  const NG = /^(?:\+?234|0)[789][01]\d{8}$/;
  const clean = v => v.replace(/[\s()-]/g, '');
  const e164 = v => {
    const d = clean(v);
    if (d.startsWith('+234')) return d;
    if (d.startsWith('234'))  return '+' + d;
    if (d.startsWith('0'))    return '+234' + d.slice(1);
    return d;
  };

  function waitlist() {
    const form = $('#waitlistForm');
    if (!form) return;

    const phone = $('#phone'), err = $('#phoneErr'), btn = $('#submitBtn');
    const done = $('#done'), msg = $('#doneMsg'), again = $('#againBtn');

    const fail = m => { err.textContent = m; err.hidden = false; phone.setAttribute('aria-invalid', 'true'); };
    const clr  = () => { err.hidden = true; phone.removeAttribute('aria-invalid'); };

    phone.addEventListener('input', clr);

    $$('[data-pre]').forEach(a => a.addEventListener('click', () => {
      const r = form.querySelector(`input[name="side"][value="${a.dataset.pre}"]`);
      if (r) r.checked = true;
      setTimeout(() => phone.focus({ preventScroll: true }), 450);
    }));

    form.addEventListener('submit', async e => {
      e.preventDefault();
      clr();

      const raw = phone.value.trim();

      // Errors say what happened and what to do — design.md §8.
      if (!raw)            { fail('Enter your phone number so we can reach you.'); phone.focus(); return; }
      if (!NG.test(clean(raw))) { fail("That doesn't look like a Nigerian number. Try 0801 234 5678."); phone.focus(); return; }

      const body = {
        side:  form.querySelector('input[name="side"]:checked').value,
        phone: e164(raw),
        area:  $('#area').value.trim() || null,
        source: 'landing'
      };

      btn.disabled = true;
      btn.textContent = 'Joining…';

      try {
        if (REVIX.waitlistEndpoint) {
          const res = await fetch(REVIX.waitlistEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw new Error(res.status);
        } else {
          console.info('[revix] waitlist →', body);
          await new Promise(r => setTimeout(r, 520));
        }

        msg.textContent = body.side === 'mechanic'
          ? "We'll call you when we start onboarding mechanics in your area."
          : "We'll message you the moment Revix opens near you.";

        form.hidden = true;
        done.hidden = false;
        done.focus();

      } catch {
        // Never fail silently, and never blame the user for our outage.
        fail("That didn't go through. Check your connection and try again.");
        btn.disabled = false;
        btn.textContent = 'Join the waitlist';
      }
    });

    again.addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      done.hidden = true;
      btn.disabled = false;
      btn.textContent = 'Join the waitlist';
      phone.focus();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     7 · PARALLAX + SCROLL PROGRESS

     One rAF-throttled scroll handler drives everything. Layers move
     at a fraction of scroll depth — the hero grid barely, the car
     elevation more, section numerals a touch. Kept under 20% so it
     reads as depth rather than as an effect.
     ═══════════════════════════════════════════════════════════ */
  function parallax() {
    const layers = $$('[data-px]').map(el => ({ el, k: parseFloat(el.dataset.px) }));
    const bar = $('#prog');
    const doc = document.documentElement;
    let queued = false;

    const paint = () => {
      queued = false;
      const y = scrollY;

      if (bar) {
        const max = doc.scrollHeight - innerHeight;
        bar.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
      }

      if (reduced) return;

      // Hero dolly — scale and fade tied to scroll depth, capped early
      const stage = $('.hero__in');
      if (stage) {
        const p = Math.min(1, Math.max(0, y / (innerHeight * 0.9)));
        stage.style.transform = `scale(${(1 - p * 0.045).toFixed(4)})`;
        stage.style.opacity = (1 - p * 0.55).toFixed(3);
      }

      for (const { el, k } of layers) {
        const box = el.getBoundingClientRect();
        // Only move what's near the viewport — avoids needless layout reads
        if (box.bottom < -200 || box.top > innerHeight + 200) continue;
        const from = box.top + y;
        el.style.transform =
          (el.classList.contains('px__car') ? 'translateX(-50%) ' : '') +
          `translate3d(0, ${((y - from) * k).toFixed(1)}px, 0)`;
      }
    };

    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paint); } };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    paint();
  }

  /* ═══════════════════════════════════════════════════════════
     8 · TICKER — duplicate the set so the loop is seamless
     ═══════════════════════════════════════════════════════════ */
  function ticker() {
    const row = $('#ticker');
    if (!row || reduced) return;
    row.appendChild(row.firstElementChild.cloneNode(true));
  }

  const boot = () => { heroIn(); gauge(); reveals(); instruments(); nav(); waitlist(); parallax(); ticker(); };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})();
