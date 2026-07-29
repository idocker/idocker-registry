<template>
  <v-dialog v-model="internalValue" max-width="800px" @click:outside="close">
    <v-card>
      <v-card-title class="text-h6">
        {{ $t('dialogs.tagDetails.title') }}
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
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.tagName') }}</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.name }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-fingerprint</v-icon>
              </template>
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.tagDigest') }}</v-list-item-subtitle>
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
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.imageSize') }}</v-list-item-subtitle>
              <v-list-item-title>{{ formatSize(tagDetails.size) }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-clock</v-icon>
              </template>
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.createdAt') }}</v-list-item-subtitle>
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
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.architecture') }}</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.architecture || 'N/A' }}</v-list-item-title>
            </v-list-item>
          </v-col>
          <v-col cols="6">
            <v-list-item density="compact">
              <template v-slot:prepend>
                <v-icon>mdi-laptop</v-icon>
              </template>
              <v-list-item-subtitle>{{ $t('dialogs.tagDetails.os') }}</v-list-item-subtitle>
              <v-list-item-title>{{ tagDetails.os || 'N/A' }}</v-list-item-title>
            </v-list-item>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">{{ $t('dialogs.tagDetails.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDateTime as fmtDT } from '@/utils/helpers'
import repositoryService from '@/services/repository.service'

const { t, locale } = useI18n()

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

// Watch tagId changes
watch(() => props.tagId, async (newId) => {
  if (newId && props.modelValue) {
    await loadTagDetails()
  }
})

// Watch dialog open state
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && props.tagId) {
    await loadTagDetails()
  }
})

const loadTagDetails = async () => {
  isLoading.value = true
  try {
    // Use real API to get tag details
    const response = await repositoryService.getImageTagDetails(props.imageId, props.tagId)
    if (response.success) {
      const { repository, tag } = response.data
      
      // Convert to component expected format
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
      throw new Error( t('error.loadFailed'))
    }
  } catch (error) {
    console.error('Failed to load tag details:', error)
    // If API fails, display error message
    tagDetails.value = {
      id: props.tagId,
      name: t('dialogs.tagDetails.loadingFailed'),
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

const formatDate = (dateString: string) => dateString ? fmtDT(dateString, locale.value) : 'N/A'

const close = () => {
  internalValue.value = false
}
</script>
