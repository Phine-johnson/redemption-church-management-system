import { Router } from 'express';
import { query } from '../database/init.js';

const router = Router();

// ============================================
// REPORTS & ANALYTICS
// ============================================

// GET /api/reports/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Total members
    const membersResult = await query('SELECT COUNT(*) as total FROM members');
    const totalMembers = parseInt(membersResult.rows[0].total, 10);

    // Active members
    const activeResult = await query("SELECT COUNT(*) as total FROM members WHERE membership_status = 'Active'");
    const activeMembers = parseInt(activeResult.rows[0].total, 10);

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attendanceResult = await query(
      `SELECT COUNT(DISTINCT member_id) as total FROM attendance WHERE DATE(check_in_time) = $1`,
      [today]
    );
    const todayAttendance = parseInt(attendanceResult.rows[0].total, 10);

    // This month's donations
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    const donationsResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE donation_date >= $1`,
      [monthStart]
    );
    const monthlyDonations = parseFloat(donationsResult.rows[0].total) || 0;

    // Pending pledges
    const pledgesResult = await query(
      `SELECT COUNT(*) as total FROM pledges WHERE status = 'active' AND balance > 0`
    );
    const pendingPledges = parseInt(pledgesResult.rows[0].total, 10);

    // Recent activity (last 7 days)
    const recentResult = await query(
      `SELECT
        (SELECT COUNT(*) FROM members WHERE created_at >= NOW() - INTERVAL '7 days') as new_members,
        (SELECT COUNT(*) FROM attendance WHERE check_in_time >= NOW() - INTERVAL '7 days') as recent_attendance,
        (SELECT COUNT(*) FROM donations WHERE donation_date >= CURRENT_DATE - INTERVAL '7 days') as recent_donations`
    );

    // Attendance trend (last 30 days)
    const attendanceTrend = await query(
      `SELECT DATE(check_in_time) as date, COUNT(DISTINCT member_id) as count
       FROM attendance
       WHERE check_in_time >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(check_in_time)
       ORDER BY date DESC
       LIMIT 30`
    );

    // Top 10 donors (this month)
    const topDonors = await query(
      `SELECT COALESCE(m.first_name || ' ' || m.last_name, d.donor_name) as donor_name, SUM(d.amount) as total
       FROM donations d
       LEFT JOIN members m ON d.donor_id = m.id
       WHERE d.donation_date >= $1
       GROUP BY m.first_name, m.last_name, d.donor_name
       ORDER BY total DESC
       LIMIT 10`,
      [monthStart]
    );

    // Attendance by service type
    const byService = await query(
      `SELECT s.service_name, COUNT(DISTINCT a.member_id) as attendance_count
       FROM attendance a
       JOIN services s ON a.service_id = s.id
       WHERE DATE(a.check_in_time) >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY s.id, s.service_name
       ORDER BY attendance_count DESC`
    );

    res.json({
      summary: {
        totalMembers,
        activeMembers,
        todayAttendance,
        monthlyDonations,
        pendingPledges,
        newMembersThisWeek: parseInt(recentResult.rows[0].new_members, 10),
        recentAttendance: parseInt(recentResult.rows[0].recent_attendance, 10),
        recentDonations: parseInt(recentResult.rows[0].recent_donations, 10)
      },
      attendanceTrend,
      topDonors,
      attendanceByService: byService.rows
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// GET /api/reports/members
router.get('/members', async (req, res) => {
  try {
    const { timeframe = 'all' } = req.query;

    let dateFilter = '';
    if (timeframe === 'month') {
      dateFilter = "WHERE created_at >= DATE_TRUNC('month', NOW())";
    } else if (timeframe === 'quarter') {
      dateFilter = "WHERE created_at >= DATE_TRUNC('quarter', NOW())";
    } else if (timeframe === 'year') {
      dateFilter = "WHERE created_at >= DATE_TRUNC('year', NOW())";
    }

    // New members over time
    const newMembersTrend = await query(
      `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
       FROM members ${dateFilter}
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`
    );

    // Members by ministry
    const byMinistry = await query(
      `SELECT ministry, COUNT(*) as count
       FROM members
       WHERE membership_status = 'Active'
       GROUP BY ministry
       ORDER BY count DESC`
    );

    // Age distribution (if DOB available)
    const byAge = await query(
      `SELECT
        CASE
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) < 18 THEN '0-17'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) BETWEEN 18 AND 30 THEN '18-30'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) BETWEEN 31 AND 50 THEN '31-50'
          WHEN EXTRACT(YEAR FROM age(date_of_birth)) > 50 THEN '51+'
          ELSE 'Unknown'
        END as age_group,
        COUNT(*) as count
       FROM members
       WHERE date_of_birth IS NOT NULL
       GROUP BY age_group
       ORDER BY count DESC`
    );

    res.json({
      newMembersTrend,
      byMinistry: byMinistry.rows,
      byAge: byAge.rows
    });
  } catch (error) {
    console.error('Members report error:', error);
    res.status(500).json({ message: 'Failed to fetch members report' });
  }
});

// GET /api/reports/finance
router.get('/finance', async (req, res) => {
  try {
    const { timeframe = 'month' } = req.query;

    let dateClause = '';
    if (timeframe === 'month') {
      dateClause = "WHERE donation_date >= DATE_TRUNC('month', NOW())";
    } else if (timeframe === 'quarter') {
      dateClause = "WHERE donation_date >= DATE_TRUNC('quarter', NOW())";
    } else if (timeframe === 'year') {
      dateClause = "WHERE donation_date >= DATE_TRUNC('year', NOW())";
    }

    // Donations by payment method
    const byPaymentMethod = await query(
      `SELECT payment_method, COUNT(*) as count, SUM(amount) as total
       FROM donations ${dateClause}
       GROUP BY payment_method
       ORDER BY total DESC`
    );

    // Donations by campaign
    const byCampaign = await query(
      `SELECT c.campaign_name, COUNT(d.id) as donation_count, SUM(d.amount) as total
       FROM donations d
       LEFT JOIN campaigns c ON d.campaign_id = c.id
       ${dateClause === '' ? '' : dateClause + ' AND'}
       GROUP BY c.campaign_name
       ORDER BY total DESC`
    );

    // Monthly donations trend
    const monthlyTrend = await query(
      `SELECT DATE_TRUNC('month', donation_date) as month, SUM(amount) as total
       FROM donations
       GROUP BY DATE_TRUNC('month', donation_date)
       ORDER BY month DESC
       LIMIT 12`
    );

    // Expenses by category
    const expensesByCategory = await query(
      `SELECT ec.category_name, SUM(e.amount) as total
       FROM expenses e
       JOIN expense_categories ec ON e.category_id = ec.id
       ${dateClause.replace('donation_date', 'expense_date') || 'WHERE 1=1'}
       GROUP BY ec.category_name
       ORDER BY total DESC`
    );

    // Pledges fulfillment
    const pledgesFulfillment = await query(
      `SELECT
        COUNT(*) as total_pledges,
        SUM(pledge_amount) as total_pledged,
        SUM(total_given) as total_given,
        SUM(balance) as total_balance
       FROM pledges
       WHERE status = 'active'`
    );

    res.json({
      donationsByPaymentMethod: byPaymentMethod.rows,
      donationsByCampaign: byCampaign.rows,
      monthlyTrend,
      expensesByCategory: expensesByCategory.rows,
      pledgesFulfillment: pledgesFulfillment.rows[0]
    });
  } catch (error) {
    console.error('Finance report error:', error);
    res.status(500).json({ message: 'Failed to fetch finance report' });
  }
});

// GET /api/reports/attendance
router.get('/attendance', async (req, res) => {
  try {
    const { timeframe = '30days' } = req.query;

    let dateFilter = '';
    if (timeframe === 'week') {
      dateFilter = "WHERE check_in_time >= NOW() - INTERVAL '7 days'";
    } else if (timeframe === 'month') {
      dateFilter = "WHERE check_in_time >= NOW() - INTERVAL '30 days'";
    } else if (timeframe === 'quarter') {
      dateFilter = "WHERE check_in_time >= NOW() - INTERVAL '90 days'";
    } else if (timeframe === 'year') {
      dateFilter = "WHERE check_in_time >= NOW() - INTERVAL '365 days'";
    }

    // Overall attendance count
    const overallResult = await query(
      `SELECT COUNT(DISTINCT member_id) as unique_attendees, COUNT(*) as total_checkins ${dateFilter ? dateFilter : ''} FROM attendance`
    );

    // Attendance by service
    const byService = await query(
      `SELECT s.service_name, COUNT(DISTINCT a.member_id) as unique_attendees, COUNT(*) as checkins
       FROM attendance a
       JOIN services s ON a.service_id = s.id
       ${dateFilter}
       GROUP BY s.id, s.service_name
       ORDER BY checkins DESC`
    );

    // Attendance trend (daily)
    const dailyTrend = await query(
      `SELECT DATE(check_in_time) as date, COUNT(DISTINCT member_id) as unique_attendees, COUNT(*) as checkins
       FROM attendance
       ${dateFilter}
       GROUP BY DATE(check_in_time)
       ORDER BY date DESC
       LIMIT 30`
    );

    // New visitors (first-time attendees)
    const visitorsResult = await query(
      `SELECT COUNT(*) as total FROM (
         SELECT member_id FROM attendance
         GROUP BY member_id HAVING COUNT(*) = 1
       ) as first_timers`
    );

    res.json({
      overall: overallResult.rows[0],
      byService,
      dailyTrend,
      firstTimeVisitors: parseInt(visitorsResult.rows[0].total, 10)
    });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance report' });
  }
});

// GET /api/reports/export/:type - Export data as CSV
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { start_date, end_date } = req.query;

    let headers = [];
    let rows = [];
    let filename = '';

    if (type === 'members') {
      headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Ministry', 'Status', 'Household', 'Member Since'];
      const result = await query(`
        SELECT id, first_name, last_name, email, phone, ministry, membership_status, household, member_since
        FROM members
        ${start_date && end_date ? "WHERE member_since BETWEEN $1 AND $2" : ''}
        ORDER BY last_name, first_name
      `, start_date && end_date ? [start_date, end_date] : []);
      rows = result.rows;
      filename = 'members-export.csv';
    } else if (type === 'donations') {
      headers = ['ID', 'Donor', 'Amount', 'Currency', 'Payment Method', 'Donation Date', 'Type'];
      const result = await query(`
        SELECT d.id, COALESCE(m.first_name || ' ' || m.last_name, d.donor_name) as donor, d.amount, d.currency, d.payment_method, d.donation_date, d.donation_type
        FROM donations d
        LEFT JOIN members m ON d.donor_id = m.id
        ${start_date && end_date ? "WHERE d.donation_date BETWEEN $1 AND $2" : ''}
        ORDER BY d.donation_date DESC
      `, start_date && end_date ? [start_date, end_date] : []);
      rows = result.rows;
      filename = 'donations-export.csv';
    } else if (type === 'attendance') {
      headers = ['Member', 'Service', 'Check-In Time', 'Check-Out Time', 'Method'];
      const result = await query(`
        SELECT m.first_name || ' ' || m.last_name as member, s.service_name, a.check_in_time, a.check_out_time, a.check_in_method
        FROM attendance a
        JOIN members m ON a.member_id = m.id
        JOIN services s ON a.service_id = s.id
        ${start_date && end_date ? "WHERE DATE(a.check_in_time) BETWEEN $1 AND $2" : ''}
        ORDER BY a.check_in_time DESC
      `, start_date && end_date ? [start_date, end_date] : []);
      rows = result.rows;
      filename = 'attendance-export.csv';
    } else {
      return res.status(400).json({ message: 'Invalid export type' });
    }

    // Convert to CSV
    const csvHeaders = headers.join(',') + '\n';
    const csvRows = rows.map(row =>
      headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        const value = row[key] || row[header.toLowerCase().replace(/\s+/g, '_')] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvHeaders + csvRows);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data' });
  }
});

export default router;
