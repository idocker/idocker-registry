/**
 * Unified API Response Utility
 * Provides standard API response format to ensure frontend-backend data consistency
 *
 * @author IDocker Registry Team
 * @version 2.0.0
 */

/**
 * Success response - return data
 * @param {*} data - Data to return
 * @param {string} message - Optional success message
 * @returns {Object} Standard API response
 */
export function success(data = null, message = null) {
  const response = {
    success: true
  };

  if (data !== null && data !== undefined) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Success response - return message only (no data)
 * @param {string} message - Success message
 * @returns {Object} Standard API response
 */
export function successMessage(message) {
  return {
    success: true,
    message: message
  };
}

/**
 * Error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Optional error code
 * @returns {Object} Standard error response
 */
export function error(message, statusCode = 500, errorCode = null) {
  const response = {
    success: false,
    message: message
  };

  if (errorCode) {
    response.error = errorCode;
  }

  return response;
}

/**
 * Paginated success response
 * @param {Array} items - Data array
 * @param {Object} pagination - Pagination information
 * @param {string} message - Optional success message
 * @returns {Object} Standard paginated response
 */
export function paginated(items, pagination, message = null) {
  const response = {
    success: true,
    data: {
      [items.name === 'projects' ? 'projects' : 'images']: items
    }
  };

  // Add pagination information
  response.data.pagination = {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    totalPages: pagination.totalPages,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Validation error response
 * @param {Array} errors - Validation error array
 * @returns {Object} Validation error response
 */
export function validationError(errors) {
  return {
    success: false,
    message: 'Data validation failed',
    errors: errors
  };
}
