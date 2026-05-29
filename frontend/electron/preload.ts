import { contextBridge, ipcRenderer } from "electron";
import { resolveApiBase } from "./load-env.js";

export interface JarvisElectronAPI {
  platform: NodeJS.Platform;
  apiBaseUrl: string;
  openDoc: (filename: string) => Promise<string | null>;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

const apiBaseUrl = resolveApiBase();

const api: JarvisElectronAPI = {
  platform: process.platform,
  apiBaseUrl,
  openDoc: (filename) => ipcRenderer.invoke("jarvis:open-doc", filename),
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
};

contextBridge.exposeInMainWorld("jarvis", api);
