import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/init.js';

const router = Router();

// ============================================
// DONATIONS
// ============================================

// GET /api/finance/donations - List donations
router.get('/donations', async (req, res) => {
  try {
    const { page = 1, limit = 100, start_date, end_date, donor_id, campaign_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (start_date) {
      params.push(start_date);
      whereClause += ` AND donation_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND donation_date <= $${params.length}`;
    }
    if (donor_id) {
      params.push(donor_id);
      whereClause += ` AND donor_id = $${params.length}`;
    }
    if (campaign_id) {
      params.push(campaign_id);
      whereClause += ` AND campaign_id = $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM donations WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT d.*, COALESCE(m.first_name || ' ' || m.last_name, d.donor_name) as donor_name
       FROM donations d
       LEFT JOIN members m ON d.donor_id = m.id
       WHERE ${whereClause}
       ORDER BY d.donation_date DESC, d.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      donations: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({ message: 'Failed to fetch donations' });
  }
});

// POST /api/finance/donations - Record donation
router.post('/donations', async (req, res) => {
  try {
    const {
      donorId, donorName, donorEmail, donationType, amount, currency = 'GHS',
      paymentMethod, paymentReference, campaignId, isTaxDeductible = true,
      donationDate, notes
    } = req.body;

    if (!amount || !donationType || !paymentMethod || !donationDate) {
      return res.status(400).json({ message: 'amount, donationType, paymentMethod, and donationDate are required' });
    }

    // Validate campaign exists if provided
    if (campaignId) {
      const campResult = await query('SELECT id FROM campaigns WHERE id = $1 AND is_active = true', [campaignId]);
      if (!campResult.rows || campResult.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid campaign' });
      }
    }

    // Generate UUID for donation
    const uuid = uuidv4();
    const donationId = uuid; // Use UUID as external reference if needed

    const result = await execute(
      `INSERT INTO donations (
        uuid, donor_id, donor_name, donor_email, donation_type, amount, currency,
        payment_method, payment_reference, campaign_id, is_tax_deductible,
        donation_date, notes, recorded_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        uuid, donorId || null, donorName || null, donorEmail || null, donationType, amount, currency,
        paymentMethod, paymentReference || null, campaignId || null, isTaxDeductible,
        donationDate, notes || null, req.user?.id || null
      ]
    );

    // If campaign, update campaign totals (could be done via trigger)
    if (campaignId) {
      // Optional: aggregate campaign progress
    }

    res.status(201).json({ message: 'Donation recorded', donation: result.rows[0] });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ message: 'Failed to record donation' });
  }
});

// PUT /api/finance/donations/:id - Update donation
router.put('/donations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentReference, donationDate, notes } = req.body;

    const updates = [];
    const params = [];

    if (amount !== undefined) {
      params.push(amount);
      updates.push(`amount = $${params.length}`);
    }
    if (paymentMethod) {
      params.push(paymentMethod);
      updates.push(`payment_method = $${params.length}`);
    }
    if (paymentReference !== undefined) {
      params.push(paymentReference);
      updates.push(`payment_reference = $${params.length}`);
    }
    if (donationDate) {
      params.push(donationDate);
      updates.push(`donation_date = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await execute(
      `UPDATE donations SET ${updates.join(', ')} WHERE id = ${params.length}`,
      params
    );

    res.json({ message: 'Donation updated' });
  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json({ message: 'Failed to update donation' });
  }
});

// DELETE /api/finance/donations/:id
router.delete('/donations/:id', async (req, res) => {
  try {
    await execute('DELETE FROM donations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Donation deleted' });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({ message: 'Failed to delete donation' });
  }
});

// ============================================
// PLEDGES
// ============================================

// GET /api/finance/pledges - List pledges
router.get('/pledges', async (req, res) => {
  try {
    const { member_id, campaign_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (member_id) {
      params.push(member_id);
      whereClause += ` AND p.member_id = $${params.length}`;
    }
    if (campaign_id) {
      params.push(campaign_id);
      whereClause += ` AND p.campaign_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND p.status = $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM pledges p WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT p.*, m.first_name || ' ' || m.last_name as member_name
       FROM pledges p
       LEFT JOIN members m ON p.member_id = m.id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      pledges: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get pledges error:', error);
    res.status(500).json({ message: 'Failed to fetch pledges' });
  }
});

// POST /api/finance/pledges - Create pledge
router.post('/pledges', async (req, res) => {
  try {
    const { member_id, campaign_id, pledgeAmount, frequency, startDate, endDate, notes } = req.body;

    if (!member_id || !pledgeAmount || !frequency || !startDate) {
      return res.status(400).json({ message: 'member_id, pledgeAmount, frequency, and startDate are required' });
    }

    // Verify member exists
    const memberCheck = await query('SELECT id FROM members WHERE id = $1', [member_id]);
    if (!memberCheck.rows || memberCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const result = await execute(
      `INSERT INTO pledges (member_id, campaign_id, pledge_amount, frequency, start_date, end_date, balance, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $3, $7) RETURNING *`,
      [member_id, campaign_id || null, pledgeAmount, frequency, startDate, endDate || null, notes || null]
    );

    res.status(201).json({ message: 'Pledge created', pledge: result.rows[0] });
  } catch (error) {
    console.error('Create pledge error:', error);
    res.status(500).json({ message: 'Failed to create pledge' });
  }
});

// ============================================
// EXPENSES
// ============================================

// GET /api/finance/expenses
router.get('/expenses', async (req, res) => {
  try {
    const { category_id, status, start_date, end_date, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (category_id) {
      params.push(category_id);
      whereClause += ` AND e.category_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND e.status = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      whereClause += ` AND e.expense_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      whereClause += ` AND e.expense_date <= $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM expenses e WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT e.*, ec.category_name
       FROM expenses e
       JOIN expense_categories ec ON e.category_id = ec.id
       WHERE ${whereClause}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      expenses: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

// POST /api/finance/expenses - Create expense
router.post('/expenses', async (req, res) => {
  try {
    const { category_id, description, amount, expenseDate, paymentMethod, receiptUrl, notes } = req.body;

    if (!category_id || !description || !amount || !expenseDate) {
      return res.status(400).json({ message: 'category_id, description, amount, and expenseDate are required' });
    }

    const result = await execute(
      `INSERT INTO expenses (category_id, expense_description, amount, expense_date, payment_method, receipt_url, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [category_id, description, amount, expenseDate, paymentMethod || null, receiptUrl || null, notes || null, req.user?.id || null]
    );

    res.status(201).json({ message: 'Expense recorded', expense: result.rows[0] });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Failed to record expense' });
  }
});

// ============================================
// CAMPAIGNS & CATEGORIES
// ============================================

// GET /api/finance/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { active_only = true } = req.query;
    const condition = active_only === 'true' ? 'WHERE is_active = true' : '';
    const result = await query(`SELECT * FROM campaigns ${condition} ORDER BY created_at DESC`);
    res.json({ campaigns: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// POST /api/finance/campaigns
router.post('/campaigns', async (req, res) => {
  try {
    const { campaignName, description, startDate, endDate, goalAmount } = req.body;
    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO campaigns (uuid, campaign_name, description, start_date, end_date, goal_amount)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uuid, campaignName, description || null, startDate || null, endDate || null, goalAmount || null]
    );
    res.status(201).json({ message: 'Campaign created', campaign: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

// GET /api/finance/categories
router.get('/categories', async (req, res) => {
  try {
    const result = await query('SELECT * FROM expense_categories ORDER BY category_name');
    res.json({ categories: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

export default router;
