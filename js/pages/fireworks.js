// ── Room & Sync ─────────────────────────────────────
var fwCustomColors = [];
var fwRoomMode = 'solo';   // solo | public | private
var fwRoomId   = 'public'; // current room ID
var fwSocket   = null;
var fwSyncId   = Math.random().toString(36).slice(2)+Date.now().toString(36);
var fwRoomListVisible = false;

function fwToggleSync() {
  fwRoomListVisible = !fwRoomListVisible;
  var panel = document.getElementById('fwRoomPanel');
  if (panel) {
    panel.style.display = fwRoomListVisible ? 'block' : 'none';
  }
}

function fwSetRoom(mode, roomId) {
  fwDisconnectWS();
  fwRoomMode = mode;
  if (mode === 'solo') {
    fwRoomId = '';
  } else if (mode === 'public') {
    fwRoomId = 'public';
  } else if (mode === 'private') {
    fwRoomId = roomId || fwRoomId;
    if (!fwRoomId || fwRoomId === 'public') fwRoomId = genRoomCode();
  }
  fwRoomListVisible = false;
  var panel = document.getElementById('fwRoomPanel');
  if (panel) panel.style.display = 'none';
  updateRoomUI();
  if (fwRoomMode !== 'solo') fwConnectWS();
  toast(fwRoomMode === 'solo' ? '单人模式' : '已加入房间 ' + fwRoomId);
}

function genRoomCode() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function updateRoomUI() {
  var btn = document.getElementById('fwRoomBtn');
  if (!btn) return;
  if (fwRoomMode === 'solo') {
    btn.textContent = '单人';
    btn.className = 'fw-chip';
  } else if (fwRoomMode === 'public') {
    btn.textContent = '公共';
    btn.className = 'fw-chip active';
  } else {
    btn.textContent = fwRoomId;
    btn.className = 'fw-chip active';
  }
}

function fwConnectWS() {
  if (fwSocket && fwSocket.readyState === WebSocket.OPEN) return;
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  var wsUrl = proto + '//' + location.host + '/ws/firework?token=' + TOKEN + '&roomId=' + encodeURIComponent(fwRoomId);
  fwSocket = new WebSocket(wsUrl);
  fwSocket.onopen = function() { console.log('[WS] room=' + fwRoomId); };
  fwSocket.onmessage = function(e) {
    try {
      var d = JSON.parse(e.data);
      if (d.sender === fwSyncId) return;
      var rx = d.fx * (fwW / d.fwW);
      var ry = d.fy * (fwH / d.fwH);
      var rtx = d.tx * (fwW / d.fwW);
      var rty = d.ty * (fwH / d.fwH);
      fwRemoteLaunch(rx, ry, rtx, rty, d.color, d.type);
    } catch(er) {}
  };
  fwSocket.onclose = function() {
    fwSocket = null;
    if (fwRoomMode !== 'solo') {
      setTimeout(function() {
        if (fwRoomMode !== 'solo' && fwActive) fwConnectWS();
      }, 2000);
    }
  };
  fwSocket.onerror = function() {};
}

function fwDisconnectWS() {
  if (fwSocket) { fwSocket.close(); fwSocket = null; }
}

function fwBroadcast(data) {
  if (fwRoomMode !== 'solo' && fwSocket && fwSocket.readyState === WebSocket.OPEN) {
    data.sender = fwSyncId;
    data.fwW = fwW;
    data.fwH = fwH;
    fwSocket.send(JSON.stringify(data));
  }
}

function fwRemoteLaunch(fx, fy, tx, ty, color, type) {
  tx = Math.max(20, Math.min(fwW - 20, tx));
  ty = Math.max(fwH * 0.06, Math.min(fwH * 0.72, ty));
  fwRockets.push({ x: fx, y: fy, tx: tx, ty: ty, vx: (tx - fx) * 0.018, vy: (ty - fy) * 0.018 - 2.5, color: color, trail: [], type: type });
}

