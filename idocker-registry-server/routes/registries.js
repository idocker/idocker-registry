import express from 'express';
import registryController from '../controllers/registryController.js';
import { authenticate, checkProjectPermission } from '../server/middleware/auth.js';

const router = express.Router();

router.use(authenticate);

// 创建注册表 - 需要项目写入权限
router.post('/', checkProjectPermission('write'), registryController.createRegistry);

// 获取注册表列表 - 需要项目读取权限
router.get('/', checkProjectPermission('read'), registryController.getRegistries);

// 获取特定注册表 - 需要项目读取权限
router.get('/:id', checkProjectPermission('read'), registryController.getRegistry);

// 更新注册表 - 需要项目写入权限
router.put('/:id', checkProjectPermission('write'), registryController.updateRegistry);

// 删除注册表 - 需要项目删除权限
router.delete('/:id', checkProjectPermission('delete'), registryController.deleteRegistry);

// 创建复制策略 - 需要项目写入权限
router.post('/replication-policies', checkProjectPermission('write'), registryController.createReplicationPolicy);

// 获取复制策略列表 - 需要项目读取权限
router.get('/replication-policies', checkProjectPermission('read'), registryController.getReplicationPolicies);

// 更新复制策略 - 需要项目写入权限
router.put('/replication-policies/:id', checkProjectPermission('write'), registryController.updateReplicationPolicy);

// 删除复制策略 - 需要项目删除权限
router.delete('/replication-policies/:id', checkProjectPermission('delete'), registryController.deleteReplicationPolicy);

export default router;