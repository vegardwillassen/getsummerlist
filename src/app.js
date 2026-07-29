var KEY = 'sl-' + ZONE;
var state = {};
try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
function ev(name, id) {
  try {
    var payload = JSON.stringify({ z: ZONE, e: name, id: id || null, t: new Date().toISOString() });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/e', payload);
  } catch (e) {}
}
ev('open');

document.querySelectorAll('[data-want]').forEach(function (btn) {
  var id = btn.getAttribute('data-want');
  if (state['want-' + id]) { btn.classList.add('on'); btn.textContent = 'On the list'; }
  btn.addEventListener('click', function () {
    var on = !state['want-' + id];
    state['want-' + id] = on;
    btn.classList.toggle('on', on);
    btn.textContent = on ? 'On the list' : 'Want to do this';
    save();
    if (on) ev('want', id);
  });
});

document.querySelectorAll('[data-unlock]').forEach(function (btn) {
  var id = btn.getAttribute('data-unlock');
  var panel = btn.parentElement.querySelector('.upanel');
  function show() { panel.hidden = false; btn.style.display = 'none'; }
  if (state['unlock-' + id]) show();
  btn.addEventListener('click', function () {
    state['unlock-' + id] = true;
    save();
    show();
    ev('unlock', id);
  });
});

document.getElementById('printBtn').addEventListener('click', function () {
  ev('print');
  window.print();
});

document.querySelectorAll('.links a').forEach(function (a) {
  a.addEventListener('click', function () { ev('out', a.closest('.e').getAttribute('data-id')); });
});

document.querySelectorAll('details').forEach(function (d) {
  d.addEventListener('toggle', function () {
    if (d.open) ev('detail', d.closest('.e').getAttribute('data-id'));
  });
});
