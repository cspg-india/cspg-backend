const { User, Submission, Review, ActivityLog, Payment } = require('../models');
const { logActivity } = require('../middleware/logger');
const { Op } = require('sequelize');
const xlsx = require('xlsx');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, institution, department, specialization } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email already exists' });
    const user = await User.create({ name, email, password: password || 'CSPG@2024', role, phone, institution, department, specialization });
    await logActivity(req, 'USER_CREATED', { email, role });
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { name, email, phone, institution, department, specialization, role, active } = req.body;
    await user.update({ name, email, phone, institution, department, specialization, role, active });
    await logActivity(req, 'USER_UPDATED', { userId: user.id, email: user.email });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    await Submission.destroy({ where: { authorId: user.id } });
    await user.destroy();
    await logActivity(req, 'USER_DELETED', { email: user.email });
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.toggleUserPortal = async (req, res) => {
  try {
    const { disabled, reason } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update({ portalDisabled: disabled, disabledReason: reason || '' });
    await logActivity(req, disabled ? 'PORTAL_DISABLED' : 'PORTAL_ENABLED', { userId: user.id, email: user.email, reason });
    res.json({ success: true, user, message: `Portal ${disabled ? 'disabled' : 'enabled'} for ${user.name}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getReviewers = async (req, res) => {
  try {
    const reviewers = await User.findAll({ where: { role: 'reviewer', active: true }, order: [['name', 'ASC']] });
    res.json({ success: true, reviewers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({ order: [['createdAt', 'DESC']], limit: 500 });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalSubs, underReview, accepted, published, totalUsers, pendingFee, totalPayments] = await Promise.all([
      Submission.count(),
      Submission.count({ where: { status: 'under_review' } }),
      Submission.count({ where: { status: 'accepted' } }),
      Submission.count({ where: { status: 'published' } }),
      User.count(),
      Submission.count({ where: { status: 'pending_fee' } }),
      Payment.findAll({ where: { status: 'completed' }, attributes: ['amount'] }),
    ]);
    const feeCollected = totalPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    res.json({ success: true, stats: { totalSubs, underReview, accepted, published, totalUsers, pendingFee, feeCollected } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportSubmissions = async (req, res) => {
  try {
    const subs = await Submission.findAll({
      include: [{ model: User, as: 'author', attributes: ['name','email','institution'] }],
      order: [['createdAt', 'DESC']],
    });
    const data = subs.map(s => ({
      'Journal ID': s.journalId, 'Title': s.title, 'Author': s.author?.name, 'Email': s.author?.email,
      'Institution': s.author?.institution, 'Status': s.status, 'Domain': s.domain,
      'Keywords': s.keywords, 'Submitted': s.createdAt?.toLocaleDateString('en-IN'),
    }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(data), 'Submissions');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=submissions.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.exportPayments = async (req, res) => {
  try {
    const pays = await Payment.findAll({
      include: [
        { model: Submission, as: 'submission', attributes: ['journalId','title'] },
        { model: User, as: 'author', attributes: ['name','email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const data = pays.map(p => ({
      'Journal ID': p.submission?.journalId, 'Title': p.submission?.title, 'Author': p.author?.name,
      'Email': p.author?.email, 'Amount (₹)': p.amount, 'Method': p.method,
      'Transaction ID': p.transactionId, 'Status': p.status, 'Date': p.createdAt?.toLocaleDateString('en-IN'),
    }));
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(data), 'Payments');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=payments.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
