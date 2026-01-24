import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  define: {
    // Używamy JSON.stringify, aby zapewnić poprawność składniową wstrzykniętego klucza
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          utils: ['jspdf', 'jspdf-autotable', 'recharts']
        }
      }
    }
  },
  server: {
    historyApiFallback: true
  }
});