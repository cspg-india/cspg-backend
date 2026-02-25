const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin','editor'), ctrl.getAllPayments);
router.post('/', protect, authorize('author'), ctrl.createPayment);
router.get('/my', protect, authorize('author'), ctrl.getMyPayments);
router.put('/:id/verify', protect, authorize('admin','editor'), ctrl.verifyPayment);

module.exports = router;
