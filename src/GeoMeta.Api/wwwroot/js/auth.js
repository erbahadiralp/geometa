// auth.js — Login/Register flow, token management
window.authModule = (() => {
    const TOKEN_KEY = 'geo_token';
    const USER_KEY = 'geo_user';
    const ADMIN_KEY = 'geo_is_admin';

    const getToken = () => localStorage.getItem(TOKEN_KEY);
    const getUser = () => localStorage.getItem(USER_KEY);
    const isAdmin = () => localStorage.getItem(ADMIN_KEY) === 'true';
    const isLoggedIn = () => !!getToken();

    const saveAuth = (token, username, userIsAdmin = false) => {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
        localStorage.setItem(ADMIN_KEY, userIsAdmin ? 'true' : 'false');
    };

    const logout = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ADMIN_KEY);
        window.location.reload();
    };

    const switchTab = (tab) => {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');

        if (tab === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');
        }
    };

    const showChangePasswordModal = () => {
        const modal = document.getElementById('change-pwd-modal');
        if (modal) modal.classList.remove('hidden');
    };

    const closeChangePasswordModal = () => {
        const modal = document.getElementById('change-pwd-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.getElementById('change-pwd-form').reset();
            document.getElementById('change-pwd-error').textContent = '';
        }
    };

    const init = () => {
        // Login form
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorEl = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            if (!username || !password) {
                errorEl.textContent = 'Tüm alanları doldurun.';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Giriş yapılıyor...';
            errorEl.textContent = '';

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Giriş başarısız.');
                }

                const data = await res.json();
                saveAuth(data.token, data.username, data.isAdmin);
                window.appModule.onLoginSuccess();
            } catch (err) {
                errorEl.textContent = err.message;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Giriş Yap';
            }
        });

        // Register form
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorEl = document.getElementById('register-error');
            const btn = document.getElementById('register-btn');
            const username = document.getElementById('register-username').value.trim();
            const password = document.getElementById('register-password').value;

            if (!username || !password) {
                errorEl.textContent = 'Tüm alanları doldurun.';
                return;
            }

            if (username.length < 3) {
                errorEl.textContent = 'Kullanıcı adı en az 3 karakter olmalı.';
                return;
            }

            if (password.length < 6) {
                errorEl.textContent = 'Şifre en az 6 karakter olmalı.';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Kayıt olunuyor...';
            errorEl.textContent = '';

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.message || 'Kayıt başarısız.');
                }

                const data = await res.json();
                saveAuth(data.token, data.username, data.isAdmin);
                window.appModule.onLoginSuccess();
            } catch (err) {
                errorEl.textContent = err.message;
            } finally {
                btn.disabled = false;
                btn.textContent = 'Kayıt Ol';
            }
        });

        // Change Password form
        const pwdForm = document.getElementById('change-pwd-form');
        if (pwdForm) {
            pwdForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const errorEl = document.getElementById('change-pwd-error');
                const btn = document.getElementById('change-pwd-btn');
                const currentPassword = document.getElementById('change-pwd-current').value;
                const newPassword = document.getElementById('change-pwd-new').value;

                if (!currentPassword || !newPassword) {
                    errorEl.textContent = 'Tüm alanları doldurun.';
                    return;
                }
                if (newPassword.length < 6) {
                    errorEl.textContent = 'Yeni şifre en az 6 karakter olmalı.';
                    return;
                }

                btn.disabled = true;
                btn.textContent = 'Güncelleniyor...';
                errorEl.textContent = '';

                try {
                    await window.apiModule.post('/api/auth/change-password', {
                        currentPassword,
                        newPassword
                    });
                    
                    window.appModule.showToast('Şifreniz başarıyla değiştirildi.', 'success');
                    closeChangePasswordModal();
                } catch (err) {
                    errorEl.textContent = err.message || 'Şifre güncellenemedi.';
                } finally {
                    btn.disabled = false;
                    btn.textContent = 'Güncelle';
                }
            });
        }
    };

    return { init, getToken, getUser, isAdmin, isLoggedIn, logout, switchTab, showChangePasswordModal, closeChangePasswordModal };
})();
