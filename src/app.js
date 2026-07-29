var KEY = 'sl-' + ZONE;
var CATLAB = { beach: 'Beach', water: 'Water fun', sight: 'Sight', boat: 'Boat trip', daytrip: 'Day trip', food: 'Food & drink', night: 'Nightlife', well: 'Wellness' };
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

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function cards() { return Array.prototype.slice.call(document.querySelectorAll('.card')); }
function mapsUrl(name) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name + ' Ayia Napa'); }
function mediaHtml(c) {
  var name = c.querySelector('.name').textContent;
  var lab = CATLAB[c.getAttribute('data-cat')] || '';
  var img = c.getAttribute('data-img');
  return '<div class="ph"><div class="letter">' + esc(name[0]) + '</div><div class="rule"></div><div class="lab">' + lab + '</div></div>' +
    (img ? '<img src="' + esc(img) + '" alt="' + esc(name) + '" loading="lazy" onerror="this.remove()">' : '') +
    '<span class="tag">' + lab + '</span>' +
    '<span class="flag f-want">Want to</span><span class="flag f-done">✓ Done</span>';
}

cards().forEach(function (c) {
  var media = document.createElement('div');
  media.className = 'media';
  media.innerHTML = mediaHtml(c);
  c.insertBefore(media, c.firstChild);
  if (c.getAttribute('data-ba')) {
    var ba = document.createElement('span');
    ba.className = 'babadge';
    ba.textContent = 'Book ahead';
    c.querySelector('.meta').appendChild(ba);
  }
  var acts = document.createElement('div');
  acts.className = 'acts';
  acts.innerHTML = '<button class="bWant" type="button">Want to</button><button class="bDone" type="button">Mark done</button>';
  c.appendChild(acts);
});

function paint() {
  var done = 0, total = 0;
  cards().forEach(function (c) {
    var id = c.getAttribute('data-id');
    var st = state[id] || '';
    c.classList.toggle('want', st === 'want');
    c.classList.toggle('done', st === 'done');
    var bw = c.querySelector('.bWant'), bd = c.querySelector('.bDone');
    if (bw) bw.textContent = st === 'want' ? 'On the list' : 'Want to';
    if (bd) bd.textContent = st === 'done' ? '✓ Done' : 'Mark done';
    var lockedAway = c.closest('.upanel') && c.closest('.upanel').hidden;
    if (!lockedAway) {
      total++;
      if (st === 'done') done++;
    }
  });
  document.getElementById('nDone').textContent = done;
  document.getElementById('nTotal').textContent = done + ' / ' + total;
  document.getElementById('barFill').style.width = (total ? 100 * done / total : 0) + '%';
}
function toggle(id, st) {
  state[id] = state[id] === st ? '' : st;
  save();
  paint();
  if (state[id]) ev(st, id);
}

var overlay = document.getElementById('overlay');
var modal = document.getElementById('modal');
function openModal(c) {
  var id = c.getAttribute('data-id');
  var extra = c.querySelector('.extra');
  var name = c.querySelector('.name').textContent;
  var web = c.getAttribute('data-web');
  var st = state[id] || '';
  var t = extra.querySelector('.t');
  modal.setAttribute('data-cat', c.getAttribute('data-cat'));
  modal.innerHTML =
    '<button class="close" id="mClose" type="button">Close</button>' +
    '<div class="media">' + mediaHtml(c).replace(/<span class="flag[\s\S]*$/, '') + '</div>' +
    '<div class="minner">' +
    '<span class="m-kick">' + (CATLAB[c.getAttribute('data-cat')] || '') + '</span>' +
    '<div class="m-name">' + esc(name) + '</div>' +
    '<div class="m-blurb">' + c.querySelector('.blurb').innerHTML + '</div>' +
    '<div class="m-sec"><div class="lab">What to expect</div><p>' + extra.querySelector('.d').innerHTML + '</p></div>' +
    (t ? '<div class="m-sec"><div class="lab">Tips</div><p>' + t.innerHTML + '</p></div>' : '') +
    '<div class="m-facts">' +
    '<div class="f"><div class="lab">Price</div><div>' + extra.querySelector('.ptext').innerHTML + '</div></div>' +
    '<div class="f"><div class="lab">Time needed</div><div>' + extra.querySelector('.dur').innerHTML + '</div></div>' +
    '<div class="f"><div class="lab">From your hotel</div><div>' + c.querySelector('.from').innerHTML + '</div></div>' +
    '</div>' +
    '<div class="m-links">' +
    '<a class="btn solid" href="' + mapsUrl(name) + '" target="_blank" rel="noopener">Open in Google Maps</a>' +
    (web ? '<a class="btn line" href="' + esc(web) + '" target="_blank" rel="noopener">Website</a>' : '') +
    '</div>' +
    '<div class="m-acts">' +
    '<button class="btn line' + (st === 'want' ? ' activeWant' : '') + '" data-mact="want">' + (st === 'want' ? 'On the wish list' : 'Want to do this') + '</button>' +
    '<button class="btn line' + (st === 'done' ? ' activeDone' : '') + '" data-mact="done">' + (st === 'done' ? '✓ Done' : 'Mark as done') + '</button>' +
    '</div></div>';
  overlay.classList.add('open');
  document.getElementById('mClose').onclick = closeModal;
  modal.querySelectorAll('[data-mact]').forEach(function (b) {
    b.onclick = function () { toggle(id, b.getAttribute('data-mact')); closeModal(); };
  });
  modal.querySelectorAll('a[target=_blank]').forEach(function (a) {
    a.addEventListener('click', function () { ev('out', id); });
  });
  ev('detail', id);
}
function closeModal() { overlay.classList.remove('open'); }
overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

cards().forEach(function (c) {
  var id = c.getAttribute('data-id');
  c.querySelector('.bWant').addEventListener('click', function (e) { e.stopPropagation(); toggle(id, 'want'); });
  c.querySelector('.bDone').addEventListener('click', function (e) { e.stopPropagation(); toggle(id, 'done'); });
  c.addEventListener('click', function (e) { if (!e.target.closest('button')) openModal(c); });
  c.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === c) openModal(c); });
});

document.querySelectorAll('[data-unlock]').forEach(function (btn) {
  var id = btn.getAttribute('data-unlock');
  var panel = btn.parentElement.querySelector('.upanel');
  function show() { panel.hidden = false; btn.style.display = 'none'; paint(); }
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

paint();
