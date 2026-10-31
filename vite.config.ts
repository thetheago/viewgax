import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { LikeC4VitePlugin } from 'likec4/vite-plugin'

export default defineConfig({
  base: './',
  plugins: [react(), LikeC4VitePlugin({ workspace: 'model', ai: 'disabled' })],
})
