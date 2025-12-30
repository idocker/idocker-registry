# Namespace Management Feature

This document describes the implementation of namespace management functionality in the IDocker Registry system.

## Overview

The namespace management feature allows administrators to organize Docker projects under different organizational namespaces. This provides better organization and separation of resources for different teams or departments within an organization.

## Architecture

### Backend Components

1. **NamespaceModel** (`models/NamespaceModel.js`)
   - Data model for namespace operations
   - CRUD operations for namespaces
   - Relationship with projects model

2. **Namespace Routes** (`routes/namespaces.js`)
   - RESTful API endpoints for namespace management
   - Permission checks for admin-only operations
   - Validation and error handling

3. **Database Schema** (`migrations/002_create_namespaces_table.sql`)
   - namespaces table with required fields
   - Foreign key relationship with projects table
   - Indexes for performance optimization

### Frontend Components

1. **NamespaceService** (`services/namespaceService.js`)
   - API service for namespace operations
   - Abstraction layer for backend communication

2. **NamespacesView** (`views/admin/NamespacesView.vue`)
   - Admin interface for namespace management
   - List view with search and pagination
   - Create/Edit/Delete modals
   - Status management

3. **Navigation Integration** (`components/admin/NavigationSidebar.vue`)
   - Added namespace management link to admin navigation
   - Proper routing and highlighting

## Data Model

### Namespace Table Structure

```sql
CREATE TABLE namespaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Relationship with Projects

The projects table has been extended with a `namespace_id` field to establish the relationship:

```sql
ALTER TABLE projects ADD COLUMN namespace_id INTEGER DEFAULT 1;
CREATE INDEX idx_projects_namespace_id ON projects(namespace_id);
```

## API Endpoints

The following RESTful API endpoints are available for namespace management:

### Get Namespaces
```
GET /api/namespaces
```
- Supports pagination with `page` and `limit` parameters
- Supports search with `search` parameter
- Filter by active status with `isActive` parameter

### Get Namespace by ID
```
GET /api/namespaces/:id
```
- Returns detailed namespace information
- Includes project count and creator information

### Create Namespace
```
POST /api/namespaces
```
- Admin-only endpoint
- Requires name and optional description
- Validates name uniqueness

### Update Namespace
```
PUT /api/namespaces/:id
```
- Admin-only endpoint
- Can update name, description, and active status
- Validates name uniqueness

### Delete Namespace
```
DELETE /api/namespaces/:id
```
- Admin-only endpoint
- Soft delete (sets is_active to false)
- Prevents deletion if active projects exist

### Reactivate Namespace
```
POST /api/namespaces/:id/reactivate
```
- Admin-only endpoint
- Sets is_active to true
- Allows re-enabling previously deleted namespaces

## User Interface

### Namespace List View

The admin interface provides:

1. **Search Functionality**
   - Real-time search by namespace name and description
   - Filtered results display

2. **Create/Edit Operations**
   - Modal-based forms for creating and editing namespaces
   - Form validation and error display
   - Active status toggle for updates

3. **Delete/Reactivate Operations**
   - Confirmation dialogs for delete operations
   - Protection against deletion with active projects
   - Reactivate option for disabled namespaces

4. **Status Management**
   - Visual indicators for active/inactive status
   - Separate reactivation flow for inactive namespaces

5. **Pagination**
   - Server-side pagination for large datasets
   - Navigation controls for page browsing

## Security Considerations

1. **Access Control**
   - All namespace operations require admin role
   - Authentication middleware enforced on all endpoints

2. **Data Validation**
   - Required field validation
   - Unique name constraint enforcement
   - Safe SQL with parameterized queries

3. **Operation Logging**
   - All namespace operations logged through audit system
   - User attribution for all changes

## Docker Registry Integration

Namespaces are integrated with Docker Registry operations through:

1. **Repository Name Format**
   - Repositories follow pattern: `namespace/project-name/repo-name`
   - Namespace extraction for permission checks

2. **Permission Scope**
   - Namespaces provide an additional organizational layer
   - Project permissions still enforced within namespaces

## Database Migration

The migration system includes:

1. **Schema Creation** (`002_create_namespaces_table.sql`)
   - Creates namespaces table
   - Adds namespace_id to projects table
   - Creates necessary indexes

2. **Default Initialization** (`003_initialize_default_namespace.sql`)
   - Creates a default namespace if none exist
   - Assigns orphaned projects to default namespace

## Internationalization

Namespace management includes full i18n support:

1. **Chinese (zh-CN)**
   - Complete translation set for all UI elements
   - Error messages and notifications

2. **English (en-US)**
   - Complete translation set for all UI elements
   - Consistent terminology with technical documentation

## Usage Example

### Creating a Namespace

1. Navigate to Admin → Namespace Management
2. Click "Create Namespace" button
3. Enter namespace name and optional description
4. Click "Create" to save

### Assigning Projects to Namespace

1. Navigate to Admin → Project Management
2. Create or edit a project
3. Select namespace from dropdown
4. Save project changes

### Docker Repository Naming

After creating namespaces, repositories should be named following the pattern:
```
namespace-name/project-name/repository-name
```

Example:
```
engineering/backend/api-service
marketing/web/frontend-ui
```

## Troubleshooting

### Common Issues

1. **Cannot Delete Namespace**
   - Ensure all projects are deleted or moved first
   - Check project list to verify no active projects remain

2. **Namespace Not Found**
   - Verify namespace ID in URL
   - Check if namespace has been deleted

3. **Name Already Exists**
   - Choose a unique namespace name
   - Check for similar names with different casing

## Future Enhancements

Potential future improvements:

1. **Namespace-Level Permissions**
   - Different permission levels for different namespaces
   - Role-based access within namespaces

2. **Namespace Quotas**
   - Resource limits per namespace
   - Storage and transfer restrictions

3. **Namespace Templates**
   - Predefined configurations for common use cases
   - Quick setup with standard permissions

4. **Advanced Filtering**
   - Filter by creation date, creator
   - Combination filters for complex queries