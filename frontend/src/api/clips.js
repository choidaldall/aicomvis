import client from './client';

export const listClips = (params = {}) =>
  client.get('/clips', { params }).then((r) => r.data);

export const getClip = (clipId) =>
  client.get(`/clips/${clipId}`).then((r) => r.data);

export const markClip = (clipId, category) =>
  client.post(`/clips/${clipId}/mark`, { category }).then((r) => r.data);

export const getFallCount = (period = '30d') =>
  client.get('/stats/fall-count', { params: { period } }).then((r) => r.data);

export const videoUrl = (clipId) => `/api/clips/${clipId}/video`;
export const thumbUrl = (clipId) => `/api/clips/${clipId}/thumbnail`;
