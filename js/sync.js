/* 파이어베이스 연동 (firebase-config.js에 설정이 있을 때만 켜집니다) */
window.MT = window.MT || {};
(function (MT) {
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  function load(src) {
    return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  function configured() {
    var c = window.FIREBASE_CONFIG;
    return !!(c && c.apiKey && c.projectId && c.apiKey.indexOf('여기') < 0);
  }

  var Sync = {
    enabled: false,
    db: null,
    configured: configured,
    init: function () {
      if (Sync._p) return Sync._p;
      Sync._p = (async function () {
        if (!configured()) return false;
        try {
          await load(SDK + 'firebase-app-compat.js');
          await load(SDK + 'firebase-firestore-compat.js');
          if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
          Sync.db = firebase.firestore();
          Sync.enabled = true;
          return true;
        } catch (e) { console.warn('파이어베이스를 불러오지 못했어요', e); return false; }
      })();
      return Sync._p;
    },
    room: function (code) { return Sync.db.collection('rooms').doc(String(code)); },

    // 전자칠판 → 상태 올리기 (짧은 글자 정보만)
    _timer: null, _last: null,
    pushState: function (code, data) {
      if (!Sync.enabled) return;
      Sync._last = { code: code, data: data };
      clearTimeout(Sync._timer);
      Sync._timer = setTimeout(function () {
        var x = Sync._last; Sync._last = null;
        var clean = JSON.parse(JSON.stringify(x.data));
        clean.ts = Date.now();
        Sync.room(x.code).set(clean).catch(function (e) { console.warn('상태 저장 실패', e); });
      }, 250);
    },
    watchState: function (code, cb) {
      return Sync.room(code).onSnapshot(function (snap) { cb(snap.exists ? snap.data() : null); }, function (e) { console.warn(e); cb(null, e); });
    },

    // 태블릿 → 선물 그림 보내기 (한 번만 올라감)
    sendGift: function (code, team, img) {
      return Sync.room(code).collection('gifts').add({ team: team, img: img, ts: Date.now() });
    },
    watchGifts: function (code, cb) {
      return Sync.room(code).collection('gifts').orderBy('ts').onSnapshot(function (snap) {
        cb(snap.docs.map(function (d) { var v = d.data(); return { id: d.id, team: v.team, img: v.img, ts: v.ts }; }));
      }, function (e) { console.warn(e); });
    },

    // 수업 끝: 이 방의 기록 지우기
    clearRoom: async function (code) {
      var ref = Sync.room(code);
      var gifts = await ref.collection('gifts').get();
      var batch = Sync.db.batch();
      gifts.forEach(function (d) { batch.delete(d.ref); });
      batch.delete(ref);
      await batch.commit();
    },
    clearGifts: async function (code) {
      var gifts = await Sync.room(code).collection('gifts').get();
      var batch = Sync.db.batch();
      gifts.forEach(function (d) { batch.delete(d.ref); });
      await batch.commit();
    }
  };
  MT.Sync = Sync;
})(window.MT);
