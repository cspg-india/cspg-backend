const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Review = sequelize.define('Review', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submissionId: { type: DataTypes.UUID, allowNull: false },
  reviewerId: { type: DataTypes.UUID, allowNull: false },
  decision: { type: DataTypes.ENUM('accept','minor_revision','major_revision','reject') },
  comments: { type: DataTypes.TEXT },
  recommendation: { type: DataTypes.TEXT },
  commentFilePath: { type: DataTypes.STRING(500) },
  commentFileName: { type: DataTypes.STRING(300) },
  status: { type: DataTypes.ENUM('pending','completed'), defaultValue: 'pending' },
  completedAt: { type: DataTypes.DATE },
}, {
  tableName: 'reviews',
  timestamps: true,
});

module.exports = Review;
