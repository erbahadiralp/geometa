window.adminModule = (() => {
    const renderAdminDashboard = async () => {
        const content = document.getElementById('admin-dashboard-content');
        if (!content) return;

        content.innerHTML = '<div class="spinner" style="margin: 40px auto;"></div>';

        try {
            const users = await window.apiModule.get('/api/admin/users');
            
            if (users.length === 0) {
                content.innerHTML = '<div class="empty-state">Kullanıcı bulunamadı.</div>';
                return;
            }

            content.innerHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Kullanıcı Adı</th>
                            <th>Rol</th>
                            <th>Durum</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.username}</td>
                                <td>${u.role}</td>
                                <td>${u.isApproved ? '<span style="color:var(--accent)">Onaylı</span>' : '<span style="color:var(--warning)">Bekliyor</span>'}</td>
                                <td>
                                    ${!u.isApproved ? `<button class="btn-primary" style="padding:4px 8px; font-size:11px;" onclick="window.adminModule.approveUser(${u.id})">Onayla</button>` : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } catch (err) {
            console.error('Admin API error:', err);
            content.innerHTML = `<div class="empty-state" style="color:var(--danger)">Hata: ${err.message}</div>`;
        }
    };

    const toggleAdminDashboard = () => {
        const panel = document.getElementById('admin-dashboard');
        if (!panel) return;
        
        if (panel.classList.contains('hidden')) {
            renderAdminDashboard();
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    };

    const approveUser = async (userId) => {
        try {
            await window.apiModule.post(`/api/admin/users/${userId}/approve`);
            window.appModule.showToast('Kullanıcı onaylandı!', 'success');
            renderAdminDashboard(); // Refresh
        } catch (err) {
            window.appModule.showToast(err.message || 'Onaylanırken hata oluştu.', 'error');
        }
    };

    return { toggleAdminDashboard, approveUser };
})();
