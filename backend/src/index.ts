import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocketServer } from './socket';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Middlewares
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'zoom-clone-signaling-server' });
});

import { startBackgroundWorker } from './worker';

// Initialize Socket Server
initSocketServer(server);

// Start server listening
server.listen(PORT, () => {
  console.log(`Express and Socket.io Signaling Server is running on port ${PORT}`);
  
  // Start the background worker in-process!
  try {
    startBackgroundWorker();
  } catch (err) {
    console.error('Failed to start in-process background worker:', err);
  }
});
