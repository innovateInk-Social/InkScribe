import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // enables access from external services/containers
  },
  preview: {
    port: 3000,
    host: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/embed.jsx'),
      name: 'InnovateInk',
      fileName: (format) => `inkscribe.${format}.js`
    },
    // Intentionally omitting 'rollupOptions.external' so that React and ReactDOM 
    // are fully bundled into the final script. This guarantees it works natively 
    // in Vanilla JS, PHP, Ruby, etc. without the customer needing to install React.
    rollupOptions: {
      output: {
        assetFileNames: "inkscribe.[ext]"
      }
    }
  }
})
