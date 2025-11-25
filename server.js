import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoute.js';
import paymentRoutes from './routes/paymentRoute.js';
import searchRoutes from './routes/searchRoute.js';

import attendanceRoutes from './routes/attendanceRoute.js'
import chatRoutes from './routes/chatRoute.js'
import collaborationRoutes from './routes/collaborationRoute.js'
import donationRoutes from './routes/DonationRoute.js'
import eventRoutes from './routes/eventRoute.js';
import followRoutes from './routes/followRoute.js';
import notificationRoutes from './routes/notificationRoute.js';
import orgRoutes from './routes/orgRoute.js';
import reviewRoutes from './routes/reviewRoute.js';
import userRoutes from './routes/userRoute.js';
import volunteerRoutes from './routes/volunteerRoute.js'
import adminRoutes from './routes/adminRoute.js'
import orgDocsRoutes from './routes/orgDocsRoute.js'

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

await connectDB();
console.log("Connected to Database")


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on: http://localhost:${PORT}`);
});

// Default route
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', followRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/volunteer', volunteerRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/collab', collaborationRoutes);

app.use('/api/search', searchRoutes);
app.use('/api/reviews', reviewRoutes);

app.use("/api/payment", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

app.use('/api/admin', adminRoutes);
app.use('/api/org-docs', orgDocsRoutes);