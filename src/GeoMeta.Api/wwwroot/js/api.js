// api.js — Token-authenticated fetch wrapper
window.apiModule = (() => {
    const getToken = () => localStorage.getItem('geo_token');
    const getHeaders = (contentType = 'application/json') => {
        const headers = { 'Authorization': `Bearer ${getToken()}` };
        if (contentType) headers['Content-Type'] = contentType;
        return headers;
    };

    const handleResponse = async (response) => {
        if (response.status === 401) {
            window.authModule.logout();
            throw new Error('Unauthorized');
        }
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Bir hata oluştu.' }));
            throw new Error(err.message || `HTTP ${response.status}`);
        }
        if (response.status === 204) return null;
        return response.json();
    };

    return {
        get: async (url) => {
            const res = await fetch(url, { headers: getHeaders(null) });
            return handleResponse(res);
        },
        post: async (url, body) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            return handleResponse(res);
        },
        put: async (url, body) => {
            const res = await fetch(url, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(body)
            });
            return handleResponse(res);
        },
        delete: async (url) => {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: getHeaders(null)
            });
            return handleResponse(res);
        },
        uploadFile: async (url, formData) => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: formData
            });
            return handleResponse(res);
        },
        getToken
    };
})();
