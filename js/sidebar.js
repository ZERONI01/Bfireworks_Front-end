// ── Sidebar ───────────────────────────────────────────────
var menu = [
  { id: 'home', icon: 'i-home', label: '首页' },
  { id: 'fireworks', icon: 'i-firework', label: '烟花功能', open: true, kids: [
    { id: 'fw-sim', icon: 'i-firework', label: '烟花模拟器' }
  ]},
  { id: 'announcements', icon: 'i-list', label: '公告' },
  { id: 'messages', icon: 'i-list', label: '留言板' },
  { id: 'users', icon: 'i-users', label: '用户管理', admin: true, kids: [
    { id: 'users-list', icon: 'i-list', label: '用户列表' }
  ]},
  { id: 'settings', icon: 'i-settings', label: '系统设置' }
];

var curPage = 'home';
var expand = { fireworks: true, users: false };
var sidebarCollapsed = false;

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  var sb = document.querySelector('.sidebar');
  if (window.innerWidth <= 768) {
    // Mobile: overlay mode
    if (sidebarCollapsed) closeSidebar();
    else openSidebar();
  } else {
    // Desktop: collapse in place
    sb.classList.toggle('collapsed', sidebarCollapsed);
  }
}

function openSidebar() {
  document.querySelector('.sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('show');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
  sidebarCollapsed = true;
}

function buildSidebar() {
  var nav = document.getElementById('sidebarNav');
  var h = '';
  menu.forEach(function(m) {
    if (m.admin && (!me || me.role !== 'admin')) return;
    if (m.kids) {
      var isOpen = expand[m.id] !== false;
      h += '<div class="nav-group">';
      h += '<button class="nav-item" data-nav="' + m.id + '" onclick="toggleGroup(\'' + m.id + '\')">';
      h += '<span class="nav-icon">' + icon(m.icon) + '</span><span>' + m.label + '</span>';
      h += '<svg class="chevron' + (isOpen ? ' open' : '') + '" viewBox="0 0 24 24" style="width:10px;height:10px"><use href="#i-chevron"/></svg>';
      h += '</button>';
      h += '<div class="nav-sub' + (isOpen ? ' open' : '') + '" id="sub-' + m.id + '">';
      m.kids.forEach(function(k) {
        h += '<button class="nav-item" data-nav="' + k.id + '" onclick="go(\'' + k.id + '\')">';
        h += '<span class="nav-icon">' + icon(k.icon) + '</span><span>' + k.label + '</span></button>';
      });
      h += '</div></div>';
    } else {
      h += '<button class="nav-item" data-nav="' + m.id + '" onclick="go(\'' + m.id + '\')">';
      h += '<span class="nav-icon">' + icon(m.icon) + '</span><span>' + m.label + '</span></button>';
    }
  });
  nav.innerHTML = h;
  highlightNav();
}

// Handle window resize for sidebar mode switching
window.addEventListener('resize', function() {
  var sb = document.querySelector('.sidebar');
  if (window.innerWidth > 768) {
    sb.classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    sb.classList.toggle('collapsed', sidebarCollapsed);
  }
});

function toggleGroup(id) {
  expand[id] = !(expand[id] !== false);
  var sub = document.getElementById('sub-' + id);
  if (sub) sub.classList.toggle('open', expand[id] !== false);
  var btn = document.querySelector('[data-nav="' + id + '"]');
  if (btn) { var ch = btn.querySelector('.chevron'); if (ch) ch.classList.toggle('open', expand[id] !== false); }
}

function go(pageId) {
  // Permission check: non-admin cannot access admin pages
  if (pageId === 'users-list' || pageId === 'users') {
    if (!me || me.role !== 'admin') { toast('无权限访问', 'err'); return; }
  }
  if (curPage === 'fw-sim') fwStop();
  curPage = pageId;
  highlightNav();
  render(pageId);
  var label = pageId;
  menu.forEach(function(m) {
    if (m.id === pageId) label = m.label;
    if (m.kids) m.kids.forEach(function(k) { if (k.id === pageId) label = m.label + ' / ' + k.label; });
  });
  document.getElementById('breadcrumb').innerHTML = '<span class="current">' + label + '</span>';
}

function highlightNav() {
  document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
  var el = document.querySelector('[data-nav="' + curPage + '"]');
  if (el) el.classList.add('active');
}