// 简单的数据库初始化脚本，不依赖复杂的外部库
console.log('开始初始化数据库...');

try {
  // 检查 Node.js 版本
  const nodeVersion = process.version;
  console.log('Node.js 版本:', nodeVersion);
  
  // 尝试导入内置的 node:sqlite
  try {
    const { DatabaseSync } = require('node:sqlite');
    console.log('成功导入 node:sqlite 模块');
    
    import('./utils/initDatabase.js').then(() => {
      console.log('数据库初始化完成！');
    }).catch(err => {
      console.error('初始化数据库时出错:', err);
    });
  } catch (err) {
    console.error('无法导入 node:sqlite 模块。您的 Node.js 版本可能不支持它。', err);
    console.error('请使用 Node.js 22.0.0 或更高版本');
  }
} catch (err) {
  console.error('发生错误:', err);
}