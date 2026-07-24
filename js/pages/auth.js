(function () {
  'use strict';

  var AUTH_KEY = 'leafUser';

  // ================================================================
  // TOAST
  // ================================================================
  function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    var bg = type === 'error' ? 'var(--c-error)' : 'var(--c-primary)';
    toast.style.cssText =
      'background:' +
      bg +
      ';color:#fff;padding:12px 20px;border-radius:12px;font-size:0.875rem;margin-bottom:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:slideIn 0.3s ease, fadeOut 0.3s ease 2.5s forwards';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.remove();
    }, 3000);
  }

  // ================================================================
  // SAFE STORAGE
  // ================================================================
  var safeStorage = {
    getJSON: function (key, fallback) {
      try {
        var v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    setJSON: function (key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  // ================================================================
  // VALIDATION HELPERS
  // ================================================================
  function setError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearErrors() {
    document.querySelectorAll('.field-error').forEach(function (e) {
      e.textContent = '';
    });
    document
      .querySelectorAll('.floating-input.is-invalid, .floating-input.is-valid')
      .forEach(function (e) {
        e.classList.remove('is-invalid', 'is-valid');
      });
  }

  function markInvalid(inputId, errorId, msg) {
    var input = document.getElementById(inputId);
    if (input) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
    }
    setError(errorId, msg);
  }

  function markValid(inputId, errorId) {
    var input = document.getElementById(inputId);
    if (input) {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
    }
    setError(errorId, '');
  }

  // ================================================================
  // TAB SWITCHING
  // ================================================================
  var currentTab = 'login';

  function switchTab(tab) {
    if (tab === currentTab) return;
    currentTab = tab;

    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(function (t) {
      var isActive = t.dataset.tab === tab;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive);
    });

    // Update panels — clear inline styles first so CSS class takes effect
    document.querySelectorAll('.auth-panel').forEach(function (p) {
      p.style.display = '';
      p.classList.toggle('active', p.id === 'panel-' + tab);
    });

    // Re-trigger staggered field animations on the active panel
    requestAnimationFrame(function () {
      document.querySelectorAll('#panel-' + tab + ' .auth-field').forEach(function (f) {
        f.style.animation = 'none';
        void f.offsetHeight; // force reflow
        f.style.animation = '';
      });
    });

    // Update header
    var title = document.getElementById('form-title');
    var subtitle = document.getElementById('form-subtitle');
    if (tab === 'login') {
      title.textContent = 'Welcome Back';
      subtitle.textContent = 'Sign in to your Ankuram account.';
    } else {
      title.textContent = 'Create Your Account';
      subtitle.textContent = 'Join the Ankuram community today.';
    }

    clearErrors();
  }

  // Tab click handlers
  document.querySelectorAll('.auth-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(this.dataset.tab);
    });
  });

  // ================================================================
  // PASSWORD VISIBILITY TOGGLE
  // ================================================================
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = this.parentElement.querySelector('.floating-input');
      if (!input) return;
      var icon = this.querySelector('.material-symbols-outlined');
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
      } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
      }
    });

    // Hide toggle when input is empty
    var input = btn.parentElement.querySelector('.floating-input');
    if (input) {
      input.addEventListener('input', function () {
        btn.style.display = this.value.length > 0 ? 'flex' : 'none';
      });
      // Initial state
      btn.style.display = input.value.length > 0 ? 'flex' : 'none';
    }
  });

  // ================================================================
  // PASSWORD STRENGTH METER
  // ================================================================
  var strengthEl = document.getElementById('password-strength');
  var strengthBar = strengthEl
    ? strengthEl.querySelectorAll('.password-strength-bar span')
    : [];
  var strengthText = document.getElementById('password-strength-text');

  function evaluatePasswordStrength(password) {
    if (!password) return { label: '', level: 0, color: '' };

    var score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Weak', level: 1, color: 'weak' };
    if (score <= 4) return { label: 'Fair', level: 2, color: 'fair' };
    if (score <= 6) return { label: 'Strong', level: 3, color: 'strong' };
    return { label: 'Very Strong', level: 4, color: 'very-strong' };
  }

  var signupPassword = document.getElementById('signup-password');
  if (signupPassword && strengthEl) {
    signupPassword.addEventListener('input', function () {
      var val = this.value;
      if (val.length === 0) {
        strengthEl.classList.remove('visible');
        return;
      }
      strengthEl.classList.add('visible');

      var result = evaluatePasswordStrength(val);

      strengthBar.forEach(function (bar, index) {
        bar.classList.remove('active', 'weak', 'fair', 'strong', 'very-strong');
        if (index < result.level) {
          bar.classList.add('active', result.color);
        }
      });

      if (strengthText) {
        strengthText.textContent = result.label;
        strengthText.className = 'password-strength-text ' + result.color;
      }
    });
  }

  // ================================================================
  // INLINE VALIDATION (Blur)
  // ================================================================
  function validateEmailField(id) {
    var v = document.getElementById(id).value.trim();
    var errorId = id + '-error';
    if (!v) {
      markInvalid(id, errorId, 'Email is required');
      return false;
    }
    if (!v.includes('@') || !v.includes('.')) {
      markInvalid(id, errorId, 'Enter a valid email');
      return false;
    }
    markValid(id, errorId);
    return true;
  }

  function validatePasswordField(id) {
    var v = document.getElementById(id).value;
    var errorId = id + '-error';
    if (!v) {
      markInvalid(id, errorId, 'Password is required');
      return false;
    }
    if (v.length < 6) {
      markInvalid(id, errorId, 'At least 6 characters');
      return false;
    }
    markValid(id, errorId);
    return true;
  }

  var signupName = document.getElementById('signup-name');
  if (signupName) {
    signupName.addEventListener('blur', function () {
      var v = this.value.trim();
      if (!v) {
        markInvalid('signup-name', 'signup-name-error', 'Name is required');
      } else {
        markValid('signup-name', 'signup-name-error');
      }
    });
  }

  var signupEmail = document.getElementById('signup-email');
  if (signupEmail) {
    signupEmail.addEventListener('blur', function () {
      validateEmailField('signup-email');
    });
  }

  var signupPwd = document.getElementById('signup-password');
  if (signupPwd) {
    signupPwd.addEventListener('blur', function () {
      validatePasswordField('signup-password');
    });
  }

  var signupConfirm = document.getElementById('signup-confirm');
  if (signupConfirm) {
    signupConfirm.addEventListener('blur', function () {
      var pwd = document.getElementById('signup-password').value;
      var conf = this.value;
      if (!conf) {
        markInvalid('signup-confirm', 'signup-confirm-error', 'Confirm your password');
        return;
      }
      if (conf !== pwd) {
        markInvalid('signup-confirm', 'signup-confirm-error', 'Passwords do not match');
        return;
      }
      markValid('signup-confirm', 'signup-confirm-error');
    });
  }

  var loginEmail = document.getElementById('login-email');
  if (loginEmail) {
    loginEmail.addEventListener('blur', function () {
      validateEmailField('login-email');
    });
  }

  var loginPwd = document.getElementById('login-password');
  if (loginPwd) {
    loginPwd.addEventListener('blur', function () {
      validatePasswordField('login-password');
    });
  }

  // Clear errors on focus
  document.querySelectorAll('.floating-input').forEach(function (el) {
    el.addEventListener('focus', function () {
      this.classList.remove('is-invalid', 'is-valid');
      var errId = this.id + '-error';
      setError(errId, '');
    });
  });

  // ================================================================
  // PENDING CART — process items saved before login
  // ================================================================
  /**
   * Process a pending cart item saved before login.
   * Saves the return URL in a separate key so redirectAfterAuth can find it.
   */
  function processPendingCart() {
    // Cart removed — no-op
  }

  /** Determine where to redirect after successful auth */
  function redirectAfterAuth() {
    // If there was a pending cart item, go back to the returnUrl
    try {
      var returnUrl = localStorage.getItem('leafAuthReturnUrl');
      localStorage.removeItem('leafAuthReturnUrl');
      if (returnUrl) {
        window.location.href = returnUrl;
        return;
      }
    } catch(e) {}
    // Default: go to home
    window.location.href = '../index.html';
  }

  // ================================================================
  // FORGOT PASSWORD
  // ================================================================
  var forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', function (e) {
      e.preventDefault();
      var loginEmailEl = document.getElementById('login-email');
      if (!loginEmailEl) {
        showToast('Please enter your email address.', 'error');
        return;
      }
      var email = loginEmailEl.value.trim();

      if (!email) {
        markInvalid('login-email', 'login-email-error', 'Enter your email first');
        loginEmailEl.focus();
        return;
      }

      if (typeof firebase !== 'undefined' && firebase.auth) {
        var btn = document.getElementById('login-btn');
        var originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';

        firebase
          .auth()
          .sendPasswordResetEmail(email)
          .then(function () {
            showToast('Password reset link sent to ' + email, 'success');
            btn.disabled = false;
            btn.innerHTML = originalText;
          })
          .catch(function (error) {
            btn.disabled = false;
            btn.innerHTML = originalText;
            var msg = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
              msg = 'No account found with this email.';
            } else if (error.code === 'auth/invalid-email') {
              msg = 'Invalid email address.';
            }
            showToast(msg, 'error');
          });
      } else {
        showToast('Password reset is not available offline.', 'error');
      }
    });
  }

  // ================================================================
  // SIGN UP
  // ================================================================
  var signupBtn = document.getElementById('signup-btn');
  var signupConfirmInput = document.getElementById('signup-confirm');
  var termsCheckbox = document.getElementById('terms-checkbox');

  if (signupBtn) {
    signupBtn.addEventListener('click', signup);
  }
  if (signupConfirmInput) {
    signupConfirmInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') signup();
    });
  }

  function signup() {
    clearErrors();

    var signupNameEl = document.getElementById('signup-name');
    var signupEmailEl = document.getElementById('signup-email');
    var signupPassEl = document.getElementById('signup-password');
    var signupConfirmEl = document.getElementById('signup-confirm');
    if (!signupNameEl || !signupEmailEl || !signupPassEl || !signupConfirmEl) {
      showToast('Signup form not found. Please refresh the page.', 'error');
      return;
    }
    var name = signupNameEl.value.trim();
    var email = signupEmailEl.value.trim();
    var password = signupPassEl.value;
    var confirm = signupConfirmEl.value;
    var termsAccepted = termsCheckbox ? termsCheckbox.checked : true;

    var valid = true;

    if (!name) {
      markInvalid('signup-name', 'signup-name-error', 'Name is required');
      valid = false;
    }
    if (!email || !email.includes('@')) {
      markInvalid('signup-email', 'signup-email-error', 'Enter a valid email');
      valid = false;
    }
    if (!password || password.length < 6) {
      markInvalid('signup-password', 'signup-password-error', 'At least 6 characters');
      valid = false;
    }
    if (!confirm) {
      markInvalid('signup-confirm', 'signup-confirm-error', 'Confirm your password');
      valid = false;
    } else if (confirm !== password) {
      markInvalid('signup-confirm', 'signup-confirm-error', 'Passwords do not match');
      valid = false;
    }
    if (!termsAccepted) {
      setError('terms-error', 'Please accept the Terms of Service.');
      valid = false;
    } else {
      setError('terms-error', '');
    }

    if (!valid) return;

    var btn = signupBtn;
    btn.disabled = true;
    btn.classList.add('loading');

    if (typeof firebase === 'undefined' || !firebase.auth) {
      showToast('Authentication service unavailable. Please try again later.', 'error');
      btn.disabled = false;
      btn.classList.remove('loading');
      return;
    }

    firebase
      .auth()
      .createUserWithEmailAndPassword(email, password)
      .then(function (result) {
        return result.user.updateProfile({ displayName: name });
      })
      .then(function () {
        var user = firebase.auth().currentUser;
        var session = {
          sub: user.uid,
          name: user.displayName || name,
          email: user.email,
          given_name: name.split(' ')[0],
          picture: null,
        };
        safeStorage.setJSON(AUTH_KEY, session);

        // Process any pending cart item
        processPendingCart();

        // Show success screen
        showSuccess(
          'Welcome, ' + name.split(' ')[0] + '!',
          'Your account has been created successfully.',
          function () {
            redirectAfterAuth();
          }
        );
      })
      .catch(function (error) {
        btn.disabled = false;
        btn.classList.remove('loading');
        var msg = error.message;
        if (error.code === 'auth/email-already-in-use') {
          msg = 'This email is already registered. Please sign in.';
          markInvalid('signup-email', 'signup-email-error', 'Email already in use');
          switchTab('login');
          document.getElementById('login-email').value = email;
        } else if (error.code === 'auth/weak-password') {
          msg = 'Password must be at least 6 characters.';
          markInvalid('signup-password', 'signup-password-error', 'Too weak');
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Invalid email address.';
          markInvalid('signup-email', 'signup-email-error', 'Invalid email');
        }
        showToast(msg, 'error');
      });
  }

  // ================================================================
  // SIGN IN
  // ================================================================
  var loginBtn = document.getElementById('login-btn');
  var loginPasswordInput = document.getElementById('login-password');

  if (loginBtn) {
    loginBtn.addEventListener('click', login);
  }
  if (loginPasswordInput) {
    loginPasswordInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') login();
    });
  }

  function login() {
    clearErrors();
    var loginEmailEl = document.getElementById('login-email');
    var loginPassEl = document.getElementById('login-password');
    if (!loginEmailEl || !loginPassEl) {
      showToast('Login form not found. Please refresh the page.', 'error');
      return;
    }
    var email = loginEmailEl.value.trim();
    var password = loginPassEl.value;
    var valid = true;

    if (!email) {
      markInvalid('login-email', 'login-email-error', 'Email is required');
      valid = false;
    }
    if (!password) {
      markInvalid('login-password', 'login-password-error', 'Password is required');
      valid = false;
    }

    if (!valid) return;

    var btn = loginBtn;
    btn.disabled = true;
    btn.classList.add('loading');

    if (typeof firebase === 'undefined' || !firebase.auth) {
      showToast('Authentication service unavailable. Please try again later.', 'error');
      btn.disabled = false;
      btn.classList.remove('loading');
      return;
    }

    firebase
      .auth()
      .signInWithEmailAndPassword(email, password)
      .then(function (result) {
        var u = result.user;
        var name = u.displayName || email.split('@')[0];
        var session = {
          sub: u.uid,
          name: name,
          email: u.email,
          given_name: name.split(' ')[0],
          picture: u.photoURL,
        };
        safeStorage.setJSON(AUTH_KEY, session);

        // Process any pending cart item
        processPendingCart();

        showSuccess(
          'Welcome back, ' + session.given_name + '!',
          'You have been signed in successfully.',
          function () {
            redirectAfterAuth();
          }
        );
      })
      .catch(function (error) {
        btn.disabled = false;
        btn.classList.remove('loading');
        var msg = error.message;
        if (
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential'
        ) {
          msg = 'Invalid email or password.';
          markInvalid('login-email', 'login-email-error', 'Invalid email or password');
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Invalid email address.';
          markInvalid('login-email', 'login-email-error', 'Invalid email');
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Too many attempts. Please try again later.';
        } else if (error.code === 'auth/user-disabled') {
          msg = 'This account has been disabled.';
        }
        showToast(msg, 'error');
      });
  }

  // ================================================================
  // SUCCESS STATE
  // ================================================================
  function showSuccess(title, message, callback) {
    var successEl = document.getElementById('auth-success');
    var titleEl = document.getElementById('success-title');
    var msgEl = document.getElementById('success-message');

    // Hide all forms
    document.querySelectorAll('.auth-panel').forEach(function (p) {
      p.style.display = 'none';
    });

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (successEl) successEl.classList.add('visible');

    // Redirect after delay
    if (callback) {
      setTimeout(callback, 1500);
    }
  }
})();
