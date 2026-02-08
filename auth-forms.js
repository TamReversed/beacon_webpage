/**
 * Login and register form submission via /api/login and /api/register.
 * Include on login.html and register.html. Uses credentials: 'include' for session cookie.
 */
(function () {
  'use strict';

  var loginForm = document.querySelector('.auth-form[data-action="login"]');
  var registerForm = document.querySelector('.auth-form[data-action="register"]');

  function showError(el, message) {
    var existing = el.querySelector('.auth-error');
    if (existing) existing.remove();
    var p = document.createElement('p');
    p.className = 'auth-error';
    p.style.color = 'var(--color-red)';
    p.style.fontSize = '0.9375rem';
    p.style.marginBottom = '1rem';
    p.textContent = message;
    el.insertBefore(p, el.firstChild);
  }

  function clearError(form) {
    var existing = form.querySelector('.auth-error');
    if (existing) existing.remove();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(loginForm);
      var email = loginForm.querySelector('input[name="email"]').value.trim();
      var password = loginForm.querySelector('input[name="password"]').value;
      var btn = loginForm.querySelector('button[type="submit"]');
      if (!email || !password) {
        showError(loginForm, 'Please enter email and password.');
        return;
      }
      btn.disabled = true;
      fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (res.ok) {
              window.location.href = 'dashboard.html';
            } else {
              showError(loginForm, data.error || 'Login failed.');
              btn.disabled = false;
            }
          });
        })
        .catch(function () {
          showError(loginForm, 'Something went wrong. Please try again.');
          btn.disabled = false;
        });
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(registerForm);
      var name = registerForm.querySelector('input[name="name"]').value.trim();
      var email = registerForm.querySelector('input[name="email"]').value.trim();
      var password = registerForm.querySelector('input[name="password"]').value;
      var btn = registerForm.querySelector('button[type="submit"]');
      if (!name || !email || !password) {
        showError(registerForm, 'Please fill in all fields.');
        return;
      }
      if (password.length < 8) {
        showError(registerForm, 'Password must be at least 8 characters.');
        return;
      }
      btn.disabled = true;
      fetch('/api/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, password: password }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (res.ok) {
              window.location.href = 'dashboard.html';
            } else {
              showError(registerForm, data.error || 'Registration failed.');
              btn.disabled = false;
            }
          });
        })
        .catch(function () {
          showError(registerForm, 'Something went wrong. Please try again.');
          btn.disabled = false;
        });
    });
  }
})();
