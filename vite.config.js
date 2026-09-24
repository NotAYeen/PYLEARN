import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'bundle.js',
        format: 'iife',
        name: 'PyApp'
      }
    }
  }
});