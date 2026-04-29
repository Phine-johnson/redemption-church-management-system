import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Database
import { initializeDatabase } from './database/init.js';

// Routes
import apiRouter from './routes/index.js';
import bibleRouter from './routes/bible.js';

// Middleware
import { authenticate, optionalAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// DATABASE
// ============================================
initializeDatabase().catch(err => {
  console.error('DB init failed:', err);
  process.exit(1);
});

// ============================================
// PUBLIC ROUTES
// ============================================

// Bible routes (public)
app.use('/api/bible', bibleRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'church-cms-server', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', apiRouter);

// Bootstrap for legacy frontend compatibility
app.get('/api/bootstrap', async (req, res) => {
  try {
    const dashboardData = {
      summary: { nextService: { title: 'Sunday Celebration', time: 'Sunday, 9:00 AM', note: 'Worship confirmed.' } },
      metrics: [
        { label: 'Attendance This Week', value: '842', change: '+6.2%' },
        { label: 'First-Time Guests', value: '24', change: '9 follow-up' },
        { label: 'Volunteers', value: '67', change: '5 teams covered' },
        { label: 'Giving This Month', value: '$48,240', change: '+12.4%' }
      ],
      activities: [
        { id: 1, category: 'Care', title: 'Hospital visit', description: 'Pastoral team assigned.', time: '15 mins ago' },
        { id: 2, category: 'Events', title: 'Youth retreat full', description: '54 confirmed.', time: '1 hour ago' },
        { id: 3, category: 'Finance', title: 'Offering reconciled', description: 'Count matched.', time: '2 hours ago' }
      ],
      careQueue: [
        { name: 'Deborah Owusu', reason: 'Bereavement support', priority: 'High' },
        { name: 'Michael Johnson', reason: 'Missed 3 weeks', priority: 'Medium' }
      ]
    };

    const membersResult = await query('SELECT * FROM members ORDER BY last_name LIMIT 100');
    const records = membersResult.rows.map(m => ({
      id: m.id, name: `${m.first_name} ${m.last_name}`, email: m.email,
      ministry: m.ministry, status: m.membership_status, lastSeen: m.last_seen,
      household: m.household
    }));

    const eventsData = {
      upcoming: [
        { id: 1, day: '27', month: 'APR', title: 'Leaders Prayer', description: 'Monthly prayer.', time: '6:00 PM', location: 'Upper Chapel', team: 'Leadership' },
        { id: 2, day: '01', month: 'MAY', title: 'Food Drive', description: 'Serve families.', time: '10:00 AM', location: 'Outreach', team: 'Missions' },
        { id: 3, day: '05', month: 'MAY', title: 'New Members Orientation', description: 'Introduce.', time: '1:30 PM', location: 'Hall', team: 'Connections' }
      ],
      volunteerCoverage: [
        { event: 'Sunday Celebration', team: 'Worship', coverage: 92 },
        { event: 'Youth Retreat', team: 'Youth', coverage: 76 }
      ]
    };

    res.json({
      dashboard: dashboardData,
      members: {
        summary: [{ label: 'Total Members', value: membersResult.rows.length.toString() }, { label: 'Active', value: '416' }, { label: 'Volunteers', value: '219' }, { label: 'New', value: '37' }],
        records
      },
      events: eventsData,
      finance: {
        summary: [
          { label: 'General Fund', value: '$31,480' },
          { label: 'Missions', value: '$8,650' },
          { label: 'Benevolence', value: '$4,210' }
        ],
        funds: [],
        transactions: []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load bootstrap' });
  }
});

// Protected routes (require authentication)
app.use('/api', authenticate, apiRouter);

// Optional auth (for profile)
const profileRouter = (await import('./routes/profile.js')).default;
app.use('/api/profile', optionalAuth, profileRouter);

// ============================================
// ERROR HANDLING
// ============================================
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// START
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Church CMS server listening on port ${PORT}`);
});

export default app;
