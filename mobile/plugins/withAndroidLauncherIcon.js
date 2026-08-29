const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi', 'anydpi-v26'];
const WEBP_NAMES = ['ic_launcher.webp', 'ic_launcher_round.webp', 'ic_launcher_foreground.webp'];

function copyLauncherIcons(projectRoot) {
  const srcRoot = path.join(projectRoot, 'assets', 'launcher');
  const destRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  if (!fs.existsSync(srcRoot)) return 0;
  let copied = 0;
  for (const density of DENSITIES) {
    const fromDir = path.join(srcRoot, `mipmap-${density}`);
    if (!fs.existsSync(fromDir)) continue;
    const toDir = path.join(destRoot, `mipmap-${density}`);
    fs.mkdirSync(toDir, { recursive: true });
    for (const name of WEBP_NAMES) {
      const stale = path.join(toDir, name);
      if (fs.existsSync(stale)) fs.unlinkSync(stale);
    }
    for (const name of fs.readdirSync(fromDir)) {
      fs.copyFileSync(path.join(fromDir, name), path.join(toDir, name));
      copied += 1;
    }
  }
  return copied;
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
