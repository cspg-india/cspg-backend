const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/submissionController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', protect, authorize('admin','editor'), ctrl.getAllSubmissions);
router.post('/', protect, authorize('author'), upload.single('file'), ctrl.createSubmission);
router.get('/my', protect, authorize('author'), ctrl.getMySubmissions);
router.get('/:id', protect, ctrl.getSubmission);
router.put('/:id/status', protect, authorize('admin','editor'), ctrl.updateStatus);
router.post('/:id/assign', protect, authorize('admin','editor'), ctrl.assignReviewer);
router.delete('/:id', protect, authorize('admin','editor'), ctrl.deleteSubmission);
router.get('/:id/download', protect, ctrl.downloadFile);
router.post('/:id/revision', protect, authorize('author'), upload.single('file'), ctrl.uploadRevision);

module.exports = router;
