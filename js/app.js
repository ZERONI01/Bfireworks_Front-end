// ── Pages ─────────────────────────────────────────────────
function render(pageId) {
  var c = document.getElementById('pageContent');
  var h = '';
  switch (pageId) {
    case 'home': h = pageHome(); break;
    case 'fw-sim': h = pageFireworks(); break;
    case 'jump': h = pageJump(); break;
    case 'announcements': h = pageAnnouncements(); break;
    case 'messages': h = pageMessages(); break;
    case 'users-list': h = pageUsers(); break;
    case 'settings': h = pageSettings(); break;
    default: h = '<div class="card"><h2>404</h2></div>';
  }
  c.innerHTML = h;
  if (pageId === 'fw-sim') fwStart();
  if (pageId === 'jump') jumpStart();
}

function pageHome() {
  var h = getTimeGreet() + '，' + esc(me.username);
  var html =
    '<div class="home-hero">' +
      '<div class="home-hero-text">' +
        '<div class="home-greet">' + h + '</div>' +
        '<div class="home-sub">BWZ 工具站 — 烟花、游戏与效率工具集</div>' +
      '</div>' +
    '</div>' +
    '<div class="home-grid">' +
      homeCard('fw-sim', '', '烟花模拟器', '多人实时同步，自定义调色盘，点击/自动/混合三种模式', '#4a6fa5') +
      homeCard('jump', '', '跳一跳', '蓄力跳跃，落盒得分，完美落心双倍，排行榜争锋', '#5a9e6f') +
      homeCard('announcements', '', '公告板', '查看最新系统通知与更新日志', '#9e7a5a') +
    '</div>' +
    '<div class="card home-news" id="homeNews"><h3>' + icon('i-list',13) + ' 最新公告</h3><div style="text-align:center;color:var(--text-muted);padding:12px 0;font-size:12px">加载中...</div></div>';
  // 加载最新公告
  setTimeout(function() {
    api('GET', '/api/announcements').then(function(d) {
      var list = d.announcements || [];
      var el = document.getElementById('homeNews');
      if (!el) return;
      if (!list.length) {
        el.querySelector('div').textContent = '暂无公告';
        return;
      }
      var latest = list[0];
      var date = (latest.createdAt || latest.created_at || '').slice(0, 10);
      el.querySelector('div').innerHTML =
        '<div style="font-weight:500;color:var(--text);margin-bottom:4px">' + esc(latest.title) + '</div>' +
        '<div style="color:var(--text-secondary);font-size:12px;line-height:1.6">' + esc(latest.content).substring(0, 120) + (latest.content && latest.content.length > 120 ? '...' : '') + '</div>' +
        '<div style="color:var(--text-muted);font-size:11px;margin-top:6px">' + date + '</div>';
    }).catch(function() {
      var el = document.getElementById('homeNews');
      if (el) el.querySelector('div').textContent = '加载失败';
    });
  }, 100);
  return html;
}

