// cards.js — Card rendering: list view for text-only, card view for photo notes
window.cardsModule = (() => {
    let currentCards = [];
    let currentCountryId = null;
    let activeCategory = null;

    const CATEGORY_ICONS = {
        'Google Car': '🚗',
        'Bollards': '🔶',
        'Plaka': '🪪',
        'Doğa': '🌿',
        'Dil': '🗣️',
        'Mimari': '🏛️',
        'Trafik': '🚦',
        'Genel': '📝'
    };

    const getCurrentUser = () => window.authModule.getUser();

    const renderCards = (cards, countryId) => {
        currentCards = cards;
        currentCountryId = countryId;

        // Update note count in title
        const titleEl = document.getElementById('detail-title');
        if (titleEl && titleEl.dataset.baseName) {
            titleEl.textContent = `${titleEl.dataset.baseName} (${cards.length})`;
        }

        renderCategoryFilter(cards);
        renderStatsBar(cards);

        let filtered = cards;
        if (activeCategory) {
            filtered = cards.filter(c => c.category === activeCategory);
        }

        const container = document.getElementById('cards-grid');

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>${activeCategory ? 'Bu kategoride not yok' : 'Henüz not yok'}</h3>
                    <p>${activeCategory ? 'Başka bir kategori seç veya yeni not ekle.' : 'Bu ülke için ilk notu ekleyen sen ol!'}</p>
                </div>
            `;
            return;
        }

        // Sort: pinned first
        const pinned = filtered.filter(c => c.isPinned);
        const unpinned = filtered.filter(c => !c.isPinned);
        const sorted = [...pinned, ...unpinned];

        // Split: photo cards vs text-only
        const photoCards = sorted.filter(c => c.imagePath);
        const textNotes = sorted.filter(c => !c.imagePath);

        let html = '';

        if (photoCards.length > 0) {
            html += '<div class="photo-cards-section">';
            html += photoCards.map(card => createPhotoCardHTML(card)).join('');
            html += '</div>';
        }

        if (textNotes.length > 0) {
            html += '<div class="text-notes-section">';
            html += textNotes.map(card => createTextNoteHTML(card)).join('');
            html += '</div>';
        }

        container.innerHTML = html;

        // Photo click → lightbox
        container.querySelectorAll('.card-photo-img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                openLightbox(img.src);
            });
        });
    };

    const createPhotoCardHTML = (card) => {
        const icon = CATEGORY_ICONS[card.category] || '📝';
        const isOwner = card.author === getCurrentUser();
        const pinClass = card.isPinned ? 'pinned' : '';
        const pinIcon = card.isPinned ? '📌' : '📍';

        return `
            <div class="photo-card fade-in ${pinClass}" data-card-id="${card.id}">
                ${card.isPinned ? '<div class="pin-badge">📌 Sabitlendi</div>' : ''}
                <div class="photo-card-image">
                    <img class="card-photo-img" src="${card.imagePath}" alt="${escapeHtml(card.category)}" loading="lazy">
                </div>
                <div class="photo-card-body">
                    <span class="card-category">${icon} ${escapeHtml(card.category)}</span>
                    <div class="card-text" data-card-id="${card.id}">${escapeHtml(card.text) || '<em class="text-muted">Not yok</em>'}</div>
                    <div class="card-footer">
                        <span class="card-author">✍️ ${escapeHtml(card.author)}</span>
                        <div class="card-actions">
                            <button class="card-action-btn" onclick="window.cardsModule.togglePin(${card.id})" title="${card.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}">${pinIcon}</button>
                            ${isOwner ? `
                                <button class="card-action-btn" onclick="window.cardsModule.triggerUpload(${card.id})" title="Görseli Değiştir">📷</button>
                                <button class="card-action-btn delete" onclick="window.cardsModule.deleteImage(${card.id})" title="Görseli Sil">🖼️✕</button>
                                <button class="card-action-btn" onclick="window.cardsModule.editCard(${card.id})" title="Düzenle">✏️</button>
                                <button class="card-action-btn delete" onclick="window.cardsModule.deleteCard(${card.id})" title="Notu Sil">🗑️</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const createTextNoteHTML = (card) => {
        const icon = CATEGORY_ICONS[card.category] || '📝';
        const isOwner = card.author === getCurrentUser();
        const pinClass = card.isPinned ? 'pinned' : '';
        const pinIcon = card.isPinned ? '📌' : '📍';

        return `
            <div class="text-note fade-in ${pinClass}" data-card-id="${card.id}">
                <div class="text-note-icon">${icon}</div>
                <div class="text-note-content">
                    <span class="text-note-category">${escapeHtml(card.category)}</span>
                    <div class="text-note-text" data-card-id="${card.id}">${escapeHtml(card.text) || '<em class="text-muted">Not yok</em>'}</div>
                </div>
                <div class="text-note-meta">
                    <span class="card-author">✍️ ${escapeHtml(card.author)}</span>
                    <div class="card-actions always-visible">
                        <button class="card-action-btn" onclick="window.cardsModule.togglePin(${card.id})" title="${card.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}">${pinIcon}</button>
                        ${isOwner ? `
                            <button class="card-action-btn" onclick="window.cardsModule.triggerUpload(${card.id})" title="Görsel Ekle">📷</button>
                            <button class="card-action-btn" onclick="window.cardsModule.editCard(${card.id})" title="Düzenle">✏️</button>
                            <button class="card-action-btn delete" onclick="window.cardsModule.deleteCard(${card.id})" title="Notu Sil">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    };

    // Category filter
    const renderCategoryFilter = (cards) => {
        const filterEl = document.getElementById('category-filter');
        if (!filterEl) return;

        const categories = [...new Set(cards.map(c => c.category))];
        const counts = {};
        cards.forEach(c => {
            counts[c.category] = (counts[c.category] || 0) + 1;
        });

        if (categories.length <= 1) {
            filterEl.innerHTML = '';
            return;
        }

        let html = `<button class="cat-filter-btn ${!activeCategory ? 'active' : ''}" onclick="window.cardsModule.filterCategory(null)">Tümü (${cards.length})</button>`;
        categories.forEach(cat => {
            const icon = CATEGORY_ICONS[cat] || '📝';
            html += `<button class="cat-filter-btn ${activeCategory === cat ? 'active' : ''}" onclick="window.cardsModule.filterCategory('${cat}')">${icon} ${cat} (${counts[cat]})</button>`;
        });

        filterEl.innerHTML = html;
    };

    // Mini stats bar
    const renderStatsBar = (cards) => {
        const statsEl = document.getElementById('stats-bar');
        if (!statsEl) return;

        if (cards.length === 0) {
            statsEl.innerHTML = '';
            return;
        }

        const photoCount = cards.filter(c => c.imagePath).length;
        const pinnedCount = cards.filter(c => c.isPinned).length;
        const authors = [...new Set(cards.map(c => c.author))];

        statsEl.innerHTML = `
            <span class="stat-item">📝 ${cards.length} not</span>
            ${photoCount > 0 ? `<span class="stat-item">📸 ${photoCount} fotoğraf</span>` : ''}
            ${pinnedCount > 0 ? `<span class="stat-item">📌 ${pinnedCount} sabitlenmiş</span>` : ''}
            <span class="stat-item">👥 ${authors.length} katkıda bulunan</span>
        `;
    };

    const filterCategory = (category) => {
        activeCategory = category;
        renderCards(currentCards, currentCountryId);
    };

    // Pin toggle
    const togglePin = async (cardId) => {
        try {
            await window.apiModule.put(`/api/cards/${cardId}/pin`, {});
            // Will be updated via SignalR
        } catch (err) {
            console.error('Pin toggle error:', err);
            window.appModule.showToast('Sabitleme hatası.', 'error');
        }
    };

    // Add card with optional photo
    const addCard = async () => {
        const countryId = window.detailModule.getCurrentCountryId();
        if (!countryId) return;

        const category = document.getElementById('card-category').value;
        const text = document.getElementById('card-text-input').value.trim();
        const fileInput = document.getElementById('card-photo-input');
        const file = fileInput?.files?.[0];

        if (!text && !file) {
            window.appModule.showToast('Not veya fotoğraf ekleyin.', 'warning');
            return;
        }

        try {
            const card = await window.apiModule.post(`/api/countries/${countryId}/cards`, { category, text });

            if (file && card?.id) {
                const formData = new FormData();
                formData.append('image', file);
                await window.apiModule.uploadFile(`/api/cards/${card.id}/image`, formData);
            }

            document.getElementById('card-text-input').value = '';
            if (fileInput) {
                fileInput.value = '';
                updatePhotoPreview();
            }
            window.appModule.showToast('Not eklendi!', 'success');
        } catch (err) {
            console.error('Error adding card:', err);
            window.appModule.showToast('Not eklenirken hata oluştu.', 'error');
        }
    };

    const editCard = (cardId) => {
        const card = currentCards.find(c => c.id === cardId);
        if (!card) return;
        if (card.author !== getCurrentUser()) {
            window.appModule.showToast('Sadece kendi notunuzu düzenleyebilirsiniz.', 'warning');
            return;
        }

        const textEl = document.querySelector(`.card-text[data-card-id="${cardId}"], .text-note-text[data-card-id="${cardId}"]`);
        if (!textEl) return;

        const textarea = document.createElement('textarea');
        textarea.className = 'card-text editing';
        textarea.value = card.text;
        textarea.rows = 3;
        textEl.replaceWith(textarea);
        textarea.focus();

        const save = async () => {
            const newText = textarea.value.trim();
            try {
                await window.apiModule.put(`/api/cards/${cardId}`, {
                    category: card.category,
                    text: newText
                });
            } catch (err) {
                console.error('Error updating card:', err);
                window.appModule.showToast(err.message || 'Düzenleme hatası.', 'error');
            }
        };

        textarea.addEventListener('blur', save);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                textarea.blur();
            }
            if (e.key === 'Escape') {
                textarea.value = card.text;
                textarea.blur();
            }
        });
    };

    const deleteCard = (cardId) => {
        const card = currentCards.find(c => c.id === cardId);
        if (!card) return;
        if (card.author !== getCurrentUser()) {
            window.appModule.showToast('Sadece kendi notunuzu silebilirsiniz.', 'warning');
            return;
        }

        window.appModule.showDeleteModal(
            'Bu notu silmek istediğinizden emin misiniz?',
            async () => {
                try {
                    await window.apiModule.delete(`/api/cards/${cardId}`);
                    window.appModule.showToast('Not silindi.', 'success');
                } catch (err) {
                    console.error('Error deleting card:', err);
                    window.appModule.showToast(err.message || 'Silme hatası.', 'error');
                }
            }
        );
    };

    const triggerUpload = (cardId) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg,image/png,image/webp,image/gif';
        input.onchange = async () => {
            if (input.files[0]) {
                const formData = new FormData();
                formData.append('image', input.files[0]);
                try {
                    await window.apiModule.uploadFile(`/api/cards/${cardId}/image`, formData);
                    window.appModule.showToast('Görsel başarıyla eklendi.', 'success');
                } catch (err) {
                    console.error('Upload error:', err);
                    window.appModule.showToast('Görsel eklenirken hata: ' + (err.message || ''), 'error');
                }
            }
        };
        input.click();
    };

    const deleteImage = async (cardId) => {
        window.appModule.showDeleteModal('Bu görseli silmek istediğinizden emin misiniz?', async () => {
            try {
                await window.apiModule.delete(`/api/cards/${cardId}/image`);
                window.appModule.showToast('Görsel silindi.', 'success');
            } catch (err) {
                console.error('Error deleting image:', err);
                window.appModule.showToast(err.message || 'Görsel silinirken hata oluştu.', 'error');
            }
        });
    };

    // Lightbox
    const openLightbox = (src) => {
        const overlay = document.getElementById('lightbox-overlay');
        const img = document.getElementById('lightbox-img');
        img.src = src;
        overlay.classList.remove('hidden');
    };

    // Photo preview
    const updatePhotoPreview = () => {
        const fileInput = document.getElementById('card-photo-input');
        const preview = document.getElementById('photo-preview');
        const clearBtn = document.getElementById('clear-photo-btn');

        if (fileInput?.files?.[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
                clearBtn.classList.remove('hidden');
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            preview.classList.add('hidden');
            clearBtn.classList.add('hidden');
            preview.src = '';
        }
    };

    const clearPhotoInput = () => {
        const fileInput = document.getElementById('card-photo-input');
        if (fileInput) fileInput.value = '';
        updatePhotoPreview();
    };

    // SignalR
    const onCardAdded = (data) => {
        const countryId = window.detailModule.getCurrentCountryId();
        if (data.countryId === countryId) {
            currentCards.push(data.card);
            renderCards(currentCards, countryId);
        }
        window.appModule.refreshCountries();
    };

    const onCardUpdated = (card) => {
        const idx = currentCards.findIndex(c => c.id === card.id);
        if (idx >= 0) {
            currentCards[idx] = card;
            const countryId = window.detailModule.getCurrentCountryId();
            renderCards(currentCards, countryId);
        }
    };

    const onCardDeleted = (data) => {
        currentCards = currentCards.filter(c => c.id !== data.cardId);
        const countryId = window.detailModule.getCurrentCountryId();
        if (data.countryId === countryId) {
            renderCards(currentCards, countryId);
        }
        window.appModule.refreshCountries();
    };

    const onCardImageUpdated = (data) => {
        const card = currentCards.find(c => c.id === data.cardId);
        if (card) {
            card.imagePath = data.imagePath;
            const countryId = window.detailModule.getCurrentCountryId();
            renderCards(currentCards, countryId);
        }
    };

    const escapeHtml = (text) => {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    const initAddCardInput = () => {
        document.getElementById('card-text-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCard();
            }
        });

        const photoInput = document.getElementById('card-photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', updatePhotoPreview);
        }
    };

    const resetFilter = () => {
        activeCategory = null;
    };

    return {
        renderCards, addCard, editCard, deleteCard, triggerUpload, deleteImage, initAddCardInput,
        onCardAdded, onCardUpdated, onCardDeleted, onCardImageUpdated,
        filterCategory, clearPhotoInput, resetFilter, openLightbox, togglePin
    };
})();
