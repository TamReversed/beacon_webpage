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
          window.location.href = '/login?next=' + encodeURIComponent('/admin');
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
          tr.setAttribute('data-doc-id', String(doc.id));
          var created = doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '';

          var titleCell = document.createElement('td');
          var titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.className = 'doc-title';
          titleInput.value = doc.title || '';
          titleInput.setAttribute('data-id', String(doc.id));
          titleCell.appendChild(titleInput);
          tr.appendChild(titleCell);

          var descCell = document.createElement('td');
          var descInput = document.createElement('input');
          descInput.type = 'text';
          descInput.className = 'doc-description';
          descInput.value = (doc.description || '').toString();
          descInput.setAttribute('data-id', String(doc.id));
          descCell.appendChild(descInput);
          tr.appendChild(descCell);

          tr.appendChild(td(doc.original_name || doc.file_name || ''));
          tr.appendChild(td(created));

          var actionsCell = document.createElement('td');
          var downloadLink = document.createElement('a');
          downloadLink.href = '/api/documents/' + doc.id + '/download';
          downloadLink.target = '_blank';
          downloadLink.rel = 'noopener';
          downloadLink.textContent = 'Download';
          actionsCell.appendChild(downloadLink);
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-doc';
          saveBtn.setAttribute('data-id', String(doc.id));
          saveBtn.textContent = 'Save';
          actionsCell.appendChild(saveBtn);
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-outline btn-sm btn-delete-doc';
          delBtn.setAttribute('data-id', String(doc.id));
          delBtn.textContent = 'Delete';
          actionsCell.appendChild(delBtn);
          tr.appendChild(actionsCell);

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

  function loadCompanies() {
    return fetch('/api/admin/companies', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-companies');
        if (!tbody) return;
        clearEl(tbody);
        (data.companies || []).forEach(function (c) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-company-id', String(c.id));
          var nameCell = document.createElement('td');
          var nameInput = document.createElement('input');
          nameInput.type = 'text';
          nameInput.className = 'company-name-input';
          nameInput.setAttribute('data-id', String(c.id));
          nameInput.value = (c.name || '').toString();
          nameInput.style.cssText = 'width:100%;padding:0.35rem;';
          nameCell.appendChild(nameInput);
          tr.appendChild(nameCell);
          var logoCell = document.createElement('td');
          var logoInput = document.createElement('input');
          logoInput.type = 'text';
          logoInput.className = 'company-logo-input';
          logoInput.setAttribute('data-id', String(c.id));
          logoInput.value = (c.logo_url || '').toString();
          logoInput.placeholder = 'URL';
          logoInput.style.cssText = 'width:100%;max-width:180px;padding:0.35rem;';
          logoCell.appendChild(logoInput);
          tr.appendChild(logoCell);
          var orderCell = document.createElement('td');
          var orderInput = document.createElement('input');
          orderInput.type = 'number';
          orderInput.className = 'company-order-input';
          orderInput.setAttribute('data-id', String(c.id));
          orderInput.value = c.sort_order != null ? c.sort_order : 0;
          orderInput.style.cssText = 'width:4rem;padding:0.35rem;';
          orderCell.appendChild(orderInput);
          tr.appendChild(orderCell);
          var actCell = document.createElement('td');
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-company';
          saveBtn.setAttribute('data-id', String(c.id));
          saveBtn.textContent = 'Save';
          actCell.appendChild(saveBtn);
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-outline btn-sm btn-delete-company';
          delBtn.setAttribute('data-id', String(c.id));
          delBtn.textContent = 'Delete';
          delBtn.style.marginLeft = '0.25rem';
          actCell.appendChild(delBtn);
          tr.appendChild(actCell);
          tbody.appendChild(tr);
        });
      });
  }

  function loadTestimonials() {
    return fetch('/api/admin/testimonials', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-testimonials');
        if (!tbody) return;
        clearEl(tbody);
        (data.testimonials || []).forEach(function (t) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-testimonial-id', String(t.id));
          var quoteCell = document.createElement('td');
          var quoteInput = document.createElement('input');
          quoteInput.type = 'text';
          quoteInput.className = 'testimonial-quote-input';
          quoteInput.setAttribute('data-id', String(t.id));
          quoteInput.value = (t.quote || '').toString();
          quoteInput.style.cssText = 'width:100%;max-width:280px;padding:0.35rem;';
          quoteCell.appendChild(quoteInput);
          tr.appendChild(quoteCell);
          var authorCell = document.createElement('td');
          var authorInput = document.createElement('input');
          authorInput.type = 'text';
          authorInput.className = 'testimonial-author-input';
          authorInput.setAttribute('data-id', String(t.id));
          authorInput.value = (t.author_name || '').toString();
          authorInput.style.cssText = 'width:100%;padding:0.35rem;';
          authorCell.appendChild(authorInput);
          tr.appendChild(authorCell);
          var titleCell = document.createElement('td');
          var titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.className = 'testimonial-title-input';
          titleInput.setAttribute('data-id', String(t.id));
          titleInput.value = (t.author_title || '').toString();
          titleInput.style.cssText = 'width:100%;max-width:160px;padding:0.35rem;';
          titleCell.appendChild(titleInput);
          tr.appendChild(titleCell);
          var avatarCell = document.createElement('td');
          var avatarInput = document.createElement('input');
          avatarInput.type = 'text';
          avatarInput.className = 'testimonial-avatar-input';
          avatarInput.setAttribute('data-id', String(t.id));
          avatarInput.value = (t.avatar_url || '').toString();
          avatarInput.placeholder = 'URL';
          avatarInput.style.cssText = 'width:100%;max-width:140px;padding:0.35rem;';
          avatarCell.appendChild(avatarInput);
          tr.appendChild(avatarCell);
          var orderCell = document.createElement('td');
          var orderInput = document.createElement('input');
          orderInput.type = 'number';
          orderInput.className = 'testimonial-order-input';
          orderInput.setAttribute('data-id', String(t.id));
          orderInput.value = t.sort_order != null ? t.sort_order : 0;
          orderInput.style.cssText = 'width:4rem;padding:0.35rem;';
          orderCell.appendChild(orderInput);
          tr.appendChild(orderCell);
          var actCell = document.createElement('td');
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-testimonial';
          saveBtn.setAttribute('data-id', String(t.id));
          saveBtn.textContent = 'Save';
          actCell.appendChild(saveBtn);
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-outline btn-sm btn-delete-testimonial';
          delBtn.setAttribute('data-id', String(t.id));
          delBtn.textContent = 'Delete';
          delBtn.style.marginLeft = '0.25rem';
          actCell.appendChild(delBtn);
          tr.appendChild(actCell);
          tbody.appendChild(tr);
        });
      });
  }

  function loadDocs() {
    return fetch('/api/docs', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-docs-cms');
        clearEl(tbody);
        (data.docs || []).forEach(function (d) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-doc-id', String(d.id));
          var titleCell = document.createElement('td');
          var titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.className = 'cms-doc-title';
          titleInput.value = (d.title || '').toString();
          titleInput.style.cssText = 'width:100%;max-width:180px;padding:0.35rem;';
          titleCell.appendChild(titleInput);
          tr.appendChild(titleCell);
          var slugCell = document.createElement('td');
          var slugInput = document.createElement('input');
          slugInput.type = 'text';
          slugInput.className = 'cms-doc-slug';
          slugInput.value = (d.slug || '').toString();
          slugInput.style.cssText = 'width:100%;max-width:120px;padding:0.35rem;';
          slugCell.appendChild(slugInput);
          tr.appendChild(slugCell);
          var orderCell = document.createElement('td');
          var orderInput = document.createElement('input');
          orderInput.type = 'number';
          orderInput.className = 'cms-doc-order';
          orderInput.value = d.sort_order != null ? d.sort_order : 0;
          orderInput.style.cssText = 'width:4rem;padding:0.35rem;';
          orderCell.appendChild(orderInput);
          tr.appendChild(orderCell);
          var bodyCell = document.createElement('td');
          var bodyInput = document.createElement('textarea');
          bodyInput.className = 'cms-doc-body';
          bodyInput.rows = 2;
          bodyInput.value = (d.body || '').toString();
          bodyInput.style.cssText = 'width:100%;min-width:200px;padding:0.35rem;font-size:0.875rem;';
          bodyCell.appendChild(bodyInput);
          tr.appendChild(bodyCell);
          var actCell = document.createElement('td');
          var viewLink = document.createElement('a');
          viewLink.href = '/docs/' + (d.slug || '');
          viewLink.target = '_blank';
          viewLink.rel = 'noopener';
          viewLink.textContent = 'View';
          actCell.appendChild(viewLink);
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-doc-cms';
          saveBtn.setAttribute('data-id', String(d.id));
          saveBtn.textContent = 'Save';
          saveBtn.style.marginLeft = '0.5rem';
          actCell.appendChild(saveBtn);
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-outline btn-sm btn-delete-doc-cms';
          delBtn.setAttribute('data-id', String(d.id));
          delBtn.textContent = 'Delete';
          delBtn.style.marginLeft = '0.25rem';
          actCell.appendChild(delBtn);
          tr.appendChild(actCell);
          tbody.appendChild(tr);
        });
      });
  }

  function loadBlogPosts() {
    return fetch('/api/blog', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById('tbody-blog-cms');
        clearEl(tbody);
        (data.posts || []).forEach(function (p) {
          var tr = document.createElement('tr');
          tr.setAttribute('data-post-id', String(p.id));
          var titleCell = document.createElement('td');
          var titleInput = document.createElement('input');
          titleInput.type = 'text';
          titleInput.className = 'cms-blog-title';
          titleInput.value = (p.title || '').toString();
          titleInput.style.cssText = 'width:100%;max-width:180px;padding:0.35rem;';
          titleCell.appendChild(titleInput);
          tr.appendChild(titleCell);
          var slugCell = document.createElement('td');
          var slugInput = document.createElement('input');
          slugInput.type = 'text';
          slugInput.className = 'cms-blog-slug';
          slugInput.value = (p.slug || '').toString();
          slugInput.style.cssText = 'width:100%;max-width:120px;padding:0.35rem;';
          slugCell.appendChild(slugInput);
          tr.appendChild(slugCell);
          var authorCell = document.createElement('td');
          var authorInput = document.createElement('input');
          authorInput.type = 'text';
          authorInput.className = 'cms-blog-author';
          authorInput.value = (p.author_name || '').toString();
          authorInput.style.cssText = 'width:100%;max-width:120px;padding:0.35rem;';
          authorCell.appendChild(authorInput);
          tr.appendChild(authorCell);
          var pubCell = document.createElement('td');
          var pubInput = document.createElement('input');
          pubInput.type = 'text';
          pubInput.className = 'cms-blog-published';
          pubInput.value = (p.published_at || '').toString().slice(0, 19).replace('T', ' ');
          pubInput.placeholder = 'YYYY-MM-DD HH:MM';
          pubInput.style.cssText = 'width:100%;max-width:140px;padding:0.35rem;';
          pubCell.appendChild(pubInput);
          tr.appendChild(pubCell);
          var bodyCell = document.createElement('td');
          var bodyInput = document.createElement('textarea');
          bodyInput.className = 'cms-blog-body';
          bodyInput.rows = 2;
          bodyInput.value = (p.body || '').toString();
          bodyInput.style.cssText = 'width:100%;min-width:200px;padding:0.35rem;font-size:0.875rem;';
          bodyCell.appendChild(bodyInput);
          tr.appendChild(bodyCell);
          var actCell = document.createElement('td');
          var viewLink = document.createElement('a');
          viewLink.href = '/blog/' + (p.slug || '');
          viewLink.target = '_blank';
          viewLink.rel = 'noopener';
          viewLink.textContent = 'View';
          actCell.appendChild(viewLink);
          var saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn btn-primary btn-sm btn-save-blog-cms';
          saveBtn.setAttribute('data-id', String(p.id));
          saveBtn.textContent = 'Save';
          saveBtn.style.marginLeft = '0.5rem';
          actCell.appendChild(saveBtn);
          var delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'btn btn-outline btn-sm btn-delete-blog-cms';
          delBtn.setAttribute('data-id', String(p.id));
          delBtn.textContent = 'Delete';
          delBtn.style.marginLeft = '0.25rem';
          actCell.appendChild(delBtn);
          tr.appendChild(actCell);
          tbody.appendChild(tr);
        });
      });
  }

  checkAdmin().then(function (user) {
    if (!user) return;
    loadDocuments();
    loadUsers();
    loadIdeas();
    loadCompanies();
    loadTestimonials();
    loadDocs();
    loadBlogPosts();
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
    if (e.target.classList.contains('btn-save-doc')) {
      var id = e.target.getAttribute('data-id');
      var row = e.target.closest('tr');
      var titleInput = row.querySelector('.doc-title');
      var descInput = row.querySelector('.doc-description');
      var title = titleInput ? titleInput.value.trim() : '';
      var description = descInput ? descInput.value.trim() : '';
      fetch('/api/documents/' + id, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || undefined, description: description || undefined }),
      })
        .then(function (r) {
          if (r.ok) {
            e.target.textContent = 'Saved';
            setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
            showAdminMessage('Document updated.', false);
          } else return r.json().then(function (d) { throw new Error(d.error || 'Update failed'); });
        })
        .catch(function (err) { showAdminMessage(err.message || 'Update failed', true); });
      return;
    }
    if (e.target.classList.contains('btn-delete-doc')) {
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
    }
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

  var formAddCompany = document.getElementById('form-add-company');
  if (formAddCompany) {
    formAddCompany.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = formAddCompany.name.value.trim();
      var logo_url = formAddCompany.logo_url.value.trim() || null;
      var sort_order = parseInt(formAddCompany.sort_order.value, 10) || 0;
      fetch('/api/admin/companies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, logo_url: logo_url, sort_order: sort_order }),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then(function () {
          formAddCompany.reset();
          formAddCompany.sort_order.value = 0;
          loadCompanies();
          showAdminMessage('Company added.', false);
        })
        .catch(function (err) { showAdminMessage(err.message || 'Failed', true); });
    });
  }

  var formAddTestimonial = document.getElementById('form-add-testimonial');
  if (formAddTestimonial) {
    formAddTestimonial.addEventListener('submit', function (e) {
      e.preventDefault();
      var quote = formAddTestimonial.quote.value.trim();
      var author_name = formAddTestimonial.author_name.value.trim();
      var author_title = formAddTestimonial.author_title.value.trim();
      var avatar_url = formAddTestimonial.avatar_url.value.trim() || null;
      var sort_order = parseInt(formAddTestimonial.sort_order.value, 10) || 0;
      fetch('/api/admin/testimonials', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote: quote, author_name: author_name, author_title: author_title, avatar_url: avatar_url, sort_order: sort_order }),
      })
        .then(function (r) {
          if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
          return r.json();
        })
        .then(function () {
          formAddTestimonial.reset();
          formAddTestimonial.sort_order.value = 0;
          loadTestimonials();
          showAdminMessage('Testimonial added.', false);
        })
        .catch(function (err) { showAdminMessage(err.message || 'Failed', true); });
    });
  }

  document.getElementById('form-add-doc').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var title = form.title.value.trim();
    var slug = form.slug.value.trim() || undefined;
    var body = form.body.value;
    var sort_order = parseInt(form.sort_order.value, 10) || 0;
    if (!title) { showAdminMessage('Title is required.', true); return; }
    fetch('/api/admin/docs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, slug: slug, body: body, sort_order: sort_order }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        return r.json();
      })
      .then(function () {
        form.reset();
        form.sort_order.value = 0;
        loadDocs();
        showAdminMessage('Doc added.', false);
      })
      .catch(function (err) { showAdminMessage(err.message || 'Failed', true); });
  });

  document.getElementById('form-add-blog').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var title = form.title.value.trim();
    var slug = form.slug.value.trim() || undefined;
    var author_name = form.author_name.value.trim();
    var excerpt = form.excerpt.value.trim() || null;
    var body = form.body.value;
    if (!title) { showAdminMessage('Title is required.', true); return; }
    if (!author_name) { showAdminMessage('Author is required.', true); return; }
    fetch('/api/admin/blog', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, slug: slug, excerpt: excerpt, body: body, author_name: author_name }),
    })
      .then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || 'Failed'); });
        return r.json();
      })
      .then(function () {
        form.reset();
        loadBlogPosts();
        showAdminMessage('Blog post added.', false);
      })
      .catch(function (err) { showAdminMessage(err.message || 'Failed', true); });
  });

  document.getElementById('tbody-docs-cms').addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-save-doc-cms')) {
      var id = e.target.getAttribute('data-id');
      var row = e.target.closest('tr');
      var title = row.querySelector('.cms-doc-title').value.trim();
      var slug = row.querySelector('.cms-doc-slug').value.trim();
      var sort_order = parseInt(row.querySelector('.cms-doc-order').value, 10) || 0;
      var body = row.querySelector('.cms-doc-body').value;
      fetch('/api/admin/docs/' + id, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, slug: slug, sort_order: sort_order, body: body }),
      })
        .then(function (r) {
          if (r.ok) {
            e.target.textContent = 'Saved';
            setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
            showAdminMessage('Doc updated.', false);
          } else return r.json().then(function (d) { throw new Error(d.error || 'Update failed'); });
        })
        .catch(function (err) { showAdminMessage(err.message || 'Update failed', true); });
      return;
    }
    if (e.target.classList.contains('btn-delete-doc-cms')) {
      var id = e.target.getAttribute('data-id');
      if (!confirm('Delete this doc?')) return;
      fetch('/api/admin/docs/' + id, { method: 'DELETE', credentials: 'include' })
        .then(function (r) {
          if (r.status === 204) { loadDocs(); showAdminMessage('Doc deleted.', false); }
          else showAdminMessage('Delete failed', true);
        })
        .catch(function () { showAdminMessage('Delete failed', true); });
    }
  });

  document.getElementById('tbody-blog-cms').addEventListener('click', function (e) {
    if (e.target.classList.contains('btn-save-blog-cms')) {
      var id = e.target.getAttribute('data-id');
      var row = e.target.closest('tr');
      var title = row.querySelector('.cms-blog-title').value.trim();
      var slug = row.querySelector('.cms-blog-slug').value.trim();
      var author_name = row.querySelector('.cms-blog-author').value.trim();
      var published_at = row.querySelector('.cms-blog-published').value.trim() || undefined;
      var body = row.querySelector('.cms-blog-body').value;
      fetch('/api/admin/blog/' + id, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, slug: slug, author_name: author_name, published_at: published_at || undefined, body: body }),
      })
        .then(function (r) {
          if (r.ok) {
            e.target.textContent = 'Saved';
            setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
            showAdminMessage('Post updated.', false);
          } else return r.json().then(function (d) { throw new Error(d.error || 'Update failed'); });
        })
        .catch(function (err) { showAdminMessage(err.message || 'Update failed', true); });
      return;
    }
    if (e.target.classList.contains('btn-delete-blog-cms')) {
      var id = e.target.getAttribute('data-id');
      if (!confirm('Delete this post?')) return;
      fetch('/api/admin/blog/' + id, { method: 'DELETE', credentials: 'include' })
        .then(function (r) {
          if (r.status === 204) { loadBlogPosts(); showAdminMessage('Post deleted.', false); }
          else showAdminMessage('Delete failed', true);
        })
        .catch(function () { showAdminMessage('Delete failed', true); });
    }
  });

  var tbodyCompanies = document.getElementById('tbody-companies');
  if (tbodyCompanies) {
    tbodyCompanies.addEventListener('click', function (e) {
      var id = e.target.getAttribute('data-id');
      if (!id) return;
      if (e.target.classList.contains('btn-save-company')) {
        var row = e.target.closest('tr');
        var name = row.querySelector('.company-name-input').value.trim();
        var logo_url = row.querySelector('.company-logo-input').value.trim() || null;
        var sort_order = parseInt(row.querySelector('.company-order-input').value, 10) || 0;
        fetch('/api/admin/companies/' + id, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, logo_url: logo_url, sort_order: sort_order }),
        })
          .then(function (r) {
            if (r.ok) {
              e.target.textContent = 'Saved';
              setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
              showAdminMessage('Company updated.', false);
            } else {
              r.json().then(function (d) { showAdminMessage(d.error || 'Update failed', true); }).catch(function () { showAdminMessage('Update failed', true); });
            }
          })
          .catch(function () { showAdminMessage('Update failed', true); });
        return;
      }
      if (e.target.classList.contains('btn-delete-company')) {
        if (!confirm('Delete this company?')) return;
        fetch('/api/admin/companies/' + id, { method: 'DELETE', credentials: 'include' })
          .then(function (r) {
            if (r.status === 204) {
              loadCompanies();
              showAdminMessage('Company deleted.', false);
            } else showAdminMessage('Delete failed', true);
          })
          .catch(function () { showAdminMessage('Delete failed', true); });
      }
    });
  }

  var tbodyTestimonials = document.getElementById('tbody-testimonials');
  if (tbodyTestimonials) {
    tbodyTestimonials.addEventListener('click', function (e) {
      var id = e.target.getAttribute('data-id');
      if (!id) return;
      if (e.target.classList.contains('btn-save-testimonial')) {
        var row = e.target.closest('tr');
        var quote = row.querySelector('.testimonial-quote-input').value.trim();
        var author_name = row.querySelector('.testimonial-author-input').value.trim();
        var author_title = row.querySelector('.testimonial-title-input').value.trim();
        var avatar_url = row.querySelector('.testimonial-avatar-input').value.trim() || null;
        var sort_order = parseInt(row.querySelector('.testimonial-order-input').value, 10) || 0;
        fetch('/api/admin/testimonials/' + id, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote: quote, author_name: author_name, author_title: author_title, avatar_url: avatar_url, sort_order: sort_order }),
        })
          .then(function (r) {
            if (r.ok) {
              e.target.textContent = 'Saved';
              setTimeout(function () { e.target.textContent = 'Save'; }, 1500);
              showAdminMessage('Testimonial updated.', false);
            } else {
              r.json().then(function (d) { showAdminMessage(d.error || 'Update failed', true); }).catch(function () { showAdminMessage('Update failed', true); });
            }
          })
          .catch(function () { showAdminMessage('Update failed', true); });
        return;
      }
      if (e.target.classList.contains('btn-delete-testimonial')) {
        if (!confirm('Delete this testimonial?')) return;
        fetch('/api/admin/testimonials/' + id, { method: 'DELETE', credentials: 'include' })
          .then(function (r) {
            if (r.status === 204) {
              loadTestimonials();
              showAdminMessage('Testimonial deleted.', false);
            } else showAdminMessage('Delete failed', true);
          })
          .catch(function () { showAdminMessage('Delete failed', true); });
      }
    });
  }
})();
