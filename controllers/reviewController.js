const { Review, Submission, User } = require('../models');
const { logActivity } = require('../middleware/logger');
const { createNotification } = require('../utils/notify');
const fs = require('fs');

exports.getAssignedReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      where: { reviewerId: req.user.id },
      include: [{ model: Submission, as: 'submission', include: [{ model: User, as: 'author', attributes: ['id','name','email','institution'] }] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const { decision, comments, recommendation } = req.body;
    const review = await Review.findOne({ where: { id: req.params.id, reviewerId: req.user.id } });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
    if (review.status === 'completed') return res.status(400).json({ success: false, message: 'Review already completed' });

    const updateData = {
      decision, comments, recommendation, status: 'completed', completedAt: new Date(),
    };
    if (req.file) { updateData.commentFilePath = req.file.path; updateData.commentFileName = req.file.originalname; }
    await review.update(updateData);

    const sub = await Submission.findByPk(review.submissionId);
    if (sub) {
      const tl = sub.timeline || [];
      tl.push({ status: 'review', timestamp: new Date().toISOString(), note: `Review completed. Decision: ${decision}`, userId: req.user.id });
      await sub.update({ status: 'review', timeline: tl, reviewerCommentFilePath: updateData.commentFilePath, reviewerCommentFileName: updateData.commentFileName });
      await createNotification(sub.authorId, 'Review Completed', `A review decision has been made for "${sub.title}"`, 'info');
    }
    await logActivity(req, 'REVIEW_SUBMITTED', { reviewId: review.id, decision });
    res.json({ success: true, review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forwardCommentToAuthor = async (req, res) => {
  try {
    const { note } = req.body;
    const sub = await Submission.findByPk(req.params.submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    const tl = sub.timeline || [];
    tl.push({ status: 'suggestion', timestamp: new Date().toISOString(), note: note || 'Editor forwarded reviewer comments to author', userId: req.user.id });
    await sub.update({ status: 'suggestion', timeline: tl, editorNote: note });

    await createNotification(sub.authorId, 'Reviewer Comments Shared', `Editor has shared reviewer feedback for "${sub.title}". Please review and revise.`, 'warning');
    await logActivity(req, 'COMMENT_FORWARDED', { submissionId: sub.id, journalId: sub.journalId });
    res.json({ success: true, message: 'Comments forwarded to author', submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    await req.user.update({ available: !req.user.available });
    res.json({ success: true, available: !req.user.available, message: `Status set to ${!req.user.available ? 'Available' : 'Busy'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
