import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dotenv from 'dotenv';

dotenv.config();
const apiTarget = process.env.API_TARGET || `http://localhost:${process.env.PORT || 5000}`;

export default defineConfig({
    plugins: [react(), tailwindcss()],
    root: './client',
    server: {
        port: 5173,
        proxy: {
            '/api': apiTarget,
            '/ws': {
                target: apiTarget.replace(/^http/, 'ws'),
                ws: true,
            },
        },
    },
    build: {
        outDir: '../dist/client',
        emptyOutDir: true,
    },
});
