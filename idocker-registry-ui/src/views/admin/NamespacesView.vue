<template>
  <ManagementLayout>
    <div class="namespaces-container">

      <div class="namespaces-table-container">
        <div class="table-controls" v-if="filteredNamespaces.length > 0">
          <input type="text" :placeholder="$t('namespaces.searchNamespaces')" v-model="searchQuery"
            class="search-input" />
          <div class="table-actions">
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
                <td>{{ namespace.name }}</td>
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
                  <button class="btn-icon btn-ghost" @click="editNamespace(namespace)" :title="$t('common.edit')">
                    <span class="material-icons">edit</span>
                  </button>
                  <button v-if="namespace.is_active" class="btn-icon btn-ghost" @click="deleteNamespace(namespace)"
                    :title="$t('common.delete')">
                    <span class="material-icons">delete</span>
                  </button>
                  <button v-else class="btn-icon btn-ghost" @click="reactivateNamespace(namespace)"
                    :title="$t('common.reactivate')">
                    <span class="material-icons">restart</span>
                  </button>
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
                :class="{ 'error': errors.name }" />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
            <div class="form-group">
              <label for="namespace-description">{{ $t('namespaces.description') }}</label>
              <textarea id="namespace-description" v-model="namespaceForm.description"
                :placeholder="$t('namespaces.descriptionPlaceholder')" class="form-textarea" rows="4"></textarea>
            </div>
            <div v-if="editingNamespace" class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="namespaceForm.is_active" />
                {{ $t('namespaces.isActive') }}
              </label>
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
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal">
          <div class="modal-header">
            <h2>{{ $t('namespaces.deleteNamespace') }}</h2>
            <button class="btn btn-ghost btn-icon" @click="showDeleteModal = false">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body">
            <p>{{ $t('namespaces.deleteConfirm', { name: deletingNamespace.name }) }}</p>
            <p v-if="deletingNamespace.project_count > 0" class="warning-message">
              {{ $t('namespaces.deleteWithProjectsWarning', { count: deletingNamespace.project_count }) }}
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" @click="showDeleteModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button class="btn btn-danger" @click="confirmDelete"
              :disabled="isSubmitting || deletingNamespace.project_count > 0">
              <span v-if="isSubmitting" class="material-icons spinning">refresh</span>
              <span v-else>{{ $t('common.delete') }}</span>
            </button>
          </div>
        </div>
      </div>

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
import namespaceService from '@/services/namespace.service';
import ManagementLayout from '@/components/admin/ManagementLayout.vue';
import type { Namespace } from '@/types';

