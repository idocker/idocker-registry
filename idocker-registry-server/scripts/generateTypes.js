/**
 * TypeScript类型生成脚本
 * 从后端模型自动生成前端类型定义
 *
 * @author IDocker Registry Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, '..');
const typesDir = path.join(serverDir, 'models');
const outputDir = path.join(__dirname, '..', '..', 'idocker-registry-ui', 'src', 'types');

// 模型到类型映射
const modelToTypes = {
  'ProjectModel.js': {
    modelName: 'Project',
    interfaceName: 'Project',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string', optional: true },
      { name: 'namespace', type: 'string', optional: true },
      { name: 'isActive', type: 'boolean', optional: true },
      { name: 'createdAt', type: 'string', optional: true },
      { name: 'updatedAt', type: 'string', optional: true },
      { name: 'createdByUsername', type: 'string', optional: true },
      { name: 'createdByName', type: 'string', optional: true },
      { name: 'memberRole', type: "'owner' | 'maintainer' | 'viewer'", optional: true },
      { name: 'memberSince', type: 'string', optional: true },
      { name: 'memberCount', type: 'number', optional: true },
      { name: 'repositoryCount', type: 'number', optional: true }
    ]
  },
  'UserModel.js': {
    modelName: 'User',
    interfaceName: 'User',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'username', type: 'string' },
      { name: 'email', type: 'string', optional: true },
      { name: 'fullName', type: 'string', optional: true },
      { name: 'role', type: "'admin' | 'user'" },
      { name: 'isActive', type: 'boolean' }
    ]
  },
  'RepositoryModel.js': {
    modelName: 'Repository',
    interfaceName: 'Repository',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string', optional: true },
      { name: 'projectId', type: 'number' },
      { name: 'isPublic', type: 'boolean', optional: true },
      { name: 'createdAt', type: 'string', optional: true },
      { name: 'updatedAt', type: 'string', optional: true }
    ]
  },
  'ImageTagModel.js': {
    modelName: 'ImageTag',
    interfaceName: 'ImageTag',
    fields: [
      { name: 'id', type: 'number' },
      { name: 'repositoryId', type: 'number' },
      { name: 'tag', type: 'string' },
      { name: 'digest', type: 'string', optional: true },
      { name: 'size', type: 'number', optional: true },
      { name: 'architecture', type: 'string', optional: true },
      { name: 'os', type: 'string', optional: true },
      { name: 'createdAt', type: 'string', optional: true },
      { name: 'updatedAt', type: 'string', optional: true }
    ]
  },
  'AuthModel.js': {
    modelName: 'Auth',
    interfaceName: 'AuthResponse',
    fields: [
      { name: 'token', type: 'string' },
      { name: 'expiresIn', type: 'number', optional: true },
      { name: 'issuedAt', type: 'string', optional: true },
      { name: 'user', type: 'User' }
    ]
  }
};

/**
 * 生成TypeScript接口定义
 */
function generateInterface(name, fields) {
  let interfaceCode = `export interface ${name} {\n`;

  fields.forEach(field => {
    const optionalMark = field.optional ? '?' : '';
    interfaceCode += `  ${field.name}: ${field.type}${optionalMark}\n`;
  });

  interfaceCode += '}\n\n';
  return interfaceCode;
}

/**
 * 主函数：生成类型
 */
function generateTypes() {
  let output = `/**
 * 自动生成的API类型定义
 * 从后端模型自动生成
 * 生成时间: ${new Date().toISOString()}
 *
 * @description
 * 这些类型定义是从后端Model文件自动生成的
 * 请勿手动修改，如需修改请更新对应的Model文件后重新生成
 */

// ==================== API响应类型 ====================

/**
 * 统一API响应类型
 */
export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface ApiError {
  success: false
  message: string
  error?: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ==================== 业务类型 ====================

`;

  // 读取模型文件并生成类型
  const modelFiles = fs.readdirSync(typesDir);
  const processedModels = new Set();

  modelFiles.forEach(file => {
    if (!file.endsWith('.js')) return;
    if (!modelToTypes[file]) return;

    const { modelName, interfaceName, fields } = modelToTypes[file];
    if (processedModels.has(interfaceName)) return;

    output += generateInterface(interfaceName, fields);
    processedModels.add(interfaceName);
  });

  output += `
// ==================== 分页响应类型 ====================

export interface ProjectPaginatedResponse extends ApiResponse<{
  projects: Project[]
  pagination: PaginationMeta
}> {}

export interface ImagePaginatedResponse extends ApiResponse<{
  images: Image[]
  pagination: PaginationMeta
}> {}

export interface UserPaginatedResponse extends ApiResponse<{
  users: User[]
  pagination: PaginationMeta
}> {}
`;

  return output;
}

// 执行生成
try {
  const types = generateTypes();
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 写入生成的类型文件
  const outputPath = path.join(outputDir, 'auto-generated.ts');
  fs.writeFileSync(outputPath, types, 'utf-8');
  
  console.log(`✅ 类型生成成功!`);
  console.log(`📁 输出文件: ${outputPath}`);
  console.log(`📝 生成了 ${types.split('\nexport interface').length - 1} 个接口`);
  
} catch (error) {
  console.error('❌ 类型生成失败:', error);
  process.exit(1);
}
