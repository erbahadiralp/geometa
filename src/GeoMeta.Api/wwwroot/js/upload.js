// upload.js — File upload via click and drag & drop
window.uploadModule = (() => {
    const initCardUploads = () => {
        document.querySelectorAll('.card-image-area').forEach(area => {
            const cardId = area.dataset.cardId;

            // Click to upload
            area.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/png,image/webp,image/gif';
                input.onchange = () => {
                    if (input.files[0]) uploadImage(cardId, input.files[0]);
                };
                input.click();
            });

            // Drag & Drop
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });

            area.addEventListener('dragleave', () => {
                area.classList.remove('drag-over');
            });

            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    uploadImage(cardId, file);
                }
            });
        });
    };

    const uploadImage = async (cardId, file) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            await window.apiModule.uploadFile(`/api/cards/${cardId}/image`, formData);
            // Image update will come via SignalR
        } catch (err) {
            console.error('Upload error:', err);
            alert('Görsel yüklenirken hata oluştu: ' + err.message);
        }
    };

    return { initCardUploads };
})();
