# i18n Implementation Guide

## Overview
This guide explains how to use internationalization (i18n) in the iDocker Registry application. The application now supports both English and Chinese (Simplified) languages.

## Setup

### Installation
vue-i18n has been installed and configured in the project.

### Configuration Files
- `src/i18n/index.ts` - Main i18n configuration
- `src/i18n/locales/en-US.ts` - English translations
- `src/i18n/locales/zh-CN.ts` - Chinese translations

### Integration
The i18n instance has been integrated in `src/main.ts`.

## Usage in Components

### Template Syntax
```vue
<template>
  <div>
    <h1>{{ $t('nav.home') }}</h1>
    <p>{{ $t('common.welcome') }}</p>
    
    <!-- With interpolation -->
    <p>{{ $t('confirm.deleteMultipleMessage', { count: 5 }) }}</p>
  </div>
</template>
```

### Script Syntax
```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Get translation
const welcomeMessage = t('common.welcome')

// Change language programmatically
const changeLanguage = () => {
  locale.value = 'en-US'
  localStorage.setItem('locale', 'en-US')
}

// Check current locale
const isEnglish = computed(() => locale.value === 'en-US')
</script>
```

### Composable
You can also create a composable for reusable i18n logic:

```typescript
// src/composables/useI18n.ts
import { useI18n as useVueI18n } from 'vue-i18n'

export function useI18n() {
  const { t, locale, availableLocales } = useVueI18n()
  
  const currentLanguage = computed(() => {
    const langMap = {
      'zh-CN': '中文',
      'en-US': 'English'
    }
    return langMap[locale.value] || locale.value
  })
  
  const setLanguage = (lang: string) => {
    locale.value = lang
    localStorage.setItem('locale', lang)
  }
  
  return {
    t,
    locale,
    availableLocales,
    currentLanguage,
    setLanguage
  }
}
```

## Available Translation Keys

### Common Keys
- `common.welcome` - Welcome message
- `common.loading` - Loading indicator
- `common.save` - Save button
- `common.cancel` - Cancel button
- `common.delete` - Delete button
- `common.edit` - Edit button
- `common.search` - Search
- `common.refresh` - Refresh
- `common.language` - Language
- ...and more

### Navigation Keys
- `nav.home` - Home
- `nav.images` - Images
- `nav.repositories` - Repositories
- `nav.projects` - Projects
- `nav.users` - Users
- `nav.audit` - Audit Log
- `nav.sync` - Sync
- `nav.settings` - Settings
- `nav.logout` - Logout

### Auth Keys
- `auth.loginTitle` - Login page title
- `auth.username` - Username label
- `auth.password` - Password label
- `auth.loginButton` - Login button
- `auth.sessionExpired` - Session expired message
- `auth.invalidCredentials` - Invalid credentials error

### User Keys
- `users.title` - User management title
- `users.create` - Create user button
- `users.delete` - Delete user button
- `users.username` - Username label
- `users.email` - Email label
- `users.role` - Role label
- `users.roleAdmin` - Administrator role
- `users.roleUser` - Regular user role

### Project Keys
- `projects.title` - Project management title
- `projects.createProject` - Create project button
- `projects.projectName` - Project name label
- `projects.namespace` - Namespace label
- `projects.members` - Members section
- `projects.roleOwner` - Owner role
- `projects.roleMaintainer` - Maintainer role
- `projects.roleViewer` - Viewer role

### Image Keys
- `images.title` - Image repository title
- `images.imageList` - Image list
- `images.tagName` - Tag name
- `images.delete` - Delete image
- `images.noImages` - No images found

### Sync Keys
- `sync.title` - Sync title
- `sync.status` - Sync status
- `sync.all` - Sync all button
- `sync.project` - Sync project
- `sync.inProgress` - Sync in progress

### Audit Keys
- `audit.title` - Audit log title
- `audit.logList` - Log list
- `audit.export` - Export logs
- `audit.cleanup` - Cleanup logs

### Settings Keys
- `settings.title` - Settings title
- `settings.language` - Language setting
- `settings.theme` - Theme setting

### Error Keys
- `error.networkError` - Network error
- `error.serverError` - Server error
- `error.unauthorized` - Unauthorized
- `error.notFound` - Resource not found
- `error.validationError` - Validation error

### Success Keys
- `success.operationCompleted` - Operation completed
- `success.dataLoaded` - Data loaded
- `success.dataSaved` - Data saved
- `success.dataDeleted` - Data deleted

### Confirm Keys
- `confirm.deleteTitle` - Delete confirmation title
- `confirm.deleteMessage` - Delete confirmation message
- `confirm.logoutTitle` - Logout confirmation title

## Language Switcher Component

A language switcher component has been created at `src/components/LanguageSwitcher.vue`.

### Usage
```vue
<template>
  <div>
    <LanguageSwitcher />
  </div>
</template>

<script setup lang="ts">
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
</script>
```

## Adding New Translations

### Step 1: Add to English locale
Edit `src/i18n/locales/en-US.ts`:

```typescript
export default {
  // Add to existing section or create new section
  common: {
    // ... existing keys
    newKey: 'New English translation'
  },
  newSection: {
    key1: 'Translation 1',
    key2: 'Translation 2'
  }
}
```

### Step 2: Add to Chinese locale
Edit `src/i18n/locales/zh-CN.ts`:

```typescript
export default {
  // Add to existing section or create new section
  common: {
    // ... existing keys
    newKey: '新的中文翻译'
  },
  newSection: {
    key1: '翻译 1',
    key2: '翻译 2'
  }
}
```

## Best Practices

1. **Use dot notation** for nested translations: `section.key`
2. **Keep keys consistent** across languages
3. **Use interpolation** for dynamic values: `{{ $t('key', { count: n }) }}`
4. **Test both languages** when adding new translations
5. **Keep translations concise** - UI space is limited
6. **Use proper terminology** - e.g., "Image" not "Picture"
7. **Maintain consistency** - Use same terms across the app
8. **Handle missing translations** - Use fallback gracefully

## Migration Checklist

To migrate an existing component to use i18n:

1. [ ] Identify all hardcoded text in template
2. [ ] Add translation keys to both locale files
3. [ ] Replace hardcoded text with `$t('key')` in template
4. [ ] Replace hardcoded text with `t('key')` in script
5. [ ] Test in both languages
6. [ ] Check for text overflow in different languages
7. [ ] Verify all user-facing text is translated

## Testing

### Manual Language Testing
1. Open application
2. Click language switcher in header
3. Select different language
4. Navigate through application
5. Check all text displays correctly

### Automated Testing
```typescript
// Test specific translation
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

console.log(t('common.welcome')) // Should print translation in current locale
```

## Troubleshooting

### Translation Not Showing
- Check if the key exists in both locale files
- Verify key spelling matches in template and locale files
- Check browser console for missing key warnings

### Language Not Persisting
- Ensure `localStorage` is accessible
- Check if `setLanguage()` is called with correct value
- Verify locale value in localStorage after change

## Additional Resources

- [vue-i18n Documentation](https://vue-i18n.intlify.dev/)
- [i18n Best Practices](https://vue-i18n.intlify.dev/guide/advanced/best_practices)
