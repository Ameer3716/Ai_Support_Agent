(function () {
  'use strict';

  var API = '/api/admin';
  var TOKEN_KEY = 'aisa_admin_token';

  var state = {
    token: localStorage.getItem(TOKEN_KEY) || null,
    clients: [],
    selectedClientId: null,
    selectedClient: null,
    activeTab: 'overview',
    conversations: [],
    selectedConversationId: null,
    activeDocForm: null, // 'text' | 'file' | 'url' | null
  };

  var els = {
    loginView: document.getElementById('login-view'),
    appView: document.getElementById('app-view'),
    loginPassword: document.getElementById('login-password'),
    loginBtn: document.getElementById('login-btn'),
    loginError: document.getElementById('login-error'),
    clientList: document.getElementById('client-list'),
    newClientBtn: document.getElementById('new-client-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    emptyState: document.getElementById('empty-state'),
    clientDetail: document.getElementById('client-detail'),
    modalRoot: document.getElementById('modal-root'),
    toastRoot: document.getElementById('toast-root'),
  };

  // ---------- utils ----------

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s === null || s === undefined ? '' : String(s);
    return div.innerHTML;
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    try {
      var d = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + 'Z');
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function showToast(msg, isError) {
    var t = document.createElement('div');
    t.className = 'toast';
    if (isError) t.style.background = '#b3492f';
    t.textContent = msg;
    els.toastRoot.appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast('Copied to clipboard'); });
    } else {
      showToast('Copy not supported in this browser', true);
    }
  }

  function closeModal() { els.modalRoot.innerHTML = ''; }

  function openModal(innerHtml, onMount) {
    els.modalRoot.innerHTML =
      '<div class="modal-overlay" id="modal-overlay"><div class="modal">' + innerHtml + '</div></div>';
    document.getElementById('modal-overlay').addEventListener('click', function (e) {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    if (onMount) onMount();
  }

  // ---------- API ----------

  function api(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {});
    if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      if (res.status === 401) {
        logout();
        throw new Error('Session expired - please log in again.');
      }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  // ---------- auth ----------

  function login() {
    var password = els.loginPassword.value;
    els.loginError.textContent = '';
    if (!password) return;
    els.loginBtn.disabled = true;
    fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (res) {
        els.loginBtn.disabled = false;
        if (!res.ok) {
          els.loginError.textContent = res.data.error || 'Login failed.';
          return;
        }
        state.token = res.data.token;
        localStorage.setItem(TOKEN_KEY, state.token);
        showApp();
      })
      .catch(function () {
        els.loginBtn.disabled = false;
        els.loginError.textContent = 'Could not reach the server.';
      });
  }

  function logout() {
    state.token = null;
    localStorage.removeItem(TOKEN_KEY);
    els.appView.classList.add('hidden');
    els.loginView.classList.remove('hidden');
    els.loginPassword.value = '';
  }

  function showApp() {
    els.loginView.classList.add('hidden');
    els.appView.classList.remove('hidden');
    loadClients();
  }

  // ---------- clients sidebar ----------

  function loadClients() {
    api('/clients')
      .then(function (clients) {
        state.clients = clients;
        renderClientList();
        if (state.selectedClientId) {
          var stillExists = clients.some(function (c) { return c.id === state.selectedClientId; });
          if (stillExists) selectClient(state.selectedClientId);
          else { state.selectedClientId = null; renderEmpty(); }
        } else if (clients.length) {
          selectClient(clients[0].id);
        } else {
          renderEmpty();
        }
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  function renderClientList() {
    if (state.clients.length === 0) {
      els.clientList.innerHTML = '<div class="empty-note">No clients yet.</div>';
      return;
    }
    els.clientList.innerHTML = state.clients
      .map(function (c) {
        var active = c.id === state.selectedClientId ? ' active' : '';
        var dotClass = c.is_active ? 'dot' : 'dot inactive';
        return (
          '<div class="client-item' + active + '" data-id="' + c.id + '">' +
          '<div><div class="name">' + escapeHtml(c.name) + '</div>' +
          '<div class="sub">' + c.stats.conversations + ' conversations · ' + c.stats.leads + ' leads</div></div>' +
          '<span class="' + dotClass + '"></span>' +
          '</div>'
        );
      })
      .join('');
    Array.prototype.forEach.call(els.clientList.querySelectorAll('.client-item'), function (el) {
      el.addEventListener('click', function () { selectClient(el.getAttribute('data-id')); });
    });
  }

  function renderEmpty() {
    els.emptyState.classList.remove('hidden');
    els.clientDetail.classList.add('hidden');
  }

  function selectClient(id) {
    state.selectedClientId = id;
    state.activeTab = 'overview';
    state.activeDocForm = null;
    renderClientList();
    api('/clients/' + id)
      .then(function (client) {
        state.selectedClient = client;
        els.emptyState.classList.add('hidden');
        els.clientDetail.classList.remove('hidden');
        renderClientDetail();
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  // ---------- new client modal ----------

  function openNewClientModal() {
    openModal(
      '<h2>New client</h2>' +
        '<div class="field"><label>Business name *</label><input id="nc-name" type="text" placeholder="e.g. Sunrise Dental Clinic" /></div>' +
        '<div class="field"><label>Owner email (optional)</label><input id="nc-email" type="email" placeholder="owner@business.com" /></div>' +
        '<div class="modal-actions">' +
        '<button class="btn secondary" id="nc-cancel">Cancel</button>' +
        '<button class="btn" id="nc-create">Create client</button>' +
        '</div>',
      function () {
        document.getElementById('nc-cancel').addEventListener('click', closeModal);
        document.getElementById('nc-name').focus();
        document.getElementById('nc-create').addEventListener('click', function () {
          var name = document.getElementById('nc-name').value.trim();
          var email = document.getElementById('nc-email').value.trim();
          if (!name) { showToast('Business name is required', true); return; }
          api('/clients', { method: 'POST', body: { name: name, ownerEmail: email || undefined } })
            .then(function (client) {
              closeModal();
              showToast('Client created');
              loadClients();
              state.selectedClientId = client.id;
            })
            .catch(function (err) { showToast(err.message, true); });
        });
      }
    );
  }

  // ---------- client detail ----------

  function renderClientDetail() {
    var c = state.selectedClient;
    var badge = c.is_active ? '<span class="badge active">Active</span>' : '<span class="badge inactive">Disabled</span>';

    els.clientDetail.innerHTML =
      '<div id="client-header">' +
      '<div><h1>' + escapeHtml(c.name) + badge + '</h1></div>' +
      '<div>' +
      '<button class="btn secondary" id="toggle-active-btn">' + (c.is_active ? 'Disable' : 'Enable') + '</button> ' +
      '<button class="btn danger" id="delete-client-btn">Delete</button>' +
      '</div>' +
      '</div>' +
      '<div class="tabs">' +
      tabButton('overview', 'Overview') +
      tabButton('knowledge', 'Knowledge Base') +
      tabButton('embed', 'Embed & Channels') +
      tabButton('conversations', 'Conversations') +
      tabButton('leads', 'Leads') +
      tabButton('settings', 'Settings') +
      '</div>' +
      '<div class="tab-panel active" id="tab-panel"></div>';

    document.getElementById('toggle-active-btn').addEventListener('click', function () {
      api('/clients/' + c.id, { method: 'PATCH', body: { isActive: c.is_active ? 0 : 1 } })
        .then(function () { showToast(c.is_active ? 'Client disabled' : 'Client enabled'); loadClients(); })
        .catch(function (err) { showToast(err.message, true); });
    });
    document.getElementById('delete-client-btn').addEventListener('click', function () {
      openModal(
        '<h2>Delete ' + escapeHtml(c.name) + '?</h2>' +
          '<p style="color:#6c6a5a;font-size:13px">This permanently deletes the client, its knowledge base, conversations, and leads. This cannot be undone.</p>' +
          '<div class="modal-actions"><button class="btn secondary" id="del-cancel">Cancel</button><button class="btn danger" id="del-confirm">Delete permanently</button></div>',
        function () {
          document.getElementById('del-cancel').addEventListener('click', closeModal);
          document.getElementById('del-confirm').addEventListener('click', function () {
            api('/clients/' + c.id, { method: 'DELETE' })
              .then(function () {
                closeModal();
                showToast('Client deleted');
                state.selectedClientId = null;
                loadClients();
              })
              .catch(function (err) { showToast(err.message, true); });
          });
        }
      );
    });

    Array.prototype.forEach.call(els.clientDetail.querySelectorAll('.tab-btn'), function (btn) {
      btn.addEventListener('click', function () {
        state.activeTab = btn.getAttribute('data-tab');
        renderClientDetail();
      });
    });

    renderTabPanel();
  }

  function tabButton(id, label) {
    var active = state.activeTab === id ? ' active' : '';
    return '<button class="tab-btn' + active + '" data-tab="' + id + '">' + label + '</button>';
  }

  function renderTabPanel() {
    var panel = document.getElementById('tab-panel');
    if (!panel) return;
    switch (state.activeTab) {
      case 'overview': return renderOverviewTab(panel);
      case 'knowledge': return renderKnowledgeTab(panel);
      case 'embed': return renderEmbedTab(panel);
      case 'conversations': return renderConversationsTab(panel);
      case 'leads': return renderLeadsTab(panel);
      case 'settings': return renderSettingsTab(panel);
    }
  }

  // ---------- Overview ----------

  function renderOverviewTab(panel) {
    var s = state.selectedClient.stats;
    panel.innerHTML =
      '<div class="card"><h3>At a glance</h3><div class="stat-grid">' +
      statBox(s.conversations, 'Conversations') +
      statBox(s.messages, 'Messages') +
      statBox(s.leads, 'Leads captured') +
      statBox(s.documents, 'Documents') +
      statBox(s.chunks, 'Knowledge chunks') +
      statBox(s.messagesToday, "Messages today") +
      statBox(s.resolvedWithoutHandoffPct === null ? '-' : s.resolvedWithoutHandoffPct + '%', 'Handled without handoff') +
      '</div></div>' +
      '<div class="card"><h3>Quick tips</h3>' +
      '<p style="margin:0;color:#6c6a5a;font-size:13px;line-height:1.6">' +
      'Add FAQ content in the <b>Knowledge Base</b> tab, grab the embed snippet from <b>Embed & Channels</b>, and paste it on the client\'s site. ' +
      'Watch real conversations under <b>Conversations</b> and follow up on captured contacts under <b>Leads</b>.' +
      '</p></div>';
  }

  function statBox(num, label) {
    return '<div class="stat-box"><div class="num">' + escapeHtml(num) + '</div><div class="label">' + escapeHtml(label) + '</div></div>';
  }

  // ---------- Knowledge base ----------

  function renderKnowledgeTab(panel) {
    var clientId = state.selectedClient.id;
    panel.innerHTML =
      '<div class="card">' +
      '<h3>Add knowledge</h3>' +
      '<div class="doc-add-row">' +
      docFormToggleBtn('text', 'Paste text') +
      docFormToggleBtn('file', 'Upload file (PDF/TXT/MD)') +
      docFormToggleBtn('url', 'Add from URL') +
      '</div>' +
      '<div id="doc-form-area"></div>' +
      '</div>' +
      '<div class="card"><h3>Documents</h3><div id="doc-list-area">Loading…</div></div>';

    Array.prototype.forEach.call(panel.querySelectorAll('[data-docform]'), function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-docform');
        state.activeDocForm = state.activeDocForm === type ? null : type;
        renderKnowledgeTab(panel);
      });
    });
    renderDocForm(document.getElementById('doc-form-area'), clientId);
    loadDocuments(clientId);
  }

  function docFormToggleBtn(type, label) {
    var active = state.activeDocForm === type ? ' active' : '';
    return '<button class="btn secondary' + active + '" data-docform="' + type + '">' + label + '</button>';
  }

  function renderDocForm(area, clientId) {
    if (!state.activeDocForm) { area.innerHTML = ''; return; }

    if (state.activeDocForm === 'text') {
      area.innerHTML =
        '<div class="field"><label>Title</label><input id="doc-title" type="text" placeholder="e.g. FAQ" /></div>' +
        '<div class="field"><label>Content</label><textarea id="doc-text" rows="6" placeholder="Paste FAQ, policies, pricing, hours, anything the bot should know..."></textarea></div>' +
        '<button class="btn" id="doc-submit-text">Add to knowledge base</button>';
      document.getElementById('doc-submit-text').addEventListener('click', function () {
        var title = document.getElementById('doc-title').value.trim();
        var text = document.getElementById('doc-text').value.trim();
        if (!text) { showToast('Paste some text first', true); return; }
        submitDoc(clientId, api('/clients/' + clientId + '/documents/text', { method: 'POST', body: { title: title, text: text } }));
      });
    } else if (state.activeDocForm === 'file') {
      area.innerHTML =
        '<div class="field"><label>File (PDF, TXT, MD, CSV - max 15MB)</label><input id="doc-file" type="file" accept=".pdf,.txt,.md,.csv" /></div>' +
        '<button class="btn" id="doc-submit-file">Upload &amp; index</button>';
      document.getElementById('doc-submit-file').addEventListener('click', function () {
        var fileInput = document.getElementById('doc-file');
        if (!fileInput.files.length) { showToast('Choose a file first', true); return; }
        var fd = new FormData();
        fd.append('file', fileInput.files[0]);
        submitDoc(clientId, api('/clients/' + clientId + '/documents/file', { method: 'POST', body: fd }));
      });
    } else if (state.activeDocForm === 'url') {
      area.innerHTML =
        '<div class="field"><label>URL</label><input id="doc-url" type="text" placeholder="https://example.com/faq" /></div>' +
        '<button class="btn" id="doc-submit-url">Fetch &amp; index</button>';
      document.getElementById('doc-submit-url').addEventListener('click', function () {
        var url = document.getElementById('doc-url').value.trim();
        if (!url) { showToast('Enter a URL first', true); return; }
        submitDoc(clientId, api('/clients/' + clientId + '/documents/url', { method: 'POST', body: { url: url } }));
      });
    }
  }

  function submitDoc(clientId, promise) {
    showToast('Indexing… this can take a few seconds');
    promise
      .then(function () {
        showToast('Added to knowledge base');
        state.activeDocForm = null;
        renderKnowledgeTab(document.getElementById('tab-panel'));
        refreshSelectedClientStats();
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  function loadDocuments(clientId) {
    api('/clients/' + clientId + '/documents')
      .then(function (docs) {
        var area = document.getElementById('doc-list-area');
        if (!area) return;
        if (docs.length === 0) {
          area.innerHTML = '<div class="empty-note">No documents yet - add your first one above.</div>';
          return;
        }
        area.innerHTML =
          '<table><thead><tr><th>Title</th><th>Type</th><th>Size</th><th>Added</th><th></th></tr></thead><tbody>' +
          docs
            .map(function (d) {
              return (
                '<tr><td>' + escapeHtml(d.title || d.source) + '</td>' +
                '<td><span class="pill ' + d.source_type + '">' + d.source_type + '</span></td>' +
                '<td>' + (d.char_count || 0).toLocaleString() + ' chars</td>' +
                '<td>' + fmtDate(d.created_at) + '</td>' +
                '<td><button class="btn danger" data-del-doc="' + d.id + '" style="padding:4px 10px">Delete</button></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>';
        Array.prototype.forEach.call(area.querySelectorAll('[data-del-doc]'), function (btn) {
          btn.addEventListener('click', function () {
            api('/documents/' + btn.getAttribute('data-del-doc'), { method: 'DELETE' })
              .then(function () { showToast('Document removed'); loadDocuments(clientId); refreshSelectedClientStats(); })
              .catch(function (err) { showToast(err.message, true); });
          });
        });
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  function refreshSelectedClientStats() {
    var id = state.selectedClient.id;
    api('/clients/' + id).then(function (c) { state.selectedClient = c; }).catch(function () {});
  }

  // ---------- Embed & Channels ----------

  function renderEmbedTab(panel) {
    panel.innerHTML = '<div class="card">Loading…</div>';
    api('/clients/' + state.selectedClient.id + '/embed-snippet')
      .then(function (data) {
        panel.innerHTML =
          '<div class="card">' +
          '<h3>Website widget</h3>' +
          '<p style="color:#6c6a5a;font-size:13px;margin-top:0">Paste this snippet right before <code>&lt;/body&gt;</code> on the client\'s website.</p>' +
          '<div class="snippet-box">' + escapeHtml(data.snippet) + '</div>' +
          '<div class="copy-row"><button class="btn secondary" id="copy-snippet">Copy snippet</button></div>' +
          '</div>' +
          '<div class="card">' +
          '<h3>WhatsApp (via Twilio)</h3>' +
          '<p style="color:#6c6a5a;font-size:13px;margin-top:0">In the Twilio console, set this as the WhatsApp sender\'s "when a message comes in" webhook.</p>' +
          '<div class="snippet-box">' + escapeHtml(data.whatsappWebhook) + '</div>' +
          '<div class="copy-row"><button class="btn secondary" id="copy-webhook">Copy webhook URL</button></div>' +
          '</div>' +
          '<div class="card">' +
          '<h3>Instagram DMs (via Meta)</h3>' +
          '<p style="color:#6c6a5a;font-size:13px;margin-top:0">One shared webhook URL handles every client - register it once in your Meta App\'s dashboard, then connect this client\'s Instagram Page ID + Page Access Token under Settings.</p>' +
          '<div class="snippet-box">' + escapeHtml(data.instagramWebhook) + '</div>' +
          '<div class="copy-row"><button class="btn secondary" id="copy-ig-webhook">Copy webhook URL</button></div>' +
          '</div>' +
          '<div class="card">' +
          '<h3>Automation / API access</h3>' +
          '<p style="color:#6c6a5a;font-size:13px;margin-top:0">Use this client\'s admin secret to push knowledge-base updates from n8n, Make, or Zapier without exposing your own operator login.</p>' +
          '<div class="field"><label>Client key (public)</label><input type="text" readonly value="' + escapeHtml(data.clientKey) + '" /></div>' +
          '<div class="field"><label>Admin secret (private - keep safe)</label><input type="text" readonly value="' + escapeHtml(data.adminSecret) + '" /></div>' +
          '<button class="btn secondary" id="rotate-secret-btn">Rotate secret</button>' +
          '</div>';

        document.getElementById('copy-snippet').addEventListener('click', function () { copyToClipboard(data.snippet); });
        document.getElementById('copy-webhook').addEventListener('click', function () { copyToClipboard(data.whatsappWebhook); });
        document.getElementById('copy-ig-webhook').addEventListener('click', function () { copyToClipboard(data.instagramWebhook); });
        document.getElementById('rotate-secret-btn').addEventListener('click', function () {
          openModal(
            '<h2>Rotate admin secret?</h2>' +
              '<p style="color:#6c6a5a;font-size:13px">Any existing automations (n8n/Make/Zapier) using the old secret will stop working until updated.</p>' +
              '<div class="modal-actions"><button class="btn secondary" id="rot-cancel">Cancel</button><button class="btn" id="rot-confirm">Rotate</button></div>',
            function () {
              document.getElementById('rot-cancel').addEventListener('click', closeModal);
              document.getElementById('rot-confirm').addEventListener('click', function () {
                api('/clients/' + state.selectedClient.id + '/rotate-secret', { method: 'POST' })
                  .then(function () { closeModal(); showToast('Secret rotated'); renderEmbedTab(panel); })
                  .catch(function (err) { showToast(err.message, true); });
              });
            }
          );
        });
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  // ---------- Conversations ----------

  function renderConversationsTab(panel) {
    panel.innerHTML = '<div class="card conv-layout"><div class="conv-list-col" id="conv-list">Loading…</div><div class="conv-thread" id="conv-thread"><div class="empty-note">Select a conversation to view messages.</div></div></div>';
    api('/clients/' + state.selectedClient.id + '/conversations')
      .then(function (convs) {
        state.conversations = convs;
        var list = document.getElementById('conv-list');
        if (!list) return;
        if (convs.length === 0) {
          list.innerHTML = '<div class="empty-note">No conversations yet.</div>';
          return;
        }
        list.innerHTML = convs
          .map(function (c) {
            var active = c.id === state.selectedConversationId ? ' active' : '';
            var channelLabel = c.channel === 'whatsapp' ? 'WhatsApp' : c.channel === 'instagram' ? 'Instagram' : 'Website';
            return (
              '<div class="conv-list-item' + active + '" data-id="' + c.id + '">' +
              '<div class="meta">' + channelLabel + (c.escalated ? ' · escalated' : '') + ' · ' + fmtDate(c.last_message_at) + '</div>' +
              '<div class="snippet">' + escapeHtml(c.last_message || '(no messages)') + '</div>' +
              '</div>'
            );
          })
          .join('');
        Array.prototype.forEach.call(list.querySelectorAll('.conv-list-item'), function (el) {
          el.addEventListener('click', function () {
            state.selectedConversationId = el.getAttribute('data-id');
            renderConversationsTab(panel);
          });
        });
        if (state.selectedConversationId) loadConversationThread(state.selectedConversationId);
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  function loadConversationThread(convId) {
    api('/conversations/' + convId + '/messages')
      .then(function (messages) {
        var thread = document.getElementById('conv-thread');
        if (!thread) return;
        if (messages.length === 0) {
          thread.innerHTML = '<div class="empty-note">No messages.</div>';
          return;
        }
        thread.innerHTML = messages
          .map(function (m) {
            return '<div class="thread-msg ' + m.role + '">' + escapeHtml(m.content) + '</div>';
          })
          .join('');
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  // ---------- Leads ----------

  function downloadLeadsCsv() {
    var clientId = state.selectedClient.id;
    fetch(API + '/clients/' + clientId + '/leads.csv', {
      headers: { Authorization: 'Bearer ' + state.token },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Export failed.');
        return res.blob();
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (state.selectedClient.name || 'leads').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-leads.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  function renderLeadsTab(panel) {
    panel.innerHTML =
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center">' +
      '<h3 style="margin:0">Leads</h3><button class="btn secondary" id="export-leads-btn">Export CSV</button>' +
      '</div><div id="leads-area">Loading…</div></div>';
    document.getElementById('export-leads-btn').addEventListener('click', downloadLeadsCsv);
    api('/clients/' + state.selectedClient.id + '/leads')
      .then(function (leads) {
        var area = document.getElementById('leads-area');
        if (!area) return;
        if (leads.length === 0) {
          area.innerHTML = '<div class="empty-note">No leads captured yet.</div>';
          return;
        }
        area.innerHTML =
          '<table><thead><tr><th>Name</th><th>Contact</th><th>Message</th><th>Reason</th><th>Received</th><th>Status</th></tr></thead><tbody>' +
          leads
            .map(function (l) {
              return (
                '<tr><td>' + escapeHtml(l.name || '-') + '</td>' +
                '<td>' + escapeHtml(l.contact) + '</td>' +
                '<td style="max-width:220px">' + escapeHtml(l.message || '-') + '</td>' +
                '<td>' + escapeHtml(l.reason) + '</td>' +
                '<td>' + fmtDate(l.created_at) + '</td>' +
                '<td><select data-lead-status="' + l.id + '">' +
                ['new', 'contacted', 'closed']
                  .map(function (s) { return '<option value="' + s + '"' + (s === l.status ? ' selected' : '') + '>' + s + '</option>'; })
                  .join('') +
                '</select></td></tr>'
              );
            })
            .join('') +
          '</tbody></table>';
        Array.prototype.forEach.call(area.querySelectorAll('[data-lead-status]'), function (sel) {
          sel.addEventListener('change', function () {
            api('/leads/' + sel.getAttribute('data-lead-status'), { method: 'PATCH', body: { status: sel.value } })
              .then(function () { showToast('Lead updated'); })
              .catch(function (err) { showToast(err.message, true); });
          });
        });
      })
      .catch(function (err) { showToast(err.message, true); });
  }

  // ---------- Settings ----------

  function renderSettingsTab(panel) {
    var c = state.selectedClient;
    panel.innerHTML =
      '<div class="card">' +
      '<h3>Branding &amp; behavior</h3>' +
      field('s-name', 'Business name', c.name) +
      field('s-welcome', 'Welcome message', c.welcome_message) +
      '<div class="field-row">' +
      field('s-color', 'Brand color (hex)', c.brand_color) +
      field('s-position', 'Widget position', c.widget_position) +
      '</div>' +
      field('s-logo', 'Logo URL (optional)', c.logo_url) +
      textareaField('s-prompt', 'Extra instructions for the assistant', c.system_prompt) +
      '</div>' +
      '<div class="card">' +
      '<h3>Access &amp; limits</h3>' +
      field('s-origins', 'Allowed website origins (comma-separated, blank = any)', c.allowed_origins) +
      '<div class="field-row">' +
      field('s-quota', 'Daily message quota', c.daily_message_quota) +
      field('s-whatsapp', 'WhatsApp number (Twilio)', c.whatsapp_number) +
      '</div>' +
      '<div class="field-row">' +
      field('s-ig-id', 'Instagram Page ID', c.instagram_page_id) +
      field('s-ig-token', 'Instagram Page Access Token', c.instagram_page_token) +
      '</div>' +
      field('s-owner', 'Owner email', c.owner_email) +
      field('s-handoff', 'Handoff notification email (defaults to owner email)', c.handoff_email) +
      '</div>' +
      '<button class="btn" id="save-settings-btn">Save changes</button>';

    document.getElementById('save-settings-btn').addEventListener('click', function () {
      var body = {
        name: document.getElementById('s-name').value.trim(),
        welcomeMessage: document.getElementById('s-welcome').value,
        brandColor: document.getElementById('s-color').value.trim(),
        widgetPosition: document.getElementById('s-position').value.trim() || 'bottom-right',
        logoUrl: document.getElementById('s-logo').value.trim(),
        systemPrompt: document.getElementById('s-prompt').value,
        allowedOrigins: document.getElementById('s-origins').value.trim(),
        dailyMessageQuota: (function () {
          var n = parseInt(document.getElementById('s-quota').value, 10);
          return Number.isNaN(n) ? 500 : n;
        })(),
        whatsappNumber: document.getElementById('s-whatsapp').value.trim(),
        instagramPageId: document.getElementById('s-ig-id').value.trim(),
        instagramPageToken: document.getElementById('s-ig-token').value.trim(),
        ownerEmail: document.getElementById('s-owner').value.trim(),
        handoffEmail: document.getElementById('s-handoff').value.trim(),
      };
      api('/clients/' + c.id, { method: 'PATCH', body: body })
        .then(function (updated) {
          state.selectedClient = updated;
          showToast('Settings saved');
          loadClients();
        })
        .catch(function (err) { showToast(err.message, true); });
    });
  }

  function field(id, label, value) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><input id="' + id + '" type="text" value="' + escapeHtml(value || '') + '" /></div>';
  }
  function textareaField(id, label, value) {
    return '<div class="field"><label>' + escapeHtml(label) + '</label><textarea id="' + id + '" rows="3">' + escapeHtml(value || '') + '</textarea></div>';
  }

  // ---------- wire up ----------

  els.loginBtn.addEventListener('click', login);
  els.loginPassword.addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
  els.logoutBtn.addEventListener('click', logout);
  els.newClientBtn.addEventListener('click', openNewClientModal);

  if (state.token) showApp();
})();
