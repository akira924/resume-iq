// Vercel entry point. Vercel calls this handler per request instead of running
// src/index.js (which calls listen() and is for local dev only).
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';

const app = createApp();
let connecting;

// Reuse one DB connection across requests while the function instance stays warm.
export default async function handler(req, res) {
  connecting ??= mongoose
    .connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 })
    .catch((err) => {
      connecting = undefined; // retry on the next request
      throw err;
    });
  await connecting;
  return app(req, res);
}
