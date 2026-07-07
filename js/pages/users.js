// ── CRUD ──────────────────────────────────────────────────
function modalAddUser() {
  showModal('<h3>添加用户</h3>' +
    '<div class="form-group"><label>用户名</label><input type="text" id="mUser" placeholder="用户名"></div>' +
    '<div class="form-group"><label>密码</label><input type="password" id="mPass" placeholder="密码"></div>' +
    '<div class="form-group"><label>角色</label><select id="mRole"><option value="user">普通用户</option><option value="admin">管理员</option></select></div>' +
    '<button class="btn btn-primary btn-block" onclick="addUser()" style="margin-top:4px">确认添加</button>' +
    '<button class="btn btn-block" onclick="closeModal()" style="margin-top:6px">取消</button>');
}

function editUser(id) {
  api('GET', '/api/users').then(function(d) {
    var u = (d.users || []).find(function(x) { return x.id === id; });
    if (!u) { toast('用户不存在', 'err'); return; }
    showModal('<h3>编辑用户</h3>' +
      '<div class="form-group"><label>用户名</label><input type="text" id="mUser" value="' + esc(u.username) + '" ' + (u.username === 'admin' ? 'disabled' : '') + '></div>' +
      '<div class="form-group"><label>新密码（留空不修改）</label><input type="password" id="mPass" placeholder="留空不修改"></div>' +
      '<div class="form-group"><label>角色</label><select id="mRole" ' + (u.username === 'admin' ? 'disabled' : '') + '><option value="user"' + (u.role === 'user' ? ' selected' : '') + '>普通用户</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>管理员</option></select>' + (u.username === 'admin' ? '<small style="color:var(--text-muted);display:block;margin-top:4px">admin 角色不可修改</small>' : '') + '</div>' +
      '<button class="btn btn-primary btn-block" onclick="saveUser(' + id + ')" style="margin-top:4px">保存</button>' +
      '<button class="btn btn-block" onclick="closeModal()" style="margin-top:6px">取消</button>');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function addUser() {
  var un = document.getElementById('mUser').value.trim();
  var pw = document.getElementById('mPass').value;
  var rl = document.getElementById('mRole').value;
  if (!un || !pw) { toast('请填写完整', 'err'); return; }
  if (pw.length < 4) { toast('密码至少4位', 'err'); return; }
  api('POST', '/api/users', { username: un, password: pw, role: rl }).then(function() {
    closeModal(); go('users-list'); toast('添加成功');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function saveUser(id) {
  var un = document.getElementById('mUser').value.trim();
  var pw = document.getElementById('mPass').value;
  var rl = document.getElementById('mRole').value;
  if (!un) { toast('用户名不能为空', 'err'); return; }
  var body = {};
  if (un) body.username = un;
  if (pw) { if (pw.length < 4) { toast('密码至少4位', 'err'); return; } body.password = pw; }
  if (rl) body.role = rl;
  api('PUT', '/api/users/' + id, body).then(function() {
    closeModal(); go('users-list'); toast('已更新');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function delUser(id) {
  if (!confirm('确定删除该用户？')) return;
  api('DELETE', '/api/users/' + id).then(function() {
    go('users-list'); toast('已删除');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function chgPass() {
  var oldP = document.getElementById('sOld').value;
  var newP = document.getElementById('sNew').value;
  var cfm = document.getElementById('sConfirm').value;
  var msg = document.getElementById('sMsg');
  if (!oldP || !newP) { msg.style.color = 'var(--danger)'; msg.textContent = '请填写完整'; return; }
  if (newP !== cfm) { msg.style.color = 'var(--danger)'; msg.textContent = '两次不一致'; return; }
  api('PUT', '/api/change-password', { old_password: oldP, new_password: newP }).then(function() {
    msg.style.color = 'var(--accent)'; msg.textContent = '密码已更新';
    document.getElementById('sOld').value = document.getElementById('sNew').value = document.getElementById('sConfirm').value = '';
  }).catch(function(e) { msg.style.color = 'var(--danger)'; msg.textContent = e.message; });
}

function showModal(html) { document.getElementById('modalBox').innerHTML = html; document.getElementById('modalMask').classList.add('show'); }
function closeModal() { document.getElementById('modalMask').classList.remove('show'); }
document.getElementById('modalMask').addEventListener('click', function(e) { if (e.target === this) closeModal(); });

/* ===================================================================
   FIREWORKS ENGINE + COLOR PALETTE
   =================================================================== */
var FW_COLORS = [
  { hex: '#e74c3c', name: '红' },
  { hex: '#e67e22', name: '橙' },
  { hex: '#f1c40f', name: '黄' },
  { hex: '#2ecc71', name: '绿' },
  { hex: '#1abc9c', name: '青' },
  { hex: '#3498db', name: '蓝' },
  { hex: '#9b59b6', name: '紫' },
  { hex: '#e91e63', name: '粉' },
  { hex: '#ff6b35', name: '橘' },
  { hex: '#00bcd4', name: '天蓝' },
  { hex: '#8bc34a', name: '草绿' },
  { hex: '#ff9800', name: '金' },
  { hex: '#ffffff', name: '白' },
  { hex: '#ff5722', name: '深橙' },
  { hex: '#cddc39', name: '柠绿' },
  { hex: '#03a9f4', name: '浅蓝' },
];

var fwMode = 'click';
var fwRockets = [], fwParticles = [], fwSparkles = [];
var fwCanvas, fwCtx, fwW, fwH;
var fwAutoId = null, fwRafId = null, fwActive = false;
var fwSelectedColors = FW_COLORS.map(function(_, i) { return i; });