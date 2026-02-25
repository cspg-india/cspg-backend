const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Submission = sequelize.define('Submission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  journalId: { type: DataTypes.STRING(50), unique: true },
  authorId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.TEXT, allowNull: false },
  abstract: { type: DataTypes.TEXT, allowNull: false },
  keywords: { type: DataTypes.TEXT },
  domain: { type: DataTypes.STRING(200) },
  coverLetter: { type: DataTypes.TEXT },
  coAuthors: { type: DataTypes.JSON, defaultValue: [] },
  filePath: { type: DataTypes.STRING(500) },
  fileName: { type: DataTypes.STRING(300) },
  fileType: { type: DataTypes.STRING(50) },
  status: {
    type: DataTypes.ENUM(
      'submitted','received','desk_rejection','submitted_reviewer',
      'under_review','suggestion','revision','review',
      'accepted','pending_fee','paid','published'
    ),
    defaultValue: 'submitted'
  },
  assignedReviewerId: { type: DataTypes.UUID },
  timeline: { type: DataTypes.JSON, defaultValue: [] },
  revisionFilePath: { type: DataTypes.STRING(500) },
  revisionFileName: { type: DataTypes.STRING(300) },
  editorNote: { type: DataTypes.TEXT },
  reviewerCommentFilePath: { type: DataTypes.STRING(500) },
  reviewerCommentFileName: { type: DataTypes.STRING(300) },
}, {
  tableName: 'submissions',
  timestamps: true,
  hooks: {
    beforeCreate: (sub) => {
      if (!sub.journalId) {
        const r = () => Math.random().toString(36).substr(2,4).toUpperCase();
        sub.journalId = `CSPG-ISR-${r()}${r()}-${r()}${r()}`;
      }
    }
  }
});

module.exports = Submission;
