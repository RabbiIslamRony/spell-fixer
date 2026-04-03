const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT = path.resolve(__dirname);
const DIST = path.join(ROOT, 'dist');
const TARGET_NAME = `${require('./package.json').name}-${require('./package.json').version}.zip`;
const TARGET_ZIP = path.join(DIST, TARGET_NAME);

const files = [
  'manifest.json',
  'dictionary.js',
  'spellchecker.js',
  'content.js',
  'popup.html',
  'popup.js',
  'styles.css',
  'privacy.html',
  'HOW_IT_WORKS.md',
  'ROADMAP.md',
  'README.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'LICENSE',
  'RELEASE.md',
  'GIST_RELEASE.md',
  '.gitignore'
];

const directories = ['icons', 'test'];

function clean() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
    console.log('✔ cleaned dist/');
  }
}

function copyPath(src, dest) {
  if (fs.lstatSync(src).isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      copyPath(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  clean();
  fs.mkdirSync(DIST, { recursive: true });

  for (const file of files) {
    const src = path.join(ROOT, file);
    if (!fs.existsSync(src)) continue;
    copyPath(src, path.join(DIST, file));
  }

  for (const dir of directories) {
    const srcDir = path.join(ROOT, dir);
    if (!fs.existsSync(srcDir)) continue;
    copyPath(srcDir, path.join(DIST, dir));
  }

  console.log('✔ copied files to dist/');

  const output = fs.createWriteStream(TARGET_ZIP);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log(`✔ created ${TARGET_NAME} (${archive.pointer()} bytes)`);
  });

  archive.on('warning', (err) => {
    if (err.code === 'ENOENT') {
      console.warn(err);
    } else {
      throw err;
    }
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(DIST, false);
  await archive.finalize();
}

if (process.argv.includes('--clean')) {
  clean();
  process.exit(0);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
