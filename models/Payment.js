const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  submissionId: { type: DataTypes.UUID, allowNull: false },
  authorId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  method: { type: DataTypes.STRING(100), allowNull: false },
  transactionId: { type: DataTypes.STRING(200), allowNull: false },
  status: { type: DataTypes.ENUM('pending','completed','rejected'), defaultValue: 'pending' },
  verifiedBy: { type: DataTypes.UUID },
  verifiedAt: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;
