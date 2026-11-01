/**
 * Fallback module for TypeScript. Metro overrides with:
 * - secureStorage.web.ts on web
 * - secureStorage.native.ts on iOS/Android
 */
export { secureStorage } from './secureStorage.web';
