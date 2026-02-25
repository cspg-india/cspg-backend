const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/my', protect, authorize('reviewer'), ctrl.getAssignedReviews);
router.put('/:id/submit', protect, authorize('reviewer'), upload.single('file'), ctrl.submitReview);
router.post('/forward/:submissionId', protect, authorize('editor','admin'), ctrl.forwardCommentToAuthor);
router.put('/availability', protect, authorize('reviewer'), ctrl.toggleAvailability);

module.exports = router;
