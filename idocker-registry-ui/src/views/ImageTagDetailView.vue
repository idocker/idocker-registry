<template>
  <v-container class="pa-6">
    <v-breadcrumbs :items="breadcrumbs" class="mb-4"></v-breadcrumbs>

    <v-card v-if="tagDetails">
      <v-card-title>
        标签详情
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="goBack"
        >
          返回
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-tag</v-icon>
              </template>
              <v-list-item-subtitle>标签名称</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.name }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-fingerprint</v-icon>
              </template>
              <v-list-item-subtitle>Digest</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.digest }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-harddisk</v-icon>
              </template>
              <v-list-item-subtitle>镜像大小</v-list-item-subtitle>
              <v-list-item-title>{{ formatSize(tagDetails.size) }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-clock</v-icon>
              </template>
              <v-list-item-subtitle>创建时间</v-list-item-subtitle>
              <v-list-item-title>{{ formatDate(tagDetails.createdAt) }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <v-row>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-chip</v-icon>
              </template>
              <v-list-item-subtitle>架构</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.architecture || 'N/A' }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-laptop</v-icon>
              </template>
              <v-list-item-subtitle>操作系统</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.os || 'N/A' }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <h3 class="text-h6 mb-3">命令示例</h3>
        <v-card variant="outlined" class="pa-4">
          <code class="text-subtitle-2">
            docker pull {{ tagDetails.repository }}:{{ tagDetails.name }}
          </code>
        </v-card>

        <h3 class="text-h6 mt-4 mb-3">镜像ID</h3>
        <v-card variant="outlined" class="pa-4">
          <code class="text-subtitle-2 text-wrap">
            {{ tagDetails.digest }}
          </code>
        </v-card>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface TagDetail {
  id: string
  name: string
  digest: string
  size: number
  architecture: string
  os: string
  createdAt: string
  repository: string
}

const router = useRouter()
const route = useRoute()

const tagDetails = ref<TagDetail | null>(null)
const isLoading = ref(false)

const breadcrumbs = computed(() => [
  { title: '首页', href: '/' },
  { title: '镜像列表', href: '/images' },
  { title: '镜像详情', href: `/images/${route.params.imageId}` },
  { title: '标签详情', disabled: true }
])

onMounted(async () => {
  await loadTagDetails()
})

const loadTagDetails = async () => {
  isLoading.value = true
  try {
    const imageId = route.params.imageId as string
    const tagId = route.params.tagId as string
    // 这里应该调用 API 获取标签详情
    // 暂时使用模拟数据
    tagDetails.value = {
      id: tagId,
      name: 'latest',
      digest: 'sha256:abc123def4567890abcdef1234567890abcdef1234567890',
      size: 12345678,
      architecture: 'amd64',
      os: 'linux',
      createdAt: new Date().toISOString(),
      repository: imageId
    }
  } catch (error) {
    console.error('加载标签详情失败:', error)
  } finally {
    isLoading.value = false
  }
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('zh-CN')
}

const goBack = () => {
  const imageId = route.params.imageId as string
  router.push(`/images/${imageId}`)
}
</script>
