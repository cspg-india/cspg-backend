require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { sequelize } = require('./models');

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many requests, try again later' } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.name === 'MulterError') return res.status(400).json({ success: false, message: err.message });
  if (err.message?.includes('Only PDF')) return res.status(400).json({ success: false, message: err.message });
  res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Database synced');

    // Create default admin if none exists
    const { User } = require('./models');
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    if (!adminExists) {
      await User.create({
        name: 'System Administrator',
        email: 'admin@cspgindia.com',
        password: 'Admin@CSPG2024',
        role: 'admin',
        institution: 'CSPG India',
        active: true,
      });
      console.log('✅ Default admin created: admin@cspgindia.com / Admin@CSPG2024');
    }

    const editorExists = await User.findOne({ where: { role: 'editor' } });
    if (!editorExists) {
      await User.create({
        name: 'Editor in Chief',
        email: 'editor@cspgindia.com',
        password: 'Editor@CSPG2024',
        role: 'editor',
        institution: 'CSPG India',
        active: true,
      });
      console.log('✅ Default editor created: editor@cspgindia.com / Editor@CSPG2024');
    }

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
};

startServer();
module.exports = app;
