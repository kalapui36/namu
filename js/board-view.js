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
    this.gifts = el('div', 'bv-gifts', this.center);
    this.tree = el('div', 'bv-tree', this.center);
    var timg = el('img', 'bv-tree-img', this.tree); timg.src = MT.IMG.tree; timg.alt = '함께 키우는 나무'; timg.draggable = false;
    this.leafLayer = el('div', 'bv-leaves', this.tree);
    this.flowerLayer = el('div', 'bv-flowers', this.tree);
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

    // 풀(무지개 칸)
    var p = Math.max(0, Math.min(1, (game.grass || 0) / 6));
    this.bgGrass.style.setProperty('--p', p);
    this.bgGrass.classList.toggle('on', p > 0);

    this.drawLeaves(game, force);
    this.drawFlowers(game, force);
    this.drawGifts(game, force);
    this.drawCars(settings, game, avatars, force);
    this.root.classList.toggle('bloomed', !!game.bloomed);
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
})(window.MT);
