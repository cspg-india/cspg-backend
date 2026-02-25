const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID },
  userEmail: { type: DataTypes.STRING(200) },
  userRole: { type: DataTypes.STRING(50) },
  action: { type: DataTypes.STRING(200), allowNull: false },
  details: { type: DataTypes.JSON },
  ipAddress: { type: DataTypes.STRING(50) },
  userAgent: { type: DataTypes.STRING(500) },
}, {
  tableName: 'activity_logs',
  timestamps: true,
});

module.exports = ActivityLog;
