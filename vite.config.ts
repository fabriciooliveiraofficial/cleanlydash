import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [
            react(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'src',
                filename: 'sw.ts',
                registerType: 'prompt',
                devOptions: {
                    enabled: true,
                    type: 'module',
                    navigateFallback: 'index.html'
                },
                includeAssets: ['favicon.png', 'icons/*.png'],
                manifest: {
                    name: 'Cleanlydash - Gestão Operacional Airbnb',
                    short_name: 'Cleanlydash',
                    description: 'Sistema Operacional para gestores de Airbnb',
                    theme_color: '#6366f1',
                    background_color: '#f8fafc',
                    display: 'standalone',
                    start_url: '/',
                    icons: [
                        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
                    ]
                },
                workbox: {
                    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Aumentado para 5MB para suportar o bundle atual
                    globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'], // Removed html to avoid conflict
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/.*supabase\.co\/rest\/v1\/.*/i,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'supabase-api',
                                expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
                            }
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: { cacheName: 'google-fonts', expiration: { maxAgeSeconds: 31536000 } }
                        }
                    ]
                },
                injectManifest: {
                    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB limit for injectManifest strategy
                }
            })
        ],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL),
            'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
            'process.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY)
        },
        ssr: {
            noExternal: ['rrweb', 'rrweb-player', 'fflate'],
        },
        build: {
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            if (id.includes('lucide-react')) return 'vendor-icons';
                            if (id.includes('date-fns')) return 'vendor-date';
                            if (id.includes('@supabase')) return 'vendor-supabase';
                            if (id.includes('@telnyx')) return 'vendor-telephony';
                            if (id.includes('leaflet')) return 'vendor-maps';
                            if (id.includes('framer-motion')) return 'vendor-animation';
                            if (id.includes('recharts')) return 'vendor-charts';
                            if (id.includes('jspdf')) return 'vendor-pdf';
                            return 'vendor'; // all other node_modules
                        }
                    }
                }
            }
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
                'worker_threads': path.resolve(__dirname, 'empty-module.js'),
            }
        }
    };
});
