import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute, pool } from '../database/init.js';

const router = Router();

// ============================================
// SMS TEMPLATES
// ============================================

// GET /api/sms/templates
router.get('/templates', async (req, res) => {
  try {
    const { category, active_only = true } = req.query;
    let sql = 'SELECT * FROM sms_templates';
    const params = [];
    let whereAdded = false;

    if (active_only === 'true') {
      sql += ' WHERE is_active = true';
      whereAdded = true;
    }
    if (category) {
      sql += whereAdded ? ' AND' : ' WHERE';
      sql += ' category = $1';
      params.push(category);
    }

    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json({ templates: result.rows });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// POST /api/sms/templates
router.post('/templates', async (req, res) => {
  try {
    const { templateName, templateContent, category } = req.body;

    if (!templateName || !templateContent) {
      return res.status(400).json({ message: 'templateName and templateContent are required' });
    }

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO sms_templates (uuid, template_name, template_content, category, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [uuid, templateName, templateContent, category || 'general', req.user.id]
    );

    res.status(201).json({ message: 'Template created', template: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create template' });
  }
});

// PUT /api/sms/templates/:id
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { templateName, templateContent, category, isActive } = req.body;

    const updates = [];
    const params = [];

    if (templateName) {
      params.push(templateName);
      updates.push(`template_name = $${params.length}`);
    }
    if (templateContent) {
      params.push(templateContent);
      updates.push(`template_content = $${params.length}`);
    }
    if (category !== undefined) {
      params.push(category);
      updates.push(`category = $${params.length}`);
    }
    if (isActive !== undefined) {
      params.push(isActive);
      updates.push(`is_active = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await execute(`UPDATE sms_templates SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

    res.json({ message: 'Template updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// DELETE /api/sms/templates/:id
router.delete('/templates/:id', async (req, res) => {
  try {
    await execute('DELETE FROM sms_templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete template' });
  }
});

// ============================================
// SMS CAMPAIGNS
// ============================================

// GET /api/sms/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND status = $${params.length}`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM sms_campaigns WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT c.*, t.template_name, t.template_content
       FROM sms_campaigns c
       LEFT JOIN sms_templates t ON c.template_id = t.id
       WHERE ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      campaigns: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns' });
  }
});

// POST /api/sms/campaigns - Create campaign
router.post('/campaigns', async (req, res) => {
  try {
    const { campaignName, templateId, senderName, scheduledFor, recipientFilters } = req.body;

    if (!campaignName || !templateId) {
      return res.status(400).json({ message: 'campaignName and templateId are required' });
    }

    // Build recipient query based on filters
    // recipientFilters: { ministries: [], membership_statuses: [], gender: [] }
    let whereClause = '1=1';
    const filterParams = [];

    if (recipientFilters && recipientFilters.ministries && recipientFilters.ministries.length > 0) {
      whereClause += ` AND m.ministry = ANY($${filterParams.length + 1})`;
      filterParams.push(recipientFilters.ministries);
    }
    if (recipientFilters && recipientFilters.membership_statuses && recipientFilters.membership_statuses.length > 0) {
      whereClause += ` AND m.membership_status = ANY($${filterParams.length + 1})`;
      filterParams.push(recipientFilters.membership_statuses);
    }

    // Get recipients count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM members m WHERE ${whereClause}`,
      filterParams
    );
    const totalRecipients = parseInt(countResult.rows[0].total, 10);

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO sms_campaigns (uuid, campaign_name, template_id, sender_name, scheduled_for, total_recipients, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [uuid, campaignName, templateId, senderName || null, scheduledFor || null, totalRecipients, req.user.id]
    );

    res.status(201).json({ message: 'Campaign created', campaign: result.rows[0] });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Failed to create campaign' });
  }
});

// POST /api/sms/campaigns/:id/send - Send campaign immediately
router.post('/campaigns/:id/send', async (req, res) => {
  try {
    const { campaignId } = req.params;

    // Get campaign
    const campaignResult = await query('SELECT * FROM sms_campaigns WHERE id = $1', [campaignId]);
    if (!campaignResult.rows || campaignResult.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const campaign = campaignResult.rows[0];

    if (campaign.status === 'sending' || campaign.status === 'completed') {
      return res.status(400).json({ message: `Campaign already ${campaign.status}` });
    }

    // Mark as sending
    await execute("UPDATE sms_campaigns SET status = 'sending', sent_at = NOW() WHERE id = $1", [campaignId]);

    // Get template
    const templateResult = await query('SELECT * FROM sms_templates WHERE id = $1', [campaign.template_id]);
    const template = templateResult.rows[0];

    // Get recipients (all members for now - in production implement filtering by campaign.recipient_filters)
    const membersResult = await query('SELECT id, first_name, phone FROM members WHERE phone IS NOT NULL');
    const members = membersResult.rows;

    // Simulate sending (integrate with SMS provider like Twilio, Africa's Talking, etc.)
    let successCount = 0;
    let failCount = 0;

    for (const member of members) {
      try {
        // Replace template variables: {{firstName}}
        const message = template.template_content.replace(/\{\{firstName\}\}/g, member.first_name);

        // TODO: Integrate actual SMS provider
        // await sendSMS(member.phone, message, campaign.sender_name);

        // Log recipient
        await execute(
          `INSERT INTO sms_recipients (campaign_id, member_id, phone_number, status, sent_at)
           VALUES ($1, $2, $3, 'sent', NOW())`,
          [campaignId, member.id, member.phone]
        );
        successCount++;
      } catch (err) {
        failCount++;
      }
    }

    // Update campaign
    await execute(
      `UPDATE sms_campaigns
       SET successful_deliveries = $1, failed_deliveries = $2, status = 'completed'
       WHERE id = $3`,
      [successCount, failCount, campaignId]
    );

    res.json({
      message: 'Campaign sent',
      stats: { total: members.length, success: successCount, failed: failCount }
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ message: 'Failed to send campaign' });
  }
});

// GET /api/sms/campaigns/:id/recipients - Get campaign recipients
router.get('/campaigns/:id/recipients', async (req, res) => {
  try {
    const result = await query(
      `SELECT sr.*, m.first_name, m.last_name, m.phone
       FROM sms_recipients sr
       LEFT JOIN members m ON sr.member_id = m.id
       WHERE sr.campaign_id = $1
       ORDER BY sr.sent_at DESC`,
      [req.params.id]
    );

    res.json({ recipients: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch recipients' });
  }
});

export default router;
