import express from 'express';
import authController from '../controllers/authController.js';
import { authenticate } from '../server/middleware/auth.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);
router.get('/profile', authenticate, authController.profile);
router.put('/password', authenticate, authController.changePassword);

export default router;