/* 효과음: 소리 파일 없이 브라우저가 직접 만드는 짧고 맑은 종소리 */
window.MT = window.MT || {};
(function (MT) {
  var ctx = null, master = null;
  var KEY = 'namu.sfx';
  function on() { return localStorage.getItem(KEY) !== 'off'; }
  function ready() {
    if (!on()) return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  // 첫 터치 때 소리를 쓸 수 있게 열어 두기 (브라우저 규칙)
  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { ready(); }, { once: true, capture: true }); });

  // 종소리 한 음: 기본음 + 맑은 배음, 빠르게 울리고 부드럽게 사라짐
  function bell(freq, at, dur, vol) {
    var c = ready(); if (!c) return;
    var t = c.currentTime + (at || 0), v = vol || 1;
    [[1, 1, 'sine'], [2, 0.28, 'sine'], [3, 0.08, 'triangle']].forEach(function (p) {
      var o = c.createOscillator(), g = c.createGain();
      o.type = p[2]; o.frequency.setValueAtTime(freq * p[0], t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * p[1] * v, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function glide(f1, f2, at, dur, vol) {
    var c = ready(); if (!c) return;
    var t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45 * (vol || 1), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  var SCALE = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093]; // 도 레 미 솔 라 도

  MT.sfx = {
    isOn: on,
    set: function (v) { localStorage.setItem(KEY, v ? 'on' : 'off'); },
    open: function () { bell(1318.5, 0, 0.35, 0.8); bell(1046.5, 0.16, 0.5, 0.8); },          // 딩동
    leaf: function (i) { bell(SCALE[(i || 0) % SCALE.length], 0, 0.28, 0.6); },              // 띠링 (한 음씩 올라감)
    bud: function () { glide(520, 1250, 0, 0.32, 0.7); bell(1568, 0.14, 0.3, 0.4); },         // 뽀용
    rainbow: function () { SCALE.concat([2349, 2637]).forEach(function (f, i) { bell(f, i * 0.06, 0.4, 0.45); }); }, // 반짝 계단
    gift: function () { bell(1760, 0, 0.12, 0.5); bell(2349, 0.05, 0.18, 0.35); },           // 톡
    bloom: function () { [1046.5, 1318.5, 1568].forEach(function (f, i) { bell(f, i * 0.12, 0.5, 0.7); }); [1046.5, 1318.5, 1568, 2093].forEach(function (f) { bell(f, 0.42, 1.2, 0.45); }); }
  };
})(window.MT);
