<template>
  <ManagementLayout>
    <div class="guide-container">
      <!-- 项目介绍 -->
      <section class="guide-section">
        <h2 class="guide-section-title">
          <span class="material-icons">info</span>
          {{ t('guide.intro') }}
        </h2>
        <div class="guide-card">
          <p>{{ t('guide.introDesc') }}</p>
          <div class="feature-grid">
            <div class="feature-item">
              <span class="material-icons">dns</span>
              <h4>{{ t('guide.feature1Title') }}</h4>
              <p>{{ t('guide.feature1Desc') }}</p>
            </div>
            <div class="feature-item">
              <span class="material-icons">shield</span>
              <h4>{{ t('guide.feature2Title') }}</h4>
              <p>{{ t('guide.feature2Desc') }}</p>
            </div>
            <div class="feature-item">
              <span class="material-icons">sync</span>
              <h4>{{ t('guide.feature3Title') }}</h4>
              <p>{{ t('guide.feature3Desc') }}</p>
            </div>
            <div class="feature-item">
              <span class="material-icons">history</span>
              <h4>{{ t('guide.feature4Title') }}</h4>
              <p>{{ t('guide.feature4Desc') }}</p>
            </div>
            <div class="feature-item">
              <span class="material-icons">language</span>
              <h4>{{ t('guide.feature5Title') }}</h4>
              <p>{{ t('guide.feature5Desc') }}</p>
            </div>
            <div class="feature-item">
              <span class="material-icons">dark_mode</span>
              <h4>{{ t('guide.feature6Title') }}</h4>
              <p>{{ t('guide.feature6Desc') }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 角色和权限 -->
      <section class="guide-section">
        <h2 class="guide-section-title">
          <span class="material-icons">admin_panel_settings</span>
          {{ t('guide.roles') }}
        </h2>
        <div class="guide-card">
          <h3 class="sub-title">{{ t('guide.roleOverview') }}</h3>
          <table class="role-table">
            <thead>
              <tr>
                <th>{{ t('guide.roleCol') }}</th>
                <th>{{ t('guide.scopeCol') }}</th>
                <th>{{ t('guide.dockerPermCol') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="badge badge-admin">{{ t('guide.adminRole') }}</span></td>
                <td>{{ t('guide.adminScope') }}</td>
                <td>{{ t('guide.adminDockerPerm') }}</td>
              </tr>
              <tr>
                <td><span class="badge badge-manager">{{ t('guide.managerRole') }}</span></td>
                <td>{{ t('guide.managerScope') }}</td>
                <td>{{ t('guide.pmDockerPerm') }}</td>
              </tr>
              <tr>
                <td><span class="badge badge-developer">{{ t('guide.developerRole') }}</span></td>
                <td>{{ t('guide.developerScope') }}</td>
                <td>{{ t('guide.devDockerPerm') }}</td>
              </tr>
              <tr>
                <td><span class="badge badge-operator">{{ t('guide.operatorRole') }}</span></td>
                <td>{{ t('guide.operatorScope') }}</td>
                <td>{{ t('guide.opDockerPerm') }}</td>
              </tr>
            </tbody>
          </table>
          <p class="note">{{ t('guide.adminNote') }}</p>
        </div>
      </section>

      <!-- 分层管理 -->
      <section class="guide-section">
        <h2 class="guide-section-title">
          <span class="material-icons">account_tree</span>
          {{ t('guide.hierarchy') }}
        </h2>
        <div class="guide-card">
          <div class="hierarchy-diagram">
            <div class="hierarchy-level">
              <div class="hierarchy-box hierarchy-namespace">
                <span class="material-icons">dns</span>
                <strong>{{ t('guide.nsTitle') }}</strong>
                <span>{{ t('guide.nsLabel') }}</span>
              </div>
              <p class="hierarchy-desc">{{ t('guide.nsDesc') }}<code>backend-team</code>{{ t('guide.exampleSeparator') }}<code>frontend-team</code></p>
            </div>
            <span class="material-icons hierarchy-arrow">arrow_downward</span>
            <div class="hierarchy-level">
              <div class="hierarchy-box hierarchy-project">
                <span class="material-icons">folder</span>
                <strong>{{ t('guide.projectTitle') }}</strong>
                <span>{{ t('guide.projectLabel') }}</span>
              </div>
              <p class="hierarchy-desc">{{ t('guide.projectDesc') }}<code>backend-team/user-service</code></p>
            </div>
            <span class="material-icons hierarchy-arrow">arrow_downward</span>
            <div class="hierarchy-level">
              <div class="hierarchy-box hierarchy-repo">
                <span class="material-icons">inventory_2</span>
                <strong>{{ t('guide.repoTitle') }}</strong>
                <span>{{ t('guide.repoLabel') }}</span>
              </div>
              <p class="hierarchy-desc">{{ t('guide.repoDesc') }}<code>backend-team/user-service:v1.2.3</code></p>
            </div>
          </div>
          <div class="path-example">
            <span class="material-icons">link</span>
            {{ t('guide.pathExample') }}
            <code>docker pull registry.example.com/backend-team/user-service:v1.2.3</code>
          </div>
          <div class="env-note">
            <span class="material-icons">info</span>
            <div>
              <strong>{{ t('guide.envNoteStrong') }}</strong>{{ t('guide.envNoteText') }}<code>{{ t('guide.envNoteTag') }}</code>{{ t('guide.envNoteArrow') }}<code>{{ t('guide.envNoteTag2') }}</code>{{ t('guide.envNoteSuffix') }}
            </div>
          </div>
        </div>
      </section>

      <!-- 默认公共库（default 项目） -->
      <section class="guide-section">
        <h2 class="guide-section-title">
          <span class="material-icons">inventory_2</span>
          {{ t('guide.defaultTitle') }}
        </h2>
        <div class="guide-card">
          <div class="env-note">
            <span class="material-icons">info</span>
            <div>{{ t('guide.defaultIntro') }}</div>
          </div>
          <div class="hierarchy-desc" style="margin-top: 12px">
            {{ t('guide.defaultPathRule') }}
            <code>{{ t('guide.defaultPullCmd') }}</code>
          </div>
          <div class="hierarchy-desc" style="margin-top: 8px">
            {{ t('guide.defaultMoreLabel') }}
            <code>{{ t('guide.defaultMoreCmd') }}</code>
          </div>
          <div class="path-example">
            <span class="material-icons">upload</span>
            {{ t('guide.defaultPushNote') }}
          </div>
          <div class="hierarchy-desc">
            {{ t('guide.defaultProjNoteLabel') }}
            <code>{{ t('guide.defaultProjNoteCmd') }}</code>
          </div>
        </div>
      </section>

      <!-- 最佳实践 -->
      <section class="guide-section">
        <h2 class="guide-section-title">
          <span class="material-icons">lightbulb</span>
          {{ t('guide.practices') }}
        </h2>
        <div class="guide-card">
          <div class="practice-item">
            <span class="material-icons">dns</span>
            <div>
              <h4>{{ t('guide.practice1Title') }}</h4>
              <p>{{ t('guide.practice1Desc') }}</p>
            </div>
          </div>
          <div class="practice-item">
            <span class="material-icons">folder</span>
            <div>
              <h4>{{ t('guide.practice2Title') }}</h4>
              <p>{{ t('guide.practice2Desc') }}</p>
            </div>
          </div>
          <div class="practice-item">
            <span class="material-icons">rocket_launch</span>
            <div>
              <h4>{{ t('guide.practice3Title') }}</h4>
              <p>{{ t('guide.practice3Desc') }}</p>
            </div>
          </div>
          <div class="practice-item">
            <span class="material-icons">group</span>
            <div>
              <h4>{{ t('guide.practice4Title') }}</h4>
              <p>{{ t('guide.practice4Desc') }}</p>
            </div>
          </div>
          <div class="practice-item">
            <span class="material-icons">settings</span>
            <div>
              <h4>{{ t('guide.practice5Title') }}</h4>
              <p>{{ t('guide.practice5Desc') }}</p>
            </div>
          </div>
          <div class="practice-item">
            <span class="material-icons">history</span>
            <div>
              <h4>{{ t('guide.practice6Title') }}</h4>
              <p>{{ t('guide.practice6Desc') }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </ManagementLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ManagementLayout from '@/components/admin/ManagementLayout.vue'

const { t } = useI18n()
</script>

<style lang="scss" scoped>
@use '@/styles/variables.scss' as *;

.guide-container {
  max-width: 880px;
  padding: 8px 0;
}

.guide-section {
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
}

.guide-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-text);
  margin: 0 0 16px 0;

  .material-icons {
    color: var(--accent-text);
    font-size: 24px;
  }
}

.guide-card {
  background: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 20px 24px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--primary-text);

  > p {
    margin: 0 0 16px 0;
    color: var(--neutral-text);
  }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 8px;
}

.feature-item {
  text-align: center;
  padding: 16px 12px;
  border-radius: 8px;
  background: var(--hover-background);
  transition: background 0.2s;

  &:hover {
    background: var(--border-color);
  }

  .material-icons {
    font-size: 28px;
    color: var(--accent-text);
    margin-bottom: 8px;
  }

  h4 {
    margin: 0 0 4px 0;
    font-size: 14px;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: var(--neutral-text);
    line-height: 1.5;
  }
}

.sub-title {
  font-size: 16px;
  font-weight: 600;
  margin: 20px 0 12px 0;
  color: var(--primary-text);

  &:first-child {
    margin-top: 0;
  }
}

.role-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-bottom: 16px;

  th, td {
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  th {
    font-weight: 600;
    color: var(--neutral-text);
    background: var(--hover-background);
    font-size: 12px;
  }

  td {
    vertical-align: middle;
  }
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.badge-admin {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge-manager {
  background: #e3f2fd;
  color: #1565c0;
}

.badge-developer {
  background: #fff3e0;
  color: #e65100;
}

.badge-operator {
  background: #f3e5f5;
  color: #7b1fa2;
}

.note {
  font-size: 12px;
  color: var(--neutral-text);
  margin: 0;
  padding: 8px 12px;
  background: var(--hover-background);
  border-radius: 4px;
  border-left: 3px solid var(--accent-text);
}

.env-note {
  margin-top: 16px;
  padding: 12px 16px;
  background: #e3f2fd;
  border-radius: 8px;
  font-size: 13px;
  color: #1565c0;
  display: flex;
  gap: 10px;
  line-height: 1.7;

  .material-icons {
    font-size: 20px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  strong {
    font-weight: 600;
  }

  code {
    font-size: 12px;
    background: rgba(21, 101, 192, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.hierarchy-diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.hierarchy-level {
  text-align: center;
}

.hierarchy-box {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 32px;
  border-radius: 8px;
  border: 2px solid;

  .material-icons {
    font-size: 28px;
  }

  strong {
    font-size: 15px;
  }

  span {
    font-size: 12px;
    opacity: 0.7;
  }
}

.hierarchy-namespace {
  border-color: #1565c0;
  background: #e3f2fd;
  color: #1565c0;
}

.hierarchy-project {
  border-color: #2e7d32;
  background: #e8f5e9;
  color: #2e7d32;
}

.hierarchy-repo {
  border-color: #e65100;
  background: #fff3e0;
  color: #e65100;
}

.hierarchy-arrow {
  font-size: 28px;
  color: var(--neutral-text);
  margin: 4px 0;
}

.hierarchy-desc {
  font-size: 12px;
  color: var(--neutral-text);
  margin: 8px 0 0 0;
  max-width: 360px;

  code {
    font-size: 12px;
    background: var(--hover-background);
    padding: 1px 4px;
    border-radius: 3px;
  }
}

.path-example {
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--hover-background);
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  .material-icons {
    font-size: 18px;
    color: var(--accent-text);
  }

  code {
    font-size: 13px;
    background: var(--card-bg);
    padding: 2px 6px;
    border-radius: 3px;
    word-break: break-all;
  }
}

.practice-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .material-icons {
    font-size: 24px;
    color: var(--accent-text);
    flex-shrink: 0;
    margin-top: 2px;
  }

  h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--neutral-text);
    line-height: 1.6;
  }
}

@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hierarchy-box {
    padding: 12px 20px;
  }
}
</style>
