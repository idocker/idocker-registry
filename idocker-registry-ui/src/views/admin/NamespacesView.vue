<template>
  <ManagementLayout>
    <div class="namespaces-container">

      <div class="namespaces-table-container">
        <div class="table-controls">
          <input type="text" :placeholder="$t('namespaces.searchNamespaces')" v-model="searchQuery"
            class="search-input" />
          <div class="table-actions">
            <label v-if="isAdmin" class="recycle-toggle" :title="$t('recycleBin.toggleHint')">
              <input type="checkbox" v-model="showRecycleBin" />
              <span>{{ $t('recycleBin.toggle') }}</span>
            </label>
            <button class="btn btn-primary" @click="showCreateModal = true">
              <span class="material-icons">add</span>
              {{ $t('namespaces.createNamespace') }}
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="namespaces-table">
            <thead v-if="filteredNamespaces.length > 0">
              <tr>
                <th>{{ $t('namespaces.namespaceName') }}</th>
                <th>{{ $t('namespaces.description') }}</th>
                <!-- <th>{{ $t('namespaces.projectCount') }}</th> -->
                <th>{{ $t('namespaces.status') }}</th>
                <!-- <th>{{ $t('namespaces.createdBy') }}</th> -->
                <th>{{ $t('namespaces.createdAt') }}</th>
                <th>{{ $t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isLoading">
                <td colspan="7" class="loading-cell">
                  <div class="loading-indicator">
                    <span class="material-icons">refresh</span>
                    {{ $t('namespaces.loadingNamespaces') }}
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredNamespaces.length === 0 && showRecycleBin">
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-icons">delete_outline</span>
                    <h3>{{ $t('recycleBin.emptyRecycleBin') }}</h3>
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredNamespaces.length === 0 && searchQuery === ''">
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-icons">dns</span>
                    <h3>{{ $t('namespaces.noNamespacesYet') }}</h3>
                    <p>{{ $t('namespaces.startManagingNamespaces') }}</p>
                    <button class="btn btn-primary" @click="showCreateModal = true">
                      <span class="material-icons">add</span>
                      {{ $t('namespaces.createFirstNamespace') }}
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-else-if="filteredNamespaces.length === 0 && searchQuery !== ''">
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-icons">search_off</span>
                    <h3>{{ $t('namespaces.noSearchResults') }}</h3>
                    <p>{{ $t('namespaces.tryDifferentSearchTerms') }}</p>
                  </div>
                </td>
              </tr>
              <tr v-for="namespace in filteredNamespaces" :key="namespace.id">
                <td>
                  <div class="entity-name-cell">
                    <span>{{ namespace.name }}</span>
                    <span v-if="namespace.deleted_at" class="status-badge recycled">
                      {{ $t('recycleBin.badge') }}
                    </span>
                  </div>
                  <div v-if="namespace.deleted_at" class="recycle-meta">
                    <span>{{ $t('recycleBin.deletedAt') }}: {{ formatDate(namespace.deleted_at) }}</span>
                    <span>{{ $t('recycleBin.deletedBy') }}: {{ namespace.deleted_by_username || $t('recycleBin.unknownUser') }}</span>
                  </div>
                </td>
                <td>{{ namespace.description || '-' }}</td>
                <!-- <td>{{ namespace.project_count || 0 }}</td> -->
                <td>
                  <span :class="['status-badge', namespace.is_active ? 'active' : 'inactive']">
                    {{ namespace.is_active ? $t('common.active') : $t('common.inactive') }}
                  </span>
                </td>
                <!-- <td>{{ namespace.created_by_username || '-' }}</td> -->
                <td>{{ formatDate(namespace.created_at) }}</td>
                <td class="action-buttons">
                  <template v-if="namespace.deleted_at">
                    <template v-if="isAdmin">
                      <button class="btn btn-icon btn-ghost" @click="requestRestore(namespace)"
                        :title="$t('recycleBin.restore')">
                        <span class="material-icons">settings_backup_restore</span>
                      </button>
                      <button class="btn btn-icon btn-ghost btn-danger-ghost" @click="requestPurge(namespace)"
                        :title="$t('recycleBin.purge')">
                        <span class="material-icons">delete_forever</span>
                      </button>
                    </template>
                  </template>
                  <template v-else>
                    <button class="btn btn-icon btn-ghost" @click="editNamespace(namespace)" :title="$t('common.edit')">
                      <span class="material-icons">edit</span>
                    </button>
                    <button v-if="namespace.is_active && namespace.name !== 'default'" class="btn btn-icon btn-ghost" @click="deleteNamespace(namespace)"
                      :title="$t('common.delete')">
                      <span class="material-icons">delete</span>
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination" v-if="totalPages > 1">
          <button class="btn btn-ghost" @click="currentPage = Math.max(1, currentPage - 1)"
            :disabled="currentPage === 1">
            {{ $t('common.previousPage') }}
          </button>
          <span class="page-info">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button class="btn btn-ghost" @click="currentPage = Math.min(totalPages, currentPage + 1)"
            :disabled="currentPage === totalPages">
            {{ $t('common.nextPage') }}
          </button>
          <select v-model="pageSize" class="page-size-select" @change="currentPage = 1">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
      </div>

      <!-- Create/Edit Namespace Modal -->
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ editingNamespace ? $t('namespaces.editNamespace') : $t('namespaces.createNewNamespace') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showCreateModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="namespace-name">{{ $t('namespaces.namespaceName') }} *</label>
              <input type="text" id="namespace-name" v-model="namespaceForm.name"
                :placeholder="$t('namespaces.namespaceNamePlaceholder')" class="form-input"
                :class="{ 'error': errors.name }" :disabled="!!editingNamespace" />
              <span v-if="editingNamespace" class="field-hint">{{ $t('namespaces.nameImmutable') }}</span>
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
            <div class="form-group">
              <label for="namespace-description">{{ $t('namespaces.description') }}</label>
              <textarea id="namespace-description" v-model="namespaceForm.description"
                :placeholder="$t('namespaces.descriptionPlaceholder')" class="form-textarea" rows="4"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showCreateModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button class="btn btn-primary" @click="saveNamespace" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="material-icons spinning">refresh</span>
              <span v-else>{{ editingNamespace ? $t('common.update') : $t('common.create') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <DeleteConfirmDialog
        v-if="showDeleteModal && deletingNamespace"
        :title="$t('namespaces.deleteNamespace')"
        :entity-label="$t('recycleBin.namespaceLabel')"
        :entity-name="deletingNamespace.name"
        :blockers="deleteBlockers"
        :loading="isSubmitting"
        @confirm="confirmDelete"
        @cancel="showDeleteModal = false"
      />

      <!-- 回收站：恢复确认 -->
      <ConfirmationDialog
        v-if="showRestoreModal && restoringNamespace"
        :title="$t('recycleBin.restoreConfirmTitle')"
        :message="$t('recycleBin.restoreConfirm', { name: restoringNamespace.name })"
        @confirm="confirmRestore"
        @cancel="showRestoreModal = false"
      />

      <!-- 回收站：彻底删除确认（需逐字输入名称） -->
      <DeleteConfirmDialog
        v-if="showPurgeModal && purgingNamespace"
        :title="$t('recycleBin.purgeConfirmTitle')"
        :entity-label="$t('recycleBin.namespaceLabel')"
        :entity-name="purgingNamespace.name"
        :warning="$t('recycleBin.purgeWarning')"
        :loading="isPurging"
        @confirm="confirmPurge"
        @cancel="showPurgeModal = false"
      />

      <!-- Success/Error Messages -->
      <div v-if="message.text" :class="['message', message.type]">
        <span class="material-icons">{{ message.type === 'success' ? 'check_circle' : 'error' }}</span>
        {{ message.text }}
      </div>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import namespaceService from '@/services/namespace.service';
import ManagementLayout from '@/components/admin/ManagementLayout.vue';
import DeleteConfirmDialog from '@/components/dialogs/DeleteConfirmDialog.vue';
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog.vue';
import { formatDate as fmtDate } from '@/utils/helpers';
import type { Namespace } from '@/types';

const { t, locale } = useI18n()
const authStore = useAuthStore()
// 回收站视图 / 恢复 / 彻底删除仅管理员可见（后端仍会兜底校验）
const isAdmin = computed(() => authStore.user?.role === 'admin')
const namespaces = ref<Namespace[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const totalPages = ref(1);
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const editingNamespace = ref(null);
const deletingNamespace = ref(null);
const isSubmitting = ref(false);
const message = ref({ text: '', type: '' });
const errors = ref<Record<string, string>>({});

// 回收站（假删除）：切换、恢复、彻底删除
const showRecycleBin = ref(false);
const showRestoreModal = ref(false);
const restoringNamespace = ref<Namespace | null>(null);
const isRestoring = ref(false);
const showPurgeModal = ref(false);
const purgingNamespace = ref<Namespace | null>(null);
const isPurging = ref(false);

const namespaceForm = ref({
  name: '',
  description: ''
});

// Computed properties
const filteredNamespaces = computed(() => {
  let result = namespaces.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(namespace =>
      namespace.name.toLowerCase().includes(query) ||
      (namespace.description && namespace.description.toLowerCase().includes(query))
    );
  }

  return result;
});



// Methods
const loadNamespaces = async () => {
  try {
    isLoading.value = true;
    const response = await namespaceService.getNamespaces({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      // 开启回收站只拉已删除（deleted=1），否则只看未删除（deleted=0）
      deleted: showRecycleBin.value ? '1' : '0'
    });

    namespaces.value = response.data || [];
    totalPages.value = Math.ceil(response.pagination?.total / pageSize.value) || 1;
    console.log(namespaces.value)
    console.log(filteredNamespaces.value)
  } catch (e: any) {
    console.error('Error loading namespaces:', e);
    showMessage(e?.message || 'Failed to load namespaces', 'error');
  } finally {
    isLoading.value = false;
  }
};

const createNamespace = () => {
  editingNamespace.value = null;
  namespaceForm.value = {
    name: '',
    description: ''
  };
  errors.value = {};
  showCreateModal.value = true;
};

const editNamespace = (namespace) => {
  editingNamespace.value = namespace;
  namespaceForm.value = {
    name: namespace.name,
    description: namespace.description || ''
  };
  errors.value = {};
  showCreateModal.value = true;
};

const deleteNamespace = (namespace) => {
  deletingNamespace.value = namespace;
  showDeleteModal.value = true;
};

// 删除前拦截：命名空间下仍有活跃项目时不允许删除
const deleteBlockers = computed(() => {
  const namespace = deletingNamespace.value;
  if (!namespace) return [];
  const projectCount = namespace.project_count || 0;
  return projectCount > 0
    ? [t('namespaces.deleteWithProjectsWarning', { count: projectCount })]
    : [];
});

const confirmDelete = async () => {
  try {
    isSubmitting.value = true;
    await namespaceService.deleteNamespace(deletingNamespace.value.id);

    // 假删除：资源进入回收站，可由管理员恢复
    showMessage(
      t('recycleBin.deleteSuccess', { name: deletingNamespace.value.name }),
      'success'
    );

    showDeleteModal.value = false;
    loadNamespaces();
  } catch (e: any) {
    console.error('Error deleting namespace:', e);
    showMessage(
      e?.message || 'Failed to delete namespace',
      'error'
    );
  } finally {
    isSubmitting.value = false;
  }
};

// ===== 回收站操作 =====
const requestRestore = (namespace: Namespace) => {
  restoringNamespace.value = namespace;
  showRestoreModal.value = true;
};

const confirmRestore = async () => {
  if (!restoringNamespace.value || isRestoring.value) return;
  isRestoring.value = true;
  try {
    await namespaceService.restoreNamespace(restoringNamespace.value.id.toString());
    showRestoreModal.value = false;
    showMessage(t('recycleBin.restoreSuccess', { name: restoringNamespace.value.name }), 'success');
    restoringNamespace.value = null;
    await loadNamespaces();
  } catch (e: any) {
    console.error('Error restoring namespace:', e);
    showMessage(e?.message || t('recycleBin.operationFailed'), 'error');
  } finally {
    isRestoring.value = false;
  }
};

const requestPurge = (namespace: Namespace) => {
  purgingNamespace.value = namespace;
  showPurgeModal.value = true;
};

const confirmPurge = async () => {
  if (!purgingNamespace.value || isPurging.value) return;
  isPurging.value = true;
  try {
    await namespaceService.purgeNamespace(purgingNamespace.value.id.toString());
    showPurgeModal.value = false;
    showMessage(t('recycleBin.purgeSuccess', { name: purgingNamespace.value.name }), 'success');
    purgingNamespace.value = null;
    await loadNamespaces();
  } catch (e: any) {
    console.error('Error purging namespace:', e);
    showMessage(e?.message || t('recycleBin.operationFailed'), 'error');
  } finally {
    isPurging.value = false;
  }
};

const saveNamespace = async () => {

  if (!namespaceForm.value.name || namespaceForm.value.name.trim() === '') {
    errors.value = { name: 'Namespace name is required' };
    return;
  }

  try {
    isSubmitting.value = true;

    if (editingNamespace.value) {
      // 名称在创建后不可修改，编辑只提交描述
      await namespaceService.updateNamespace(editingNamespace.value.id, {
        description: namespaceForm.value.description
      });
      showMessage(
        `Namespace "${editingNamespace.value.name}" has been updated successfully`,
        'success'
      );
    } else {
      await namespaceService.createNamespace(namespaceForm.value);
      showMessage(
        `Namespace "${namespaceForm.value.name}" has been created successfully`,
        'success'
      );
    }

    showCreateModal.value = false;
    loadNamespaces();
  } catch (e: any) {
    console.error('Error saving namespace:', e);
    showMessage(
      e?.message || 'Failed to save namespace',
      'error'
    );
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (dateString) => dateString ? fmtDate(dateString, locale.value) : '-';

const showMessage = (text, type) => {
  message.value = { text, type };
  setTimeout(() => {
    message.value = { text: '', type: '' };
  }, 3000);
};

// Lifecycle
onMounted(() => {
  loadNamespaces();
});

// Watch for page changes
watch(currentPage, () => {
  loadNamespaces();
});

// Watch for page size changes
watch(pageSize, () => {
  currentPage.value = 1;
  loadNamespaces();
});

// 切换回收站视图时回到第一页重新拉取
watch(showRecycleBin, () => {
  currentPage.value = 1;
  loadNamespaces();
});

</script>

<style lang="scss" scoped>
@use '@/styles/variables' as *;

.namespaces-container {
    padding: 0px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h1 {
        margin: 0;
        font-size: 28px;
    }
}

.namespaces-table-container {
    background-color: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
}

.table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);

    .search-input {
        width: 300px;
        padding: 10px;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 14px;

        &:focus {
            outline: none;
            border-color: var(--primary-color);
        }
    }

    .table-actions {
        display: flex;
        gap: 8px;
    }
}

.table-container {
    overflow-x: auto;
}

.namespaces-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid var(--border-color);
    }

    th {
        font-weight: 600;
        color: var(--neutral-text);
        background-color: var(--hover-background);
    }

    tr:hover {
        background-color: var(--hover-background);
    }

    .loading-cell,
    .empty-cell {
        text-align: center;
        padding: 40px 12px;
        color: var(--neutral-text);
    }

    .loading-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;

        .material-icons {
            animation: spin 1s linear infinite;
        }
    }

    .action-buttons {
        display: flex;
        gap: 8px;
    }
}

.empty-state {
    text-align: center;

    .material-icons {
        font-size: 48px;
    }

    h3 {
        margin: 16px 0 8px;
        color: var(--primary-text);
    }

    p {
        color: var(--neutral-text);
        margin: 0 0 16px;
    }
}

.status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    display: inline-block;
}

