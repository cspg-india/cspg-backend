const { Submission, User, Review, Payment, Notification } = require('../models');
const { logActivity } = require('../middleware/logger');
const { createNotification } = require('../utils/notify');
const path = require('path');
const fs = require('fs');

const addTimeline = (sub, status, note, userId) => {
  const tl = sub.timeline || [];
  tl.push({ status, timestamp: new Date().toISOString(), note, userId });
  return tl;
};

exports.createSubmission = async (req, res) => {
  try {
    const { title, abstract, keywords, domain, coverLetter, coAuthors } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'Manuscript file required (PDF or Word)' });

    const coAuthorsParsed = coAuthors ? JSON.parse(coAuthors) : [];
    const timeline = [{ status: 'submitted', timestamp: new Date().toISOString(), note: 'Manuscript submitted by author', userId: req.user.id }];

    const sub = await Submission.create({
      authorId: req.user.id, title, abstract, keywords, domain, coverLetter,
      coAuthors: coAuthorsParsed, filePath: file.path, fileName: file.originalname,
      fileType: path.extname(file.originalname), status: 'submitted', timeline,
    });

    await createNotification(req.user.id, 'Submission Received', `Your manuscript "${title}" (${sub.journalId}) has been received.`, 'success');
    await logActivity(req, 'SUBMISSION_CREATED', { journalId: sub.journalId, title });
    res.status(201).json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMySubmissions = async (req, res) => {
  try {
    const subs = await Submission.findAll({
      where: { authorId: req.user.id },
      include: [{ model: Review, as: 'reviews' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, submissions: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllSubmissions = async (req, res) => {
  try {
    const subs = await Submission.findAll({
      include: [
        { model: User, as: 'author', attributes: ['id','name','email','institution'] },
        { model: Review, as: 'reviews', include: [{ model: User, as: 'reviewer', attributes: ['id','name','email'] }] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, submissions: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSubmission = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id','name','email','institution','phone'] },
        { model: Review, as: 'reviews', include: [{ model: User, as: 'reviewer', attributes: ['id','name','email'] }] },
        { model: Payment, as: 'payments' },
      ],
    });
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (req.user.role === 'author' && sub.authorId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    const timeline = addTimeline(sub, status, note || `Status updated to ${status}`, req.user.id);
    await sub.update({ status, timeline, updatedAt: new Date() });

    await createNotification(sub.authorId, 'Submission Status Updated', `Your manuscript "${sub.title}" status changed to: ${status}`, 'info');
    await logActivity(req, 'STATUS_UPDATED', { journalId: sub.journalId, status, note });
    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.assignReviewer = async (req, res) => {
  try {
    const { reviewerId } = req.body;
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });

    const reviewer = await User.findOne({ where: { id: reviewerId, role: 'reviewer', active: true } });
    if (!reviewer) return res.status(404).json({ success: false, message: 'Reviewer not found' });

    const existing = await Review.findOne({ where: { submissionId: sub.id, reviewerId } });
    if (existing) return res.status(400).json({ success: false, message: 'Reviewer already assigned' });

    await Review.create({ submissionId: sub.id, reviewerId, status: 'pending' });
    const timeline = addTimeline(sub, 'submitted_reviewer', `Assigned to reviewer: ${reviewer.name}`, req.user.id);
    await sub.update({ status: 'submitted_reviewer', assignedReviewerId: reviewerId, timeline });

    await createNotification(reviewerId, 'New Review Assignment', `You have been assigned to review "${sub.title}" (${sub.journalId})`, 'info');
    await createNotification(sub.authorId, 'Reviewer Assigned', `A reviewer has been assigned to your manuscript "${sub.title}"`, 'info');
    await logActivity(req, 'REVIEWER_ASSIGNED', { journalId: sub.journalId, reviewerId });
    res.json({ success: true, submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (sub.filePath && fs.existsSync(sub.filePath)) fs.unlinkSync(sub.filePath);
    await Review.destroy({ where: { submissionId: sub.id } });
    await Payment.destroy({ where: { submissionId: sub.id } });
    await sub.destroy();
    await logActivity(req, 'SUBMISSION_DELETED', { journalId: sub.journalId });
    res.json({ success: true, message: 'Submission deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    const fileType = req.query.type || 'main';
    let filePath, fileName;
    if (fileType === 'revision') { filePath = sub.revisionFilePath; fileName = sub.revisionFileName; }
    else if (fileType === 'reviewer_comment') { filePath = sub.reviewerCommentFilePath; fileName = sub.reviewerCommentFileName; }
    else { filePath = sub.filePath; fileName = sub.fileName; }
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found' });
    res.download(filePath, fileName);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadRevision = async (req, res) => {
  try {
    const sub = await Submission.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.user.role === 'author' && sub.authorId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const timeline = addTimeline(sub, 'revision', 'Revision submitted by author', req.user.id);
    await sub.update({ revisionFilePath: req.file.path, revisionFileName: req.file.originalname, status: 'revision', timeline });
    res.json({ success: true, message: 'Revision uploaded', submission: sub });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
