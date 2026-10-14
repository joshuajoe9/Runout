/* Wires up the controls. Nothing is dealt until the user hits Run it out. */
'use strict';

$('results').addEventListener('click', function (e) {
  if (e.target.id === 'skip') skipAll();
});
$('setup').addEventListener('click', function (e) {
  var t = e.target.closest('button');
  if (!t) return;
  if (t.classList.contains('slot')) { state.active = { g: t.dataset.g, i: +t.dataset.i }; render(); }
  else if (t.dataset.c != null) pick(+t.dataset.c);
  else if (t.dataset.rand) { randomHand(t.dataset.rand); render(); }
  else if (t.dataset.clear) {
    var g = t.dataset.clear;
    if (g === 'board') state.board = [null, null, null, null, null];
    else state[g] = [null, null];
    state.active = { g: g, i: 0 };
    render();
  }
  else if (t.dataset.a) applyPreset(t.dataset.a, t.dataset.b);
  else if (t.dataset.runs) { runsInput.value = fmt(+t.dataset.runs); render(); }
  else if (t.id === 'more') dealMore(parseRuns());
  else if (t.id === 'go') start();
});
runsInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') start(); });
runsInput.addEventListener('input', function () { render(); });
runsInput.addEventListener('blur', function () { runsInput.value = fmt(parseRuns()); render(); });

render();
showIdle();
