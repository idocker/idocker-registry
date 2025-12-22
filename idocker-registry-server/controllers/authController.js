import User from '../models/User.js';
import { generateToken } from '../server/middleware/auth.js';
import { getLDAPService } from '../uitls/ldap.js';
import AuditLog from '../models/AuditLog.js';

class AuthController {
  async login(req, res) {
    try {
      const { username, password, ldapAuth = false } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      let user;
      const ldapConfig = process.env.LDAP_CONFIG ? JSON.parse(process.env.LDAP_CONFIG) : null;

      if (ldapAuth && ldapConfig && ldapConfig.enabled) {
        const ldapService = getLDAPService(ldapConfig);
        const ldapUserData = await ldapService.authenticate(username, password);
        user = await ldapService.syncUser(ldapUserData, password);
      } else {
        user = await User.findByUsername(username);
        
        if (!user) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        if (user.ldap_user) {
          return res.status(401).json({ 
            error: 'This is an LDAP user. Please use LDAP authentication.' 
          });
        }
        
        const isValidPassword = await User.validatePassword(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
      }

      await User.updateLastLogin(user.id);
      
      const token = generateToken(user);
      
      await AuditLog.create({
        userId: user.id,
        action: 'login',
        resourceType: 'user',
        resourceId: user.id,
        details: { method: ldapAuth ? 'ldap' : 'local' },
        projectId: 'login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          ldapUser: user.ldap_user
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  async logout(req, res) {
    try {
      if (req.user) {
        await AuditLog.create({
          userId: req.user.id,
          action: 'logout',
          resourceType: 'user',
          resourceId: req.user.id,
          details: {},
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
      
      return res.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }

  async register(req, res) {
    try {
      const { username, email, password, role = 'user' } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Username, email, and password are required' 
        });
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      const user = await User.create({
        username,
        email,
        password,
        role
      });
      
      await AuditLog.create({
        userId: user.id,
        action: 'register',
        resourceType: 'user',
        resourceId: user.id,
        details: { email, role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  async profile(req, res) {
    try {
      return res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          ldapUser: req.user.ldap_user,
          createdAt: req.user.created_at,
          lastLogin: req.user.last_login
        }
      });
    } catch (error) {
      console.error('Profile error:', error);
      return res.status(500).json({ error: 'Failed to get user profile' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required' 
        });
      }

      if (req.user.ldap_user) {
        return res.status(400).json({ 
          error: 'LDAP users cannot change password through this interface' 
        });
      }

      const user = await User.findByUsername(req.user.username);
      const isValidPassword = await User.validatePassword(currentPassword, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const updatedUser = await User.updatePassword(user.id, newPassword);
      
      await AuditLog.create({
        userId: req.user.id,
        action: 'change_password',
        resourceType: 'user',
        resourceId: req.user.id,
        details: {},
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
}

export default new AuthController();