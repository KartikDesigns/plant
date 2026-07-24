(function() {
  'use strict';

  var AUTH_KEY = 'leafUser';
  var PROFILE_KEY = 'leafProfile';

  var formModified = false;

  function getCurrentUser() {
    try {
      var data = localStorage.getItem(AUTH_KEY);
      return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
  }

  function getProfile() {
    var user = getCurrentUser();
    if (!user) return null;
    try {
      var saved = localStorage.getItem(PROFILE_KEY + '_' + user.sub);
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return { name: user.name, email: user.email, given_name: user.given_name, location: '', picture: user.picture || null };
  }

  function saveProfile(profile) {
    var user = getCurrentUser();
    if (!user) return;
    try {
      localStorage.setItem(PROFILE_KEY + '_' + user.sub, JSON.stringify(profile));
    } catch(e) {}
  }

  function setError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function markInvalid(inputId, errorId, msg) {
    var input = document.getElementById(inputId);
    if (input) { input.classList.add('field-invalid'); input.classList.remove('field-valid'); }
    setError(errorId, msg);
  }

  function markValid(inputId, errorId) {
    var input = document.getElementById(inputId);
    if (input) { input.classList.remove('field-invalid'); input.classList.add('field-valid'); }
    setError(errorId, '');
  }

  function clearFieldStyles() {
    document.querySelectorAll('.field-invalid, .field-valid').forEach(function(el) {
      el.classList.remove('field-invalid', 'field-valid');
    });
    document.querySelectorAll('.field-error').forEach(function(el) { el.textContent = ''; });
  }

  function showToast(message, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type || 'success');
    }
  }

  function showBanner(msg) {
    var banner = document.getElementById('success-banner');
    var msgEl = document.getElementById('success-message');
    if (msgEl) msgEl.textContent = msg;
    if (banner) { banner.classList.add('show'); setTimeout(function() { banner.classList.remove('show'); }, 3500); }
  }

  function loadProfile() {
    var profile = getProfile();
    if (!profile) {
      window.location.href = 'create-account.html';
      return;
    }
    function safeVal(id, val) { var el = document.getElementById(id); if (el) el.value = val; }
    function safeText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
    safeVal('settings-name', profile.name || '');
    safeVal('settings-email', profile.email || '');
    safeVal('settings-location', profile.location || '');
    safeText('page-name', profile.name || 'Your Name');
    safeText('page-email', profile.email || '');
    updateAvatar(profile);
  }

  function updateAvatar(profile) {
    var letterEl = document.querySelector('.settings-avatar-letter');
    var imgEl = document.getElementById('avatar-img');
    var initial = (profile.given_name || profile.name || 'U').charAt(0).toUpperCase();
    
    if (profile.picture && profile.picture !== 'null' && profile.picture !== '') {
      letterEl.classList.add('d-none');
      imgEl.classList.remove('d-none');
      imgEl.src = profile.picture;
      imgEl.alt = (profile.name || 'User') + ' photo';
    } else {
      letterEl.classList.remove('d-none');
      imgEl.classList.add('d-none');
      letterEl.textContent = initial;
    }
  }

  function validateForm() {
    var valid = true;
    var nameEl = document.getElementById('settings-name');
    var locationEl = document.getElementById('settings-location');
    if (!nameEl || !locationEl) return false;
    var name = nameEl.value.trim();
    var location = locationEl.value.trim();

    if (!name) { markInvalid('settings-name', 'settings-name-error', 'Name is required'); valid = false; }
    else if (name.length < 2) { markInvalid('settings-name', 'settings-name-error', 'Name must be at least 2 characters'); valid = false; }
    else { markValid('settings-name', 'settings-name-error'); }

    if (location && location.length < 3) { markInvalid('settings-location', 'settings-location-error', 'Enter a full location (city, state)'); valid = false; }
    else { markValid('settings-location', 'settings-location-error'); }

    return valid;
  }

  var settingsNameEl = document.getElementById('settings-name');
  var settingsLocationEl = document.getElementById('settings-location');

  if (settingsNameEl) {
    settingsNameEl.addEventListener('input', function() {
      formModified = true;
      var v = this.value.trim();
      if (!v) markInvalid('settings-name', 'settings-name-error', 'Name is required');
      else if (v.length < 2) markInvalid('settings-name', 'settings-name-error', 'At least 2 characters');
      else markValid('settings-name', 'settings-name-error');
    });
    settingsNameEl.addEventListener('focus', function() {
      this.classList.remove('field-invalid', 'field-valid');
      setError('settings-name-error', '');
    });
  }

  if (settingsLocationEl) {
    settingsLocationEl.addEventListener('input', function() {
      formModified = true;
      var v = this.value.trim();
      if (v && v.length < 3) markInvalid('settings-location', 'settings-location-error', 'Enter city, state (e.g. Bangalore, Karnataka)');
      else markValid('settings-location', 'settings-location-error');
    });
    settingsLocationEl.addEventListener('focus', function() {
      this.classList.remove('field-invalid', 'field-valid');
      setError('settings-location-error', '');
    });
  }

  var saveBtn = document.getElementById('save-profile-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      if (!validateForm()) return;
      if (!formModified) { showBanner('No changes to save.'); return; }

      var btn = this;
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">sync</span> Saving...';

      if (!settingsNameEl || !settingsLocationEl) {
        showToast('Form fields not found.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">save</span> Save Changes';
        return;
      }
      var name = settingsNameEl.value.trim();
      var location = settingsLocationEl.value.trim();
    var user = getCurrentUser();

    // Preserve existing picture from profile
    var currentProfile = getProfile();
    var picture = currentProfile ? currentProfile.picture : (user ? user.picture : null);

    var updatedProfile = {
      name: name,
      email: user ? user.email : '',
      given_name: name.split(' ')[0],
      location: location,
      picture: picture
    };

    // Save to localStorage
    saveProfile(updatedProfile);

    // Update session in AUTH_KEY
    if (user) {
      user.name = name;
      user.given_name = name.split(' ')[0];
      user.picture = picture;
      try { localStorage.setItem(AUTH_KEY, JSON.stringify(user)); } catch(e) {}
    }

    // Update Firebase displayName
    if (typeof firebase !== 'undefined' && firebase.auth) {
      var currentUser = firebase.auth().currentUser;
      var self = this;
      if (currentUser) {
        currentUser.updateProfile({ displayName: name }).catch(function() {});
      }
    }

    // Update page UI
    updateAvatar(updatedProfile);
    var pageNameEl = document.getElementById('page-name');
    if (pageNameEl) pageNameEl.textContent = name;
    formModified = false;

    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px">save</span> Save Changes';

    showBanner('Profile updated successfully!');
    if (typeof updateUserNav === 'function') updateUserNav();
  });

  // Redirect if not logged in
  var user = getCurrentUser();
  if (!user) {
    window.location.href = 'create-account.html';
  } else {
    loadProfile();
  }
})();