const namespaces = ref<Namespace[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const editingNamespace = ref(null);
const deletingNamespace = ref(null);
const isSubmitting = ref(false);
const message = ref({ text: '', type: '' });
const errors = ref({});

const namespaceForm = ref({
  name: '',
  description: '',
  is_active: true
});

// Computed properties
const filteredNamespaces = computed(() => {
  if (!searchQuery.value) return namespaces.value;

  const query = searchQuery.value.toLowerCase();
  namespaces.value.filter(namespace =>
    namespace.name.toLowerCase().includes(query) ||
    (namespace.description && namespace.description.toLowerCase().includes(query))
  );
  // 处理is_active 和 截取description长度为10
  if (namespaces.value.length > 0) {
    namespaces.value.map(namespace => ({
      ...namespace,
      description: namespace.description.substring(0, 10) + '...',
      is_active: namespace.is_active ? 'active' : 'inactive'
    }));
  }

  return namespaces.value
});

const paginatedNamespaces = computed(() => {
  // Since we're handling pagination on the server side, this is just for UI consistency
  return filteredNamespaces.value;
});

// Methods
const loadNamespaces = async () => {
  try {
    isLoading.value = true;
    const response = await namespaceService.getNamespaces({
      page: currentPage.value,
      search: searchQuery.value
    });

    namespaces.value = response.data || [];
    totalPages.value = Math.ceil(response.pagination?.total / 10) || 1;
    console.log(namespaces.value)
    console.log(filteredNamespaces.value)
  } catch (error) {
    console.error('Error loading namespaces:', error);
    showMessage(error.response?.data?.message || 'Failed to load namespaces', 'error');
  } finally {
    isLoading.value = false;
  }
};

const createNamespace = () => {
  editingNamespace.value = null;
  namespaceForm.value = {
    name: '',
    description: '',
    is_active: true
  };
  errors.value = {};
  showCreateModal.value = true;
};

const editNamespace = (namespace) => {
  editingNamespace.value = namespace;
  namespaceForm.value = {
    name: namespace.name,
    description: namespace.description || '',
    is_active: !!namespace.is_active
  };
  errors.value = {};
  showCreateModal.value = true;
};

const deleteNamespace = (namespace) => {
  deletingNamespace.value = namespace;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  try {
    isSubmitting.value = true;
    await namespaceService.deleteNamespace(deletingNamespace.value.id);

    showMessage(
      `Namespace "${deletingNamespace.value.name}" has been deleted successfully`,
      'success'
    );

    showDeleteModal.value = false;
    loadNamespaces();
  } catch (error) {
    console.error('Error deleting namespace:', error);
    showMessage(
      error.response?.data?.message || 'Failed to delete namespace',
      'error'
    );
  } finally {
    isSubmitting.value = false;
  }
};

const reactivateNamespace = async (namespace) => {
  if (!confirm(`Are you sure you want to reactivate "${namespace.name}"?`)) {
    return;
  }

  try {
    await namespaceService.reactivateNamespace(namespace.id);

    showMessage(
      `Namespace "${namespace.name}" has been reactivated successfully`,
      'success'
    );

    loadNamespaces();
  } catch (error) {
    console.error('Error reactivating namespace:', error);
    showMessage(
      error.response?.data?.message || 'Failed to reactivate namespace',
      'error'
    );
  }
};

const saveNamespace = async () => {

  if (!namespaceForm.value.name || namespaceForm.value.name.trim() === '') {
    errors.value = 'Namespace name is required';
    return;
  }

  try {
    isSubmitting.value = true;

    if (editingNamespace.value) {
      await namespaceService.updateNamespace(editingNamespace.value.id, namespaceForm.value);
      showMessage(
        `Namespace "${namespaceForm.value.name}" has been updated successfully`,
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
  } catch (error) {
    console.error('Error saving namespace:', error);
    showMessage(
      error.response?.data?.message || 'Failed to save namespace',
      'error'
    );
  } finally {
    isSubmitting.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const showMessage = (text, type) => {
  message.value = { text, type };
  setTimeout(() => {
    message.value = { text: '', type: '' };
  }, 5000);
};

// Lifecycle
onMounted(() => {
  loadNamespaces();
});

// Watch for page changes
watch(currentPage, () => {
  loadNamespaces();
});

</script>

<style scoped>
.namespaces-container {
  padding: 0px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin-bottom: 8px;
  color: #333;
}

.page-header p {
  color: #666;
  margin: 0;
}

.namespaces-table-container {
  background: var(--card-bg);
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
}

.search-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 300px;
  font-size: 14px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.table-container {
  overflow-x: auto;
}

.namespaces-table {
  width: 100%;
  border-collapse: collapse;
}

.namespaces-table th,
.namespaces-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.namespaces-table th {
  background-color: var(--card-bg);
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color)
}

.namespaces-table tr:hover {
  background-color: var(--hover-bg);
}

.empty-state {
  text-align: center;
  padding: 30px 0;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.active {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.page-info {
  color: #666;
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
  background: white;
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
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.modal-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input.error,
.form-textarea.error {
  border-color: #dc3545;
}

.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
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
}

.message.success {
  background-color: #d4edda;
  color: #155724;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
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

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 32px 16px;
}

.loading-indicator,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;
}

.loading-indicator .material-icons,
.empty-state .material-icons {
  font-size: 48px;
}

.warning-message {
  color: #856404;
  background-color: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-danger:disabled {
  background-color: #a82832;
  cursor: not-allowed;
}
</style>