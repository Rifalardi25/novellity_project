const express = require('express');
const { renderHomePage } = require('../controllers/page.controller');

const router = express.Router();

router.get('/', renderHomePage);

module.exports = router;