import express from 'express';
import cors from 'cors';
import EventEmitter from 'events';
import redis from 'redis';

const PORT = 5001;

const app = express();
app.use(cors());
const notificationEmitter = new EventEmitter();

const redisClient = redis.createClient({
  socket: {
    host: 'redis', // Host Docker ke localhost
    port: 6379, // Port Redis di container
  },
});

// Event Redis Client
redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect ke Redis
redisClient.connect();

const otherLogicAsync = () =>
  new Promise((resolve) => {
    resolve(true);
  });

app.get('/notification/:id', async (req, res) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log('connect', new Date().toLocaleTimeString());

  // Kirim pesan "ping" untuk menjaga koneksi tetap hidup
  res.write('event: ping\n\n');
  await redisClient.set(id, id);

  // Listener untuk notifikasi baru
  const onNotification = async (data) => {
    try {
      await otherLogicAsync();
      const client = await redisClient.get(id);
      if (Number(id) === Number(data.userId) && !!client) {
        res.write(`id: ${+new Date()}\nevent: notification\ndata: ${JSON.stringify(data)}\n\n`);
      }
    } catch (error) {}
  };

  notificationEmitter.on('notification', onNotification);

  // Bersihkan listener saat koneksi ditutup
  req.on('close', async () => {
    notificationEmitter.removeListener('notification', onNotification);
    await redisClient.del(id);
    res.end();
  });
});

// Endpoint untuk mengirim notifikasi
app.post('/send-notification', express.json(), (req, res) => {
  const { title, message, id } = req.body;

  // Emit event notifikasi
  notificationEmitter.emit('notification', { title, message, timestamp: new Date(), userId: id });

  res.status(200).json({ success: true, message: 'Notification sent' });
});

// Endpoint untuk Logout
app.post('/logout', express.json(), async (req, res) => {
  const { userId } = req.body;

  // Cari koneksi user berdasarkan userId
  try {
    const client = await redisClient.get(userId);

    if (client) {
      await redisClient.del(userId);
      res.status(200).json({ success: true, message: 'User logged out and connection closed' });
    } else {
      res.status(404).json({ success: false, message: 'User not connected' });
    }
  } catch (error) {
    res.status(404).json({ success: false, message: 'User not connected' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running in port ${PORT}`);
});
