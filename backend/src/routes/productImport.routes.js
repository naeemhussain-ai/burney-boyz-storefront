const express = require('express');
const router = express.Router();

const productImportController = require('../controllers/productImport.controller');

// POST /api/import-product/:cjProductId
router.post('/import-product/:cjProductId', productImportController.importProduct);

module.exports = router;
