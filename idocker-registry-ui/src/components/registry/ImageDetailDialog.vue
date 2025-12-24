<template>
  <v-dialog v-model="internalValue" max-width="800px" @click:outside="close">
    <v-card>
      <v-card-title class="text-h6">
        {{ $t('dialogs.imageDetails.title') }}
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
              <v-list-item-subtitle>{{ $t('dialogs.imageDetails.imageName') }}</v-list-item-subtitle>
              <v-list-item-title>{{ imageDetails.name }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-tag</v-icon>
              </template>
              <v-list-item-subtitle>{{ $t('dialogs.imageDetails.tagCount') }}</v-list-item-subtitle>
              <v-list-item-title>{{ imageDetails.tagCount }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>

        <v-divider class="my-2"></v-divider>

        <v-list>
          <v-list-subheader>{{ $t('dialogs.imageDetails.imageTags') }}</v-list-subheader>
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
              {{ $t('dialogs.imageDetails.tagSize') }}: {{ formatSize(tag.size) }} | {{ tag.digest }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">{{ $t('dialogs.imageDetails.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import repositoryService from '@/services/repository.service'

const { t } = useI18n()

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
    // 使用真实API获取镜像详情
    const response = await repositoryService.getImageDetails(props.imageId)
    if (response.success) {
      const { repository, tags } = response.data
      
      // 转换为组件期望的格式
      imageDetails.value = {
        name: repository.fullName || repository.name,
        tagCount: tags.length,
        tags: tags.map(tag => ({
          id: tag.id.toString(),
          name: tag.tag || tag.name,
          digest: tag.digest,
          size: tag.size
        }))
      }
    } else {
      throw new Error(response.message || t('error.loadFailed'))
    }
  } catch (error) {
    console.error('加载镜像详情失败:', error)
    // 如果API失败，显示错误信息
    imageDetails.value = {
      name: t('dialogs.imageDetails.loadingFailed'),
      tagCount: 0,
      tags: []
    }
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
