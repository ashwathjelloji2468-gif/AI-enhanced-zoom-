import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { setupSignaling } from './signaling';

/**
 * Initializes and configures the Socket.io server.
 */
export function initSocketServer(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  console.log('Socket.io server initialized and attached to HTTP server.');
  setupSignaling(io);

  return io;
}
