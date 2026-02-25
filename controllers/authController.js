const { User } = require('../models');
const { generateToken } = require('../utils/jwt');
const { logActivity } = require('../middleware/logger');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, institution, department, specialization } = req.body;
    if (!['author', 'reviewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role for registration' });
    }
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password, role, phone, institution, department, specialization });
    const token = generateToken(user.id);
    await logActivity(req, 'USER_REGISTERED', { email, role });
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.active) return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    if (user.portalDisabled) return res.status(403).json({ success: false, message: `Portal access disabled: ${user.disabledReason || 'Contact admin'}` });
    const token = generateToken(user.id);
    req.user = user;
    await logActivity(req, 'USER_LOGIN', { email, role: user.role });
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, institution, department, specialization } = req.body;
    await req.user.update({ name, phone, institution, department, specialization });
    res.json({ success: true, user: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!(await req.user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    await req.user.update({ password: newPassword });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
