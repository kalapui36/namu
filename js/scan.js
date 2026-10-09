/* 활동지(스캔 PDF, 사진)에서 동그라미 안 그림을 찾아 잘라냅니다. */
window.MT = window.MT || {};
(function (MT) {
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var pdfReady = null;
  function loadPdfJs() {
    if (pdfReady) return pdfReady;
    pdfReady = new Promise(function (ok, no) {
      if (window.pdfjsLib) return ok(window.pdfjsLib);
      var s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; ok(window.pdfjsLib); };
      s.onerror = no; document.head.appendChild(s);
    });
    return pdfReady;
  }

  function canvasFrom(src, maxW) {
    var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
    var r = Math.min(1, maxW / w);
    var c = document.createElement('canvas'); c.width = Math.round(w * r); c.height = Math.round(h * r);
    var x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function loadImage(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () { ok(im); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      im.onerror = function () { no(new Error('그림을 열 수 없어요: ' + file.name)); };
      im.src = url;
    });
  }

  // 파일들 → 페이지 캔버스 목록
  MT.Scan = {
    toPages: async function (files, onProgress) {
      var pages = [];
      for (var f = 0; f < files.length; f++) {
        var file = files[f];
        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          var lib = await loadPdfJs();
          var pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
          for (var p = 1; p <= pdf.numPages; p++) {
            onProgress && onProgress(file.name + ' ' + p + '/' + pdf.numPages + '쪽 읽는 중');
            var page = await pdf.getPage(p);
            var vp1 = page.getViewport({ scale: 1 });
            var vp = page.getViewport({ scale: 1300 / vp1.width });
            var c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
            var ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;
            pages.push(c);
          }
        } else if (/^image\//.test(file.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
          onProgress && onProgress(file.name + ' 읽는 중');
          pages.push(canvasFrom(await loadImage(file), 1400));
        }
      }
      return pages;
    },

    // 동그라미 찾기: 활동지에서 동그라미는 거의 한가운데, 지름은 종이 폭의 약 57%
    detect: function (cv) {
      var W = cv.width, H = cv.height;
      var data = cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data;
      function lum(x, y) { x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= W || y >= H) return 255; var i = (y * W + x) * 4; return data[i] * .3 + data[i + 1] * .59 + data[i + 2] * .11; }
      // 종이 밝기 추정
      var samp = [];
      for (var k = 0; k < 400; k++) samp.push(lum((k * 7919) % W, (k * 104729) % H));
      samp.sort(function (a, b) { return a - b; });
      var paper = samp[Math.floor(samp.length * 0.85)];
      var dark = Math.min(150, paper * 0.62);
      function isDark(x, y) { return lum(x, y) < dark; }
      function scan(x0, y0, dx, dy, steps) {
        for (var s = 0; s < steps; s++) { var x = x0 + dx * s, y = y0 + dy * s; if (isDark(x, y) && isDark(x + dx, y + dy)) return s; }
        return -1;
      }
      function median(a) { a = a.filter(function (v) { return v >= 0; }).sort(function (p, q) { return p - q; }); return a.length ? a[Math.floor(a.length / 2)] : -1; }

      var ratio = H / W, a4 = ratio > 1.25 && ratio < 1.6;
      var est = a4 ? { cx: W * 0.5, cy: H * 0.497, r: W * 0.286 } : { cx: W / 2, cy: H / 2, r: Math.min(W, H) * 0.42 };
      var cur = { cx: est.cx, cy: est.cy, r: est.r }, ok = false;
      for (var pass = 0; pass < 2; pass++) {
        var r = cur.r, off = [-0.04, -0.02, 0, 0.02, 0.04], span = Math.round(r * 0.95);
        var L = median(off.map(function (o) { return scan(cur.cx - 1.45 * r, cur.cy + o * r, 1, 0, span); }));
        var R = median(off.map(function (o) { return scan(cur.cx + 1.45 * r, cur.cy + o * r, -1, 0, span); }));
        if (L < 0 || R < 0) break;
        var left = cur.cx - 1.45 * r + L, right = cur.cx + 1.45 * r - R;
        var cx = (left + right) / 2, half = (right - left) / 2;
        var T = median(off.map(function (o) { return scan(cx + o * r, cur.cy - 1.18 * r, 0, 1, Math.round(r * 0.7)); }));
        var B = median(off.map(function (o) { return scan(cx + o * r, cur.cy + 1.18 * r, 0, -1, Math.round(r * 0.7)); }));
        if (T < 0 || B < 0) break;
        var top = cur.cy - 1.18 * r + T, bottom = cur.cy + 1.18 * r - B;
        var vr = (bottom - top) / 2, cy = (top + bottom) / 2;
        var nr = Math.max(half, vr);
        if (Math.abs(vr / nr - 1) > 0.14 || Math.abs(nr / est.r - 1) > 0.3) break;
        cur = { cx: cx, cy: cy, r: nr }; ok = true;
      }
      return { cx: cur.cx, cy: cur.cy, r: cur.r, ok: ok };
    },

    crop: function (cv, d) {
      var ri = d.r * 0.92, out = document.createElement('canvas');
      out.width = out.height = 240;
      var x = out.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, 240, 240);
      x.drawImage(cv, d.cx - ri, d.cy - ri, ri * 2, ri * 2, 0, 0, 240, 240);
      var img = out.toDataURL('image/jpeg', 0.86);
      // 이름 칸 (동그라미 위쪽)
      var ny0 = d.cy - d.r * 1.64, nh = d.r * 0.5, nx0 = d.cx - d.r * 1.72, nw = d.r * 3.44;
      var nc = document.createElement('canvas'); nc.width = 420; nc.height = Math.max(40, Math.round(420 * nh / nw));
      var nx = nc.getContext('2d'); nx.fillStyle = '#fff'; nx.fillRect(0, 0, nc.width, nc.height);
      nx.drawImage(cv, nx0, ny0, nw, nh, 0, 0, nc.width, nc.height);
      return { img: img, nameImg: nc.toDataURL('image/jpeg', 0.6) };
    },

    preview: function (cv) {
      var c = canvasFrom(cv, 900);
      return { url: c.toDataURL('image/jpeg', 0.8), scale: c.width / cv.width };
    }
  };
})(window.MT);
