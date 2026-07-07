// ── 公告功能 ──────────────────────────────────────────
function pageAnnouncements() {
  //鉴权
  var isAdmin = me && me.role === 'admin';
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
    '<h2 style="font-weight:600;font-size:18px">公告</h2>' +
    (isAdmin ? '<button class="btn btn-primary" style="width:100px;height:50px;padding:9px 16px;font-size:10px" onclick="showAnnouncementForm()">'  + ' 发布公告</button>' : '') +
    '</div><div id="annoList">加载中...</div>';
  loadAnnouncements();
  return html;
}

function loadAnnouncements() {
  api('GET', '/api/announcements').then(function(d) {
    var list = d.announcements || [];
    var isAdmin = me && me.role === 'admin';
    var h = '';
    if (list.length === 0) h = '<div class="card"><p style="color:var(--text-muted);text-align:center">暂无公告</p></div>';
    list.forEach(function(a) {
      h += '<div class="card" style="position:relative">' +
        (a.pinned ? '<span style="position:absolute;top:10px;right:16px;font-size:11px;color:var(--accent)">置顶</span>' : '') +
        '<h3 style="cursor:pointer;color:var(--accent)" onclick="showDetail(' + a.id + ')">' + esc(a.title) + '</h3>' +
        '<p style="white-space:pre-wrap">' + esc(a.content) + '</p>' +
        '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">' + (a.created_at ? a.created_at.slice(0,10) : '-') + '</div>' +
        (isAdmin ? '<div style="margin-top:8px"><button class="btn-sm" onclick="editAnnouncement(' + a.id + ')">' + icon('i-edit',12) + ' 编辑</button><button class="btn-sm danger" onclick="delAnnouncement(' + a.id + ')">' + icon('i-trash',12) + ' 删除</button></div>' : '') +
        '</div>';
    });
    document.getElementById('annoList').innerHTML = h;
  }).catch(function() {
    document.getElementById('annoList').innerHTML = '<div class="card"><p style="color:var(--danger);text-align:center">加载失败</p></div>';
  });
}

function showAnnouncementForm() {
  showModal('<h3>发布公告</h3>' +
    '<div class="form-group"><label>标题</label><input type="text" id="annoTitle" placeholder="公告标题"></div>' +
    '<div class="form-group"><label>内容</label><textarea id="annoContent" rows="4" style="width:100%;padding:9px 12px;background:var(--surface-alt);border:1px solid var(--border);border-radius:var(--radius);font-size:14px;color:var(--text);outline:none;resize:vertical" placeholder="公告内容"></textarea></div>' +
    '<div class="form-group"><label style="font-weight:400"><input type="checkbox" id="annoPinned" style="margin-right:6px">置顶</label></div>' +
    '<button class="btn btn-primary btn-block" onclick="createAnnouncement()" style="margin-top:4px">提交</button>' +
    '<button class="btn btn-block" onclick="closeModal()" style="margin-top:6px">取消</button>');
}

function createAnnouncement() {
  var title = document.getElementById('annoTitle').value.trim();
  var content = document.getElementById('annoContent').value.trim();
  var pinned = document.getElementById('annoPinned').checked;
  if (!title || !content) { toast('请填写标题和内容', 'err'); return; }
  api('POST', '/api/announcements', { title: title, content: content, pinned: pinned }).then(function() {
    closeModal(); loadAnnouncements(); toast('发布成功');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function editAnnouncement(id) {
  // 简单弹窗编辑（标题+内容兜底）
  var title = prompt('新标题');
  var content = prompt('新内容');
  if (!title || !content) return;
  api('PUT', '/api/announcements/' + id, { title: title, content: content, pinned: false }).then(function() {
    loadAnnouncements(); toast('更新成功');
  }).catch(function(e) { toast(e.message, 'err'); });
}

function delAnnouncement(id) {
  if (!confirm('确定删除？')) return;
  api('DELETE', '/api/announcements/' + id).then(function() {
    loadAnnouncements(); toast('已删除');
  }).catch(function(e) { toast(e.message, 'err'); });
}
//公告展示
function showDetail(id) {
  api('GET', '/api/announcements/').then(function(d) {
    var a = (d.announcements || []).find(function(x) { return x.id === id; });
    if (!a) return; 
    showModal('<h3>' + esc(a.title) + '</h3>' +
      '<p style="white-space:pre-wrap;line-height:1.8;margin:12px 0">' + esc(a.content) + '</p>' +
      '<div style="font-size:11px;color:var(--text-muted)">' + (a.created_at ? a.created_at.slice(0,10) : '') + '</div>' +
      '<button class="btn btn-block" onclick="closeModal()" style="margin-top:12px">关闭</button>');
  });
}
//编辑公告
function editAnnouncement(id) {
  api('GET', '/api/announcements').then(function(d) {
    var a = (d.announcements || []).find(function(x) { return x.id === id; });
    if (!a) return;
    showModal(
      '<h3>编辑公告</h3>' +
      '<div class="form-group"><label>标题</label><input type="text" id="annoTitle" value="' + esc(a.title) + '"></div>' +
      '<div class="form-group"><label>内容</label><textarea id="annoContent" rows="4" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;resize:vertical">' + esc(a.content) + '</textarea></div>' +
      '<button class="btn btn-primary btn-block" onclick="updateAnnouncement(' + id + ')" style="margin-top:4px">保存</button>' +
      '<button class="btn btn-block" onclick="closeModal()" style="margin-top:6px">取消</button>'
    );
  });
}