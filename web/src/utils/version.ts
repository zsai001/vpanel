// Build-time version information
// These values are injected by Vite at build time via environment variables

export interface BuildInfo {
  version: string;
  commit: string;
  branch: string;
  buildTime: string;
}

export const BUILD_INFO: BuildInfo = {
  version: import.meta.env.VITE_APP_VERSION || 'dev',
  commit: import.meta.env.VITE_GIT_COMMIT || 'unknown',
  branch: import.meta.env.VITE_GIT_BRANCH || 'unknown',
  buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
};

