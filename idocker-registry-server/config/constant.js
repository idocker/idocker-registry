// iDocker Registry Configuration
// PRODUCTION ENVIRONMENT DEFAULT CONFIGURATION
// Setting the environment variables in the .env file in the deployment environment

export const NODE_ENV='production'
export const PORT=7518

/**
 * docker registry url
 * default value is the embedded registry in the iDocker Registry
 * if you want to use your own registry, please set the value to your registry url
 */
export const DOCKER_REGISTRY_URL='http://localhost:7519'

/**
 * iDocker Registry url
 * default value is http://localhost:7518
 * the value is used to generate the docker respository(image) url(pull, push) in the iDocker Registry UI
 * so you must set the value to your real address(url) in the production environment
 */
export const IDOCKER_REGISTRY_URL='https://localhost:7518'


/**
 * DB_PATH
 * default value is /app/data/registry.db
 * no need to change in production environment
 */
export const DB_PATH='/app/data/registry.db'

/**
 * LOG_DIR
 * default value is /app/logs
 * no need to change in production environment
 */
export const LOG_DIR='/app/logs'

/**
 * LOG_LEVEL
 * default value is info
 * change it based on your needs in production environment
 */
export const LOG_LEVEL='info'

/**
 * JWT_SECRET
 * default value is your_jwt_secret_key_here_change_in_production
 * change it to a strong secret key in production environment
 */
export const JWT_SECRET='your_jwt_secret_key_here_change_in_production'
export const JWT_EXPIRES_IN='24h'
export const DEFAULT_ADMIN_PASSWORD='admin123'
export const ALLOW_USER_REGISTRATION='false'