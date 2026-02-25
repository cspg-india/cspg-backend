const sequelize = require('../config/database');
const User = require('./User');
const Submission = require('./Submission');
const Review = require('./Review');
const Payment = require('./Payment');
const Notification = require('./Notification');
const ActivityLog = require('./ActivityLog');

// Associations
User.hasMany(Submission, { foreignKey: 'authorId', as: 'submissions' });
Submission.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(Review, { foreignKey: 'reviewerId', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'reviewerId', as: 'reviewer' });

Submission.hasMany(Review, { foreignKey: 'submissionId', as: 'reviews' });
Review.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

Submission.hasMany(Payment, { foreignKey: 'submissionId', as: 'payments' });
Payment.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

User.hasMany(Payment, { foreignKey: 'authorId', as: 'payments' });
Payment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, User, Submission, Review, Payment, Notification, ActivityLog };
