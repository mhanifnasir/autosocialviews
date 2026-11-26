require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./database');
const routes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
initializeDatabase().then(() => {
  console.log('✓ Database initialized');
}).catch((error) => {
  console.error('✗ Database initialization error:', error);
  process.exit(1);
});

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal Server Error'
  });
});

// Start server if run directly
if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎯 Multi-Player Dashboard Server`);
    console.log(`📡 Running on http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/health\n`);
  });
}

module.exports = app;
