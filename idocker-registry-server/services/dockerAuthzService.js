import { logger } from '../utils/logger.js';
import { AuthService } from './authService.js';
import { ProjectModel } from '../models/ProjectModel.js';
import { RepositoryModel } from '../models/RepositoryModel.js';
import { AuthModel } from '../models/AuthModel.js';

const ACTION_PULL = 'pull';
const ACTION_PUSH = 'push';
const ACTION_DELETE = 'delete';

const ROLE_HIERARCHY = {
  admin: [ACTION_PULL, ACTION_PUSH, ACTION_DELETE],
  project_manager: [ACTION_PULL, ACTION_PUSH, ACTION_DELETE],
  developer: [ACTION_PULL, ACTION_PUSH, ACTION_DELETE],
  operator: [ACTION_PULL],
};

function hasPermission(userRole, action) {
  const allowed = ROLE_HIERARCHY[userRole];
  return allowed && allowed.includes(action);
}

export class DockerAuthzService {
  static async checkRepositoryPermission(user, repositoryName, action) {
    try {
      const repoParts = repositoryName.split('/').filter(Boolean);
      if (repoParts.length === 0) {
        return { allowed: false, reason: 'Invalid repository name format' };
      }

      // Image path is project/repo: first segment = project, rest = repo.
      // A single-segment name (idocker.vip/nginx) belongs to the built-in 'default' project.
      // Namespaces are an organizational label only and never part of the path.
      const projectName = repoParts.length === 1 ? 'default' : repoParts[0];
      const repoName = repoParts.length === 1 ? repoParts[0] : repoParts.slice(1).join('/');

      const projectModel = new ProjectModel();
      const project = await projectModel.findByName(projectName);

      if (!project || !project.is_active) {
        return { allowed: false, reason: `Project '${projectName}' not found or is inactive` };
      }

      if (user.role === 'admin') {
        return {
          allowed: true,
          projectId: project.id,
          projectName: project.name,
          repositoryName: repoName,
        };
      }

      const repositoryModel = new RepositoryModel();
      let repository = await repositoryModel.findByProjectIdAndName(project.id, repoName);

      if (!repository) {
        return { allowed: false, reason: `Repository '${repoName}' not found — push requires an existing repository` };
      }

      if (repository.is_public && action === ACTION_PULL) {
        return {
          allowed: true,
          repositoryId: repository.id,
          projectName: project.name,
          repositoryName: repoName,
          isPublic: true,
        };
      }

      // Images in the built-in 'default' project are visible/pullable by every authenticated user
      if (project.name === 'default' && action === ACTION_PULL) {
        return {
          allowed: true,
          repositoryId: repository.id,
          projectName: project.name,
          repositoryName: repoName,
          isDefaultProject: true,
        };
      }

      const membership = await repositoryModel.getUserMembership(repository.id, user.id);
      if (!membership) {
        return { allowed: false, reason: `User is not a member of repository '${repositoryName}'` };
      }

      if (!hasPermission(membership.role, action)) {
        return { allowed: false, reason: `Repository role '${membership.role}' does not have '${action}' permission` };
      }

      return {
        allowed: true,
        repositoryId: repository.id,
        projectName: project.name,
        repositoryName: repoName,
      };
    } catch (e) {
      logger.error('Error checking repository permission:', e);
      return { allowed: false, reason: 'Internal error while checking permissions' };
    }
  }

  static async logDockerOperation(user, action, repositoryName, ipAddress, userAgent, additionalInfo = {}) {
    try {
      const authModel = new AuthModel();
      await authModel.logAudit({
        user_id: user.id,
        action: `docker:${action}`,
        resource_type: 'repository',
        resource_id: repositoryName,
        details: { repositoryName, ...additionalInfo },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
      logger.info(`Docker operation logged: ${user.username} performed ${action} on ${repositoryName}`);
    } catch (error) {
      logger.error('Failed to log Docker operation:', error);
    }
  }

  static async generateDockerToken(user, service, requestedScopes = []) {
    try {
      const projectModel = new ProjectModel();
      const repositoryModel = new RepositoryModel();
      const validScopes = [];
      if (requestedScopes.length === 0) {
        validScopes.push({ type: 'registry', name: service, actions: ['*'] });
      } else {
        for (const scope of requestedScopes) {
          if (scope.type === 'repository') {
            let effectiveRole = user.role;
            if (user.role !== 'admin') {
              const repoParts = (scope.name || '').split('/').filter(Boolean);
              if (repoParts.length === 0) continue;
              // Image path is project/repo: first segment = project, rest = repo.
              // A single-segment name belongs to the built-in 'default' project.
              const projectName = repoParts.length === 1 ? 'default' : repoParts[0];
              const repoName = repoParts.length === 1 ? repoParts[0] : repoParts.slice(1).join('/');
              const project = await projectModel.findByName(projectName);
              if (project) {
                const repo = await repositoryModel.findByProjectIdAndName(project.id, repoName);
                if (repo) {
                  // Images in the built-in 'default' project are pullable by every authenticated user
                  if (repo.is_public || project.name === 'default') {
                    effectiveRole = 'operator';
                  } else {
                    const membership = await repositoryModel.getUserMembership(repo.id, user.id);
                    if (membership) {
                      effectiveRole = membership.role;
                    }
                  }
                }
              }
            }
            let allowedActions = ROLE_HIERARCHY[effectiveRole] || [];
            validScopes.push({
              type: 'repository',
              name: scope.name,
              actions: allowedActions,
            });
          }
        }
      }
      return AuthService.generateDockerToken(user, service, validScopes);
    } catch (e) {
      logger.error('Error generating Docker token:', e);
      throw e;
    }
  }
}