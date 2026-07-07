// ── Auth ──────────────────────────────────────────────────
var authMode = 'login';
var me = null;

function showLoginForm(mode) {
  authMode = mode;
  document.getElementById('loginLanding').style.display = 'none';
  document.getElementById('loginFormPanel').classList.add('show');
  document.getElementById('formTitle').textContent = mode === 'login' ? '登录' : '注册';
  document.getElementById('confirmField').style.display = mode === 'register' ? 'block' : 'none';
  document.getElementById('authSubmit').textContent = mode === 'login' ? '登 录' : '注 册';
  document.getElementById('loginError').textContent = '';
  document.getElementById('authUser').value = '';
  document.getElementById('authPass').value = '';
  document.getElementById('authConfirm').value = '';
}

function hideLoginForm() {
  document.getElementById('loginLanding').style.display = 'block';
  document.getElementById('loginFormPanel').classList.remove('show');
  document.getElementById('loginError').textContent = '';
  document.getElementById('authUser').value = '';
  document.getElementById('authPass').value = '';
  document.getElementById('authConfirm').value = '';
}

document.getElementById('authForm').addEventListener('submit', function(e) {
  e.preventDefault();
  var u = document.getElementById('authUser').value.trim();
  var p = document.getElementById('authPass').value;
  var c = document.getElementById('authConfirm').value;
  var err = document.getElementById('loginError');
  if (!u || !p) { err.textContent = '请填写所有字段'; return; }
  if (authMode === 'register') {
    if (p !== c) { err.textContent = '两次密码不一致'; return; }
    if (p.length < 4) { err.textContent = '密码至少4位'; return; }
    api('POST', '/api/register', { username: u, password: p }).then(function() {
      toast('注册成功，请登录');
      hideLoginForm();
      setTimeout(function() { showLoginForm('login'); }, 200);
    }).catch(function(e) { err.textContent = e.message; });
    return;
  }
  api('POST', '/api/login', { username: u, password: p }).then(function(data) {
    TOKEN = data.token;
    sessionStorage.setItem('fw_token', TOKEN);
    me = data.user;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appShell').style.display = 'block';
    document.getElementById('sbUser').textContent = me.username;
    document.getElementById('sbAvatar').textContent = me.username[0].toUpperCase();
    buildSidebar();
    go('home');
    toast('欢迎回来，' + me.username);
  }).catch(function(e) { err.textContent = e.message; });
});

function logout() {
  api('POST', '/api/logout').catch(function(){});
  sessionStorage.removeItem('fw_token'); TOKEN = ''; me = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
  hideLoginForm();
  if (fwStop) fwStop();
}

(function() {
  if (TOKEN) {
    api('GET', '/api/me').then(function(data) {
      me = data.user;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appShell').style.display = 'block';
      document.getElementById('sbUser').textContent = me.username;
      document.getElementById('sbAvatar').textContent = me.username[0].toUpperCase();
      buildSidebar();
      go('home');
    }).catch(function() {
      // Token 过期不自动清除，仅显示登录页
      document.getElementById('loginScreen').style.display = 'flex';
      document.getElementById('appShell').style.display = 'none';
    });
  }
})();