import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import compression from "compression";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import connectionRoutes from "./routes/connection.route.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import passport from "passport";
import { initPassport } from "./lib/passport.js";
import  companyRoute  from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import messageRoutes from "./routes/message.route.js";
import scheduleRoutes from "./routes/schedule.route.js";
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import dns from 'dns';
dotenv.config({ path: '../.env' });
// Prefer IPv4 first to avoid NAT64 IPv6 issues with some networks (MongoDB Atlas)
dns.setDefaultResultOrder?.('ipv4first');

// Debug: Check if environment variables are loaded
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI environment variable is not set!');
  console.log('Please check your .env file in the root directory.');
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Initialize Passport strategies (Google, Twitter)
initPassport()
app.use(passport.initialize())

app.use(cookieParser());
app.use(compression());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/connections", connectionRoutes);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/schedule", scheduleRoutes);

// Socket.io
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true,
  }
});
app.set('io', io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.headers.cookie?.split(';').map(s=>s.trim()).find(c=>c.startsWith('hierai='))?.split('=')[1];
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
  } catch (e) {}
  next();
});

io.on('connection', (socket) => {
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }
});

import cron from 'node-cron';

// simple reminder task: every 15 minutes check meetings starting in < 60 min and send reminders once
import Meeting from './models/meeting.model.js';
import User from './models/user.model.js';
import { mailtrapClient, sender } from './lib/mailtrap.js';

const sentReminders = new Set();
cron.schedule('*/15 * * * *', async ()=>{
  try{
    const now = Date.now();
    const soon = new Date(now + 60*60000);
    const meetings = await Meeting.find({ status:'scheduled', startsAt: { $gte: new Date(now), $lte: soon } });
    for (const m of meetings){
      const key = m._id.toString()+':reminded';
      if (sentReminders.has(key)) continue;
      sentReminders.add(key);
      try{
        const host = await User.findById(m.host).select('email name');
        const guest = await User.findById(m.guest).select('email name');
        await mailtrapClient.send({ from: sender, to: [{email: host.email}], subject: 'Upcoming meeting in < 60 min', html: `<p>Meeting with ${guest.name} at ${m.startsAt.toISOString()}</p>` });
        await mailtrapClient.send({ from: sender, to: [{email: guest.email}], subject: 'Upcoming meeting in < 60 min', html: `<p>Meeting with ${host.name} at ${m.startsAt.toISOString()}</p>` });
      }catch(err){}
    }
  }catch(err){}
});

httpServer.listen(PORT, () => {
  console.log(`server listing on port ${PORT}`);
  connectDB();
});
