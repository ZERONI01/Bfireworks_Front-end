// ── 跳一跳 ─────────────────────────────────────────────────
// 后端接口：GET/POST/PUT/DELETE /api/jump
var jCanvas, jCtx, jW = 0, jH = 0, jDpr = 1;
var jRunning = false, jRaf = null, jLastTs = 0;
var jState = 'idle';            // idle | ready | charging | jumping | falling | over
var jBoxes = [];                // {x, y, r, h, color, deco}  顶面中心世界坐标
var jCur = 0;                   // 玩家所站盒子的下标
var jPlayer = { x: 0, y: 0, z: 0, sx: 1, sy: 1, alpha: 1, fx: 1 };
var jCharge = 0, jScore = 0, jBest = 0, jFinalScore = 0, jSaved = false,jPerTime = 0;
var jCam = { x: 0, y: 0 }, jCamT = { x: 0, y: 0 };
var jJump = null, jFall = null;
var jParts = [], jFloats = [], jClouds = [];
var J_DIRS = [{ x: 0.922, y: 0.387 }, { x: 0.922, y: -0.387 }]; // 两条等距斜轴
var J_COLORS = ['#8fa8d0', '#a3c4a0', '#d0a3a3', '#cbb26a', '#7fb3b3', '#b39ddb', '#90a4ae', '#e0a899', '#86c5da', '#a8b6e0'];
var J_MAX_DIST = 250, J_MIN_DIST = 34, J_CHARGE_MS = 1500;