.status-badge.active {
    background-color: var(--success-color);
    color: white;
}

.status-badge.inactive {
    background-color: var(--neutral-text);
    color: white;
}

/* 回收站（假删除） */
.status-badge.recycled {
    background-color: var(--error-color);
    color: white;
}

.recycle-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: var(--neutral-text);
    cursor: pointer;
    user-select: none;

    input {
        cursor: pointer;
    }
}

.entity-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
}

.recycle-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--neutral-text);
}

.btn-danger-ghost {
    color: var(--error-color);
}

.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-top: 1px solid var(--border-color);
}

.page-info {
    color: var(--neutral-text);
    font-size: 14px;
}

/* Modal styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal {
    background: var(--card-background);
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-color);

    h2 {
        margin: 0;
        color: var(--primary-text);
    }
}

.modal-body {
    padding: 16px;
}

.form-group {
    margin-bottom: 16px;

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--primary-text);
    }
}

.form-input,
.form-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
    background-color: var(--background);
    color: var(--primary-text);

    &.error {
        border-color: var(--error-color);
    }
}

.error-message {
    color: var(--error-color);
    font-size: 12px;
    margin-top: 4px;
    display: block;
}

.field-hint {
    color: var(--neutral-text);
    font-size: 12px;
    margin-top: 4px;
    display: block;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px;
    border-top: 1px solid var(--border-color);
}

.message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 2000;
    animation: fadeIn 0.3s ease-in-out;

    &.success {
        background-color: var(--success-color);
        color: white;
    }

    &.error {
        background-color: var(--error-color);
        color: white;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
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

.btn-danger {
    background-color: var(--error-color);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
}
</style>