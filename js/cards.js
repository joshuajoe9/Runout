/* Card vocabulary: parsing, names, face markup, hand labels and hand descriptions.
   Cards are 0..51: rank = c >> 2 (0 = deuce, 12 = ace), suit = c & 3. */
'use strict';

var RANKS = '23456789TJQKA', SUITS = ['s', 'h', 'd', 'c'];
var SYM = { s: '♠', h: '♥', d: '♦', c: '♣' };
var SUIT_NAME = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
var PLURAL = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];
var RANK_NAME = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
var parse = function (s) { return RANKS.indexOf(s[0]) * 4 + SUITS.indexOf(s[1]); };
var cardName = function (c) { return RANK_NAME[c >> 2] + ' of ' + SUIT_NAME[SUITS[c & 3]]; };
var cardText = function (c) { var r = RANKS[c >> 2]; return (r === 'T' ? '10' : r) + SYM[SUITS[c & 3]]; };

function faceHTML(c) {
  var r = RANKS[c >> 2], s = SUITS[c & 3];
  return '<span class="rk">' + (r === 'T' ? '10' : r) + '</span><span class="st">' + SYM[s] + '</span>';
}

function handLabel(h) {
  if (h[0] == null || h[1] == null) return '—';
  var ra = h[0] >> 2, rb = h[1] >> 2;
  var hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (ra === rb) return RANKS[hi] + RANKS[lo];
  return RANKS[hi] + RANKS[lo] + ((h[0] & 3) === (h[1] & 3) ? 's' : 'o');
}

// turn an eval7 score into "Pair of Kings", "Queens full of Fours", ...
function describe(score) {
  var B5 = E.B5, cat = Math.floor(score / B5), k = score % B5;
  switch (cat) {
    case 8: return k === 12 ? 'Royal flush' : RANK_NAME[k] + '-high straight flush';
    case 7: return 'Four ' + PLURAL[Math.floor(k / 13)];
    case 6: return PLURAL[Math.floor(k / 13)] + ' full of ' + PLURAL[k % 13];
    case 5: return RANK_NAME[Math.floor(k / 28561)] + '-high flush';
    case 4: return RANK_NAME[k] + '-high straight';
    case 3: return 'Three ' + PLURAL[Math.floor(k / 169)];
    case 2: return PLURAL[Math.floor(k / 169)] + ' and ' + PLURAL[Math.floor(k / 13) % 13];
    case 1: return 'Pair of ' + PLURAL[Math.floor(k / 2197)];
    default: return RANK_NAME[Math.floor(k / 28561)] + ' high';
  }
}
