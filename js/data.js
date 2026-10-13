/* 나무 길 보드게임 - 기본 데이터와 저장 도우미 */
window.MT = window.MT || {};
(function (MT) {
  MT.IMG = MT.IMG || {
    tree: 'images/tree.png',
    leaves: ['images/leaf1.png', 'images/leaf2.png', 'images/leaf3.png', 'images/leaf4.png'],
    bgBase: 'images/bg-base.jpg',
    bgGrass: 'images/bg-grass.jpg',
    fairyGuide: 'images/fairy-guide.jpg',
    fairyQuiz: 'images/fairy-quiz.jpg',
    fairyCheer: 'images/fairy-cheer.jpg',
    fairyFace: 'images/fairy-face.jpg'
  };

  MT.COLORS = {
    yellow: { label: '노랑', fill: '#FFE38C', edge: '#E9B93A', ink: '#6B4E12' },
    blue: { label: '파랑', fill: '#BFE3F9', edge: '#6FB6E3', ink: '#1F4E6E' },
    purple: { label: '보라', fill: '#DFCEF8', edge: '#A98BE3', ink: '#4B3277' },
    rainbow: { label: '무지개', fill: 'rainbow', edge: '#E59ABD', ink: '#6A3550' }
  };
  MT.COLOR_KEYS = ['yellow', 'blue', 'purple', 'rainbow'];

  // 색깔별 미션: 그 선생님 메신저에 나온 건 '행동미션', '퀴즈 맞추기 미션'. 나머지는 임시 이름(설정에서 변경).
  MT.DEFAULT_MISSIONS = {
    yellow: { name: '퀴즈', kind: 'quiz' },
    blue: { name: '행동 미션', kind: 'action' },
    purple: { name: '마음 나누기', kind: 'action' },
    rainbow: { name: '특별 미션', kind: 'action' }
  };

  MT.TEAM_COLORS = ['#FF9E9E', '#8FC9F0', '#F5CF5F', '#8ED8B3', '#C2A6F0', '#FFB477', '#F4A6C6', '#7ED1CE'];

  // 나무1 그림의 가지 둘레 360곳 (가로, 세로 비율). 앞쪽부터 나무 전체에 고르게 퍼지도록 정렬됨.
  MT.LEAF_ANCHORS = [[0.5881,0.0],[0.109,0.5474],[0.8956,0.5274],[0.1146,0.1444],[0.493,0.3533],[0.9953,0.1926],[0.7092,0.2052],[0.3924,0.5622],[0.0,0.3437],[0.3896,0.1511],[0.6421,0.517],[0.2451,0.3807],[0.8667,0.3452],[0.7996,0.0474],[0.261,0.0356],[0.6803,0.3674],[0.2488,0.2393],[0.561,0.1363],[0.4222,0.003],[0.9963,0.4244],[0.2563,0.5044],[0.1062,0.4267],[0.8518,0.1622],[0.7754,0.4585],[0.5722,0.2541],[0.3747,0.4356],[0.1053,0.2622],[0.3933,0.2674],[0.9991,0.3067],[0.6747,0.0815],[0.2442,0.137],[0.5527,0.443],[0.8099,0.2585],[0.7512,0.5474],[0.466,0.0859],[0.4772,0.2067],[0.3523,0.3489],[0.8863,0.4319],[0.1398,0.343],[0.9161,0.2526],[0.8956,0.0852],[0.0,0.2526],[0.3579,0.0711],[0.6719,0.283],[0.699,0.0015],[0.7614,0.1244],[0.5899,0.3333],[0.7689,0.3304],[0.6785,0.4444],[0.164,0.4859],[0.0373,0.1852],[0.2721,0.3104],[0.1668,0.2059],[0.4837,0.2807],[0.3327,0.2104],[0.6198,0.1919],[0.2022,0.5622],[0.0196,0.4467],[0.4641,0.4281],[0.5527,0.0652],[0.3448,0.5022],[0.192,0.0815],[0.8071,0.3948],[0.9655,0.4881],[0.9459,0.3696],[0.2898,0.4393],[0.1883,0.2859],[0.5051,0.0081],[0.6831,0.1452],[0.1864,0.4237],[0.6104,0.3993],[0.343,0.0081],[0.8183,0.5141],[0.7866,0.1963],[0.0867,0.4881],[0.3197,0.1244],[0.424,0.3259],[0.0699,0.3163],[0.4818,0.1452],[0.0643,0.3763],[0.9171,0.1926],[0.7148,0.4963],[0.411,0.3844],[0.9254,0.3104],[0.7353,0.4081],[0.548,0.1963],[0.7381,0.2607],[0.3215,0.2689],[0.9282,0.1363],[0.4054,0.2067],[0.8276,0.1022],[0.9879,0.2489],[0.6198,0.0489],[0.8555,0.2163],[0.7316,0.0496],[0.5415,0.3904],[0.1808,0.1541],[0.2693,0.1889],[0.6216,0.1133],[0.8621,0.2911],[0.096,0.2096],[0.2721,0.0874],[0.2134,0.3348],[0.3271,0.397],[0.8677,0.4815],[0.6878,0.5541],[0.4091,0.5133],[0.6561,0.2341],[0.3299,0.5533],[0.5322,0.3133],[0.2321,0.4585],[0.4194,0.0526],[0.7083,0.323],[0.4063,0.1052],[0.1827,0.3763],[0.6132,0.2889],[0.0149,0.2978],[0.4455,0.2459],[0.5163,0.243],[0.6496,0.3289],[0.8928,0.3867],[0.8285,0.4422],[0.7409,0.1667],[0.6095,0.4444],[0.0103,0.3896],[0.3607,0.3044],[0.5154,0.1074],[0.9394,0.4141],[0.2973,0.3593],[0.1612,0.5311],[0.1463,0.1067],[0.6431,0.0059],[0.0559,0.2422],[0.3374,0.1659],[0.1258,0.3859],[0.6337,0.5615],[0.7549,0.0104],[0.1594,0.2489],[0.4986,0.0511],[0.439,0.1726],[0.822,0.32],[0.3141,0.0459],[0.918,0.4667],[0.767,0.0815],[0.739,0.3659],[0.1202,0.303],[0.4101,0.4667],[0.2171,0.1859],[0.3001,0.4807],[0.6775,0.04],[0.7651,0.5074],[0.877,0.1237],[0.713,0.1104],[0.8015,0.1533],[0.7763,0.2896],[0.0559,0.4178],[0.4623,0.3859],[0.6617,0.4052],[0.2386,0.2793],[0.6449,0.4748],[0.9925,0.3467],[0.205,0.5111],[0.6076,0.1519],[0.9553,0.2185],[0.726,0.4563],[0.2386,0.42],[0.4352,0.2881],[0.9543,0.277],[0.4595,0.0281],[0.5489,0.0267],[0.5433,0.3519],[0.5769,0.0985],[0.6253,0.3622],[0.1463,0.4481],[0.1295,0.1815],[0.7735,0.2333],[0.8211,0.3585],[0.6664,0.1837],[0.2022,0.1185],[0.3784,0.0333],[0.9888,0.3859],[0.3178,0.3207],[0.3709,0.2326],[0.2964,0.237],[0.0811,0.1711],[0.4706,0.32],[0.863,0.2533],[0.5126,0.42],[0.3038,0.5207],[0.3336,0.4541],[0.5266,0.163],[0.0671,0.4541],[0.2861,0.1541],[0.2022,0.2304],[0.6095,0.2281],[0.8527,0.4052],[0.438,0.1333],[0.0624,0.2785],[0.2339,0.0652],[0.4185,0.4244],[0.8155,0.477],[0.2805,0.4037],[0.1249,0.5096],[0.3178,0.0874],[0.8518,0.5378],[0.0941,0.3496],[0.3616,0.1119],[0.5349,0.2778],[0.7959,0.5467],[0.7763,0.423],[0.2563,0.3444],[0.7008,0.2415],[0.9143,0.3444],[0.3691,0.5326],[0.1687,0.317],[0.2349,0.5363],[0.5834,0.3711],[0.37,0.4015],[0.8956,0.163],[0.0429,0.3459],[0.5713,0.2963],[0.4501,0.3533],[0.3672,0.1904],[0.7307,0.2941],[0.8537,0.0756],[0.9329,0.5096],[0.3681,0.4733],[0.6841,0.52],[0.3942,0.3496],[0.1901,0.4585],[0.8966,0.223],[0.8295,0.1904],[0.6664,0.1148],[0.5741,0.4148],[0.6291,0.0807],[0.2805,0.2674],[0.5815,0.177],[0.1454,0.4156],[0.7801,0.3704],[0.9637,0.323],[0.8155,0.2267],[0.1258,0.2311],[0.1482,0.28],[0.123,0.4741],[0.6253,0.2585],[0.2386,0.1052],[0.8341,0.1341],[0.9003,0.2837],[0.5023,0.3874],[0.9599,0.4407],[0.8863,0.3156],[0.7493,0.2089],[0.7279,0.0807],[0.5713,0.2215],[0.2815,0.1185],[0.8751,0.1896],[0.7008,0.3941],[0.3989,0.2993],[0.5815,0.0444],[0.8173,0.2896],[0.3075,0.1852],[0.6449,0.1422],[0.9245,0.1059],[0.0578,0.2119],[0.7241,0.5259],[0.384,0.003],[0.4706,0.1163],[0.6841,0.4785],[0.644,0.4319],[0.3952,0.0763],[0.0876,0.4],[0.2134,0.3978],[0.5182,0.077],[0.2199,0.3052],[0.178,0.3459],[0.7241,0.14],[0.7987,0.1215],[0.5144,0.2096],[0.4408,0.2163],[0.164,0.5607],[0.2106,0.2593],[0.808,0.0763],[0.8537,0.3756],[0.4967,0.1815],[0.2404,0.2089],[0.8993,0.497],[0.0252,0.2259],[0.2693,0.4637],[0.151,0.137],[0.3569,0.2615],[0.4091,0.2356],[0.3364,0.4252],[0.9963,0.277],[0.7064,0.4259],[0.3336,0.2393],[0.4595,0.057],[0.2451,0.1674],[0.3551,0.1407],[0.8593,0.5096],[0.2824,0.0593],[0.48,0.2385],[0.4306,0.0822],[0.9991,0.2207],[0.6114,0.0215],[0.5182,0.1356],[0.219,0.4852],[0.4576,0.0],[0.9525,0.2474],[0.4007,0.1778],[0.7008,0.1778],[0.9208,0.4378],[0.4939,0.4437],[0.3048,0.2948],[0.6999,0.0615],[0.0326,0.263],[0.2162,0.3652],[0.7456,0.4793],[0.7642,0.04],[0.6179,0.3163],[0.7083,0.3511],[0.5909,0.0733],[0.6775,0.3104],[0.5405,0.0],[0.8658,0.4541],[0.7754,0.2607],[0.3709,0.3741],[0.7102,0.0274],[0.6486,0.2074],[0.6524,0.0585],[0.7018,0.2696],[0.7344,0.2333],[0.7661,0.3963],[0.3802,0.4993],[0.2153,0.1511],[0.2936,0.2096],[0.7754,0.1704],[0.384,0.3237],[0.3476,0.0444],[0.6384,0.1689],[0.1007,0.4541],[0.0885,0.2356],[0.5033,0.3267],[0.6449,0.2985],[0.7456,0.4333],[0.1743,0.18],[0.3308,0.3689],[0.658,0.54],[0.0373,0.32],[0.4371,0.403],[0.7381,0.3393],[0.1519,0.3674],[0.6729,0.257],[0.8602,0.1015],[0.6449,0.383],[0.4101,0.0274],[0.7829,0.4837],[0.9264,0.3904],[0.1948,0.537],[0.0913,0.2904],[0.6785,0.3407]];

  // 예시 문제 (그 선생님 문제가 들어오기 전 시험용). 칸별 문제를 입력하면 그게 우선입니다.
  MT.BANK = {
    yellow: [
      { q1: '친구가 넘어졌어요. 어떤 말을 해 주면 좋을까요?', a1: '괜찮아? / 많이 아프니? / 일어날 수 있게 도와줄까?', q2: '친구가 나에게 지우개를 빌려줬어요. 어떤 말을 하면 좋을까요?', a2: '고마워! / 빌려줘서 고마워. 잘 쓰고 돌려줄게.' },
      { q1: '친구와 부딪혔어요. 어떤 말을 하면 좋을까요?', a1: '미안해, 괜찮아? / 내가 못 봤어. 미안해.', q2: '친구가 나에게 “미안해.” 하고 말했어요. 어떻게 대답하면 좋을까요?', a2: '괜찮아! / 사과해 줘서 고마워.' },
      { q1: '화가 날 때 마음을 차분하게 하는 방법을 말해 볼까요?', a1: '숨을 크게 쉬어요. / 열까지 세어요. / 선생님께 말해요.', q2: '친구가 혼자 있어요. 어떻게 하면 좋을까요?', a2: '같이 놀자고 말해요. / 옆에 가서 말을 걸어요.' },
      { q1: '친구가 그린 그림이 멋져요. 친구에게 어떤 말을 해 줄까요?', a1: '멋지다! / 색깔이 정말 예뻐. / 어떻게 그렸어?', q2: '놀이할 때 내 차례가 아직 안 왔어요. 어떻게 하면 좋을까요?', a2: '차례를 지켜 기다려요. / 친구를 응원하며 기다려요.' }
    ],
    blue: [
      { q1: '모둠 친구들과 하이파이브를 해요.', a1: '', q2: '모두 손을 모으고 “우리는 한 팀!” 하고 외쳐요.', a2: '' },
      { q1: '옆 친구에게 “잘하고 있어!” 하고 말해 줘요.', a1: '', q2: '모두 함께 나무처럼 두 팔을 벌리고 서 봐요.', a2: '' },
      { q1: '모둠 친구 이름을 한 명씩 다정하게 불러 줘요.', a1: '', q2: '모둠 친구에게 엄지를 세우고 “최고!” 하고 말해 줘요.', a2: '' }
    ],
    purple: [
      { q1: '오늘 내 기분을 날씨로 말해 봐요. 맑음, 흐림, 비처럼요.', a1: '', q2: '내가 좋아하는 것을 하나 말해 봐요.', a2: '' },
      { q1: '친구에게 고마웠던 일을 말해 봐요.', a1: '', q2: '내가 행복할 때는 언제인지 말해 봐요.', a2: '' },
      { q1: '모둠 친구의 좋은 점을 하나 말해 줘요.', a1: '', q2: '속상할 때 나는 어떻게 하는지 이야기해 봐요.', a2: '' }
    ],
    rainbow: [
      { q1: '친구에게 주고 싶은 선물을 태블릿에 그려서 보내요.', a1: '', d1: true, q2: '모둠 이름을 함께 지어서 크게 외쳐요.', a2: '' },
      { q1: '우리 반은 어떤 반인지 모둠 친구들과 이야기해 봐요.', a1: '', q2: '우리 반 나무에게 주고 싶은 선물을 태블릿에 그려서 보내요.', a2: '', d2: true }
    ]
  };

  // 한 바퀴 돌아 출발 칸에 왔을 때 응원 미션 (돌아가며 나옴)
  MT.START_MISSIONS = [
    { text: '모둠 친구에게 고맙다고 말해 봐요.', say: '모둠 친구에게, 고맙다고 말해 봐요.' },
    { text: '모둠 친구와 하이파이브를 해요.', say: '모둠 친구와, 하이파이브를 해요.' },
    { text: '서로에게 힘내라고 말해 줘요.', say: '서로에게, 힘내라고 말해 줘요.' },
    { text: '지금까지 제일 재미있었던 미션을 이야기해 봐요.', say: '지금까지 제일 재미있었던 미션을, 이야기해 봐요.' }
  ];

  MT.FAIRY_LINES = {
    hello: '안녕! 나는 나무 요정이야. 우리 함께 나무를 풍성하게 키워 보자!',
    helloSay: '안녕! 나는 나무 요정이야. 우리, 나무를 풍성하게 키워 보자!',
    howto: '주사위를 굴리고, 우리 모둠 자동차를 끌어서 옮겨 줘. 멈춘 칸을 누르면 내가 문제를 낼게! 미션을 해낼 때마다 우리 반 나무에 나뭇잎이 자라. 다 함께 나무를 풍성하게 만들어 보자!'
  };

  /* ---------- 작은 도우미 ---------- */
  MT.uid = function () { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); };

  MT.rng = function (seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  };

  // 색 칸 배치: 네 가지 색을 같은 수만큼, 섞어서, 옆 칸과 같은 색이 이어지지 않게
  MT.makeCellColors = function (count, seed) {
    var r = MT.rng(seed), left = {}, out = [], prev = null;
    MT.COLOR_KEYS.forEach(function (c, i) { left[c] = Math.floor(count / 4) + (i < count % 4 ? 1 : 0); });
    for (var i = 0; i < count; i++) {
      var remain = count - i, pool = MT.COLOR_KEYS.filter(function (c) { return c !== prev && left[c] > 0; });
      // 한 색이 너무 많이 남으면 그 색을 먼저 (옆 칸 같은 색 방지)
      var must = pool.filter(function (c) { return left[c] > (remain - 1) / 2; });
      if (must.length) pool = must;
      var total = pool.reduce(function (a, c) { return a + left[c]; }, 0), pick = r() * total, chosen = pool[pool.length - 1];
      for (var k = 0; k < pool.length; k++) { pick -= left[pool[k]]; if (pick < 0) { chosen = pool[k]; break; } }
      out.push(chosen); left[chosen]--; prev = chosen;
    }
    return out;
  };

  MT.mix = function (hex, white) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * white); g = Math.round(g + (255 - g) * white); b = Math.round(b + (255 - b) * white);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  };
  MT.shade = function (hex, dark) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return 'rgb(' + Math.round(r * (1 - dark)) + ',' + Math.round(g * (1 - dark)) + ',' + Math.round(b * (1 - dark)) + ')';
  };

  /* ---------- 설정 ---------- */
  MT.defaultSettings = function () {
    var seed = Math.floor(Math.random() * 1e9);
    var s = {
      v: 1,
      title: '나무 길 보드게임',
      teamCount: 4,
      teams: [],
      cellCount: 36,          // 출발 칸 포함 전체 칸 수 (그 선생님 초안 36칸)
      leafPerWin: 6,          // 미션 한 번에 자라는 나뭇잎 수
      seed: seed,
      cellColors: [],
      missions: JSON.parse(JSON.stringify(MT.DEFAULT_MISSIONS)),
      questions: {},          // { 칸번호: {q1,a1,q2,a2} }
      tts: true,
      room: String(1000 + Math.floor(Math.random() * 9000))
    };
    for (var i = 0; i < 8; i++) s.teams.push({ name: (i + 1) + '모둠', color: MT.TEAM_COLORS[i], seats: 4 });
    s.cellColors = MT.makeCellColors(s.cellCount - 1, seed);
    return s;
  };

  MT.defaultSet = function (name) {
    var seed = Math.floor(Math.random() * 1e9);
    return { name: name || '기본 문제 세트', title: '나무 길 보드게임', cellCount: 36, seed: seed, cellColors: MT.makeCellColors(35, seed), missions: JSON.parse(JSON.stringify(MT.DEFAULT_MISSIONS)), questions: {} };
  };
  MT.defaultClass = function (name, setId, room) {
    var teams = [];
    for (var i = 0; i < 8; i++) teams.push({ name: (i + 1) + '모둠', color: MT.TEAM_COLORS[i], seats: 4 });
    return { name: name, setId: setId, teamCount: 4, teams: teams, room: room, leafPerWin: 6, autoRead: false, game: MT.defaultGame() };
  };

  /* ---------- 소리로 읽을 글 다듬기 ----------
     기기가 숫자를 짐작해서 읽지 않도록 숫자를 모두 한글로 바꿔서 넘김
     - 이름처럼 쓰는 숫자(모둠, 칸, 학년, 반, 분 …): 한자어  → 이모둠, 오번 칸, 이 학년
     - 개수 세는 숫자(장, 개, 명, 살, 시, 번 …): 우리말    → 여섯 장, 세 명, 세 번
  */
  MT.sino = function (n) {
    n = Math.floor(+n);
    if (!(n >= 0)) return String(n);
    if (n === 0) return '영';
    var d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], u = ['', '십', '백', '천'], out = '', str = String(n);
    if (n >= 10000) return str.split('').map(function (c) { return c === '0' ? '공' : d[+c]; }).join(' ');
    for (var i = 0; i < str.length; i++) {
      var dig = +str[i], pos = str.length - 1 - i;
      if (!dig) continue;
      out += (dig === 1 && pos > 0 ? '' : d[dig]) + u[pos];
    }
    return out;
  };
  MT.native = function (n) {
    n = +n;
    var one = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'], ten = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
    if (!(n >= 1 && n < 100)) return MT.sino(n);
    if (n === 20) return '스무';
    return ten[Math.floor(n / 10)] + one[n % 10];
  };
  var MONTH = { 6: '유월', 10: '시월' };
  MT.readable = function (text) {
    var t = String(text);
    t = t.replace(/[.]\s*”/g, '”');   // 따옴표 안 마침표에서 길게 쉬지 않게
    t = t.replace(/\s*“/g, ', ').replace(/”/g, '').replace(/\s*‘/g, ', ').replace(/’/g, '');
    t = t.replace(/_{2,}/g, ', 무엇, ');
    // "우리 반 나무"를 "우리 / 반나무"로 묶어 읽지 않도록 소리로 읽을 때만 붙여 씀
    t = t.replace(/우리\s+반(?=\s|[은는이가을를의에도]|$)/g, '우리반');
    // 한자어
    t = t.replace(/(\d+)\s*모둠/g, function (m, n) { return MT.sino(n) + '모둠'; });
    t = t.replace(/(\d+)\s*번\s*칸/g, function (m, n) { return MT.sino(n) + '번 칸'; });
    t = t.replace(/문제\s*(\d+)/g, function (m, n) { return '문제 ' + MT.sino(n); });
    t = t.replace(/(\d+)\s*월/g, function (m, n) { return (MONTH[+n] || MT.sino(n) + '월'); });
    t = t.replace(/(\d+)\s*(학년|반|분|층|쪽|년|원|일|등|호|단계|퍼센트)/g, function (m, n, u) { return MT.sino(n) + ' ' + u; });
    // 우리말
    t = t.replace(/(\d+)\s*번째/g, function (m, n) { return (+n === 1 ? '첫' : MT.native(n)) + ' 번째'; });
    t = t.replace(/(\d+)\s*(장|개|명|마리|살|시|권|번|송이|그루|가지|군데|잔|켤레|벌|대|자루|통|줄|발|걸음|바퀴|사람|모금|방울|조각|칸)/g, function (m, n, u) { return MT.native(n) + ' ' + u; });
    // 남은 숫자는 한자어로
    t = t.replace(/\d+/g, function (n) { return MT.sino(n); });
    return t;
  };
  // 받침 있는지: 숫자로 끝나면 한자어로 읽었을 때 기준
  MT.hasBatchim = function (word) {
    var w = String(word).trim(), m = w.match(/(\d+)$/);
    if (m) w = MT.sino(m[1]);
    var c = w.charCodeAt(w.length - 1);
    if (c < 0xAC00 || c > 0xD7A3) return false;
    return (c - 0xAC00) % 28 !== 0;
  };

  // 요정 목소리: 한국어 여자 목소리를 우선으로, 높고 발랄하게
  MT.voice = {
    isEdge: /Edg\//.test(navigator.userAgent),
    pick: function () {
      if (!('speechSynthesis' in window)) return null;
      var ko = speechSynthesis.getVoices().filter(function (v) { return /^ko/i.test(v.lang); });
      // 엣지: 자연스러운 온라인 목소리, 크롬: 구글 한국어 목소리를 먼저
      var prefer = [/SunHi.*Natural|SunHi.*Online/i, /Natural|Online/i, /Google/i, /Yuna/i, /SunHi/i, /Heami/i];
      for (var i = 0; i < prefer.length; i++) { var f = ko.filter(function (v) { return prefer[i].test(v.name); })[0]; if (f) return f; }
      return ko[0] || null;
    },
    // 크롬: 높이·빠르기를 바꾸면 지직거려서 원래 그대로
    // 엣지: 자연스러운 목소리라 높여도 깨지지 않아서 맑고 발랄하게
    tune: function (v, isQuestion) {
      var n = v ? v.name : '';
      if (MT.voice.isEdge && /Natural|Online/i.test(n)) return { pitch: isQuestion ? 1.45 : 1.55, rate: isQuestion ? 1.0 : 1.05 };
      return { pitch: 1, rate: 1 };
    },
    // 여러 문장을 한 문장씩 쉬어 가며 읽기
    speakSeq: function (lines, opts) {
      if (!('speechSynthesis' in window)) return false;
      var wasBusy = speechSynthesis.speaking || speechSynthesis.pending;
      speechSynthesis.cancel();
      var v = MT.voice.pick(), t = MT.voice.tune(v, !!(opts && opts.question));
      var go = function () {
        lines.forEach(function (line) {
          var u = new SpeechSynthesisUtterance(MT.readable(line));
          u.lang = 'ko-KR'; if (v) u.voice = v; u.pitch = t.pitch; u.rate = t.rate;
          speechSynthesis.speak(u);
        });
      };
      if (wasBusy) setTimeout(go, 150); else go();
      return true;
    },
    speak: function (text, opts) {
      if (!('speechSynthesis' in window)) return false;
      var wasBusy = speechSynthesis.speaking || speechSynthesis.pending;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(MT.readable(text));
      u.lang = 'ko-KR';
      var v = MT.voice.pick(); if (v) u.voice = v;
      var t = MT.voice.tune(v, !!(opts && opts.question));
      u.pitch = t.pitch; u.rate = t.rate;
      // 이전 소리를 끊자마자 바로 읽으면 크롬에서 잡음이 나서 아주 짧게 쉬었다가
      if (wasBusy) setTimeout(function () { speechSynthesis.speak(u); }, 150); else speechSynthesis.speak(u);
      return true;
    }
  };
  if ('speechSynthesis' in window) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = function () { speechSynthesis.getVoices(); }; }

  MT.ensureColors = function (s) {
    var need = s.cellCount - 1;
    if (!s.cellColors || s.cellColors.length !== need) s.cellColors = MT.makeCellColors(need, s.seed);
  };

  MT.defaultGame = function () {
    return { positions: {}, leaves: [], buds: [], cleared: {}, turns: {}, grass: 0, rainbowSeen: {}, bloomed: false, gifts: [], fairy: null };
  };

  // 칸 번호(1 ~ 칸수-1)의 색, 문제 (0번은 출발 칸)
  MT.cellColor = function (s, cell) { return s.cellColors[cell - 1]; };

  MT.getQuestion = function (s, cell, qi) {
    var color = MT.cellColor(s, cell);
    var own = s.questions[cell];
    var key = qi === 0 ? 'q1' : 'q2', akey = qi === 0 ? 'a1' : 'a2';
    var dkey = qi === 0 ? 'd1' : 'd2';
    if (own && own[key] && own[key].trim()) return { text: own[key].trim(), answer: (own[akey] || '').trim(), sample: false, draw: !!own[dkey] };
    // 예시 문제: 같은 색 칸 중 몇 번째인지로 고름
    var nth = 0;
    for (var i = 1; i < cell; i++) if (MT.cellColor(s, i) === color) nth++;
    var bank = MT.BANK[color];
    var b = bank[nth % bank.length];
    return { text: b[key], answer: b[akey] || '', sample: true, draw: !!b[dkey] };
  };

  /* ---------- 저장 ---------- */
  var K = { settings: 'namugil.settings.v2', game: 'namugil.game.v2', avatars: 'namugil.avatars.v1' };
  function read(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { console.warn('저장 실패', e); return false; }
  }
  MT.store = {
    loadSettings: function () {
      var s = read(K.settings, null);
      if (!s) s = MT.defaultSettings();
      var d = MT.defaultSettings();
      for (var k in d) if (!(k in s)) s[k] = d[k];
      while (s.teams.length < 8) s.teams.push(d.teams[s.teams.length]);
      for (var c in MT.DEFAULT_MISSIONS) if (!s.missions[c]) s.missions[c] = MT.DEFAULT_MISSIONS[c];
      MT.ensureColors(s);
      return s;
    },
    saveSettings: function (s) { return write(K.settings, s); },
    loadGame: function () { var g = read(K.game, null); var d = MT.defaultGame(); if (!g) return d; for (var k in d) if (!(k in g)) g[k] = d[k]; return g; },
    saveGame: function (g) {
      // 선물 그림은 용량이 커서 최근 것만 보관
      var copy = Object.assign({}, g, { gifts: (g.gifts || []).slice(-24) });
      return write(K.game, copy);
    },
    loadAvatars: function () { return read(K.avatars, []); },
    saveAvatars: function (a) { return write(K.avatars, a); }
  };
})(window.MT);
