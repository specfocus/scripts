const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const async = require('async');

const [packageName, releaseRoot] = process.argv.splice(2);
const workspaceDir = path.join(__dirname, '..');
const sourceDir = path.join(workspaceDir, 'packages', packageName);
const releaseDir = path.join(workspaceDir, releaseRoot, packageName);

console.log({ workspaceDir, sourceDir, releaseDir });

const cleanRelease = () => new Promise((resolve, reject) => {
  fs.readdir(releaseDir, (err, files) => {
    //handling error
    if (err) {
      console.log('Unable to scan ' + releaseDir + '. Error: ' + err);
      reject(err);
      return;
    }
    //listing all files using forEach
    files.forEach(function (entry) {
      if (['.git', 'LICENSE', 'README.md'].indexOf(entry) !== -1) {
        return;
      }
      const file = path.join(releaseDir, entry);
      const stats = fs.statSync(file);
      if (stats.isFile(file)) {
        fs.unlinkSync(file);
        console.log('deleted ' + entry);
      } else {
        fs.rmdirSync(file, { recursive: true });
        console.log('removed ' + entry);
      }
    });
    console.log(releaseDir + ' cleaned.');
    resolve();
  });
});

const copyPackageJson = () => new Promise((resolve, reject) => {
  const sourceFile = path.join(sourceDir, 'package.json');
  const releaseFile = path.join(releaseDir, 'package.json');
  console.log({ sourceFile, releaseFile });

  const source = JSON.parse(fs.readFileSync(sourceFile, { flags: 'r' }));
  const release = {
    ...source,
    repository: {
      ...source.repository
    },
    main: 'index.js',
    types: 'index.d.ts'
  };

  delete release.private;
  delete release.devDependencies;
  delete release.scripts;
  delete release.eslintConfig;
  delete release.browserslist;

  let releaseJSON = JSON.stringify(release, null, 2);

  function replaceAll(str, find, replace) {
    var escapedFind = find.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    return str.replace(new RegExp(escapedFind, 'g'), replace);
  }

  releaseJSON = replaceAll(
    releaseJSON,
    'https://github.com/specfocus/release.git', // + packageName
    'https://github.com/specfocus/release.git'
  );

  fs.writeFileSync(
    releaseFile,
    releaseJSON,
    { flag: 'w' }
  );

  const [major, minor, patch] = source.version.split('.').map(s => Number(s));
  source.version = `${major}.${minor}.${patch + 1}`;

  const sourceJSON = JSON.stringify(source, null, 2);

  fs.writeFileSync(
    sourceFile,
    sourceJSON
  );
  console.log('package.json copied');
  resolve();
});

const build = () => exec('tsc --outDir ' + releaseDir, { cwd: sourceDir });
const publish = () => exec('npm-publish --access public', { cwd: releaseDir });

async.series([
  async () => { await cleanRelease().then(build).then(copyPackageJson).then(publish); }
]);