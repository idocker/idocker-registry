/**
 * 中文语言包
 * iDocker Registry 中文翻译
 */


export default {
  // 通用
  common: {
    welcome: '欢迎使用',
    loading: '加载中...',
    active: '激活',
    inactive: '未激活',
    save: '保存',
    cancel: '取消',
    delete: '删除',
    edit: '编辑',
    create: '创建',
    update: '更新',
    confirm: '确认',
    search: '搜索',
    searchPlaceholder: '搜索...',
    yes: '是',
    no: '否',
    submit: '提交',
    reset: '重置',
    back: '返回',
    close: '关闭',
    select: '选择',
    selectAll: '全选',
    clear: '清空',
    refresh: '刷新',
    download: '下载',
    export: '导出',
    import: '导入',
    view: '查看',
    details: '详情',
    actions: '操作',
    status: '状态',
    type: '类型',
    name: '名称',
    description: '描述',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    createdBy: '创建者',
    operations: '操作',
    noData: '暂无数据',
    required: '必填',
    optional: '选填',
    language: '语言',
    // 分页
    totalRecords: '共 {count} 条记录',
    previousPage: '上一页',
    nextPage: '下一页',
    more: '更多'
  },

  // 导航
  nav: {
    home: '首页',
    images: '镜像',
    repositories: '仓库',
    projects: '项目',
    users: '用户',
    audit: '审计日志',
    sync: '同步',
    settings: '设置',
    logout: '退出登录',
    login: '登录',
    register: '注册',
    dashboard: '仪表盘',
    profile: '个人资料',
    password: '修改密码'
  },

  // 管理布局
  managementLayout: {
    managementCenter: '管理中心',
    personalSettings: '个人设置',
    systemManagement: '系统管理',
    basicInfo: '基本信息',
    changePassword: '修改密码',
    namespaceManagement: '命名空间管理',
    projectManagement: '项目管理',
    userManagement: '用户管理',
    warehouseSync: '仓库同步',
    toggleSidebar: '切换侧边栏'
  },

  // 命名空间管理
  namespaces: {
    namespaceManagement: '命名空间管理',
    namespaceManagementDesc: '管理Docker注册表的组织命名空间',
    createNamespace: '创建命名空间',
    createNewNamespace: '创建新命名空间',
    editNamespace: '编辑命名空间',
    deleteNamespace: '删除命名空间',
    namespaceName: '名称',
    namespaceNamePlaceholder: '输入命名空间名称',
    description: '描述',
    descriptionPlaceholder: '输入命名空间描述',
    projectCount: '项目数量',
    isActive: '是否启用',
    status: '状态',
    createdAt: '创建时间',
    createdBy: '创建者',
    searchNamespaces: '搜索命名空间',
    loadingNamespaces: '加载命名空间列表...',
    noNamespacesYet: '暂无命名空间',
    startManagingNamespaces: '开始管理您的命名空间',
    createFirstNamespace: '创建第一个命名空间',
    noSearchResults: '未找到匹配的命名空间',
    tryDifferentSearchTerms: '请尝试不同的搜索词',
    deleteConfirm: '您确定要删除命名空间 "{name}" 吗？',
    deleteWithProjectsWarning: '该命名空间下有 {count} 个活跃项目，无法删除。请先删除或移动这些项目。'
  },
  // 页面标题
  pageTitles: {
    basicInfo: '基本信息',
    basicInfoSubtitle: '管理您的个人信息和偏好设置',
    changePassword: '修改密码',
    changePasswordSubtitle: '为了您的账户安全，请定期更新密码',
    dashboard: '仪表盘',
    dashboardSubtitle: '系统概览和统计信息',
    projectManagement: '项目管理',
    projectManagementSubtitle: '管理系统中的所有项目和权限',
    namespaceManagement: '命名空间管理',
    userManagement: '用户管理',
    userManagementSubtitle: '管理系统中的所有用户和角色',
    auditLog: '审计日志',
    auditLogSubtitle: '查看系统操作记录和审计信息',
    warehouseSync: '仓库同步',
    warehouseSyncSubtitle: '同步Docker Registry中的仓库数据到数据库',
    projectDetail: '项目详情',
    projectDetailSubtitle: '查看和管理项目详情',
    managementCenter: '管理中心'
  },

  // 认证
  auth: {
    loginTitle: '登录 iDocker Registry',
    username: '用户名',
    password: '密码',
    loginButton: '登录',
    rememberMe: '记住我',
    forgotPassword: '忘记密码？',
    noAccount: '还没有账号？',
    registerNow: '立即注册',
    loginSuccess: '登录成功',
    loginFailed: '登录失败',
    logoutSuccess: '退出登录成功',
    invalidCredentials: '用户名或密码错误',
    accountDisabled: '账号已被禁用，请联系管理员',
    sessionExpired: '会话已过期',
    sessionExpiredMessage: '您的登录会话已过期，请重新登录。',
    loginNow: '立即登录',
    loginLater: '稍后登录'
  },

  // 用户
  users: {
    title: '用户管理',
    createUser: '创建用户',
    editUser: '编辑用户',
    deleteUser: '删除用户',
    resetPassword: '重置密码',
    userList: '用户列表',
    username: '用户名',
    email: '邮箱',
    fullName: '姓名',
    role: '角色',
    roleAdmin: '管理员',
    roleUser: '普通用户',
    active: '激活',
    inactive: '未激活',
    activateUser: '激活用户',
    deactivateUser: '禁用用户',
    userCreated: '用户创建成功',
    userUpdated: '用户更新成功',
    userDeleted: '用户删除成功',
    passwordReset: '密码重置成功',
    cannotDeleteSelf: '不能删除自己的账号',
    cannotDeleteLastAdmin: '不能删除最后一个管理员账号',
    usernameRequired: '用户名为必填项',
    emailRequired: '邮箱为必填项',
    passwordRequired: '密码为必填项',
    usernameExists: '用户名已存在',
    emailExists: '邮箱已存在'
  },

  // 项目
  projects: {
    title: '项目管理',
    createProject: '创建项目',
    editProject: '编辑项目',
    deleteProject: '删除项目',
    projectList: '项目列表',
    projectName: '项目名称',
    namespace: '命名空间',
    description: '描述',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    createdBy: '创建者',
    repositoryCount: '仓库数量',
    members: '成员',
    memberList: '成员列表',
    addMember: '添加成员',
    removeMember: '移除成员',
    updateMember: '更新成员',
    roleOwner: '所有者',
    roleMaintainer: '维护者',
    roleViewer: '观察者',
    projectCreated: '项目创建成功',
    projectUpdated: '项目更新成功',
    projectDeleted: '项目删除成功',
    memberAdded: '成员添加成功',
    memberUpdated: '成员更新成功',
    memberRemoved: '成员移除成功',
    cannotRemoveLastOwner: '不能移除最后一个项目所有者',
    cannotModifyLastOwner: '不能修改最后一个项目所有者的角色',
    projectExists: '项目已存在',
    namespaceExists: '命名空间已存在',
    namespaceFormat: '命名空间只能包含小写字母、数字和连字符',
    noPermission: '没有权限访问此项目',
    noPermissionModify: '没有权限修改此项目',
    noPermissionModifyMembers: '没有权限修改项目成员',
    memberExists: '用户已经是项目成员',
    userNotMember: '用户不是项目成员',
    userNotFoundOrDisabled: '用户不存在或已被禁用'
  },

  // 镜像/仓库
  images: {
    title: '镜像仓库',
    subtitle: '按项目浏览和管理Docker镜像仓库',
    imageList: '镜像列表',
    searchImages: '搜索镜像',
    imageName: '镜像名称',
    latestTag: '最新标签',
    tag: '标签',
    tags: '标签列表',
    pullCommand: '拉取命令',
    pushCommand: '推送命令',
    copyPull: '复制拉取',
    copyPush: '复制推送',
    deleteImage: '删除镜像',
    deleteTag: '删除标签',
    imageDetails: '镜像详情',
    tagDetails: '标签详情',
    manifest: '清单',
    layers: '层',
    size: '大小',
    digest: '摘要',
    createdAt: '创建时间',
    lastUpdated: '最后更新',
    imageDeleted: '镜像删除成功',
    tagDeleted: '标签删除成功',
    noImages: '未找到镜像',
    noTags: '暂无标签',
    noProjects: '暂无项目',
    noProjectPermission: '您没有权限访问任何项目',
    noDescription: '暂无描述',
    imageCount: '个镜像',
    noImagesInProject: '该项目暂无镜像',
    tagCount: '个标签',
    architecture: '架构',
    unknown: '未知',
    imageTags: '镜像标签',
    commandExample: '命令示例',
    imageId: '镜像ID',
    os: '操作系统',
    pullLink: '拉取链接',
    pushLink: '推送链接',
    imageInfoIncomplete: '镜像信息不完整',
    cannotGeneratePullLink: '无法生成拉取链接',
    cannotGeneratePushLink: '无法生成推送链接',
    pullLinkCopied: '拉取链接已复制到剪贴板',
    pushLinkCopied: '推送链接已复制到剪贴板',
    copyFailed: '复制失败',
    deletePermission: '您没有删除权限',
    deleteConfirm: '确定要删除镜像 {name} 吗？此操作不可逆。',
    deleteFeatureInDevelopment: '删除功能开发中',
    dataRefreshed: '数据已刷新',
    imageSyncSuccess: '镜像信息同步成功',
    loadProjectsFailed: '加载项目列表失败',
    loadProjectImagesFailed: '加载项目镜像列表失败',
    // ImageView specific
    loading: '加载中...',
    refresh: '刷新',
    actions: '操作',
    tagDetailsTitle: '标签详情',
    imageIdLabel: '镜像ID',
    tagIdLabel: '标签ID',
    tagDetailsInDevelopment: '标签详情功能开发中...'
  },

  // Image Detail View
  imageDetail: {
    title: '镜像详情',
    back: '返回',
    loading: '加载中...',
    loadingFailed: '加载失败',
    retry: '重试',
    // Info
    imageInfo: '镜像信息',
    imageName: '镜像名称',
    fullName: '完整名称',
    project: '所属项目',
    namespace: '命名空间',
    // Tags
    tagsList: '标签列表',
    tagCount: '个标签',
    noTags: '暂无标签',
    tagName: '标签名称',
    digest: '摘要',
    archOs: '架构/系统',
    createdAt: '创建时间',
    actions: '操作',
    details: '详情',
    dockerfile: 'Dockerfile',
    delete: '删除',
    copyDigest: '复制摘要',
    // Tag Details Dialog
    tagDetail: '标签详情',
    tagLoading: '加载中...',
    tagDigest: '摘要',
    imageSize: '大小',
    architecture: '架构',
    os: '操作系统',
    createdTime: '创建时间',
    buildHistory: '构建历史',
    index: '#',
    creator: '创建者',
    command: '命令',
    size: '大小',
    comment: '注释',
    // Dockerfile Dialog
    dockerfileTitle: 'Dockerfile',
    dockerfileLoading: '加载中...',
    copyDockerfile: '复制',
    // Delete Dialog
    confirmDelete: '确认删除',
    confirmDeleteTag: '确定要删除标签 {name} 吗？',
    confirmDeleteWarning: '此操作不可逆，请谨慎操作。',
    cancel: '取消',
    confirm: '确认删除',
    deleting: '删除中...'
  },


  // 同步
  sync: {
    title: '仓库同步',
    syncStatus: '同步状态',
    syncAll: '全部同步',
    syncProject: '同步项目',
    syncHistory: '同步历史',
    lastSyncTime: '最后同步时间',
    syncInProgress: '同步进行中...',
    syncCompleted: '同步完成',
    syncFailed: '同步失败',
    stopOnError: '出错时停止',
    continueOnError: '出错时继续',
    processedCount: '处理数量',
    errorCount: '错误数量',
    syncStarted: '同步已开始',
    syncLogs: '同步日志',
    fullSync: '全量同步',
    projectSync: '项目同步',
    refreshStatus: '刷新状态',
    refreshLogs: '刷新日志',
    startFullSync: '开始全量同步',
    fullSyncStarting: '全量同步开始...',
    syncCompletedSuffix: '完成',
    syncStatusTab: '同步状态',
    syncLogsTab: '同步日志',
    registryConnectionStatus: 'Registry 连接状态',
    connected: '已连接',
    disconnected: '未连接',
    projectCount: '项目数量',
    repositoryCount: '仓库数量',
    imageTagCount: '镜像标签',
    lastSync: '最后同步',
    success: '成功',
    failed: '失败',
    syncOperations: '同步操作',
    projectSyncOption: '项目同步',
    selectProject: '选择项目...',
    syncThisProject: '同步该项目',
    time: '时间',
    type: '类型',
    project: '项目',
    status: '状态',
    processedCountHeader: '处理数量',
    errorCountHeader: '错误数量',
    duration: '耗时',
    operator: '操作人',
    loading: '加载中...',
    noSyncLogs: '暂无同步日志',
    previousPage: '上一页',
    nextPage: '下一页',
    inProgress: '进行中',
    system: '系统',
    stopOnErrorOption: '遇到错误时停止',
    syncThisProjectPrefix: '开始同步项目',
    projectSyncCompleted: '项目同步完成',
    projectSyncFailed: '项目同步失败',
    fullSyncSuffix: ':',
    syncStatusRefreshed: '状态已刷新',
    syncLogsRefreshed: '日志已刷新',
    pleaseSelectProject: '请选择项目',
    fetchSyncStatusFailed: '获取同步状态失败',
    fetchProjectsFailed: '获取项目列表失败',
    fetchSyncLogsFailed: '获取同步日志失败'
  },

  // 审计日志
  audit: {
    title: '审计日志',
    logList: '日志列表',
    filter: '筛选',
    exportLogs: '导出日志',
    cleanupLogs: '清理日志',
    cleanupDays: '清理天数',
    cleanupLogsTip: '清理指定天数之前的审计日志',
    cleanUpSuccess: '清理完成',
    noLogsToClean: '没有需要清理的日志',
    action: '操作',
    resourceType: '资源类型',
    resource: '资源',
    user: '用户',
    ipAddress: 'IP地址',
    userAgent: '用户代理',
    details: '详情',
    exportFormat: '导出格式',
    exportFormatJSON: 'JSON',
    exportFormatCSV: 'CSV',
    // 过滤器
    filterUser: '用户',
    allUsers: '所有用户',
    filterAction: '操作',
    allActions: '所有操作',
    actionLogin: '登录',
    actionLogout: '退出',
    actionCreateUser: '创建用户',
    actionUpdateUser: '更新用户',
    actionDeleteUser: '删除用户',
    actionCreateProject: '创建项目',
    actionUpdateProject: '更新项目',
    actionDeleteProject: '删除项目',
    actionCreate: '创建资源',
    actionUpdate: '更新资源',
    actionDelete: '删除资源',
    actionChangePassword: '修改密码',
    actionDeleteAuditLogs: '删除审计日志',
    actionDeleteOldLogs: '清理旧日志',
    filterResourceType: '资源类型',
    allTypes: '所有类型',
    resourceTypeUser: '用户',
    resourceTypeProject: '项目',
    resourceTypeRegistry: '注册表',
    resourceTypeReplicationPolicy: '复制策略',
    resourceTypeSystem: '系统',
    dateRange: '日期范围',
    startDate: '开始日期',
    endDate: '结束日期',
    to: '至',
    applyFilter: '应用过滤',
    reset: '重置',
    // 表格
    time: '时间',
    resourceId: '资源ID',
    viewDetails: '查看详情',
    loading: '加载中...',
    noLogsFound: '没有找到日志记录',

    // 日志详情
    logDetails: '日志详情',
    // 清理日志对话框
    cleanupOptions: '清理选项',
    cleanupByDate: '按日期清理',
    deleteDaysAgo: '删除多少天前的日志:',
    deleteAllLogs: '删除所有日志',
    // 消息
    logsRefreshed: '日志已刷新',
    deleteLogsSuccess: '已删除 {days} 天前的日志',
    deleteLogsFilteredSuccess: '已删除符合条件的日志',
    deleteLogsFailed: '删除日志失败',
    loadAuditLogsFailed: '加载审计日志失败',
    loadUsersFailed: '加载用户列表失败'
  },

  // 仪表板
  dashboard: {
    title: '仪表板',
    recentProjects: '最近项目',
    recentRepositories: '最近仓库',
    projects: '项目',
    repositories: '仓库',
    replicationPolicies: '复制策略',
    users: '用户',
    noProjectsYet: '暂无项目',
    noRepositoriesYet: '暂无仓库'
  },

  // 登录页
  loginPage: {
    title: 'iDocker Registry',
    signInToManage: '登录管理您的Docker仓库',
    signInButton: '登录',
    signInText: '登录中...',
    username: '用户名',
    password: '密码',
    enterUsername: '输入用户名',
    enterPassword: '输入密码',
    useLdapAuth: '使用LDAP认证',
    createAccount: '创建账号',
    loginPrompt: '此页面需要您登录。请登录以继续。',
    loginFailed: '登录失败'
  },

  // 个人资料
  profile: {
    title: '个人资料',
    changeAvatar: '更换头像',
    uploadAvatar: '上传头像',
    myProjects: '我的项目',
    noProjectsYet: '暂无项目',
    viewDetails: '查看详情',
    username: '用户名',
    email: '邮箱',
    role: '角色',
    saveChanges: '保存更改',
    updating: '更新中...',
    // 头像上传
    currentAvatar: '当前头像',
    uploadNewAvatar: '上传新头像',
    uploading: '上传中...',
    confirmUpload: '确认上传',
    // 项目信息
    joinTime: '加入时间',
    projectRole: '角色',
    // 消息
    profileUpdated: '个人信息更新成功',
    avatarUploaded: '头像上传成功',
    loadProfileFailed: '加载用户信息失败',
    loadProjectsFailed: '加载用户项目失败',
    updateProfileFailed: '更新个人信息失败',
    uploadAvatarFailed: '头像上传失败'
  },

  // 修改密码
  password: {
    title: '修改密码',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmPassword: '确认新密码',
    passwordMismatch: '密码不匹配',
    passwordRequirements: '密码要求：',
    requirementLength: '至少6个字符',
    requirementUppercase: '包含大写字母',
    requirementLowercase: '包含小写字母',
    requirementNumber: '包含数字',
    strengthWeak: '弱',
    strengthMedium: '中等',
    strengthStrong: '强',
    changePassword: '修改密码',
    changing: '修改中...',
    // 消息
    checkPasswordInput: '请检查新密码输入',
    passwordChanged: '密码修改成功',
    changePasswordFailed: '修改密码失败'
  },

  // 项目管理（ProjectsView）
  projectList: {
    searchProjects: '搜索项目...',
    title: '项目列表',
    createProject: '创建项目',
    editProject: '编辑项目',
    deleteProject: '删除项目',
    createNewProject: '创建新项目',
    projectName: '项目名称',
    namespace: '命名空间',
    namespacePlaceholder: '输入命名空间（小写字母、数字、连字符）',
    namespaceHelp: '命名空间只能包含小写字母、数字和连字符',
    description: '描述',
    descriptionPlaceholder: '输入项目描述',
    repositories: '仓库',
    members: '成员',
    viewDetails: '查看详情',
    loadingProjects: '加载项目...',
    noProjectsYet: '暂无项目',
    createFirstProject: '创建您的第一个项目',
    startManagingRegistries: '创建您的第一个项目来开始管理Docker仓库',
    saving: '保存中...',
    updateProject: '更新项目',
    // 消息
    projectCreated: '项目创建成功',
    projectUpdated: '项目更新成功',
    projectDeleted: '项目删除成功',
    fetchProjectsFailed: '获取项目失败',
    saveProjectFailed: '保存项目失败',
    deleteProjectFailed: '删除项目失败',
    confirmDeleteProject: '确定要删除项目 "{name}" 吗？此操作不可撤销。'
  },

  // 项目详情
  projectDetail: {
    backToProjects: '返回项目列表',
    addRegistry: '添加仓库',
    editProject: '编辑项目',
    // 标签页
    repositories: '仓库',
    members: '成员',
    replicationPolicies: '复制策略',
    // 仓库
    loadingRepositories: '加载仓库...',
    noRepositoriesYet: '暂无仓库',
    addFirstRepository: '添加您的第一个Docker仓库',
    repositoryType: '仓库类型',
    // 成员
    projectMembers: '项目成员',
    addMember: '添加成员',
    noMembersYet: '暂无成员',
    addTeamMembers: '添加团队成员协作项目',
    selectUser: '选择用户',
    memberRole: '成员',
    maintainer: '维护者',
    owner: '所有者',
    removeMember: '移除成员',
    addingMember: '添加中...',
    // 复制策略
    createPolicy: '创建策略',
    noPoliciesYet: '暂无复制策略',
    createPoliciesReplicate: '创建策略在仓库之间复制镜像',
    source: '源',
    target: '目标',
    schedule: '计划',
    manual: '手动',
    daily: '每天',
    weekly: '每周',
    hourly: '每小时',
    enabled: '已启用',
    disabled: '已禁用',
    // 仓库对话框
    editRegistry: '编辑仓库',
    registryName: '仓库名称',
    registryNamePlaceholder: '输入仓库名称',
    registryUrl: '仓库URL',
    registryUrlPlaceholder: 'https://registry.example.com',
    registryType: '仓库类型',
    dockerRegistry: 'Docker Registry',
    harbor: 'Harbor',
    nexus: 'Nexus',
    requiresAuth: '此仓库需要认证',
    authUsername: '用户名',
    authPassword: '密码',
    // 成员对话框
    addProjectMember: '添加项目成员',
    // 复制策略对话框
    createReplicationPolicy: '创建复制策略',
    editReplicationPolicy: '编辑复制策略',
    policyName: '策略名称',
    policyNamePlaceholder: '输入策略名称',
    sourceRegistry: '源仓库',
    targetRegistry: '目标仓库',
    selectSourceRegistry: '选择源仓库',
    selectTargetRegistry: '选择目标仓库',
    // 消息
    confirmDeleteRegistry: '确定要删除仓库 "{name}" 吗？',
    confirmRemoveMember: '确定要移除 {username} 吗？',
    confirmDeletePolicy: '确定要删除复制策略 "{name}" 吗？',
    saveRegistryFailed: '保存仓库失败',
    deleteRegistryFailed: '删除仓库失败',
    addMemberFailed: '添加成员失败',
    updateMemberFailed: '更新成员失败',
    removeMemberFailed: '移除成员失败',
    savePolicyFailed: '保存复制策略失败',
    deletePolicyFailed: '删除复制策略失败'
  },

  // 用户管理（UsersView）
  userList: {
    searchUsers: '搜索用户...',
    refresh: '刷新',
    addUser: '添加用户',
    // 表格
    username: '用户名',
    email: '邮箱',
    role: '角色',
    ldapUser: 'LDAP用户',
    createdAt: '创建时间',
    lastLogin: '最后登录',
    actions: '操作',
    // 按钮
    editUser: '编辑用户',
    deleteUser: '删除用户',
    // 对话框
    createUser: '添加用户',
    confirmPassword: '确认删除',
    newPasswordPlaceholder: '新密码（留空则不修改）',
    // 角色
    roleUser: '用户',
    roleMaintainer: '维护者',
    roleAdmin: '管理员',
    // 状态
    yes: '是',
    no: '否',
    neverLoggedIn: '从未登录',
    // 消息
    loading: '加载中...',
    noUsersFound: '没有找到用户',
    saving: '保存中...',
    deleting: '删除中...',
    userCreated: '用户创建成功',
    userUpdated: '用户更新成功',
    userDeleted: '用户删除成功',
    loadUsersFailed: '加载用户列表失败',
    saveUserFailed: '保存用户失败',
    deleteUserFailed: '删除用户失败',
    confirmDeleteUser: '确定要删除用户 {username} 吗？此操作不可撤销。'
  },

  // 设置
  settings: {
    title: '设置',
    general: '通用',
    language: '语言',
    theme: '主题',
    themeLight: '浅色',
    themeDark: '深色',
    themeAuto: '自动',
    registry: '仓库配置',
    apiUrl: 'API地址',
    timeout: '超时时间',
    settingsSaved: '设置保存成功'
  },

  // 错误消息
  error: {
    networkError: '网络错误，请检查您的连接',
    serverError: '服务器错误，请稍后重试',
    unauthorized: '未授权访问',
    forbidden: '访问被禁止',
    notFound: '资源未找到',
    conflict: '资源冲突',
    validationError: '验证错误',
    internalError: '内部服务器错误',
    serviceUnavailable: '服务暂时不可用',
    unknownError: '发生未知错误',
    loadFailed: '加载数据失败',
    saveFailed: '保存数据失败',
    deleteFailed: '删除数据失败',
    uploadFailed: '上传数据失败',
    downloadFailed: '下载数据失败',
    // 错误页面
    errorPage: {
      networkError: '网络错误',
      mixedContent: '混合内容错误',
      invalidUrl: '无效URL',
      catalogNotFound: '目录未找到',
      httpError: 'HTTP错误',
      unknownError: '错误',
      unknownErrorOccurred: '发生未知错误',
      details: '详细信息',
      retry: '重试',
      goHome: '返回首页'
    }
  },
  
  // 页面底部
  footer: {
    copyright: 'Hyperlinked.cn All Rights Reserved © 2025-2026.',
    versionPrefix: 'iDocker Registry v'
  },

  // 组件
  components: {
    userMenu: '用户菜单',
    managementConsole: '管理控制台',
    registrySettings: 'Registry 设置',
    switchToLightTheme: '切换到浅色主题',
    switchToDarkTheme: '切换到深色主题'
  },

  // 搜索栏
  searchBar: {
    placeholder: '搜索仓库...'
  },
  
  // 版本通知
  versionNotification: {
    newVersionAvailable: '新版本（{{version}}）可用！'
  },
  
  // 404页面
  notFound: {
    title: '页面未找到',
    description: '您查找的页面不存在或已被移动。',
    goHome: '返回首页',
    goBack: '返回'
  },
  

  // 成功消息
  success: {
    operationCompleted: '操作完成成功',
    dataLoaded: '数据加载成功',
    dataSaved: '数据保存成功',
    dataDeleted: '数据删除成功',
    dataUploaded: '数据上传成功',
    dataExported: '数据导出成功',
    dataImported: '数据导入成功',
    dataCopied: '已复制到剪贴板'
  },

  // 确认对话框
  confirm: {
    deleteTitle: '确认删除',
    deleteMessage: '确定要删除此项吗？',
    deleteMultipleMessage: '确定要删除 {count} 项吗？',
    logoutTitle: '确认退出登录',
    logoutMessage: '确定要退出登录吗？',
    resetPasswordTitle: '确认重置密码',
    resetPasswordMessage: '确定要重置此用户的密码吗？',
    deactivateUserTitle: '确认禁用用户',
    deactivateUserMessage: '确定要禁用此用户吗？',
    activateUserTitle: '确认激活用户',
    activateUserMessage: '确定要激活此用户吗？',
    syncTitle: '确认同步',
    syncMessage: '确定要开始同步吗？'
  },

  // 对话框
  dialogs: {
    // 认证对话框
    auth: {
      title: 'Registry 认证',
      description: '此Registry需要认证。请提供您的凭据以继续。',
      server: '服务器',
      service: '服务',
      scope: '范围',
      username: '用户名',
      password: '密码',
      usernamePlaceholder: '输入您的用户名',
      passwordPlaceholder: '输入您的密码',
      authenticate: '认证',
      authenticating: '认证中...',
      cancel: '取消',
      error: {
        missingCredentials: '请输入用户名和密码',
        missingRealm: '认证域缺失',
        authenticationFailed: '认证失败',
        noTokenReceived: '未收到认证服务器返回的令牌'
      }
    },
    
    // 确认对话框
    confirm: {
      confirm: '确认',
      cancel: '取消'
    },
    
    // Dockerfile对话框
    dockerfile: {
      title: 'Dockerfile',
      noInfoAvailable: '没有可用的Dockerfile信息',
      generatedFromLayers: '从镜像层生成',
      reconstructionNote: '这是基于层信息的重建',
      copyDockerfile: '复制Dockerfile',
      close: '关闭'
    },
    
    // Registry设置对话框
    registrySettings: {
      title: 'Registry 设置',
      currentRegistry: '当前Registry',
      addRegistry: '添加Registry',
      savedRegistries: '已保存的Registry',
      registryUrl: 'Registry URL',
      registryName: 'Registry名称',
      pullUrl: 'Pull URL',
      registryUrlPlaceholder: 'https://registry.example.com',
      registryNamePlaceholder: '此Registry的显示名称',
      pullUrlPlaceholder: '用于docker pull命令的URL',
      pullUrlHint: '这是将在docker pull命令中显示的URL。留空则使用Registry URL。',
      applyChanges: '应用更改',
      add: '添加Registry',
      noSavedRegistries: '没有保存的Registry',
      switchToRegistry: '切换到此Registry',
      removeRegistry: '移除Registry',
      confirmRemoveRegistry: '确定要删除registry [{name}]吗？',
      messages: {
        enterRegistryUrl: '请输入Registry URL',
        settingsApplied: 'Registry设置已应用',
        registryAdded: 'Registry已添加到您的保存列表',
        switchedToRegistry: '已切换到registry: {name}',
        registryRemoved: 'Registry已移除: {name}'
      }
    },
    
    // 镜像详情对话框
    imageDetails: {
      title: '镜像详情',
      imageName: '镜像名称',
      tagCount: '标签数量',
      imageTags: '镜像标签',
      tagSize: '大小',
      tagDigest: 'Digest',
      loadingFailed: '加载失败',
      close: '关闭'
    },
    
    // 标签详情对话框
    tagDetails: {
      title: '标签详情',
      tagName: '标签名称',
      tagDigest: 'Digest',
      imageSize: '镜像大小',
      createdAt: '创建时间',
      architecture: '架构',
      os: '操作系统',
      loadingFailed: '加载失败',
      close: '关闭'
    }
  }
}
