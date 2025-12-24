const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'registry.db');

console.log('检查数据库文件是否存在...');
const fs = require('fs');
if (fs.existsSync(dbPath)) {
    console.log('数据库文件存在:', dbPath);
    
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('连接数据库失败:', err.message);
            return;
        }
        
        console.log('已连接到数据库');
        
        // 检查表结构
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
            if (err) {
                console.error('查询表结构失败:', err.message);
                return;
            }
            
            console.log('\n数据库中的表:');
            tables.forEach(table => {
                console.log('  - ' + table.name);
            });
            
            // 检查registry_configs表结构
            db.all("PRAGMA table_info(registry_configs)", (err, columns) => {
                if (err) {
                    console.error('查询registry_configs表结构失败:', err.message);
                } else {
                    console.log('\nregistry_configs表结构:');
                    columns.forEach(col => {
                        console.log('  - ' + col.name + ' (' + col.type + ')');
                    });
                }
                
                // 检查repositories表结构
                db.all("PRAGMA table_info(repositories)", (err, columns) => {
                    if (err) {
                        console.error('查询repositories表结构失败:', err.message);
                    } else {
                        console.log('\nrepositories表结构:');
                        columns.forEach(col => {
                            console.log('  - ' + col.name + ' (' + col.type + ')');
                        });
                    }
                    
                    // 检查image_tags表结构
                    db.all("PRAGMA table_info(image_tags)", (err, columns) => {
                        if (err) {
                            console.error('查询image_tags表结构失败:', err.message);
                        } else {
                            console.log('\nimage_tags表结构:');
                            columns.forEach(col => {
                                console.log('  - ' + col.name + ' (' + col.type + ')');
                            });
                        }
                        
                        // 检查projects表结构
                        db.all("PRAGMA table_info(projects)", (err, columns) => {
                            if (err) {
                                console.error('查询projects表结构失败:', err.message);
                            } else {
                                console.log('\nprojects表结构:');
                                columns.forEach(col => {
                                    console.log('  - ' + col.name + ' (' + col.type + ')');
                                });
                            }
                            
                            // 检查是否有数据
                            db.all("SELECT COUNT(*) as count FROM registry_configs", (err, row) => {
                                if (err) {
                                    console.error('查询registry_configs数据失败:', err.message);
                                } else {
                                    console.log('\nregistry_configs表中的记录数:', row[0].count);
                                }
                                
                                db.all("SELECT COUNT(*) as count FROM repositories", (err, row) => {
                                    if (err) {
                                        console.error('查询repositories数据失败:', err.message);
                                    } else {
                                        console.log('repositories表中的记录数:', row[0].count);
                                    }
                                    
                                    db.all("SELECT COUNT(*) as count FROM image_tags", (err, row) => {
                                        if (err) {
                                            console.error('查询image_tags数据失败:', err.message);
                                        } else {
                                            console.log('image_tags表中的记录数:', row[0].count);
                                        }
                                        
                                        db.all("SELECT COUNT(*) as count FROM projects", (err, row) => {
                                            if (err) {
                                                console.error('查询projects数据失败:', err.message);
                                            } else {
                                                console.log('projects表中的记录数:', row[0].count);
                                            }
                                            
                                            // 检查repository.js中使用的表名
                                            console.log('\n检查repository.js中的表名使用:');
                                            console.log('  - repository_configs: 在代码中使用的是registry_configs');
                                            
                                            db.close();
                                            console.log('\n数据库检查完成');
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
} else {
    console.log('数据库文件不存在:', dbPath);
}