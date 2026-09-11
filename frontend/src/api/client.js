import axios from 'axios';
import { installMockClient } from './mock.js';

const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// In demo mode (VITE_DEMO=1 at build time), replace the network adapter so
// every API call resolves against the in-memory mock dataset. This lets the
// SUS demo run statically without a backend.
installMockClient(client);

export default client;
