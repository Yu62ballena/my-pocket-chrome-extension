// config.js
const config = {
  development: {
    API_BASE_URL: "http://localhost:3000",
  },
  production: {
    API_BASE_URL: "https://your-domain.com",
  },
};

// manifest.jsonの内容を見て判定する方法
const manifest = chrome.runtime.getManifest();
const isDevelopment = manifest.host_permissions?.includes(
  "http://localhost:3000/*"
);

const API_BASE_URL = isDevelopment
  ? config.development.API_BASE_URL
  : config.production.API_BASE_URL;
