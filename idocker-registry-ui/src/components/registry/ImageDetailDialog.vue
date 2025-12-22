<template>
  <v-dialog v-model="internalValue" max-width="800px" @click:outside="close">
    <v-card>
      <v-card-title class="text-h6">
        镜像详情
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
      </v-card-title>

      <v-card-text v-if="imageDetails">
        <v-row>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-image</v-icon>
              </template>
              <v-list-item-subtitle>镜像名称</v-list-item-subtitle>
              <v-list-item-title>{{ imageDetails.name }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-tag</v-icon>
              </template>
              <v-list-item-subtitle>标签数量</v-list-item-subtitle>
              <v-list-item-title>{{ imageDetails.tagCount }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-divider class="my-2"></v-divider>

        <v-list>
          <v-list-subheader>镜像标签</v-list-subheader>
          <v-list-item
            v-for="tag in imageDetails.tags"
            :key="tag.id"
            class="px-0"
          >
            <template v-slot:prepend>
              <v-icon>mdi-tag-outline</v-icon>
            </template>
            <v-list-item-title @click="handleTagClick(tag)">
              {{ tag.name }}
            </v-list-item-title>
            <v-list-item-subtitle>
              大小: {{ formatSize(tag.size) }} | {{ tag.digest }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
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

interface Props {
  modelValue: boolean
  imageId: string
}

interface Tag {
  id: string
  name: string
  digest: string
  size: number
}

interface ImageDetail {
  name: string
  tagCount: number
  tags: Tag[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'tag-click': [tag: Tag]
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const imageDetails = ref<ImageDetail | null>(null)
const isLoading = ref(false)

// 监听 imageId 变化
watch(() => props.imageId, async (newId) => {
  if (newId && props.modelValue) {
    await loadImageDetails()
  }
})

// 监听对话框打开状态
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.imageId) {
    await loadImageDetails()
  }
})

const loadImageDetails = async () => {
  isLoading.value = true
  try {
    // 这里应该调用 API 获取镜像详情
    // 暂时使用模拟数据
    imageDetails.value = {
      name: props.imageId,
      tagCount: 5,
      tags: [
        { id: '1', name: 'latest', digest: 'sha256:abc123', size: 12345678 },
        { id: '2', name: 'v1.0', digest: 'sha256:def456', size: 12345678 },
        { id: '3', name: 'v2.0', digest: 'sha256:ghi789', size: 12345678 }
      ]
    }
  } catch (error) {
    console.error('加载镜像详情失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleTagClick = (tag: Tag) => {
  emit('tag-click', tag)
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const close = () => {
  internalValue.value = false
}
</script>
