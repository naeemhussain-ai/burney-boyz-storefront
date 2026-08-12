const express = require('express');
const router = express.Router();

const adminAccessController = require('../controllers/adminAccess.controller');

// GET /api/admin/access-requests?status=
router.get('/', adminAccessController.listRequests);
// POST /api/admin/access-requests/:id/approve
router.post('/:id/approve', adminAccessController.approveRequest);
// POST /api/admin/access-requests/:id/decline
router.post('/:id/decline', adminAccessController.declineRequest);

module.exports = router;
