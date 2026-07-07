/* ===================================================================
   BFireworks v3 — clean corporate style + color palette
   =================================================================== */
var API = 'http://localhost:8800';
var TOKEN = sessionStorage.getItem('fw_token') || '';

function api(method, path, body) {
  var opts = { method: method, headers: {} };
  if (TOKEN) opts.headers['Authorization'] = 'Bearer ' + TOKEN;
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  return fetch(API + path, opts).then(function(r) {
    return r.json().then(function(data) { if (!r.ok) throw new Error(data.detail || '请求失败'); return data; });
  });
}

function toast(msg, type) {
  var el = document.createElement('div');
  el.className = 'toast toast-' + (type === 'err' ? 'err' : 'ok');
  el.textContent = msg;
  document.getElementById('toastCtn').appendChild(el);
  setTimeout(function() { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(function() { el.remove(); }, 300); }, 2200);
}

function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function icon(id, size) {
  var s = size || 16;
  return '<svg style="width:' + s + 'px;height:' + s + 'px;display:inline-block;vertical-align:middle;flex-shrink:0" viewBox="0 0 24 24"><use href="#' + id + '"/></svg>';
}