import { WebSocket } from "ws";

export const roomSubscribers = new Map<string, Set<WebSocket>>();

export const subscribeToRoom = (code: string, ws: WebSocket) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  let subscribers = roomSubscribers.get(roomCode);
  if (!subscribers) {
    subscribers = new Set<WebSocket>();
    roomSubscribers.set(roomCode, subscribers);
  }

  subscribers.add(ws);
};

export const unsubscribeSocket = (ws: WebSocket) => {
  for (const [roomCode, subscribers] of roomSubscribers.entries()) {
    subscribers.delete(ws);
    if (subscribers.size === 0) {
      roomSubscribers.delete(roomCode);
    }
  }
};

export const publishToRoom = (code: string, payload: unknown) => {
  const roomCode = code.trim().toUpperCase();
  if (!roomCode) return;

  const subscribers = roomSubscribers.get(roomCode);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);
  for (const socket of subscribers) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};
