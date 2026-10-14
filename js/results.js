/* Results summary: your runouts vs exact odds, table and verdict. */
'use strict';

// central 95% range for the number of wins in n tries at probability p
function binomRange(n, p) {
  if (p <= 0) return [0, 0];
  if (p >= 1) return [n, n];
  var pmf = Math.pow(1 - p, n), cdf = 0, lo = null, hi = n, k;
  for (k = 0; k <= n; k++) {
    cdf += pmf;
    if (lo == null && cdf >= 0.025) lo = k;
    if (cdf >= 0.975) { hi = k; break; }
    pmf *= (n - k) / (k + 1) * p / (1 - p);
  }
  return [lo, hi];
}

function barHTML(wa, t, wb, total, label) {
  var seg = function (cls, n) {
    var f = total ? n / total : 0;
    return '<div class="seg ' + cls + '" style="width:' + (f * 100).toFixed(3) + '%">' + (f >= 0.09 ? (f * 100).toFixed(1) + '%' : '') + '</div>';
  };
  return '<div class="bar" role="img" aria-label="' + label + '">' + seg('a', wa) + seg('t', t) + seg('b', wb) + '</div>';
}
function progHTML(frac, text) {
  return '<div class="prog"><i style="width:' + Math.round(frac * 100) + '%"></i><span>' + text + ' ' + Math.round(frac * 100) + '%</span></div>';
}

function renderSummary() {
  var r = res, el = $('summary');
  if (!r || !el) return;
  var x = r.exact, n = r.shown;
  var myEq = n ? (r.wa + r.ties / 2) / n : null;
  var exEq = x ? (x.wa + x.ties / 2) / x.total : null;
  var html = '<div class="sec-head"><h2>Results</h2></div>';
  html += '<div class="matchup"><span class="pill a">' + r.labA + '</span><span class="vs">vs</span><span class="pill b">' + r.labB + '</span><span class="boardtxt">' + r.boardText + '</span></div>';

  html += '<div class="brow"><div class="brow-head"><span>Your runouts</span><strong>' + fmt(n) + (n === 1 ? ' runout' : ' runouts') + '</strong></div>';
  html += barHTML(r.wa, r.ties, r.wb, n, 'Your runouts') + '</div>';
  html += '<div class="brow"><div class="brow-head"><span>Exact odds</span><strong>' + fmt(r.totalBoards) + (r.totalBoards === 1 ? ' board' : ' boards') + '</strong></div>';
  html += x ? barHTML(x.wa, x.ties, x.wb, x.total, 'Exact odds') : progHTML(r.exactProg, 'Counting every board');
  html += '</div>';

  var dash = '<span style="color:var(--ink-2)">—</span>';
  var cnt = function (c, of) { return of ? fmt(c) + '<small>' + pct(c / of) + '</small>' : dash; };
  var exp = function (f) { return f == null ? dash : (f * n).toFixed(1) + '<small>' + pct(f) + '</small>'; };
  var rowsDef = [['a', r.labA + ' wins', 'wa'], ['t', 'Chop', 'ties'], ['b', r.labB + ' wins', 'wb']];
  html += '<div class="tw"><table><thead><tr><th></th><th>Happened</th><th>Expected</th></tr></thead><tbody>';
  rowsDef.forEach(function (d) {
    html += '<tr><td><i class="dot ' + d[0] + '"></i>' + d[1] + '</td><td>' + cnt(r[d[2]], n) + '</td><td>' + exp(x ? x[d[2]] / x.total : null) + '</td></tr>';
  });
  html += '<tr class="eq"><td><i class="dot a"></i>' + r.labA + ' equity<small>win + half of chops</small></td><td>' + (myEq == null ? dash : pct(myEq)) +
    '</td><td>' + (exEq == null ? dash : pct(exEq)) + '</td></tr>';
  html += '</tbody></table></div>';

  if (x && n && !r.queue.length && !r.dealing) {
    if (x.total === 1) {
      html += '<p class="verdict">The board is complete, so every runout is the same hand.</p>';
    } else {
      var pa = x.wa / x.total, rg = binomRange(n, pa);
      var span = rg[0] === rg[1] ? 'exactly ' + rg[0] : 'anywhere from ' + rg[0] + ' to ' + rg[1];
      html += '<p class="verdict">Over ' + fmt(n) + (n === 1 ? ' runout' : ' runouts') + ', ' + r.labA + ' should win about <strong>' + (pa * n).toFixed(1) + '</strong> on average. It won <strong>' + r.wa + '</strong>. ' +
        'At this sample size, ' + span + ' wins is normal (95% of the time)' +
        (r.wa < rg[0] || r.wa > rg[1] ? ', so this was an unusually ' + (r.wa < rg[0] ? 'cold' : 'hot') + ' streak.' : '.') + '</p>';
    }
  }
  el.innerHTML = html;
}
