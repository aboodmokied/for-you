(() => {
  'use strict';

  const C = window.BIRTHDAY_CONFIG || {};
  const TOTAL = 8;
  const KEY = 'birthday-journey-v1';
  const MUTE_KEY = 'birthday-journey-muted';

  /* ==========================================================
     Helpers
     ========================================================== */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RM.matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  const arNum = n => Number(n).toLocaleString('ar-EG');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
  const heartSVG = (cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
  const centerOf = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const herName = C.herName || 'حبيبتي';

  const PINKS = ['#ff5c8a', '#ff8fb0', '#ffc2d4', '#ff3d73', '#ffd6e2'];
  const GOLDS = ['#f6c86e', '#ffe7a8', '#fff5d6', '#ffd38a'];
  const FESTIVE = ['#ff5c8a', '#ff8fb0', '#ffd6e2', '#f6c86e', '#ffe7a8', '#c9a7ff', '#8fd9ff', '#ffffff'];

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  // Click + keyboard activation for non-button elements (SVG groups)
  function onActivate(el, fn) {
    el.addEventListener('click', fn);
    if (el.tagName !== 'BUTTON') {
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); }
      });
    }
  }

  function showEl(el) {
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('in');
  }

  async function revealIn(ctx, els, gap = 320, first = 300) {
    await ctx.wait(first);
    for (const e of els) { e.classList.add('in'); await ctx.wait(gap); }
  }

  // Wrap each Arabic word in its own span — splitting only on whitespace keeps letter shaping intact
  const wrapWords = text => String(text).split(/(\s+)/).map(t => (/^\s+$/.test(t) || !t) ? t : `<span class="w">${esc(t)}</span>`).join('');

  /* ==========================================================
     Sound — tiny synthesized chimes, no audio files needed
     ========================================================== */
  const Sound = {
    ctx: null, master: null, music: [], noiseBuf: null,
    muted: store.get(MUTE_KEY) === '1',
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : .6;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.ctx = null; return false; }
      return true;
    },
    setMuted(m) {
      this.muted = m;
      store.set(MUTE_KEY, m ? '1' : '0');
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : .6, this.ctx.currentTime, .05);
    },
    tone(f, { t = 0, dur = 1.2, type = 'sine', vol = .1, attack = .01, glide = 0, music = false } = {}) {
      if (this.muted || !this.init()) return;
      const c = this.ctx, now = c.currentTime + t;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now);
      if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, now + dur * .6);
      g.gain.setValueAtTime(.0001, now);
      g.gain.exponentialRampToValueAtTime(vol, now + attack);
      g.gain.exponentialRampToValueAtTime(.0001, now + dur);
      o.connect(g); g.connect(this.master);
      o.start(now); o.stop(now + dur + .05);
      if (music) this.music.push(o);
    },
    chime(notes = [1318, 1760], gap = .08, vol = .07) {
      notes.forEach((f, i) => {
        this.tone(f, { t: i * gap, dur: 1.6, vol });
        this.tone(f * 2, { t: i * gap, dur: .7, vol: vol * .22 });
      });
    },
    pop() { this.tone(480, { dur: .2, vol: .1, glide: 2.2, type: 'triangle' }); },
    thump() { this.tone(110, { dur: .35, vol: .25, glide: .6 }); this.tone(90, { t: .22, dur: .35, vol: .18, glide: .6 }); },
    noise(dur, { freq = 900, q = .8, vol = .2, sweep = 0 } = {}) {
      if (this.muted || !this.init()) return;
      const c = this.ctx;
      if (!this.noiseBuf) {
        this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), now = c.currentTime;
      src.buffer = this.noiseBuf;
      f.type = 'bandpass'; f.frequency.setValueAtTime(freq, now); f.Q.value = q;
      if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, now + dur);
      g.gain.setValueAtTime(.0001, now);
      g.gain.exponentialRampToValueAtTime(vol, now + .03);
      g.gain.exponentialRampToValueAtTime(.0001, now + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(now); src.stop(now + dur + .05);
    },
    puff() { this.noise(.4, { freq: 700, q: .6, vol: .22, sweep: .5 }); },
    whoosh() { this.noise(.5, { freq: 400, q: .7, vol: .14, sweep: 4 }); },
    clink() {
      this.tone(2637, { dur: .25, vol: .05, type: 'triangle' });
      this.tone(3322, { t: .07, dur: .22, vol: .04, type: 'triangle' });
      this.tone(2093, { t: .16, dur: .3, vol: .04, type: 'triangle' });
      this.noise(.18, { freq: 4000, q: 1.5, vol: .05 });
    },
    melody(seq, beat = .36, vol = .06) {
      let t = .05;
      for (const [f, len] of seq) {
        this.tone(f, { t, dur: Math.max(.7, len * beat * 1.8), vol, music: true });
        this.tone(f * 2, { t, dur: .5, vol: vol * .25, music: true });
        t += len * beat;
      }
    },
    stopMusic() {
      this.music.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } });
      this.music = [];
    }
  };

  const HAPPY_BIRTHDAY = [
    [784, .75], [784, .25], [880, 1], [784, 1], [1046.5, 1], [988, 2],
    [784, .75], [784, .25], [880, 1], [784, 1], [1175, 1], [1046.5, 2],
    [784, .75], [784, .25], [1568, 1], [1318.5, 1], [1046.5, 1], [988, 1], [880, 2],
    [1397, .75], [1397, .25], [1318.5, 1], [1046.5, 1], [1175, 1], [1046.5, 2.5]
  ];

  /* ==========================================================
     Canvas sprites & shapes
     ========================================================== */
  const HEART_P2D = new Path2D(HEART_PATH);
  const spriteCache = {};
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function sprite(hex, kind) {
    const key = kind + hex;
    if (spriteCache[key]) return spriteCache[key];
    const s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d'), [r, gg, b] = hexToRgb(hex);
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    if (kind === 'bokeh') {
      grad.addColorStop(0, `rgba(${r},${gg},${b},.9)`);
      grad.addColorStop(.65, `rgba(${r},${gg},${b},.55)`);
      grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    } else {
      grad.addColorStop(0, `rgba(255,255,255,1)`);
      grad.addColorStop(.18, `rgba(${r},${gg},${b},.9)`);
      grad.addColorStop(.45, `rgba(${r},${gg},${b},.25)`);
      grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return (spriteCache[key] = cv);
  }
  function drawShape(c, p, size) {
    switch (p.kind) {
      case 'dot':
        c.fillStyle = p.color;
        c.beginPath(); c.arc(p.x, p.y, size, 0, Math.PI * 2); c.fill();
        break;
      case 'star': {
        const r = size * 2.6;
        c.fillStyle = p.color;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0);
        c.beginPath();
        c.moveTo(0, -r); c.quadraticCurveTo(0, 0, r, 0); c.quadraticCurveTo(0, 0, 0, r);
        c.quadraticCurveTo(0, 0, -r, 0); c.quadraticCurveTo(0, 0, 0, -r);
        c.fill(); c.restore();
        break;
      }
      case 'heart':
        c.fillStyle = p.color;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot || 0); c.scale(size / 24, size / 24); c.translate(-12, -12);
        c.fill(HEART_P2D); c.restore();
        break;
      case 'ring':
        c.strokeStyle = p.color; c.lineWidth = 1.2;
        c.beginPath(); c.arc(p.x, p.y, size / 2, 0, Math.PI * 2); c.stroke();
        break;
      case 'bokeh':
      case 'glow':
      case 'spark': {
        const img = sprite(p.color, p.kind === 'bokeh' ? 'bokeh' : 'glow');
        const s = p.kind === 'bokeh' ? size : size * 6;
        c.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
        break;
      }
      case 'rect': {
        c.fillStyle = p.color;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.flip));
        c.fillRect(-size / 2, -size * .3, size, size * .6);
        c.restore();
        break;
      }
    }
  }

  /* ==========================================================
     Ambient particles — each surprise has its own atmosphere
     ========================================================== */
  const PRESETS = {
    sparkle: { count: 80, kinds: ['dot', 'dot', 'star', 'glow'], colors: ['#fff3d1', '#ffffff', '#ffd1e3', '#f6c86e'], size: [.6, 2], vx: [-.04, .04], vy: [-.14, -.03], alpha: [.35, 1], twinkle: true, blend: 'lighter' },
    bokeh: { count: 24, kinds: ['bokeh', 'bokeh', 'glow'], colors: ['#ffc478', '#ff9678', '#ffd7aa', '#ff7896'], size: [16, 54], vx: [-.06, .06], vy: [-.2, -.05], alpha: [.07, .2], blend: 'lighter' },
    hearts: { count: 24, kinds: ['heart'], colors: ['#ff8fab', '#ffb3c6', '#ff6b9a', '#ffc2d4'], size: [9, 20], vx: [-.1, .1], vy: [-.45, -.15], alpha: [.22, .5], sway: true, spin: true, blend: 'source-over' },
    night: { count: 240, kinds: ['dot', 'dot', 'dot', 'glow'], colors: ['#ffffff', '#d6e4ff', '#fff1d6'], size: [.3, 1.5], vx: [0, 0], vy: [0, 0], alpha: [.2, 1], twinkle: true, shooting: true, blend: 'lighter' },
    dust: { count: 46, kinds: ['dot'], colors: ['#a0784a', '#c49a62', '#7a5634'], size: [.6, 2.2], vx: [-.08, .08], vy: [-.06, .06], alpha: [.12, .35], sway: true, blend: 'source-over' },
    embers: { count: 44, kinds: ['glow', 'glow', 'dot'], colors: ['#ffbe6e', '#ff9650', '#ffdca0'], size: [.8, 2.2], vx: [-.1, .1], vy: [-.35, -.1], alpha: [.3, .9], twinkle: true, sway: true, blend: 'lighter' },
    bubbles: { count: 30, kinds: ['heart', 'ring', 'heart'], colors: ['#ffffff', '#fff0f5', '#ffd1dc'], size: [9, 24], vx: [-.1, .1], vy: [-.6, -.25], alpha: [.35, .75], sway: true, spin: true, blend: 'source-over' },
    gold: { count: 60, kinds: ['dot', 'star', 'glow'], colors: ['#f6c86e', '#ffe7a8', '#ffffff', '#ff9ec0'], size: [.6, 1.8], vx: [-.03, .03], vy: [-.1, -.02], alpha: [.2, .8], twinkle: true, blend: 'lighter' },
    finale: { count: 110, kinds: ['star', 'heart', 'glow', 'dot', 'glow'], colors: ['#f6c86e', '#ffe7a8', '#ff8fb0', '#ffc2d4', '#ff5c8a', '#ffffff'], size: [1, 3.2], vx: [-.08, .08], vy: [-.4, -.1], alpha: [.45, 1], twinkle: true, sway: true, spin: true, blend: 'lighter', heartScale: 4.5 },
    none: { count: 0, kinds: ['dot'], colors: ['#fff'], size: [1, 1], vx: [0, 0], vy: [0, 0], alpha: [0, 0] }
  };

  class Ambient {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext('2d');
      this.ps = []; this.shoot = []; this.preset = PRESETS.none; this.last = 0;
      this.resize(); addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = innerWidth; this.h = innerHeight;
      this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
      this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    poke(x, y) { this.px = x; this.py = y; this.pt = performance.now(); }
    setMode(name) {
      const p = PRESETS[name] || PRESETS.none;
      if (p === this.preset) return;
      this.preset = p;
      this.ps.forEach(q => { q.dying = true; });
      const n = Math.round(p.count * (reduced() ? .5 : 1) * (this.w < 500 ? .7 : 1));
      for (let i = 0; i < n; i++) this.ps.push(this.spawn(p, true));
    }
    spawn(p, initial) {
      const kind = pick(p.kinds);
      let size = rand(...p.size);
      if (kind === 'heart' && p.heartScale) size *= p.heartScale;
      return {
        kind, size, color: pick(p.colors), blend: p.blend || 'source-over',
        x: rand(0, this.w), y: initial ? rand(0, this.h) : this.h + 30,
        vx: rand(...p.vx), vy: rand(...p.vy),
        a: 0, ta: rand(...p.alpha), tw: !!p.twinkle, tws: rand(.6, 2.2), ph: rand(0, 6.28),
        sway: !!p.sway, sws: rand(.3, .9), rot: p.spin ? rand(-.5, .5) : 0, vr: p.spin ? rand(-.004, .004) : 0
      };
    }
    loop(t) {
      requestAnimationFrame(this.loop);
      const dt = Math.min(3, (t - (this.last || t)) / 16.67) || 1;
      this.last = t;
      const c = this.c, still = reduced();
      c.clearRect(0, 0, this.w, this.h);
      const keep = [];
      for (const p of this.ps) {
        if (p.dying) { p.a -= .02 * dt; if (p.a <= 0) continue; }
        else if (p.a < p.ta) p.a = Math.min(p.ta, p.a + .012 * dt);
        if (!still) {
          p.x += (p.vx + (p.sway ? Math.sin(t * .001 * p.sws + p.ph) * .18 : 0)) * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (this.pt && t - this.pt < 900 && (p.vx || p.vy)) {
            const dx = p.x - this.px, dy = p.y - this.py, d2 = dx * dx + dy * dy;
            if (d2 < 12100 && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / 110) * 3 * dt; p.x += dx / d * f; p.y += dy / d * f; }
          }
          if (p.y < -40) { if (p.dying) continue; p.y = this.h + 40; p.x = rand(0, this.w); }
          if (p.y > this.h + 40) p.y = -40;
          if (p.x < -40) p.x = this.w + 40; else if (p.x > this.w + 40) p.x = -40;
        }
        const tw = (p.tw && !still) ? .55 + .45 * Math.sin(t * .001 * p.tws + p.ph) : 1;
        c.globalAlpha = Math.max(0, p.a * tw);
        c.globalCompositeOperation = p.blend;
        drawShape(c, p, p.size);
        keep.push(p);
      }
      this.ps = keep;
      // shooting stars for the night sky
      if (this.preset.shooting && !still && Math.random() < .004 * dt) {
        this.shoot.push({ x: rand(this.w * .3, this.w * 1.1), y: rand(-20, this.h * .35), vx: -rand(7, 11), vy: rand(2.5, 4), life: 1 });
      }
      c.globalCompositeOperation = 'lighter';
      this.shoot = this.shoot.filter(s => {
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= .018 * dt;
        if (s.life <= 0) return false;
        const g = c.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9);
        g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalAlpha = s.life; c.strokeStyle = g; c.lineWidth = 1.4;
        c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.vx * 9, s.y - s.vy * 9); c.stroke();
        return true;
      });
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }

  /* ==========================================================
     FX — bursts, confetti, fountains
     ========================================================== */
  class FX {
    constructor(cv) {
      this.cv = cv; this.c = cv.getContext('2d'); this.ps = []; this.on = false; this.last = 0;
      this.resize(); addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this);
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = innerWidth; this.h = innerHeight;
      this.cv.width = this.w * dpr; this.cv.height = this.h * dpr;
      this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    add(p) {
      this.ps.push(p);
      if (!this.on) { this.on = true; this.last = 0; requestAnimationFrame(this.loop); }
    }
    burst(x, y, { n = 18, kinds = ['heart'], colors = PINKS, speed = [2, 6], size = [7, 15], gravity = .05, life = [55, 95], drag = .965, up = 0, spread = Math.PI * 2, angle = 0 } = {}) {
      const k = reduced() ? Math.ceil(n / 3) : n;
      for (let i = 0; i < k; i++) {
        const a = angle + rand(-spread / 2, spread / 2), sp = rand(...speed) * (reduced() ? .5 : 1), l = rand(...life);
        this.add({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, g: gravity, drag,
          size: rand(...size), kind: pick(kinds), color: pick(colors),
          rot: rand(-.6, .6), vr: rand(-.05, .05), flip: rand(0, 6), vf: rand(.05, .2), life: l, max: l
        });
      }
    }
    confetti({ x = this.w / 2, y = this.h * .32, n = 150 } = {}) {
      this.burst(x, y, { n, kinds: ['rect', 'rect', 'rect', 'heart', 'dot'], colors: FESTIVE, speed: [5, 14], size: [6, 11], gravity: .2, drag: .975, life: [140, 220], spread: 2.4, angle: -Math.PI / 2 });
    }
    sideCannons() {
      this.burst(-10, this.h * .75, { n: 70, kinds: ['rect', 'rect', 'heart'], colors: FESTIVE, speed: [9, 17], size: [6, 11], gravity: .22, drag: .975, life: [140, 210], spread: .7, angle: -Math.PI / 3 });
      this.burst(this.w + 10, this.h * .75, { n: 70, kinds: ['rect', 'rect', 'heart'], colors: FESTIVE, speed: [9, 17], size: [6, 11], gravity: .22, drag: .975, life: [140, 210], spread: .7, angle: -Math.PI * 2 / 3 });
    }
    fountain(x, y, n = 24) {
      this.burst(x, y, { n, kinds: ['heart'], colors: PINKS, speed: [4, 9], size: [9, 18], gravity: .16, drag: .98, life: [80, 130], spread: 1.1, angle: -Math.PI / 2 });
    }
    loop(t) {
      const dt = this.last ? Math.min(3, (t - this.last) / 16.67) : 1;
      this.last = t;
      const c = this.c;
      c.clearRect(0, 0, this.w, this.h);
      this.ps = this.ps.filter(p => {
        p.vx *= Math.pow(p.drag, dt);
        p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt; p.flip += p.vf * dt;
        p.life -= dt;
        if (p.life <= 0 || p.y > this.h + 60) return false;
        c.globalAlpha = Math.min(1, p.life / (p.max * .35));
        c.globalCompositeOperation = (p.kind === 'spark' || p.kind === 'glow') ? 'lighter' : 'source-over';
        drawShape(c, p, p.kind === 'dot' ? p.size / 3 : p.kind === 'star' || p.kind === 'spark' ? p.size / 3.5 : p.size);
        return true;
      });
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      if (this.ps.length) requestAnimationFrame(this.loop);
      else this.on = false;
    }
  }

  /* ==========================================================
     Journey state
     ========================================================== */
  function loadState() {
    try {
      const s = JSON.parse(store.get(KEY));
      if (s && Array.isArray(s.completed)) {
        return {
          current: Number.isInteger(s.current) ? s.current : 0,
          completed: [...new Set(s.completed.filter(n => Number.isInteger(n) && n >= 0 && n < TOTAL))]
        };
      }
    } catch (e) { /* corrupted — start fresh */ }
    return { current: 0, completed: [] };
  }
  const state = loadState();
  const save = () => store.set(KEY, JSON.stringify(state));
  const isDone = i => state.completed.includes(i);
  // A surprise is reachable only when every surprise before it is completed
  function maxUnlocked() {
    let i = 0;
    while (i < TOTAL - 1 && isDone(i)) i++;
    return i;
  }

  /* ==========================================================
     Engine
     ========================================================== */
  const stage = $('#stage');
  const bgs = $$('#backdrop .bg');
  const progress = $('.progress');
  const blackout = $('.blackout');
  const ambient = new Ambient($('#ambient'));
  const fx = new FX($('#fx'));
  let token = 0;
  let current = null;

  const progressBtns = Array.from({ length: TOTAL }, (_, k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ph';
    b.innerHTML = heartSVG();
    b.addEventListener('click', () => { if (k <= maxUnlocked() && k !== state.current) { Sound.pop(); go(k); } });
    progress.append(b);
    return b;
  });

  function renderProgress() {
    const mu = maxUnlocked();
    progressBtns.forEach((b, k) => {
      const done = isDone(k), locked = k > mu;
      b.classList.toggle('done', done);
      b.classList.toggle('current', k === mu && !done);
      b.classList.toggle('here', k === state.current);
      b.disabled = locked;
      if (k === state.current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.setAttribute('aria-label', `المفاجأة ${arNum(k + 1)}${done ? ' — اكتملت' : locked ? ' — لسا مقفلة' : ''}`);
    });
  }

  function completeScene(i) {
    if (isDone(i)) return;
    state.completed.push(i);
    state.completed.sort((a, b) => a - b);
    save();
    renderProgress();
    const b = progressBtns[i];
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    const r = centerOf(b);
    fx.burst(r.x, r.y, { n: 12, kinds: ['spark', 'star'], colors: ['#ff8fb0', '#ffd6e2', '#f6c86e'], speed: [1, 3], gravity: .02, life: [30, 55] });
  }

  function makeCtx(i, sec, inner) {
    const my = token;
    const cleanups = [];
    const ctx = {
      index: i, el: sec, inner,
      done: isDone(i),
      alive: () => my === token,
      // Resolves only while this scene is still on screen; otherwise it silently never resolves
      wait: ms => new Promise(res => setTimeout(() => { if (my === token) res(); }, reduced() ? Math.min(ms, ms * .45 + 150) : ms)),
      complete: () => { if (my === token) completeScene(i); },
      goNext: () => { if (my === token && i + 1 < TOTAL) go(i + 1); },
      onLeave: fn => cleanups.push(fn),
      cleanup: () => cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } }),
      showNext(label, subtle = false) {
        if (i >= TOTAL - 1 || my !== token) return;
        let wrap = $('.next-wrap', inner);
        if (!wrap) {
          wrap = document.createElement('div');
          wrap.className = 'next-wrap';
          wrap.innerHTML = '<button class="btn next-btn" type="button"></button>';
          const btn = $('button', wrap);
          btn.addEventListener('click', () => { btn.disabled = true; Sound.pop(); ctx.goNext(); });
          inner.append(wrap);
        } else if (!subtle && wrap.classList.contains('subtle')) {
          inner.append(wrap); // move to the end, below the new content
          const btn = $('button', wrap);
          btn.style.animation = 'none'; void btn.offsetWidth; btn.style.animation = '';
        }
        wrap.classList.toggle('subtle', subtle);
        $('button', wrap).textContent = label;
      }
    };
    return ctx;
  }

  function go(i) {
    if (i < 0 || i >= TOTAL || i > maxUnlocked()) return;
    const old = $('.scene.active', stage) || $('.scene:not(.leaving)', stage);
    if (current) current.cleanup();
    token++;
    Sound.stopMusic();
    state.current = i; save();

    document.body.dataset.scene = String(i + 1);
    document.body.classList.remove('cinema');
    document.documentElement.style.setProperty('--dim', '0');
    blackout.classList.remove('on');
    bgs.forEach((b, k) => b.classList.toggle('on', k === i));
    ambient.setMode(SCENES[i].ambient);

    if (old) {
      old.classList.remove('active');
      old.classList.add('leaving');
      old.setAttribute('aria-hidden', 'true');
      old.inert = true;
      setTimeout(() => old.remove(), 800);
    }

    const sec = document.createElement('section');
    sec.className = `scene scene-${i + 1}`;
    sec.setAttribute('aria-label', `المفاجأة ${arNum(i + 1)} من ${arNum(TOTAL)}`);
    const inner = document.createElement('div');
    inner.className = `scene-inner s${i + 1}`;
    sec.append(inner);
    stage.append(sec);

    const ctx = makeCtx(i, sec, inner);
    current = ctx;
    SCENES[i].render(ctx);
    if (ctx.done && i < TOTAL - 1) ctx.showNext('كمّلي للمفاجأة الجاية ←', true);

    renderProgress();
    requestAnimationFrame(() => requestAnimationFrame(() => sec.classList.add('active')));
    setTimeout(() => { const f = $('[data-focus]', sec); if (f && ctx.alive()) f.focus({ preventScroll: true }); }, 400);
  }

  function restart() {
    state.current = 0;
    state.completed = [];
    save();
    go(0);
  }

  /* ==========================================================
     The 8 surprises
     ========================================================== */
  const SCENES = [

    /* ---------- 1 · The Secret Invitation ---------- */
    {
      ambient: 'sparkle',
      render(ctx) {
        const { inner } = ctx;
        inner.innerHTML = `
          <p class="lead rv">في حدا اليوم إله مفاجأة صغيرة...</p>
          <h1 class="title rv" tabindex="-1" data-focus>بس قبل ما نبدأ، لازم تعرفي إنك أغلى من كل الهدايا ❤️</h1>
          <div class="env-wrap rv">
            <span class="env-halo"></span>
            <button class="envelope" type="button" aria-label="افتحي الظرف">
              <span class="env-back"></span>
              <span class="env-letter"><span class="env-letter-text">جاهزة لرحلة صغيرة<br>جوّا قلبي؟</span>${heartSVG('env-letter-heart')}</span>
              <span class="env-front"></span>
              <span class="env-flap"></span>
              <span class="env-seal">${heartSVG()}</span>
            </button>
          </div>
          <p class="hint rv">اضغطي على الظرف 💌</p>
          <div class="s1-go" hidden><button class="btn" type="button">يلا نبدأ ❤️</button></div>`;
        revealIn(ctx, $$('.rv', inner), 380);

        const env = $('.envelope', inner), hint = $('.hint', inner), goBox = $('.s1-go', inner);
        env.addEventListener('click', async () => {
          if (env.classList.contains('open')) return;
          env.classList.add('open');
          env.setAttribute('aria-label', 'جاهزة لرحلة صغيرة جوّا قلبي؟');
          Sound.chime([1046.5, 1318.5, 1568, 2093], .1);
          const r = centerOf(env);
          fx.burst(r.x, r.y, { n: 34, kinds: ['star', 'spark', 'heart'], colors: [...GOLDS, '#ff8fb0'], speed: [1.5, 5], gravity: .015, life: [50, 90] });
          hint.classList.add('gone');
          await ctx.wait(2000);
          showEl(goBox);
        });
        $('button', goBox).addEventListener('click', e => {
          e.currentTarget.disabled = true;
          Sound.pop();
          ctx.complete();
          ctx.goNext();
        });
      }
    },

    /* ---------- 2 · The Birthday Wish ---------- */
    {
      ambient: 'bokeh',
      render(ctx) {
        const { inner } = ctx;
        const n = Math.min(9, Math.max(1, parseInt(C.candles, 10) || 5));
        inner.innerHTML = `
          <p class="lead rv">اليوم مش يوم عادي...</p>
          <h1 class="title rv" tabindex="-1" data-focus>اليوم انولدت فيه أجمل إنسانة بحياتي.</h1>
          <div class="cake-wrap rv"><div class="cake-glow"></div>${cakeSVG(n)}</div>
          <p class="hint rv" aria-live="polite">اضغطي على الشموع لتطفيها 🕯️</p>
          <button class="btn btn-soft mic-btn rv" type="button" hidden>🎤 أو انفخي عالشموع بالمايك</button>
          <div class="wish" aria-live="polite">
            <p class="wish-1">اتمني أمنية يا روحي...</p>
            <p class="wish-2">وأنا أمنيتي تضلّي معي العمر كله ❤️</p>
          </div>`;
        const hint = $('.hint', inner), w1 = $('.wish-1', inner), w2 = $('.wish-2', inner);
        const cake = $('.cake', inner), micBtn = $('.mic-btn', inner);
        micBtn.hidden = !(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        const setLit = v => {
          inner.style.setProperty('--lit', v);
          document.documentElement.style.setProperty('--dim', (1 - v).toFixed(2));
        };
        ctx.onLeave(() => document.documentElement.style.setProperty('--dim', '0'));
        setLit(1);
        revealIn(ctx, $$('.rv', inner), 320);
        ctx.wait(1500).then(() => Sound.melody(HAPPY_BIRTHDAY));

        let lit = n;
        const candles = $$('.candle', inner);
        candles.forEach(c => onActivate(c, () => blowOut(c)));
        function blowOut(c) {
          if (c.classList.contains('out') || lit === 0) return;
          c.classList.add('out');
          c.setAttribute('aria-label', 'الشمعة انطفت');
          c.setAttribute('aria-disabled', 'true');
          lit--;
          Sound.puff();
          setLit(lit / n);
          hint.textContent = lit === 0 ? '' : lit === 1 ? 'باقي شمعة وحدة... 🕯️' : lit === 2 ? 'باقي شمعتين 🕯️🕯️' : `باقي ${arNum(lit)} شموع 🕯️`;
          if (lit === 0) finish();
        }

        // Blowing on the phone's microphone puts the candles out too
        let stream = null, srcNode = null, micRaf = 0;
        const stopMic = () => {
          cancelAnimationFrame(micRaf);
          if (srcNode) { try { srcNode.disconnect(); } catch (e) { /* ignore */ } }
          if (stream) stream.getTracks().forEach(t => t.stop());
          stream = null; srcNode = null;
          cake.style.setProperty('--blow', '0');
          micBtn.classList.remove('listening');
        };
        ctx.onLeave(stopMic);
        micBtn.addEventListener('click', async () => {
          if (stream) { stopMic(); micBtn.textContent = '🎤 أو انفخي عالشموع بالمايك'; return; }
          Sound.init();
          micBtn.disabled = true;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
          } catch (e) {
            micBtn.textContent = 'المايك ما اشتغل... اضغطي عالشموع 🕯️';
            return;
          }
          if (!ctx.alive() || lit === 0 || !Sound.init()) { stopMic(); micBtn.hidden = true; return; }
          micBtn.disabled = false;
          Sound.stopMusic();
          const an = Sound.ctx.createAnalyser();
          an.fftSize = 512;
          srcNode = Sound.ctx.createMediaStreamSource(stream);
          srcNode.connect(an);
          const buf = new Float32Array(an.fftSize);
          micBtn.textContent = '💨 انفخي هلأ... (اضغطي لتوقفي المايك)';
          micBtn.classList.add('listening');
          let strong = 0, last = 0, level = 0;
          const loop = t => {
            if (!stream) return;
            an.getFloatTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
            const rms = Math.sqrt(sum / buf.length);
            level += (rms - level) * .3;
            cake.style.setProperty('--blow', Math.min(1, level * 5).toFixed(2));
            strong = rms > .12 ? strong + 1 : 0;
            if (strong >= 3 && t - last > 260) {
              last = t;
              const litNow = candles.filter(c => !c.classList.contains('out'));
              if (litNow.length) blowOut(pick(litNow));
            }
            if (lit === 0) { stopMic(); return; }
            micRaf = requestAnimationFrame(loop);
          };
          micRaf = requestAnimationFrame(loop);
        });

        async function finish() {
          Sound.stopMusic();
          stopMic();
          hint.classList.add('gone');
          micBtn.classList.add('gone');
          await ctx.wait(1200);
          showEl(w1);
          Sound.chime([1046.5, 1318.5, 1568, 2093], .14, .06);
          const r = centerOf($('.cake', inner));
          fx.burst(r.x, r.y - 50, { n: 26, kinds: ['star', 'spark'], colors: GOLDS, speed: [.8, 3], gravity: -.01, life: [70, 110] });
          await ctx.wait(1800);
          showEl(w2);
          setLit(.6);
          fx.confetti();
          if (!reduced()) setTimeout(() => ctx.alive() && fx.sideCannons(), 350);
          Sound.chime([784, 988, 1175, 1568, 1976], .09, .07);
          ctx.complete();
          await ctx.wait(1600);
          ctx.showNext('في كمان... 🎀');
        }
      }
    },

    /* ---------- 3 · The Love Jar ---------- */
    {
      ambient: 'hearts',
      render(ctx) {
        const { inner } = ctx;
        const reasons = (C.reasons || []).slice(0, 7);
        while (reasons.length < 7) reasons.push('لأنك إنتِ... وبس ❤️');
        // [paper, rod shade, bulb glow]
        const ROLLS = [
          ['#ffd6e0', '#f08aa8', '#ff4f86'], ['#fff1c9', '#e2b450', '#f6b93b'], ['#e7dcff', '#a88be0', '#9b6bff'],
          ['#ffe0cc', '#f09a6c', '#ff8a50'], ['#d6f0ff', '#7fbde3', '#36a9e1'], ['#ffe3ef', '#f07fae', '#ff6fae'],
          ['#e6ffd9', '#8fcf8f', '#5cc46b']
        ];
        const PILE = [[6, 4, -12], [38, 3, 8], [62, 7, -6], [16, 16, 16], [48, 15, -18], [26, 27, 7], [56, 27, 13]];
        const HEARTS = [[4, 24, -15, '#ff5c8a'], [84, 16, 12, '#ff8fb0'], [42, 38, -8, '#ff3d73'], [80, 34, 20, '#ffb3c6'],
          [18, 40, 10, '#ff8fb0'], [66, 42, -14, '#ff5c8a'], [88, 4, 8, '#ffb3c6'], [34, 50, 4, '#ff6b9a']];
        const TAKE = [6, 5, 4, 3, 2, 1, 0];
        const NOTES = [1046.5, 1175, 1318.5, 1568, 1760, 2093, 2349];
        // bulbs hang on a curved wire; the first reason lights the rightmost bulb (RTL)
        const bulbsHTML = ROLLS.map((c, j) => {
          const t = 1 - (j + 1) / 8;
          const y = (1 - t) ** 2 * 8 + 2 * (1 - t) * t * 90 + t * t * 8;
          return `<button class="bulb" type="button" disabled style="--x:${(t * 100).toFixed(2)}%; --y:${y.toFixed(2)}%; --c:${c[2]}; --d:${(j * .4).toFixed(1)}s; --i:${j}" aria-label="السبب رقم ${arNum(j + 1)} لسا جوّا المرطبان">${heartSVG()}</button>`;
        }).join('');

        inner.innerHTML = `
          <p class="lead rv">خبّيتلك بهالمرطبان إشي صغير...</p>
          <h1 class="title s3-title rv" tabindex="-1" data-focus>7 أسباب بتخلّيني أحبك كل يوم أكتر</h1>
          <div class="jar-stage rv">
            <button class="jar" type="button" aria-label="هزّي المرطبان ليطلع منه سبب">
              <span class="jar-glass">
                <span class="jar-fill">
                  ${PILE.map(([x, y, r], k) => `<span class="roll" style="--x:${x}%; --y:${y}%; --r:${r}deg; --c:${ROLLS[k][0]}; --c2:${ROLLS[k][1]}"></span>`).join('')}
                  ${HEARTS.map(([x, y, r, c]) => `<svg class="jar-heart" viewBox="0 0 24 24" aria-hidden="true" style="--x:${x}%; --y:${y}%; --r:${r}deg; --c:${c}"><path d="${HEART_PATH}"/></svg>`).join('')}
                </span>
                <span class="jar-shine"></span>
              </span>
              <span class="jar-neck"></span>
              <span class="jar-lid"><span class="jar-string"></span></span>
              <span class="jar-tag">إلك ❤️</span>
            </button>
          </div>
          <p class="hint rv" aria-live="polite">اضغطي على المرطبان أو هزّي الموبايل 📳</p>
          <div class="garland rv" role="group" aria-label="الأسباب اللي طلعت من المرطبان">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8 Q50 90 100 8"/></svg>
            ${bulbsHTML}
          </div>
          <p class="title s3-final" hidden aria-live="polite">وصدقيني... هدول بس 7 من مليون سبب ❤️</p>`;
        revealIn(ctx, $$('.rv', inner), 320);

        const jar = $('.jar', inner), hint = $('.hint', inner), garland = $('.garland', inner);
        const rolls = $$('.roll', inner), jarHearts = $$('.jar-heart', inner), bulbs = $$('.bulb', inner);
        let taken = 0, busy = false, pop = null;

        function jiggle() {
          const items = [...rolls, ...jarHearts].filter(el => !el.classList.contains('gone'));
          items.forEach(el => {
            el.style.setProperty('--jx', `${rand(-7, 7).toFixed(1)}px`);
            el.style.setProperty('--jy', `${rand(-16, -2).toFixed(1)}px`);
          });
          setTimeout(() => items.forEach(el => { el.style.setProperty('--jx', '0px'); el.style.setProperty('--jy', '0px'); }), 240);
        }

        async function shake() {
          if (busy || taken >= 7 || !ctx.alive()) return;
          busy = true;
          jar.classList.remove('shake'); void jar.offsetWidth; jar.classList.add('shake');
          jiggle();
          setTimeout(jiggle, 260);
          Sound.clink();
          if (navigator.vibrate) { try { navigator.vibrate([25, 40, 25]); } catch (e) { /* ignore */ } }
          await ctx.wait(580);
          const j = taken++;
          const roll = rolls[TAKE[j]];
          const r = roll.getBoundingClientRect();
          roll.classList.add('gone');
          // the little hearts settle down as the jar empties
          jarHearts.forEach((h, i) => h.style.setProperty('--y', `${(HEARTS[i][1] * (.12 + .88 * (7 - taken) / 7)).toFixed(1)}%`));
          if (taken === 7) jar.classList.add('empty');
          await flyOut(roll, r);
          if (ctx.alive()) openReason(j, true);
        }

        function flyOut(roll, r) {
          Sound.tone(560, { dur: .55, vol: .05, glide: 2.6 });
          if (reduced()) return Promise.resolve();
          const f = document.createElement('span');
          f.className = 'roll flyer';
          f.style.cssText = roll.style.cssText;
          f.style.width = `${r.width}px`;
          f.style.height = `${r.height}px`;
          document.body.append(f);
          const jr = jar.getBoundingClientRect();
          const rot = parseFloat(roll.style.getPropertyValue('--r')) || 0;
          const mx = jr.left + jr.width / 2 - r.width / 2, my = jr.top - r.height * 1.5;
          const cx = innerWidth / 2 - r.width / 2, cy = innerHeight / 2 - r.height / 2;
          const a = f.animate([
            { transform: `translate(${r.left}px, ${r.top}px) rotate(${rot}deg)` },
            { transform: `translate(${mx}px, ${my}px) rotate(${rot + 200}deg) scale(1.25)`, offset: .45 },
            { transform: `translate(${cx}px, ${cy}px) rotate(720deg) scale(2.3)`, opacity: .9 }
          ], { duration: 1050, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
          return a.finished.then(() => f.remove(), () => f.remove());
        }

        function openReason(j, isNew) {
          const [c, c2] = ROLLS[TAKE[j]];
          pop = document.createElement('div');
          pop.className = 'reason-pop';
          pop.setAttribute('role', 'dialog');
          pop.setAttribute('aria-modal', 'true');
          pop.setAttribute('aria-label', `السبب رقم ${arNum(j + 1)}`);
          pop.innerHTML = `
            <div class="scroll" style="--c:${c}; --c2:${c2}">
              <span class="rod top"></span>
              <div class="scroll-paper">
                <span class="scroll-num">السبب ${arNum(j + 1)} من ${arNum(7)}</span>
                <p class="scroll-text">${wrapWords(reasons[j])}</p>
                <button class="btn scroll-keep" type="button">${isNew ? 'خبّيتها بقلبي 💗' : 'رجّعيها 💗'}</button>
              </div>
              <span class="rod bottom"></span>
            </div>`;
          document.body.append(pop);
          const me = pop, scroll = $('.scroll', me), paper = $('.scroll-paper', me), rods = $$('.rod', me), keep = $('.scroll-keep', me);
          const words = $$('.w', me), step = reduced() ? 0 : 90;
          words.forEach((w, i) => { w.style.transitionDelay = `${250 + i * step}ms`; });
          keep.style.transitionDelay = `${350 + words.length * step}ms`;
          if (!reduced()) {
            const h = paper.offsetHeight, opt = { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)' };
            paper.animate([{ clipPath: 'inset(50% 0 50% 0)' }, { clipPath: 'inset(0 0 0 0)' }], opt);
            rods[0].animate([{ transform: `translateY(${h / 2}px)` }, { transform: 'none' }], opt);
            rods[1].animate([{ transform: `translateY(${-h / 2}px)` }, { transform: 'none' }], opt);
          }
          requestAnimationFrame(() => requestAnimationFrame(() => { me.classList.add('in'); scroll.classList.add('shown'); }));
          if (isNew) Sound.chime([NOTES[j]], .08, .07); else Sound.tone(NOTES[j], { dur: .9, vol: .04 });
          setTimeout(() => { if (me.isConnected) keep.focus({ preventScroll: true }); }, 450);
          const close = () => closeReason(me, j, isNew);
          keep.addEventListener('click', close);
          me.addEventListener('click', e => { if (e.target === me) close(); });
          me.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
        }

        async function closeReason(me, j, isNew) {
          if (me.dataset.closing) return;
          me.dataset.closing = '1';
          const sr = $('.scroll', me).getBoundingClientRect();
          me.classList.remove('in');
          setTimeout(() => me.remove(), 450);
          if (pop === me) pop = null;
          if (!isNew) { bulbs[j].focus({ preventScroll: true }); return; }
          await flyHeart(sr, bulbs[j], ROLLS[j][2]);
          if (!ctx.alive()) return;
          const bulb = bulbs[j];
          bulb.classList.add('on');
          bulb.disabled = false;
          bulb.setAttribute('aria-label', `السبب ${arNum(j + 1)}: ${reasons[j]}`);
          const r = centerOf(bulb);
          fx.burst(r.x, r.y, { n: 14, kinds: ['spark', 'heart'], colors: [ROLLS[j][2], '#ffffff'], speed: [1, 3.5], size: [6, 11], gravity: .03, life: [35, 60] });
          Sound.chime([NOTES[j] * 1.5], .05, .05);
          hint.textContent = taken < 7 ? `طلع ${arNum(taken)} من ${arNum(7)}... هزّي كمان 💗` : '';
          busy = false;
          if (taken === 7) finish();
          else jar.focus({ preventScroll: true });
        }

        function flyHeart(from, bulb, color) {
          if (reduced()) return Promise.resolve();
          const b = bulb.getBoundingClientRect();
          const f = document.createElement('span');
          f.className = 'heart-flyer';
          f.style.setProperty('--c', color);
          f.innerHTML = heartSVG();
          document.body.append(f);
          const sx = from.left + from.width / 2 - 20, sy = from.top + from.height / 2 - 20;
          const ex = b.left + b.width / 2 - 20, ey = b.top + b.height / 2 - 14;
          const a = f.animate([
            { transform: `translate(${sx}px, ${sy}px) scale(1.6)`, opacity: 0 },
            { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 60}px) scale(1.2) rotate(-15deg)`, opacity: 1, offset: .45 },
            { transform: `translate(${ex}px, ${ey}px) scale(.6)`, opacity: 1 }
          ], { duration: 800, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
          return a.finished.then(() => f.remove(), () => f.remove());
        }

        bulbs.forEach((bulb, j) => bulb.addEventListener('click', () => {
          if (!bulb.classList.contains('on') || busy || pop) return;
          openReason(j, false);
        }));

        // shake the phone — iOS needs a one-time permission, asked on the first tap
        let asked = false, lastAcc = null, lastShake = 0;
        const onMotion = e => {
          const a = e.accelerationIncludingGravity;
          if (!a || a.x == null) return;
          if (lastAcc) {
            const d = Math.abs(a.x - lastAcc.x) + Math.abs(a.y - lastAcc.y) + Math.abs(a.z - lastAcc.z);
            const now = performance.now();
            if (d > 22 && now - lastShake > 1300) { lastShake = now; shake(); }
          }
          lastAcc = { x: a.x, y: a.y, z: a.z };
        };
        addEventListener('devicemotion', onMotion);
        ctx.onLeave(() => {
          removeEventListener('devicemotion', onMotion);
          $$('.reason-pop, .roll.flyer, .heart-flyer').forEach(el => el.remove());
        });
        jar.addEventListener('click', () => {
          if (!asked && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            asked = true;
            DeviceMotionEvent.requestPermission().catch(() => { /* taps still work */ });
          }
          shake();
        });

        async function finish() {
          garland.classList.add('all');
          await ctx.wait(1000);
          const fin = $('.s3-final', inner);
          showEl(fin);
          fin.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
          Sound.chime([1318.5, 1568, 2093, 2637], .11, .06);
          const r = centerOf(fin);
          fx.fountain(r.x, r.y, 36);
          ctx.complete();
          await ctx.wait(1300);
          ctx.showNext('كمّلي معي ✨');
        }
      }
    },

    /* ---------- 4 · Our Little Universe ---------- */
    {
      ambient: 'night',
      render(ctx) {
        const { inner } = ctx;
        const stars = (C.stars || []).slice(0, 5);
        while (stars.length < 5) stars.push({ label: 'إحنا', text: 'وكل نجمة بتحكي عنك ❤️' });
        const heartXY = t => {
          const x = 16 * Math.sin(t) ** 3;
          const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
          return [50 + x * 2.6, 48 - y * 2.6];
        };
        const pts = [];
        for (let k = 0; k <= 180; k++) pts.push(heartXY(k / 180 * Math.PI * 2));
        const heartD = 'M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join(' L') + 'Z';
        const spots = [0, 1, 2, 3, 4].map(k => heartXY(k * Math.PI * 2 / 5));
        const NOTES = [1318.5, 1568, 1760, 2093, 2349];

        inner.innerHTML = `
          <p class="lead rv">في نجوم بالسما كتير...</p>
          <h1 class="title rv" tabindex="-1" data-focus>بس إنتِ نجمة حياتي.</h1>
          <div class="sky rv">
            <svg class="sky-svg" viewBox="0 0 100 100" role="group" aria-label="سما فيها خمس نجوم بتلمع">
              <defs>
                <radialGradient id="starHalo"><stop offset="0" stop-color="#fff3c4" stop-opacity=".9"/><stop offset=".4" stop-color="#ffd36e" stop-opacity=".35"/><stop offset="1" stop-color="#ffd36e" stop-opacity="0"/></radialGradient>
                <filter id="sglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
              </defs>
              <path class="heart-fill" d="${heartD}"/>
              <g class="links"></g>
              <path class="heart-line" d="${heartD}" pathLength="1" filter="url(#sglow)"/>
              ${spots.map(([x, y], k) => `
                <g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">
                  <g class="sstar" role="button" tabindex="0" aria-label="نجمة ${arNum(k + 1)} بتلمع" style="--d:${(k * .43).toFixed(2)}s">
                    <circle class="s-hit" r="8"/>
                    <g class="s-pulse">
                      <circle class="s-halo" r="6" fill="url(#starHalo)"/>
                      <path class="s-shape" d="M0 -3.4 Q0 0 3.4 0 Q0 0 0 3.4 Q0 0 -3.4 0 Q0 0 0 -3.4Z"/>
                    </g>
                    <text class="s-label" y="${y > 60 ? 9.5 : -6.5}">${esc(stars[k].label)}</text>
                  </g>
                </g>`).join('')}
            </svg>
          </div>
          <div class="star-msg rv" aria-live="polite">
            <p class="sm-label"></p>
            <p class="sm-text">اضغطي على النجوم اللي بتلمع ✨</p>
            <div class="sm-dots">${'<i></i>'.repeat(5)}</div>
          </div>
          <p class="title s4-final" hidden aria-live="polite">وكل الطرق بقلبي بتوصل إلك ❤️</p>`;
        revealIn(ctx, $$('.rv', inner), 380);

        const sky = $('.sky', inner), links = $('.links', inner), msg = $('.star-msg', inner);
        const dots = $$('.sm-dots i', inner);
        const found = [];
        $$('.sstar', inner).forEach((g, k) => onActivate(g, () => {
          if (g.classList.contains('found') || found.length === 5) return;
          g.classList.add('found');
          g.setAttribute('aria-label', `${stars[k].label}: ${stars[k].text}`);
          found.push(k);
          Sound.chime([NOTES[found.length - 1], NOTES[found.length - 1] * 1.5], .12, .06);
          const r = centerOf($('.s-shape', g));
          fx.burst(r.x, r.y, { n: 18, kinds: ['star', 'spark'], colors: GOLDS, speed: [1, 3.5], gravity: 0, size: [6, 12], life: [40, 70] });
          if (found.length > 1) {
            const [ax, ay] = spots[found[found.length - 2]], [bx, by] = spots[k];
            links.insertAdjacentHTML('beforeend', `<path class="link" d="M${ax.toFixed(2)} ${ay.toFixed(2)} L${bx.toFixed(2)} ${by.toFixed(2)}" pathLength="1"/>`);
          }
          msg.classList.remove('swap'); void msg.offsetWidth; msg.classList.add('swap');
          $('.sm-label', msg).textContent = stars[k].label;
          $('.sm-text', msg).textContent = stars[k].text;
          dots.forEach((d, j) => d.classList.toggle('on', j < found.length));
          if (found.length === 5) finish();
        }));

        async function finish() {
          await ctx.wait(1700);
          sky.classList.add('complete');
          Sound.chime([784, 988, 1175, 1568, 1976, 2349], .22, .05);
          await ctx.wait(3000);
          const fin = $('.s4-final', inner);
          showEl(fin);
          fin.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
          const r = centerOf(sky);
          fx.burst(r.x, r.y, { n: 30, kinds: ['heart', 'spark'], colors: ['#ff8fb0', '#ffd6e2', '#f6c86e'], speed: [1, 4], gravity: .01, life: [60, 100] });
          ctx.complete();
          await ctx.wait(1300);
          ctx.showNext('تعالي نتذكّر 📸');
        }
      }
    },

    /* ---------- 5 · Our Beautiful Memories ---------- */
    {
      ambient: 'dust',
      render(ctx) {
        const { inner } = ctx;
        const mem = (C.memories || []).filter(Boolean);
        if (!mem.length) mem.push({ caption: 'أحلى ذكرى... لسا ما صوّرناها ❤️' });
        const N = mem.length;
        const rots = [-3, 2.5, -1.5, 3.5, -2.5, 1.5, -3.5, 2];
        const hues = [340, 20, 290, 200, 30, 320, 260, 10];
        inner.innerHTML = `
          <h1 class="title rv" tabindex="-1" data-focus>دفتر ذكرياتنا 📸</h1>
          <p class="lead rv">كل صورة هون حكاية صغيرة... اسحبيها لتفتحي اللي بعدها</p>
          <div class="deck rv" role="group" aria-label="صور الذكريات">
            ${mem.map((m, k) => `
              <figure class="polaroid" data-k="${k}" style="--r:${rots[k % rots.length]}deg; --h:${hues[k % hues.length]}">
                <div class="photo${m.photo ? '' : ' noimg'}">
                  ${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.caption || '')}" draggable="false" decoding="async">` : ''}
                  <span class="ph-fallback">${heartSVG()}</span>
                  <span class="develop"></span>
                </div>
                <figcaption><span class="cap">${esc(m.caption || '')}</span>${m.date ? `<span class="date">${esc(m.date)}</span>` : ''}</figcaption>
              </figure>`).join('')}
          </div>
          <div class="deck-ctrl rv">
            <button class="btn btn-soft deck-next" type="button">الذكرى الجاية ←</button>
            <span class="deck-count" aria-live="polite">${arNum(1)} / ${arNum(N)}</span>
          </div>
          <p class="s5-final" hidden aria-live="polite">وأحلى إشي؟ إنو لسه قدامنا ذكريات أحلى بكتير.</p>`;
        revealIn(ctx, $$('.rv', inner), 300);

        const deck = $('.deck', inner), cards = $$('.polaroid', inner), countEl = $('.deck-count', inner);
        const nextBtn = $('.deck-next', inner);
        $$('.photo img', inner).forEach(img => {
          const fail = () => img.parentElement.classList.add('noimg');
          img.addEventListener('error', fail);
          if (img.complete && !img.naturalWidth) fail();
        });

        const order = cards.map((_, k) => k);
        const seen = new Set();
        let shown = 1, busy = false, finished = false;
        if (N === 1) nextBtn.hidden = true;

        function layout() {
          order.forEach((k, pos) => {
            const c = cards[k];
            c.style.zIndex = String(100 - pos);
            c.style.setProperty('--pos', String(Math.min(pos, 3)));
            c.classList.toggle('top', pos === 0);
            c.classList.toggle('deep', pos > 2);
            c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
          });
        }
        function reveal(k) {
          cards[k].classList.add('developed');
          seen.add(k);
          if (seen.size === N && !finished) finish();
        }
        layout();
        ctx.wait(1500).then(() => { reveal(order[0]); Sound.chime([1046.5], .1, .04); });

        async function fling(dir) {
          if (busy || N < 2) return;
          busy = true;
          const card = cards[order[0]];
          Sound.whoosh();
          card.classList.remove('dragging');
          card.style.transition = 'transform .55s cubic-bezier(.5,0,.75,0), opacity .5s ease';
          card.style.transform = `translateX(${dir * innerWidth * .95}px) rotate(${dir * 28}deg)`;
          card.style.opacity = '0';
          await ctx.wait(560);
          order.push(order.shift());
          card.style.transition = 'none';
          card.style.transform = '';
          card.style.opacity = '';
          layout();
          void card.offsetWidth;
          card.style.transition = '';
          shown = shown % N + 1;
          countEl.textContent = `${arNum(shown)} / ${arNum(N)}`;
          reveal(order[0]);
          busy = false;
        }
        nextBtn.addEventListener('click', () => fling(-1));

        // swipe
        let drag = null;
        deck.addEventListener('pointerdown', e => {
          const card = e.target.closest('.polaroid.top');
          if (!card || busy || N < 2) return;
          drag = { card, x0: e.clientX, y0: e.clientY, dx: 0, t0: performance.now(), id: e.pointerId };
          try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        });
        deck.addEventListener('pointermove', e => {
          if (!drag || e.pointerId !== drag.id) return;
          drag.dx = e.clientX - drag.x0;
          if (Math.abs(drag.dx) < 4) return;
          drag.card.classList.add('dragging');
          const r = parseFloat(drag.card.style.getPropertyValue('--r')) || 0;
          drag.card.style.transform = `translateX(${drag.dx}px) rotate(${r + drag.dx / 14}deg)`;
        });
        const end = e => {
          if (!drag || e.pointerId !== drag.id) return;
          const { card, dx, t0 } = drag;
          drag = null;
          const v = dx / Math.max(1, performance.now() - t0);
          if (Math.abs(dx) > 80 || (Math.abs(dx) > 30 && Math.abs(v) > .55)) fling(Math.sign(dx));
          else { card.classList.remove('dragging'); card.style.transform = ''; }
        };
        deck.addEventListener('pointerup', end);
        deck.addEventListener('pointercancel', end);

        async function finish() {
          finished = true;
          await ctx.wait(2600);
          const fin = $('.s5-final', inner);
          showEl(fin);
          fin.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
          Sound.chime([1046.5, 1318.5, 1568, 2093], .12, .06);
          const r = centerOf(deck);
          fx.burst(r.x, r.y, { n: 24, kinds: ['heart'], colors: ['#d94a72', '#ff8fb0', '#f6c86e'], speed: [2, 6], gravity: .08 });
          ctx.complete();
          await ctx.wait(1300);
          ctx.showNext('في إشي كتبتلك إياه 💌');
        }
      }
    },

    /* ---------- 6 · A Letter From My Heart ---------- */
    {
      ambient: 'embers',
      render(ctx) {
        const { inner } = ctx;
        const L = C.letter || {};
        const parts = [
          { cls: 'greet', text: L.greeting || 'حبيبتي،' },
          ...(L.paragraphs || []).map(t => ({ cls: '', text: t })),
          ...(L.closing ? [{ cls: 'closing', text: L.closing }] : []),
          ...(L.signature ? [{ cls: 'sign', text: L.signature }] : [])
        ];
        inner.innerHTML = `
          <h1 class="title rv" tabindex="-1" data-focus>رسالة من قلبي 💌</h1>
          <p class="lead rv">كتبتلك إياها بإيدي... وبقلبي قبل إيدي</p>
          <div class="sealed rv">
            <div class="folded"><span class="to">إلى ${esc(herName)}</span></div>
            <button class="seal" type="button" aria-label="اضغطي مطوّل على الختم لتفتحي الرسالة">
              <svg class="seal-ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-bg" cx="50" cy="50" r="46"/><circle class="ring-fg" cx="50" cy="50" r="46" pathLength="1"/></svg>
              <span class="wax">${heartSVG()}</span>
            </button>
          </div>
          <p class="hint rv">اضغطي مطوّل على الختم 🔒</p>
          <article class="letter" hidden aria-live="polite">
            ${parts.map(p => `<p class="lp ${p.cls}">${wrapWords(p.text)}</p>`).join('')}
            <button class="read-more" type="button" hidden>كمّلي القراءة ↓</button>
          </article>
          <div class="s6-heart" hidden>
            <p class="lead">اضغطي على القلب إذا وصلتك مشاعري ❤️</p>
            <button class="big-heart" type="button" aria-label="وصلتني مشاعرك">${heartSVG()}</button>
          </div>`;
        revealIn(ctx, $$('.rv', inner), 340);

        const seal = $('.seal', inner), ring = $('.ring-fg', inner), sealed = $('.sealed', inner), hint = $('.hint', inner);
        const letter = $('.letter', inner), more = $('.read-more', inner), paras = $$('.lp', inner);
        const heartBox = $('.s6-heart', inner), bigHeart = $('.big-heart', inner);
        const HOLD = reduced() ? 900 : 1700;
        let p = 0, start = null, raf = 0, opened = false;

        const setP = v => { p = v; ring.style.strokeDashoffset = String(1 - v); seal.style.setProperty('--p', v.toFixed(3)); };
        function tick(t) {
          if (start === null) return;
          setP(Math.min(1, (t - start) / HOLD));
          if (p >= 1) { openLetter(); return; }
          raf = requestAnimationFrame(tick);
        }
        function down(e) {
          if (opened || start !== null) return;
          if (e && e.cancelable) e.preventDefault();
          Sound.init();
          start = performance.now() - p * HOLD;
          seal.classList.add('holding');
          if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) { /* ignore */ } }
          Sound.tone(220, { dur: HOLD / 1000, vol: .05, attack: HOLD / 1000 * .9, glide: 2 });
          raf = requestAnimationFrame(tick);
        }
        function up() {
          if (opened || start === null) return;
          start = null;
          cancelAnimationFrame(raf);
          seal.classList.remove('holding');
          const from = p, t0 = performance.now();
          const back = t => {
            if (start !== null || opened) return;
            const k = Math.min(1, (t - t0) / 350);
            setP(from * (1 - k));
            if (k < 1) requestAnimationFrame(back);
          };
          requestAnimationFrame(back);
        }
        seal.addEventListener('pointerdown', down);
        seal.addEventListener('pointerup', up);
        seal.addEventListener('pointerleave', up);
        seal.addEventListener('pointercancel', up);
        seal.addEventListener('contextmenu', e => e.preventDefault());
        seal.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } });
        seal.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') up(); });
        seal.addEventListener('click', e => e.preventDefault());

        async function openLetter() {
          opened = true;
          start = null;
          seal.classList.remove('holding');
          seal.classList.add('broken');
          seal.disabled = true;
          Sound.chime([523.25, 659.25, 784, 1046.5], .12, .07);
          const r = centerOf(seal);
          fx.burst(r.x, r.y, { n: 30, kinds: ['spark', 'star'], colors: ['#ffd38a', '#ffbe6e', '#fff5d6'], speed: [1, 4.5], gravity: .02, life: [40, 80] });
          hint.classList.add('gone');
          await ctx.wait(800);
          sealed.classList.add('gone');
          await ctx.wait(700);
          sealed.hidden = true;
          hint.hidden = true;
          letter.hidden = false;
          letter.classList.add('unfold');
          Sound.whoosh();
          ctx.el.scrollTo({ top: 0, behavior: 'auto' });
          await ctx.wait(1100);
          revealNext();
        }

        let idx = 0, animating = false, skip = null;
        async function revealNext() {
          if (animating || idx >= paras.length) return;
          animating = true;
          more.hidden = true;
          const para = paras[idx++];
          const words = $$('.w', para);
          const step = reduced() ? 0 : 75;
          words.forEach((w, k) => { w.style.transitionDelay = `${k * step}ms`; });
          para.classList.add('on');
          void para.offsetWidth;
          para.classList.add('shown');
          para.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
          await new Promise(res => {
            const tm = setTimeout(res, words.length * step + 900);
            skip = () => { clearTimeout(tm); words.forEach(w => { w.style.transitionDelay = '0ms'; }); res(); };
          });
          skip = null;
          if (!ctx.alive()) return;
          animating = false;
          if (idx < paras.length) {
            more.hidden = false;
            more.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
          } else {
            await ctx.wait(1200);
            showEl(heartBox);
            heartBox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
          }
        }
        more.addEventListener('click', e => { e.stopPropagation(); Sound.tone(880, { dur: .5, vol: .04 }); revealNext(); });
        letter.addEventListener('click', () => {
          if (animating && skip) skip();
          else if (!more.hidden) revealNext();
        });

        bigHeart.addEventListener('click', async () => {
          if (bigHeart.classList.contains('filled')) return;
          bigHeart.classList.add('filled');
          bigHeart.setAttribute('aria-label', 'وصلت ❤️');
          Sound.thump();
          Sound.chime([1046.5, 1318.5, 1568, 2093], .1, .06);
          const r = centerOf(bigHeart);
          fx.burst(r.x, r.y, { n: 40, kinds: ['heart', 'heart', 'spark'], colors: PINKS, speed: [2, 8], size: [8, 18], gravity: .06, life: [70, 120] });
          ctx.complete();
          await ctx.wait(1300);
          ctx.showNext('لسا في كمان 🥹');
          const nb = $('.next-wrap', inner);
          if (nb) nb.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
        });
      }
    },

    /* ---------- 7 · A Little Love Game ---------- */
    {
      ambient: 'bubbles',
      render(ctx) {
        const { inner } = ctx;
        inner.innerHTML = `
          <p class="lead rv">طيب... قبل آخر مفاجأة، عندي سؤال مهم 👀</p>
          <h1 class="title s7-q rv" tabindex="-1" data-focus>قديش بتحبيني؟</h1>
          <div class="choices rv">
            <button class="choice choice-a" type="button">قد الدنيا ❤️</button>
            <button class="choice choice-b" type="button">أكتر من الدنيا كلها 😌</button>
          </div>
          <div class="answer" hidden aria-live="polite">
            <div class="answer-art"></div>
            <p class="answer-text"></p>
          </div>
          <p class="title s7-more" hidden>بس أنا بحبك أكتر من كل الخيارات ❤️</p>
          <div class="meter-box" hidden>
            <p class="lead">وإذا بدك تعرفي قديش... عبّي عدّاد الحب 👇</p>
            <span class="meter-val" aria-hidden="true">${arNum(0)}٪</span>
            <div class="meter" role="meter" aria-label="عدّاد الحب" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
              <span class="meter-heart">${heartSVG()}</span>
              <div class="meter-track">
                <div class="meter-fill"></div>
                <svg class="cracks" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M42 0 L48 9 L42 14 L50 24"/><path d="M48 9 L58 11"/>
                  <path d="M112 0 L106 8 L114 13 L108 24"/><path d="M114 13 L124 15"/>
                  <path d="M162 0 L168 10 L161 15 L166 24"/>
                </svg>
              </div>
            </div>
            <button class="btn pump" type="button">عبّي 💗</button>
          </div>
          <div class="infinity" hidden aria-live="polite">
            <div class="inf-sym" aria-hidden="true">∞</div>
            <p class="title">حبنا ما إله نهاية ♾️</p>
          </div>`;
        revealIn(ctx, $$('.rv', inner), 340);

        const choices = $('.choices', inner), answer = $('.answer', inner), art = $('.answer-art', inner), ansText = $('.answer-text', inner);
        const more = $('.s7-more', inner), meterBox = $('.meter-box', inner), meter = $('.meter', inner);
        const fill = $('.meter-fill', inner), val = $('.meter-val', inner), pump = $('.pump', inner), inf = $('.infinity', inner);

        $$('.choice', inner).forEach(btn => btn.addEventListener('click', async () => {
          if (choices.classList.contains('chosen')) return;
          const isA = btn.classList.contains('choice-a');
          btn.classList.add('picked');
          choices.classList.add('chosen');
          Sound.chime(isA ? [1046.5, 1318.5] : [1046.5, 1318.5, 1568, 2093], .09, .07);
          if (isA) {
            art.innerHTML = `<div class="orbit">${[0, 60, 120, 180, 240, 300].map(a => `<span style="--a:${a}deg">${heartSVG()}</span>`).join('')}</div><div class="globe" aria-hidden="true">🌍</div>`;
            ansText.textContent = 'قد الدنيا؟ 🥹 حلو... بس إنتِ أصلاً دنيتي كلها!';
          } else {
            art.innerHTML = '<div class="jumper" aria-hidden="true">🥰</div>';
            ansText.textContent = 'عرفت إنك رح تختاريها 😌 قلبي هلأ عم يرقص من الفرحة!';
          }
          await ctx.wait(650);
          choices.hidden = true;
          showEl(answer);
          const r = centerOf(art);
          if (isA) fx.burst(r.x, r.y, { n: 22, kinds: ['heart', 'star'], colors: ['#ff3d73', '#fff', '#ffd6e2'], speed: [2, 5], gravity: .05 });
          else {
            fx.fountain(r.x, r.y, 30);
            ctx.wait(700).then(() => fx.fountain(r.x - 60, r.y + 20, 16));
            ctx.wait(1000).then(() => fx.fountain(r.x + 60, r.y + 20, 16));
          }
          await ctx.wait(2400);
          showEl(more);
          Sound.chime([1318.5, 1568], .1, .05);
          await ctx.wait(1500);
          showEl(meterBox);
          meterBox.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
        }));

        const STEPS = [20, 40, 60, 80, 100, 150, 230, 400];
        const LABELS = ['عبّي 💗', 'كمان 💗', 'كمان شوي 💞', 'قرّبنا! 💖', 'كمان؟ 😳', 'مش رح يوقف 😂', 'انتبهي!! 💥', 'خلص... رح ينفجر 💣'];
        let step = 0, broken = false;
        pump.addEventListener('click', async () => {
          if (broken) return;
          if (step < STEPS.length) {
            const v = STEPS[step++];
            const visual = v <= 100 ? v : 100 + (v - 100) * .1;
            fill.style.setProperty('--w', `calc(${visual}% - 4px)`);
            val.textContent = `${arNum(v)}٪`;
            val.classList.remove('bump'); void val.offsetWidth; val.classList.add('bump');
            meter.setAttribute('aria-valuenow', String(Math.min(v, 100)));
            meter.setAttribute('aria-valuetext', `${v}٪`);
            meter.style.setProperty('--hs', String(1 + Math.min(v, 400) / 400 * .45));
            meter.classList.toggle('over', v > 100);
            $('.cracks', meter).style.setProperty('--crack', v > 100 ? String(Math.min(1, (v - 100) / 200)) : '0');
            pump.textContent = LABELS[Math.min(step, LABELS.length - 1)];
            Sound.tone(300 + v * 2.2, { dur: .35, vol: .08, glide: 1.3, type: 'triangle' });
            const r = centerOf($('.meter-heart', meter));
            fx.burst(r.x, r.y, { n: v > 100 ? 12 : 6, kinds: ['heart'], colors: PINKS, speed: [1.5, 4], size: [6, 11], gravity: .05, life: [35, 60] });
            return;
          }
          broken = true;
          pump.disabled = true;
          meter.classList.remove('over');
          meter.classList.add('broken');
          val.textContent = '∞';
          meter.setAttribute('aria-valuetext', 'ما إله نهاية');
          Sound.noise(.6, { freq: 300, q: .5, vol: .3, sweep: .3 });
          Sound.chime([784, 988, 1175, 1568, 1976, 2349], .07, .07);
          const r = centerOf(meter);
          fx.burst(r.x, r.y, { n: 60, kinds: ['heart', 'heart', 'rect', 'spark'], colors: [...PINKS, '#ffe7a8'], speed: [3, 11], size: [8, 16], gravity: .15, life: [80, 140] });
          fx.confetti({ y: r.y });
          await ctx.wait(800);
          meterBox.hidden = true;
          inf.hidden = false;
          inf.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
          ctx.complete();
          await ctx.wait(1600);
          ctx.showNext('يلا عالمفاجأة الأخيرة 🎁');
        });
      }
    },

    /* ---------- 8 · The Grand Finale ---------- */
    {
      ambient: 'gold',
      render(ctx) {
        const { inner } = ctx;
        const audioSrc = C.audio;
        inner.innerHTML = `
          <div class="s8-intro">
            <p class="lead rv">وصلنا لآخر مفاجأة...</p>
            <h1 class="title rv" tabindex="-1" data-focus>بس حبي إلك ما إله آخر.</h1>
            <div class="gift-wrap rv">
              <div class="gift-rays"></div>
              <button class="gift" type="button" aria-label="الهدية مربوطة بشريطة، فكّيها أول">
                <span class="gift-beam"></span>
                <span class="gift-box"></span>
                <span class="gift-lid"></span>
              </button>
              <button class="bow-handle" type="button" aria-label="اسحبي الشريطة لفوق لتفكّيها"><svg viewBox="0 0 100 50" aria-hidden="true"><path d="M50 40 C30 6 2 8 8 30 C12 46 38 46 50 40Z" fill="#f6c86e"/><path d="M50 40 C70 6 98 8 92 30 C88 46 62 46 50 40Z" fill="#e9b452"/><path d="M50 40 C42 30 30 26 24 30" stroke="#d99a2b" stroke-width="2" fill="none"/><path d="M50 40 C58 30 70 26 76 30" stroke="#c98a20" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="7.5" fill="#ffe3a3"/></svg></button>
            </div>
            <p class="hint rv" aria-live="polite">اسحبي الشريطة لفوق لتفكّيها 🎀</p>
          </div>
          <div class="s8-final" hidden aria-live="polite">
            <p class="fl fl1">لو رجع فيّ الزمن ألف مرة...</p>
            <p class="fl fl2">وبكل مرة كان عندي فرصة أختار...</p>
            <p class="fl fl3">كنت رح أختارك إنتِ.</p>
            <div class="fl fl-div" aria-hidden="true">${heartSVG()}</div>
            <p class="fl fl5">كل عام وإنتِ حبيبتي، وزوجتي، وأجمل نصيب بحياتي ❤️</p>
            <h2 class="fl her-name"><span>${esc(herName)}</span></h2>
            <div class="fl audio-box" hidden>
              <button class="btn btn-gold audio-btn" type="button">اسمعي آخر إشي بدي أحكيلك إياه 🎧</button>
              <div class="wave" aria-hidden="true">${Array.from({ length: 14 }, (_, k) => `<i style="--i:${k}"></i>`).join('')}</div>
            </div>
            <p class="fl forever">بحبك... اليوم، وبكرا، وكل العمر. ❤️</p>
            <div class="fl"><button class="restart" type="button">ابدئي الرحلة من جديد</button></div>
          </div>`;
        revealIn(ctx, $$('.rv', inner), 380);

        const intro = $('.s8-intro', inner), finalBox = $('.s8-final', inner), gift = $('.gift', inner), hint = $('.hint', inner);
        const audioBox = $('.audio-box', inner), audioBtn = $('.audio-btn', inner), wave = $('.wave', inner);

        // The audio message is optional — only show the button if the file actually exists
        let audioOk = false, audio = null;
        if (audioSrc && location.protocol !== 'file:') {
          fetch(audioSrc, { method: 'HEAD', cache: 'no-store' })
            .then(r => { audioOk = r.ok && !/text\/html/i.test(r.headers.get('content-type') || ''); })
            .catch(() => { audioOk = false; });
        }
        ctx.onLeave(() => { if (audio) audio.pause(); document.body.classList.remove('cinema'); blackout.classList.remove('on'); });

        audioBtn.addEventListener('click', () => {
          if (!audio) {
            audio = new Audio(audioSrc);
            audio.addEventListener('ended', () => { wave.classList.remove('playing'); audioBtn.textContent = 'اسمعيها كمان مرة 🎧'; });
            audio.addEventListener('pause', () => wave.classList.remove('playing'));
            audio.addEventListener('play', () => wave.classList.add('playing'));
          }
          if (audio.paused) {
            Sound.stopMusic();
            audio.play().catch(() => { /* blocked */ });
            audioBtn.textContent = 'عم تسمعي صوتي... ⏸';
          } else {
            audio.pause();
            audioBtn.textContent = 'كمّلي السماع 🎧';
          }
        });

        const bow = $('.bow-handle', inner);
        let tied = true, bowDrag = null;
        function nudge() {
          bow.classList.remove('nudge'); void bow.offsetWidth; bow.classList.add('nudge');
          hint.textContent = 'اسحبي الشريطة لفوق ⬆️🎀';
          Sound.tone(700, { dur: .2, vol: .05, glide: 1.3, type: 'triangle' });
        }
        function untie() {
          if (!tied) return;
          tied = false;
          bowDrag = null;
          bow.classList.remove('dragging');
          bow.classList.add('gone');
          bow.disabled = true;
          const from = bow.style.transform || 'none';
          bow.animate([
            { transform: from, opacity: 1 },
            { transform: `translate(${rand(-70, 70)}px, ${-innerHeight * .5}px) rotate(${rand(-220, 220)}deg) scale(.6)`, opacity: 0 }
          ], { duration: reduced() ? 300 : 1100, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' });
          gift.classList.add('untied');
          gift.setAttribute('aria-label', 'افتحي الهدية');
          Sound.noise(.45, { freq: 1200, q: .8, vol: .12, sweep: 3 });
          Sound.chime([1318.5, 1760], .08, .05);
          const r = centerOf(bow);
          fx.burst(r.x, r.y, { n: 22, kinds: ['spark', 'star'], colors: GOLDS, speed: [1, 4], gravity: .02, life: [40, 70] });
          hint.textContent = 'هلأ افتحي الهدية 🎁';
        }
        bow.addEventListener('pointerdown', e => {
          if (!tied) return;
          e.preventDefault();
          bowDrag = { x0: e.clientX, y0: e.clientY, id: e.pointerId, moved: 0 };
          try { bow.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          bow.classList.add('dragging');
        });
        bow.addEventListener('pointermove', e => {
          if (!bowDrag || e.pointerId !== bowDrag.id) return;
          const dx = e.clientX - bowDrag.x0, dy = e.clientY - bowDrag.y0;
          bowDrag.moved = Math.max(bowDrag.moved, Math.hypot(dx, dy));
          const pull = Math.max(0, -dy);
          bow.style.transform = `translate(${dx * .35}px, ${Math.min(dy, 0) * .6 + Math.max(dy, 0) * .15}px) rotate(${dx * .15}deg) scale(${1 + pull / 350})`;
          if (pull > 85) untie();
        });
        const bowRelease = e => {
          if (!bowDrag || e.pointerId !== bowDrag.id) return;
          const tap = bowDrag.moved < 8;
          bowDrag = null;
          bow.classList.remove('dragging');
          if (!tied) return;
          bow.style.transform = '';
          if (tap) nudge();
        };
        bow.addEventListener('pointerup', bowRelease);
        bow.addEventListener('pointercancel', bowRelease);
        bow.addEventListener('contextmenu', e => e.preventDefault());
        bow.addEventListener('click', e => { if (e.detail === 0) untie(); }); // keyboard

        let opened = false;
        gift.addEventListener('click', async () => {
          if (tied) { nudge(); return; }
          if (opened) return;
          opened = true;
          ctx.complete();
          hint.classList.add('gone');
          gift.classList.add('shake');
          Sound.tone(140, { dur: .8, vol: .12, glide: 1.6, type: 'triangle' });
          await ctx.wait(750);
          gift.classList.remove('shake');
          gift.classList.add('open');
          gift.setAttribute('aria-label', 'الهدية مفتوحة');
          Sound.chime([784, 988, 1175, 1568], .08, .07);
          const r = centerOf(gift);
          fx.burst(r.x, r.y - 30, { n: 40, kinds: ['spark', 'star'], colors: GOLDS, speed: [2, 7], gravity: .03, life: [50, 90], spread: 1.6, angle: -Math.PI / 2 });
          await ctx.wait(900);

          // a brief cinematic darkness
          document.body.classList.add('cinema');
          blackout.classList.add('on');
          ambient.setMode('none');
          await ctx.wait(1500);
          const cx = innerWidth / 2, cy = innerHeight * .45;
          fx.burst(cx, cy, { n: 50, kinds: ['spark', 'star'], colors: GOLDS, speed: [1, 6], gravity: .01, life: [90, 150] });
          Sound.chime([523.25, 659.25, 784, 1046.5, 1318.5, 1568, 2093], .16, .05);
          await ctx.wait(900);
          fx.burst(cx, cy, { n: 40, kinds: ['heart', 'heart', 'spark'], colors: PINKS, speed: [1, 7], size: [8, 18], gravity: .02, life: [100, 160] });
          intro.hidden = true;
          finalBox.hidden = false;
          ctx.el.scrollTo({ top: 0, behavior: 'auto' });
          ambient.setMode('finale');
          await ctx.wait(500);
          blackout.classList.remove('on');
          await ctx.wait(900);
          document.body.classList.remove('cinema');
          stages();
        });

        // Lines reveal in stages; a tap moves to the next line faster
        let hurry = null;
        finalBox.addEventListener('click', e => { if (!e.target.closest('button') && hurry) hurry(); });
        const pause = ms => new Promise(res => {
          const tm = setTimeout(() => { hurry = null; if (ctx.alive()) res(); }, reduced() ? Math.min(ms, 900) : ms);
          hurry = () => { clearTimeout(tm); hurry = null; if (ctx.alive()) res(); };
        });
        async function stages() {
          const lines = $$('.fl', finalBox);
          for (const el of lines) {
            if (el === audioBox) {
              if (!audioOk) continue;
              audioBox.hidden = false;
            }
            el.classList.add('in');
            if (el.classList.contains('fl3')) { Sound.chime([1046.5, 1568], .12, .05); }
            if (el.classList.contains('her-name')) {
              Sound.chime([784, 988, 1175, 1568, 1976], .1, .06);
              const r = centerOf(el);
              fx.burst(r.x, r.y, { n: 50, kinds: ['star', 'spark', 'heart'], colors: [...GOLDS, '#ff8fb0'], speed: [2, 7], gravity: .03, life: [80, 140] });
              if (!reduced()) fx.sideCannons();
            }
            el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest' });
            const wait = el.classList.contains('fl-div') ? 1200 : el.classList.contains('her-name') ? 3200 : el.classList.contains('forever') ? 2200 : 2600;
            await pause(wait);
          }
        }

        const restartBtn = $('.restart', inner);
        let confirmTm = 0;
        restartBtn.addEventListener('click', () => {
          if (!restartBtn.classList.contains('confirm')) {
            restartBtn.classList.add('confirm');
            restartBtn.textContent = 'متأكدة؟ اضغطي كمان مرة لنبدأ من الأول';
            clearTimeout(confirmTm);
            confirmTm = setTimeout(() => { restartBtn.classList.remove('confirm'); restartBtn.textContent = 'ابدئي الرحلة من جديد'; }, 4000);
            return;
          }
          clearTimeout(confirmTm);
          Sound.pop();
          restart();
        });
      }
    }
  ];

  /* ---------- Cake illustration ---------- */
  function frosting(x0, x1, y, base, r, drips) {
    let d = `M${x0} ${y + base} V${y + r} Q${x0} ${y} ${x0 + r} ${y} H${x1 - r} Q${x1} ${y} ${x1} ${y + r} V${y + base}`;
    for (const [cx, hw, dp] of drips) d += ` H${cx + hw} C${cx + hw} ${y + base + dp} ${cx - hw} ${y + base + dp} ${cx - hw} ${y + base}`;
    return d + ` H${x0} Z`;
  }
  function cakeSVG(n) {
    const xs = Array.from({ length: n }, (_, k) => 150 + (k - (n - 1) / 2) * Math.min(24, 120 / Math.max(1, n - 1)));
    const candles = xs.map((x, k) => `
      <g class="candle" role="button" tabindex="0" aria-label="اطفي الشمعة ${arNum(k + 1)}" style="--d:${((k * .37) % 1).toFixed(2)}s">
        <rect class="hit" x="${x - 12}" y="40" width="24" height="86" rx="6"/>
        <circle class="c-glow" cx="${x}" cy="72" r="24" fill="url(#cg-glow)"/>
        <rect x="${x - 4.5}" y="88" width="9" height="37" rx="2.5" fill="url(#cg-stripe)"/>
        <line x1="${x}" y1="89" x2="${x}" y2="83" stroke="#3a2a22" stroke-width="1.6" stroke-linecap="round"/>
        <path class="flame" d="M${x} 56 C${x + 3} 63 ${x + 8} 70 ${x + 7.5} 75 C${x + 7} 80 ${x + 3} 84 ${x} 84 C${x - 3} 84 ${x - 7} 80 ${x - 7.5} 75 C${x - 8} 70 ${x - 3} 63 ${x} 56Z" fill="url(#cg-flame)"/>
        <path class="flame-core" d="M${x} 70 C${x + 2.5} 74 ${x + 3.2} 78 ${x} 83 C${x - 3.2} 78 ${x - 2.5} 74 ${x} 70Z" fill="#fff9e0"/>
        <g class="smoke"><circle cx="${x}" cy="80" r="3"/><circle cx="${x}" cy="80" r="2.4"/><circle cx="${x}" cy="80" r="2"/></g>
      </g>`).join('');
    const pearls = Array.from({ length: 15 }, (_, k) => `<circle cx="${53 + k * 13.9}" cy="256" r="3.3" fill="#fff6f8"/>`).join('');
    const sprinkleColors = ['#ff6b9a', '#f6c86e', '#b388ff', '#7fd8ff', '#ffffff'];
    const sprinkles = Array.from({ length: 14 }, (_, k) => {
      const x = 86 + k * 9.6, y = 160 + ((k * 7) % 3) * 8;
      return `<rect x="${x}" y="${y}" width="5" height="2" rx="1" fill="${sprinkleColors[k % 5]}" transform="rotate(${(k * 47) % 180 - 90} ${x + 2.5} ${y + 1})"/>`;
    }).join('');
    const hearts = [86, 150, 214].map(x => `<path d="${HEART_PATH}" transform="translate(${x - 9} 214) scale(.75)" fill="#ff6b9a"/>`).join('');
    return `
      <svg class="cake" viewBox="0 0 300 290" aria-hidden="false" role="group" aria-label="كيكة عيد ميلاد عليها ${arNum(n)} شموع">
        <defs>
          <radialGradient id="cg-flame" cx=".5" cy=".72" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffe17a"/><stop offset=".72" stop-color="#ffa43b"/><stop offset="1" stop-color="#ff6a2b"/></radialGradient>
          <radialGradient id="cg-glow"><stop offset="0" stop-color="#ffd68c" stop-opacity=".7"/><stop offset="1" stop-color="#ffb45a" stop-opacity="0"/></radialGradient>
          <linearGradient id="cg-t1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f8b9c9"/><stop offset="1" stop-color="#e98aa5"/></linearGradient>
          <linearGradient id="cg-t2" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fde6ec"/><stop offset="1" stop-color="#f5bdcc"/></linearGradient>
          <linearGradient id="cg-side" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
          <pattern id="cg-stripe" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="7" height="7" fill="#fff"/><rect width="3.2" height="7" fill="#ff8fb1"/></pattern>
        </defs>
        <ellipse cx="150" cy="276" rx="140" ry="13" fill="#000" opacity=".25"/>
        <ellipse cx="150" cy="268" rx="134" ry="15" fill="#f6e7ef"/>
        <ellipse cx="150" cy="265" rx="126" ry="11" fill="#fff8fb"/>
        <rect x="40" y="186" width="220" height="80" rx="14" fill="url(#cg-t1)"/>
        <rect x="40" y="186" width="220" height="80" rx="14" fill="url(#cg-side)"/>
        ${hearts}
        ${pearls}
        <path d="${frosting(40, 260, 184, 16, 14, [[244, 7, 14], [222, 6, 8], [200, 8, 18], [176, 6, 10], [150, 7, 16], [126, 6, 9], [102, 8, 17], [78, 6, 10], [56, 7, 14]])}" fill="#fff4f7"/>
        <rect x="72" y="124" width="156" height="64" rx="12" fill="url(#cg-t2)"/>
        <rect x="72" y="124" width="156" height="64" rx="12" fill="url(#cg-side)"/>
        ${sprinkles}
        <path d="${frosting(72, 228, 122, 13, 12, [[214, 6, 12], [192, 7, 16], [168, 5, 8], [146, 7, 14], [124, 6, 9], [102, 7, 15], [84, 5, 8]])}" fill="#ffffff"/>
        ${candles}
      </svg>`;
  }

  /* ==========================================================
     Boot
     ========================================================== */
  const muteBtn = $('.mute');
  const syncMute = () => {
    muteBtn.setAttribute('aria-pressed', String(Sound.muted));
    muteBtn.setAttribute('aria-label', Sound.muted ? 'تشغيل الصوت' : 'إيقاف الصوت');
  };
  muteBtn.addEventListener('click', () => {
    Sound.init();
    Sound.setMuted(!Sound.muted);
    if (Sound.muted) Sound.stopMusic();
    syncMute();
  });
  syncMute();
  // first touch anywhere unlocks Web Audio on iOS
  addEventListener('pointerdown', () => Sound.init(), { once: true, capture: true });

  // A little magic wherever she touches
  const TOUCH = [
    [...GOLDS, '#ffd1e3'], ['#ffc478', '#ffd7aa', '#ff9678', '#fff5d6'], PINKS, [...GOLDS, '#ffffff'],
    ['#d94a72', '#f6c86e', '#ff8fb0'], ['#ffd38a', '#ffbe6e', '#fff5d6'], ['#ffffff', '#ff4f86', '#ffd1dc'], [...GOLDS, ...PINKS]
  ];
  addEventListener('pointerdown', e => {
    ambient.poke(e.clientX, e.clientY);
    if (e.target.closest('button, [role="button"], .polaroid, .letter, .reason-pop, a, #topbar')) return;
    fx.burst(e.clientX, e.clientY, { n: 8, kinds: ['heart', 'spark', 'star'], colors: TOUCH[state.current] || PINKS, speed: [1, 3.2], size: [6, 11], gravity: .02, life: [30, 55] });
    Sound.tone(pick([1568, 1760, 2093, 2349, 2637]), { dur: .6, vol: .025 });
  }, { passive: true });
  addEventListener('pointermove', e => ambient.poke(e.clientX, e.clientY), { passive: true });

  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    document.body.classList.add('ready');
    go(Math.min(Math.max(0, state.current), maxUnlocked()));
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    setTimeout(boot, 1800);
  } else boot();
})();
