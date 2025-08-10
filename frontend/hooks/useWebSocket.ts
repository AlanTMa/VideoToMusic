// hooks/useWebSocket.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { SilentVideoSynthWebSocket } from '../utils/api';

interface UseWebSocketOptions {
  sessionId?: string;
  autoConnect?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<SilentVideoSynthWebSocket | null>(null);

  const connect = useCallback(async () => {
    try {
      wsRef.current = new SilentVideoSynthWebSocket(options.sessionId);
      await wsRef.current.connect(
        options.onMessage,
        (error) => {
          setError('WebSocket connection failed');
          setIsConnected(false);
          options.onError?.(error);
        },
        () => {
          setIsConnected(false);
          options.onDisconnect?.();
        }
      );
      setIsConnected(true);
      setError(null);
      options.onConnect?.();
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((data: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(data);
    }
  }, [isConnected]);

  useEffect(() => {
    if (options.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [options.autoConnect, connect, disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
  };
};

