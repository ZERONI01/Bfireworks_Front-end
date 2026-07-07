// ── Pages ─────────────────────────────────────────────────
function render(pageId) {
  var c = document.getElementById('pageContent');
  var h = '';
  switch (pageId) {
    case 'home': h = pageHome(); break;
    case 'fw-sim': h = pageFireworks(); break;
    case 'announcements': h = pageAnnouncements(); break;
    case 'messages': h = pageMessages(); break;
    case 'users-list': h = pageUsers(); break;
    case 'settings': h = pageSettings(); break;
    default: h = '<div class="card"><h2>404</h2></div>';
  }
  c.innerHTML = h;
  if (pageId === 'fw-sim') fwStart();
}

function pageHome() {
  var html = '<h2 style="margin-bottom:14px;font-weight:600">功能中心</h2>' +
    '<div class="stat-row">' +
      '<div class="stat-card" id="statUsers"><div class="num">-</div><div class="lbl">用户总数</div></div>' +
      '<div class="stat-card" id="statAdmins"><div class="num">-</div><div class="lbl">管理员</div></div>' +
      '<div class="stat-card"><div class="num">1</div><div class="lbl">功能模块</div></div>' +
      '<div class="stat-card"><div class="num">v1.0</div><div class="lbl">版本</div></div>' +
    '</div>' +
    '<div class="card"><h2>欢迎，' + esc(me.username) + '</h2>' +
      '<p>通过左侧导航 <strong>烟花功能 / 烟花模拟器</strong> 进入烟花体验。支持点击发射、自动发射、以及自定义调色盘。</p></div>' +
    '<button class="btn btn-primary" style="margin-top:4px" onclick="go(\'fw-sim\')">进入烟花模拟器</button>';
  if (me && me.role === 'admin') {
    api('GET', '/api/users').then(function(d) {
      var users = d.users || [];
      var admins = users.filter(function(u) { return u.role === 'admin'; }).length;
      var elU = document.getElementById('statUsers'); if (elU) elU.querySelector('.num').textContent = users.length;
      var elA = document.getElementById('statAdmins'); if (elA) elA.querySelector('.num').textContent = admins;
    }).catch(function() {});
  }
  return html;
}

function pageFireworks() {
  return '<div class="fw-wrap" id="fwWrap">' +
    '<canvas id="fwCanvas"></canvas>' +
    '<div class="fw-hint" id="fwHint">点击画面发射烟花</div>' +
    '<div class="color-palette" id="colorPalette"></div>' +
    '<div class="fw-bar">' +
      '<button class="fw-chip active" data-fwm="click" onclick="fwSetMode(\'click\')">点击发射</button>' +
      '<button class="fw-chip" data-fwm="auto" onclick="fwSetMode(\'auto\')">自动发射</button>' +
      '<button class="fw-chip" data-fwm="both" onclick="fwSetMode(\'both\')">混合模式</button>' +
      '<button class="fw-chip" onclick="fwClear()">清空</button>' +
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
  return '<h2 style="margin-bottom:14px;font-weight:600">系统设置</h2>' +
    '<div class="card"><h3>修改密码</h3>' +
      '<div class="form-group"><label>旧密码</label><input type="password" id="sOld" placeholder="输入旧密码"></div>' +
      '<div class="form-group"><label>新密码</label><input type="password" id="sNew" placeholder="输入新密码"></div>' +
      '<div class="form-group"><label>确认新密码</label><input type="password" id="sConfirm" placeholder="再次输入"></div>' +
      '<button class="btn btn-primary" onclick="chgPass()">更新密码</button> ' +
      '<span id="sMsg" style="font-size:12px;margin-left:8px"></span></div>' +
    '<div class="card"><h3>数据管理</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:8px">数据库操作请通过 Navicat 管理。</p></div>';
}