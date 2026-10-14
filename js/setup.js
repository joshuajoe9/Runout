/* Matchup panel: the two hands, the board, the card picker and the runout count. */
'use strict';

var STREET = ['Flop', 'Flop', 'Flop', 'Turn', 'River'];
var SLOTS = [['A', 0], ['A', 1], ['B', 0], ['B', 1]]; // fill order for hand cards

var state = {
  A: [parse('As'), parse('Ks')],
  B: [parse('Qh'), parse('Qd')],
  board: [null, null, null, null, null],
  active: null
};
var arr = function (g) { return g === 'board' ? state.board : state[g]; };

function findCard(c) {
  var g, i, a;
  for (g of ['A', 'B', 'board']) { a = arr(g); for (i = 0; i < a.length; i++) if (a[i] === c) return { g: g, i: i }; }
  return null;
}
function nextActive(g) {
  var i;
  if (g === 'board') { i = state.board.indexOf(null); return i < 0 ? null : { g: 'board', i: i }; }
  for (var k = 0; k < SLOTS.length; k++) if (state[SLOTS[k][0]][SLOTS[k][1]] == null) return { g: SLOTS[k][0], i: SLOTS[k][1] };
  return null;
}
function boardCards() { return state.board.filter(function (x) { return x != null; }); }
function validate() {
  if (state.A.indexOf(null) >= 0 || state.B.indexOf(null) >= 0) return 'Pick two cards for each hand.';
  var n = boardCards().length;
  if (n === 1 || n === 2) return 'The board needs 3, 4 or 5 cards, or none for a preflop matchup.';
  return '';
}

function slotHTML(g, i) {
  var c = arr(g)[i];
  var act = state.active && state.active.g === g && state.active.i === i;
  var where = g === 'board' ? 'Board ' + STREET[i].toLowerCase() : 'Hand ' + g + ' card ' + (i + 1);
  var cls = 'slot' + (c != null ? ' filled sx-' + SUITS[c & 3] : '') + (act ? ' active' : '');
  var btn = '<button class="' + cls + '" data-g="' + g + '" data-i="' + i + '" aria-label="' + where + ': ' + (c == null ? 'empty' : cardName(c)) + '">' +
    (c == null ? '+' : faceHTML(c)) + '</button>';
  if (g !== 'board') return btn;
  return '<div class="bslot' + (i === 3 ? ' gap' : '') + '">' + btn + '<span>' + STREET[i] + '</span></div>';
}
function pickerHTML() {
  var out = '';
  SUITS.forEach(function (s, si) {
    out += '<div class="prow">';
    for (var r = 12; r >= 0; r--) {
      var c = r * 4 + si, at = findCard(c);
      out += '<button class="pc sx-' + s + (at ? ' used u-' + at.g : '') + '" data-c="' + c + '" aria-pressed="' + (at ? 'true' : 'false') + '" aria-label="' + cardName(c) + '">' + faceHTML(c) + '</button>';
    }
    out += '</div>';
  });
  return out;
}

var runsInput = $('runs');
function parseRuns() {
  var n = parseInt(String(runsInput.value).replace(/[^\d]/g, ''), 10);
  if (!isFinite(n) || n < 1) n = 5;
  return Math.min(n, 100);
}

function render() {
  $('slotsA').innerHTML = slotHTML('A', 0) + slotHTML('A', 1);
  $('slotsB').innerHTML = slotHTML('B', 0) + slotHTML('B', 1);
  $('slotsBoard').innerHTML = [0, 1, 2, 3, 4].map(function (i) { return slotHTML('board', i); }).join('');
  $('labA').textContent = handLabel(state.A);
  $('labB').textContent = handLabel(state.B);
  $('picker').innerHTML = pickerHTML();
  var err = validate();
  $('msg').textContent = err;
  $('go').disabled = !!err;
  var cur = parseRuns();
  $('more').textContent = 'Deal ' + cur + ' more';
  $('more').disabled = !!err;
  Array.prototype.forEach.call($('quick').children, function (b) {
    b.setAttribute('aria-pressed', String(+b.dataset.runs === cur));
  });
}

function pick(c) {
  var at = findCard(c);
  if (at) { arr(at.g)[at.i] = null; state.active = { g: at.g, i: at.i }; render(); return; }
  var t = state.active || nextActive('A') || nextActive('board');
  if (!t) return;
  arr(t.g)[t.i] = c;
  state.active = nextActive(t.g);
  render();
}

function applyPreset(a, b) {
  state.A = [parse(a.slice(0, 2)), parse(a.slice(2))];
  state.B = [parse(b.slice(0, 2)), parse(b.slice(2))];
  state.board = [null, null, null, null, null];
  state.active = null;
  render();
}