function allColors() {
  var list = fwSelectedColors.map(function(i) { return FW_COLORS[i].hex; });
  return list.concat(fwCustomColors);
}

function pickColor() {
  var pool = allColors();
  if (pool.length === 0) return FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)].hex;
  return pool[Math.floor(Math.random() * pool.length)];
}

var paletteOpen = false;

function buildPalette() {
  var el = document.getElementById('colorPalette');
  if (!el) return;
  var total = allColors().length;
  var h = '<button class="palette-toggle" onclick="openPalette()"><span class="toggle-dot"></span> 调色盘 ' + (total > 0 ? '(' + total + ')' : '') + '</button>';
  h += '<div class="palette-body' + (paletteOpen ? ' open' : '') + '" id="paletteBody">';
  h += '<div class="palette-label">预设颜色</div><div class="color-row">';
  FW_COLORS.forEach(function(c, i) {
    var active = fwSelectedColors.indexOf(i) !== -1;
    h += '<div class="color-swatch' + (active ? ' active' : ' inactive') + '" style="background:' + c.hex + '" title="' + c.name + '" onclick="toggleColor(' + i + ')"></div>';
  });
  h += '</div>';
  if (fwCustomColors.length > 0) {
    h += '<div class="palette-label">自定义颜色</div><div class="color-row">';
    fwCustomColors.forEach(function(hex, ci) {
      h += '<div class="color-swatch active custom" style="background:' + hex + '" title="' + hex + '"><span class="remove-x" onclick="event.stopPropagation();removeCustom(' + ci + ')">×</span></div>';
    });
    h += '</div>';
  }
  h += '<div class="palette-picker"><input type="color" id="fwColorPicker" value="#ffffff" onchange="addCustomColor(this.value)"><span>取色器</span></div>';
  h += '<div class="palette-actions">';
  h += '<button onclick="selectAllColors()">全选</button>';
  h += '<button onclick="clearAllColors()">清空</button>';
  h += '</div>';
  h += '<button class="palette-actions" style="margin-top:4px"><button onclick="closePalette()" style="flex:1;padding:4px 0;font-size:10px;border:1px solid rgba(255,255,255,0.12);border-radius:3px;cursor:pointer;background:transparent;color:rgba(255,255,255,0.5);outline:none">收起</button></div>';
  h += '</div>';
  el.innerHTML = h;
}

function openPalette() { paletteOpen = true; buildPalette(); }
function closePalette() { paletteOpen = false; buildPalette(); }

function toggleColor(i) {
  var idx = fwSelectedColors.indexOf(i);
  if (idx === -1) fwSelectedColors.push(i);
  else fwSelectedColors.splice(idx, 1);
  buildPalette();
}

function addCustomColor(hex) {
  if (fwCustomColors.indexOf(hex) === -1) {
    fwCustomColors.push(hex);
    paletteOpen = true;
    buildPalette();
  }
}

function removeCustom(ci) {
  fwCustomColors.splice(ci, 1);
  buildPalette();
}

function selectAllColors() { fwSelectedColors = FW_COLORS.map(function(_, i) { return i; }); buildPalette(); }
function clearAllColors() { fwSelectedColors = []; fwCustomColors = []; buildPalette(); }

function fwStart() {
  fwCanvas = document.getElementById('fwCanvas');
  fwCtx = fwCanvas.getContext('2d');
  var wrap = document.getElementById('fwWrap');
  function resize() {
    fwW = wrap.clientWidth; fwH = wrap.clientHeight;
    fwCanvas.width = fwW; fwCanvas.height = fwH;
  }
  resize();
  window.addEventListener('resize', function() { if (curPage === 'fw-sim') resize(); });
  fwCanvas.addEventListener('click', function(e) {
    if (fwMode === 'auto') return;
    var r = fwCanvas.getBoundingClientRect();
    launch(e.clientX - r.left, fwH, e.clientX - r.left, e.clientY - r.top);
    hideHint();
  });
  fwCanvas.addEventListener('touchstart', function(e) {
    if (fwMode === 'auto') return;
    e.preventDefault();
    var r = fwCanvas.getBoundingClientRect();
    var t = e.touches[0];
    launch(t.clientX - r.left, fwH, t.clientX - r.left, t.clientY - r.top);
    hideHint();
  }, {passive: false});
  buildPalette();
  fwActive = true;
  updateRoomUI();
  if (fwRoomMode !== 'solo') fwConnectWS();
  fwAuto();
  loop();
}

