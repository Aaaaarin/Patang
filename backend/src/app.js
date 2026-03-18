import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Existing routes
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';

// New v2 routes (spec-compliant)
import facilityRoutesV2 from './routes/facilityRoutesV2.js';
import bookingRoutesV2 from './routes/bookingRoutesV2.js';
import subscriptionRoutesV2 from './routes/subscriptionRoutesV2.js';
import subscriptionAdminRoutes from './routes/subscriptionAdminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import eventAdminRoutes from './routes/eventAdminRoutes.js';
import penaltyRoutes from './routes/penaltyRoutes.js';

// Cron jobs
import groupExpiryJob from './jobs/groupExpiryJob.js';
import noShowJob from './jobs/noShowJob.js';
import subscriptionExpiryJob from './jobs/subscriptionExpiryJob.js';
import slotGenerationJob from './jobs/slotGenerationJob.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Existing routes (unchanged)
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// New v2 routes (spec-compliant)
app.use('/api/v2/facilities', facilityRoutesV2);
app.use('/api/v2/bookings', bookingRoutesV2);
app.use('/api/v2/subscriptions', subscriptionRoutesV2);
app.use('/api/v2/admin/subscriptions', subscriptionAdminRoutes);
app.use('/api/v2/events', eventRoutes);
app.use('/api/v2/admin/events', eventAdminRoutes);
app.use('/api/v2/penalties', penaltyRoutes);

// Start cron jobs
groupExpiryJob.start();
noShowJob.start();
subscriptionExpiryJob.start();
slotGenerationJob.start();

console.log('[Cron] All scheduled jobs started');

export default app;
