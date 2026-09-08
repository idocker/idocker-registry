/**
 * 最小冒烟测试
 *
 * 覆盖无外部依赖（不连接数据库、不启动 HTTP 服务）的纯逻辑模块：
 * - utils/apiResponse.js：统一响应格式约定
 * - utils/messages.js：集中式消息常量可加载且命名空间完整
 *
 * 运行方式（在 idocker-registry-server/ 目录）：
 *   npm test
 * 或
 *   node simple-test.js
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// logger 的文件 transport 需要已存在且可写的目录：
// 先创建临时目录、降低日志级别，再动态加载依赖 logger 的模块。
const tmpLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'idocker-registry-test-'));
process.env.LOG_DIR = tmpLogDir;
process.env.LOG_LEVEL = 'error';

const { success, successMessage, error, paginated, validationError } = await import('./utils/apiResponse.js');
const { messages } = await import('./utils/messages.js');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✔ ${name}`);
}

console.log('apiResponse 统一响应格式:');
check('success(data) -> { success:true, data }', () => {
  assert.deepEqual(success({ id: 1 }), { success: true, data: { id: 1 } });
});
check('success() 无 data 时不带 data 键', () => {
  assert.deepEqual(success(), { success: true });
});
check('successMessage(msg)', () => {
  assert.deepEqual(successMessage('ok'), { success: true, message: 'ok' });
});
check('error(message, statusCode)', () => {
  assert.deepEqual(error('bad request', 400), { success: false, message: 'bad request' });
});
check('error 带 errorCode', () => {
  assert.deepEqual(error('denied', 403, 'FORBIDDEN'), {
    success: false,
    message: 'denied',
    error: 'FORBIDDEN'
  });
});
check('paginated 结构映射', () => {
  const pagination = {
    page: 1,
    limit: 20,
    total: 35,
    totalPages: 2,
    hasNextPage: true,
    hasPrevPage: false
  };
  assert.deepEqual(paginated([1, 2], pagination), {
    success: true,
    data: [1, 2],
    pagination
  });
});
check('validationError(errors)', () => {
  const errors = [{ field: 'name', message: 'required' }];
  const out = validationError(errors);
  assert.equal(out.success, false);
  assert.equal(out.message, 'Data validation failed');
  assert.deepEqual(out.errors, errors);
});

console.log('messages 集中消息常量:');
check('模块可加载且包含全部命名空间', () => {
  const namespaces = [
    'database',
    'auth',
    'user',
    'project',
    'repository',
    'imageTag',
    'registryConfig',
    'dockerRegistry',
    'repositorySync',
    'auditLog',
    'dockerApi',
    'api'
  ];
  for (const ns of namespaces) {
    assert.ok(messages[ns], `缺少命名空间: ${ns}`);
  }
});

console.log(`\n通过 ${passed} 项断言 ✔`);
