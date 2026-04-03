// detail.js — Country and Continent detail view management
window.detailModule = (() => {
    let currentCountryId = null;
    let currentCountry = null;
    let currentContinent = null;

    const showCountry = async (countryId) => {
        currentCountryId = countryId;
        currentContinent = null;

        window.cardsModule.resetFilter();

        try {
            const country = await window.apiModule.get(`/api/countries/${countryId}`);
            currentCountry = country;

            const titleEl = document.getElementById('detail-title');
            titleEl.dataset.baseName = `${country.flag} ${country.name}`;
            titleEl.textContent = `${country.flag} ${country.name}`;

            const tagsContainer = document.getElementById('detail-tags');
            tagsContainer.innerHTML = country.tags.map(t =>
                `<span class="tag-pill ${t.color}">${t.label}</span>`
            ).join('');

            const cards = await window.apiModule.get(`/api/countries/${countryId}/cards`);
            window.cardsModule.renderCards(cards, countryId);

            document.getElementById('current-user-detail').textContent = window.authModule.getUser();

            document.getElementById('map-view').classList.add('hidden');
            document.getElementById('detail-view').classList.remove('hidden');

            document.querySelectorAll('.country-item').forEach(el => {
                el.classList.toggle('active', +el.dataset.id === countryId);
            });

        } catch (err) {
            console.error('Error loading country:', err);
            window.appModule.showToast('Ülke yüklenirken hata.', 'error');
        }
    };

    const showContinent = async (continent) => {
        currentContinent = continent;
        currentCountryId = null;

        window.cardsModule.resetFilter();

        const continentInfo = window.continentData?.[continent] || {};
        const nameTr = continentInfo.nameTr || continent;
        const flag = continentInfo.flag || '🌍';

        const titleEl = document.getElementById('detail-title');
        titleEl.dataset.baseName = `${flag} ${nameTr}`;
        titleEl.textContent = `${flag} ${nameTr} — Genel Notlar`;

        // No tags for continents
        document.getElementById('detail-tags').innerHTML = `
            <span class="tag-pill default">🌐 Kıta Notları</span>
        `;

        try {
            // Find or create a special continent "country"
            const countries = await window.apiModule.get('/api/countries');
            let continentCountry = countries.find(c => c.name === `__continent_${continent}`);

            if (!continentCountry) {
                // Auto-create a hidden continent entry
                continentCountry = await window.apiModule.post('/api/countries', {
                    name: `__continent_${continent}`,
                    flag: flag,
                    isoNumeric: null,
                    continent: continent,
                    tags: [{ label: `${nameTr} Genel`, color: 'default' }]
                });
            }

            if (continentCountry?.id) {
                currentCountryId = continentCountry.id;
                const cards = await window.apiModule.get(`/api/countries/${continentCountry.id}/cards`);
                window.cardsModule.renderCards(cards, continentCountry.id);
            }

            document.getElementById('current-user-detail').textContent = window.authModule.getUser();
            document.getElementById('map-view').classList.add('hidden');
            document.getElementById('detail-view').classList.remove('hidden');

        } catch (err) {
            console.error('Error loading continent:', err);
            window.appModule.showToast('Kıta notları yüklenirken hata.', 'error');
        }
    };

    const getCurrentCountryId = () => currentCountryId;
    const getCurrentCountry = () => currentCountry;
    const isContinent = () => currentContinent !== null;

    return { showCountry, showContinent, getCurrentCountryId, getCurrentCountry, isContinent };
})();
