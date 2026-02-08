/**
 * Admin panel: guard, load documents/users/ideas, forms and save handlers.
 */
(function () {
  'use strict';

  var adminContent = document.getElementById('admin-content');
  var adminDenied = document.getElementById('admin-denied');
  var adminMessageEl = document.getElementById('admin-message');
  var adminMessageTimer = null;

  function showAdminMessage(text, isError) {
    if (!adminMessageEl) return;
    if (adminMessageTimer) clearTimeout(adminMessageTimer);
    adminMessageEl.textContent = text;
    adminMessageEl.className = 'admin-message admin-message--' + (isError ? 'error' : 'success');
    adminMessageEl.style.display = 'block';
    adminMessageTimer = setTimeout(function () {
      adminMessageEl.style.display = 'none';
      adminMessageEl.textContent = '';
      adminMessageTimer = null;
    }, 5000);
  }

  function clearEl(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function td(text) {
    var cell = document.createElement('td');
    cell.textContent = text == null ? '' : String(text);
    return cell;
  }

  function checkAdmin() {
    return fetch('/api/me', { credentials: 'include' })
      .then(function (res) {
        if (res.status === 401) {
          window.location.href = 'login.html?next=' + encodeURIComponent('/admin');
          return null;
        }
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.user) return null;
        if (data.user.role !== 'admin') {
          adminContent.style.display = 'none';
          adminDenied.style.display = 'block';
          return null;
        }
        adminDenied.style.display = 'none';
        adminContent.style.display = 'block';
        return data.user;
      });
  }

  function loadDocuments() {
    return fetch('/api/documents', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-documents');
        clearEl(tbody);
        (data.documents || []).forEach(function (doc) {
          var tr = document.createElement('tr');
          var created = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '';
          tr.appendChild(td(doc.title || ''));
          tr.appendChild(td(doc.original_name || doc.file_name || ''));
          tr.appendChild(td(created));
          var btnCell = document.createElement('td');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-outline btn-sm btn-delete-doc';
          btn.setAttribute('data-id', String(doc.id));
          btn.textContent = 'Delete';
          btnCell.appendChild(btn);
          tr.appendChild(btnCell);
          tbody.appendChild(tr);
        });
      });
  }

  function loadUsers() {
    return fetch('/api/admin/users', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-users');
        clearEl(tbody);
        (data.users || []).forEach(function (u) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-user-id', String(u.id));
          tr.appendChild(td(u.email));
          tr.appendChild(td(u.name || ''));
          var roleCell = document.createElement('td');
          var roleSelect = document.createElement('select');
          roleSelect.className = 'user-role';
          roleSelect.setAttribute('data-id', String(u.id));
          ['user', 'admin'].forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            if (u.role === v) opt.selected = true;
            roleSelect.appendChild(opt);
          });
          roleCell.appendChild(roleSelect);
          tr.appendChild(roleCell);
          var planCell = document.createElement('td');
          var planSelect = document.createElement('select');
          planSelect.className = 'user-plan';
          planSelect.setAttribute('data-id', String(u.id));
          ['free', 'pro'].forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            if (u.plan === v) opt.selected = true;
            planSelect.appendChild(opt);
          });
          planCell.appendChild(planSelect);
          tr.appendChild(planCell);
          tr.appendChild(td(u.created_at ? new Date(u.created_at).toLocaleDateString() : ''));
          var saveCell = document.createElement('td');
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-user';
          saveBtn.setAttribute('data-id', String(u.id));
          saveBtn.textContent = 'Save';
          saveCell.appendChild(saveBtn);
          tr.appendChild(saveCell);
          tbody.appendChild(tr);
        });
      });
  }

  function loadIdeas() {
    return fetch('/api/ideas', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-ideas');
        clearEl(tbody);
        (data.ideas || []).forEach(function (idea) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-idea-id', String(idea.id));
          var author = (idea.user_name || idea.user_email || 'Unknown').toString();
          var created = idea.created_at ? new Date(idea.created_at).toLocaleDateString() : '';
          tr.appendChild(td(idea.title || ''));
          tr.appendChild(td(author));
          var statusCell = document.createElement('td');
          var statusSelect = document.createElement('select');
          statusSelect.className = 'idea-status';
          statusSelect.setAttribute('data-id', String(idea.id));
          ['pending', 'approved', 'rejected'].forEach(function (v) {
            var opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            if (idea.status === v) opt.selected = true;
            statusSelect.appendChild(opt);
          });
          statusCell.appendChild(statusSelect);
          tr.appendChild(statusCell);
          var notesCell = document.createElement('td');
          var notesInput = document.createElement('input');
          notesInput.type = 'text';
          notesInput.className = 'idea-notes-input';
          notesInput.setAttribute('data-id', String(idea.id));
          notesInput.value = (idea.admin_notes || '').toString();
          notesInput.placeholder = 'Admin notes';
          notesInput.style.cssText = 'width:100%;max-width:200px;padding:0.35rem;';
          notesCell.appendChild(notesInput);
          tr.appendChild(notesCell);
          tr.appendChild(td(created));
          var saveCell = document.createElement('td');
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-idea';
          saveBtn.setAttribute('data-id', String(idea.id));
          saveBtn.textContent = 'Save';
          saveCell.appendChild(saveBtn);
          tr.appendChild(saveCell);
          tbody.appendChild(tr);
        });
      });
  }

  checkAdmin().then(function (user) {
    if (!user) return;
    loadDocuments();
    loadUsers();
    loadIdeas();
  });

  document.getElementById('form-add-document').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var fd = new FormData();
    fd.append('title', form.title.value.trim());
    if (form.description.value.trim()) fd.append('description', form.description.value.trim());
    fd.append('file', form.file.files[0]);
    fetch('/api/documents', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Upload failed'); });
        return r.json();
      })
      .then(function () {
        form.reset();
        loadDocuments();
        showAdminMessage('Document uploaded.', false);
      })
      .catch(function (err) {
        showAdminMessage(err.message || 'Upload failed', true);
      });
  });

  document.getElementById('tbody-documents').addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-delete-doc')) return;
    var id = e.target.getAttribute('data-id');
    if (!confirm('Delete this document?')) return;
    fetch('/api/documents/' + id, { method: 'DELETE', credentials: 'include' })
      .then(function (r) {
        if (r.status === 204) {
          loadDocuments();
          showAdminMessage('Document deleted.', false);
        } else showAdminMessage('Delete failed', true);
      })
      .catch(function () { showAdminMessage('Delete failed', true); });
  });

  document.getElementById('tbody-users').addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-save-user')) return;
    var id = e.target.getAttribute('data-id');
    var row = e.target.closest('tr');
    var role = row.querySelector('.user-role').value;
    var plan = row.querySelector('.user-plan').value;
    fetch('/api/admin/users/' + id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: role, plan: plan }),
    })
      .then(function (r) {
        if (r.ok) {
          e.target.textContent = 'Saved';
          setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
          showAdminMessage('User updated.', false);
        } else {
          r.json().then(function (d) { showAdminMessage(d.error || 'Update failed', true); }).catch(function () { showAdminMessage('Update failed', true); });
        }
      })
      .catch(function () { showAdminMessage('Update failed', true); });
  });

  document.getElementById('tbody-ideas').addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-save-idea')) return;
    var id = e.target.getAttribute('data-id');
    var row = e.target.closest('tr');
    var status = row.querySelector('.idea-status').value;
    var admin_notes = row.querySelector('.idea-notes-input').value.trim();
    fetch('/api/ideas/' + id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: status, admin_notes: admin_notes || '' }),
    })
      .then(function (r) {
        if (r.ok) {
          e.target.textContent = 'Saved';
          setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
          showAdminMessage('Idea updated.', false);
        } else {
          r.json().then(function (d) { showAdminMessage(d.error || 'Update failed', true); }).catch(function () { showAdminMessage('Update failed', true); });
        }
      })
      .catch(function () { showAdminMessage('Update failed', true); });
  });
})();
