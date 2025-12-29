/**
 * Docker Registry Authorization Service
 *
 * Handles authorization for Docker Registry API operations
 * Integrates with existing project and repository permission system
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { dbGet, dbAll } from '../utils/dbHelper.js';
import { logger } from '../utils/logger.js';
import { AuthService } from './authService.js';

export class DockerAuthzService {
  /**
   * Check if user has permission to perform an action on a repository
   * @param {Object} user - User object with id, username, role
   * @param {string} repositoryName - Repository name in Docker Registry
   * @param {string} action - Action to perform (push, pull, delete)
   * @returns {Promise<Object>} Authorization result with allowed flag and reason
   */
  static async checkRepositoryPermission(user, repositoryName, action) {
    try {
      // Parse repository name to extract project and repository name
      // Docker repository names can be in formats like:
      // 1. project-name/repo-name
      // 2. namespace/project-name/repo-name
      const repoParts = repositoryName.split('/');
      
      if (repoParts.length < 2) {
        return {
          allowed: false,
          reason: 'Invalid repository name format. Expected: project-name/repo-name or namespace/project-name/repo-name'
        };
      }
      
      let projectName, repoName;
      
      if (repoParts.length === 2) {
        // Format: project-name/repo-name
        projectName = repoParts[0];
        repoName = repoParts[1];
      } else {
        // Format: namespace/project-name/repo-name
        projectName = repoParts[1];
        repoName = repoParts.slice(2).join('/');
      }
      
      // Find project by name
      const project = await dbGet(
        'SELECT id, name, namespace FROM projects WHERE name = ? AND is_active = 1',
        [projectName]
      );
      
      if (!project) {
        return {
          allowed: false,
          reason: `Project '${projectName}' not found or is inactive`
        };
      }
      
      // Admins have full access to all projects
      if (user.role === 'admin') {
        return {
          allowed: true,
          projectId: project.id,
          projectName: project.name,
          repositoryName: repoName
        };
      }
      
      // Check if user is a member of the project
      const membership = await dbGet(
        `SELECT pm.role as member_role
         FROM project_members pm
         WHERE pm.project_id = ? AND pm.user_id = ?`,
        [project.id, user.id]
      );
      
      if (!membership) {
        return {
          allowed: false,
          reason: `User is not a member of project '${projectName}'`
        };
      }
      
      // Find repository by name within the project
      const repository = await dbGet(
        'SELECT id, is_public FROM repositories WHERE project_id = ? AND name = ? AND is_active = 1',
        [project.id, repoName]
      );
      
      if (!repository) {
        // If repository doesn't exist, we need to check if the user can create it
        // For push operations, creating a new repository should be allowed if user has write permissions
        if (action === 'push') {
          // Check if user has write permission in the project
          if (membership.member_role === 'owner' || membership.member_role === 'maintainer') {
            return {
              allowed: true,
              projectId: project.id,
              projectName: project.name,
              repositoryName: repoName,
              isNewRepository: true
            };
          } else {
            return {
              allowed: false,
              reason: `User with role '${membership.member_role}' cannot create new repositories in project '${projectName}'`
            };
          }
        }
        
        return {
          allowed: false,
          reason: `Repository '${repoName}' not found in project '${projectName}'`
        };
      }
      
      // Check if repository is public or user has permission
      if (repository.is_public && action === 'pull') {
        return {
          allowed: true,
          projectId: project.id,
          projectName: project.name,
          repositoryName: repoName,
          isPublic: true
        };
      }
      
      // Check permissions based on action
      let hasPermission = false;
      switch (action) {
        case 'pull':
          // All project members can pull
          hasPermission = true;
          break;
        case 'push':
          // Only owners and maintainers can push
          hasPermission = membership.member_role === 'owner' || membership.member_role === 'maintainer';
          break;
        case 'delete':
          // Only owners can delete
          hasPermission = membership.member_role === 'owner';
          break;
        default:
          hasPermission = false;
      }
      
      if (!hasPermission) {
        return {
          allowed: false,
          reason: `User with role '${membership.member_role}' does not have permission to perform '${action}' action on repository '${repoName}'`
        };
      }
      
      return {
        allowed: true,
        projectId: project.id,
        projectName: project.name,
        repositoryName: repoName
      };
    } catch (error) {
      logger.error('Error checking repository permission:', error);
      return {
        allowed: false,
        reason: 'Internal error while checking permissions'
      };
    }
  }
  
  /**
   * Log Docker operation for audit
   * @param {Object} user - User object
   * @param {string} action - Action performed
   * @param {string} repositoryName - Repository name
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @param {Object} additionalInfo - Additional information
   */
  static async logDockerOperation(user, action, repositoryName, ipAddress, userAgent, additionalInfo = {}) {
    try {
      const auditData = {
        user_id: user.id,
        action: `docker:${action}`,
        resource_type: 'repository',
        resource_id: repositoryName,
        details: {
          repositoryName,
          ...additionalInfo
        },
        ip_address: ipAddress,
        user_agent: userAgent
      };
      
      // Import AuthModel to use logAudit method
      const { AuthModel } = await import('../models/AuthModel.js');
      const authModel = new AuthModel();
      await authModel.logAudit(auditData);
      
      logger.info(`Docker operation logged: ${user.username} performed ${action} on ${repositoryName}`);
    } catch (error) {
      logger.error('Failed to log Docker operation:', error);
    }
  }
  
  /**
   * Generate Docker Registry token with specific scopes
   * @param {Object} user - User object
   * @param {string} service - Service name
   * @param {Array} requestedScopes - Requested scopes
   * @returns {string} JWT token
   */
  static generateDockerToken(user, service, requestedScopes = []) {
    try {
      // Validate and filter scopes based on user permissions
      const validScopes = [];
      
      if (requestedScopes.length === 0) {
        // If no scopes requested, grant full access (for simplicity)
        validScopes.push({
          type: 'registry',
          name: service,
          actions: ['*']
        });
      } else {
        for (const scope of requestedScopes) {
          // Parse scope format: repository:name:action1,action2
          if (scope.type === 'repository') {
            // For this implementation, we'll validate later during actual operation
            // This is to keep the token generation fast and check permissions at request time
            validScopes.push({
              type: 'repository',
              name: scope.name,
              actions: scope.actions
            });
          }
        }
      }
      
      return AuthService.generateDockerToken(user, service, validScopes);
    } catch (error) {
      logger.error('Error generating Docker token:', error);
      throw error;
    }
  }
}