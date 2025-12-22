<template>
  <v-container class="pa-6">
    <v-breadcrumbs :items="breadcrumbs" class="mb-4"></v-breadcrumbs>

    <v-card v-if="image">
      <v-card-title>
        镜像详情
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
                <v-icon>mdi-image</v-icon>
              </template>
              <v-list-item-subtitle>镜像名称</v-list-item-subtitle>
              <v-list-item-title>{{ image.name }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-clock</v-icon>
              </template>
              <v-list-item-subtitle>创建时间</v-list-item-subtitle>
              <v-list-item-title>{{ formatDate(image.createdAt) }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-divider class="my-4"></v-divider>

        <h3 class="text-h6 mb-3">镜像标签</h3>
        <v-list>
          <v-list-item
            v-for="tag in image.tags"
            :key="tag.id"
            class="px-0"
            @click="viewTagDetails(tag)"
          >
            <template v-slot:prepend>
              <v-icon>mdi-tag-outline</v-icon>
            </template>
            <v-list-item-title>{{ tag.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ formatSize(tag.size) }} | {{ tag.digest }}
            </v-list-item-subtitle>
            <template v-slot:append>
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

interface Tag {
  id: string
  name: string
  digest: string
  size: number
}

interface Image {
  id: string
  name: string
  createdAt: string
  tags: Tag[]
}

const router = useRouter()
const route = useRoute()

const image = ref<Image | null>(null)
const isLoading = ref(false)

const breadcrumbs = computed(() => [
  { title: '首页', href: '/' },
  { title: '镜像列表', href: '/images' },
  { title: '镜像详情', disabled: true }
])

onMounted(async () => {
  await loadImageDetails()
})

const loadImageDetails = async () => {
  isLoading.value = true
  try {
    const imageId = route.params.id as string
    // 这里应该调用 API 获取镜像详情
    // 暂时使用模拟数据
    image.value = {
      id: imageId,
      name: imageId,
      createdAt: new Date().toISOString(),
      tags: [
        { id: '1', name: 'latest', digest: 'sha256:abc123', size: 12345678 },
        { id: '2', name: 'v1.0', digest: 'sha256:def456', size: 12345678 }
      ]
    }
  } catch (error) {
    console.error('加载镜像详情失败:', error)
  } finally {
    isLoading.value = false
  }
}

const viewTagDetails = (tag: Tag) => {
  router.push({
    name: 'image-tag-detail',
    params: { imageId: image.value!.id, tagId: tag.id }
  })
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
  router.push('/images')
}
</script>
