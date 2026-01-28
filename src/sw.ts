/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST || []);

// Version control for the service worker
const SW_VERSION = '2.0.0';

self.addEventListener('install', () => {
    console.log(`[SW v${SW_VERSION}] Installed`);
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log(`[SW v${SW_VERSION}] Activated`);
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const { title, body, icon, badge, image, actions, tag, data: customData } = data;

        console.log('[SW] Push received:', data);

        const options: NotificationOptions = {
            body: body || 'Nova mensagem do Cleanlydash',
            icon: icon || '/icons/icon-192.png',
            badge: badge || '/icons/icon-192.png',
            image: image, // Full-size image support
            tag: tag || 'general', // Notification grouping
            renotify: true,
            data: customData,
            vibrate: [200, 100, 200],
            actions: actions && actions.length > 0 ? actions : [
                { action: 'open', title: 'Ver Detalhes' }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title || 'Cleanlydash', options)
        );
    } catch (err) {
        console.error('[SW] Error handling push:', err);
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    // Determine target URL based on action or default
    let targetUrl = event.notification.data?.url || '/';

    if (event.action && event.action !== 'open') {
        // Handle specific action IDs if passed in notification data
        // For now, most actions just navigate to different routes
        if (event.notification.data?.actionUrls?.[event.action]) {
            targetUrl = event.notification.data.actionUrls[event.action];
        } else if (event.action === 'dismiss') {
            return;
        }
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if application is already open
            for (const client of clientList) {
                if ('focus' in client) {
                    return (client as any).navigate(targetUrl).then((c: any) => c.focus());
                }
            }
            // If not, open new window
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
