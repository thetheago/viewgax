import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { docApi } from './server/docApi.ts'

export default defineConfig({
  base: './',
  plugins: [react(), docApi()],
})
