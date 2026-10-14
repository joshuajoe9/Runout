/* Small DOM and number-formatting helpers shared by every other file. */
'use strict';

var $ = function (id) { return document.getElementById(id); };
var fmt = function (n) { return n.toLocaleString('en-US'); };
var pct = function (x) { return (x * 100).toFixed(2) + '%'; };
