import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/init.js';

const router = Router();

// ============================================
// EQUIPMENT & INVENTORY
// ============================================

// GET /api/equipment
router.get('/', async (req, res) => {
  try {
    const { category, condition, location, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (category) {
      params.push(category);
      whereClause += ` AND e.category = $${params.length}`;
    }
    if (condition) {
      params.push(condition);
      whereClause += ` AND e.condition = $${params.length}`;
    }
    if (location) {
      params.push(location);
      whereClause += ` AND e.location = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (e.equipment_name ILIKE $${params.length} OR e.serial_number ILIKE $${params.length} OR e.asset_tag ILIKE $${params.length})`;
    }

    const totalResult = await query(`SELECT COUNT(*) FROM equipment e WHERE ${whereClause}`, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT e.*, m.first_name || ' ' || m.last_name as assigned_to_name
       FROM equipment e
       LEFT JOIN members m ON e.assigned_to = m.id
       WHERE ${whereClause}
       ORDER BY e.equipment_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      equipment: dataResult.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Failed to fetch equipment' });
  }
});

// GET /api/equipment/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, m.first_name || ' ' || m.last_name as assigned_to_name
       FROM equipment e
       LEFT JOIN members m ON e.assigned_to = m.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({ equipment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch equipment' });
  }
});

// POST /api/equipment
router.post('/', async (req, res) => {
  try {
    const {
      equipmentName, description, category, model, serialNumber, assetTag,
      purchaseDate, purchasePrice, currentValue, condition, location,
      assignedTo, notes
    } = req.body;

    if (!equipmentName) {
      return res.status(400).json({ message: 'equipmentName is required' });
    }

    const uuid = uuidv4();
    const result = await execute(
      `INSERT INTO equipment (
        uuid, equipment_name, description, category, model, serial_number, asset_tag,
        purchase_date, purchase_price, current_value, condition, location, assigned_to, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        uuid, equipmentName, description || null, category || null, model || null, serialNumber || null,
        assetTag || null, purchaseDate || null, purchasePrice || null, currentValue || null,
        condition || 'good', location || null, assignedTo || null, notes || null
      ]
    );

    res.status(201).json({ message: 'Equipment added', equipment: result.rows[0] });
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Failed to add equipment' });
  }
});

// PUT /api/equipment/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { equipmentName, description, category, model, serialNumber, assetTag,
            purchaseDate, purchasePrice, currentValue, condition, location,
            assignedTo, notes, isActive } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    const fieldMap = {
      equipmentName: 'equipment_name', description: 'description', category: 'category',
      model: 'model', serialNumber: 'serial_number', assetTag: 'asset_tag',
      purchaseDate: 'purchase_date', purchasePrice: 'purchase_price', currentValue: 'current_value',
      condition: 'condition', location: 'location', assignedTo: 'assigned_to', notes: 'notes', isActive: 'is_active'
    };

    for (const [reqField, dbField] of Object.entries(fieldMap)) {
      if (req.body[reqField] !== undefined) {
        updates.push(`${dbField} = $${paramCount}`);
        params.push(req.body[reqField]);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(id);
    await execute(`UPDATE equipment SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

    res.json({ message: 'Equipment updated' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update equipment' });
  }
});

// DELETE /api/equipment/:id
router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM equipment WHERE id = $1', [req.params.id]);
    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete equipment' });
  }
});

// ============================================
// MAINTENANCE LOGS
// ============================================

// GET /api/equipment/:equipmentId/maintenance
router.get('/:equipmentId/maintenance', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM maintenance_logs WHERE equipment_id = $1 ORDER BY performed_at DESC`,
      [req.params.equipmentId]
    );
    res.json({ maintenance: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch maintenance logs' });
  }
});

// POST /api/equipment/:equipmentId/maintenance
router.post('/:equipmentId/maintenance', async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const { maintenanceType, description, performedBy, performedAt, cost, nextMaintenanceDate, notes } = req.body;

    if (!description || !performedAt) {
      return res.status(400).json({ message: 'description and performedAt are required' });
    }

    const result = await execute(
      `INSERT INTO maintenance_logs (equipment_id, maintenance_type, description, performed_by, performed_at, cost, next_maintenance_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [equipmentId, maintenanceType || null, description, performedBy || null, performedAt, cost || null, nextMaintenanceDate || null, notes || null]
    );

    res.status(201).json({ message: 'Maintenance recorded', log: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record maintenance' });
  }
});

export default router;
