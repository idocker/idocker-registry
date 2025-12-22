import express from 'express';
import projectController from '../controllers/projectController.js';
import { authenticate, authorize, checkProjectPermission } from '../server/middleware/auth.js';

const router = express.Router();

// 所有项目操作都需要认证
router.use(authenticate);

// 创建项目 - 只需要登录
router.post('/', projectController.createProject);

// 获取项目列表 - 只需要登录
router.get('/', projectController.getProjects);

// 获取特定项目 - 需要项目读取权限
router.get('/:id', checkProjectPermission('read'), projectController.getProject);

// 更新项目 - 需要项目写入权限
router.put('/:id', checkProjectPermission('write'), projectController.updateProject);

// 删除项目 - 需要项目删除权限
router.delete('/:id', checkProjectPermission('delete'), projectController.deleteProject);

// 添加项目成员 - 需要项目管理员权限
router.post('/:id/members', checkProjectPermission('admin'), projectController.addMember);

// 移除项目成员 - 需要项目管理员权限
router.delete('/:id/members/:userId', checkProjectPermission('admin'), projectController.removeMember);

// 更新成员角色 - 需要项目管理员权限
router.put('/:id/members/:userId', checkProjectPermission('admin'), projectController.updateMemberRole);

export default router;