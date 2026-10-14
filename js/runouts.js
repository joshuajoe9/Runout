/* Dealing: starts a matchup, counts exact odds in a worker and animates each
   runout street by street. `res` holds everything about the current matchup. */
'use strict';

var worker = null, res = null, timer = null;
var exactCache = {};
var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function matchKey() {
  return state.A.slice().sort().join(',') + '|' + state.B.slice().sort().join(',') + '|' + boardCards().sort().join(',');
}

// before anything is dealt
function showIdle() {
  $('results').innerHTML = '<div class="sec-head"><h2>Results</h2></div>' +
    '<div class="empty">Pick a matchup, choose how many runouts, then hit <strong>Run it out</strong> to deal them one at a time.</div>';
}

// fresh matchup: clear the runouts and start counting exact equity
function start(count) {
  if (validate()) return;
  var A = state.A.slice(), B = state.B.slice(), board = boardCards();
  var key = matchKey();
  if (timer) { clearTimeout(timer); timer = null; }
  if (worker) { worker.terminate(); worker = null; }
  res = {
    key: key, A: A, B: B, board: board, labA: handLabel(A), labB: handLabel(B),
    boardText: board.length ? board.map(cardText).join(' ') : 'Preflop',
    totalBoards: E.comb(48 - board.length, 5 - board.length),
    exact: exactCache[key] || null, exactProg: 0,
    shown: 0, dealing: 0, busy: false, wa: 0, wb: 0, ties: 0, queue: []
  };
  $('results').innerHTML = '<div id="summary" class="card-inner"></div>' +
    '<div class="list-block"><div class="sec-head"><h3>Runouts <span>newest first</span></h3><button class="link" id="skip" hidden>Skip to the end</button></div>' +
    '<div class="ro-list" id="roList"><div class="empty" id="roEmpty">Dealing…</div></div></div>' +
    '<p class="note">Exact equity checks every possible board, so it is what this matchup wins in the long run. A handful of runouts can land far from it; that is variance, and it is why the gap shrinks as you deal more.</p>';
  renderSummary();
  if (!res.exact) startExact(res);
  dealMore(count || parseRuns());
}

function startExact(r) {
  var msg = { A: r.A, B: r.B, board: r.board };
  var done = function (d) {
    if (r !== res) return;
    if (d.type === 'exactProgress') r.exactProg = d.frac;
    else if (d.type === 'exact') { r.exact = d.result; exactCache[r.key] = d.result; }
    renderSummary();
  };
  try {
    var src = 'var E=(' + engineFactory + ')();var H=' + workerHandler + ';onmessage=function(e){H(E,e.data,function(d){postMessage(d);});};';
    var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    worker = new Worker(url);
    URL.revokeObjectURL(url);
    worker.onmessage = function (e) { done(e.data); };
    worker.onerror = function () { worker = null; setTimeout(function () { workerHandler(E, msg, done); }, 30); };
    worker.postMessage(msg);
  } catch (err) {
    setTimeout(function () { workerHandler(E, msg, done); }, 30);
  }
}

// how long each moment of a runout lingers, in ms
var PACE = { deal: 900, street: 2200, river: 1100, between: 1600 };

function dealMore(count) {
  if (validate()) return;
  if (!res || res.key !== matchKey()) { start(count); return; }
  runsInput.value = fmt(count);
  res.queue = res.queue.concat(E.deal(res.A, res.B, res.board, count));
  if (reduceMotion) { skipAll(); return; }
  setSkip(true);
  if (res.busy) return;
  var r = res;
  var next = function () {
    if (r !== res) return;
    if (!r.queue.length) { r.busy = false; setSkip(false); renderSummary(); return; }
    r.current = reveal(r, r.queue.shift(), function () { r.current = null; timer = setTimeout(next, r.queue.length ? PACE.between : 0); });
  };
  r.busy = true;
  next();
}

