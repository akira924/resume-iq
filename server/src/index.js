import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';

await mongoose.connect(config.mongoUri);
console.log('Connected to MongoDB');

const server = createApp().listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

server.on('error', async (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${config.port} is already in use — another server (maybe an old one) is still running.\n` +
        `Stop it, or set a different PORT in .env.\n` +
        `  Find it:  netstat -ano | findstr :${config.port}\n` +
        `  Stop it:  Stop-Process -Id <PID>   (PowerShell)\n`,
    );
  } else {
    console.error(err);
  }
  await mongoose.disconnect();
  process.exit(1);
});
