import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { useAuthStore } from '@/stores/auth'
import vuetify from '@/plugins/vuetify'
import i18n from './i18n'

// Import global styles
import '@/styles/global.scss'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(i18n)

// Initialize authentication state
const authStore = useAuthStore()
authStore.initAuth()

app.mount('#app')