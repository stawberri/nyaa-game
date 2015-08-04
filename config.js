/*
** Main configuration file, since manifest.json doesn't like extra keys
*/

pudding.config = {
  version: new pudding.Version(chrome.runtime.getManifest().version),
  debug: true,
  saveName: 'data',
  defaultSettings: {

  }
}
