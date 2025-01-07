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
    host: 'redis', // Host Docker to localhost
    port: 6379, // Port Redis in container
  },
});

// Event Redis Client
redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

// Connect to Redis
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

  // send ping to keep connection alive
  res.write('event: ping\n\n');
  await redisClient.set(id, id);

  // Listener for new notif
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

  req.on('close', async () => {
    notificationEmitter.removeListener('notification', onNotification);
    await redisClient.del(id);
    res.end();
  });
});

app.post('/send-notification', express.json(), async (req, res) => {
  const { title, message, id } = req.body;

  try {
    const client = await redisClient.get(`${id}`);
    if (client) {
      notificationEmitter.emit('notification', {
        title,
        message,
        timestamp: new Date(),
        userId: id,
      });
      res.status(200).json({ success: true, message: 'Notification sent' });
    } else {
      res
        .status(200)
        .json({ success: true, message: 'Notification sent, but client not connected' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Notification can not sent' });
  }
});

app.post('/logout', express.json(), async (req, res) => {
  const { userId } = req.body;

  try {
    const client = await redisClient.get(`${userId}`);

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
