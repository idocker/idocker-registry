// 创建一个简单的脚本来初始化数据库
import { spawn } from 'child_process';

const child = spawn('node', ['utils/initDatabase.js'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  console.log(`子进程退出，退出码 ${code}`);
});