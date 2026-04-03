// realtime.js — SignalR connection and event handlers
window.realtimeModule = (() => {
    let connection = null;

    const init = () => {
        const token = window.apiModule.getToken();
        if (!token) return;

        connection = new signalR.HubConnectionBuilder()
            .withUrl('/hub/geometa', {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect([0, 3000, 5000, 10000, 30000])
            .configureLogging(signalR.LogLevel.Warning)
            .build();

        // Connection state changes
        connection.onreconnecting(() => {
            updateSyncStatus(false);
        });

        connection.onreconnected(() => {
            updateSyncStatus(true);
            window.appModule.refreshCountries();
        });

        connection.onclose(() => {
            updateSyncStatus(false);
        });

        // Server → Client events
        connection.on('CountryAdded', (country) => {
            window.appModule.refreshCountries();
        });

        connection.on('CountryDeleted', (data) => {
            const currentCountryId = window.detailModule.getCurrentCountryId();
            if (data.countryId === currentCountryId) {
                window.appModule.showMapView();
            }
            window.appModule.refreshCountries();
        });

        connection.on('CardAdded', (data) => {
            window.cardsModule.onCardAdded(data);
        });

        connection.on('CardUpdated', (card) => {
            window.cardsModule.onCardUpdated(card);
        });

        connection.on('CardDeleted', (data) => {
            window.cardsModule.onCardDeleted(data);
        });

        connection.on('CardImageUpdated', (data) => {
            window.cardsModule.onCardImageUpdated(data);
        });

        connection.on('UserJoined', (username) => {
            console.log(`${username} bağlandı`);
        });

        connection.on('UserLeft', (username) => {
            console.log(`${username} ayrıldı`);
        });

        // Start connection
        startConnection();
    };

    const startConnection = async () => {
        try {
            await connection.start();
            updateSyncStatus(true);
            console.log('SignalR connected');
        } catch (err) {
            console.error('SignalR connection error:', err);
            updateSyncStatus(false);
            setTimeout(startConnection, 5000);
        }
    };

    const updateSyncStatus = (connected) => {
        const dots = document.querySelectorAll('.sync-dot');
        dots.forEach(dot => {
            dot.classList.toggle('connected', connected);
            dot.classList.toggle('disconnected', !connected);
            dot.title = connected ? 'Bağlı' : 'Bağlantı kesildi';
        });
    };

    return { init };
})();
