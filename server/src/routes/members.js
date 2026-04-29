import { Router } from 'express';
import { query, execute } from '../database/init.js';

const router = Router();

// GET /api/members - List all members with filters
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, ministry, search, family_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ` AND m.membership_status = $${params.length}`;
    }
    if (ministry) {
      params.push(ministry);
      whereClause += ` AND m.ministry = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (m.first_name ILIKE $${params.length} OR m.last_name ILIKE $${params.length} OR m.email ILIKE $${params.length})`;
    }
    if (family_id) {
      params.push(family_id);
      whereClause += ` AND m.family_id = $${params.length}`;
    }

    const totalResult = await query(
      `SELECT COUNT(*) FROM members m WHERE ${whereClause}`,
      params
    );
    const total = parseInt(totalResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT m.*, f.family_name
       FROM members m
       LEFT JOIN families f ON m.family_id = f.id
       WHERE ${whereClause}
       ORDER BY m.last_name, m.first_name
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      members: dataResult.rows,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

// GET /api/members/:id - Get single member with all details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const memberResult = await query(
      `SELECT m.*, f.family_name, f.address as family_address, f.city, f.state, f.postal_code
       FROM members m
       LEFT JOIN families f ON m.family_id = f.id
       WHERE m.id = $1`,
      [id]
    );

    if (!memberResult.rows || memberResult.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    const member = memberResult.rows[0];

    // Get custom field values
    const customResult = await query(
      `SELECT cf.field_name, cf.field_type, cv.value
       FROM member_custom_field_values cv
       JOIN member_custom_fields cf ON cv.custom_field_id = cf.id
       WHERE cv.member_id = $1
       ORDER BY cf.sort_order`,
      [id]
    );

    const customFields = {};
    customResult.rows.forEach(row => {
      customFields[row.field_name] = { value: row.value, type: row.field_type };
    });

    // Get documents
    const docsResult = await query(
      `SELECT id, document_type, file_name, file_url, uploaded_at
       FROM member_documents
       WHERE member_id = $1
       ORDER BY uploaded_at DESC`,
      [id]
    );

    res.json({
      member: { ...member, customFields },
      documents: docsResult.rows
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ message: 'Failed to fetch member' });
  }
});

// POST /api/members - Create member
router.post('/', async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender,
      ministry, status, lastSeen, household, familyId,
      address, emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      spouseName, spouseEmail, spousePhone, childrenNames,
      occupation, employer, educationLevel, howDidYouHear, referralSource, notes,
      baptismDate, baptismLocation, isSundaySchool, isYouthMinistry, isWorshipTeam, isVolunteer
    } = req.body;

    // Validate required
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    const uuid = uuidv4();
    const memberResult = await execute(
      `INSERT INTO members (
        uuid, first_name, last_name, email, phone, date_of_birth, gender, ministry,
        membership_status, last_seen, household, family_id, address,
        emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
        spouse_name, spouse_email, spouse_phone, children_names,
        occupation, employer, education_level, how_did_you_hear, referral_source, notes,
        baptism_date, baptism_location, is_sunday_school, is_youth_ministry, is_worship_team, is_volunteer
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
      ) RETURNING *`,
      [
        uuid, firstName, lastName, email, phone, dateOfBirth, gender, ministry || null,
        status || 'Visitor', lastSeen || null, household || null, familyId || null, address || null,
        emergencyContactName || null, emergencyContactPhone || null, emergencyContactRelation || null,
        spouseName || null, spouseEmail || null, spousePhone || null, childrenNames || null,
        occupation || null, employer || null, educationLevel || null, howDidYouHear || null, referralSource || null, notes || null,
        baptismDate || null, baptismLocation || null, isSundaySchool || false, isYouthMinistry || false, isWorshipTeam || false, isVolunteer || false
      ]
    );

    const newMember = memberResult.rows[0];
    res.status(201).json({ message: 'Member created', member: newMember });
  } catch (error) {
    console.error('Create member error:', error);
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create member' });
  }
});

// PUT /api/members/:id - Update member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
      'ministry', 'membershipStatus', 'lastSeen', 'household', 'familyId',
      'address', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation',
      'spouseName', 'spouseEmail', 'spousePhone', 'childrenNames',
      'occupation', 'employer', 'educationLevel', 'howDidYouHear', 'referralSource', 'notes',
      'baptismDate', 'baptismLocation', 'isSundaySchool', 'isYouthMinistry', 'isWorshipTeam', 'isVolunteer'
    ];

    const fieldMap = {
      firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone',
      dateOfBirth: 'date_of_birth', gender: 'gender', ministry: 'ministry',
      membershipStatus: 'membership_status', lastSeen: 'last_seen', household: 'household',
      familyId: 'family_id', address: 'address',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelation: 'emergency_contact_relation',
      spouseName: 'spouse_name', spouseEmail: 'spouse_email', spousePhone: 'spouse_phone',
      childrenNames: 'children_names',
      occupation: 'occupation', employer: 'employer',
      educationLevel: 'education_level', howDidYouHear: 'how_did_you_hear',
      referralSource: 'referral_source', notes: 'notes',
      baptismDate: 'baptism_date', baptismLocation: 'baptism_location',
      isSundaySchool: 'is_sunday_school',
      isYouthMinistry: 'is_youth_ministry',
      isWorshipTeam: 'is_worship_team',
      isVolunteer: 'is_volunteer'
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

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await execute(
      `UPDATE members SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ message: 'Failed to update member' });
  }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM members WHERE id = $1', [id]);
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ message: 'Failed to delete member' });
  }
});

// POST /api/members/:id/documents - Upload member document
router.post('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, fileName, fileUrl, fileSize, mimeType, notes } = req.body;

    if (!documentType || !fileName || !fileUrl) {
      return res.status(400).json({ message: 'documentType, fileName, and fileUrl are required' });
    }

    const result = await execute(
      `INSERT INTO member_documents (member_id, document_type, file_name, file_url, file_size, mime_type, uploaded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, documentType, fileName, fileUrl, fileSize || null, mimeType || null, req.user.id, notes || null]
    );

    res.status(201).json({ message: 'Document uploaded', document: result.rows[0] });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

// DELETE /api/documents/:documentId
router.delete('/documents/:documentId', async (req, res) => {
  try {
    await execute('DELETE FROM member_documents WHERE id = $1', [req.params.documentId]);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

export default router;
