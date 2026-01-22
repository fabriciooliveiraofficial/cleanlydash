// Cleanlydash Service Worker (Push Notifications)
// Version: 1.0.0

self.addEventListener('push', function (event) {
    if (event.data) {
        try {
            const data = event.data.json();
            const options = {
                body: data.body || 'Novo agendamento recebido!',
                icon: '/favicon.png',
                badge: '/favicon.png',
                vibrate: [200, 100, 200, 100, 200, 100, 400],
                data: {
                    url: data.url || '/cleaner',
                    bookingId: data.bookingId
                },
                requireInteraction: true, // PEERSISTENT: Notification stays until user acts
                actions: [
                    { action: 'open', title: 'Ver Detalhes', icon: '/favicon.png' },
                    { action: 'close', title: 'Fechar', icon: '/favicon.png' }
                ],
                tag: 'new-booking' // Prevent multiple notifications for same thing
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'Cleanlydash', options)
            );
        } catch (e) {
            console.error('Push error:', e);
        }
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'close') return;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            const url = event.notification.data.url;

            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
