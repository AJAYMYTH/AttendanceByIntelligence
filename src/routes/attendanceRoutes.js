const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, attendanceController.recordAttendance);
router.get('/analytics', authenticateToken, attendanceController.getAnalytics);
router.get('/report', authenticateToken, attendanceController.downloadReport);
router.get('/export-openpyxl', authenticateToken, attendanceController.exportOpenPyxl);
router.get('/student/:id', authenticateToken, attendanceController.getStudentAttendance);
router.get('/student/:id/export', authenticateToken, attendanceController.exportIndividualOpenPyxl);

module.exports = router;
