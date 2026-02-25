const { ActivityLog } = require('../models');

const logActivity = async (req, action, details = {}) => {
  try {
    await ActivityLog.create({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      action,
      details,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent']?.substring(0, 500),
    });
  } catch (err) {
    console.error('Log error:', err.message);
  }
};

module.exports = { logActivity };
