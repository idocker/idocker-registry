import Database from '../config/database.js';
import bcrypt from 'bcryptjs';

const initDatabase = async () => {
  try {
    // 连接数据库
    await Database.connect();
    
    // 创建表
    console.log('Creating tables...');
    
    // 使用事务创建所有表和索引
    //Database.transaction(() => {
      Database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'user' NOT NULL,
          ldap_user INTEGER DEFAULT 0 NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME
        )
      `);
      
      Database.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      Database.exec(`
        CREATE TABLE IF NOT EXISTS project_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT DEFAULT 'member' NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(project_id, user_id)
        )
      `);
      
      Database.exec(`
        CREATE TABLE IF NOT EXISTS registries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          type TEXT DEFAULT 'docker' NOT NULL,
          project_id INTEGER NOT NULL,
          auth_config TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      Database.exec(`
        CREATE TABLE IF NOT EXISTS replication_policies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          source_registry_id INTEGER NOT NULL,
          target_registry_id INTEGER NOT NULL,
          filters TEXT,
          schedule TEXT DEFAULT 'manual' NOT NULL,
          enabled INTEGER DEFAULT 1 NOT NULL,
          project_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      Database.exec(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id INTEGER,
          details TEXT,
          project_id INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('Creating indexes...');
      
      Database.exec('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_registries_project_id ON registries(project_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_replication_policies_project_id ON replication_policies(project_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id)');
      Database.exec('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)');
      
      console.log('Creating admin user if not exists...');
      
      const adminExists = Database.get('SELECT id FROM users WHERE username = ?', ['admin']);
      
      if (!adminExists) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        
        Database.run(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@idocker.local', hashedPassword, 'admin']
        );
        
        console.log('Admin user created successfully. Username: admin, Password: admin123');
      }
    //});
    
    console.log('Database initialization completed successfully!');
    await Database.close();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();