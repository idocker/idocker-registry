<template>
  <v-dialog v-model="internalValue" max-width="800px" @click:outside="close">
    <v-card>
      <v-card-title class="text-h6">
        标签详情
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
      </v-card-title>

      <v-card-text v-if="tagDetails">
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

        <v-divider class="my-2"></v-divider>

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
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import registryService from '@/services/registry.service'

interface Props {
  modelValue: boolean
  imageId: string
  tagId: string
}

interface TagDetail {
  id: string
  name: string
  digest: string
  size: number
  architecture: string
  os: string
  createdAt: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const tagDetails = ref<TagDetail | null>(null)
const isLoading = ref(false)

// 监听 tagId 变化
watch(() => props.tagId, async (newId) => {
  if (newId && props.modelValue) {
    await loadTagDetails()
  }
})

// 监听对话框打开状态
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.tagId) {
    await loadTagDetails()
  }
})

const loadTagDetails = async () => {
  isLoading.value = true
  try {
    // 使用真实API获取标签详情
    const response = await registryService.getImageTagDetails(props.imageId, props.tagId)
    if (response.success) {
      const { repository, tag } = response.data
      
      // 转换为组件期望的格式
      tagDetails.value = {
        id: tag.id.toString(),
        name: tag.tag || tag.name,
        digest: tag.digest,
        size: tag.size,
        architecture: tag.architecture || 'N/A',
        os: tag.os || 'N/A',
        createdAt: tag.created_at || tag.createdAt
      }
    } else {
      throw new Error(response.message || '获取标签详情失败')
    }
  } catch (error) {
    console.error('加载标签详情失败:', error)
    // 如果API失败，显示错误信息
    tagDetails.value = {
      id: props.tagId,
      name: '加载失败',
      digest: 'N/A',
      size: 0,
      architecture: 'N/A',
      os: 'N/A',
      createdAt: ''
    }
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

const close = () => {
  internalValue.value = false
}
</script>
