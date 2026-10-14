/* Engine: 7-card hand evaluator, random runouts and exact enumeration.
   Kept self-contained (no outside references) because runouts.js stringifies
   engineFactory and workerHandler to build the exact-odds Web Worker. */
'use strict';

function engineFactory() {
  var B5 = 371293; // 13^5
  var rc = new Uint8Array(13), sc = new Uint8Array(4), sm = new Uint16Array(4);
  var h7 = new Int8Array(7);

  function straightHigh(mask) {
    var ext = (mask << 1) | (mask >> 12);
    for (var i = 9; i >= 0; i--) if (((ext >> i) & 31) === 31) return i + 3;
    return -1;
  }

  // cards are 0..51: rank = c >> 2 (0 = deuce, 12 = ace), suit = c & 3
  // scores the best hand in h[0..n-1]; n defaults to 7, and 5 or 6 works for a flop or turn in progress
  function eval7(h, n) {
    rc.fill(0); sc.fill(0); sm.fill(0);
    var mask = 0, i, r, s, len = n || 7;
    for (i = 0; i < len; i++) {
      var x = h[i]; r = x >> 2; s = x & 3;
      rc[r]++; sc[s]++; sm[s] |= (1 << r); mask |= (1 << r);
    }
    for (s = 0; s < 4; s++) {
      if (sc[s] >= 5) {
        var fm = sm[s], sh = straightHigh(fm);
        if (sh >= 0) return 8 * B5 + sh;
        var fk = 0, fn = 0;
        for (r = 12; r >= 0; r--) if ((fm >> r) & 1) { fk = fk * 13 + r; if (++fn === 5) break; }
        return 5 * B5 + fk;
      }
    }
    var q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1;
    for (r = 12; r >= 0; r--) {
      var n = rc[r];
      if (n === 4) q = r;
      else if (n === 3) { if (t1 < 0) t1 = r; else t2 = r; }
      else if (n === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; }
    }
    if (q >= 0) {
      for (r = 12; r >= 0; r--) if (rc[r] > 0 && r !== q) return 7 * B5 + q * 13 + r;
    }
    if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) {
      return 6 * B5 + t1 * 13 + (t2 > p1 ? t2 : p1);
    }
    var st = straightHigh(mask);
    if (st >= 0) return 4 * B5 + st;
    var k = 0, c = 0;
    if (t1 >= 0) {
      for (r = 12; r >= 0; r--) if (rc[r] > 0 && r !== t1) { k = k * 13 + r; if (++c === 2) break; }
      return 3 * B5 + t1 * 169 + k;
    }
    if (p1 >= 0 && p2 >= 0) {
      var kk = 0;
      for (r = 12; r >= 0; r--) if (rc[r] > 0 && r !== p1 && r !== p2) { kk = r; break; }
      return 2 * B5 + p1 * 169 + p2 * 13 + kk;
    }
    if (p1 >= 0) {
      for (r = 12; r >= 0; r--) if (rc[r] > 0 && r !== p1) { k = k * 13 + r; if (++c === 3) break; }
      return B5 + p1 * 2197 + k;
    }
    for (r = 12; r >= 0; r--) if (rc[r] > 0) { k = k * 13 + r; if (++c === 5) break; }
    return k;
  }

  function setup(A, B, board) {
    var used = new Uint8Array(52), i;
    var all = A.concat(B, board);
    for (i = 0; i < all.length; i++) used[all[i]] = 1;
    var deck = [];
    for (i = 0; i < 52; i++) if (!used[i]) deck.push(i);
    var ca = new Int8Array(7), cb = new Int8Array(7);
    ca[0] = A[0]; ca[1] = A[1]; cb[0] = B[0]; cb[1] = B[1];
    for (i = 0; i < board.length; i++) { ca[2 + i] = board[i]; cb[2 + i] = board[i]; }
    return { deck: deck, m: deck.length, need: 5 - board.length, pos: 2 + board.length, ca: ca, cb: cb };
  }

  // deal `count` independent runouts, keeping the cards so each one can be shown
  function deal(A, B, board, count) {
    var S = setup(A, B, board), deck = S.deck, m = S.m, need = S.need, pos = S.pos, ca = S.ca, cb = S.cb;
    var out = [], n, i, j, tmp;
    for (n = 0; n < count; n++) {
      for (i = 0; i < need; i++) {
        j = i + Math.floor(Math.random() * (m - i));
        tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
        ca[pos + i] = deck[i]; cb[pos + i] = deck[i];
      }
      out.push({ cards: Array.prototype.slice.call(deck, 0, need), sa: eval7(ca), sb: eval7(cb) });
    }
    return out;
  }

  function comb(n, k) {
    var r = 1;
    for (var i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }

  function enumerate(A, B, board, progress) {
    var S = setup(A, B, board), deck = S.deck, m = S.m, need = S.need, pos = S.pos, ca = S.ca, cb = S.cb;
    var total = comb(m, need), wa = 0, wb = 0, ties = 0, done = 0;
    function rec(start, depth) {
      if (depth === need) {
        var sa = eval7(ca), sb = eval7(cb);
        if (sa > sb) wa++; else if (sb > sa) wb++; else ties++;
        done++;
        if ((done & 131071) === 0) progress(done / total);
        return;
      }
      var last = m - (need - depth);
      for (var i = start; i <= last; i++) {
        var c = deck[i];
        ca[pos + depth] = c; cb[pos + depth] = c;
        rec(i + 1, depth + 1);
      }
    }
    rec(0, 0);
    return { wa: wa, wb: wb, ties: ties, total: total };
  }

  return { eval7: eval7, deal: deal, enumerate: enumerate, comb: comb, B5: B5 };
}

function workerHandler(E, m, post) {
  var ex = E.enumerate(m.A, m.B, m.board, function (f) { post({ type: 'exactProgress', frac: f }); });
  post({ type: 'exact', result: ex });
}

var E = engineFactory();
