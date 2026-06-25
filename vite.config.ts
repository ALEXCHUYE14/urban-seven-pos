import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['img/logo.png'],
      manifest: {
        name: 'URBAN SEVEN · POS',
        short_name: 'URBAN 07',
        description: 'CRM + Punto de Venta · URBAN SEVEN',
        theme_color: '#141312',
        background_color: '#141312',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'img/logo.png', sizes: '192x192', type: 'image/png' },
          { src: 'img/logo.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: { host: true, port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-pdf':      ['jspdf', 'jspdf-autotable'],
          'vendor-qr':       ['html5-qrcode']
        }
      }
    }
  }
})