function fwStop() {
  fwActive = false;
  if (fwRafId) cancelAnimationFrame(fwRafId);
  if (fwAutoId) clearInterval(fwAutoId);
  fwRockets.length = 0; fwParticles.length = 0; fwSparkles.length = 0;
  fwDisconnectWS();
}

function hideHint() { var h = document.getElementById('fwHint'); if (h) { h.style.opacity = '0'; setTimeout(function() { if (h) h.textContent = ''; }, 400); } }

function fwSetMode(m) {
  fwMode = m;
  document.querySelectorAll('.fw-chip[data-fwm]').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.querySelector('.fw-chip[data-fwm="' + m + '"]');
  if (btn) btn.classList.add('active');
  fwAuto();
}

function fwAuto() {
  if (fwAutoId) clearInterval(fwAutoId);
  if (fwMode === 'auto' || fwMode === 'both') {
    fwAutoId = setInterval(function() {
      if (!fwActive) return;
      var tx = Math.random() * fwW;
      var ty = fwH * (0.12 + Math.random() * 0.55);
      launch(tx, fwH, tx, ty);
    }, 500 + Math.random() * 1000);
  }
}

function fwClear() { fwRockets.length = 0; fwParticles.length = 0; fwSparkles.length = 0; }

function launch(fx, fy, tx, ty) {
  tx = Math.max(20, Math.min(fwW - 20, tx));
  ty = Math.max(fwH * 0.06, Math.min(fwH * 0.72, ty));
  var clr = pickColor();
  var type = Math.random() < 0.25 ? 'ring' : (Math.random() < 0.5 ? 'willow' : 'sphere');
  fwRockets.push({ x: fx, y: fy, tx: tx, ty: ty, vx: (tx - fx) * 0.018, vy: (ty - fy) * 0.018 - 2.5, color: clr, trail: [], type: type });
  // broadcast to others
  fwBroadcast({ fx: fx, fy: fy, tx: tx, ty: ty, color: clr, type: type });
}

