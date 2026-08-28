const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi', 'anydpi-v26'];

function copyLauncherIcons(projectRoot) {
  const srcRoot = path.join(projectRoot, 'assets', 'launcher');
  const destRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(srcRoot) || !fs.existsSync(destRoot)) return false;
  let copied = 0;
  for (const density of DENSITIES) {
    const fromDir = path.join(srcRoot, `mipmap-${density}`);
    const toDir = path.join(destRoot, `mipmap-${density}`);
    if (!fs.existsSync(fromDir) || !fs.existsSync(toDir)) continue;
    for (const name of fs.readdirSync(fromDir)) {
      fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name));
      copied += 1;
    }
  }
  return copied > 0;
}

function withAndroidLauncherIcon(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      copyLauncherIcons(cfg.modRequest.projectRoot);
      return cfg;
    },
  ]);
}

module.exports = withAndroidLauncherIcon;
module.exports.copyLauncherIcons = copyLauncherIcons;
