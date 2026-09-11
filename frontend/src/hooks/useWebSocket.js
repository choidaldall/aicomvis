import { useEffect, useRef, useState, useCallback } from 'react';
import { isDemoMode, installMockWebSocket } from '../api/mock.js';

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/stream/status`;

export function useStatusWebSocket() {
  const [status, setStatus] = useState(null);
  const [fallEvent, setFallEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    // Demo mode: skip real WS, drive status via mock cycle.
    if (isDemoMode()) {
      setConnected(true);
      const unsubscribe = installMockWebSocket(
        (msg) => setStatus(msg),
        (evt) => setFallEvent(evt),
      );
      return () => { unsubscribe && unsubscribe(); };
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'status_update') setStatus(msg);
        else if (msg.type === 'fall_event') setFallEvent(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      if (typeof cleanup === 'function') cleanup();
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const clearFallEvent = useCallback(() => setFallEvent(null), []);

  return { status, fallEvent, clearFallEvent, connected };
}
