# Docker Registry Authorization Implementation

This document describes the implementation of Docker Registry authorization and permission control in the IDocker Registry system.

## Overview

The implementation provides fine-grained access control for Docker Registry operations (push/pull/delete) by integrating with the existing project and repository permission system. It ensures that only authorized users can perform Docker operations on specific repositories.

## Architecture

### Components

1. **DockerAuthzService** (`services/dockerAuthzService.js`)
   - Core authorization service that checks permissions for Docker operations
   - Integrates with project and repository models
   - Validates user permissions based on project membership and roles

2. **DockerLogService** (`services/dockerLogService.js`)
   - Logs all Docker operations for audit and monitoring
   - Tracks user actions, repositories, and operation results
   - Provides statistics and search functionality

3. **Docker Registry Routes** (`routes/dockerRegistry.js`)
   - Handles Docker Registry API v2 endpoints
   - Implements authentication middleware
   - Validates permissions before proxying requests

4. **Proxy Middleware** (`index.js`)
   - Forwards authorized requests to the internal Docker Registry
   - Logs operation results
   - Handles errors appropriately

### Database Schema

A new table `docker_operation_logs` has been added to track Docker operations:

```sql
CREATE TABLE IF NOT EXISTS docker_operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  repository VARCHAR(255),
  tag VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  additional_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Permission Model

### Repository Name Format

Docker repository names follow this format:
- `project-name/repo-name` (first segment = project name)
- **single-segment name** (`nginx`) — belongs to the built-in **default** project (under the default namespace), used for shared base images; its pull/push path omits the project layer, e.g. `docker pull idocker.vip/nginx:latest`

The namespace is an organizational grouping (team/environment) only; it is not part of the image repository path.

### User Roles and Permissions

Repository membership roles (stored in `repository_members`):
- **admin** (system): Full access to all projects and repositories
- **project_manager**: pull / push / delete + member management on the repository
- **developer**: pull / push / delete
- **operator**: pull only

### Repository Visibility

- The v2 endpoint always requires authentication (anonymous → 401 challenge; even `/v2/` pings are challenged).
- **Public** or images in the built-in **default** project: any logged-in user can pull; the default project is also visible in every user's web image list.
- **Private**: only repository members can pull/push/delete based on their role.
- Pushing into the **default** project is restricted to admin / explicitly granted members (non-members get 403).

## Docker Operations

### Supported Actions

1. **pull**: Download/pull images from repositories
   - All project members can pull from private repositories
   - Anyone can pull from public repositories

2. **push**: Upload/push images to repositories
   - Only owners and maintainers can push
   - Creates new repositories if they don't exist

3. **delete**: Remove images from repositories
   - Only owners can delete

### Automatic Repository Creation

When a user pushes to a non-existent repository (with appropriate permissions), the system automatically creates the repository record in the database.

## Authentication Methods

The system supports two authentication methods for Docker Registry operations:

1. **Basic Authentication**: Username and password
   - Validated against the user database
   - Credentials are checked on each request

2. **Token Authentication**: Bearer tokens
   - Generated via the `/v2/token` endpoint
   - Tokens contain user information and permission scopes
   - Tokens are valid for 1 hour by default

## Implementation Details

### Permission Check Flow

1. Docker client sends request with authentication
2. Authentication middleware validates user credentials
3. Permission middleware checks if user can perform the action on the repository
4. If authorized, request is forwarded to the internal Docker Registry
5. Operation result is logged for audit

### Token Service

The `/v2/token` endpoint generates access tokens for Docker clients:
1. Validates user credentials
2. Parses requested scopes from query parameters
3. Generates JWT token with user information and scopes
4. Returns token with expiration time

### Error Handling

The system provides detailed error messages for:
- Authentication failures (401)
- Authorization failures (403)
- Repository not found (404)
- Internal server errors (500)

## Security Considerations

1. **Password Storage**: User passwords are hashed using bcrypt
2. **Token Security**: JWT tokens are signed with a secret key
3. **Permission Validation**: All operations are validated against the permission system
4. **Audit Logging**: All operations are logged for security and compliance

## Configuration

The following environment variables can be used to configure the system:

- `DOCKER_REGISTRY_URL`: URL of the internal Docker Registry
- `JWT_SECRET`: Secret key for signing JWT tokens
- `JWT_EXPIRES_IN`: Token expiration time
- `NODE_ENV`: Environment (production/development)

## API Examples

### Docker Login

```bash
docker login your-registry.com -u username -p password
```

### Docker Pull

```bash
docker pull your-registry.com/project-name/repo-name:tag
```

### Docker Push

```bash
docker push your-registry.com/project-name/repo-name:tag
```

### Token Request

```bash
curl -u username:password "https://your-registry.com/v2/token?service=your-registry.com&scope=repository:project-name/repo-name:pull"
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check username and password
   - Ensure user account is active
   - Verify credentials are correctly URL-encoded

2. **Permission Denied**
   - Check if user is a member of the project
   - Verify user has the required role
   - Ensure repository name format is correct

3. **Repository Not Found**
   - Verify project name exists
   - Check repository spelling
   - For new repositories, ensure user has push permissions

### Logs

All Docker operations are logged in the `docker_operation_logs` table. Use the `DockerLogService` to query these logs for troubleshooting.

## Future Enhancements

Potential future improvements:
1. Rate limiting per user/project
2. More granular permission controls
3. Webhook notifications for operations
4. Integration with external identity providers
5. Repository-level access control lists