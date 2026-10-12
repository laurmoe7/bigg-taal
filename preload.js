const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vt', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (s) => ipcRenderer.invoke('data:save', s),
  where: () => ipcRenderer.invoke('data:where'),
  reveal: () => ipcRenderer.invoke('data:reveal'),
  testNotify: () => ipcRenderer.invoke('notify:test'),
  launchAtLogin: (on) => ipcRenderer.invoke('app:login', on),
  exportFile: (text, name) => ipcRenderer.invoke('file:export', text, name),
  importFile: () => ipcRenderer.invoke('file:import'),
  ttsVoices: () => ipcRenderer.invoke('tts:voices'),
  tts: (text, voice, ls) => ipcRenderer.invoke('tts:speak', text, voice, ls),
  version: () => ipcRenderer.invoke('app:version'),
  updateState: () => ipcRenderer.invoke('update:state'),
  checkUpdate: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdate: (cb) => ipcRenderer.on('update:state', (_e, s) => cb(s)),
  printSheet: (html) => ipcRenderer.invoke('print:sheet', html),
});