function getTimeGreet() {
  var h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function homeCard(pageId, iconId, title, desc, color) {
  return '<div class="home-card" onclick="go(\'' + pageId + '\')" style="--hc:' + color + '">' +
    '<div class="home-card-icon"><svg viewBox="0 0 24 24"><use href="#' + (pageId === 'fw-sim' ? 'i-firework-logo' : pageId === 'jump' ? 'i-game' : 'i-list') + '"/></svg></div>' +
    '<div class="home-card-body">' +
      '<div class="home-card-title">' + title + '</div>' +
      '<div class="home-card-desc">' + desc + '</div>' +
    '</div>' +
    '<div class="home-card-arrow"><svg viewBox="0 0 24 24"><use href="#i-chevron"/></svg></div>' +
  '</div>';
}

function pageFireworks() {
  return '<div class="fw-wrap" id="fwWrap">' +
    '<canvas id="fwCanvas"></canvas>' +
    '<div class="fw-hint" id="fwHint">点击画面发射烟花</div>' +
    '<div class="color-palette" id="colorPalette"></div>' +
    '<div class="fw-bar">' +
      '<button class="fw-chip active" data-fwm="click" onclick="fwSetMode(\'click\')">点击</button>' +
      '<button class="fw-chip" data-fwm="auto" onclick="fwSetMode(\'auto\')">自动</button>' +
      '<button class="fw-chip" data-fwm="both" onclick="fwSetMode(\'both\')">混合</button>' +
      '<button class="fw-chip" onclick="fwClear()">清空</button>' +
      '<span style="flex:1"></span>' +
      '<div style="position:relative">' +
        '<button class="fw-chip" id="fwRoomBtn" onclick="fwToggleSync()">单人</button>' +
        '<div class="room-panel" id="fwRoomPanel" style="display:none">' +
          '<button onclick="fwSetRoom(\'solo\')">单人模式</button>' +
          '<button onclick="fwSetRoom(\'public\')">公共房间</button>' +
          '<div style="display:flex;gap:4px"><input id="fwRoomInput" placeholder="输入房间码" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:3px 6px;border-radius:3px;font-size:11px"><button onclick="fwSetRoom(\'private\',document.getElementById(\'fwRoomInput\').value.trim())" style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);color:#fff;padding:3px 8px;border-radius:3px;font-size:11px;cursor:pointer">加入</button></div>' +
          '<button onclick="var c=genRoomCode();document.getElementById(\'fwRoomInput\').value=c;fwSetRoom(\'private\',c)">创建私密房间</button>' +
        '</div>' +
      '</div>' +
    '</div></div>';
}

function pageUsers() {
  if (!me || me.role !== 'admin') return '<div class="card"><h2>无权限访问</h2><p style="color:var(--text-secondary)">仅管理员可查看此页面。</p></div>';
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
    '<h2 style="font-weight:600">用户列表</h2>' +
    '<button class="btn btn-primary" style="padding:7px 14px;font-size:13px" onclick="modalAddUser()">' + icon('i-plus',14) + ' 添加用户</button></div>' +
    '<div class="search-wrap"><svg viewBox="0 0 24 24" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted);pointer-events:none"><use href="#i-search"/></svg>' +
    '<input class="form-group" style="margin:0;padding-left:32px" placeholder="搜索用户..." oninput="filterUsers(this.value)"></div>' +
    '<div class="card" style="padding:0;overflow:hidden"><div class="tbl-wrap"><table>' +
      '<thead><tr><th>ID</th><th>用户名</th><th>角色</th><th>创建日期</th><th>操作</th></tr></thead>' +
      '<tbody id="userTbody"><tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">加载中...</td></tr></tbody>' +
    '</table></div></div>';
  loadUserTable();
  return html;
}

function loadUserTable(q) {
  api('GET', '/api/users').then(function(d) {
    var users = d.users || [];
    if (q) users = users.filter(function(u) { return u.username.toLowerCase().includes(q.toLowerCase()); });
    var rows = '';
    users.forEach(function(u) {
      rows += '<tr><td>' + u.id + '</td><td>' + esc(u.username) + '</td><td><span class="badge badge-' + u.role + '">' + (u.role === 'admin' ? '管理员' : '用户') + '</span></td><td>' + (u.created_at ? u.created_at.slice(0,10) : '-') + '</td><td>' +
        '<button class="btn-sm" onclick="editUser(' + u.id + ')">' + icon('i-edit',12) + ' 编辑</button>' +
        (u.username !== 'admin' ? '<button class="btn-sm danger" onclick="delUser(' + u.id + ')">' + icon('i-trash',12) + ' 删除</button>' : '') +
      '</td></tr>';
    });
    document.getElementById('userTbody').innerHTML = rows || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px">无匹配结果</td></tr>';
  }).catch(function() {
    document.getElementById('userTbody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:20px">加载失败</td></tr>';
  });
}

function filterUsers(q) { loadUserTable(q); }

function pageSettings() {
  var h = '<h2 style="margin-bottom:14px;font-weight:600">系统设置</h2>';
  var isAdmin = me && me.role === 'admin';
  if (isAdmin) {
    h += '<div class="stat-row" id="settingsStats">' +
      '<div class="stat-card" id="statUsers"><div class="num">-</div><div class="lbl">用户总数</div></div>' +
      '<div class="stat-card" id="statAdmins"><div class="num">-</div><div class="lbl">管理员</div></div>' +
      '<div class="stat-card" id="statAnnouncements"><div class="num">-</div><div class="lbl">公告数</div></div>' +
    '</div>';
  }
  h += '<div class="card"><h3>修改密码</h3>' +
    '<div class="form-group"><label>旧密码</label><input type="password" id="sOld" placeholder="输入旧密码"></div>' +
    '<div class="form-group"><label>新密码</label><input type="password" id="sNew" placeholder="输入新密码"></div>' +
    '<div class="form-group"><label>确认新密码</label><input type="password" id="sConfirm" placeholder="再次输入"></div>' +
    '<button class="btn btn-primary" onclick="chgPass()">更新密码</button> ' +
    '<span id="sMsg" style="font-size:12px;margin-left:8px"></span></div>' +
    '<div class="card"><h3>关于</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:4px">BWZ工具站 v1.0</p>' +
    '<p style="color:var(--text-muted);font-size:11px"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" style="color:var(--text-muted);text-decoration:none">浙ICP备2026050961号</a></p></div>';
  if (isAdmin) {
    setTimeout(function() {
      api('GET', '/api/users').then(function(d) {
        var users = d.users || [];
        var admins = users.filter(function(u) { return u.role === 'admin'; }).length;
        var elU = document.getElementById('statUsers'); if (elU) elU.querySelector('.num').textContent = users.length;
        var elA = document.getElementById('statAdmins'); if (elA) elA.querySelector('.num').textContent = admins;
      }).catch(function() {});
      api('GET', '/api/announcements').then(function(d) {
        var list = d.announcements || [];
        var el = document.getElementById('statAnnouncements'); if (el) el.querySelector('.num').textContent = list.length;
      }).catch(function() {});
    }, 100);
  }
  return h;
}