// ── 音效 ───────────────────────────────────────────────────
var jAudio = null;
var jChargeLast = 0;
function jInitAudio() { if (!jAudio) try { jAudio = new (window.AudioContext||window.webkitAudioContext)(); } catch(e) {} }
function jBeep(f, type, vol, dur, delay) {
  if (!jAudio) return;
  var t = jAudio.currentTime + (delay||0);
  var o = jAudio.createOscillator(); var g = jAudio.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  o.connect(g); g.connect(jAudio.destination); o.start(t); o.stop(t+dur);
}
function jNoise(vol, dur, delay) {
  if (!jAudio) return;
  var t = jAudio.currentTime + (delay||0);
  var buf = jAudio.createBuffer(1, jAudio.sampleRate*dur, jAudio.sampleRate);
  var d = buf.getChannelData(0); for (var i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  var s = jAudio.createBufferSource(); s.buffer = buf;
  var g = jAudio.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
  var f = jAudio.createBiquadFilter(); f.type='lowpass'; f.frequency.value=600;
  s.connect(f); f.connect(g); g.connect(jAudio.destination); s.start(t); s.stop(t+dur);
}

// ── 页面结构 ───────────────────────────────────────────────
function pageJump() {
  var html =
    '<div class="jump-layout">' +
      '<div class="jump-stage">' +
        '<div class="jump-wrap" id="jumpWrap">' +
          '<canvas id="jumpCanvas"></canvas>' +
          '<div class="jump-hud">' +
            '<div class="jump-score-num" id="jumpScore">0</div>' +
            '<div class="jump-score-lbl">当前得分</div>' +
          '</div>' +
          '<div class="jump-topright">' +
            '<span class="jump-best" id="jumpBest">最高 0</span>' +
            '<button class="jump-mini-btn" title="重新开始" onclick="jumpRestart()">↻</button>' +
          '</div>' +
          '<div class="jump-hint" id="jumpHint">按住画面蓄力，松开起跳</div>' +
          '<div class="jump-power" id="jumpPower" style="display:none"><div class="jump-power-fill" id="jumpPowerFill"></div></div>' +
          '<div class="jump-over" id="jumpOver" style="display:none">' +
            '<div class="jump-over-box">' +
              '<div class="jo-title">游戏结束</div>' +
              '<div class="jo-score" id="joScore">0</div>' +
              '<div class="jo-best" id="joBest"></div>' +
              '<input class="jo-input" id="jumpName" placeholder="输入名字保存成绩" maxlength="12">' +
              '<div class="jo-btns">' +
                '<button class="btn btn-primary" id="jumpSaveBtn" onclick="jumpSaveScore()">保存成绩</button>' +
                '<button class="btn" onclick="jumpRestart()">再来一局</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="jump-side">' +
        '<div class="card jump-rank-card">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<h3 style="margin:0">' + icon('i-trophy', 14) + ' 排行榜</h3>' +
            '<button class="btn-sm" onclick="jumpLoadRank()">刷新</button>' +
          '</div>' +
          '<div id="jumpRankList"><div style="text-align:center;color:var(--text-muted);padding:18px 0;font-size:12px">加载中...</div></div>' +
        '</div>' +
        '<div class="card">' +
          '<h3>玩法说明</h3>' +
          '<p>按住画面开始蓄力，松开跳向下一个盒子。<br>落在盒子上 <strong>+1</strong> 分，正好落在盒心 <strong>+2</strong> 分。<br>也支持按住 <strong>空格键</strong> 操作。</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  return html;
}

// ── 生命周期 ───────────────────────────────────────────────
function jumpStart() {
  jCanvas = document.getElementById('jumpCanvas');
  if (!jCanvas) return;
  jCtx = jCanvas.getContext('2d');
  jBest = parseInt(localStorage.getItem('jump_best_' + (me ? me.username : '')) || '0', 10) || 0;
  jResize();
  jumpReset();
  jBindInput();
  window.addEventListener('resize', jResize);
  jumpLoadRank();
  jRunning = true;
  jLastTs = 0;
  jRaf = requestAnimationFrame(jLoop);
}

function jumpStop() {
  jRunning = false;
  if (jRaf) { cancelAnimationFrame(jRaf); jRaf = null; }
  window.removeEventListener('resize', jResize);
  jUnbindInput();
}

function jumpRestart() {
  var ov = document.getElementById('jumpOver');
  if (ov) ov.style.display = 'none';
  jumpReset();
}

function jumpReset() {
  jBoxes = []; jParts = []; jFloats = [];
  jScore = 0; jCharge = 0; jCur = 0; jSaved = false;jPerTime = 0;
  jJump = null; jFall = null;
  var first = { x: 0, y: 0, r: 36, h: 26, color: J_COLORS[0], deco: false };
  jBoxes.push(first);
  jGenBox();
  jPlayer.x = first.x; jPlayer.y = first.y; jPlayer.z = 0;
  jPlayer.sx = 1; jPlayer.sy = 1; jPlayer.alpha = 1; jPlayer.fx = 1;
  jState = 'ready';
  jUpdateCamTarget(true);
  jSyncHud();
  var hint = document.getElementById('jumpHint');
  if (hint) hint.style.opacity = '1';
}

function jResize() {
  var wrap = document.getElementById('jumpWrap');
  if (!wrap || !jCanvas) return;
  var r = wrap.getBoundingClientRect();
  jDpr = window.devicePixelRatio || 1;
  jW = r.width; jH = r.height;
  jCanvas.width = Math.round(jW * jDpr);
  jCanvas.height = Math.round(jH * jDpr);
  jCanvas.style.width = jW + 'px';
  jCanvas.style.height = jH + 'px';
  jCtx.setTransform(jDpr, 0, 0, jDpr, 0, 0);
  if (!jClouds.length) {
    for (var i = 0; i < 5; i++) {
      jClouds.push({ x: Math.random() * jW, y: 30 + Math.random() * jH * 0.4, s: 0.6 + Math.random() * 0.9, v: 4 + Math.random() * 7 });
    }
  }
}

// ── 盒子生成 ───────────────────────────────────────────────
function jGenBox() {
  var prev = jBoxes[jBoxes.length - 1];
  var dir = J_DIRS[Math.random() < 0.5 ? 0 : 1];
  var dist = 110 + Math.random() * 115;
  var r = 24 + Math.random() * 12;
  jBoxes.push({
    x: prev.x + dir.x * dist,
    y: prev.y + dir.y * dist,
    r: r,
    h: 20 + Math.random() * 10,
    color: J_COLORS[Math.floor(Math.random() * J_COLORS.length)],
    deco: Math.random() < 0.25
  });
}

// ── 输入 ───────────────────────────────────────────────────
function jBindInput() {
  jCanvas.addEventListener('mousedown', jPressStart);
  window.addEventListener('mouseup', jPressEnd);
  jCanvas.addEventListener('touchstart', jPressStart, { passive: false });
  jCanvas.addEventListener('touchend', jPressEnd);
  jCanvas.addEventListener('touchcancel', jPressEnd);
  window.addEventListener('keydown', jKeyDown);
  window.addEventListener('keyup', jKeyUp);
}
function jUnbindInput() {
  if (jCanvas) jCanvas.removeEventListener('mousedown', jPressStart);
  window.removeEventListener('mouseup', jPressEnd);
  if (jCanvas) {
    jCanvas.removeEventListener('touchstart', jPressStart);
    jCanvas.removeEventListener('touchend', jPressEnd);
    jCanvas.removeEventListener('touchcancel', jPressEnd);
  }
  window.removeEventListener('keydown', jKeyDown);
  window.removeEventListener('keyup', jKeyUp);
}
function jKeyDown(e) {
  if (e.code !== 'Space' || e.repeat) return;
  if (curPage !== 'jump') return;
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
  e.preventDefault();
  jPressStart();
}
function jKeyUp(e) {
  if (e.code !== 'Space' || curPage !== 'jump') return;
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
  jPressEnd();
}
function jPressStart(e) {
  if (e && e.cancelable) e.preventDefault();
  if (jState !== 'ready') return;
  jInitAudio();
  jState = 'charging';
  jCharge = 0; jChargeLast = 0;
  var p = document.getElementById('jumpPower');
  if (p) p.style.display = 'block';
  var hint = document.getElementById('jumpHint');
  if (hint) hint.style.opacity = '0';
  jBeep(160, 'sine', 0.08, 0.12);
}
function jPressEnd() {
  if (jState !== 'charging') return;
  var p = document.getElementById('jumpPower');
  if (p) p.style.display = 'none';
  jDoJump();
}

// ── 跳跃 ───────────────────────────────────────────────────
function jDoJump() {
  var next = jBoxes[jCur + 1];
  var dx = next.x - jPlayer.x, dy = next.y - jPlayer.y;
  var len = Math.sqrt(dx * dx + dy * dy) || 1;
  var dist = J_MIN_DIST + jCharge * J_MAX_DIST;
  jPlayer.fx = dx >= 0 ? 1 : -1;
  jJump = {
    sx: jPlayer.x, sy: jPlayer.y,
    dx: dx / len * dist, dy: dy / len * dist,
    t: 0, dur: 380 + dist * 1.5,
    h: 52 + dist * 0.38
  };
  jState = 'jumping';
  jBeep(220, 'triangle', 0.1, 0.18);
  jBeep(330, 'sine', 0.06, 0.12, 0.04);
}

function jLand() {
  var px = jPlayer.x, py = jPlayer.y;
  var next = jBoxes[jCur + 1];
  var cur = jBoxes[jCur];
  var mNext = jDiamond(px, py, next);
  if (mNext <= 1) {
    // 成功落上下一个盒子
    var perfect = mNext <= 0.36;
    jScore += perfect ? 2 : 1;
    if (perfect) { jScore += Math.pow(2, jPerTime); jPerTime++; }
    else jPerTime = 0;
    jCur++;
    jPlayer.x = px; jPlayer.y = py;
    jDust(px, py, perfect ? 14 : 8, next.color);
    jFloats.push({ x: px, y: py - 46, t: 0, text: perfect ? '+2 完美!' : '+1', color: perfect ? '#e8a020' : '#2b3a55' });
    if (perfect) { jRing(px, py); jBeep(660,'sine',0.14,0.22); jBeep(880,'sine',0.1,0.2,0.06); jBeep(1100,'sine',0.07,0.14,0.12); }
    else { jNoise(0.06,0.1); jBeep(280,'triangle',0.08,0.12); }
    if (jBoxes.length - jCur < 4) jGenBox();
    jUpdateCamTarget(false);
    jState = 'ready';
    jSyncHud();
    return;
  }
  if (jDiamond(px, py, cur) <= 1) {
    // 原地小跳，不加分
    jDust(px, py, 4, cur.color);
    jState = 'ready';
    return;
  }
  // 掉落
  jState = 'falling';
  jFall = { t: 0 };
  jBeep(200,'sawtooth',0.07,0.35);
  jBeep(80,'sine',0.1,0.5,0.1);
}

function jDiamond(px, py, b) {
  var rx = b.r, ry = b.r * 0.5;
  return Math.abs(px - b.x) / rx + Math.abs(py - b.y) / ry;
}

function jGameOver() {
  jState = 'over';
  jFinalScore = jScore;
  var isRecord = jScore > jBest;
  if (isRecord) {
    jBest = jScore;
    localStorage.setItem('jump_best_' + (me ? me.username : ''), String(jBest));
  }
  jSyncHud();
  var ov = document.getElementById('jumpOver');
  if (!ov) return;
  document.getElementById('joScore').textContent = jScore;
  document.getElementById('joBest').innerHTML = isRecord && jScore > 0
    ? '<span class="jo-record">新纪录！</span> 历史最高 ' + jBest
    : '历史最高 ' + jBest;
  var nameEl = document.getElementById('jumpName');
  nameEl.value = localStorage.getItem('jump_name') || (me ? me.username : '');
  var btn = document.getElementById('jumpSaveBtn');
  btn.disabled = false;
  btn.textContent = '保存成绩';
  ov.style.display = 'flex';
  jBeep(440,'square',0.06,0.15);
  jBeep(330,'square',0.06,0.15,0.18);
  jBeep(220,'square',0.08,0.3,0.36);
}

// ── 相机 / HUD ─────────────────────────────────────────────
function jUpdateCamTarget(snap) {
  var next = jBoxes[jCur + 1];
  var midX = (jPlayer.x + next.x) / 2, midY = (jPlayer.y + next.y) / 2;
  jCamT.x = midX - jW * 0.5;
  jCamT.y = midY - jH * 0.44;
  if (snap) { jCam.x = jCamT.x; jCam.y = jCamT.y; }
}

function jSyncHud() {
  var s = document.getElementById('jumpScore');
  if (s) s.textContent = jScore;
  var b = document.getElementById('jumpBest');
  if (b) b.textContent = '最高 ' + jBest;
}

// ── 主循环 ─────────────────────────────────────────────────
function jLoop(ts) {
  if (!jRunning) return;
  if (!jLastTs) jLastTs = ts;
  var dt = Math.min(ts - jLastTs, 50);
  jLastTs = ts;
  jTick(dt);
  jDraw();
  jRaf = requestAnimationFrame(jLoop);
}

function jTick(dt) {
  // 相机缓动
  jCam.x += (jCamT.x - jCam.x) * 0.09;
  jCam.y += (jCamT.y - jCam.y) * 0.09;
  // 云漂移
  jClouds.forEach(function(c) {
    c.x -= c.v * dt / 1000;
    if (c.x < -160) { c.x = jW + 120; c.y = 30 + Math.random() * jH * 0.4; }
  });
  // 蓄力
  if (jState === 'charging') {
    jCharge = Math.min(jCharge + dt / J_CHARGE_MS, 1.06);
    var sq = Math.min(jCharge, 1);
    jPlayer.sy = 1 - sq * 0.42;
    jPlayer.sx = 1 + sq * 0.22;
    var f = document.getElementById('jumpPowerFill');
    if (f) f.style.width = Math.min(jCharge, 1) * 100 + '%';
    var now = performance.now();
    if (now - jChargeLast > 120) {
      jChargeLast = now;
      jBeep(180 + jCharge*380, 'sine', 0.04+jCharge*0.03, 0.1);
    }
  }
  // 跳跃动画
  if (jState === 'jumping' && jJump) {
    jJump.t += dt / jJump.dur;
    var t = Math.min(jJump.t, 1);
    jPlayer.x = jJump.sx + jJump.dx * t;
    jPlayer.y = jJump.sy + jJump.dy * t;
    jPlayer.z = 4 * jJump.h * t * (1 - t);
    // 起跳拉伸 → 空中恢复
    var stretch = t < 0.25 ? 1 + (0.25 - t) * 1.2 : 1;
    jPlayer.sy = stretch;
    jPlayer.sx = 1 / Math.sqrt(stretch);
    if (jJump.t >= 1) {
      jPlayer.z = 0; jPlayer.sx = 1; jPlayer.sy = 1;
      jJump = null;
      jLand();
    }
  }
  // 掉落动画
  if (jState === 'falling' && jFall) {
    jFall.t += dt / 600;
    jPlayer.z = -jFall.t * jFall.t * 260;
    jPlayer.alpha = Math.max(1 - jFall.t * 1.4, 0);
    if (jFall.t >= 1) {
      jFall = null;
      jPlayer.alpha = 1; jPlayer.z = 0;
      jGameOver();
    }
  }
  // 粒子
  for (var i = jParts.length - 1; i >= 0; i--) {
    var p = jParts[i];
    p.t += dt / p.life;
    p.x += p.vx * dt / 1000;
    p.y += p.vy * dt / 1000;
    p.vy += 260 * dt / 1000;
    if (p.t >= 1) jParts.splice(i, 1);
  }
  // 漂浮文字
  for (var k = jFloats.length - 1; k >= 0; k--) {
    var fl = jFloats[k];
    fl.t += dt / 900;
    fl.y -= 26 * dt / 1000;
    if (fl.t >= 1) jFloats.splice(k, 1);
  }
}

// ── 绘制 ───────────────────────────────────────────────────
function jDraw() {
  var ctx = jCtx;
  ctx.clearRect(0, 0, jW, jH);
  // 云
  jClouds.forEach(function(c) { jDrawCloud(ctx, c); });
  ctx.save();
  ctx.translate(-jCam.x, -jCam.y);
  // 盒子
  for (var i = 0; i < jBoxes.length; i++) jDrawBox(ctx, jBoxes[i]);
  // 玩家
  jDrawPlayer(ctx);
  // 粒子
  jParts.forEach(function(p) {
    ctx.globalAlpha = Math.max(1 - p.t, 0) * 0.85;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (1 - p.t * 0.5), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  // 漂浮文字
  jFloats.forEach(function(fl) {
    ctx.globalAlpha = Math.max(1 - fl.t, 0);
    ctx.fillStyle = fl.color;
    ctx.font = '700 17px ' + '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fl.text, fl.x, fl.y);
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

function jDrawCloud(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(c.s, c.s);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.arc(20, -6, 22, 0, Math.PI * 2);
  ctx.arc(44, 0, 16, 0, Math.PI * 2);
  ctx.arc(22, 8, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function jShade(hex, pct) {
  var n = parseInt(hex.slice(1), 16);
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  var f = function(v) { return Math.max(0, Math.min(255, Math.round(v + v * pct))); };
  return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
}

function jDrawBox(ctx, b) {
  var rx = b.r, ry = b.r * 0.5, h = b.h;
  // 地面阴影
  ctx.fillStyle = 'rgba(43,58,85,0.10)';
  ctx.beginPath();
  ctx.ellipse(b.x + 4, b.y + h + 14, rx * 0.95, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // 左面
  ctx.fillStyle = jShade(b.color, -0.28);
  ctx.beginPath();
  ctx.moveTo(b.x - rx, b.y);
  ctx.lineTo(b.x, b.y + ry);
  ctx.lineTo(b.x, b.y + ry + h);
  ctx.lineTo(b.x - rx, b.y + h);
  ctx.closePath();
  ctx.fill();
  // 右面
  ctx.fillStyle = jShade(b.color, -0.14);
  ctx.beginPath();
  ctx.moveTo(b.x + rx, b.y);
  ctx.lineTo(b.x, b.y + ry);
  ctx.lineTo(b.x, b.y + ry + h);
  ctx.lineTo(b.x + rx, b.y + h);
  ctx.closePath();
  ctx.fill();
  // 顶面
  var grad = ctx.createLinearGradient(b.x, b.y - ry, b.x, b.y + ry);
  grad.addColorStop(0, jShade(b.color, 0.12));
  grad.addColorStop(1, b.color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y - ry);
  ctx.lineTo(b.x + rx, b.y);
  ctx.lineTo(b.x, b.y + ry);
  ctx.lineTo(b.x - rx, b.y);
  ctx.closePath();
  ctx.fill();
  // 顶面装饰
  if (b.deco) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, rx * 0.4, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, rx * 0.16, ry * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function jDrawPlayer(ctx) {
  var p = jPlayer;
  var px = p.x, py = p.y - p.z;
  var shakeX = (jState === 'charging' && jCharge > 0.92) ? (Math.random() - 0.5) * 1.6 : 0;
  var pw = 23 * p.sx, ph = 34 * p.sy;
  // 盒上影子
  var shA = Math.max(0.20 - p.z / 900, 0.04);
  ctx.fillStyle = 'rgba(43,58,85,' + shA.toFixed(3) + ')';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 2, 11 * (1 - Math.min(p.z / 500, 0.4)), 5 * (1 - Math.min(p.z / 500, 0.4)), 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = p.alpha;
  ctx.translate(px + shakeX, py);
  // 身体
  var grad = ctx.createLinearGradient(0, -ph, 0, 0);
  grad.addColorStop(0, '#5a739e');
  grad.addColorStop(1, '#33415e');
  ctx.fillStyle = grad;
  ctx.beginPath();
  var rr = pw / 2;
  ctx.moveTo(-pw / 2, 0);
  ctx.lineTo(-pw / 2, -ph + rr);
  ctx.arc(0, -ph + rr, rr, Math.PI, 0);
  ctx.lineTo(pw / 2, 0);
  ctx.closePath();
  ctx.fill();
  // 眼睛
  ctx.fillStyle = '#fff';
  var ex = 3.4 * p.fx, ey = -ph * 0.68;
  ctx.beginPath();
  ctx.arc(ex - 3.4, ey, 2.5, 0, Math.PI * 2);
  ctx.arc(ex + 3.4, ey, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2b3a55';
  ctx.beginPath();
  ctx.arc(ex - 3.4 + p.fx * 0.8, ey, 1.2, 0, Math.PI * 2);
  ctx.arc(ex + 3.4 + p.fx * 0.8, ey, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── 特效 ───────────────────────────────────────────────────
function jDust(x, y, n, color) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2;
    var sp = 30 + Math.random() * 70;
    jParts.push({
      x: x, y: y,
      vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - 20,
      r: 1.6 + Math.random() * 2.4,
      t: 0, life: 420 + Math.random() * 380,
      color: Math.random() < 0.5 ? '#ffffff' : color
    });
  }
}

function jRing(x, y) {
  for (var i = 0; i < 10; i++) {
    var a = (i / 10) * Math.PI * 2;
    jParts.push({
      x: x, y: y,
      vx: Math.cos(a) * 90, vy: -30,
      r: 2, t: 0, life: 500,
      color: '#f5c518'
    });
  }
}

// ── 排行榜 / 成绩保存 ──────────────────────────────────────
function jumpLoadRank() {
  var box = document.getElementById('jumpRankList');
  if (!box) return;
  api('GET', '/api/jump').then(function(d) {
    var list = d.jump || [];
    if (!list.length) {
      box.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:18px 0;font-size:12px">暂无成绩，快来抢榜首！</div>';
      return;
    }
    var isAdmin = me && me.role === 'admin';
    var h = '';
    list.slice(0, 10).forEach(function(r, i) {
      var date = (r.createdAt || r.created_at || '');
      if (date) date = date.slice(0, 10);
      var isMe = me && r.name === me.username;
      h += '<div class="jr-row' + (isMe ? ' jr-me' : '') + '">' +
        '<span class="jr-rank ' + (i < 3 ? 'r' + (i + 1) : '') + '">' + (i + 1) + '</span>' +
        '<span class="jr-name" title="' + esc(r.name) + '">' + esc(r.name) + '</span>' +
        '<span class="jr-score">' + (r.score || 0) + '</span>' +
        '<span class="jr-date">' + date + '</span>' +
        (isAdmin ? '<button class="btn-sm danger jr-del" title="删除" onclick="jumpDelRank(' + r.id + ')">' + icon('i-trash', 11) + '</button>' : '') +
        '</div>';
    });
    box.innerHTML = h;
  }).catch(function() {
    box.innerHTML = '<div style="text-align:center;color:var(--danger);padding:18px 0;font-size:12px">排行榜加载失败</div>';
  });
}

function jumpDelRank(id) {
  if (!confirm('确定删除该成绩？')) return;
  api('DELETE', '/api/jump/' + id).then(function() {
    jumpLoadRank();
    toast('已删除');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function jumpSaveScore() {
  var nameEl = document.getElementById('jumpName');
  var btn = document.getElementById('jumpSaveBtn');
  var name = (nameEl.value || '').trim() || (me ? me.username : '玩家');
  if (jSaved) return;
  if (jFinalScore <= 0) { toast('得分为 0，先跳几步再来保存吧', 'err'); return; }
  localStorage.setItem('jump_name', name);
  btn.disabled = true;
  btn.textContent = '保存中...';
  api('GET', '/api/jump').then(function(d) {
    var list = d.jump || [];
    var exist = null;
    list.forEach(function(r) { if (!exist && r.name === name) exist = r; });
    if (exist) {
      if (jFinalScore > (exist.score || 0)) {
        return api('PUT', '/api/jump/' + exist.id, { name: name, score: jFinalScore }).then(function() {
          toast('新纪录！成绩已更新');
        });
      }
      toast('未超过「' + name + '」的历史最高 ' + exist.score + ' 分');
      return Promise.reject({ handled: true });
    }
    // 新建记录（自增主键，路径 id 会被忽略，传随机值兜底）
    var rid = Math.floor(Math.random() * 2000000000) + 1;
    return api('POST', '/api/jump/' + rid, { name: name, score: jFinalScore }).then(function() {
      toast('成绩已保存');
    });
  }).then(function() {
    jSaved = true;
    btn.textContent = '已保存 ✓';
    jumpLoadRank();
  }).catch(function(e) {
    if (e && e.handled) { btn.disabled = false; btn.textContent = '保存成绩'; return; }
    btn.disabled = false;
    btn.textContent = '保存成绩';
    toast((e && e.message) || '保存失败', 'err');
  });
}
