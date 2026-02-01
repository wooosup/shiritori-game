import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        // [핵심] 리액트 도플갱어 방지 코드
        // "어떤 라이브러리가 리액트를 찾든, 무조건 내 프로젝트의 리액트를 줘라"
        dedupe: ['react', 'react-dom'],
    },
})