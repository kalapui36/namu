/* 모둠 태블릿 화면: 전자칠판과 같은 게임판을 보고, 선물 그림을 보냅니다. */
(function (MT) {
  var params = new URLSearchParams(location.search);
  var room = params.get('room') || localStorage.getItem('namugil.tablet.room') || '';
  var team = null, state = null, gifts = [], unsubState = null, unsubGifts = null;
  var board = null, lastPopup = '', lastFairy = '', wasBloomed = null, drawing = null;

  function $(s) { return document.querySelector(s); }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function toast(msg) { var t = h('div', { class: 'toast', role: 'status', text: msg }); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }
  function speak(text) {
    if (!('speechSynthesis' in window)) return toast('이 기기에서는 읽어 주기를 쓸 수 없어요.');
    MT.voice.speak(text, { question: true });
  }
  var SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10v4h4l5 4V6L8 10H4z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></svg>';
  var GIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M2.5 9h19M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9zM12 9c2-4 6-4 6-1.5S14 9 12 9z"/></svg>';

  function settingsFrom(st) {
    var teams = (st.teams || []).map(function (t) { return { name: t.name, color: t.color, seats: t.seats }; });
    return { cellCount: st.cellCount, cellColors: st.cellColors, missions: st.missions, teams: teams, teamCount: st.teamCount, title: st.title };
  }
  function gameFrom(st) {
    var cur = st.popup && st.popup.qkey;
    var hang = gifts.filter(function (g) { return g.qkey !== cur; }).slice(-12);
    return { positions: st.positions || {}, leaves: st.leaves || [], buds: st.buds || [], cleared: st.cleared || {}, grass: st.grass || 0, rainbowN: st.rainbowN || 0, bloomed: !!st.bloomed, gifts: hang };
  }

  /* ---------- 화면: 방 들어가기 ---------- */
  function showJoin(msg) {
    var root = $('#root'); root.innerHTML = '';
    var inp = h('input', { class: 'inp', inputmode: 'numeric', maxlength: 6, value: room, 'aria-label': '방 번호' });
    var card = h('div', { class: 'join-card' }, [
      h('h1', { text: '나무 길 보드게임' }),
      h('p', { class: 'hint', style: 'font-size:20px', text: msg || '선생님이 알려 준 방 번호를 넣어 주세요.' }),
      h('div', { class: 'rowf', style: 'justify-content:center' }, [inp, h('button', { class: 'btn primary big', type: 'button', text: '들어가기', onclick: function () { room = inp.value.trim(); connect(); } })])
    ]);
    root.appendChild(h('div', { class: 'join' }, [card]));
  }

  function showPickTeam() {
    var root = $('#root'); root.innerHTML = '';
    var s = settingsFrom(state), grid = h('div', { class: 'team-pick' });
    for (var t = 0; t < s.teamCount; t++) (function (t) {
      grid.appendChild(h('button', { type: 'button', onclick: function () { team = t; sessionStorage.setItem('namu.team.' + room, t); showMain(); } }, [
        h('span', { html: MT.carSVG(s.teams[t].color, s.teams[t].seats, null, String(t + 1)).svg }), s.teams[t].name
      ]));
    })(t);
    root.appendChild(h('div', { class: 'join' }, [h('div', { class: 'join-card' }, [h('h1', { text: '우리 모둠을 골라요' }), grid])]));
  }

  /* ---------- 화면: 게임판 ---------- */
  function showMain() {
    var root = $('#root'); root.innerHTML = '';
    var s = settingsFrom(state);
    var teamBox = h('div', { class: 'tab-team', title: '선생님: 3초 꾹 누르면 모둠을 바꿀 수 있어요' }, [h('span', { class: 'car-ico', id: 'myCar' }), h('span', { id: 'myName' })]);
    // 모둠 바꾸기: 모둠 이름을 3초 꾹 누를 때만
    var holdTimer = null, showTimer = null, bar = h('span', { class: 'hold-bar' });
    teamBox.appendChild(bar);
    function stopHold() { clearTimeout(holdTimer); clearTimeout(showTimer); bar.classList.remove('on'); }
    teamBox.addEventListener('pointerdown', function (e) {
      e.preventDefault(); stopHold();
      try { teamBox.setPointerCapture(e.pointerId); } catch (x) {}
      showTimer = setTimeout(function () { bar.classList.add('on'); }, 1000);
      holdTimer = setTimeout(function () { stopHold(); if (confirm('모둠을 바꿀까요?')) { team = null; sessionStorage.removeItem('namu.team.' + room); closeDraw(); showPickTeam(); } }, 3000);
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) { teamBox.addEventListener(ev, stopHold); });
    teamBox.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    var top = h('header', { class: 'tab-top' }, [teamBox, h('span', { class: 'class-chip', text: state.className || '' })]);
    var bwrap = h('main', { class: 'tab-board', 'aria-label': '게임판' }, [h('div', { id: 'tboard' })]);
    root.appendChild(h('div', { class: 'tab-app' }, [top, bwrap]));
    root.appendChild(h('div', { class: 'tab-fairy', 'aria-live': 'polite' }, [h('img', { src: MT.IMG.fairyGuide, alt: '나무 요정', id: 'tFairyImg' }), h('p', { class: 'bubble', id: 'tFairy' })]));
    board = new MT.BoardView($('#tboard'), { interactive: false });
    lastPopup = ''; lastFairy = '';
    update();
  }

  function update() {
    if (!state || team === null || !board) return;
    var s = settingsFrom(state);
    if (team >= s.teamCount) { team = null; showPickTeam(); return; }
    document.title = (s.title || '나무 길 보드게임') + ' - ' + s.teams[team].name;
    $('#myCar').innerHTML = MT.carSVG(s.teams[team].color, s.teams[team].seats, null, String(team + 1)).svg;
    $('#myName').textContent = s.teams[team].name;
    board.render(s, gameFrom(state), [], false);
    var f = state.fairy;
    if (f && f.id !== lastFairy) {
      lastFairy = f.id; var b = $('#tFairy'); b.textContent = f.text; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
      $('#tFairyImg').src = f.mood === 'cheer' ? MT.IMG.fairyCheer : MT.IMG.fairyGuide;
    }
    drawPopup();
    if (wasBloomed === false && state.bloomed) showBloom();
    wasBloomed = !!state.bloomed;
  }

  function drawPopup() {
    var p = state.popup, key = JSON.stringify(p || null);
    if (key === lastPopup) return;
    lastPopup = key;
    var old = $('#tq'); if (old) old.remove();
    if (!p || !p.draw) { if (drawing) { closeDraw(); toast('선생님이 그림 시간을 마쳤어요.'); } }
    if (!p) return;
    if (p.draw) { if (!drawing || drawing.qkey !== p.qkey) openDraw(p); return; }
    var s = settingsFrom(state);
    var body = h('div', { class: 'qbody' }, [
      h('div', { class: 'qchips' }, [h('span', { class: 'chip' }, [h('span', { class: 'dot' }), p.mission]), h('span', { class: 'chip soft', text: p.cell + '번 칸' })]),
      h('h2', { class: 'qtext', id: 'tqtext', text: p.text })
    ]);
    if (p.answer) body.appendChild(h('div', { class: 'qanswer' }, [h('small', { text: '정답' }), p.answer]));
    if (p.help) body.appendChild(h('p', { class: 'qhelp', text: '모둠 친구들이 함께 생각해 줄 시간이에요. 천천히 해도 괜찮아요.' }));
    if (p.team !== null && p.team !== undefined && s.teams[p.team]) body.appendChild(h('p', { class: 'qteams-label', text: s.teams[p.team].name + ' 차례예요' }));
    var card = h('div', { class: 'qcard c-' + p.color, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tqtext' }, [
      h('div', { class: 'qfairy' }, [h('img', { src: MT.IMG.fairyQuiz, alt: '문제를 내는 나무 요정' })]),
      body,
      h('div', { class: 'qtop' }, [h('button', { class: 'btn round', type: 'button', 'aria-label': '문제 읽어 주기', html: SPEAK, onclick: function () { speak(p.text); } })])
    ]);
    $('#layer').appendChild(h('div', { class: 'modal-back', id: 'tq' }, [card]));
  }

  function showBloom() {
    var back = h('div', { class: 'modal-back' });
    for (var i = 0; i < 28; i++) {
      var pe = h('span', { class: 'petal' });
      pe.style.left = (Math.random() * 100) + 'vw'; pe.style.animationDuration = (5 + Math.random() * 5) + 's';
      pe.style.animationDelay = (-Math.random() * 8) + 's'; pe.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      pe.style.background = ['#FFC0D2', '#FFE08A', '#E3D0FF', '#FFD3A8'][i % 4];
      back.appendChild(pe);
    }
    back.appendChild(h('div', { class: 'bloom-card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'tbloom' }, [
      h('img', { src: MT.IMG.fairyCheer, alt: '기뻐하는 나무 요정' }),
      h('h2', { id: 'tbloom', text: '우리 나무에 꽃이 활짝 피었어요!' }),
      h('button', { class: 'btn big primary', type: 'button', text: '나무 보러 가기', onclick: function () { back.remove(); } })
    ]));
    $('#layer').appendChild(back);
  }

  /* ---------- 선물 그리기 (칠판에서 그림 문제가 열리면 자동으로) ---------- */
  function closeDraw() { var b = $('#drawBack'); if (b) b.remove(); if (drawing && drawing.fit) window.removeEventListener('resize', drawing.fit); drawing = null; }
  function openDraw(p) {
    closeDraw();
    var PENS = ['#5B4636', '#FF6B6B', '#FF9F43', '#FFD43B', '#51CF66', '#339AF0', '#845EF7', '#F783AC'];
    var SIZES = [7, 16, 30];
    var pen = PENS[1], size = SIZES[1], erase = false, drawn = false, sent = false;
    var cv = h('canvas', { width: 720, height: 720, 'aria-label': '선물을 그리는 곳' });
    var ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 720);
    var stage = h('div', { class: 'draw-stage' }, [cv]);
    var pens = h('div', { class: 'pens', role: 'group', 'aria-label': '색깔' });
    function paintPens() { pens.innerHTML = ''; PENS.forEach(function (c) { pens.appendChild(h('button', { type: 'button', style: 'background:' + c, 'aria-label': '색 ' + c, 'aria-pressed': (!erase && pen === c) ? 'true' : 'false', onclick: function () { pen = c; erase = false; paintPens(); paintEraser(); } })); }); }
    var sizes = h('div', { class: 'sizes', role: 'group', 'aria-label': '굵기' });
    function paintSizes() { sizes.innerHTML = ''; SIZES.forEach(function (sz, i) { var dot = h('span'); dot.style.width = dot.style.height = (8 + i * 8) + 'px'; sizes.appendChild(h('button', { type: 'button', 'aria-label': ['가늘게', '보통', '굵게'][i], 'aria-pressed': size === sz ? 'true' : 'false', onclick: function () { size = sz; paintSizes(); } }, [dot])); }); }
    var eraserBtn = h('button', { class: 'btn', type: 'button', text: '지우개', onclick: function () { erase = !erase; paintPens(); paintEraser(); } });
    function paintEraser() { eraserBtn.setAttribute('aria-pressed', erase ? 'true' : 'false'); eraserBtn.style.outline = erase ? '4px solid #5B4636' : ''; }
    paintPens(); paintSizes(); paintEraser();
    var sendBtn = h('button', { class: 'btn primary big', type: 'button', html: GIFT + '보내기', onclick: askSend });
    var tools = h('div', { class: 'draw-tools' }, [pens, sizes, eraserBtn,
      h('button', { class: 'btn', type: 'button', text: '다 지우기', onclick: function () { if (!drawn || confirm('그림을 모두 지울까요?')) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 720, 720); drawn = false; } } }),
      sendBtn]);
    var prompt = h('div', { class: 'draw-prompt' }, [h('span', { text: p.text }), h('button', { class: 'btn round', type: 'button', 'aria-label': '문제 읽어 주기', html: SPEAK, onclick: function () { speak(p.text); } })]);
    var sheet = h('div', { class: 'draw-sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': '선물 그리기' }, [prompt, stage, tools]);
    var back = h('div', { class: 'modal-back', id: 'drawBack' }, [sheet]);
    $('#layer').appendChild(back);
    function fit() { var r = stage.getBoundingClientRect(), s = Math.floor(Math.min(r.width, r.height)); cv.style.width = cv.style.height = s + 'px'; }
    requestAnimationFrame(fit); window.addEventListener('resize', fit);
    drawing = { qkey: p.qkey, fit: fit };

    var last = null;
    function pt(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 720 / r.width, (e.clientY - r.top) * 720 / r.height]; }
    function stroke(a, b) { ctx.strokeStyle = erase ? '#fff' : pen; ctx.lineWidth = erase ? size * 1.8 : size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); last = pt(e); stroke(last, [last[0] + 0.1, last[1]]); if (!erase) drawn = true; });
    cv.addEventListener('pointermove', function (e) { if (!last) return; var q = pt(e); stroke(last, q); last = q; });
    function up() { last = null; }
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    function overlay(kids) { var o = h('div', { class: 'draw-confirm' }, [h('div', { class: 'draw-confirm-card' }, kids)]); sheet.appendChild(o); return o; }
    function askSend() {
      if (!drawn) return toast('선물을 먼저 그려 주세요.');
      var o = overlay([
        h('p', { class: 'sent', text: sent ? '새 그림으로 바꿔서 보낼까요?' : '이 그림을 보낼까요?' }),
        h('img', { src: cv.toDataURL('image/jpeg', 0.6), alt: '보낼 그림', class: 'draw-preview' }),
        h('div', { class: 'qactions', style: 'justify-content:center' }, [
          h('button', { class: 'btn big primary', type: 'button', text: '보낼래요', onclick: function () { o.remove(); send(); } }),
          h('button', { class: 'btn big', type: 'button', text: '더 그릴래요', onclick: function () { o.remove(); } })
        ])
      ]);
    }
    function send() {
      sendBtn.disabled = true;
      var o2 = document.createElement('canvas'); o2.width = o2.height = 360;
      o2.getContext('2d').drawImage(cv, 0, 0, 360, 360);
      var q = 0.82, url = o2.toDataURL('image/jpeg', q);
      while (url.length > 280000 && q > 0.4) { q -= 0.1; url = o2.toDataURL('image/jpeg', q); }
      MT.Sync.sendGift(room, team, url, p.qkey).then(function () {
        sent = true; sendBtn.disabled = false;
        sendBtn.innerHTML = GIFT + '다시 보내기';
        var o = overlay([
          h('img', { src: MT.IMG.fairyCheer, alt: '', style: 'height:34vh;border-radius:50% 50% 24px 24px;display:block;margin:0 auto 12px' }),
          h('p', { class: 'sent', text: '선물을 보냈어요! 칠판을 보세요.' }),
          h('p', { class: 'hint', style: 'text-align:center;font-size:18px', text: '고치고 싶으면 다시 그려서 보내면 새 그림으로 바뀌어요.' }),
          h('div', { class: 'qactions', style: 'justify-content:center' }, [h('button', { class: 'btn big', type: 'button', text: '다시 그리기', onclick: function () { o.remove(); } })])
        ]);
      }).catch(function (e) { console.warn(e); sendBtn.disabled = false; toast('보내지 못했어요. 인터넷 연결을 확인해 주세요.'); });
    }
  }

  /* ---------- 연결 ---------- */
  function connect() {
    if (!room) return showJoin();
    localStorage.setItem('namugil.tablet.room', room);
    if (unsubState) unsubState(); if (unsubGifts) unsubGifts();
    var first = true;
    unsubState = MT.Sync.watchState(room, function (st, err) {
      if (err || !st) { if (first) showJoin(err ? '연결하지 못했어요. 인터넷을 확인해 주세요.' : room + '번 방을 찾을 수 없어요. 방 번호를 확인해 주세요.'); return; }
      state = st;
      if (first) {
        first = false;
        var saved = sessionStorage.getItem('namu.team.' + room);
        team = saved !== null ? +saved : null;
        wasBloomed = !!st.bloomed;
        if (team === null || team >= st.teamCount) showPickTeam(); else showMain();
      } else update();
    });
    unsubGifts = MT.Sync.watchGifts(room, function (list) { gifts = list; update(); });
  }

  showJoin('연결하는 중이에요…');
  MT.Sync.init().then(function (on) {
    if (!on) return showJoin(MT.Sync.configured() ? '연결하지 못했어요. 인터넷을 확인해 주세요.' : '아직 선생님 컴퓨터에 연결 설정이 없어요. (firebase-config.js)');
    if (room) connect(); else showJoin();
  });
})(window.MT);
