import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import memberRoutes from './members.js';
import attendanceRoutes from './attendance.js';
import financeRoutes from './finance.js';
import smsRoutes from './sms.js';
import equipmentRoutes from './equipment.js';
import clusterRoutes from './clusters.js';
import announcementRoutes from './announcements.js';
import reportsRoutes from './reports.js';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/members', memberRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/finance', financeRoutes);
router.use('/sms', smsRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/clusters', clusterRoutes);
router.use('/announcements', announcementRoutes);
router.use('/reports', reportsRoutes);

export default router;
