const express = require('express');
const router = express.Router();
const { Notification, ActivityLog } = require('../models/index');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { Payment } = require('../models/index');
const { auth, requireRole } = require('../middleware/auth');
const xlsx = require('xlsx');

// Get my notifications
router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark notification read
router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { id: req.params.id, user_id: req.user.id } });
    res.json({ message: 'Marked read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark all read
router.patch('/notifications/read-all', auth, async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { user_id: req.user.id, is_read: false } });
    res.json({ message: 'All marked read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Activity logs (admin only)
router.get('/logs', auth, requireRole('admin'), async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    const where = {};
    if (search) {
      const { Op } = require('sequelize');
      where.action = { [Op.like]: `%${search}%` };
    }
    const { count, rows } = await ActivityLog.findAndCountAll({
      where, order: [['created_at', 'DESC']],
      limit: parseInt(limit), offset: (page - 1) * limit,
      include: [{ model: User, attributes: ['id', 'name', 'email', 'role'], required: false }],
    });
    res.json({ logs: rows, total: count });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Export submissions (admin)
router.get('/export/submissions', auth, requireRole('admin'), async (req, res) => {
  try {
    const subs = await Submission.findAll({
      include: [{ model: User, as: 'author', attributes: ['name', 'email'] }],
      order: [['created_at', 'DESC']],
    });
    const data = subs.map(s => ({
      'Journal ID': s.journal_id, Title: s.title,
      Author: s.author?.name, Email: s.author?.email,
      Status: s.status, Domain: s.domain,
      'Submitted At': s.created_at, Keywords: s.keywords,
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Submissions');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=submissions-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Export payments (admin)
router.get('/export/payments', auth, requireRole('admin'), async (req, res) => {
  try {
    const pays = await Payment.findAll({
      include: [
        { model: Submission, attributes: ['journal_id', 'title'] },
        { model: User, as: 'author', attributes: ['name', 'email'] },
      ],
      order: [['created_at', 'DESC']],
    });
    const data = pays.map(p => ({
      'Payment ID': p.id, 'Journal ID': p.Submission?.journal_id,
      Title: p.Submission?.title, Author: p.author?.name, Email: p.author?.email,
      Amount: `₹${p.amount}`, Method: p.method, 'Transaction ID': p.transaction_id,
      Status: p.status, Date: p.created_at,
    }));
    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Payments');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=payments-export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

ActivityLog.belongsTo(User, { foreignKey: 'user_id', required: false });

module.exports = router;
