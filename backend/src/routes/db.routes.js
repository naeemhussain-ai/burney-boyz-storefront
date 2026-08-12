const express = require('express');
const router = express.Router();

const dbController = require('../controllers/db.controller');

// GET /api/db-test
router.get('/db-test', dbController.dbTest);

module.exports = router;
