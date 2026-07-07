// ── 留言墙 ──────────────────────────────────────────
var msgTab = 'message'; // 当前标签: message / issue / suggest

function pageMessages() {
  var isAdmin = me && me.role === 'admin';
  var tabs = [
    { key: 'message', label: '留言板' },
    { key: 'issue', label: '问题反馈' },
    { key: 'suggest', label: '功能建议' }
  ];
  var tabHtml = '<div style="display:flex;gap:0;margin-bottom:14px;border-bottom:2px solid var(--border-light)">';
  tabs.forEach(function(t) {
    tabHtml += '<button class="msg-tab' + (msgTab === t.key ? ' active' : '') + '" data-key="' + t.key + '" onclick="switchMsgTab(\'' + t.key + '\')">' + t.label + '</button>';
  });
  tabHtml += '</div>';

  var html = '<h2 style="margin-bottom:12px;font-weight:600;font-size:18px">留言板</h2>' +
    tabHtml +
    '<div style="display:flex;gap:12px">' +
      '<div style="flex:1"><div id="msgList">加载中...</div></div>' +
      '<div style="width:320px;flex-shrink:0">' +
        '<div class="card"><h3>写留言</h3>' +
          '<div class="form-group"><label>类型</label><div style="display:flex;gap:6px">' +
            '<button class="msg-type-btn active" data-mt="message" onclick="pickMsgType(\'message\',this)">许愿</button>' +
            '<button class="msg-type-btn" data-mt="issue" onclick="pickMsgType(\'issue\',this)">吐槽</button>' +
            '<button class="msg-type-btn" data-mt="suggest" onclick="pickMsgType(\'suggest\',this)">建议</button>' +
          '</div></div>' +
          '<div class="form-group"><label>署名</label><input type="text" id="msgAuthor" placeholder="你的名字（可选）" value="' + (me ? esc(me.username) : '') + '"></div>' +
          '<div class="form-group"><label>内容</label><textarea id="msgContent" rows="3" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:var(--radius);font-size:14px;resize:vertical" placeholder="说点什么..."></textarea></div>' +
          '<button class="btn btn-primary btn-block" onclick="submitMsg()">提交</button>' +
        '</div>' +
        (isAdmin ? '<div class="card" style="margin-top:12px"><h3>待审核</h3><div id="pendingList" style="font-size:12px;color:var(--text-muted)">加载中...</div></div>' : '') +
      '</div>' +
    '</div>';
  loadMessages();
  if (isAdmin) loadPending();
  return html;
}

function switchMsgTab(key) {
  msgTab = key;
  document.querySelectorAll('.msg-tab').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-key') === key);
  });
  loadMessages();
}

function loadMessages() {
  var typeMap = {
    message: ['message','issue','suggest'],
    issue:    ['suggest','issue'],
    suggest:  ['message','suggest']
  };
  var types = typeMap[msgTab] || [msgTab];
  var all = [];
  var done = 0;
  types.forEach(function(t) {
    api('GET', '/api/messages?type=' + t).then(function(d) {
      all = all.concat(d.messages || []);
      done++;
      if (done === types.length) renderMsgList(all);
    }).catch(function() { done++; if (done === types.length) renderMsgList(all); });
  });
}

function renderMsgList(list) {
  // 去重排序
  var seen = {};
  list = list.filter(function(m) { return seen[m.id] ? false : (seen[m.id] = true); });
  list.sort(function(a,b) { return (b.createdAt||'').localeCompare(a.createdAt||''); });
  var h = '';
  if (list.length === 0) h = '<div class="card"><p style="color:var(--text-muted);text-align:center">暂无内容</p></div>';
  list.forEach(function(m) {
    var labels = { message: '心愿', issue: '吐槽', suggest: '建议' };
    var colors = { message: '#27ae60', issue: '#f66a0a', suggest: '#4a6fa5' };
    h += '<div class="card" style="position:relative">' +
      '<span style="position:absolute;top:10px;right:16px;font-size:11px;color:' + (colors[m.type]||'#999') + '">' + (labels[m.type]||m.type) + '</span>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">' + esc(m.author || '匿名') + '</div>' +
      '<p style="white-space:pre-wrap;line-height:1.7">' + esc(m.content) + '</p>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:8px">' + (m.createdAt ? m.createdAt.slice(0,10) : '-') + '</div>' +
      '</div>';
  });
  document.getElementById('msgList').innerHTML = h;
}

function loadPending() {
  api('GET', '/api/messages?type=pending').then(function(d) {
    var list = (d.messages || []).filter(function(m) { return m.status === 'pending'; });
    var h = '';
    if (list.length === 0) h = '暂无待审核';
    list.forEach(function(m) {
      h += '<div style="border-bottom:1px solid var(--border-light);padding:8px 0">' +
        '<div style="font-weight:500">' + esc(m.author || '匿名') + ' <span style="font-size:10px;color:var(--text-muted)">' + (m.type || 'message') + '</span></div>' +
        '<div style="font-size:12px;margin:4px 0">' + esc(m.content).substring(0, 60) + '</div>' +
        '<button class="btn-sm" onclick="approveMsg(' + m.id + ')" style="margin-right:4px">通过</button>' +
        '<button class="btn-sm danger" onclick="delMsg(' + m.id + ')">删除</button>' +
        '</div>';
    });
    document.getElementById('pendingList').innerHTML = h;
  });
}

function pickMsgType(type, btn) {
  msgTab = type;
  document.querySelectorAll('.msg-type-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  // 同步顶部tab高亮
  document.querySelectorAll('.msg-tab').forEach(function(b) { b.classList.remove('active'); });
  var topTab = document.querySelector('.msg-tab[data-key="' + type + '"]');
  if (topTab) topTab.classList.add('active');
  loadMessages();
}

function submitMsg() {
  var content = document.getElementById('msgContent').value.trim();
  var author = document.getElementById('msgAuthor').value.trim() || '匿名';
  if (!content) { toast('请输入内容', 'err'); return; }
  api('POST', '/api/messages', { content: content, author: author, type: msgTab }).then(function() {
    toast('提交成功，等待审核');
    document.getElementById('msgContent').value = '';
    loadMessages();
  }).catch(function(e) { toast(e.message, 'err'); });
}

function approveMsg(id) {
  api('PUT', '/api/messages/' + id + '/approve').then(function() {
    toast('已通过'); loadMessages(); loadPending();
  }).catch(function(e) { toast(e.message, 'err'); });
}

function delMsg(id) {
  if (!confirm('确定删除？')) return;
  api('DELETE', '/api/messages/' + id).then(function() {
    loadMessages(); loadPending(); toast('已删除');
  }).catch(function(e) { toast(e.message, 'err'); });
}
