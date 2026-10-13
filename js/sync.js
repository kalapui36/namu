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
        // 처음 올릴 때 8초 안에 답이 없으면 '확인 필요'로 표시
        if (!Sync._checked) {
          clearTimeout(Sync._slow);
          Sync._slow = setTimeout(function () { if (!Sync._checked) Sync._report('slow'); }, 8000);
        }
        Sync.room(x.code).set(clean)
          .then(function () { Sync._checked = true; clearTimeout(Sync._slow); Sync._report('ok'); })
          .catch(function (e) { console.warn('상태 저장 실패', e); Sync._checked = false; clearTimeout(Sync._slow); Sync._report('error', e && e.code); });
      }, 250);
    },
    // 연결 상태 알림: 'ok' | 'slow' | 'error'
    onStatus: null,
    _report: function (st, code) { if (Sync._lastStatus === st + code) return; Sync._lastStatus = st + code; if (Sync.onStatus) Sync.onStatus(st, code); },
    watchState: function (code, cb) {
      return Sync.room(code).onSnapshot(function (snap) { cb(snap.exists ? snap.data() : null); }, function (e) { console.warn(e); cb(null, e); });
    },

    // 태블릿 → 선물 그림 보내기. 같은 문제에서 같은 모둠이 다시 보내면 새 그림으로 바뀜
    sendGift: function (code, team, img, qkey) {
      var id = (qkey || 'free') + '_' + team;
      return Sync.room(code).collection('gifts').doc(id).set({ team: team, img: img, ts: Date.now(), qkey: qkey || 'free' });
    },
    deleteGift: function (code, id) { return Sync.room(code).collection('gifts').doc(id).delete(); },
    watchGifts: function (code, cb) {
      return Sync.room(code).collection('gifts').onSnapshot(function (snap) {
        var list = snap.docs.map(function (d) { var v = d.data(); return { id: d.id, team: v.team, img: v.img, ts: v.ts || 0, qkey: v.qkey || 'free' }; });
        list.sort(function (a, b) { return a.ts - b.ts; });
        cb(list);
      }, function (e) { console.warn(e); });
    },

    /* ---------- 반과 문제 세트 저장 ---------- */
    _later: {},
    later: function (key, fn, ms) { clearTimeout(Sync._later[key]); Sync._later[key] = setTimeout(fn, ms || 600); },
    clean: function (o) { return JSON.parse(JSON.stringify(o)); },
    listDocs: async function (col) {
      var snap = await Sync.db.collection(col).get();
      return snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
    },
    getDoc: async function (col, id) {
      var d = await Sync.db.collection(col).doc(id).get();
      return d.exists ? Object.assign({ id: d.id }, d.data()) : null;
    },
    putDoc: function (col, id, data) {
      var copy = Sync.clean(data); delete copy.id; copy.updatedAt = Date.now();
      return Sync.db.collection(col).doc(id).set(copy);
    },
    putLater: function (col, id, data) {
      Sync.later(col + '/' + id, function () { Sync.putDoc(col, id, data).catch(function (e) { console.warn('저장 실패', e); Sync._report('error', e && e.code); }); });
    },
    newId: function (col) { return Sync.db.collection(col).doc().id; },
    listAvatars: async function (classId) {
      var snap = await Sync.db.collection('classes').doc(classId).collection('avatars').get();
      var list = snap.docs.map(function (d) { var v = d.data(); return { id: d.id, img: v.img, team: v.team, ok: v.ok !== false, ts: v.ts || 0 }; });
      list.sort(function (a, b) { return a.ts - b.ts; });
      return list;
    },
    putAvatar: function (classId, a) {
      return Sync.db.collection('classes').doc(classId).collection('avatars').doc(a.id).set({ img: a.img, team: a.team, ok: a.ok !== false, ts: a.ts || Date.now() });
    },
    deleteAvatar: function (classId, id) { return Sync.db.collection('classes').doc(classId).collection('avatars').doc(id).delete(); },
    deleteClass: async function (classId) {
      var ref = Sync.db.collection('classes').doc(classId);
      var av = await ref.collection('avatars').get();
      var batch = Sync.db.batch();
      av.forEach(function (d) { batch.delete(d.ref); });
      batch.delete(ref);
      await batch.commit();
    },
    deleteDoc: function (col, id) { return Sync.db.collection(col).doc(id).delete(); },

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
