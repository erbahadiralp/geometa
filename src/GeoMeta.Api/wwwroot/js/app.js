// app.js — Main application init and view routing
window.appModule = (() => {
    let countries = [];
    let deleteCallback = null;
    let globalCategory = 'Tümü';
    let globalFilteredCountryIds = null;
    let globalCards = [];

    const init = async () => {
        window.authModule.init();
        initTheme();
        initKeyboardShortcuts();

        if (window.authModule.isLoggedIn()) {
            onLoginSuccess();
        } else {
            showView('login-view');
        }

        // Lightbox close
        document.getElementById('lightbox-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'lightbox-overlay' || e.target.id === 'lightbox-close') {
                document.getElementById('lightbox-overlay').classList.add('hidden');
            }
        });
    };

    const onLoginSuccess = async () => {
        showView('map-view');

        const user = window.authModule.getUser();
        document.getElementById('current-user').textContent = user;

        if (window.authModule.isAdmin()) {
            document.getElementById('admin-toggle-btn').classList.remove('hidden');
        }

        await window.mapModule.init();
        window.cardsModule.initAddCardInput();
        initSearch();
        await refreshCountries();
        window.realtimeModule.init();

        // Sidebar event delegation
        document.getElementById('sidebar-list').addEventListener('click', (e) => {
            const countryItem = e.target.closest('.country-item');
            const continentItem = e.target.closest('.continent-note-btn');

            if (continentItem) {
                e.stopPropagation();
                const continent = continentItem.dataset.continent;
                window.detailModule.showContinent(continent);
                return;
            }

            if (countryItem) {
                const id = +countryItem.dataset.id;
                window.detailModule.showCountry(id);
            }
        });

        // Mobile sidebar toggle
        document.getElementById('mobile-sidebar-toggle')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('sidebar-open');
        });
    };

    // ==========================================
    // Theme (Dark/Light)
    // ==========================================
    const initTheme = () => {
        const saved = localStorage.getItem('geo_theme') || 'dark';
        applyTheme(saved);
    };

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('geo_theme', theme);
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    };

    const toggleTheme = () => {
        const current = localStorage.getItem('geo_theme') || 'dark';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    };

    // ==========================================
    // Keyboard Shortcuts
    // ==========================================
    const initKeyboardShortcuts = () => {
        document.addEventListener('keydown', (e) => {
            // Ignore when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                if (e.key === 'Escape') {
                    e.target.blur();
                }
                return;
            }

            switch (e.key) {
                case 'Escape':
                    // Close lightbox → close modal → back to map
                    const lightbox = document.getElementById('lightbox-overlay');
                    if (lightbox && !lightbox.classList.contains('hidden')) {
                        lightbox.classList.add('hidden');
                        return;
                    }
                    const deleteModal = document.getElementById('delete-modal');
                    if (deleteModal && !deleteModal.classList.contains('hidden')) {
                        closeDeleteModal();
                        return;
                    }
                    const tagModal = document.getElementById('tag-edit-modal');
                    if (tagModal && !tagModal.classList.contains('hidden')) {
                        closeTagEditModal();
                        return;
                    }
                    // Back to map from detail view
                    if (!document.getElementById('detail-view').classList.contains('hidden')) {
                        showMapView();
                    }
                    break;

                case '/':
                    e.preventDefault();
                    document.getElementById('search-input')?.focus();
                    break;
            }
        });
    };

    const refreshCountries = async () => {
        try {
            countries = await window.apiModule.get('/api/countries');
            renderSidebar(countries);
            window.mapModule.updateData(countries);
        } catch (err) {
            console.error('Error loading countries:', err);
        }
    };

    const renderSidebar = (countryList) => {
        const sidebar = document.getElementById('sidebar-list');

        const continentEntries = countryList.filter(c => c.name.startsWith('__continent_'));

        let withNotes = countryList.filter(c => c.cardCount > 0 && !c.name.startsWith('__continent_'));

        if (globalCategory !== 'Tümü' && globalFilteredCountryIds !== null) {
            withNotes = withNotes.filter(c => globalFilteredCountryIds.includes(c.id));
        }

        const grouped = {};
        withNotes.forEach(c => {
            if (!grouped[c.continent]) grouped[c.continent] = [];
            grouped[c.continent].push(c);
        });

        const continentOrder = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
        const continentNames = window.continentData || {};
        const sortedContinents = Object.keys(grouped).sort((a, b) =>
            continentOrder.indexOf(a) - continentOrder.indexOf(b)
        );

        if (sortedContinents.length === 0) {
            sidebar.innerHTML = `
                <div class="empty-state" style="padding: 40px 16px;">
                    <div class="empty-icon">🌍</div>
                    <h3>Henüz not yok</h3>
                    <p>Haritadan bir ülkeye tıklayarak ilk notunu ekle veya filtreyi değiştir.</p>
                </div>
            `;
            return;
        }

        sidebar.innerHTML = sortedContinents.map(continent => {
            const cData = continentNames[continent] || {};
            const continentNameTr = cData.nameTr || continent;
            
            const pseudoName = '__continent_' + continent;
            const continentEntry = continentEntries.find(c => c.name === pseudoName);
            const badgeCount = continentEntry ? continentEntry.cardCount : 0;
            const noteIconStyle = badgeCount > 0 ? "color: var(--primary);" : "color: rgba(255,255,255,0.4);";
            const badgeHtml = badgeCount > 0 ? `<span class="badge" style="background:var(--primary); color:white; padding: 2px 6px; font-size:10px; margin-left:4px; vertical-align:middle; line-height:1;">${badgeCount}</span>` : "";

            const hasNotesClass = badgeCount > 0 ? " has-notes" : "";

            return `
            <div class="continent-group">
                <div class="continent-header" onclick="window.appModule.toggleContinent(this)">
                    <span class="arrow">▼</span>
                    ${escapeHtml(continentNameTr)} <span class="text-muted" style="font-size:11px; font-weight:normal; margin-left:4px;">(${grouped[continent].length} ülke)</span>
                    <button class="continent-note-btn${hasNotesClass}" data-continent="${escapeAttr(continent)}" title="${continentNameTr} Genel Notları" style="${noteIconStyle} display:flex; align-items:center; padding-left:12px;">📝 ${badgeHtml}</button>
                </div>
                <div class="continent-countries">
                    ${grouped[continent].map(c => `
                        <div class="country-item" data-id="${c.id}">
                            <div class="country-info">
                                <span class="country-flag">${c.flag}</span>
                                <span class="country-name">${escapeHtml(c.name)}</span>
                            </div>
                            <span class="card-count">${c.cardCount}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `}).join('');
    };

    const toggleContinent = (headerEl) => {
        headerEl.classList.toggle('collapsed');
        const countriesEl = headerEl.nextElementSibling;
        countriesEl.classList.toggle('collapsed');
    };

    const showView = (viewId) => {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');
    };

    const showMapView = () => {
        showView('map-view');
        document.querySelectorAll('.country-item').forEach(el => el.classList.remove('active'));
        // Close mobile sidebar
        document.getElementById('sidebar')?.classList.remove('sidebar-open');
    };

    // Auto-create country from map click
    const autoCreateCountry = async (data) => {
        try {
            const country = await window.apiModule.post('/api/countries', {
                name: data.name,
                flag: data.flag,
                isoNumeric: data.isoNumeric,
                continent: data.continent,
                tags: []
            });

            showToast(`${data.flag} ${data.name} eklendi!`, 'success');

            if (country?.id) {
                await refreshCountries();
                window.detailModule.showCountry(country.id);
            }
        } catch (err) {
            if (err.message?.includes('zaten')) {
                // Country exists, just navigate to it
                const existing = countries.find(c => c.isoNumeric === data.isoNumeric);
                if (existing) {
                    window.detailModule.showCountry(existing.id);
                } else {
                    showToast(err.message, 'warning');
                }
            } else {
                showToast('Ülke eklenirken hata: ' + (err.message || ''), 'error');
            }
        }
    };

    // ==========================================
    // Tag Edit Modal
    // ==========================================
    const openTagEditModal = () => {
        const country = window.detailModule.getCurrentCountry();
        if (!country) return;

        const modal = document.getElementById('tag-edit-modal');
        const container = document.getElementById('tag-edit-container');

        container.innerHTML = '';
        (country.tags || []).forEach(tag => {
            addTagEditRow(container, tag.label, tag.color);
        });
        if (country.tags.length === 0) {
            addTagEditRow(container);
        }

        modal.classList.remove('hidden');
    };

    const addTagEditRow = (container, label = '', color = 'default') => {
        container = container || document.getElementById('tag-edit-container');
        const row = document.createElement('div');
        row.className = 'tag-input-row';
        row.innerHTML = `
            <input type="text" class="tag-label-input" placeholder="Etiket" value="${escapeAttr(label)}">
            <select class="tag-color-select">
                <option value="default" ${color === 'default' ? 'selected' : ''}>Gri</option>
                <option value="green" ${color === 'green' ? 'selected' : ''}>Yeşil</option>
                <option value="yellow" ${color === 'yellow' ? 'selected' : ''}>Sarı</option>
            </select>
            <button type="button" class="btn-icon remove-tag-btn" onclick="this.parentElement.remove()">✕</button>
        `;
        container.appendChild(row);
    };

    const saveTagEdit = async () => {
        const countryId = window.detailModule.getCurrentCountryId();
        if (!countryId) return;

        const rows = document.querySelectorAll('#tag-edit-container .tag-input-row');
        const tags = [];
        rows.forEach(row => {
            const label = row.querySelector('.tag-label-input').value.trim();
            const color = row.querySelector('.tag-color-select').value;
            if (label) tags.push({ label, color });
        });

        try {
            await window.apiModule.put(`/api/countries/${countryId}/tags`, tags);
            showToast('Etiketler güncellendi!', 'success');
            closeTagEditModal();
            // Refresh detail view
            window.detailModule.showCountry(countryId);
            await refreshCountries();
        } catch (err) {
            showToast('Etiket güncelleme hatası.', 'error');
        }
    };

    const closeTagEditModal = () => {
        document.getElementById('tag-edit-modal')?.classList.add('hidden');
    };

    // Delete modal
    const showDeleteModal = (text, callback) => {
        document.getElementById('delete-modal-text').textContent = text;
        document.getElementById('delete-modal').classList.remove('hidden');
        deleteCallback = callback;

        const btn = document.getElementById('delete-confirm-btn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', async () => {
            if (deleteCallback) {
                await deleteCallback();
                deleteCallback = null;
            }
            closeDeleteModal();
        });
    };

    const closeDeleteModal = () => {
        const modal = document.getElementById('delete-modal');
        if (modal.classList.contains('hidden')) return;
        modal.classList.add('hidden');
        deleteCallback = null;
    };

    // ==========================================
    // Statistics Dashboard
    // ==========================================
    const toggleDashboard = () => {
        const panel = document.getElementById('stats-dashboard');
        if (!panel) return;
        const isHidden = panel.classList.contains('hidden');
        if (isHidden) {
            renderDashboard();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    };

    const renderDashboard = async () => {
        const content = document.getElementById('stats-dashboard-content');
        if (!content) return;

        // Filter real countries (not continents)
        const realCountries = countries.filter(c => !c.name.startsWith('__continent_'));
        const withNotes = realCountries.filter(c => c.cardCount > 0);
        const totalNotes = realCountries.reduce((sum, c) => sum + c.cardCount, 0);

        // Per-continent stats
        const continentOrder = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
        const continentNames = window.continentData || {};
        const continentStats = {};
        continentOrder.forEach(cont => {
            continentStats[cont] = { countries: 0, notes: 0 };
        });
        withNotes.forEach(c => {
            if (continentStats[c.continent]) {
                continentStats[c.continent].countries++;
                continentStats[c.continent].notes += c.cardCount;
            }
        });

        // Try loading card details for photo/author stats
        let totalPhotos = 0;
        const allAuthors = new Set();
        for (const c of withNotes) {
            try {
                const cards = await window.apiModule.get(`/api/countries/${c.id}/cards`);
                cards.forEach(card => {
                    if (card.imagePath) totalPhotos++;
                    if (card.author) allAuthors.add(card.author);
                });
            } catch { /* skip */ }
        }

        // Total possible countries from countryData
        const totalPossible = window.countryData ? Object.keys(window.countryData).length : 0;
        const coveragePercent = totalPossible > 0 ? Math.round((withNotes.length / totalPossible) * 100) : 0;

        content.innerHTML = `
            <div class="dashboard-overview">
                <div class="dash-stat-card">
                    <div class="dash-stat-value">${withNotes.length}</div>
                    <div class="dash-stat-label">Notlu Ülke</div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-value">${totalNotes}</div>
                    <div class="dash-stat-label">Toplam Not</div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-value">${totalPhotos}</div>
                    <div class="dash-stat-label">Fotoğraf</div>
                </div>
                <div class="dash-stat-card">
                    <div class="dash-stat-value">${allAuthors.size}</div>
                    <div class="dash-stat-label">Katkıda Bulunan</div>
                </div>
            </div>

            <div class="dashboard-coverage">
                <div class="coverage-header">
                    <span>Kapsam</span>
                    <span class="coverage-percent">${coveragePercent}%</span>
                </div>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${coveragePercent}%"></div>
                </div>
                <div class="coverage-detail">${withNotes.length} / ${totalPossible} ülke</div>
            </div>

            <div class="dashboard-continents">
                <h4>Kıtalara Göre</h4>
                ${continentOrder.map(cont => {
                    const stats = continentStats[cont];
                    const cData = continentNames[cont] || {};
                    const nameTr = cData.nameTr || cont;
                    const flag = cData.flag || '🌍';
                    return `
                        <div class="dash-continent-row">
                            <span class="dash-continent-name">${flag} ${escapeHtml(nameTr)}</span>
                            <div class="dash-continent-stats">
                                <span class="dash-mini-stat" title="Ülke">🏳️ ${stats.countries}</span>
                                <span class="dash-mini-stat" title="Not">📝 ${stats.notes}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    // Toast system
    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Search — countries + notes
    const initSearch = () => {
        const searchInput = document.getElementById('search-input');
        let searchTimeout = null;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            clearTimeout(searchTimeout);

            if (!query) {
                renderSidebar(countries);
                hideSearchResults();
                return;
            }

            searchTimeout = setTimeout(async () => {
                const filteredCountries = countries.filter(c =>
                    c.name.toLowerCase().includes(query) ||
                    c.continent.toLowerCase().includes(query) ||
                    c.tags.some(t => t.label.toLowerCase().includes(query))
                );

                renderSidebar(filteredCountries.length > 0 ? filteredCountries : countries);
                await searchNotes(query);
            }, 300);
        });
    };

    const searchNotes = async (query) => {
        const resultsEl = document.getElementById('search-results');
        if (!resultsEl) return;

        const results = [];
        for (const country of countries) {
            if (country.name.startsWith('__continent_')) continue;
            try {
                const cards = await window.apiModule.get(`/api/countries/${country.id}/cards`);
                const matching = cards.filter(c =>
                    c.text?.toLowerCase().includes(query) ||
                    c.category?.toLowerCase().includes(query)
                );
                matching.forEach(card => {
                    results.push({ ...card, countryName: country.name, countryFlag: country.flag, countryId: country.id });
                });
            } catch (err) { /* skip */ }
        }

        if (results.length > 0) {
            resultsEl.innerHTML = `
                <div class="search-results-header">🔍 Notlarda bulunan sonuçlar (${results.length})</div>
                ${results.slice(0, 20).map(r => `
                    <div class="search-result-item" onclick="window.detailModule.showCountry(${r.countryId}); document.getElementById('search-results').classList.add('hidden');">
                        <span class="search-result-country">${r.countryFlag} ${escapeHtml(r.countryName)}</span>
                        <span class="search-result-text">${highlightMatch(escapeHtml(r.text || ''), query)}</span>
                        <span class="search-result-category">${r.category}</span>
                    </div>
                `).join('')}
            `;
            resultsEl.classList.remove('hidden');
        } else {
            resultsEl.innerHTML = '';
            resultsEl.classList.add('hidden');
        }
    };

    const hideSearchResults = () => {
        const el = document.getElementById('search-results');
        if (el) {
            el.innerHTML = '';
            el.classList.add('hidden');
        }
    };

    const highlightMatch = (text, query) => {
        if (!text || !query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    };

    // Escape
    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const escapeAttr = (text) => {
        if (!text) return '';
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    document.addEventListener('DOMContentLoaded', init);

    const onGlobalFilterChange = async (category) => {
        globalCategory = category;
        const btn = document.getElementById('view-all-notes-btn');
        
        if (category === 'Tümü') {
            globalFilteredCountryIds = null;
            globalCards = [];
            btn.style.display = 'none';
            renderSidebar(countries);
            window.mapModule.updateData(countries);
            return;
        }

        try {
            const data = await window.apiModule.get(`/api/cards/global?category=${encodeURIComponent(category)}`);
            globalCards = data;
            const uniqueCountryIds = [...new Set(data.map(c => c.countryId))];
            globalFilteredCountryIds = uniqueCountryIds;
            btn.style.display = 'block';

            renderSidebar(countries);

            // Filter map visually
            const fakeMapData = countries.filter(c => uniqueCountryIds.includes(c.id));
            window.mapModule.updateData(fakeMapData);
        } catch (err) {
            console.error('Filter error', err);
            showToast('Filtreleme hatası', 'error');
        }
    };

    const showGlobalNotes = () => {
        const title = document.getElementById('global-notes-title');
        title.innerHTML = `${escapeHtml(globalCategory)} - Tüm Notlar <span class="badge" style="vertical-align:middle; font-size:16px;">${globalCards.length}</span>`;
        
        window.cardsModule.renderCards(globalCards, null, 'global-cards-grid', true);

        document.getElementById('map-svg-wrapper').classList.add('hidden');
        document.getElementById('detail-view').classList.add('hidden');
        document.getElementById('global-notes-view').classList.remove('hidden');
    };

    const closeGlobalNotes = () => {
        document.getElementById('global-notes-view').classList.add('hidden');
        document.getElementById('map-svg-wrapper').classList.remove('hidden');
    };

    return {
        onLoginSuccess, showMapView, refreshCountries,
        toggleContinent, autoCreateCountry,
        showDeleteModal, closeDeleteModal, showToast,
        toggleTheme, toggleDashboard,
        openTagEditModal, addTagEditRow: () => addTagEditRow(), saveTagEdit, closeTagEditModal,
        onGlobalFilterChange, showGlobalNotes, closeGlobalNotes
    };
})();
