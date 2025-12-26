/**
 * English Language Pack
 * English translations for iDocker Registry
 */

export default {
  // Common
  common: {
    welcome: 'Welcome',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    update: 'Update',
    confirm: 'Confirm',
    search: 'Search',
    searchPlaceholder: 'Search...',
    yes: 'Yes',
    no: 'No',
    submit: 'Submit',
    reset: 'Reset',
    back: 'Back',
    close: 'Close',
    select: 'Select',
    selectAll: 'Select All',
    clear: 'Clear',
    refresh: 'Refresh',
    download: 'Download',
    export: 'Export',
    import: 'Import',
    view: 'View',
    details: 'Details',
    actions: 'Actions',
    status: 'Status',
    type: 'Type',
    name: 'Name',
    description: 'Description',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    createdBy: 'Created By',
    operations: 'Operations',
    noData: 'No data available',
    required: 'Required',
    optional: 'Optional',
    language: 'Language',
    // Pagination
    totalRecords: '{count} total records',
    previousPage: 'Previous',
    nextPage: 'Next',
    more: 'more'
  },

  // Navigation
  nav: {
    home: 'Home',
    images: 'Images',
    repositories: 'Repositories',
    projects: 'Projects',
    users: 'Users',
    audit: 'Audit Log',
    sync: 'Sync',
    settings: 'Settings',
    logout: 'Logout',
    login: 'Login',
    register: 'Register',
    dashboard: 'Dashboard',
    profile: 'Profile',
    password: 'Change Password'
  },

  // Management Layout
  managementLayout: {
    managementCenter: 'Management Center',
    personalSettings: 'Personal Settings',
    systemManagement: 'System Management',
    basicInfo: 'Profile',
    changePassword: 'Change Password',
    projectManagement: 'Project Management',
    userManagement: 'User Management',
    warehouseSync: 'Warehouse Sync',
    toggleSidebar: 'Toggle Sidebar'
  },

  // Page Titles
  pageTitles: {
    basicInfo: 'Profile',
    basicInfoSubtitle: 'Manage your personal information and preferences',
    changePassword: 'Change Password',
    changePasswordSubtitle: 'Update your password regularly for account security',
    dashboard: 'Dashboard',
    dashboardSubtitle: 'System overview and statistics',
    projectManagement: 'Project Management',
    projectManagementSubtitle: 'Manage all projects and permissions in the system',
    userManagement: 'User Management',
    userManagementSubtitle: 'Manage all users and roles in the system',
    auditLog: 'Audit Log',
    auditLogSubtitle: 'View system operation records and audit information',
    warehouseSync: 'Warehouse Sync',
    warehouseSyncSubtitle: 'Sync warehouse data from Docker Registry to database',
    projectDetail: 'Project Detail',
    projectDetailSubtitle: 'View and manage project details',
    managementCenter: 'Management Center'
  },

  // Authentication
  auth: {
    loginTitle: 'Login to iDocker Registry',
    username: 'Username',
    password: 'Password',
    loginButton: 'Login',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    noAccount: 'Don\'t have an account?',
    registerNow: 'Register now',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed',
    logoutSuccess: 'Logout successful',
    invalidCredentials: 'Invalid username or password',
    accountDisabled: 'Account has been disabled, please contact administrator',
    sessionExpired: 'Session Expired',
    sessionExpiredMessage: 'Your login session has expired, please login again.',
    loginNow: 'Login Now',
    loginLater: 'Login Later'
  },

  // Users
  users: {
    title: 'User Management',
    createUser: 'Create User',
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    password: 'Password',
    resetPassword: 'Reset Password',
    userList: 'User List',
    username: 'Username',
    email: 'Email',
    fullName: 'Full Name',
    role: 'Role',
    roleAdmin: 'Administrator',
    roleUser: 'User',
    active: 'Active',
    inactive: 'Inactive',
    activateUser: 'Activate User',
    deactivateUser: 'Deactivate User',
    userCreated: 'User created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
    passwordReset: 'Password reset successfully',
    cannotDeleteSelf: 'Cannot delete your own account',
    cannotDeleteLastAdmin: 'Cannot delete the last admin account',
    usernameRequired: 'Username is required',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    usernameExists: 'Username already exists',
    emailExists: 'Email already exists'
  },

  // Projects
  projects: {
    title: 'Project Management',
    createProject: 'Create Project',
    editProject: 'Edit Project',
    deleteProject: 'Delete Project',
    projectList: 'Project List',
    projectName: 'Project Name',
    namespace: 'Namespace',
    description: 'Description',
    createdAt: 'Created At',
    updatedAt: 'Updated At',
    createdBy: 'Created By',
    repositoryCount: 'Repository Count',
    members: 'Members',
    memberList: 'Member List',
    addMember: 'Add Member',
    removeMember: 'Remove Member',
    updateMember: 'Update Member',
    roleOwner: 'Owner',
    roleMaintainer: 'Maintainer',
    roleViewer: 'Viewer',
    projectCreated: 'Project created successfully',
    projectUpdated: 'Project updated successfully',
    projectDeleted: 'Project deleted successfully',
    memberAdded: 'Member added successfully',
    memberUpdated: 'Member updated successfully',
    memberRemoved: 'Member removed successfully',
    cannotRemoveLastOwner: 'Cannot remove the last project owner',
    cannotModifyLastOwner: 'Cannot modify the last project owner\'s role',
    projectExists: 'Project already exists',
    namespaceExists: 'Namespace already exists',
    namespaceFormat: 'Namespace can only contain lowercase letters, numbers, and hyphens',
    noPermission: 'No permission to access this project',
    noPermissionModify: 'No permission to modify this project',
    noPermissionModifyMembers: 'No permission to modify project members',
    memberExists: 'User is already a project member',
    userNotMember: 'User is not a project member',
    userNotFoundOrDisabled: 'User not found or has been disabled'
  },

  // Images / Repositories
  images: {
    title: 'Image Repository',
    subtitle: 'Browse and manage Docker image repositories by project',
    imageList: 'Image List',
    searchImages: 'Search Images',
    imageName: 'Image Name',
    tag: 'Tag',
    tags: 'Tags',
    pullCommand: 'Pull Command',
    pushCommand: 'Push Command',
    copyPull: 'Copy Pull',
    copyPush: 'Copy Push',
    deleteImage: 'Delete Image',
    deleteTag: 'Delete Tag',
    imageDetails: 'Image Details',
    tagDetails: 'Tag Details',
    manifest: 'Manifest',
    layers: 'Layers',
    size: 'Size',
    digest: 'Digest',
    createdAt: 'Created',
    lastUpdated: 'Last Updated',
    imageDeleted: 'Image deleted successfully',
    tagDeleted: 'Tag deleted successfully',
    noImages: 'No images found',
    noTags: 'No tags found',
    noProjects: 'No Projects',
    noProjectPermission: 'You do not have permission to access any project',
    noDescription: 'No description',
    imageCount: 'images',
    noImagesInProject: 'No images in this project',
    tagCount: 'tags',
    architecture: 'Architecture',
    unknown: 'Unknown',
    imageTags: 'Image Tags',
    commandExample: 'Command Example',
    imageId: 'Image ID',
    os: 'Operating System',
    pullLink: 'Pull Link',
    pushLink: 'Push Link',
    imageInfoIncomplete: 'Image information incomplete',
    cannotGeneratePullLink: 'Cannot generate pull link',
    cannotGeneratePushLink: 'Cannot generate push link',
    pullLinkCopied: 'Pull link copied to clipboard',
    pushLinkCopied: 'Push link copied to clipboard',
    copyFailed: 'Copy failed',
    deletePermission: 'You do not have delete permission',
    deleteConfirm: 'Are you sure you want to delete image {name}? This action cannot be undone.',
    deleteFeatureInDevelopment: 'Delete feature under development',
    dataRefreshed: 'Data refreshed',
    imageSyncSuccess: 'Image information synced successfully',
    loadProjectsFailed: 'Failed to load project list',
    loadProjectImagesFailed: 'Failed to load project images'
  },

  // Sync
  sync: {
    title: 'Repository Synchronization',
    syncStatus: 'Sync Status',
    syncAll: 'Sync All',
    syncProject: 'Sync Project',
    syncHistory: 'Sync History',
    lastSyncTime: 'Last Sync Time',
    syncInProgress: 'Sync in progress...',
    syncCompleted: 'Sync completed',
    syncFailed: 'Sync failed',
    stopOnError: 'Stop on Error',
    continueOnError: 'Continue on Error',
    processedCount: 'Processed Count',
    errorCount: 'Error Count',
    syncStarted: 'Sync started',
    syncLogs: 'Sync Logs',
    fullSync: 'Full Sync',
    projectSync: 'Project Sync',
    refreshStatus: 'Refresh Status',
    startFullSync: 'Start Full Sync',
    registryConnectionStatus: 'Registry Connection Status',
    connected: 'Connected',
    disconnected: 'Disconnected',
    projectCount: 'Project Count',
    repositoryCount: 'Repository Count',
    imageTagCount: 'Image Tags',
    lastSync: 'Last Sync',
    success: 'Success',
    failed: 'Failed',
    syncOperations: 'Sync Operations',
    projectSyncOption: 'Project Sync',
    selectProject: 'Select Project...',
    syncThisProject: 'Sync This Project',
    time: 'Time',
    type: 'Type',
    project: 'Project',
    status: 'Status',
    processedCountHeader: 'Processed Count',
    errorCountHeader: 'Error Count',
    duration: 'Duration',
    operator: 'Operator',
    loading: 'Loading...',
    noSyncLogs: 'No sync logs available',
    previousPage: 'Previous',
    nextPage: 'Next',
    inProgress: 'In Progress',
    system: 'System',
    stopOnErrorOption: 'Stop on error',
    syncThisProjectPrefix: 'Starting to sync project',
    syncCompletedSuffix: ':',
    projectSyncCompleted: 'Project sync completed',
    projectSyncFailed: 'Project sync failed',
    fullSyncSuffix: ':',
    fullSyncStarting: 'Starting full sync...',
    syncStatusRefreshed: 'Status refreshed',
    syncLogsRefreshed: 'Logs refreshed',
    pleaseSelectProject: 'Please select a project',
    fetchSyncStatusFailed: 'Failed to fetch sync status',
    fetchProjectsFailed: 'Failed to fetch projects',
    fetchSyncLogsFailed: 'Failed to fetch sync logs'
  },

  // Audit Log
  audit: {
    title: 'Audit Log',
    logList: 'Log List',
    filter: 'Filter',
    exportLogs: 'Export Logs',
    cleanupLogs: 'Cleanup Logs',
    cleanupDays: 'Cleanup Days',
    cleanupLogsTip: 'Clean up audit logs older than specified days',
    cleanUpSuccess: 'Cleanup completed successfully',
    noLogsToClean: 'No logs need to be cleaned',
    action: 'Action',
    resourceType: 'Resource Type',
    resource: 'Resource',
    user: 'User',
    ipAddress: 'IP Address',
    userAgent: 'User Agent',
    details: 'Details',
    exportFormat: 'Export Format',
    exportFormatJSON: 'JSON',
    exportFormatCSV: 'CSV',
    // Filters
    filterUser: 'User',
    allUsers: 'All Users',
    filterAction: 'Action',
    allActions: 'All Actions',
    actionLogin: 'Login',
    actionLogout: 'Logout',
    actionCreateUser: 'Create User',
    actionUpdateUser: 'Update User',
    actionDeleteUser: 'Delete User',
    actionCreateProject: 'Create Project',
    actionUpdateProject: 'Update Project',
    actionDeleteProject: 'Delete Project',
    actionCreate: 'Create Resource',
    actionUpdate: 'Update Resource',
    actionDelete: 'Delete Resource',
    actionChangePassword: 'Change Password',
    actionDeleteAuditLogs: 'Delete Audit Logs',
    actionDeleteOldLogs: 'Clean Old Logs',
    filterResourceType: 'Resource Type',
    allTypes: 'All Types',
    resourceTypeUser: 'User',
    resourceTypeProject: 'Project',
    resourceTypeRegistry: 'Registry',
    resourceTypeReplicationPolicy: 'Replication Policy',
    resourceTypeSystem: 'System',
    dateRange: 'Date Range',
    startDate: 'Start Date',
    endDate: 'End Date',
    to: 'to',
    applyFilter: 'Apply Filter',
    reset: 'Reset',
    // Table
    time: 'Time',
    resourceId: 'Resource ID',
    viewDetails: 'View Details',
    loading: 'Loading...',
    noLogsFound: 'No log records found',

    // Log Details
    logDetails: 'Log Details',
    // Cleanup Dialog
    cleanupOptions: 'Cleanup Options',
    cleanupByDate: 'Cleanup by Date',
    deleteDaysAgo: 'Delete logs older than how many days:',
    deleteAllLogs: 'Delete All Logs',
    // Messages
    logsRefreshed: 'Logs refreshed',
    deleteLogsSuccess: 'Deleted logs from {days} days ago',
    deleteLogsFilteredSuccess: 'Deleted matching logs',
    deleteLogsFailed: 'Failed to delete logs',
    loadAuditLogsFailed: 'Failed to load audit logs',
    loadUsersFailed: 'Failed to load users'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    recentProjects: 'Recent Projects',
    recentRepositories: 'Recent Repositories',
    projects: 'Projects',
    repositories: 'Repositories',
    replicationPolicies: 'Replication Policies',
    users: 'Users',
    noProjectsYet: 'No projects yet',
    noRepositoriesYet: 'No repositories yet'
  },

  // Login Page
  loginPage: {
    title: 'iDocker Registry',
    signInToManage: 'Sign in to manage your Docker registries',
    signInButton: 'Sign In',
    signInText: 'Signing in...',
    username: 'Username',
    password: 'Password',
    enterUsername: 'Enter your username',
    enterPassword: 'Enter your password',
    useLdapAuth: 'Use LDAP Authentication',
    createAccount: 'Create an account',
    loginPrompt: 'This page requires you to be logged in. Please sign in to continue.',
    loginFailed: 'Login failed'
  },

  // Profile
  profile: {
    title: 'Profile',
    changeAvatar: 'Change Avatar',
    uploadAvatar: 'Upload Avatar',
    myProjects: 'My Projects',
    noProjectsYet: 'No projects yet',
    viewDetails: 'View Details',
    username: 'Username',
    email: 'Email',
    role: 'Role',
    saveChanges: 'Save Changes',
    updating: 'Updating...',
    // Avatar Upload
    currentAvatar: 'Current Avatar',
    uploadNewAvatar: 'Upload New Avatar',
    uploading: 'Uploading...',
    confirmUpload: 'Confirm Upload',
    // Project Info
    joinTime: 'Joined',
    projectRole: 'Role',
    // Messages
    profileUpdated: 'Profile updated successfully',
    avatarUploaded: 'Avatar uploaded successfully',
    loadProfileFailed: 'Failed to load profile',
    loadProjectsFailed: 'Failed to load projects',
    updateProfileFailed: 'Failed to update profile',
    uploadAvatarFailed: 'Failed to upload avatar'
  },

  // Change Password
  password: {
    title: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    passwordMismatch: 'Password mismatch',
    passwordRequirements: 'Password Requirements:',
    requirementLength: 'At least 6 characters',
    requirementUppercase: 'Contains uppercase',
    requirementLowercase: 'Contains lowercase',
    requirementNumber: 'Contains number',
    strengthWeak: 'Weak',
    strengthMedium: 'Medium',
    strengthStrong: 'Strong',
    changePassword: 'Change Password',
    changing: 'Changing...',
    // Messages
    checkPasswordInput: 'Please check new password input',
    passwordChanged: 'Password changed successfully',
    changePasswordFailed: 'Failed to change password'
  },

  // Project List (ProjectsView)
  projectList: {
    searchProjects: 'Search Projects...',
    title: 'Project List',
    createProject: 'Create Project',
    editProject: 'Edit Project',
    deleteProject: 'Delete Project',
    createNewProject: 'Create New Project',
    projectName: 'Project Name',
    namespace: 'Namespace',
    namespacePlaceholder: 'Enter namespace (lowercase letters, numbers, hyphens)',
    namespaceHelp: 'Namespace can only contain lowercase letters, numbers, and hyphens',
    description: 'Description',
    descriptionPlaceholder: 'Enter project description',
    repositories: 'Repositories',
    members: 'Members',
    viewDetails: 'View Details',
    loadingProjects: 'Loading projects...',
    noProjectsYet: 'No projects yet',
    createFirstProject: 'Create Your First Project',
    startManagingRegistries: 'Create your first project to get started with managing Docker registries',
    saving: 'Saving...',
    updateProject: 'Update Project',
    // Messages
    projectCreated: 'Project created successfully',
    projectUpdated: 'Project updated successfully',
    projectDeleted: 'Project deleted successfully',
    fetchProjectsFailed: 'Failed to fetch projects',
    saveProjectFailed: 'Failed to save project',
    deleteProjectFailed: 'Failed to delete project',
    confirmDeleteProject: 'Are you sure you want to delete project "{name}"? This action cannot be undone.'
  },

  // Project Detail
  projectDetail: {
    backToProjects: 'Back to Projects',
    addRegistry: 'Add Registry',
    editProject: 'Edit Project',
    // Tabs
    repositories: 'Repositories',
    members: 'Members',
    replicationPolicies: 'Replication Policies',
    // Repositories
    loadingRepositories: 'Loading repositories...',
    noRepositoriesYet: 'No repositories yet',
    addFirstRepository: 'Add your first Docker repository',
    repositoryType: 'Repository Type',
    // Members
    projectMembers: 'Project Members',
    addMember: 'Add Member',
    noMembersYet: 'No members yet',
    addTeamMembers: 'Add team members to collaborate on this project',
    selectUser: 'Select a user',
    memberRole: 'Member',
    maintainer: 'Maintainer',
    owner: 'Owner',
    removeMember: 'Remove Member',
    addingMember: 'Adding...',
    // Replication Policies
    createPolicy: 'Create Policy',
    noPoliciesYet: 'No replication policies yet',
    createPoliciesReplicate: 'Create policies to replicate images between registries',
    source: 'Source',
    target: 'Target',
    schedule: 'Schedule',
    manual: 'Manual',
    daily: 'Daily',
    weekly: 'Weekly',
    hourly: 'Hourly',
    enabled: 'Enabled',
    disabled: 'Disabled',
    // Registry Dialog
    editRegistry: 'Edit Registry',
    registryName: 'Registry Name',
    registryNamePlaceholder: 'Enter registry name',
    registryUrl: 'Registry URL',
    registryUrlPlaceholder: 'https://registry.example.com',
    registryType: 'Registry Type',
    dockerRegistry: 'Docker Registry',
    harbor: 'Harbor',
    nexus: 'Nexus',
    requiresAuth: 'This registry requires authentication',
    authUsername: 'Username',
    authPassword: 'Password',
    // Member Dialog
    addProjectMember: 'Add Project Member',
    // Replication Policy Dialog
    createReplicationPolicy: 'Create Replication Policy',
    editReplicationPolicy: 'Edit Replication Policy',
    policyName: 'Policy Name',
    policyNamePlaceholder: 'Enter policy name',
    sourceRegistry: 'Source Registry',
    targetRegistry: 'Target Registry',
    selectSourceRegistry: 'Select source registry',
    selectTargetRegistry: 'Select target registry',
    // Messages
    confirmDeleteRegistry: 'Are you sure you want to delete registry "{name}"?',
    confirmRemoveMember: 'Are you sure you want to remove {username}?',
    confirmDeletePolicy: 'Are you sure you want to delete replication policy "{name}"?',
    saveRegistryFailed: 'Failed to save registry',
    deleteRegistryFailed: 'Failed to delete registry',
    addMemberFailed: 'Failed to add member',
    updateMemberFailed: 'Failed to update member',
    removeMemberFailed: 'Failed to remove member',
    savePolicyFailed: 'Failed to save replication policy',
    deletePolicyFailed: 'Failed to delete replication policy'
  },

  // User List (UsersView)
  userList: {
    searchUsers: 'Search Users...',
    refresh: 'Refresh',
    addUser: 'Add User',
    // Table
    username: 'Username',
    email: 'Email',
    role: 'Role',
    ldapUser: 'LDAP User',
    createdAt: 'Created',
    lastLogin: 'Last Login',
    actions: 'Actions',
    // Buttons
    editUser: 'Edit User',
    deleteUser: 'Delete User',
    // Dialog
    createUser: 'Add User',
    confirmPassword: 'Confirm Delete',
    newPasswordPlaceholder: 'New password (leave blank to keep unchanged)',
    // Roles
    roleUser: 'User',
    roleMaintainer: 'Maintainer',
    roleAdmin: 'Admin',
    // Status
    yes: 'Yes',
    no: 'No',
    neverLoggedIn: 'Never logged in',
    // Messages
    loading: 'Loading...',
    noUsersFound: 'No users found',
    saving: 'Saving...',
    deleting: 'Deleting...',
    userCreated: 'User created successfully',
    userUpdated: 'User updated successfully',
    userDeleted: 'User deleted successfully',
    loadUsersFailed: 'Failed to load users',
    saveUserFailed: 'Failed to save user',
    deleteUserFailed: 'Failed to delete user',
    confirmDeleteUser: 'Are you sure you want to delete user {username}? This action cannot be undone.'
  },

  // Settings
  settings: {
    title: 'Settings',
    general: 'General',
    language: 'Language',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'Auto',
    registry: 'Registry Configuration',
    apiUrl: 'API URL',
    timeout: 'Timeout',
    settingsSaved: 'Settings saved successfully'
  },

  // Error Messages
  error: {
    networkError: 'Network error, please check your connection',
    serverError: 'Server error, please try again later',
    unauthorized: 'Unauthorized access',
    forbidden: 'Access forbidden',
    notFound: 'Resource not found',
    conflict: 'Resource conflict',
    validationError: 'Validation error',
    internalError: 'Internal server error',
    serviceUnavailable: 'Service temporarily unavailable',
    unknownError: 'Unknown error occurred',
    loadFailed: 'Failed to load data',
    saveFailed: 'Failed to save data',
    deleteFailed: 'Failed to delete data',
    uploadFailed: 'Failed to upload data',
    downloadFailed: 'Failed to download data',
    // Error Page
    errorPage: {
      networkError: 'Network Error',
      mixedContent: 'Mixed Content Error',
      invalidUrl: 'Invalid URL',
      catalogNotFound: 'Catalog Not Found',
      httpError: 'HTTP Error',
      unknownError: 'Error',
      unknownErrorOccurred: 'An unknown error occurred',
      details: 'Details',
      retry: 'Retry',
      goHome: 'Go Home'
    }
  },
  
  // Footer
  footer: {
    copyright: 'Hyperlinked.cn All Rights Reserved © 2025-2026.'
  },
  
  // Search Bar
  searchBar: {
    placeholder: 'Search repositories...'
  },
  
  // Version Notification
  versionNotification: {
    newVersionAvailable: 'A new version ({{version}}) is available!'
  },
  
  // 404 Page
  notFound: {
    title: 'Page Not Found',
    description: 'The page you\'re looking for doesn\'t exist or has been moved.',
    goHome: 'Go Home',
    goBack: 'Go Back'
  },
  

  // Success Messages
  success: {
    operationCompleted: 'Operation completed successfully',
    dataLoaded: 'Data loaded successfully',
    dataSaved: 'Data saved successfully',
    dataDeleted: 'Data deleted successfully',
    dataUploaded: 'Data uploaded successfully',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully'
  },

  // Confirmations
  confirm: {
    deleteTitle: 'Confirm Delete',
    deleteMessage: 'Are you sure you want to delete this item?',
    deleteMultipleMessage: 'Are you sure you want to delete {count} items?',
    logoutTitle: 'Confirm Logout',
    logoutMessage: 'Are you sure you want to logout?',
    resetPasswordTitle: 'Confirm Reset Password',
    resetPasswordMessage: 'Are you sure you want to reset this user\'s password?',
    deactivateUserTitle: 'Confirm Deactivate User',
    deactivateUserMessage: 'Are you sure you want to deactivate this user?',
    activateUserTitle: 'Confirm Activate User',
    activateUserMessage: 'Are you sure you want to activate this user?',
    syncTitle: 'Confirm Sync',
    syncMessage: 'Are you sure you want to start synchronization?'
  },

  // Dialogs
  dialogs: {
    // Authentication Dialog
    auth: {
      title: 'Registry Authentication',
      description: 'This registry requires authentication. Please provide your credentials to continue.',
      server: 'Server',
      service: 'Service',
      scope: 'Scope',
      username: 'Username',
      password: 'Password',
      usernamePlaceholder: 'Enter your username',
      passwordPlaceholder: 'Enter your password',
      authenticate: 'Authenticate',
      authenticating: 'Authenticating...',
      cancel: 'Cancel',
      error: {
        missingCredentials: 'Please enter both username and password',
        missingRealm: 'Authentication realm is missing',
        authenticationFailed: 'Authentication failed',
        noTokenReceived: 'No token received from authentication server'
      }
    },
    
    // Confirmation Dialog
    confirm: {
      confirm: 'Confirm',
      cancel: 'Cancel'
    },
    
    // Dockerfile Dialog
    dockerfile: {
      title: 'Dockerfile',
      noInfoAvailable: 'No Dockerfile information available',
      generatedFromLayers: 'Generated from image layers',
      reconstructionNote: 'This is a reconstruction based on layer information',
      copyDockerfile: 'Copy Dockerfile',
      close: 'Close'
    },
    
    // Registry Settings Dialog
    registrySettings: {
      title: 'Registry Settings',
      currentRegistry: 'Current Registry',
      addRegistry: 'Add Registry',
      savedRegistries: 'Saved Registries',
      registryUrl: 'Registry URL',
      registryName: 'Registry Name',
      pullUrl: 'Pull URL',
      registryUrlPlaceholder: 'https://registry.example.com',
      registryNamePlaceholder: 'Display name for this registry',
      pullUrlPlaceholder: 'URL used for docker pull commands',
      pullUrlHint: 'This is the URL that will be shown in docker pull commands. Leave empty to use registry URL.',
      applyChanges: 'Apply Changes',
      add: 'Add Registry',
      noSavedRegistries: 'No saved registries',
      switchToRegistry: 'Switch to this registry',
      removeRegistry: 'Remove registry',
      confirmRemoveRegistry: 'Are you sure you want to delete registry [{name}]?',
      messages: {
        enterRegistryUrl: 'Please enter a registry URL',
        settingsApplied: 'Registry settings applied',
        registryAdded: 'Registry added to your saved list',
        switchedToRegistry: 'Switched to registry: {name}',
        registryRemoved: 'Registry removed: {name}'
      }
    },
    
    // Image Details Dialog
    imageDetails: {
      title: 'Image Details',
      imageName: 'Image Name',
      tagCount: 'Tag Count',
      imageTags: 'Image Tags',
      tagSize: 'Size',
      tagDigest: 'Digest',
      loadingFailed: 'Loading Failed',
      close: 'Close'
    },
    
    // Tag Details Dialog
    tagDetails: {
      title: 'Tag Details',
      tagName: 'Tag Name',
      tagDigest: 'Digest',
      imageSize: 'Image Size',
      createdAt: 'Created At',
      architecture: 'Architecture',
      os: 'Operating System',
      loadingFailed: 'Loading Failed',
      close: 'Close'
    }
  }
}
