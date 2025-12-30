/**
 * Docker Utils
 * 
 * Utility functions for Docker Registry operations
 * 
 * @author IDocker Registry Team
 * @version 2.0.0
 */

import { logger } from '../utils/logger.js';

/**
 * Extract repository name and action from Docker Registry request
 * @param {Object} req - Express request object
 * @returns {Object} Object containing repository name and action
 */
export function extractRepositoryAndAction(req) {
  try {
    const pathParts = req.path.split('/').filter(part => part.length > 0);
    
    // Docker Registry API v2 paths:
    // /v2/<name>/manifests/<reference>
    // /v2/<name>/blobs/uploads/<uuid>
    // /v2/<name>/blobs/uploads/
    // /v2/<name>/blobs/<digest>
    // /v2/<name>/tags/list
    
    if (pathParts.length < 2) {
      return { repositoryName: null, action: null };
    }
    
    // Get repository name (everything after /v2/ and before the next API segment)
    let repositoryName = null;
    let action = null;
    
    if (pathParts[0] === 'v2') {
      // Find the API segment to determine the end of the repository name
      let nameEndIndex = 1;
      for (let i = 1; i < pathParts.length; i++) {
        if (['manifests', 'blobs', 'tags'].includes(pathParts[i])) {
          nameEndIndex = i;
          break;
        }
      }
      
      if (nameEndIndex > 1) {
        repositoryName = pathParts.slice(1, nameEndIndex).join('/');
        
        // Determine action based on HTTP method and API segment
        const apiSegment = pathParts[nameEndIndex];
        
        if (apiSegment === 'manifests') {
          if (req.method === 'GET') {
            action = 'pull';
          } else if (req.method === 'PUT') {
            action = 'push';
          } else if (req.method === 'DELETE') {
            action = 'delete';
          }
        } else if (apiSegment === 'blobs') {
          if (pathParts[nameEndIndex + 1] === 'uploads') {
            if (req.method === 'POST') {
              action = 'push';  // Initiate upload
            } else if (req.method === 'PATCH') {
              action = 'push';  // Upload chunk
            } else if (req.method === 'PUT') {
              action = 'push';  // Complete upload
            }
          } else {
            if (req.method === 'GET') {
              action = 'pull';  // Get blob
            }
          }
        } else if (apiSegment === 'tags') {
          if (req.method === 'GET') {
            action = 'pull';
          }
        }
      }
    }
    
    return { repositoryName, action };
  } catch (error) {
    logger.error('Error extracting repository and action:', error);
    return { repositoryName: null, action: null };
  }
}

/**
 * Generate Docker auth challenge response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} code - Error code (default: UNAUTHORIZED)
 */
export function generateAuthChallenge(res, message = 'Authentication required', code = 'UNAUTHORIZED') {
  res.set('WWW-Authenticate', 'Basic realm="IDocker Registry"');
  return res.status(401).json({
    errors: [{ code, message, detail: null }]
  });
}

/**
 * Generate Docker API error response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} code - Error code
 * @param {string} message - Error message
 */
export function generateDockerError(res, status, code, message) {
  return res.status(status).json({
    errors: [{ code, message, detail: null }]
  });
}

/**
 * Parse repository name to extract project and repository name
 * @param {string} repositoryName - Full repository name
 * @returns {Object} Object containing project name and repository name
 */
export function parseRepositoryName(repositoryName) {
  const repoParts = repositoryName.split('/');
  
  if (repoParts.length < 2) {
    throw new Error('Invalid repository name format. Expected: project-name/repo-name or namespace/project-name/repo-name');
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
  
  return { projectName, repoName };
}