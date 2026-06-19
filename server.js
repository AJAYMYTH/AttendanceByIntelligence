const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { validateEnv } = require('./src/middleware/validateEnv');
const { errorHandler } = require('./src/middleware/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const passkeyRoutes = require('./src/routes/passkeyRoutes');

dotenv.config();
validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/api', limiter);
app.use(express.static('public', { maxAge: '1h' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/auth/passkey', passkeyRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`[ABI] Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[ABI] Port ${PORT} is already in use.`);
  } else {
    console.error(`[ABI] Server error: ${err.message}`);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[ABI] UNCAUGHT EXCEPTION:', err.name, err.message);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[ABI] UNHANDLED REJECTION:', err.name, err.message);
  process.exit(1);
});