function loop() {
  if (!fwActive) return;
  fwRafId = requestAnimationFrame(loop);
  fwCtx.fillStyle = 'rgba(5,7,18,0.3)';
  fwCtx.fillRect(0, 0, fwW, fwH);

  for (var i = fwRockets.length - 1; i >= 0; i--) {
    var r = fwRockets[i];
    r.x += r.vx; r.y += r.vy; r.vy += 0.045;
    r.trail.push({ x: r.x, y: r.y, a: 1 });
    if (r.trail.length > 18) r.trail.shift();
    for (var j = 0; j < r.trail.length; j++) r.trail[j].a *= 0.88;
    if (r.trail.length > 2) {
      fwCtx.beginPath(); fwCtx.moveTo(r.trail[0].x, r.trail[0].y);
      for (var k = 1; k < r.trail.length; k++) fwCtx.lineTo(r.trail[k].x, r.trail[k].y);
      fwCtx.strokeStyle = 'rgba(255,210,100,0.35)'; fwCtx.lineWidth = 1.8; fwCtx.stroke();
    }
    fwCtx.beginPath(); fwCtx.arc(r.x, r.y, 3.2, 0, Math.PI*2); fwCtx.fillStyle = '#fff'; fwCtx.fill();
    fwCtx.beginPath(); fwCtx.arc(r.x, r.y, 5.5, 0, Math.PI*2); fwCtx.fillStyle = r.color; fwCtx.fill();
    if (r.y <= r.ty || (r.vy > 0 && r.y >= r.ty)) { burst(r); fwRockets.splice(i, 1); }
  }

  for (var i = fwParticles.length - 1; i >= 0; i--) {
    var p = fwParticles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.055; p.vx *= 0.994; p.vy *= 0.994;
    p.life -= p.decay;
    if (p.life <= 0) {
      if (Math.random() < 0.35) for (var j = 0; j < 3; j++) fwSparkles.push({ x: p.x, y: p.y, vx: (Math.random()-0.5)*1.8, vy: (Math.random()-0.5)*1.8, life: 0.6, decay: 0.07+Math.random()*0.1, size: 1+Math.random() });
      fwParticles.splice(i, 1); continue;
    }
    var a = p.life;
    fwCtx.beginPath(); fwCtx.arc(p.x, p.y, p.size*3, 0, Math.PI*2); fwCtx.fillStyle = rgba(p.color, a*0.12); fwCtx.fill();
    fwCtx.beginPath(); fwCtx.arc(p.x, p.y, p.size, 0, Math.PI*2); fwCtx.fillStyle = rgba(p.color, a); fwCtx.fill();
  }

  for (var i = fwSparkles.length - 1; i >= 0; i--) {
    var s = fwSparkles[i];
    s.x += s.vx; s.y += s.vy; s.life -= s.decay;
    if (s.life <= 0) { fwSparkles.splice(i, 1); continue; }
    fwCtx.beginPath(); fwCtx.arc(s.x, s.y, s.size, 0, Math.PI*2);
    fwCtx.fillStyle = 'rgba(255,255,255,' + s.life + ')'; fwCtx.fill();
  }
}

function burst(r) {
  if (r.type === 'ring') {
    var cnt = 45;
    for (var i = 0; i < cnt; i++) {
      var a = (Math.PI*2/cnt)*i;
      fwParticles.push({ x: r.x, y: r.y, vx: Math.cos(a)*(3.5+Math.random()*4), vy: Math.sin(a)*(3.5+Math.random()*4), life: 1, decay: 0.01+Math.random()*0.014, size: 2+Math.random()*2, color: r.color });
    }
  } else if (r.type === 'willow') {
    for (var i = 0; i < 70; i++) {
      var a = Math.random()*Math.PI*2, s = 2.5 + Math.random() * 5;
      fwParticles.push({ x: r.x, y: r.y, vx: Math.cos(a)*s, vy: Math.sin(a)*s*0.6 - 1.5, life: 1, decay: 0.012+Math.random()*0.02, size: 1.5+Math.random()*2, color: r.color });
    }
  } else {
    for (var i = 0; i < 60; i++) {
      var a = Math.random()*Math.PI*2, phi = Math.acos(2*Math.random()-1), s = 2 + Math.random() * 5;
      fwParticles.push({ x: r.x, y: r.y, vx: Math.cos(a)*Math.sin(phi)*s, vy: Math.sin(a)*Math.sin(phi)*s*0.7 - 1, life: 1, decay: 0.01+Math.random()*0.016, size: 1.5+Math.random()*2.5, color: r.color });
    }
  }
  for (var i = 0; i < 15; i++) {
    var a = Math.random()*Math.PI*2;
    fwSparkles.push({ x: r.x, y: r.y, vx: Math.cos(a)*(1+Math.random()*3), vy: Math.sin(a)*(1+Math.random()*3), life: 0.7, decay: 0.04+Math.random()*0.06, size: 1.5+Math.random()*2 });
  }
}

function rgba(hex, a) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+Math.max(0,Math.min(1,a))+')';
}

console.log('BFireworks v3 — Gitee-inspired clean design');

/* ===================================================================
   SUBTLE LOGIN BACKGROUND — SLOW BLOOM
   =================================================================== */
