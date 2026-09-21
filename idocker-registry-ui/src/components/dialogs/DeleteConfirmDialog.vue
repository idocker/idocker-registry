<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal delete-confirm-dialog">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="btn btn-ghost btn-icon modal-close" @click="$emit('cancel')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- 存在关联子项：说明原因并禁止删除 -->
        <div v-if="blockers.length > 0" class="delete-blocked">
          <span class="material-icons">block</span>
          <div>
            <p class="delete-blocked-title">{{ $t('deleteDialog.blockedTitle') }}</p>
            <ul class="delete-blocked-list">
              <li v-for="(blocker, index) in blockers" :key="index">{{ blocker }}</li>
            </ul>
            <p class="delete-blocked-hint">{{ $t('deleteDialog.blockedHint') }}</p>
          </div>
        </div>

        <template v-else>
          <p class="delete-warning">{{ warning || $t('deleteDialog.warning') }}</p>
          <label class="delete-confirm-label" for="delete-confirm-input">
            {{ $t('deleteDialog.instruction', { type: entityLabel, name: entityName }) }}
          </label>
          <input
            id="delete-confirm-input"
            ref="inputRef"
            v-model="typedName"
            class="delete-confirm-input"
            type="text"
            autocomplete="off"
            :placeholder="$t('deleteDialog.placeholder')"
            @keyup.enter="submit"
          />
          <span v-if="typedName.length > 0 && !nameMatches" class="delete-confirm-mismatch">
            {{ $t('deleteDialog.mismatch') }}
          </span>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </button>
        <button class="btn btn-danger" :disabled="!canDelete" @click="submit">
          <span v-if="loading" class="material-icons spinning">refresh</span>
          <span v-else>{{ $t('deleteDialog.confirm') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

interface Props {
  /** 弹窗标题，例如「删除命名空间」 */
  title: string
  /** 对象类型名称，用于提示语，例如「命名空间」 */
  entityLabel: string
  /** 必须逐字输入才能确认的名称 */
  entityName: string
  /** 关联子项描述；非空时不渲染输入框并禁止删除 */
  blockers?: string[]
  /** 删除请求进行中：禁用确认按钮，避免重复提交 */
  loading?: boolean
  /** 可选的额外提示文案；不传则使用 deleteDialog.warning 默认文案 */
  warning?: string
}

const props = withDefaults(defineProps<Props>(), {
  blockers: () => [],
  loading: false
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const typedName = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// 目标名称存进库时未归一化，两侧都 trim 才能保证带空白的名称仍可确认
const targetName = computed(() => String(props.entityName ?? '').trim())
const nameMatches = computed(() => typedName.value.trim() === targetName.value)
const canDelete = computed(
  () => !props.loading && props.blockers.length === 0 && nameMatches.value
)

function submit() {
  if (canDelete.value) {
    emit('confirm')
  }
}

onMounted(() => {
  if (props.blockers.length === 0) {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style lang="scss" scoped>
.delete-warning {
  margin: 0 0 12px;
  color: var(--error-color);
  font-size: 14px;
}

.delete-confirm-label {
  display: block;
  margin-bottom: 8px;
  color: var(--primary-text);
  font-size: 14px;
}

.delete-confirm-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--background);
  color: var(--primary-text);

  &:focus {
    outline: none;
    border-color: var(--primary-color);
  }
}

.delete-confirm-mismatch {
  display: block;
  margin-top: 4px;
  color: var(--error-color);
  font-size: 12px;
}

.delete-blocked {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 4px;
  background-color: var(--hover-background);

  .material-icons {
    color: var(--warning-color);
  }
}

.delete-blocked-title {
  margin: 0 0 8px;
  color: var(--primary-text);
  font-weight: 500;
}

.delete-blocked-list {
  margin: 0 0 8px;
  padding-left: 18px;
  color: var(--primary-text);
  font-size: 14px;
  line-height: 1.6;
}

.delete-blocked-hint {
  margin: 0;
  color: var(--neutral-text);
  font-size: 12px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}
</style>
