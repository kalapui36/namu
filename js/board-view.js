/* 게임판 그리기: 전자칠판(조작 가능)과 태블릿(보기 전용)이 같이 씁니다. */
window.MT = window.MT || {};
(function (MT) {
  var TREE_RATIO = 1073 / 1350; // 나무 그림 가로/세로

  function el(tag, cls, parent) { var e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
  function hash(str) { var h = 0; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

  /* ---------- 자동차 그림 ---------- */
  MT.carSeats = function (settings, avatars, team) {
    var mine = (avatars || []).filter(function (a) { return a.team === team; });
    var n = Math.max(settings.teams[team].seats || 4, mine.length);
    return Math.max(3, Math.min(5, n));
  };
  MT.carSVG = function (color, seats, faces, label) {
    var n = seats, vbW = 58 + 40 * n, id = 'c' + Math.random().toString(36).slice(2, 8);
    var dark = MT.shade(color, 0.3), cabin = MT.mix(color, 0.45);
    var s = '<svg viewBox="0 0 ' + vbW + ' 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<defs>';
    for (var i = 0; i < n; i++) s += '<clipPath id="' + id + i + '"><circle cx="' + (30 + i * 40) + '" cy="29" r="14.5"/></clipPath>';
    s += '</defs>';
    s += '<ellipse cx="' + vbW / 2 + '" cy="91" rx="' + (vbW * 0.42) + '" ry="4" fill="rgba(91,70,54,.18)"/>';
    s += '<rect x="12" y="6" width="' + (vbW - 34) + '" height="46" rx="21" fill="' + cabin + '" stroke="' + dark + '" stroke-width="2.5"/>';
    s += '<rect x="4" y="42" width="' + (vbW - 8) + '" height="34" rx="16" fill="' + color + '" stroke="' + dark + '" stroke-width="2.5"/>';
    s += '<path d="M14 50 H' + (vbW - 22) + '" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/>';
    for (var w = 0; w < n; w++) {
      var cx = 30 + w * 40;
      s += '<circle cx="' + cx + '" cy="29" r="17" fill="#fff" stroke="' + dark + '" stroke-width="2.2"/>';
      var src = faces && faces[w] ? faces[w] : MT.IMG.fairyFace;
      var op = faces && faces[w] ? 1 : 0.5;
      s += '<image href="' + src + '" x="' + (cx - 14.5) + '" y="14.5" width="29" height="29" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + w + ')" opacity="' + op + '"/>';
    }
    s += '<circle cx="' + (vbW - 11) + '" cy="55" r="5" fill="#FFF3A6" stroke="' + dark + '" stroke-width="1.8"/>';
    s += '<circle cx="23" cy="78" r="11" fill="#6B5446"/><circle cx="23" cy="78" r="4.5" fill="#EBDDCD"/>';
    s += '<circle cx="' + (vbW - 25) + '" cy="78" r="11" fill="#6B5446"/><circle cx="' + (vbW - 25) + '" cy="78" r="4.5" fill="#EBDDCD"/>';
    if (label) s += '<text x="' + (vbW / 2 - 2) + '" y="69" text-anchor="middle" font-family="Jua, sans-serif" font-size="17" fill="' + MT.shade(color, 0.55) + '">' + label + '</text>';
    s += '</svg>';
    return { svg: s, vbW: vbW };
  };

  MT.budSVG = function () {
    return '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M20 6 C30 14 31 28 20 34 C9 28 10 14 20 6 Z" fill="#FFB3C7" stroke="#E07C9C" stroke-width="2"/><path d="M20 34 C14 33 10 29 9 25 C13 27 17 28 20 30 C23 28 27 27 31 25 C30 29 26 33 20 34 Z" fill="#8CC97A" stroke="#5E9E4E" stroke-width="1.6"/><path d="M20 34 V45" stroke="#5E9E4E" stroke-width="2.4" stroke-linecap="round"/></svg>';
  };
  // 잔디 그림(bg-grass.jpg)에서 잰 풀밭 시작 높이 (왼쪽 끝부터 오른쪽 끝까지 11곳, 그림 높이 대비)
  MT.GRASS_LINE = [0.912, 0.87, 0.837, 0.803, 0.8, 0.81, 0.8, 0.808, 0.841, 0.859, 0.912];
  MT.wildFlowerSVG = function (tone) {
    var c = [['#FFC0D2', '#E9849F'], ['#FFF0A0', '#E2B13C'], ['#D9C8FF', '#A98BE3']][tone];
    var p = '';
    for (var i = 0; i < 5; i++) p += '<ellipse cx="20" cy="11" rx="5" ry="7" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="1.4" transform="rotate(' + (i * 72) + ' 20 18)"/>';
    return '<svg viewBox="0 0 40 52" aria-hidden="true"><path d="M20 22 C19 32 21 40 20 50" stroke="#5E9E4E" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M20 38 C14 36 11 32 10 28 C15 29 18 32 20 36" fill="#8CC97A"/>' + p + '<circle cx="20" cy="18" r="4" fill="#FFD86B"/></svg>';
  };
  MT.butterflySVG = function (tone) {
    var c = [['#FFC6DA', '#F08BB0'], ['#BFE3FF', '#6FB6E3'], ['#FFE59A', '#E9B93A']][tone];
    return '<svg viewBox="0 0 60 44" aria-hidden="true"><g class="wing-l"><path d="M29 22 C20 4 4 2 5 14 C6 22 16 24 29 22 Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2"/><path d="M29 23 C20 26 10 34 16 39 C21 43 27 34 29 23 Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2"/></g><g class="wing-r"><path d="M31 22 C40 4 56 2 55 14 C54 22 44 24 31 22 Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2"/><path d="M31 23 C40 26 50 34 44 39 C39 43 33 34 31 23 Z" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="2"/></g><ellipse cx="30" cy="23" rx="2.6" ry="10" fill="#6B5446"/><path d="M29 13 C27 8 25 6 23 5 M31 13 C33 8 35 6 37 5" stroke="#6B5446" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';
  };
  MT.birdSVG = function (tone) {
    var body = tone ? '#BFE3FF' : '#FFD3A8', edge = tone ? '#6FB6E3' : '#E89A5C';
    return '<svg viewBox="0 0 64 56" aria-hidden="true"><ellipse cx="32" cy="30" rx="22" ry="18" fill="' + body + '" stroke="' + edge + '" stroke-width="2.4"/><path d="M14 30 C6 26 4 34 10 38 C14 40 18 36 18 34" fill="' + body + '" stroke="' + edge + '" stroke-width="2.4"/><path d="M30 30 C26 38 34 42 40 36" fill="#fff" opacity=".7"/><circle cx="42" cy="24" r="3" fill="#4A3B2F"/><circle cx="43" cy="23" r="1" fill="#fff"/><path d="M52 27 L60 29 L52 32 Z" fill="#FFB648" stroke="#E2902A" stroke-width="1.4" stroke-linejoin="round"/><ellipse cx="44" cy="31" rx="3.4" ry="2" fill="#FFB3C7" opacity=".8"/><path d="M28 47 V53 M36 47 V53" stroke="#E2902A" stroke-width="2.4" stroke-linecap="round"/></svg>';
  };
  MT.squirrelSVG = function () {
    return '<svg viewBox="0 0 80 72" aria-hidden="true">' +
      '<path class="sq-tail" d="M26 62 C6 60 2 40 10 26 C16 14 30 10 34 22 C37 32 26 34 24 42 C22 50 30 56 26 62 Z" fill="#E0A26B" stroke="#B5743D" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M16 30 C20 22 28 20 30 26" fill="none" stroke="#F2C79C" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="44" cy="50" rx="15" ry="16" fill="#E0A26B" stroke="#B5743D" stroke-width="2.4"/>' +
      '<ellipse cx="46" cy="54" rx="8" ry="10" fill="#FBE3C6"/>' +
      '<circle cx="54" cy="30" r="13" fill="#E0A26B" stroke="#B5743D" stroke-width="2.4"/>' +
      '<path d="M47 20 L46 10 L53 17 Z M58 18 L61 9 L64 18 Z" fill="#E0A26B" stroke="#B5743D" stroke-width="2" stroke-linejoin="round"/>' +
      '<ellipse cx="60" cy="34" rx="6" ry="5" fill="#FBE3C6"/>' +
      '<circle cx="57" cy="27" r="2.6" fill="#4A3B2F"/><circle cx="57.8" cy="26.2" r=".9" fill="#fff"/>' +
      '<circle cx="65" cy="32" r="1.8" fill="#6B4A36"/>' +
      '<ellipse cx="51" cy="35" rx="3.2" ry="2" fill="#FFB3C7" opacity=".85"/>' +
      '<ellipse cx="56" cy="47" rx="5" ry="3.4" fill="#B98552" stroke="#8F6037" stroke-width="1.6"/>' +
      '<path d="M37 64 h8 M48 64 h8" stroke="#B5743D" stroke-width="3" stroke-linecap="round"/></svg>';
  };
  MT.rainbowSVG = function () {
    var cols = ['#FFC6CE', '#FFDDB8', '#FFF2AC', '#CDF1C4', '#C4E4FB', '#DECCF9'], a = '';
    cols.forEach(function (c, i) { var r = 290 - i * 16; a += '<path d="M' + (300 - r) + ' 300 A' + r + ' ' + r + ' 0 0 1 ' + (300 + r) + ' 300" fill="none" stroke="' + c + '" stroke-width="17"/>'; });
    return '<svg viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">' + a + '</svg>';
  };
  MT.flowerSVG = function (tone) {
    var c = tone === 1 ? ['#FFD3A8', '#F0A867'] : tone === 2 ? ['#E3D0FF', '#B796EE'] : ['#FFC0D2', '#E9849F'];
    var p = '';
    for (var i = 0; i < 5; i++) p += '<ellipse cx="24" cy="12" rx="8" ry="11" fill="' + c[0] + '" stroke="' + c[1] + '" stroke-width="1.8" transform="rotate(' + (i * 72) + ' 24 24)"/>';
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' + p + '<circle cx="24" cy="24" r="7" fill="#FFD86B" stroke="#E2B13C" stroke-width="1.8"/></svg>';
  };

  /* ---------- 게임판 ---------- */
  function BoardView(root, opts) {
    this.root = root;
    this.opts = opts || {};
    this.interactive = !!this.opts.interactive;
    root.classList.add('bv');
    if (!this.interactive) root.classList.add('bv-readonly');
    this.bgBase = el('div', 'bv-bg bv-bg-base', root);
    this.bgGrass = el('div', 'bv-bg bv-bg-grass', root);
    this.bgBase.style.backgroundImage = 'url("' + MT.IMG.bgBase + '")';
    this.bgGrass.style.backgroundImage = 'url("' + MT.IMG.bgGrass + '")';
    this.center = el('div', 'bv-center', root);
    this.arc = el('div', 'bv-arc', this.center);
    this.field = el('div', 'bv-field', this.center);
    this.gifts = el('div', 'bv-gifts', this.center);
    this.tree = el('div', 'bv-tree', this.center);
    var timg = el('img', 'bv-tree-img', this.tree); timg.src = MT.IMG.tree; timg.alt = '함께 키우는 나무'; timg.draggable = false;
    this.leafLayer = el('div', 'bv-leaves', this.tree);
    this.flowerLayer = el('div', 'bv-flowers', this.tree);
    this.birdLayer = el('div', 'bv-birds', this.tree);
    this.flies = el('div', 'bv-flies', this.center);
    this.cells = el('div', 'bv-cells', root);
    this.cars = el('div', 'bv-cars', root);
    this.cellEls = [];
    this.carEls = {};
    this.leafEls = {};
    this.giftEls = {};
    this.flowerKey = '';
    this.geo = null;
    var self = this;
    this._ro = new ResizeObserver(function () { self.relayout(); });
    this._ro.observe(root);
  }

  BoardView.prototype.relayout = function () {
    if (!this.state) return;
    this.geo = null;
    this.render(this.state.settings, this.state.game, this.state.avatars, true);
  };

  BoardView.prototype.computeGeo = function (N) {
    var W = this.root.clientWidth, H = this.root.clientHeight;
    if (W < 50 || H < 50) return null;
    function pick(m) {
      var tw = W - 2 * m, th = H - 2 * m, best = null;
      for (var a = 0; a <= N; a++) {
        var rem = N - 4 - 2 * a; if (rem < 0) break;
        var b = Math.floor(rem / 2), extra = rem % 2;
        var hs = tw / (a + 1 + extra), vs = th / (b + 1);
        var score = Math.abs(hs - vs) + (b < 1 ? 999 : 0);
        if (!best || score < best.score) best = { a: a, b: b, extra: extra, hs: hs, vs: vs, score: score, tw: tw, th: th };
      }
      return best;
    }
    var m0 = Math.min(W, H) * 0.085;
    var p = pick(m0);
    var cs = Math.min(Math.min(p.hs, p.vs) * 0.86, Math.min(W, H) * 0.17);
    var m = cs / 2 + Math.min(W, H) * 0.018;
    p = pick(m);
    cs = Math.min(Math.min(p.hs, p.vs) * 0.86, Math.min(W, H) * 0.17);
    var pts = [], tw = p.tw, th = p.th, i;
    pts.push([m, H - m]);
    for (i = 1; i <= p.a; i++) pts.push([m + tw * i / (p.a + 1), H - m]);
    pts.push([W - m, H - m]);
    for (i = 1; i <= p.b; i++) pts.push([W - m, H - m - th * i / (p.b + 1)]);
    pts.push([W - m, m]);
    var topN = p.a + p.extra;
    for (i = 1; i <= topN; i++) pts.push([W - m - tw * i / (topN + 1), m]);
    pts.push([m, m]);
    for (i = 1; i <= p.b; i++) pts.push([m, m + th * i / (p.b + 1)]);
    var inner = m + cs / 2 + Math.min(W, H) * 0.02;
    var c = { x: inner, y: inner, w: W - 2 * inner, h: H - 2 * inner };
    var treeH = c.h * 0.97, treeW = treeH * TREE_RATIO;
    if (treeW > c.w * 0.52) { treeW = c.w * 0.52; treeH = treeW / TREE_RATIO; }
    var tree = { x: c.x + (c.w - treeW) / 2, y: c.y + c.h - treeH, w: treeW, h: treeH };
    return { W: W, H: H, cs: cs, pts: pts, center: c, tree: tree };
  };

  BoardView.prototype.carSize = function (seats) {
    var cs = this.geo.cs;
    var w = cs * (0.5 + 0.2 * seats);
    return { w: w, h: w * 96 / (58 + 40 * seats) };
  };

  BoardView.prototype.render = function (settings, game, avatars, force) {
    this.state = { settings: settings, game: game, avatars: avatars };
    var N = settings.cellCount;
    if (!this.geo || this.geo.n !== N) { this.geo = this.computeGeo(N); if (!this.geo) return; this.geo.n = N; force = true; }
    var g = this.geo;
    this.root.style.setProperty('--cs', g.cs + 'px');

    // 가운데 영역과 나무
    var c = g.center;
    Object.assign(this.center.style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', height: c.h + 'px' });
    Object.assign(this.tree.style, { left: (g.tree.x - c.x) + 'px', top: (g.tree.y - c.y) + 'px', width: g.tree.w + 'px', height: g.tree.h + 'px' });

    // 칸
    var sig = JSON.stringify([N, settings.cellColors, settings.missions, game.cleared, g.W, g.H]);
    if (force || sig !== this.cellSig) { this.cellSig = sig; this.drawCells(settings, game); }

    // 무지개 칸: 잔디 → 풀꽃 → 나비 → 무지개 → 새
    var n = game.rainbowN || 0;
    var p = n ? Math.min(1, 0.45 + 0.18 * (n - 1)) : 0;
    this.drawRainbowStuff(n, force, p);
    this.bgGrass.style.setProperty('--p', p);
    this.bgGrass.classList.toggle('on', p > 0);

    this.drawLeaves(game, force);
    this.drawFlowers(game, force);
    this.drawGifts(game, force);
    this.drawCars(settings, game, avatars, force);
    this.root.classList.toggle('bloomed', !!game.bloomed);
  };

  BoardView.prototype.drawRainbowStuff = function (n, force, gp) {
    var g = this.geo, c = g.center, key = n + '|' + Math.round(c.w) + '|' + Math.round(c.h);
    if (!force && key === this._rbKey) return;
    var grow = this._rbKey !== undefined && !force; this._rbKey = key;
    var prevN = this._rbN || 0; this._rbN = n;
    var r = MT.rng(7);
    // 풀꽃
    var nf = n >= 2 ? Math.min(25, 4 + Math.max(0, n - 5) * 3) : 0;
    this.field.innerHTML = '';
    // 잔디가 보이는 땅에만: 잔디 그림의 언덕 모양 선(가운데 높고 양끝 낮음)을
    // 화면 비율에 맞게 잘리고 커진 만큼 계산해서, 그 선보다 아래에만 피게 함
    var IW = 1600, IH = 1051, sc = Math.max(g.W / IW, g.H / IH), dw = IW * sc, dh = IH * sc, ox = (g.W - dw) / 2, oy = g.H - dh;
    var bottom = c.y + c.h - 2, reveal = g.H * (1 - (gp || 0));
    function grassTop(x) {
      var u = Math.max(0, Math.min(1, (x - ox) / dw)) * (MT.GRASS_LINE.length - 1), i0 = Math.floor(u), i1 = Math.min(MT.GRASS_LINE.length - 1, i0 + 1);
      var f = MT.GRASS_LINE[i0] + (MT.GRASS_LINE[i1] - MT.GRASS_LINE[i0]) * (u - i0);
      return Math.max(oy + f * dh, reveal) + g.H * 0.025;
    }
    var placed = 0;
    for (var tries = 0; placed < nf && tries < nf * 30; tries++) {
      var bx = c.x + c.w * (0.03 + 0.94 * r()), top = grassTop(bx);
      if (top >= bottom) continue;
      var by = top + (bottom - top) * r();
      var f = el('div', 'bv-wild' + (grow && placed >= this._nf ? ' pop' : ''), this.field);
      f.innerHTML = MT.wildFlowerSVG(placed % 3);
      f.style.left = ((bx - c.x) / c.w * 100) + '%'; f.style.top = ((by - c.y) / c.h * 100) + '%'; f.style.width = (g.cs * (0.36 + 0.12 * r())) + 'px';
      placed++;
    }
    nf = placed;
    this._nf = nf;
    // 나비
    var nb = n >= 3 ? Math.min(6, 1 + Math.max(0, n - 5)) : 0;
    if (this.flies.childNodes.length !== nb || force) {
      this.flies.innerHTML = '';
      for (var b = 0; b < nb; b++) {
        var bf = el('div', 'bv-fly f' + (b % 3), this.flies);
        bf.innerHTML = '<div class="bv-fly-in">' + MT.butterflySVG(b % 3) + '</div>';
        bf.style.width = (g.cs * 0.42) + 'px';
        bf.style.animationDelay = (-b * 2.3) + 's';
      }
    }
    // 다람쥐(5번째)와 새(6번째, 9번째)
    var critters = [];
    if (n >= 4) critters.push({ kind: 'squirrel', at: [0.3, 0.44], from: 4 });
    if (n >= 5) critters.push({ kind: 'bird0', at: [0.78, 0.16], from: 5 });
    if (n >= 8) critters.push({ kind: 'bird1', at: [0.22, 0.22], from: 8, flip: true });
    var ckey = critters.map(function (k) { return k.kind; }).join(',');
    if (this._ckey !== ckey || force) {
      this._ckey = ckey;
      this.birdLayer.innerHTML = '';
      critters.forEach(function (k) {
        var best = null, bd = 1e9;
        MT.LEAF_ANCHORS.forEach(function (a) { var d = Math.hypot(a[0] - k.at[0], a[1] - k.at[1]); if (d < bd) { bd = d; best = a; } });
        var e = el('div', (k.kind === 'squirrel' ? 'bv-squirrel' : 'bv-bird') + (grow && prevN < k.from ? ' pop' : ''), this.birdLayer);
        e.innerHTML = k.kind === 'squirrel' ? MT.squirrelSVG() : MT.birdSVG(k.kind === 'bird1' ? 1 : 0);
        e.style.left = (best[0] * 100) + '%'; e.style.top = (best[1] * 100) + '%';
        e.style.width = (g.tree.w * (k.kind === 'squirrel' ? 0.17 : 0.14)) + 'px';
        if (k.flip) e.style.transform = 'translate(-50%,-85%) scaleX(-1)';
      }, this);
    }
  };

  BoardView.prototype.drawCells = function (settings, game) {
    var self = this, g = this.geo, N = settings.cellCount;
    this.cells.innerHTML = '';
    this.cellEls = [];
    g.pts.forEach(function (pt, i) {
      var b = el(self.interactive ? 'button' : 'div', 'bv-cell', self.cells);
      if (self.interactive) b.type = 'button';
      b.style.left = (pt[0] - g.cs / 2) + 'px';
      b.style.top = (pt[1] - g.cs / 2) + 'px';
      var num = el('span', 'bv-cell-num', b);
      var sub = el('span', 'bv-cell-sub', b);
      if (i === 0) { b.classList.add('start'); num.textContent = '출발'; sub.textContent = 'START'; b.setAttribute('aria-label', '출발 칸'); }
      else {
        var color = MT.cellColor(settings, i);
        b.classList.add('c-' + color);
        num.textContent = i;
        sub.textContent = settings.missions[color].name;
        b.setAttribute('aria-label', i + '번 칸, ' + MT.COLORS[color].label + ', ' + settings.missions[color].name);
        var cl = game.cleared[i];
        if (cl && cl.length) {
          var mark = el('span', 'bv-cell-mark', b);
          var li = el('img', '', mark); li.src = MT.IMG.leaves[i % 4]; li.alt = '';
        }
        if (self.interactive) b.addEventListener('click', function () { self.opts.onCellClick && self.opts.onCellClick(i); });
      }
      self.cellEls.push(b);
    });
  };

  BoardView.prototype.anchorPos = function (k, pool) {
    var A = MT.LEAF_ANCHORS, a = A[pool === 'bud' ? (A.length - 1 - (k % A.length)) : (k % A.length)];
    var round = Math.floor(k / A.length);
    var jx = round ? ((hash('x' + k) % 40) - 20) / 1000 : 0, jy = round ? ((hash('y' + k) % 40) - 20) / 1000 : 0;
    return [a[0] + jx, a[1] + jy];
  };
  // 화면 좌표 (나뭇잎 날아가기 연출용)
  BoardView.prototype.anchorScreen = function (k, pool) {
    var r = this.tree.getBoundingClientRect(), a = this.anchorPos(k, pool);
    return { x: r.left + a[0] * r.width, y: r.top + a[1] * r.height };
  };

  BoardView.prototype.drawLeaves = function (game, force) {
    var self = this, tw = this.geo.tree.w;
    if (force) { this.leafLayer.innerHTML = ''; this.leafEls = {}; }
    var keep = {};
    game.leaves.forEach(function (lf, k) {
      keep[lf.id] = 1;
      var e = self.leafEls[lf.id];
      if (!e) {
        e = el('img', 'bv-leaf', self.leafLayer); e.src = MT.IMG.leaves[lf.img % 4]; e.alt = ''; e.draggable = false;
        if (!force) e.classList.add('pop');
        self.leafEls[lf.id] = e;
      }
      var a = self.anchorPos(k, 'leaf');
      e.style.left = (a[0] * 100) + '%'; e.style.top = (a[1] * 100) + '%';
      e.style.width = (tw * 0.085 * (lf.s || 1)) + 'px';
      e.style.transform = 'translate(-50%,-60%) rotate(' + lf.rot + 'deg)';
    });
    Object.keys(this.leafEls).forEach(function (id) { if (!keep[id]) { self.leafEls[id].remove(); delete self.leafEls[id]; } });
  };

  BoardView.prototype.drawFlowers = function (game, force) {
    var self = this, tw = this.geo.tree.w;
    var key = JSON.stringify([game.buds.map(function (b) { return b.id; }), game.bloomed, game.bloomed ? game.leaves.length : 0, tw]);
    if (!force && key === this.flowerKey) return;
    var prev = this.flowerKey; this.flowerKey = key;
    var known = this._budIds || {};
    this.flowerLayer.innerHTML = '';
    var add = function (k, pool, html, size, fresh) {
      var a = self.anchorPos(k, pool), d = el('div', 'bv-flower' + (fresh ? ' pop' : ''), self.flowerLayer);
      d.innerHTML = html; d.style.left = (a[0] * 100) + '%'; d.style.top = (a[1] * 100) + '%'; d.style.width = (tw * size) + 'px';
    };
    var ids = {};
    game.buds.forEach(function (b, k) {
      ids[b.id] = 1;
      add(k, 'bud', game.bloomed ? MT.flowerSVG(k % 3) : MT.budSVG(), game.bloomed ? 0.12 : 0.085, prev && !known[b.id]);
    });
    this._budIds = ids;
    if (game.bloomed) {
      var count = Math.min(48, Math.max(16, Math.ceil(game.leaves.length / 4)));
      for (var i = 0; i < count; i++) add((i * 7 + 3) % MT.LEAF_ANCHORS.length, 'leaf', MT.flowerSVG((i + 1) % 3), 0.1, false);
    }
  };

  // 선물 매달 자리: 나무 가운데 높이의 가지들, 왼쪽부터 오른쪽으로 고르게
  BoardView.prototype.hangSlots = function () {
    if (this._hang) return this._hang;
    var A = MT.LEAF_ANCHORS, cols = [0.16, 0.31, 0.46, 0.61, 0.76, 0.88], rows = [0.48, 0.32], out = [];
    rows.forEach(function (ry, ri) {
      var row = cols.map(function (cx) {
        var best = null, bd = 1e9;
        A.forEach(function (a) { var d = Math.hypot((a[0] - cx) * 1.2, a[1] - ry); if (d < bd) { bd = d; best = a; } });
        return best;
      });
      // 한 줄 안에서 가운데부터 바깥으로
      [2, 3, 1, 4, 0, 5].forEach(function (i) { out.push(row[i]); });
    });
    this._hang = out;
    return out;
  };

  BoardView.prototype.drawGifts = function (game, force) {
    var self = this, slots = this.hangSlots(), tw = this.geo.tree.w, th = this.geo.tree.h;
    var list = (game.gifts || []).slice(-slots.length);
    if (force) { this.gifts.innerHTML = ''; this.giftEls = {}; }
    if (this.gifts.parentNode !== this.tree) this.tree.appendChild(this.gifts);
    var keep = {};
    list.forEach(function (gf, i) {
      keep[gf.id] = 1;
      var e = self.giftEls[gf.id];
      if (!e || e._img !== gf.img) {
        if (e) e.remove();
        e = el('div', 'bv-hang', self.gifts);
        el('span', 'bv-hang-string', e);
        var card = el('figure', 'bv-gift', e);
        var team = self.state.settings.teams[gf.team] || { color: '#ccc', name: '' };
        var tape = el('span', 'bv-gift-tape', card); tape.style.background = team.color;
        var img = el('img', '', card); img.src = gf.img; img.alt = (team.name || '') + ' 선물 그림';
        if (!force) e.classList.add('pop');
        e._img = gf.img;
        self.giftEls[gf.id] = e;
      }
      var a = slots[i];
      e.style.left = (a[0] * 100) + '%'; e.style.top = (a[1] * 100) + '%';
      e.style.width = (tw * 0.12) + 'px';
      e.style.setProperty('--len', (th * (0.03 + (i % 2) * 0.025)) + 'px');
      e.style.animationDelay = (-(hash(gf.id) % 30) / 10) + 's';
    });
    Object.keys(this.giftEls).forEach(function (id) { if (!keep[id]) { self.giftEls[id].remove(); delete self.giftEls[id]; } });
  };

  BoardView.prototype.carHome = function (settings, game, avatars, team) {
    var g = this.geo, pos = game.positions[team];
    var seats = MT.carSeats(settings, avatars, team), sz = this.carSize(seats);
    if (pos === undefined || pos === null || pos >= g.pts.length) {
      // 주차장: 가운데 왼쪽 아래
      var c = g.center, col = team % 2, row = Math.floor(team / 2);
      var colW = Math.min((g.tree.x - c.x) / 2, this.carSize(5).w * 1.04);
      return { x: c.x + colW * col + colW / 2, y: c.y + c.h - sz.h * 0.6 - row * sz.h * 1.12, sz: sz, seats: seats };
    }
    // 같은 칸에 여러 대면 살짝 겹쳐 놓기
    var same = [];
    for (var t = 0; t < settings.teamCount; t++) if (game.positions[t] === pos) same.push(t);
    var idx = same.indexOf(team), k = same.length;
    var pt = g.pts[pos];
    var cols = Math.ceil(k / 2), col = Math.floor(idx / 2), row = k > 1 ? idx % 2 : 0;
    var dx = (col - (cols - 1) / 2) * sz.w * 0.7;
    var dy = g.cs * 0.28 + (k > 1 ? (row - 0.5) * sz.h * 0.95 : 0);
    var x = Math.max(sz.w / 2 + 4, Math.min(g.W - sz.w / 2 - 4, pt[0] + dx));
    var y = Math.max(sz.h / 2 + 4, Math.min(g.H - sz.h / 2 - 6, pt[1] + dy));
    return { x: x, y: y, sz: sz, seats: seats };
  };

  BoardView.prototype.drawCars = function (settings, game, avatars, force) {
    var self = this;
    for (var t = 0; t < 8; t++) {
      var e = this.carEls[t];
      if (t >= settings.teamCount) { if (e) { e.remove(); delete this.carEls[t]; } continue; }
      var faces = (avatars || []).filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      var home = this.carHome(settings, game, avatars, t);
      var sig = JSON.stringify([settings.teams[t].color, home.seats, faces.length, faces.map(function (f) { return f.length; })]);
      if (!e) {
        e = el('div', 'bv-car', this.cars);
        e.dataset.team = t;
        el('div', 'bv-car-body', e);
        if (this.interactive) this.bindDrag(e, t);
        this.carEls[t] = e;
      }
      if (e._sig !== sig) {
        e._sig = sig;
        e.firstChild.innerHTML = MT.carSVG(settings.teams[t].color, home.seats, faces, String(t + 1)).svg;
        e.setAttribute('aria-label', settings.teams[t].name + ' 자동차');
      }
      if (e._dragging) continue;
      var prevX = e._x, prevY = e._y;
      e.style.width = home.sz.w + 'px'; e.style.height = home.sz.h + 'px';
      e.style.left = (home.x - home.sz.w / 2) + 'px'; e.style.top = (home.y - home.sz.h * 0.5) + 'px';
      e.style.zIndex = 10 + Math.round(home.y);
      if (prevX !== undefined && (Math.abs(prevX - home.x) > 2 || Math.abs(prevY - home.y) > 2) && !force) {
        e.classList.remove('drive'); void e.offsetWidth; e.classList.add('drive');
      }
      e._x = home.x; e._y = home.y;
    }
  };

  BoardView.prototype.bindDrag = function (e, team) {
    var self = this, start = null;
    e.addEventListener('pointerdown', function (ev) {
      if (self.opts.canDrag && !self.opts.canDrag()) return;
      ev.preventDefault();
      var r = self.root.getBoundingClientRect();
      start = { id: ev.pointerId, ox: ev.clientX - r.left - parseFloat(e.style.left), oy: ev.clientY - r.top - parseFloat(e.style.top), moved: false, sx: ev.clientX, sy: ev.clientY };
      e.setPointerCapture(ev.pointerId);
      e._dragging = true; e.classList.add('dragging'); e.classList.remove('drive');
      e.style.zIndex = 9999;
    });
    e.addEventListener('pointermove', function (ev) {
      if (!start || ev.pointerId !== start.id) return;
      var r = self.root.getBoundingClientRect();
      if (!start.moved) {
        if (start.sx === undefined) { start.sx = ev.clientX; start.sy = ev.clientY; }
        if (Math.hypot(ev.clientX - start.sx, ev.clientY - start.sy) < 10) return;
      }
      var x = ev.clientX - r.left - start.ox, y = ev.clientY - r.top - start.oy;
      e.style.left = x + 'px'; e.style.top = y + 'px';
      start.moved = true;
      var cx = ev.clientX - r.left, cy = ev.clientY - r.top, best = -1, bd = 1e9;
      self.geo.pts.forEach(function (p, i) { var d = Math.hypot(p[0] - cx, p[1] - cy); if (d < bd) { bd = d; best = i; } });
      var hit = bd < self.geo.cs * 0.85 ? best : -1;
      self.cellEls.forEach(function (c, i) { c.classList.toggle('target', i === hit); });
      start.hit = hit;
    });
    function end(ev) {
      if (!start || ev.pointerId !== start.id) return;
      var hit = start.hit, moved = start.moved; start = null;
      e._dragging = false; e.classList.remove('dragging');
      self.cellEls.forEach(function (c) { c.classList.remove('target'); });
      if (moved && hit !== undefined && hit >= 0 && self.opts.onCarDrop) self.opts.onCarDrop(team, hit);
      else {
        self.drawCars(self.state.settings, self.state.game, self.state.avatars, false);
        if (!moved && self.opts.onCarTap) self.opts.onCarTap(team, e);
      }
    }
    e.addEventListener('pointerup', end);
    e.addEventListener('pointercancel', end);
  };

  MT.BoardView = BoardView;

  // 게임 안 확인 창 (브라우저 기본 확인 창 대신)
  MT.ask = function (message, yes, no, opts) {
    return new Promise(function (resolve) {
      var back = el('div', 'modal-back ask-back');
      var card = el('div', 'ask-card', back);
      card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-modal', 'true');
      if (opts && opts.fairy) { var im = el('img', 'ask-fairy', card); im.src = MT.IMG.fairyGuide; im.alt = '나무 요정'; }
      var msg = el('p', 'ask-msg', card); msg.textContent = message;
      var row = el('div', 'qactions', card); row.style.justifyContent = 'center';
      var y = el('button', 'btn ' + (opts && opts.fairy ? 'big ' : '') + ((opts && opts.danger) ? 'berry' : 'primary'), row); y.type = 'button'; y.textContent = yes || '네';
      var n = el('button', 'btn ' + (opts && opts.fairy ? 'big' : ''), row); n.type = 'button'; n.textContent = no || '아니요';
      function done(v) { back.remove(); document.removeEventListener('keydown', key, true); resolve(v); }
      function key(e) { if (e.key === 'Escape') { e.stopPropagation(); done(false); } }
      y.addEventListener('click', function () { done(true); });
      n.addEventListener('click', function () { done(false); });
      document.addEventListener('keydown', key, true);
      (document.getElementById('layer') || document.body).appendChild(back);
      y.focus();
    });
  };
})(window.MT);
