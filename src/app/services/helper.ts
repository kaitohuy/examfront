// src/app/services/helper.ts
let baseUrl: string;

const host = (typeof window !== 'undefined') ? window.location.hostname : '';

if (host === 'localhost' || host === '127.0.0.1') {
  // chạy FE local
  baseUrl = 'http://localhost:8080';
} else {
  // FE đã deploy
  baseUrl = 'https://examportal-ijzk.onrender.com';
}

export default baseUrl;
