require('dotenv').config();
const sequelize = require('../config/database');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { Review, Payment, Timeline, Notification, ActivityLog } = require('../models/index');
const bcrypt = require('bcryptjs');

async function migrate() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connected!');

    console.log('Syncing models...');
    await sequelize.sync({ alter: true });
    console.log('Database synced!');

    // Seed default admin
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      const hash = await bcrypt.hash('Admin@CSPG2024', 12);
      await User.create({
        name: 'System Administrator',
        email: 'admin@cspgindia.com',
        password_hash: hash,
        role: 'admin',
        institution: 'CSPG India',
        department: 'Administration',
        is_active: true,
      });
      console.log('Default admin created: admin@cspgindia.com / Admin@CSPG2024');
    }

    // Seed default editor in chief
    const editorExists = await User.findOne({ where: { role: 'editor_in_chief' } });
    if (!editorExists) {
      const hash = await bcrypt.hash('Editor@CSPG2024', 12);
      await User.create({
        name: 'Editor in Chief',
        email: 'editor@cspgindia.com',
        password_hash: hash,
        role: 'editor_in_chief',
        institution: 'CSPG India',
        department: 'Editorial',
        is_active: true,
      });
      console.log('Default editor created: editor@cspgindia.com / Editor@CSPG2024');
    }

    console.log('Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