// finish the runout on the table and show everything still queued at once
function skipAll() {
  var r = res;
  if (!r) return;
  if (r.current) { r.current.now(); r.current = null; }
  if (timer) { clearTimeout(timer); timer = null; }
  while (r.queue.length) reveal(r, r.queue.shift(), function () {}).now();
  r.busy = false;
  setSkip(false);
  renderSummary();
}
function setSkip(on) { var b = $('skip'); if (b) b.hidden = !on; }

// who leads with the first `seen` board cards out
function standing(r, cards, seen) {
  var sa = E.eval7(r.A.concat(cards), 2 + seen), sb = E.eval7(r.B.concat(cards), 2 + seen);
  return { w: sa > sb ? 'a' : sb > sa ? 'b' : 't', sa: sa, sb: sb };
}

// deal one runout like a hand at the table: cards face down, then flop, turn and river,
// showing who is ahead after each street. Returns { now } to jump straight to the end.
function reveal(r, ro, done) {
  var known = r.board.length, num = r.shown + r.dealing + 1;
  var cards = r.board.concat(ro.cards);
  var cardsHTML = cards.map(function (c, i) {
    return '<span class="mini' + (i < known ? ' known sx-' + SUITS[c & 3] : ' back') + (i === 3 ? ' gap' : '') + '">' + (i < known ? faceHTML(c) : '') + '</span>';
  }).join('');
  var row = document.createElement('div');
  row.className = 'ro';
  row.innerHTML = '<span class="ro-n">#' + num + '</span><div class="ro-cards" aria-label="' + cards.map(cardName).join(', ') + '">' + cardsHTML + '</div>' +
    '<div class="ro-res"><strong></strong><span></span></div>';
  var list = $('roList'), empty = $('roEmpty');
  if (empty) empty.remove();
  list.insertBefore(row, list.firstChild);
  list.scrollTop = 0;
  r.dealing++;

  var minis = row.querySelectorAll('.mini'), status = row.querySelector('.ro-res strong'), detail = row.querySelector('.ro-res span');
  var streets = [[3, 'Flop'], [4, 'Turn'], [5, 'River']].filter(function (st) { return st[0] > known; });
  var flip = function (to) {
    for (var i = known; i < to; i++) {
      if (minis[i].classList.contains('back')) {
        minis[i].className = 'mini flip sx-' + SUITS[cards[i] & 3] + (i === 3 ? ' gap' : '');
        minis[i].innerHTML = faceHTML(cards[i]);
        minis[i].title = cardName(cards[i]);
      }
    }
  };
  var hands = function (s) { detail.innerHTML = '<span class="ha">' + describe(s.sa) + '</span> vs <span class="hb">' + describe(s.sb) + '</span>'; };
  var show = function (seen, label) {
    var s = standing(r, cards, seen);
    row.className = 'ro lead-' + s.w;
    status.textContent = label + ' · ' + (s.w === 'a' ? r.labA + ' ahead' : s.w === 'b' ? r.labB + ' ahead' : 'all even');
    hands(s);
  };
  var finished = false;
  var finish = function () {
    if (finished || r !== res) return;
    finished = true;
    if (timer) { clearTimeout(timer); timer = null; }
    flip(5);
    var w = ro.sa > ro.sb ? 'a' : ro.sb > ro.sa ? 'b' : 't';
    if (w === 'a') r.wa++; else if (w === 'b') r.wb++; else r.ties++;
    r.shown++; r.dealing--;
    row.className = 'ro w-' + w;
    status.textContent = w === 'a' ? r.labA + ' wins' : w === 'b' ? r.labB + ' wins' : 'Chop';
    hands(ro);
    renderSummary();
    done();
  };

  var k = 0;
  var step = function () {
    if (finished || r !== res) return;
    if (k === streets.length) { finish(); return; }
    var st = streets[k++];
    flip(st[0]);
    if (st[1] === 'River') {
      status.textContent = 'River…';
      timer = setTimeout(step, PACE.river);
    } else {
      show(st[0], st[1]);
      timer = setTimeout(step, PACE.street);
    }
  };
  if (known >= 3) show(known, known === 3 ? 'Flop' : 'Turn');
  else status.textContent = 'Dealing…';
  timer = setTimeout(step, PACE.deal);
  return { now: finish };
}
