import express from 'express';
import auditController from '../controllers/auditController.js';
import { authenticate, authorize } from '../server/middleware/auth.js';

const router = express.Router();

// 所有日志操作都需要认证
router.use(authenticate);

// 管理员专属操作
router.get('/', authorize(['admin']), auditController.getAuditLogs);
router.get('/stats', authorize(['admin']), auditController.getAuditLogStats);
router.get('/count', authorize(['admin']), auditController.getAuditLogCount);
router.delete('/', authorize(['admin']), auditController.deleteAuditLogs);
router.delete('/old', authorize(['admin']), auditController.deleteOldLogs);

export default router;