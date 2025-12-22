import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate, authorize } from '../server/middleware/auth.js';

const router = express.Router();

// 所有用户管理路由都需要认证
router.use(authenticate);

// 用户管理路由 - 只有管理员可以访问
router.get('/', authorize(['admin']), userController.getAllUsers);
router.get('/:id', authorize(['admin']), userController.getUser);
router.post('/', authorize(['admin']), userController.createUser);
router.put('/:id', authorize(['admin']), userController.updateUser);
router.put('/:id/role', authorize(['admin']), userController.updateUserRole);
router.delete('/:id', authorize(['admin']), userController.deleteUser);

// 用户可以查看和更新自己的信息
router.get('/profile/me', userController.getOwnProfile);
router.put('/profile/me', userController.updateOwnProfile);
router.put('/password/me', userController.changeOwnPassword);

export default router;