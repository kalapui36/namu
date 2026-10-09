/* 전자칠판 화면: 반과 문제 세트를 파이어베이스에 저장합니다. */
(function (MT) {
  var C = null;            // 지금 반
  var T = null;            // 지금 반의 문제 세트
  var S = null;            // 게임판이 쓰는 합친 설정 (반 + 문제 세트)
  var G = null;            // 지금 반의 게임 상태 (C.game)
  var A = [];              // 지금 반의 아이들 그림
  var nameImgs = {};       // 방금 올린 활동지의 이름 칸 (이 화면에서만)
  var pages = {};          // 활동지 원본 (이 화면에서만)
  var popup = null;        // 열린 문제 창
  var gifts = [];          // 이 방에 온 선물 그림
  var syncOn = false, unsubGifts = null;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LAST = 'namu.lastClass';
  var Sy = MT.Sync;

  function $(s, r) { return (r || document).querySelector(s); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
  var E = null;            // 설정에서 고치는 문제 세트 (없으면 지금 반의 세트)
  var ICON = {
    speak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/><path d="M19 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5M11 20c0-3 2.5-5 5-5s5 2 5 5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    later: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.6 2.7c-.6.2-.9.7-.9 1.3v.8"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>'
  };

  function toast(msg) { var t = h('div', { class: 'toast', role: 'status', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
  function teamName(t) { return S.teams[t].name; }
  function josa(word, a, b) { var c = word.charCodeAt(word.length - 1); if (c < 0xAC00 || c > 0xD7A3) return word + a; return word + ((c - 0xAC00) % 28 ? a : b); }
  function speak(text, q) { if (!MT.voice.speak(text, q ? { question: true } : null)) toast('이 기기에서는 읽어 주기를 쓸 수 없어요.'); }

  /* ---------- 합친 설정 ---------- */
  function sv() {
    MT.ensureColors(T);
    S = {
      title: T.title || '나무 길 보드게임', cellCount: T.cellCount, cellColors: T.cellColors, missions: T.missions, questions: T.questions || {}, seed: T.seed,
      teams: C.teams, teamCount: C.teamCount, leafPerWin: C.leafPerWin || 6, autoRead: !!C.autoRead, room: C.room
    };
  }

  /* ---------- 저장 ---------- */
  function saveClass() { C.game = G; Sy.putLater('classes', C.id, C); pushSync(); }
  function saveSet(X) {
    X = X || T;
    Sy.putLater('sets', X.id, X, 800);
    if (C && T && X.id === T.id) { T = X; sv(); pushSync(); }
  }
  function editSet() { return E || T; }
  function setView(X) { return { cellColors: X.cellColors, questions: X.questions || {}, missions: X.missions }; }
  function useSet(X) { if (!C) return; T = X; E = null; C.setId = X.id; G.cleared = {}; G.turns = {}; sv(); saveClass(); render(true); }

  function popupMirror() {
    if (!popup) return null;
    var q = MT.getQuestion(S, popup.cell, popup.qi), color = MT.cellColor(S, popup.cell);
    return { cell: popup.cell, qi: popup.qi, text: q.text, answer: popup.revealed ? q.answer : '', color: color, mission: S.missions[color].name, help: !!popup.help, team: popup.team, draw: !!q.draw, qkey: popup.qkey };
  }
  function pushSync() {
    if (!syncOn || !C) return;
    var teams = [];
    for (var i = 0; i < S.teamCount; i++) teams.push({ name: S.teams[i].name, color: S.teams[i].color, seats: MT.carSeats(S, A, i) });
    Sy.pushState(C.room, {
      title: S.title, className: C.name, teamCount: S.teamCount, teams: teams, cellCount: S.cellCount, cellColors: S.cellColors, missions: S.missions,
      positions: G.positions, leaves: G.leaves, buds: G.buds, cleared: G.cleared, grass: G.grass, rainbowN: G.rainbowN || 0,
      bloomed: G.bloomed, fairy: G.fairy, popup: popupMirror()
    });
  }

  function watchGifts() {
    if (unsubGifts) { unsubGifts(); unsubGifts = null; }
    gifts = [];
    if (!syncOn || !C) return;
    var first = true;
    unsubGifts = Sy.watchGifts(C.room, function (list) {
      var before = {}; gifts.forEach(function (g) { before[g.id] = g.ts; });
      var fresh = list.filter(function (g) { return before[g.id] !== g.ts; });
      gifts = list;
      if (!first && fresh.length) {
        MT.sfx.gift();
        if (popup && popup.qkey && fresh.some(function (g) { return g.qkey === popup.qkey; })) {
          setFairy('선물이 도착했어! 정말 예쁘다. 고마워!', 'cheer'); renderFairy();
        }
      }
      first = false;
      updateGallery(); render();
    });
  }
  function hangingGifts() {
    var cur = popup && popup.qkey;
    return gifts.filter(function (g) { return g.qkey !== cur; }).slice(-12);
  }

  /* ---------- 그리기 ---------- */
  var board = new MT.BoardView($('#board'), { interactive: true, onCellClick: function (c) { openQuestion(c); }, onCarDrop: carDropped, onCarTap: carTapped });

  function render(force) {
    if (!C) return;
    board.render(S, Object.assign({}, G, { gifts: hangingGifts() }), A, force);
    $('#title').textContent = S.title;
    $('#classChip').textContent = C.name;
    document.title = C.name + ' - ' + S.title;
    renderTeams();
    renderFairy();
  }

  function renderTeams() {
    $('#classTree').textContent = G.leaves.length ? '우리 반 나무에 나뭇잎이 ' + G.leaves.length + '장 자랐어요' + (G.buds.length ? ', 꽃봉오리도 ' + G.buds.length + '개 자랐어요' : '') + '.' : '우리 반 나무가 나뭇잎을 기다리고 있어요.';
    var box = $('#teamList'); box.innerHTML = '';
    for (var t = 0; t < S.teamCount; t++) {
      var faces = A.filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      var car = MT.carSVG(S.teams[t].color, MT.carSeats(S, A, t), faces, String(t + 1));
      box.appendChild(h('div', { class: 'team-row' }, [h('div', { class: 'car-mini', html: car.svg }), h('div', null, [h('div', { class: 'team-name', text: S.teams[t].name })])]));
    }
  }

  var lastFairyId = null;
  function setFairy(text, mood) { G.fairy = { text: text, mood: mood || 'guide', id: MT.uid() }; }
  function renderFairy() {
    if (!G.fairy) setFairy(MT.FAIRY_LINES.hello, 'guide');
    var f = G.fairy;
    if (f.id === lastFairyId) return;
    lastFairyId = f.id;
    var b = $('#fairyText'); b.textContent = f.text;
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    $('#fairyImg').src = f.mood === 'cheer' ? MT.IMG.fairyCheer : MT.IMG.fairyGuide;
  }

  /* ---------- 자동차 ---------- */
  function teamsAt(cell) { var r = []; for (var t = 0; t < S.teamCount; t++) if (G.positions[t] === cell) r.push(t); return r; }

  function carDropped(team, cell) {
    hideCarPop();
    var name = teamName(team);
    G.positions[team] = cell;
    G.lastAt = G.lastAt || {}; G.lastAt[cell] = team;
    if (cell === 0) setFairy(josa(name, '은', '는') + ' 출발 칸에 있어. 주사위를 굴려 볼까?', 'guide');
    else if (MT.cellColor(S, cell) === 'rainbow' && !G.rainbowSeen[team + '-' + cell]) {
      G.rainbowSeen[team + '-' + cell] = 1;
      G.rainbowN = (G.rainbowN || 0) + 1;
      var n = G.rainbowN;
      var line = n === 1 ? '와, 무지개 칸이야! 땅에 초록 잔디가 자라났어!'
        : n === 2 ? '무지개 칸이야! 잔디밭에 예쁜 풀꽃이 피었어!'
        : n === 3 ? '무지개 칸이야! 팔랑팔랑, 나비가 놀러 왔어!'
        : n === 4 ? '무지개 칸이야! 따뜻한 햇살이 우리 나무를 비춰 줘!'
        : n === 5 ? '무지개 칸이야! 다람쥐가 나무에 놀러 왔어!'
        : n === 6 ? '무지개 칸이야! 짹짹, 작은 새가 나무에 앉았어!'
        : n === 9 ? '무지개 칸이야! 새 친구가 한 마리 더 왔어!'
        : '무지개 칸이야! 풀꽃이 더 피고 나비도 또 왔어!';
      setFairy(line + ' ' + cell + '번 칸을 눌러 미션도 해 보자.', 'cheer');
      MT.sfx.rainbow();
    } else setFairy(josa(name, '이', '가') + ' ' + cell + '번 칸에 왔어! 칸을 누르면 내가 문제를 낼게.', 'guide');
    saveClass(); render();
  }

  var carPop = null, carPopTimer = null;
  function hideCarPop() { if (carPop) { carPop.remove(); carPop = null; } clearTimeout(carPopTimer); }
  function carTapped(team) {
    hideCarPop();
    var cell = G.positions[team];
    if (cell === undefined || cell === null) { toast('먼저 자동차를 칸으로 옮겨 주세요.'); return; }
    if (cell === 0) { toast('출발 칸에는 문제가 없어요.'); return; }
    var carEl = board.carEls[team]; if (!carEl) return;
    carPop = h('button', { class: 'car-pop', type: 'button', html: ICON.q + cell + '번 칸 문제 열기', onclick: function (e) { e.stopPropagation(); hideCarPop(); openQuestion(cell, team); } });
    carPop.style.left = (parseFloat(carEl.style.left) + carEl.offsetWidth / 2) + 'px';
    carPop.style.top = (parseFloat(carEl.style.top) - 8) + 'px';
    board.root.appendChild(carPop);
    carPopTimer = setTimeout(hideCarPop, 4000);
  }
  document.addEventListener('pointerdown', function (e) { if (carPop && !carPop.contains(e.target) && !(e.target.closest && e.target.closest('.bv-car'))) hideCarPop(); }, true);

  /* ---------- 문제 창 ---------- */
  function openQuestion(cell, team) {
    hideCarPop();
    var qi = G.turns[cell] || 0;
    G.turns[cell] = 1 - qi;
    var here = teamsAt(cell), lastAt = (G.lastAt || {})[cell];
    var t = team !== undefined ? team : (here.indexOf(lastAt) >= 0 ? lastAt : (here.length ? here[here.length - 1] : null));
    popup = { cell: cell, qi: qi, team: t, revealed: false, help: false, qkey: cell + '-' + qi + '-' + MT.uid() };
    MT.sfx.open();
    drawPopup(); saveClass(); render();
    if (S.autoRead) speak(MT.getQuestion(S, cell, qi).text, true);
  }
  function closePopup() {
    var b = $('#qback'); if (b) b.remove();
    popup = null; saveClass(); render();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  function updateGallery() {
    var box = $('#qgifts'); if (!box || !popup) return;
    var mine = gifts.filter(function (g) { return g.qkey === popup.qkey; });
    $('#qgiftCount').textContent = mine.length ? '선물 ' + mine.length + '개 도착' : '선물을 기다리고 있어요';
    box.innerHTML = '';
    if (!syncOn) { box.appendChild(h('p', { class: 'qgift-wait', text: '태블릿 연결이 꺼져 있어서 선물을 받을 수 없어요.' })); return; }
    mine.forEach(function (g) {
      var team = S.teams[g.team] || { color: '#ccc', name: '' };
      var tape = h('span', { class: 'tape' }); tape.style.background = team.color;
      box.appendChild(h('button', { type: 'button', title: '눌러서 숨기기', onclick: function () {
        MT.ask('이 그림을 숨길까요? 숨기면 다시 볼 수 없어요.', '숨기기', '그대로 두기', { danger: true }).then(function (ok) { if (ok) Sy.deleteGift(C.room, g.id).catch(function () { toast('숨기지 못했어요.'); }); });
      } }, [tape, h('img', { src: g.img, alt: team.name + ' 선물 그림' }), team.name]));
    });
  }

  function drawPopup() {
    var old = $('#qback'); if (old) old.remove();
    if (!popup) return;
    var cell = popup.cell, color = MT.cellColor(S, cell), m = S.missions[color];
    var q = MT.getQuestion(S, cell, popup.qi);
    var isQuiz = m.kind === 'quiz';
    var chips = h('div', { class: 'qchips' }, [
      h('span', { class: 'chip' }, [h('span', { class: 'dot' }), m.name]),
      h('span', { class: 'chip soft', text: cell + '번 칸' }),
      h('span', { class: 'chip soft', text: '문제 ' + (popup.qi + 1) })
    ]);
    if (q.draw) chips.appendChild(h('span', { class: 'chip soft', id: 'qgiftCount', text: '선물을 기다리고 있어요' }));
    var body = h('div', { class: 'qbody' }, [chips, h('h2', { class: 'qtext', id: 'qtext', text: q.text })]);
    if (q.draw) body.appendChild(h('div', { class: 'qgifts', id: 'qgifts' }));
    if (popup.revealed && q.answer) body.appendChild(h('div', { class: 'qanswer' }, [h('small', { text: '정답' }), q.answer]));
    if (popup.help) body.appendChild(h('p', { class: 'qhelp', text: '모둠 친구들이 함께 생각해 줄 시간이에요. 천천히 해도 괜찮아요. 친구가 힌트를 주거나 같이 해 볼까요?' }));

    var actions = h('div', { class: 'qactions' });
    if (isQuiz && q.answer && !popup.revealed) actions.appendChild(h('button', { class: 'btn big', type: 'button', html: ICON.eye + '정답 보기', onclick: function () { popup.revealed = true; drawPopup(); pushSync(); } }));
    actions.appendChild(h('button', { class: 'btn big primary', type: 'button', html: ICON.leaf + (isQuiz ? '맞았어요!' : '해냈어요!'), onclick: success }));
    if (!popup.help) actions.appendChild(h('button', { class: 'btn big sky', type: 'button', html: ICON.help + '친구야 도와줘', onclick: function () { popup.help = true; setFairy('괜찮아, 친구들이 도와줄 거야. 같이 생각해 보자!', 'guide'); renderFairy(); drawPopup(); pushSync(); } }));
    actions.appendChild(h('button', { class: 'btn big', type: 'button', html: ICON.later + '다음에 다시 해요', onclick: closePopup }));
    body.appendChild(actions);

    var top = h('div', { class: 'qtop' }, [
      h('button', { class: 'btn round', type: 'button', 'aria-label': '문제 읽어 주기', title: '읽어 주기', html: ICON.speak, onclick: function () { speak(q.text, true); } }),
      h('button', { class: 'btn round', type: 'button', 'aria-label': '이 칸의 다른 문제 보기', title: '다른 문제', html: ICON.swap, onclick: function () { popup.qi = 1 - popup.qi; popup.revealed = false; popup.qkey = cell + '-' + popup.qi + '-' + MT.uid(); G.turns[cell] = 1 - popup.qi; drawPopup(); saveClass(); render(); } }),
      h('button', { class: 'btn round', type: 'button', 'aria-label': '닫기', html: ICON.close, onclick: closePopup })
    ]);
    var card = h('div', { class: 'qcard c-' + color, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'qtext' }, [
      h('div', { class: 'qfairy' }, [h('img', { src: MT.IMG.fairyQuiz, alt: '문제를 내는 나무 요정' })]), body, top
    ]);
    var back = h('div', { class: 'modal-back', id: 'qback' }, [card]);
    back.addEventListener('click', function (e) { if (e.target === back) closePopup(); });
    $('#layer').appendChild(back);
    if (q.draw) updateGallery();
    var first = card.querySelector('.btn.primary'); if (first) first.focus({ preventScroll: true });
  }

  function success() {
    var cell = popup.cell, team = (popup.team === null || popup.team === undefined) ? -1 : popup.team;
    var prev = G.cleared[cell] || [];
    // 다른 모둠이 이미 해결한 칸이면 꽃봉오리 (모둠을 모르면 이미 해결된 칸인지로만 판단)
    var bonus = team < 0 ? prev.length > 0 : prev.some(function (t) { return t !== team; });
    G.cleared[cell] = prev.concat([team]);
    var n = Math.max(1, S.leafPerWin || 6), k = G.leaves.length;
    var b = $('#qback'); if (b) b.remove();
    popup = null;
    if (bonus) setFairy('정말 잘했어! 우리 반 나무에 나뭇잎이 ' + n + '장 자랐어. 다른 모둠이 다녀간 칸이라 꽃봉오리도 하나 달렸어!', 'cheer');
    else setFairy('정말 잘했어! 우리 반 나무에 나뭇잎이 ' + n + '장 자랐어.', 'cheer');
    saveClass(); render();
    for (var j = 0; j < n; j++) (function (j) {
      var leaf = { id: MT.uid(), team: team, img: Math.floor(Math.random() * 4), rot: Math.round(Math.random() * 120 - 60), s: +(0.85 + Math.random() * 0.3).toFixed(2) };
      setTimeout(function () { fly('leaf', k + j, leaf.img, function () { G.leaves.push(leaf); MT.sfx.leaf(j); saveClass(); render(); }); }, j * 140);
    })(j);
    if (bonus) {
      var bud = { id: MT.uid(), team: team }, kb = G.buds.length;
      setTimeout(function () { fly('bud', kb, 0, function () { G.buds.push(bud); MT.sfx.bud(); saveClass(); render(); }); }, n * 140 + 200);
    }
  }

  function fly(kind, k, img, done) {
    if (reduce) { done(); return; }
    var e = kind === 'leaf' ? h('img', { class: 'fly', src: MT.IMG.leaves[img], alt: '' }) : h('div', { class: 'fly', html: MT.budSVG() });
    document.body.appendChild(e);
    var to = board.anchorScreen(k, kind === 'leaf' ? 'leaf' : 'bud');
    var fx = window.innerWidth / 2 - 36, fy = window.innerHeight / 2 - 36, tx = to.x - 36, ty = to.y - 36;
    var mx = (fx + tx) / 2 + (tx > fx ? -80 : 80), my = Math.min(fy, ty) - 140;
    var endScale = Math.max(0.3, (board.geo.tree.w * 0.085) / 72);
    var anim = e.animate([
      { transform: 'translate(' + fx + 'px,' + fy + 'px) scale(2) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + fx + 'px,' + fy + 'px) scale(2.2) rotate(-10deg)', opacity: 1, offset: 0.15 },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1.4) rotate(180deg)', offset: 0.6 },
      { transform: 'translate(' + tx + 'px,' + ty + 'px) scale(' + endScale + ') rotate(320deg)', opacity: 1 }
    ], { duration: 1150, easing: 'cubic-bezier(.45,0,.35,1)' });
    anim.onfinish = function () { e.remove(); done(); };
  }

  /* ---------- 꽃 ---------- */
  function bloom() {
    if (G.bloomed) return;
    G.bloomed = true;
    setFairy('모두 고마워! 우리 반이 다 함께 힘을 모아서 나무에 꽃이 활짝 피었어!', 'cheer');
    saveClass(); render(); MT.sfx.bloom(); showBloom();
  }
  function showBloom() {
    var back = h('div', { class: 'modal-back', id: 'bloomBack' });
    for (var i = 0; i < (reduce ? 0 : 36); i++) {
      var p = h('span', { class: 'petal' });
      p.style.left = (Math.random() * 100) + 'vw'; p.style.animationDuration = (5 + Math.random() * 5) + 's';
      p.style.animationDelay = (-Math.random() * 8) + 's'; p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.background = ['#FFC0D2', '#FFE08A', '#E3D0FF', '#FFD3A8'][i % 4];
      back.appendChild(p);
    }
    var line = '모두 고마워! 우리 반이 다 함께 힘을 모아서 나무에 꽃이 활짝 피었어!';
    back.appendChild(h('div', { class: 'bloom-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bloomTitle' }, [
      h('img', { src: MT.IMG.fairyCheer, alt: '두 팔을 들고 기뻐하는 나무 요정' }),
      h('h2', { id: 'bloomTitle', text: '우리 나무에 꽃이 활짝 피었어요!' }),
      h('p', { text: '우리 반 모두가 함께 키운 나무야. 정말 고마워!' }),
      h('div', { class: 'qactions', style: 'justify-content:center' }, [
        h('button', { class: 'btn big sky', type: 'button', html: ICON.speak + '요정 목소리 듣기', onclick: function () { speak(line); } }),
        h('button', { class: 'btn big primary', type: 'button', text: '나무 보러 가기', onclick: function () { back.remove(); } })
      ])
    ]));
    $('#layer').appendChild(back);
    setTimeout(function () { speak(line); }, 600);
  }

  function resetGame() {
    MT.ask('자동차 위치, 나뭇잎, 꽃, 풀, 선물 그림을 모두 비우고 처음부터 할까요?\n(반 설정, 문제, 아이들 그림은 그대로 남아요)', '처음부터 하기', '취소', { danger: true }).then(function (ok) {
      if (!ok) return;
      G = MT.defaultGame(); C.game = G;
      setFairy(MT.FAIRY_LINES.hello, 'guide');
      popup = null;
      if (syncOn) Sy.clearGifts(C.room).catch(function () {});
      saveClass(); render(true);
      showHowto();
    });
  }

  /* ---------- 게임 접속하기 ---------- */
  function tabletURL() { return new URL('tablet.html?room=' + C.room, location.href).href; }
  var qrReady = null;
  function loadQR() {
    if (qrReady) return qrReady;
    qrReady = new Promise(function (ok, no) {
      if (window.QRCode) return ok();
      var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
    return qrReady;
  }
  function makeQR(box, size) {
    loadQR().then(function () { box.innerHTML = ''; new window.QRCode(box, { text: tabletURL(), width: size, height: size, colorDark: '#5B4636', colorLight: '#ffffff' }); })
      .catch(function () { box.textContent = 'QR을 만들지 못했어요.'; });
  }
  function showJoin() {
    var qr = h('div', { class: 'qr' });
    var back = h('div', { class: 'modal-back', id: 'joinBack' }, [h('div', { class: 'join-show', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'joinTitle' }, [
      h('h2', { id: 'joinTitle', text: '모둠 태블릿으로 QR을 찍어 들어와요' }),
      qr,
      h('div', { class: 'join-room' }, ['방 번호 ', h('b', { text: C.room })]),
      syncOn ? null : h('p', { class: 'hint', text: '지금은 태블릿 연결이 꺼져 있어요. 오른쪽 아래 연결 상태를 확인해 주세요.' }),
      h('button', { class: 'btn big primary', type: 'button', text: '게임판으로 돌아가기', onclick: function () { back.remove(); } })
    ])]);
    $('#layer').appendChild(back);
    makeQR(qr, 512);
  }

  /* ---------- 게임 방법 ---------- */
  var HOWTO = ['주사위를 굴려요.', '우리 모둠 자동차를 나온 수만큼 옮겨요.', '도착한 칸의 미션을 함께 해요.', '미션을 해내면 우리 반 나무에 나뭇잎이 자라요.', '다 함께 나무를 풍성하게 키워요!'];
  function showHowto() {
    var old = $('#howBack'); if (old) old.remove();
    var back = h('div', { class: 'modal-back', id: 'howBack' }, [h('div', { class: 'howto', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'howTitle' }, [
      h('img', { src: MT.IMG.fairyGuide, alt: '나무 요정' }),
      h('div', null, [
        h('div', { class: 'how-head' }, [h('h2', { id: 'howTitle', text: '이렇게 놀아요' }),
          h('button', { class: 'btn round icon', type: 'button', 'aria-label': '요정이 읽어 주기', title: '요정이 읽어 주기', html: ICON.speak, onclick: function () { speak('안녕! 나는 나무 요정이야. ' + HOWTO.join(' ')); } })]),
        h('ol', null, HOWTO.map(function (t) { return h('li', { text: t }); })),
        h('div', { class: 'qactions' }, [
          h('button', { class: 'btn big primary', type: 'button', text: '시작하기', onclick: function () { back.remove(); if ('speechSynthesis' in window) speechSynthesis.cancel(); } })
        ])
      ])
    ])]);
    $('#layer').appendChild(back);
  }

  /* ---------- 반 고르기 ---------- */
  async function showPicker(createOnly) {
    var old = $('#pickBack'); if (old) old.remove();
    var body = h('div', { class: 'picker', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pickTitle' });
    var back = h('div', { class: 'modal-back', id: 'pickBack' }, [body]);
    $('#layer').appendChild(back);
    body.appendChild(h('div', { class: 'picker-top' }, [h('h2', { id: 'pickTitle', text: createOnly ? '새 반 만들기' : '어느 반에서 수업할까요?' }),
      h('button', { class: 'btn round icon', type: 'button', 'aria-label': '반과 문제 세트 관리', title: '반과 문제 세트 관리', html: GEAR, onclick: function () { back.remove(); openManage(); } })]));
    body.appendChild(h('p', { class: 'hint', text: '불러오는 중이에요…' }));
    var classes = [], sets = [];
    try { classes = await Sy.listDocs('classes'); sets = await Sy.listDocs('sets'); }
    catch (e) { body.lastChild.textContent = '반 목록을 불러오지 못했어요. 인터넷과 파이어베이스 규칙을 확인해 주세요.'; return; }
    body.lastChild.remove();
    classes.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko', { numeric: true }); });
    var setName = {}; sets.forEach(function (s) { setName[s.id] = s.name; });

    if (!createOnly) {
      if (classes.length) {
        var list = h('div', { class: 'class-list' });
        classes.forEach(function (c) {
          list.appendChild(h('button', { type: 'button', onclick: function () { back.remove(); openClass(c.id); } }, [c.name, h('small', { text: setName[c.setId] || '문제 세트 없음' })]));
        });
        body.appendChild(list);
      } else body.appendChild(h('p', { class: 'hint', text: '아직 만든 반이 없어요. 아래에서 첫 반을 만들어 주세요.' }));
    }

    body.appendChild(h('h3', { style: 'margin:10px 0 0;font-family:var(--f-display);font-weight:400;font-size:24px', text: '새 반 만들기' }));
    var nameIn = h('input', { class: 'inp', placeholder: '예) 6-3', 'aria-label': '반 이름', style: 'min-width:220px' });
    var setSel = h('select', { class: 'sel', 'aria-label': '쓸 문제 세트' }, sets.map(function (s) { return h('option', { value: s.id, text: s.name }); }).concat([h('option', { value: '__new', text: '새 문제 세트 만들기' })]));
    var local = localStorage.getItem('namugil.settings.v2');
    if (local && !classes.length) setSel.appendChild(h('option', { value: '__local', text: '이 컴퓨터에 있던 설정과 그림 가져오기' }));
    if (local && !classes.length) setSel.value = '__local';
    body.appendChild(h('div', { class: 'rowf' }, [nameIn, setSel, h('button', { class: 'btn primary', type: 'button', text: '만들기', onclick: async function () {
      var name = nameIn.value.trim(); if (!name) { toast('반 이름을 넣어 주세요.'); nameIn.focus(); return; }
      this.disabled = true;
      try { var id = await createClass(name, setSel.value, classes); back.remove(); openClass(id); }
      catch (e) { console.warn(e); this.disabled = false; toast('만들지 못했어요. 인터넷과 파이어베이스 규칙을 확인해 주세요.'); }
    } })]));
    if (C) body.appendChild(h('div', { class: 'qactions' }, [h('button', { class: 'btn', type: 'button', text: '닫기', onclick: function () { back.remove(); } })]));
  }

  async function createClass(name, setChoice, classes) {
    var used = {}; classes.forEach(function (c) { used[c.room] = 1; });
    var room; do { room = String(1000 + Math.floor(Math.random() * 9000)); } while (used[room]);
    var setId = setChoice, avatars = [], game = null;
    if (setChoice === '__new' || setChoice === '__local') {
      var set = MT.defaultSet(setChoice === '__local' ? '이 컴퓨터에서 가져온 문제' : '기본 문제 세트');
      var ls = null;
      if (setChoice === '__local') {
        try { ls = JSON.parse(localStorage.getItem('namugil.settings.v2')); } catch (e) {}
        if (ls) { set.title = ls.title || set.title; set.cellCount = ls.cellCount; set.seed = ls.seed; set.cellColors = ls.cellColors; set.missions = ls.missions; set.questions = ls.questions || {}; }
        try { avatars = JSON.parse(localStorage.getItem('namugil.avatars.v1')) || []; } catch (e) {}
        try { game = JSON.parse(localStorage.getItem('namugil.game.v2')); } catch (e) {}
      }
      setId = Sy.newId('sets');
      await Sy.putDoc('sets', setId, set);
    }
    var cls = MT.defaultClass(name, setId, room);
    if (setChoice === '__local' && ls) { cls.teams = ls.teams || cls.teams; cls.teamCount = ls.teamCount || 4; cls.leafPerWin = ls.leafPerWin || 6; cls.autoRead = !!ls.autoRead; }
    if (game) { game.gifts = []; cls.game = Object.assign(MT.defaultGame(), game); }
    var id = Sy.newId('classes');
    await Sy.putDoc('classes', id, cls);
    for (var i = 0; i < avatars.length; i++) await Sy.putAvatar(id, { id: avatars[i].id, img: avatars[i].img, team: avatars[i].team, ok: avatars[i].ok, ts: Date.now() + i });
    return id;
  }

  async function openClass(id) {
    var c = await Sy.getDoc('classes', id).catch(function () { return null; });
    if (!c) { showPicker(); return; }
    var t = await Sy.getDoc('sets', c.setId).catch(function () { return null; });
    if (!t) { t = Object.assign({ id: c.setId || Sy.newId('sets') }, MT.defaultSet()); c.setId = t.id; await Sy.putDoc('sets', t.id, t); }
    A = await Sy.listAvatars(id).catch(function () { return []; });
    C = c; T = t;
    while (C.teams.length < 8) C.teams.push({ name: (C.teams.length + 1) + '모둠', color: MT.TEAM_COLORS[C.teams.length], seats: 4 });
    G = Object.assign(MT.defaultGame(), C.game || {}); C.game = G;
    popup = null; nameImgs = {}; pages = {};
    sv();
    lastFairyId = null;
    if (!G.fairy) setFairy(MT.FAIRY_LINES.hello, 'guide');
    render(true);
    watchGifts();
    pushSync();
    showHowto();
  }

  /* ---------- 설정 창 ---------- */
  var curTab = 'class';
  function openSettings(tab) {
    curTab = tab || curTab;
    if (!C && curTab !== 'manage' && !(curTab === 'questions' && E)) curTab = 'manage';
    var old = $('#setBack'), again = !!old; if (old) old.remove();
    var tabs = C ? [['class', '이 반'], ['teams', '모둠과 그림'], ['questions', '문제 세트'], ['manage', '반과 세트 관리'], ['connect', '태블릿 연결']]
      : [['manage', '반과 세트 관리']].concat(E ? [['questions', '문제 세트']] : []);
    var tabBar = h('div', { class: 'tabs', role: 'tablist' });
    tabs.forEach(function (t) { tabBar.appendChild(h('button', { class: 'tab', role: 'tab', type: 'button', 'aria-selected': curTab === t[0] ? 'true' : 'false', text: t[1], onclick: function () { openSettings(t[0]); } })); });
    var bodyEl = h('div', { class: 'sheet-body', role: 'tabpanel' });
    var sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': '설정' }, [
      h('div', { class: 'sheet-head' }, [h('h2', { text: '설정' }), tabBar, h('button', { class: 'btn round', type: 'button', 'aria-label': '설정 닫기', html: ICON.close, onclick: closeSettings })]), bodyEl
    ]);
    $('#layer').appendChild(h('div', { class: 'modal-back' + (again ? ' still' : ''), id: 'setBack' }, [sheet]));
    ({ class: tabClass, teams: tabTeams, questions: tabQuestions, manage: tabManage, connect: tabConnect })[curTab](bodyEl);
  }
  function closeSettings() {
    var b = $('#setBack'); if (b) b.remove();
    if (C) { E = null; saveClass(); render(true); } else { E = null; showPicker(); }
  }
  function openManage() { openSettings('manage'); }
  function stepper(value, min, max, onChange) {
    var out = h('output', { text: value });
    function set(v) { v = Math.max(min, Math.min(max, v)); out.textContent = v; onChange(v); }
    return h('span', { class: 'stepper' }, [
      h('button', { class: 'btn round', type: 'button', 'aria-label': '하나 줄이기', text: '−', onclick: function () { set(+out.textContent - 1); } }), out,
      h('button', { class: 'btn round', type: 'button', 'aria-label': '하나 늘리기', text: '+', onclick: function () { set(+out.textContent + 1); } })
    ]);
  }

  async function tabClass(el) {
    el.appendChild(h('h3', { text: '이 반' }));
    el.appendChild(h('div', { class: 'rowf' }, [h('label', { for: 'clsName', text: '반 이름' }),
      h('input', { class: 'inp', id: 'clsName', value: C.name, oninput: function (e) { C.name = e.target.value || '이름 없는 반'; saveClass(); $('#classChip').textContent = C.name; } })]));
    var setSel = h('select', { class: 'sel', id: 'clsSet', onchange: async function (e) {
      var t = await Sy.getDoc('sets', e.target.value); if (!t) return;
      T = t; C.setId = t.id; G.cleared = {}; G.turns = {}; sv(); saveClass(); render(true); toast(T.name + ' 문제 세트로 바꿨어요.');
    } }, [h('option', { value: T.id, text: T.name })]);
    el.appendChild(h('div', { class: 'rowf' }, [h('label', { for: 'clsSet', text: '문제 세트' }), setSel,
      h('span', { class: 'hint', style: 'margin:0', text: '문제 세트를 고치면 이 세트를 쓰는 모든 반에 함께 바뀌어요.' })]));
    Sy.listDocs('sets').then(function (sets) {
      setSel.innerHTML = '';
      sets.forEach(function (s) { setSel.appendChild(h('option', { value: s.id, text: s.name })); });
      setSel.value = T.id;
    });
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '모둠 수' }), stepper(C.teamCount, 2, 8, function (v) { C.teamCount = v; sv(); saveClass(); render(true); })]));
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '한 번에 자라는 나뭇잎' }), stepper(C.leafPerWin || 6, 1, 12, function (v) { C.leafPerWin = v; sv(); saveClass(); }),
      h('span', { class: 'hint', style: 'margin:0', text: '6장이면 미션 30번쯤에 나무가 빽빽해져요.' })]));
    var cb = h('input', { type: 'checkbox', id: 'autoRead', style: 'width:28px;height:28px', onchange: function (e) { C.autoRead = e.target.checked; sv(); saveClass(); } });
    cb.checked = !!C.autoRead;
    el.appendChild(h('div', { class: 'rowf' }, [cb, h('label', { for: 'autoRead', text: '문제 창이 열리면 요정이 자동으로 읽어 주기' })]));
    var sx = h('input', { type: 'checkbox', id: 'sfxOn', style: 'width:28px;height:28px', onchange: function (e) { MT.sfx.set(e.target.checked); } });
    sx.checked = MT.sfx.isOn();
    el.appendChild(h('div', { class: 'rowf' }, [sx, h('label', { for: 'sfxOn', text: '효과음 켜기 (이 컴퓨터에만 적용)' })]));

    el.appendChild(h('h3', { text: '게임 진행' }));
    el.appendChild(h('div', { class: 'rowf' }, [
      h('button', { class: 'btn berry', type: 'button', text: '지금 꽃 피우기', onclick: function () { closeSettings(); G.bloomed = false; bloom(); } }),
      h('button', { class: 'btn', type: 'button', text: '꽃 다시 접기', onclick: function () { G.bloomed = false; saveClass(); render(true); toast('꽃을 다시 봉오리로 돌렸어요.'); } }),
      h('button', { class: 'btn', type: 'button', text: '게임 방법 다시 보기', onclick: function () { closeSettings(); showHowto(); } }),
      h('button', { class: 'btn', type: 'button', text: '게임 처음부터', onclick: function () { closeSettings(); resetGame(); } })
    ]));

    el.appendChild(h('div', { class: 'rowf', style: 'margin-top:20px' }, [
      h('button', { class: 'btn', type: 'button', text: '다른 반 열기', onclick: function () { closeSettings(); showPicker(); } })
    ]));
  }
  function closeSettingsOnly() { var b = $('#setBack'); if (b) b.remove(); }

  /* 모둠과 그림 */
  function tabTeams(el) {
    el.appendChild(h('h3', { text: '모둠 자동차' }));
    el.appendChild(h('p', { class: 'hint', text: '창문 수는 기본 4개예요. 그림을 5장 태우면 5인승으로 저절로 바뀌어요. 빈 창문에는 나무 요정이 타요.' }));
    var cards = h('div', { class: 'team-cards' });
    for (var t = 0; t < C.teamCount; t++) (function (t) {
      var team = C.teams[t];
      var faces = A.filter(function (a) { return a.team === t; }).map(function (a) { return a.img; });
      var colors = h('div', { class: 'colors', role: 'group', 'aria-label': team.name + ' 색' });
      MT.TEAM_COLORS.forEach(function (c) { colors.appendChild(h('button', { type: 'button', style: 'background:' + c, 'aria-label': '색 ' + c, 'aria-pressed': team.color === c ? 'true' : 'false', onclick: function () { team.color = c; saveClass(); render(); openSettings('teams'); } })); });
      var seats = h('select', { class: 'sel', 'aria-label': team.name + ' 창문 수', onchange: function (e) { team.seats = +e.target.value; saveClass(); render(); openSettings('teams'); } }, [3, 4, 5].map(function (n) { return h('option', { value: n, text: '창문 ' + n + '개' }); }));
      seats.value = team.seats || 4;
      cards.appendChild(h('div', { class: 'team-card' }, [h('div', { class: 'car-prev', html: MT.carSVG(team.color, MT.carSeats(S, A, t), faces, String(t + 1)).svg }),
        h('input', { class: 'inp', value: team.name, 'aria-label': (t + 1) + '번 모둠 이름', oninput: function (e) { team.name = e.target.value || (t + 1) + '모둠'; saveClass(); render(); } }),
        colors, seats, h('div', { class: 'hint', style: 'margin:0', text: '탄 친구 ' + faces.length + '명' })]));
    })(t);
    el.appendChild(cards);

    el.appendChild(h('h3', { text: '아이들 그림 태우기' }));
    el.appendChild(h('p', { class: 'hint', text: '활동지를 스캔한 PDF나 사진을 한꺼번에 올리면 동그라미 안 그림만 잘라서 이 반에 저장해요. 이름 칸은 모둠을 고를 때만 이 화면에 잠깐 보이고 저장하지 않아요.' }));
    var status = h('p', { class: 'hint', 'aria-live': 'polite' });
    var input = h('input', { type: 'file', accept: '.pdf,application/pdf,image/*', multiple: true, class: 'visually-hidden', id: 'scanInput', onchange: function (e) { handleFiles(e.target.files, status); e.target.value = ''; } });
    var drop = h('div', { class: 'drop' }, [h('p', { text: '여기로 파일을 끌어다 놓거나' }), h('label', { class: 'btn sky', for: 'scanInput', text: '활동지 파일 고르기' }), input, h('p', { class: 'hint', style: 'margin:0', text: 'PDF 여러 쪽, JPG, PNG 모두 돼요.' })]);
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); handleFiles(e.dataTransfer.files, status); });
    el.appendChild(drop); el.appendChild(status);

    var grid = h('div', { class: 'scan-grid' });
    A.slice().sort(function (a, b) { return (a.team < 0 ? -1 : 0) - (b.team < 0 ? -1 : 0); }).forEach(function (a) {
      var sel = h('select', { class: 'sel', 'aria-label': '이 그림의 모둠', onchange: function (e) {
        var v = +e.target.value;
        if (v >= 0 && A.filter(function (x) { return x.team === v && x.id !== a.id; }).length >= 5) { toast('한 자동차에는 5명까지 탈 수 있어요.'); e.target.value = a.team; return; }
        a.team = v; Sy.putAvatar(C.id, a).catch(function () { toast('저장하지 못했어요.'); }); pushSync(); render(); openSettings('teams');
      } }, [h('option', { value: -1, text: '모둠 고르기' })].concat(C.teams.slice(0, C.teamCount).map(function (t, i) { return h('option', { value: i, text: t.name }); })));
      sel.value = a.team;
      var btns = h('div', { class: 'scan-btns' });
      if (pages[a.id]) btns.appendChild(h('button', { class: 'btn', type: 'button', text: '위치 맞추기', onclick: function () { openAdjust(a); } }));
      btns.appendChild(h('button', { class: 'btn', type: 'button', text: '빼기', onclick: function () {
        A = A.filter(function (x) { return x.id !== a.id; }); delete pages[a.id]; Sy.deleteAvatar(C.id, a.id).catch(function () {}); pushSync(); render(); openSettings('teams');
      } }));
      grid.appendChild(h('div', { class: 'scan-card' + (a.ok === false ? ' warn' : '') }, [
        h('div', { class: 'scan-face' }, [h('img', { src: a.img, alt: '잘라낸 그림' })]),
        nameImgs[a.id] ? h('img', { class: 'scan-name', src: nameImgs[a.id], alt: '활동지 이름 칸' }) : null,
        a.ok === false ? h('p', { class: 'warnline', text: '동그라미를 잘 못 찾았어요. 위치를 맞춰 주세요.' }) : null,
        sel, btns
      ]));
    });
    el.appendChild(grid);
  }

  async function handleFiles(files, status) {
    if (!files || !files.length) return;
    status.textContent = '파일을 읽고 있어요…';
    try {
      var cvs = await MT.Scan.toPages(Array.from(files), function (m) { status.textContent = m; });
      var bad = 0;
      for (var i = 0; i < cvs.length; i++) {
        var cv = cvs[i], d = MT.Scan.detect(cv), c = MT.Scan.crop(cv, d), id = MT.uid();
        if (!d.ok) bad++;
        pages[id] = { cv: cv, d: d }; nameImgs[id] = c.nameImg;
        var a = { id: id, img: c.img, team: -1, ok: d.ok, ts: Date.now() + i };
        A.push(a);
        status.textContent = (i + 1) + '/' + cvs.length + '장 저장하는 중…';
        await Sy.putAvatar(C.id, a);
      }
      status.textContent = cvs.length + '장을 잘라서 저장했어요.' + (bad ? ' 그중 ' + bad + '장은 위치를 확인해 주세요.' : '');
      openSettings('teams');
    } catch (e) { console.error(e); status.textContent = '파일을 읽거나 저장하지 못했어요. 다른 형식으로 올리거나 인터넷을 확인해 주세요.'; }
  }

  function openAdjust(a) {
    var src = pages[a.id]; if (!src) return;
    var pv = MT.Scan.preview(src.cv), d = Object.assign({}, src.d);
    var img = h('img', { src: pv.url, alt: '활동지 원본' }), ring = h('div', { class: 'adjust-ring', 'aria-label': '그림 위치' });
    var stage = h('div', { class: 'adjust-stage' }, [img, ring]);
    var range = h('input', { type: 'range', min: 40, max: 160, value: 100, style: 'flex:1', 'aria-label': '동그라미 크기' });
    var baseR = d.r;
    function place() { var k = img.clientWidth / src.cv.width; ring.style.left = ((d.cx - d.r) * k) + 'px'; ring.style.top = ((d.cy - d.r) * k) + 'px'; ring.style.width = ring.style.height = (d.r * 2 * k) + 'px'; }
    img.onload = place;
    range.addEventListener('input', function () { d.r = baseR * range.value / 100; place(); });
    var drag = null;
    ring.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: d.cx, cy: d.cy }; ring.setPointerCapture(e.pointerId); });
    ring.addEventListener('pointermove', function (e) { if (!drag) return; var k = img.clientWidth / src.cv.width; d.cx = drag.cx + (e.clientX - drag.x) / k; d.cy = drag.cy + (e.clientY - drag.y) / k; place(); });
    ring.addEventListener('pointerup', function () { drag = null; });
    var back = h('div', { class: 'modal-back', id: 'adjBack' }, [h('div', { class: 'adjust', role: 'dialog', 'aria-modal': 'true', 'aria-label': '그림 위치 맞추기' }, [
      h('h3', { style: 'margin:0;font-family:var(--f-display);font-weight:400;font-size:26px', text: '분홍 동그라미를 그림에 맞춰 주세요' }), stage,
      h('div', { class: 'rowf', style: 'margin:0' }, [h('span', { text: '크기' }), range]),
      h('div', { class: 'qactions' }, [
        h('button', { class: 'btn primary', type: 'button', text: '이렇게 자르기', onclick: function () {
          var c = MT.Scan.crop(src.cv, d); a.img = c.img; a.ok = true; nameImgs[a.id] = c.nameImg; src.d = d;
          Sy.putAvatar(C.id, a).catch(function () { toast('저장하지 못했어요.'); }); render(); back.remove(); openSettings('teams');
        } }),
        h('button', { class: 'btn', type: 'button', text: '취소', onclick: function () { back.remove(); } })
      ])
    ])]);
    $('#layer').appendChild(back);
    if (img.complete) setTimeout(place, 30);
  }

  /* 문제 세트 */
  function tabQuestions(el) {
    var T = editSet(), S = setView(T);
    el.appendChild(h('h3', { text: C && T.id === (C.setId) ? '이 반이 쓰는 문제 세트' : '문제 세트 고치기' }));
    var usedBy = h('span', { class: 'hint', style: 'margin:0' });
    Sy.listDocs('classes').then(function (cs) { var n = cs.filter(function (c) { return c.setId === T.id; }).map(function (c) { return c.name; }); usedBy.textContent = '이 세트를 쓰는 반: ' + (n.join(', ') || '없음'); });
    el.appendChild(h('div', { class: 'rowf' }, [h('label', { for: 'setName', text: '세트 이름' }),
      h('input', { class: 'inp', id: 'setName', value: T.name, oninput: function (e) { T.name = e.target.value || '이름 없는 세트'; saveSet(T); } }), usedBy]));
    el.appendChild(h('div', { class: 'rowf' }, [
      h('button', { class: 'btn', type: 'button', text: '이 세트 복제하기', onclick: async function () {
        var copy = JSON.parse(JSON.stringify(T)); delete copy.id; copy.name = T.name + ' 복사본';
        var id = Sy.newId('sets');
        try { await Sy.putDoc('sets', id, copy); } catch (e) { toast('복제하지 못했어요.'); return; }
        var X = Object.assign({ id: id }, copy);
        if (C && await MT.ask('복제했어요. 이 반(' + C.name + ')이 복사본을 쓰도록 바꿀까요?', '바꾸기', '그대로 두기')) useSet(X); else E = X;
        openSettings('questions');
      } }),
      h('button', { class: 'btn', type: 'button', text: '새 빈 세트 만들기', onclick: async function () {
        var set = MT.defaultSet('새 문제 세트'), id = Sy.newId('sets');
        try { await Sy.putDoc('sets', id, set); } catch (e) { toast('만들지 못했어요.'); return; }
        var X = Object.assign({ id: id }, set);
        if (C && await MT.ask('새 세트를 만들었어요. 이 반이 새 세트를 쓰도록 바꿀까요?', '바꾸기', '그대로 두기')) useSet(X); else E = X;
        openSettings('questions');
      } })
    ]));

    el.appendChild(h('h3', { text: '게임판' }));
    el.appendChild(h('div', { class: 'rowf' }, [h('label', { for: 'setTitle', text: '게임 이름' }),
      h('input', { class: 'inp', id: 'setTitle', value: T.title || '나무 길 보드게임', style: 'width:min(420px,100%)', oninput: function (e) { T.title = e.target.value || '나무 길 보드게임'; saveSet(T); render(); } })]));
    var note = h('span', { class: 'hint', style: 'margin:0' });
    function noteText() { note.textContent = '출발 칸을 포함한 전체 칸 수예요. 처음 값 36칸은 그 선생님 초안과 같아요. 문제가 들어가는 색깔 칸은 ' + (T.cellCount - 1) + '개예요.'; }
    noteText();
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '칸 수' }), stepper(T.cellCount, 12, 40, function (v) {
      T.cellCount = v; T.cellColors = MT.makeCellColors(v - 1, T.seed); noteText();
      if (C && C.setId === T.id) { Object.keys(G.positions).forEach(function (t) { if (G.positions[t] >= v) delete G.positions[t]; }); saveClass(); }
      saveSet(T); render(true);
    }), note]));
    el.appendChild(h('div', { class: 'rowf' }, [h('span', { text: '칸 색깔' }), h('button', { class: 'btn', type: 'button', text: '네 가지 색 다시 섞기', onclick: function () {
      T.seed = Math.floor(Math.random() * 1e9); T.cellColors = MT.makeCellColors(T.cellCount - 1, T.seed); saveSet(T); render(true); openSettings('questions'); toast('칸 색깔을 다시 섞었어요.');
    } }), h('span', { class: 'hint', style: 'margin:0', text: '노랑, 파랑, 보라, 무지개가 같은 수만큼, 옆 칸과 겹치지 않게 놓여요.' })]));

    el.appendChild(h('h3', { text: '색깔별 미션' }));
    var grid = h('div', { class: 'mission-grid' });
    MT.COLOR_KEYS.forEach(function (c) {
      var m = T.missions[c];
      grid.appendChild(h('span', { class: 'swatch c-' + c, title: MT.COLORS[c].label }));
      grid.appendChild(h('input', { class: 'inp', value: m.name, 'aria-label': MT.COLORS[c].label + ' 칸 미션 이름', oninput: function (e) { m.name = e.target.value || MT.COLORS[c].label; saveSet(T); render(true); } }));
      var sel = h('select', { class: 'sel', 'aria-label': MT.COLORS[c].label + ' 칸 미션 종류', onchange: function (e) { m.kind = e.target.value; saveSet(T); openSettings('questions'); } }, [h('option', { value: 'quiz', text: '정답이 있는 문제' }), h('option', { value: 'action', text: '정답이 없는 활동' })]);
      sel.value = m.kind; grid.appendChild(sel);
    });
    el.appendChild(grid);

    el.appendChild(h('h3', { text: '칸마다 문제 두 개' }));
    el.appendChild(h('p', { class: 'hint', text: '칸을 처음 누르면 문제 1, 다음에 누르면 문제 2가 나와요. 비워 둔 칸에는 예시 문제가 나와요. “태블릿 그림판”에 체크하면 그 문제가 열릴 때 모든 모둠 태블릿에 그림판이 떠요.' }));
    var pasteBox = h('div', { style: 'display:none;margin-bottom:16px' }, [
      h('p', { class: 'hint', text: '스프레드시트에서 복사해 붙여 넣으세요. 순서: 칸 번호 | 색(노랑, 파랑, 보라, 무지개. 비워도 돼요) | 문제1 | 정답1 | 문제2 | 정답2' }),
      h('textarea', { class: 'ta', id: 'pasteArea', rows: 8 }),
      h('div', { class: 'qactions' }, [h('button', { class: 'btn primary', type: 'button', text: '붙여 넣은 문제 넣기', onclick: applyPaste })])
    ]);
    el.appendChild(h('div', { class: 'rowf' }, [
      h('button', { class: 'btn sky', type: 'button', text: '표에서 붙여넣기', onclick: function () { pasteBox.style.display = pasteBox.style.display === 'none' ? 'block' : 'none'; } }),
      h('button', { class: 'btn', type: 'button', text: '문제 파일로 저장', onclick: exportQuestions }),
      h('label', { class: 'btn', for: 'qImport', text: '문제 파일 불러오기' }),
      h('input', { type: 'file', id: 'qImport', accept: '.json,application/json', class: 'visually-hidden', onchange: importQuestions })
    ]));
    el.appendChild(pasteBox);
    var rows = h('div', { class: 'q-rows' });
    var blank = { cellColors: T.cellColors, questions: {} };
    for (var c = 1; c <= T.cellCount - 1; c++) (function (c) {
      var color = MT.cellColor(S, c), m = T.missions[color];
      T.questions = T.questions || {};
      var own = T.questions[c] || { q1: '', a1: '', q2: '', a2: '' };
      function store() { T.questions[c] = own; saveSet(T); }
      function ta(key, ph, ans) {
        var t = h('textarea', { class: 'ta' + (ans ? ' ans' : ''), rows: ans ? 1 : 2, placeholder: ph, 'aria-label': c + '번 칸 ' + ph });
        t.value = own[key] || ''; t.addEventListener('input', function () { own[key] = t.value; store(); });
        return t;
      }
      function drawBox(key, label) {
        var id = 'd' + c + key, cb = h('input', { type: 'checkbox', id: id, onchange: function (e) { own[key] = e.target.checked; store(); } });
        cb.checked = own[key] !== undefined ? !!own[key] : !!(own[key === 'd1' ? 'q1' : 'q2'] ? false : (key === 'd1' ? MT.getQuestion(blank, c, 0).draw : MT.getQuestion(blank, c, 1).draw));
        return h('label', { class: 'q-draw', for: id }, [cb, label]);
      }
      var s1 = MT.getQuestion(blank, c, 0), s2 = MT.getQuestion(blank, c, 1), isQuiz = m.kind === 'quiz';
      rows.appendChild(h('div', { class: 'q-row' }, [
        h('div', { class: 'q-num' }, [h('span', { class: 'swatch c-' + color, text: c }), h('small', { text: m.name })]),
        h('div', { class: 'q-pair' }, [ta('q1', '문제 1 (예시: ' + s1.text + ')'), isQuiz ? ta('a1', '정답 1', true) : null, drawBox('d1', '태블릿 그림판')]),
        h('div', { class: 'q-pair' }, [ta('q2', '문제 2 (예시: ' + s2.text + ')'), isQuiz ? ta('a2', '정답 2', true) : null, drawBox('d2', '태블릿 그림판')])
      ]));
    })(c);
    el.appendChild(rows);
  }
  function applyPaste() {
    var T = editSet();
    var txt = $('#pasteArea').value, names = { '노랑': 'yellow', '파랑': 'blue', '보라': 'purple', '무지개': 'rainbow' }, n = 0;
    txt.split(/\r?\n/).forEach(function (line) {
      var col = line.split('\t'); if (col.length < 2) return;
      var cell = parseInt(col[0], 10); if (!(cell >= 1 && cell <= T.cellCount - 1)) return;
      var rest = col.slice(1), cname = (rest[0] || '').trim();
      if (names[cname] || cname === '') { if (names[cname]) T.cellColors[cell - 1] = names[cname]; rest = rest.slice(1); }
      var old = T.questions[cell] || {};
      T.questions[cell] = { q1: (rest[0] || '').trim(), a1: (rest[1] || '').trim(), q2: (rest[2] || '').trim(), a2: (rest[3] || '').trim(), d1: !!old.d1, d2: !!old.d2 };
      n++;
    });
    saveSet(T); render(true); openSettings('questions'); toast(n + '개 칸에 문제를 넣었어요.');
  }
  function exportQuestions() {
    var T = editSet();
    var data = { kind: 'namugil-questions', name: T.name, title: T.title, cellCount: T.cellCount, cellColors: T.cellColors, missions: T.missions, questions: T.questions };
    var a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: T.name + '.json' });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function importQuestions(e) {
    var T = editSet();
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var d = JSON.parse(t); if (d.kind !== 'namugil-questions') throw new Error('kind');
      if (d.cellCount) T.cellCount = d.cellCount;
      if (d.cellColors && d.cellColors.length === T.cellCount - 1) T.cellColors = d.cellColors; else T.cellColors = MT.makeCellColors(T.cellCount - 1, T.seed);
      if (d.missions) T.missions = d.missions; if (d.title) T.title = d.title;
      T.questions = d.questions || {};
      saveSet(T); render(true); openSettings('questions'); toast('문제 파일을 불러왔어요.');
    }).catch(function () { toast('이 게임에서 저장한 문제 파일이 아니에요.'); });
  }

  /* 반과 세트 관리 */
  async function tabManage(el) {
    el.appendChild(h('p', { class: 'hint', text: '불러오는 중이에요…' }));
    var classes, sets;
    try { classes = await Sy.listDocs('classes'); sets = await Sy.listDocs('sets'); }
    catch (e) { el.lastChild.textContent = '목록을 불러오지 못했어요. 인터넷과 파이어베이스 규칙을 확인해 주세요.'; return; }
    el.innerHTML = '';
    classes.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko', { numeric: true }); });
    var setName = {}; sets.forEach(function (x) { setName[x.id] = x.name; });

    el.appendChild(h('div', { class: 'picker-top' }, [h('h3', { style: 'margin:0', text: '반' }),
      h('button', { class: 'btn primary', type: 'button', text: '새 반 만들기', onclick: function () { var b = $('#setBack'); if (b) b.remove(); showPicker(true); } })]));
    var tb = h('tbody');
    el.appendChild(h('table', { class: 'manage-table' }, [h('thead', null, [h('tr', null, ['반', '문제 세트', '모둠', '태운 그림', ''].map(function (t) { return h('th', { text: t }); }))]), tb]));
    classes.forEach(function (c) {
      var pics = h('td', { text: '…' });
      Sy.listAvatars(c.id).then(function (a) { pics.textContent = a.filter(function (x) { return x.team >= 0; }).length + '명'; }).catch(function () { pics.textContent = '-'; });
      tb.appendChild(h('tr', null, [
        h('td', { text: c.name + (C && C.id === c.id ? ' (지금 반)' : '') }),
        h('td', { text: setName[c.setId] || '없음' }),
        h('td', { text: (c.teamCount || 4) + '모둠' }),
        pics,
        h('td', null, [
          h('button', { class: 'btn sky', type: 'button', text: '열기', onclick: function () { var b = $('#setBack'); if (b) b.remove(); E = null; openClass(c.id); } }),
          h('button', { class: 'btn', type: 'button', text: '복제', onclick: async function () {
            var used = {}; classes.forEach(function (x) { used[x.room] = 1; });
            var room; do { room = String(1000 + Math.floor(Math.random() * 9000)); } while (used[room]);
            var copy = MT.defaultClass(c.name + ' 복사본', c.setId, room);
            copy.teams = c.teams; copy.teamCount = c.teamCount; copy.leafPerWin = c.leafPerWin; copy.autoRead = c.autoRead;
            try { await Sy.putDoc('classes', Sy.newId('classes'), copy); toast('복제했어요. 아이들 그림은 반마다 따로라서 복사하지 않았어요.'); } catch (e) { toast('복제하지 못했어요.'); }
            openSettings('manage');
          } }),
          h('button', { class: 'btn', type: 'button', text: '지우기', onclick: async function () {
            if (!(await MT.ask(c.name + '을(를) 지울까요?\n모둠, 아이들 그림, 나무가 모두 지워져요. 문제 세트는 남아요.', '지우기', '취소', { danger: true }))) return;
            try { await Sy.deleteClass(c.id); Sy.clearRoom(c.room).catch(function () {}); } catch (e) { toast('지우지 못했어요.'); return; }
            if (C && C.id === c.id) { C = null; var b = $('#setBack'); if (b) b.remove(); showPicker(); return; }
            openSettings('manage');
          } })
        ])
      ]));
    });
    if (!classes.length) tb.appendChild(h('tr', null, [h('td', { colspan: 5, text: '아직 만든 반이 없어요.' })]));

    el.appendChild(h('div', { class: 'picker-top', style: 'margin-top:28px' }, [h('h3', { style: 'margin:0', text: '문제 세트' }),
      h('button', { class: 'btn primary', type: 'button', text: '새 문제 세트', onclick: async function () {
        var set = MT.defaultSet('새 문제 세트'), id = Sy.newId('sets');
        try { await Sy.putDoc('sets', id, set); } catch (e) { toast('만들지 못했어요.'); return; }
        E = Object.assign({ id: id }, set); openSettings('questions');
      } })]));
    var tb2 = h('tbody');
    el.appendChild(h('table', { class: 'manage-table' }, [h('thead', null, [h('tr', null, ['세트', '쓰는 반', '채운 칸', ''].map(function (t) { return h('th', { text: t }); }))]), tb2]));
    sets.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko', { numeric: true }); });
    sets.forEach(function (x) {
      var users = classes.filter(function (c) { return c.setId === x.id; }).map(function (c) { return c.name; });
      var q = x.questions || {}, filled = 0;
      for (var i = 1; i < x.cellCount; i++) if (q[i] && ((q[i].q1 || '').trim() || (q[i].q2 || '').trim())) filled++;
      tb2.appendChild(h('tr', null, [
        h('td', { text: x.name }),
        h('td', { text: users.join(', ') || '없음' }),
        h('td', { text: filled + ' / ' + (x.cellCount - 1) + '칸' + (filled < x.cellCount - 1 ? ' (빈 칸은 예시 문제)' : '') }),
        h('td', null, [
          h('button', { class: 'btn sky', type: 'button', text: '문제 고치기', onclick: function () { E = (C && T && T.id === x.id) ? T : x; openSettings('questions'); } }),
          h('button', { class: 'btn', type: 'button', text: '복제', onclick: async function () {
            var copy = JSON.parse(JSON.stringify(x)); delete copy.id; copy.name = x.name + ' 복사본';
            try { await Sy.putDoc('sets', Sy.newId('sets'), copy); } catch (e) { toast('복제하지 못했어요.'); }
            openSettings('manage');
          } }),
          h('button', { class: 'btn', type: 'button', text: '지우기', disabled: users.length ? 'disabled' : null, title: users.length ? '쓰는 반이 있어서 지울 수 없어요' : '', onclick: async function () {
            if (!(await MT.ask(x.name + '을(를) 지울까요?', '지우기', '취소', { danger: true }))) return;
            try { await Sy.deleteDoc('sets', x.id); } catch (e) { toast('지우지 못했어요.'); }
            openSettings('manage');
          } })
        ])
      ]));
    });
  }

  /* 태블릿 연결 */
  function tabConnect(el) {
    el.appendChild(h('h3', { text: '모둠 태블릿 연결' }));
    if (!syncOn) { el.appendChild(h('p', { class: 'hint', text: '파이어베이스에 연결되지 않았어요. 인터넷과 firebase-config.js를 확인해 주세요.' })); return; }
    var qr = h('div', { class: 'qr' });
    el.appendChild(h('div', { class: 'qr-box' }, [qr, h('div', null, [
      h('p', { class: 'hint', style: 'margin:0', text: C.name + ' 방 번호' }), h('div', { class: 'room-code', text: C.room }),
      h('p', { class: 'hint', text: '수업 때는 위쪽 “게임 접속하기”를 누르면 QR이 크게 떠요. 이 반의 방 번호는 바뀌지 않아요.' }),
      h('p', null, [h('span', { class: 'code', text: tabletURL() })])
    ])]));
    makeQR(qr, 220);
    el.appendChild(h('div', { class: 'rowf', style: 'margin-top:18px' }, [
      h('button', { class: 'btn', type: 'button', text: '받은 선물 그림 모두 지우기', onclick: function () {
        MT.ask('이 반에 온 선물 그림을 모두 지울까요?', '지우기', '취소', { danger: true }).then(function (ok) {
          if (ok) Sy.clearGifts(C.room).then(function () { toast('선물 그림을 지웠어요.'); }).catch(function () { toast('지우지 못했어요.'); });
        });
      } })
    ]));
    el.appendChild(h('h3', { text: '태블릿 없이 선물 그림 올리기' }));
    el.appendChild(h('p', { class: 'hint', text: '종이에 그린 선물을 사진으로 찍어 올리면 나무에 매달려요.' }));
    var teamSel = h('select', { class: 'sel', 'aria-label': '선물을 보낸 모둠' }, C.teams.slice(0, C.teamCount).map(function (t, i) { return h('option', { value: i, text: t.name }); }));
    el.appendChild(h('div', { class: 'rowf' }, [teamSel, h('label', { class: 'btn sky', for: 'giftInput', text: '선물 사진 고르기' }),
      h('input', { type: 'file', id: 'giftInput', accept: 'image/*', multiple: true, class: 'visually-hidden', onchange: function (e) {
        var team = +teamSel.value;
        MT.Scan.toPages(Array.from(e.target.files)).then(function (cvs) {
          cvs.forEach(function (cv, i) {
            var s = Math.min(cv.width, cv.height), o = document.createElement('canvas'); o.width = o.height = 360;
            o.getContext('2d').drawImage(cv, (cv.width - s) / 2, (cv.height - s) / 2, s, s, 0, 0, 360, 360);
            Sy.sendGift(C.room, team, o.toDataURL('image/jpeg', 0.8), 'photo' + MT.uid()).catch(function () { toast('올리지 못했어요.'); });
          });
          closeSettings();
        });
      } })]));
  }

  /* ---------- 시작 ---------- */
  $('#btnSettings').addEventListener('click', function () { openSettings(); });
  $('#btnBloom').addEventListener('click', function () { if (!C) return; if (G.bloomed) { showBloom(); return; } MT.ask('우리 반 나무에 꽃을 피워 볼까?', '피울래요!', '아직이요', { fairy: true }).then(function (ok) { if (ok) bloom(); }); });
  $('#btnJoin').addEventListener('click', function () { if (C) showJoin(); });
  $('#btnFull').addEventListener('click', function () { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () { toast('이 브라우저에서는 전체 화면을 쓸 수 없어요.'); }); });
  $('#btnSayFairy').addEventListener('click', function () { speak($('#fairyText').textContent); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('#adjBack')) $('#adjBack').remove();
    else if ($('#setBack')) closeSettings();
    else if ($('#qback')) closePopup();
    else if ($('#joinBack')) $('#joinBack').remove();
    else if ($('#howBack')) $('#howBack').remove();
    else if ($('#manBack')) $('#manBack').remove();
    else if ($('#bloomBack')) $('#bloomBack').remove();
  });

  Sy.onStatus = function (st, code) {
    var b = $('#syncBadge');
    b.classList.toggle('ok', st === 'ok');
    if (st === 'ok') b.textContent = '';
    else if (st === 'slow') b.textContent = '연결 확인 중이에요. 인터넷이나 파이어베이스 데이터베이스를 확인해 주세요.';
    else if (code === 'permission-denied') b.textContent = '연결 안 됨: 파이어베이스 규칙을 확인해 주세요 (새 규칙 붙여 넣고 게시).';
    else if (code === 'not-found' || code === 'failed-precondition') b.textContent = '연결 안 됨: 파이어베이스에 Firestore 데이터베이스를 만들어 주세요.';
    else b.textContent = '연결 안 됨: 인터넷 연결과 파이어베이스 설정을 확인해 주세요.';
  };

  Sy.init().then(function (on) {
    syncOn = on;
    if (!on) {
      $('#syncBadge').textContent = Sy.configured() ? '연결 안 됨: 파이어베이스를 불러오지 못했어요 (인터넷 확인)' : '파이어베이스 설정이 없어요';
      $('#layer').appendChild(h('div', { class: 'modal-back' }, [h('div', { class: 'picker' }, [h('h2', { text: '연결이 필요해요' }),
        h('p', { class: 'hint', text: '반과 문제는 파이어베이스에 저장돼요. 인터넷 연결과 firebase-config.js 설정을 확인한 뒤 새로고침해 주세요.' })])]));
      return;
    }
    $('#syncBadge').textContent = '';
    showPicker();
  });

  MT._debug = { C: function () { return C; }, G: function () { return G; }, open: function (c) { openQuestion(c); }, drop: carDropped, success: function () { success(); }, bloom: bloom, settings: openSettings, tap: carTapped, gifts: function () { return gifts; } };
})(window.MT);
