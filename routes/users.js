const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin','editor'), ctrl.getAllUsers);
router.get('/reviewers', protect, authorize('admin','editor'), ctrl.getReviewers);
router.get('/stats', protect, authorize('admin','editor'), ctrl.getDashboardStats);
router.get('/logs', protect, authorize('admin'), ctrl.getActivityLogs);
router.get('/export/submissions', protect, authorize('admin'), ctrl.exportSubmissions);
router.get('/export/payments', protect, authorize('admin'), ctrl.exportPayments);
router.post('/', protect, authorize('admin','editor'), ctrl.createUser);
router.get('/:id', protect, authorize('admin','editor'), ctrl.getUser);
router.put('/:id', protect, authorize('admin','editor'), ctrl.updateUser);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteUser);
router.put('/:id/portal', protect, authorize('admin','editor'), ctrl.toggleUserPortal);

module.exports = router;
