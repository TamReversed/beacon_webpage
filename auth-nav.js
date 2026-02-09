/**
 * Auth nav: on load, fetch /api/me and show Log in/Register or Dashboard/Log out.
 * Include this script on every page. Uses credentials: 'include' so session cookie is sent.
 * If the page is opened via file://, API calls fail (CORS); we show a message to use the server URL.
 */
(function () {
  'use strict';

  if (window.location.protocol === 'file:') {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#0F172A;color:#F8FAFC;padding:0.75rem 1.5rem;font-size:0.9375rem;text-align:center;';
    banner.textContent = 'Beacon must be opened through the server. Run "npm start" and open ';
    var link = document.createElement('a');
    link.href = 'http://localhost:3000';
    link.textContent = 'http://localhost:3000';
    link.style.color = '#0EA5E9';
    banner.appendChild(link);
    banner.appendChild(document.createTextNode(' in your browser.'));
    document.body.insertBefore(banner, document.body.firstChild);
    return;
  }

  var navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  var defaultContent = navActions.cloneNode(true);

  function setLoggedOut() {
    navActions.innerHTML = defaultContent.innerHTML;
  }

  function setLoggedIn(user) {
    var name = (user && (user.name || user.email)) ? user.name || user.email : 'Account';
    navActions.textContent = '';

    var library = document.createElement('a');
    library.href = '/library';
    library.textContent = 'Library';
    navActions.appendChild(library);

    var dash = document.createElement('a');
    dash.href = '/dashboard';
    dash.textContent = 'Dashboard';
    navActions.appendChild(dash);

    if (user && user.role === 'admin') {
      var admin = document.createElement('a');
      admin.href = '/admin';
      admin.textContent = 'Admin';
      navActions.appendChild(admin);
    }

    var span = document.createElement('span');
    span.className = 'nav-user';
    span.style.cssText = 'color: var(--color-gray-300); font-size: 0.9375rem;';
    span.textContent = name;
    navActions.appendChild(span);

    var logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.id = 'logout-btn';
    logoutBtn.style.padding = '0.5rem 1rem';
    logoutBtn.style.fontSize = '0.9375rem';
    logoutBtn.textContent = 'Log out';
    logoutBtn.addEventListener('click', function () {
      logoutBtn.disabled = true;
      fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }).then(function () {
        window.location.href = '/';
      }).catch(function () {
        logoutBtn.disabled = false;
      });
    });
    navActions.appendChild(logoutBtn);
  }

  fetch('/api/me', { credentials: 'include' })
    .then(function (res) {
      if (res.ok) return res.json();
      setLoggedOut();
    })
    .then(function (data) {
      if (data && data.user) setLoggedIn(data.user);
      else setLoggedOut();
    })
    .catch(function () {
      setLoggedOut();
    });
})();
