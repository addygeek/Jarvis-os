/// <reference types="vite/client" />

interface JarvisElectronAPI {
  platform: string;
  apiBaseUrl: string;
  openDoc: (filename: string) => Promise<string | null>;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    jarvis?: JarvisElectronAPI;
  }
}

export {};
