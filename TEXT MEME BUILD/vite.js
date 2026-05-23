import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@app': resolve(__dirname, 'src/app'),
      '@scene': resolve(__dirname, 'src/scene'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@workers': resolve(__dirname, 'src/workers'),
      '@media': resolve(__dirname, 'src/media'),
      '@export': resolve(__dirname, 'src/export'),
      '@editor': resolve(__dirname, 'src/editor'),
      '@text': resolve(__dirname, 'src/text'),
      '@presets': resolve(__dirname, 'src/presets'),
      '@storage': resolve(__dirname, 'src/storage'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@styles': resolve(__dirname, 'src/styles'),
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
      },
      output: {
        manualChunks: {
          'vendor': ['uuid'],
          'ffmpeg': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'storage': ['idb']
        }
      }
    },
    target: 'es2020',
    modulePreload: {
      polyfill: true
    },
    chunkSizeWarningLimit: 1000
  },

  server: {
    port: 3000,
    strictPort: false,
    open: true,
    cors: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },

  preview: {
    port: 5000,
    strictPort: false
  },

  optimizeDeps: {
    include: ['uuid', 'idb'],
    exclude: ['@ffmpeg/ffmpeg']
  },

  worker: {
    format: 'es',
    plugins: []
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/tests/']
    }
  },

  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    },
    preprocessorOptions: {
      css: {
        additionalData: ''
      }
    }
  },

  plugins: [
    // Custom plugin for cross-origin isolation in dev
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          next();
        });
      }
    }
  ]
});