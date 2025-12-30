/**
 * Environment configuration for iDocker Registry

 * Load environment variables from .env file and if not found, use default value
 */
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * PORT
 * default value is 7518
 * change it based on your needs in production environment
 */
export const PORT = process.env.PORT || 7518;

/**
 * LOG_LEVEL
 * default value is info
 * change it based on your needs in production environment
 */
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

/**
 * LOG_DIR
 * default value is /app/logs
 * no need to change in production environment
 */
export const LOG_DIR = process.env.LOG_DIR || '/app/logs';

/**
 * DB_PATH
 * default value is /app/data/registry.db
 * no need to change in production environment
 */
export const DB_PATH = process.env.DB_PATH || '/app/data/registry.db';

/**
 * iDocker Registry url
 * default value is http://localhost:7518
 * the value is used to generate the docker respository(image) url(pull, push) in the iDocker Registry UI
 * so you must set the value to your real address(url) in the production environment
 */
export const IDOCKER_REGISTRY_URL = process.env.IDOCKER_REGISTRY_URL || 'http://localhost:7518';

/**
 * docker registry's url
 * default value is the embedded registry in the iDocker Registry
 * if you want to use your own registry, please set the value to your registry url
 */
export const DOCKER_REGISTRY_URL = process.env.DOCKER_REGISTRY_URL || 'http://localhost:7519';


/**
 * docker registry's timeout
 * default value is 30000
 * change it based on your needs in production environment
 */
export const DOCKER_REGISTRY_TIMEOUT = process.env.DOCKER_REGISTRY_TIMEOUT || 30000;

/**
 * docker registry's username and password
 * default value is null
 * if you want to use your own registry, please set the value to your registry username and password
 */
export const DOCKER_REGISTRY_USERNAME = process.env.DOCKER_REGISTRY_USERNAME || null;
export const DOCKER_REGISTRY_PASSWORD = process.env.DOCKER_REGISTRY_PASSWORD || null;

/**
 * JWT_SECRET
 * default value is your_jwt_secret_key_here_change_in_production
 * change it to a strong secret key in production environment
 */
export const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production';

/**

 * JWT_EXPIRES_IN
 * default value is 24h
 * change it based on your needs in production environment
 */
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * DEFAULT_ADMIN_PASSWORD
 * default value is admin123
 * change it to a strong password in production environment
 */
export const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

/**
 * ALLOW_USER_REGISTRATION
 * default value is false
 * Not supported in current version. Just for future use.
 */
export const ALLOW_USER_REGISTRATION = process.env.ALLOW_USER_REGISTRATION || false;

