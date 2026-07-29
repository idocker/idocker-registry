import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import i18n from '@/i18n'


// 检查页面是否需要授权的函数
const checkAuthRequired = (to) => {
  // 管理页面总是需要认证
  if (to.meta && to.meta.requiresAuth) {
    return true
  }
  
  // 对于以下页面，由于它们需要与后端API交互，也需要认证
  const protectedRoutes: string | any[] = []
  
  return protectedRoutes.includes(to.name)
}

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'catalog',
    component: () => import('@/views/ImageView.vue'),
    meta: {
      title: 'Images',
      requiresAuth: true
    }
  },
  // {
  //   path: '/taglist/:image',
  //   name: 'taglist',
  //   component: () => import('@/views/TagListView.vue'),
  //   props: true,
  //   meta: {
  //     title: 'Tags',
  //     requiresAuth: true
  //   }
  // },
  // {
  //   path: '/taghistory/:image/:tag',
  //   name: 'taghistory',
  //   component: () => import('@/views/TagHistoryView.vue'),
  //   props: true,
  //   meta: {
  //     title: 'Tag History',
  //     requiresAuth: true
  //   }
  // },
  {
    path: '/images',
    name: 'images',
    component: () => import('@/views/ImageView.vue'),
    meta: {
      title: 'Images',
      requiresAuth: true
    }
  },
  {
    path: '/images/:id',
    name: 'image-detail',
    component: () => import('@/views/ImageDetailView.vue'),
    props: true,
    meta: {
      title: 'Image Details',
      requiresAuth: true
    }
  },
  {
    path: '/images/:imageId/tags/:tagId',
    name: 'image-tag-detail',
    component: () => import('@/views/ImageTagDetailView.vue'),
    props: true,
    meta: {
      title: 'Tag Details',
      requiresAuth: true
    }
  },
  {
    path: '/admin',
    redirect: '/admin/profile'
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/LoginView.vue'),
    meta: {
      title: 'Login'
    }
  },
  {
    path: '/admin/profile',
    name: 'admin-profile',
    component: () => import('@/views/admin/ProfileView.vue'),
    meta: {
      title: 'Profile',
      requiresAuth: true
    }
  },
  {
    path: '/admin/password',
    name: 'admin-password',
    component: () => import('@/views/admin/PasswordView.vue'),
    meta: {
      title: 'Change Password',
      requiresAuth: true
    }
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('@/views/admin/UsersView.vue'),
    meta: {
      title: 'Users',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/audit',
    name: 'admin-audit',
    component: () => import('@/views/admin/AuditView.vue'),
    meta: {
      title: 'Audit Logs',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: {
      title: 'Dashboard',
      requiresAuth: true
    }
  },
  {
    path: '/admin/namespaces',
    name: 'admin-namespaces',
    component: () => import('@/views/admin/NamespacesView.vue'),
    meta: {
      title: 'Namespaces',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/repositories',
    name: 'admin-repositories',
    component: () => import('@/views/admin/RepositoriesView.vue'),
    meta: {
      titleKey: 'projectDetail.repositories',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/projects',
    name: 'admin-projects',
    component: () => import('@/views/admin/ProjectsView.vue'),
    meta: {
      title: 'Projects',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/projects/:id',
    name: 'admin-project-detail',
    component: () => import('@/views/admin/ProjectDetailView.vue'),
    meta: {
      title: 'Project Detail',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/sync',
    name: 'admin-sync',
    component: () => import('@/views/admin/SyncView.vue'),
    meta: {
      title: 'Registry Sync',
      requiresAuth: true,
      requiresAdmin: true
    }
  },
  {
    path: '/admin/user-guide',
    name: 'admin-user-guide',
    component: () => import('@/views/admin/PlaceholderView.vue'),
    meta: {
      title: '用户指南',
      requiresAuth: true
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Handle page titles and authentication
router.beforeEach((to, from, next) => {
  let documentTitle = 'iDocker Registry'
  
  if (to.meta.titleKey) {
    documentTitle = `${i18n.global.t(to.meta.titleKey as string)} - iDocker Registry`
  } else if (to.meta.title) {
    documentTitle = `${to.meta.title} - iDocker Registry`
  }
  
  document.title = documentTitle
  
  // 检查是否需要认证
  if (checkAuthRequired(to)) {
    const authStore = useAuthStore()
    
    if (!authStore.isAuthenticated) {
      // 显示提示消息
      authStore.showLoginPrompt = true
      authStore.loginRedirectPath = to.fullPath
      
      return next({
        path: '/admin/login',
        query: { redirect: to.fullPath }
      })
    }
    
    // 如果已登录且访问登录页，重定向到个人中心
    if (to.path === '/admin/login') {
      return next('/admin/profile')
    }
    
    // 检查是否需要管理员权限
    if (to.meta && to.meta.requiresAdmin && authStore.user?.role !== 'admin') {
      return next('/admin/profile')
    }
    
    // 已经登录，继续导航
    return next()
  }
  
  // 检查是否为登录页面且已登录
  const authStore = useAuthStore()
  if (to.path === '/admin/login' && authStore.isAuthenticated) {
    return next('/admin/profile')
  }
  
  next()
})

export default router