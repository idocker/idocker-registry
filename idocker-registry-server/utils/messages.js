/**
 * Backend Messages
 * Centralized message constants for internationalization
 * All messages in English to support global deployment
 */

export const messages = {
  // Database messages
  database: {
    notInitialized: 'Database not initialized. Please call initDatabase() first',
    connectionError: 'Database connection error',
    connectionSuccess: 'Database connection established',
    queryError: 'Database query error',
    executeError: 'Database execute error',
    transactionStartError: 'Transaction start error',
    transactionCommitError: 'Transaction commit error',
    transactionCallbackError: 'Transaction callback error',
    transactionError: 'Database transaction error',
    lastInsertIdError: 'Get last insert ID error',
    checkExistsError: 'Check record existence error',
    countError: 'Count records error',
    paginationError: 'Pagination query error'
  },

  // Authentication messages
  auth: {
    tokenMissing: 'Authentication token missing, please login again',
    userNotFound: 'User not found, please login again',
    userDisabled: 'User account is disabled',
    tokenExpired: 'Authentication token expired, please login again',
    invalidToken: 'Invalid authentication token',
    authError: 'Server authentication error',
    notAuthenticated: 'Not authenticated, please login',
    insufficientPermission: 'Insufficient permission to access this resource',
    requireAdmin: 'Admin permission required',
    credentialError: 'Username or password incorrect',
    authFailed: 'Authentication failed',
    unsupportedAuth: 'Unsupported authentication method',
    tokenServiceError: 'Token service error',
    passwordCheckError: 'Permission check failed',
    projectPermissionError: 'Project permission check failed',
    missingProjectId: 'Project ID parameter missing',
    accessDenied: 'Access denied to this project',
    deleteDenied: 'Delete permission denied',
    uploadDenied: 'Upload permission denied',
    middlewareError: 'Authentication middleware error',
    dockerAuthError: 'Docker Basic authentication error',
    pleaseLogin: 'Please login first'
  },

  // User messages
  user: {
    notFound: 'User not found',
    usernamePasswordRequired: 'Username and password are required',
    userIdPasswordRequired: 'User ID and password are required',
    loginFailed: 'User login verification failed',
    updateLastLoginFailed: 'Update user last login time failed',
    logLoginFailed: 'Record login log failed',
    getLoginLogsFailed: 'Get user login logs failed',
    checkLockedFailed: 'Check user locked status failed',
    resetPasswordFailed: 'Reset user password failed',
    verifyTokenFailed: 'Verify token failed',
    getUserPermissionsFailed: 'Get user permissions failed',
    findByUsernameFailed: 'Find user by username failed',
    checkUsernameExistsFailed: 'Check username existence failed',
    createUserFailed: 'Create user failed',
    getUserDetailFailed: 'Get user details failed',
    getPasswordInfoFailed: 'Get user password info failed',
    getBasicInfoFailed: 'Get user basic info failed',
    updatePasswordFailed: 'Update user password failed',
    auditLogFailed: 'Record audit log failed',
    getUserDetailsError: 'Error getting user details'
  },

  // Project messages
  project: {
    nameRequired: 'Project name cannot be empty',
    getProjectListFailed: 'Get project list failed',
    createProjectFailed: 'Create project failed',
    updateProjectFailed: 'Update project failed',
    deleteProjectFailed: 'Delete project failed',
    checkNameUniqueFailed: 'Check project name uniqueness failed',
    checkPermissionFailed: 'Check project permission failed',
    addMemberFailed: 'Add project member failed',
    getMembersFailed: 'Get project members failed',
    removeMemberFailed: 'Remove project member failed',
    updateMemberRoleFailed: 'Update project member role failed',
    checkOwnerFailed: 'Check project owner failed',
    checkExistsFailed: 'Check project existence failed',
    checkMemberExistsFailed: 'Check member existence failed',
    getOwnerCountFailed: 'Get project owner count failed',
    getBasicInfoFailed: 'Get project basic info failed',
    getMemberRoleFailed: 'Get project member role failed',
    getMemberIdFailed: 'Get project member ID failed',
    findByNameFailed: 'Find project by name failed',
    createProjectFailed2: 'Create project failed',
    getActiveCountFailed: 'Get active project count failed'
  },

  // Repository messages
  repository: {
    projectIdNameRequired: 'Project ID and repository name cannot be empty',
    findByProjectIdNameFailed: 'Find repository by project ID and name failed',
    createRepositoryFailed: 'Create repository failed',
    updateRepositoryFailed: 'Update repository failed',
    getProjectRepositoriesFailed: 'Get project repository list failed',
    deleteRepositoryFailed: 'Delete repository failed',
    getStatisticsFailed: 'Get repository statistics failed',
    getDetailFailed: 'Get repository detail failed',
    getBasicInfoFailed: 'Get repository basic info failed',
    findIdFailed: 'Find repository ID failed',
    createRepositoryFailed2: 'Create repository failed',
    findByNameFailed: 'Find repository by name failed',
    getActiveCountFailed: 'Get active repository count failed',
    getImageListError: 'Error getting image list',
    getProjectImageListError: 'Error getting project image list',
    getImageDetailError: 'Error getting image detail',
    getImageTagDetailError: 'Error getting image tag detail',
    skipInvalidRepoName: 'Skip invalid repository name: {name}',
    skipNoProjectRepo: 'Skip repository without project info: {name}',
    syncImageInfoError: 'Error synchronizing image information',
    getRegistryConfigError: 'Error getting Repository configuration'
  },

  // Image Tag messages
  imageTag: {
    getTagsFailed: 'Get repository tags failed',
    getTagInfoFailed: 'Get tag info failed',
    checkExistsFailed: 'Check tag existence failed',
    createTagFailed: 'Create tag failed',
    deleteTagFailed: 'Delete tag failed',
    batchCreateFailed: 'Batch create tags failed',
    getCountFailed: 'Get tag count failed',
    updateTagFailed: 'Update tag failed',
    getTotalCountFailed: 'Get total tag count failed',
    tagDataIncomplete: 'Tag data incomplete',
    tagIdRepoIdRequired: 'Tag ID and repository ID cannot be empty',
    tagIdUpdateDataRequired: 'Tag ID and update data cannot be empty'
  },

  // Registry Config messages
  registryConfig: {
    getDefaultFailed: 'Get default Registry configuration failed',
    getListFailed: 'Get Registry configuration list failed',
    getFailed: 'Get Registry configuration failed',
    createFailed: 'Create Registry configuration failed',
    updateFailed: 'Update Registry configuration failed',
    deleteFailed: 'Delete Registry configuration failed',
    setDefaultFailed: 'Set default Registry configuration failed',
    checkNameUniqueFailed: 'Check configuration name uniqueness failed',
    toggleStatusFailed: 'Toggle configuration status failed',
    nameUrlRequired: 'Configuration name and URL cannot be empty',
    configIdUpdateDataRequired: 'Configuration ID and update data cannot be empty',
    configIdRequired: 'Configuration ID cannot be empty'
  },

  // Docker Registry messages
  dockerRegistry: {
    checkConnection: 'Check Registry connection: {url}',
    connectionCheckFailed: 'Registry connection check failed',
    getRepositoriesFailed: 'Get repository list failed',
    getRepoListFailed: 'Failed to get repository list: {message}',
    getTagsFailed: 'Get repository tags failed',
    getRepoTagsFailed: 'Failed to get repository tags: {message}',
    getManifestFailed: 'Get image manifest failed',
    getManifestFailed: 'Failed to get image manifest: {message}',
    getBuildHistoryFailed: 'Get build history failed',
    getBuildHistoryFailed: 'Failed to get build history: {message}',
    deleteTagFailed: 'Delete tag failed',
    deleteTagFailed: 'Failed to delete tag: {message}',
    getBlobInfoFailed: 'Get blob info failed',
    getBlobInfoFailed: 'Failed to get blob info: {message}',
    getStoredImageInfoFailed: 'Get stored image info failed',
    getStoredImageInfoFailed: 'Failed to get stored image info: {message}',
    logOperationFailed: 'Log Docker API operation failed',
    getProjectByRepoNameFailed: 'Get project by repository name failed',
    checkProjectAccessFailed: 'Check project access failed',
    checkProjectDeleteFailed: 'Check project delete failed',
    checkProjectUploadFailed: 'Check project upload failed'
  },

  // Repository Sync messages
  repositorySync: {
    noDefaultConfig: 'No default Registry configuration found',
    getConfigFailed: 'Failed to get Registry configuration',
    cannotConnect: 'Cannot connect to Docker Registry',
    startSync: 'Starting Docker Repository data synchronization...',
    foundRepos: 'Found {count} repositories',
    processRepoFailed: 'Failed to process repository {name}: {error}',
    syncComplete: 'Sync complete: Processed {processed} repositories, {errors} errors, took {duration}ms',
    syncFailed: 'Failed to sync Docker Repository data',
    skipInvalidRepo: 'Skip invalid repository object',
    autoCreated: 'Auto-created by sync process',
    createNewProject: 'Create new project: {name}',
    repoNotExists: 'Repository does not exist, creating: {name}',
    repoExists: 'Repository exists, updating: {name}',
    repoInfoInvalid: 'Repository info invalid, cannot sync tags: {name}',
    foundTags: 'Repository {name} found {count} tags',
    existingTags: 'Repository {name} already has {count} tags',
    processTagFailed: 'Failed to process tag {repo}:{tag}: {error}',
    syncTagsComplete: 'Repository {name} sync complete: Added {added} tags, Updated {updated} tags, Deleted {deleted} tags',
    syncTagsFailed: 'Failed to sync repository tags {name}: {error}',
    cannotConnectRepo: 'Cannot connect to Docker Repository',
    projectNotFound: 'Project not found',
    startSyncProject: 'Starting repository data synchronization for project {name}...',
    foundProjectRepos: 'Found {count} repositories belonging to project {name}',
    syncProjectComplete: 'Project {name} sync complete: Processed {processed} repositories, {errors} errors, took {duration}ms',
    syncProjectFailed: 'Failed to sync project {projectId} repository data',
    getSyncStatusFailed: 'Failed to get sync status',
    recordSyncLogFailed: 'Failed to record sync log'
  },

  // Audit Log messages
  auditLog: {
    logDataIncomplete: 'Audit log data incomplete'
  },

  // Docker API operation log
  dockerApi: {
    logDataIncomplete: 'Log data incomplete'
  },

  // API responses
  api: {
    projectNotFound: 'Project not found',
    noPermission: 'No permission to access this project',
    getImageListFailed: 'Failed to get image list',
    getProjectImageListFailed: 'Failed to get project image list',
    imageRepoNotFound: 'Image repository not found',
    noPermissionImage: 'No permission to access this image',
    getImageDetailFailed: 'Failed to get image detail',
    imageTagNotFound: 'Image tag not found',
    noPermissionTag: 'No permission to delete this image tag',
    deleteTagFailed: 'Failed to delete image tag',
    onlyAdminSync: 'Only administrators can perform sync operations',
    noValidRepoConfig: 'No valid Repository configuration found',
    repoDataFormatError: 'Repository list data format error',
    syncImageInfoFailed: 'Failed to synchronize image information',
    getRegistryConfigFailed: 'Failed to get Repository configuration'
  }
};

export default messages;
