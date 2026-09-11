import client from './client';

export const startRtsp = (rtspUrl) =>
  client.post('/inference/rtsp/start', { rtsp_url: rtspUrl }).then((r) => r.data);

export const stopRtsp = () =>
  client.post('/inference/rtsp/stop').then((r) => r.data);

export const uploadVideo = (file, onProgress) => {
  const form = new FormData();
  form.append('video', file);
  return client.post('/inference/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  }).then((r) => r.data);
};
