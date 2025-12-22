import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/registry.db');

// 确保数据目录存在
await fs.mkdir(path.dirname(DB_PATH), { recursive: true });

class Database {
    constructor() {
        this.db = null;
    }

    async connect() {
        try {
            // 使用Node.js内置的SQLite
            this.db = new DatabaseSync(DB_PATH);
            console.log('Connected to SQLite database.');
            return Promise.resolve();
        } catch (error) {
            console.error('Error opening database:', error);
            return Promise.reject(error);
        }
    }

    async close() {
        if (this.db) {
            try {
                this.db.close();
                this.db = null;
                console.log('Database connection closed.');
                return Promise.resolve();
            } catch (error) {
                console.error('Error closing database:', error);
                return Promise.reject(error);
            }
        } else {
            return Promise.resolve();
        }
    }

    async exec(sql) {
        if (!this.db) {
            await this.connect();
        }

        try {
            return this.db.exec(sql);
        } catch (error) {
            console.error('Error executing SQL:', error);
            throw error;
        }
    }

    run(sql, params = []) {
        if (!this.db) {
            this.connect();
        }

        try {
            console.log(sql, params);
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            return { id: result.lastInsertRowid, changes: result.changes };
        } catch (error) {
            console.error('Error running SQL:', error);
            throw error;
        }
    }

    get(sql, params = []) {
        if (!this.db) {
            this.connect();
        }

        try {
            const stmt = this.db.prepare(sql);
            return stmt.get(...params);
        } catch (error) {
            console.error('Error getting row:', error);
            throw error;
        }
    }

    all(sql, params = []) {
        if (!this.db) {
            this.connect();
        }

        try {
            const stmt = this.db.prepare(sql);
            return stmt.all(...params);
        } catch (error) {
            console.error('Error getting rows:', error);
            throw error;
        }
    }

    //   transaction(callback) {
    //     if (!this.db) {
    //       this.connect();
    //     }

    //     try {
    //       return this.db.transaction(callback)();
    //     } catch (error) {
    //       console.error('Transaction error:', error);
    //       throw error;
    //     }
    //   }
}

export default new Database();