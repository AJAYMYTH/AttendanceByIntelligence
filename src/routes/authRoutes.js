const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken, authorizeAdmin } = require('../middleware/authMiddleware');

const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('uid').trim().matches(/^G2TC-AS-\d{4}-[AS]$/).withMessage('Invalid UID format'),
];

const createUserValidation = [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
  body('role').isIn(['STAFF', 'ADMIN']).withMessage('Invalid role'),
];

router.post('/login', loginValidation, authController.login);
router.post('/register', authenticateToken, authorizeAdmin, createUserValidation, authController.createUser);
router.get('/users', authenticateToken, authorizeAdmin, authController.getUsers);
router.patch('/users/:id', authenticateToken, authorizeAdmin, authController.updateUser);
router.delete('/users/:id', authenticateToken, authorizeAdmin, authController.deleteUser);

module.exports = router;
