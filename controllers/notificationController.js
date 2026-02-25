const { Notification } = require('../models');

exports.getNotifications = async (req, res) => {
  try {
    const notifs = await Notification.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']], limit: 50 });
    const unread = notifs.filter(n => !n.read).length;
    res.json({ success: true, notifications: notifs, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { userId: req.user.id } });
    res.json({ success: true, message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
