import Database from '../config/database.js';
import bcrypt from 'bcryptjs';

class User {
  static async create(userData) {
    const { username, email, password, role = 'user', ldapUser = false } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    try {
      const result = await Database.run(
        `INSERT INTO users (username, email, password, role, ldap_user, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [username, email, hashedPassword, role, ldapUser ? 1 : 0]
      );
      
      return await User.findById(result.id);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const user = await Database.get('SELECT * FROM users WHERE id = ?', [id]);
      if (user) {
        delete user.password;
        // Convert integer to boolean
        user.ldap_user = Boolean(user.ldap_user);
      }
      return user;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  static async findByUsername(username) {
    try {
      const user = await Database.get('SELECT * FROM users WHERE username = ?', [username]);
      if (user) {
        // Convert integer to boolean
        user.ldap_user = Boolean(user.ldap_user);
      }
      return user;
    } catch (error) {
      throw new Error(`Error finding user by username: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const user = await Database.get('SELECT * FROM users WHERE email = ?', [email]);
      return user;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  static async updateLastLogin(id) {
    try {
      await Database.run(
        "UPDATE users SET last_login = datetime('now') WHERE id = ?",
        [id]
      );
    } catch (error) {
      throw new Error(`Error updating last login: ${error.message}`);
    }
  }

  static async validatePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static async getAll(limit = 50, offset = 0) {
    try {
      const users = await Database.all(
        `SELECT id, username, email, role, ldap_user, created_at, updated_at, last_login 
         FROM users 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      // Convert integer values to boolean for frontend
      return users.map(user => ({
        ...user,
        ldap_user: Boolean(user.ldap_user)
      }));
    } catch (error) {
      throw new Error(`Error getting all users: ${error.message}`);
    }
  }

  static async updateRole(userId, role) {
    try {
      const result = await Database.run(
        'UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?',
        [role, userId]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating user role: ${error.message}`);
    }
  }

  static async updateRole(userId, role) {
    try {
      const result = await Database.run(
        'UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?',
        [role, userId]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating user role: ${error.message}`);
    }
  }

  static async update(id, userData) {
    try {
      const { username, email, role, ldapUser } = userData;
      const result = await Database.run(
        `UPDATE users 
         SET username = ?, email = ?, role = ?, ldap_user = ?, updated_at = datetime('now') 
         WHERE id = ?`,
        [username, email, role, ldapUser ? 1 : 0, id]
      );
      
      if (result.changes > 0) {
        return await User.findById(id);
      }
      return null;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  static async updatePassword(id, hashedPassword) {
    try {
      const result = await Database.run(
        'UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?',
        [hashedPassword, id]
      );
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const result = await Database.run('DELETE FROM users WHERE id = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }
}

export default User;