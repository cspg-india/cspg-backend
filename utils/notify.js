const { Notification } = require('../models');
const createNotification = async (userId, title, message, type = 'info') => {
  try {
    await Notification.create({ userId, title, message, type });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};
module.exports = { createNotification };
