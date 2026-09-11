import client from './client';

export const getSystemStatus = () =>
  client.get('/status').then((r) => r.data);

export const getSystemActivity = (limit = 20) =>
  client.get('/system/activity', { params: { limit } }).then((r) => r.data);
