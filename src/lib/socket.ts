'use client';

import { io, Socket } from 'socket.io-client';
import { createClient } from '@/utils/supabase/client';

/**
 * Socket.IO contra el backend NestJS.
 * - Sin sesión: conexión anónima (solo room:public).
 * - Con sesión: el backend valida el JWT y une a room:user (+ room:admin).
 * - El token se refresca y la conexión se rehace al cambiar la sesión.
 */

let socket: Socket | null = null;
let lastToken: string | undefined;
let authListenerAttached = false;

function resolveBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

async function readAccessToken(): Promise<string | undefined> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  } catch {
    return undefined;
  }
}

export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(resolveBaseUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  if (typeof window !== 'undefined' && !authListenerAttached) {
    authListenerAttached = true;
    try {
      const supabase = createClient();
      supabase.auth.onAuthStateChange(() => {
        void refreshSocketAuth();
      });
    } catch {
      // Sin Supabase disponible en SSR.
    }
  }

  return socket;
}

/** Actualiza el token y reconecta si cambió. */
export async function refreshSocketAuth(): Promise<Socket> {
  const current = getSocket();
  const token = await readAccessToken();

  if (token !== lastToken) {
    lastToken = token;
    current.auth = token ? { token } : {};
    if (current.connected) {
      current.disconnect();
      current.connect();
    }
  }

  if (!current.connected && !current.active) {
    current.connect();
  }

  return current;
}

export function connectSocket(): Socket {
  void refreshSocketAuth();
  return getSocket();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  lastToken = undefined;
}

export function joinCase(caseId: string): void {
  getSocket().emit('join:case', caseId);
}

export function leaveCase(caseId: string): void {
  getSocket().emit('leave:case', caseId);
}
