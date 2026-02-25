const { Payment, Submission, User } = require('../models');
const { logActivity } = require('../middleware/logger');
const { createNotification } = require('../utils/notify');
const { v4: uuidv4 } = require('uuid');

exports.createPayment = async (req, res) => {
  try {
    const { submissionId, amount, method, transactionId } = req.body;
    const sub = await Submission.findByPk(submissionId);
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    if (sub.authorId !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });

    const pay = await Payment.create({ submissionId, authorId: req.user.id, amount, method, transactionId, status: 'pending' });
    const tl = sub.timeline || [];
    tl.push({ status: 'pending_fee', timestamp: new Date().toISOString(), note: `Payment of ₹${amount} submitted via ${method}`, userId: req.user.id });
    await sub.update({ status: 'pending_fee', timeline: tl });

    await createNotification(req.user.id, 'Payment Submitted', `Payment of ₹${amount} submitted for ${sub.journalId}. Awaiting verification.`, 'info');
    await logActivity(req, 'PAYMENT_SUBMITTED', { submissionId, amount, method, transactionId });
    res.status(201).json({ success: true, payment: pay });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const pays = await Payment.findAll({
      include: [
        { model: Submission, as: 'submission', attributes: ['id','journalId','title'] },
        { model: User, as: 'author', attributes: ['id','name','email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, payments: pays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyPayments = async (req, res) => {
  try {
    const pays = await Payment.findAll({
      where: { authorId: req.user.id },
      include: [{ model: Submission, as: 'submission', attributes: ['id','journalId','title'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, payments: pays });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const pay = await Payment.findByPk(req.params.id);
    if (!pay) return res.status(404).json({ success: false, message: 'Payment not found' });
    await pay.update({ status, notes, verifiedBy: req.user.id, verifiedAt: new Date() });

    if (status === 'completed') {
      const sub = await Submission.findByPk(pay.submissionId);
      if (sub) {
        const tl = sub.timeline || [];
        tl.push({ status: 'paid', timestamp: new Date().toISOString(), note: `Payment verified by ${req.user.name}`, userId: req.user.id });
        await sub.update({ status: 'paid', timeline: tl });
        await createNotification(pay.authorId, 'Payment Verified', `Your payment for ${sub.journalId} has been verified.`, 'success');
      }
    }
    await logActivity(req, 'PAYMENT_VERIFIED', { paymentId: pay.id, status });
    res.json({ success: true, payment: pay });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
