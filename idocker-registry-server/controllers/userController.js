import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import AuditLog from '../models/AuditLog.js';

class UserController {
  // 获取所有用户 - 仅管理员
  async getAllUsers(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const users = await User.getAll(parseInt(limit), parseInt(offset));
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // 获取特定用户信息 - 仅管理员
  async getUser(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 不返回密码
      if (user.password) {
        delete user.password;
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // 创建用户 - 仅管理员
  async createUser(req, res) {
    try {
      const { username, email, password, role = 'user', ldapUser = false } = req.body;
      
      // 验证必填字段
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Username, email and password are required' 
        });
      }
      
      // 检查用户名是否已存在
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      
      // 检查邮箱是否已存在
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      
      // 创建用户
      const user = await User.create({
        username,
        email,
        password,
        role,
        ldapUser
      });
      
      // 记录审计日志
      await AuditLog.create({
        userId: req.user.id,
        action: 'create_user',
        resourceType: 'user',
        resourceId: user.id,
        details: { targetUser: username },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 不返回密码
      if (user.password) {
        delete user.password;
      }
      
      res.status(201).json(user);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  // 更新用户 - 仅管理员
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, role, ldapUser } = req.body;
      
      // 检查用户是否存在
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 检查用户名是否已被其他用户使用
      if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }
      
      // 检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }
      
      // 更新用户
      const updatedUser = await User.update(id, {
        username: username || user.username,
        email: email || user.email,
        role: role || user.role,
        ldapUser: ldapUser !== undefined ? ldapUser : user.ldap_user
      });
      
      // 记录审计日志
      await AuditLog.create({
        userId: req.user.id,
        action: 'update_user',
        resourceType: 'user',
        resourceId: id,
        details: { 
          oldData: user,
          newData: updatedUser
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 不返回密码
      if (updatedUser.password) {
        delete updatedUser.password;
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  // 更新用户角色 - 仅管理员
  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }
      
      // 检查用户是否存在
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 更新用户角色
      const success = await User.updateRole(id, role);
      
      if (success) {
        // 记录审计日志
        await AuditLog.create({
          userId: req.user.id,
          action: 'update_user_role',
          resourceType: 'user',
          resourceId: id,
          details: { 
            oldRole: user.role,
            newRole: role,
            targetUser: user.username
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.json({ message: 'User role updated successfully' });
      } else {
        res.status(400).json({ error: 'Failed to update user role' });
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  // 删除用户 - 仅管理员
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // 检查用户是否存在
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 不允许删除自己
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      // 删除用户
      const success = await User.delete(id);
      
      if (success) {
        // 记录审计日志
        await AuditLog.create({
          userId: req.user.id,
          action: 'delete_user',
          resourceType: 'user',
          resourceId: id,
          details: { deletedUser: user.username },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.json({ message: 'User deleted successfully' });
      } else {
        res.status(400).json({ error: 'Failed to delete user' });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // 获取当前用户信息
  async getOwnProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 不返回密码
      if (user.password) {
        delete user.password;
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // 更新当前用户信息
  async updateOwnProfile(req, res) {
    try {
      const { username, email } = req.body;
      const userId = req.user.id;
      
      // 获取当前用户信息
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 检查用户名是否已被其他用户使用
      if (username && username !== user.username) {
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
          return res.status(409).json({ error: 'Username already exists' });
        }
      }
      
      // 检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
          return res.status(409).json({ error: 'Email already exists' });
        }
      }
      
      // 更新用户信息
      const updatedUser = await User.update(userId, {
        username: username || user.username,
        email: email || user.email
      });
      
      // 记录审计日志
      await AuditLog.create({
        userId: userId,
        action: 'update_profile',
        resourceType: 'user',
        resourceId: userId,
        details: { 
          oldData: user,
          newData: updatedUser
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 不返回密码
      if (updatedUser.password) {
        delete updatedUser.password;
      }
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }

  // 修改当前用户密码
  async changeOwnPassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required' 
        });
      }
      
      // 获取当前用户信息
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // 验证当前密码
      const isValidPassword = await User.validatePassword(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // 哈希新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // 更新密码
      const success = await User.updatePassword(req.user.id, hashedPassword);
      
      if (success) {
        // 记录审计日志
        await AuditLog.create({
          userId: req.user.id,
          action: 'change_password',
          resourceType: 'user',
          resourceId: req.user.id,
          details: {},
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.json({ message: 'Password updated successfully' });
      } else {
        res.status(400).json({ error: 'Failed to update password' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}

export default new UserController();