(function() {
  var canvas = document.getElementById('loginFwCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, rockets = [], particles = [], sparkles = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  function ln() {
    var tx = Math.random() * W, ty = H * (0.1 + Math.random() * 0.45);
    var clr = FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)].hex;
    rockets.push({ x: tx, y: H + 20, tx: tx, ty: ty, vy: -(1.5 + Math.random() * 3), color: clr });
  }
  function step() {
    ctx.clearRect(0, 0, W, H);
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i]; r.y += r.vy; r.vy += 0.014;
      // Glowing dot
      var grd = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 4);
      grd.addColorStop(0, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(r.x, r.y, 4, 0, Math.PI*2); ctx.fillStyle = grd; ctx.fill();
      if (r.y <= r.ty) {
        var petals = 6 + Math.floor(Math.random() * 8);
        for (var j = 0; j < petals; j++) {
          var ba = (Math.PI*2/petals)*j + Math.random()*0.3;
          particles.push({ x: r.x, y: r.y, cx: r.x, cy: r.y, angle: ba, radius: 0, speed: 0.25+Math.random()*1, life: 1, decay: 0.002+Math.random()*0.004, size: 1+Math.random()*2, color: r.color, swirl: (Math.random()-0.5)*0.012 });
        }
        for (var j = 0; j < 10; j++) { var a = Math.random()*Math.PI*2; sparkles.push({ x: r.x, y: r.y, vx: Math.cos(a)*0.4, vy: Math.sin(a)*0.4, life: 0.7, decay: 0.015+Math.random()*0.025, size: 0.6+Math.random()*1 }); }
        rockets.splice(i, 1);
      }
    }
    for (var i = particles.length-1; i >= 0; i--) {
      var p = particles[i]; p.radius += p.speed; p.angle += p.swirl;
      p.x = p.cx + Math.cos(p.angle)*p.radius; p.y = p.cy + Math.sin(p.angle)*p.radius*0.65;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i,1); continue; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = rgba(p.color, p.life*0.5); ctx.fill();
      // Small glow
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size*2.5, 0, Math.PI*2);
      ctx.fillStyle = rgba(p.color, p.life*0.1); ctx.fill();
    }
    for (var i = sparkles.length-1; i >= 0; i--) { var s = sparkles[i]; s.x += s.vx; s.y += s.vy; s.life -= s.decay; if (s.life <= 0) { sparkles.splice(i,1); continue; } ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,'+(s.life*0.5)+')'; ctx.fill(); }
    requestAnimationFrame(step);
  }
  setInterval(ln, 1800 + Math.random() * 2200);
  step();
})();

/* ===================================================================
   LOGIN MOUSE TRAIL
   =================================================================== */
(function() {
  var canvas = document.getElementById('mouseTrail');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, mx = -100, my = -100, pfx = -100, pfy = -100, trail = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);

  document.addEventListener('mousemove', function(e) { mx = e.clientX; my = e.clientY; });
  document.addEventListener('mouseleave', function() { mx = -100; my = -100; });

  function tick() {
    ctx.clearRect(0, 0, W, H);
    // Emit trail particles when mouse moves
    if (mx > 0 && my > 0 && (Math.abs(mx-pfx) > 3 || Math.abs(my-pfy) > 3)) {
      for (var i = 0; i < 1; i++) {
        trail.push({ x: mx+(Math.random()-0.5)*3, y: my+(Math.random()-0.5)*3, life: 0.6, size: 0.5+Math.random()*1 });
      }
      pfx = mx; pfy = my;
    }
    for (var i = trail.length-1; i >= 0; i--) {
      var t = trail[i]; t.life -= 0.015;
      if (t.life <= 0) { trail.splice(i,1); continue; }
      var g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.size*2);
      g.addColorStop(0, 'rgba(255,255,255,'+(t.life*0.35)+')');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(t.x, t.y, t.size*2, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();