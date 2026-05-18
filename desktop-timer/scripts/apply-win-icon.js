const { execFile } = require('child_process');
const path = require('path');

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { env, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.message += `\n${stderr || stdout}`;
        reject(error);
        return;
      }
      resolve();
    });
  });
}

exports.default = async function applyWinIcon(context) {
  if (context.electronPlatformName !== 'win32') return;

  const rcedit = path.join(context.packager.projectDir, 'scripts', 'bin', 'rcedit-x64.exe');
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'assets', 'icon.ico');

  await run(rcedit, [exePath, '--set-icon', iconPath]);
};
