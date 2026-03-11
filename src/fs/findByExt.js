import fs from 'node:fs/promises';
import path from 'node:path';

const findByExt = async () => {
  const workspacePath = path.join(process.cwd(), 'workspace');

  // Parse CLI arguments: --ext <extension>
  const args = process.argv.slice(2);
  const extFlagIndex = args.indexOf('--ext');
  let ext = '.txt';

  if (extFlagIndex !== -1 && args[extFlagIndex + 1]) {
    const rawExt = args[extFlagIndex + 1];
    ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
  }

  try {
    const stats = await fs.stat(workspacePath);
    if (!stats.isDirectory()) {
      throw new Error('FS operation failed');
    }

    const results = [];

    const walk = async (dir) => {
      const dirEntries = await fs.readdir(dir, { withFileTypes: true });

      for (const dirent of dirEntries) {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path
          .relative(workspacePath, fullPath)
          .replace(/\\/g, '/');

        if (dirent.isDirectory()) {
          await walk(fullPath);
        } else if (dirent.isFile()) {
          if (path.extname(dirent.name) === ext) {
            results.push(relativePath);
          }
        }
      }
    };

    await walk(workspacePath);

    results.sort((a, b) => a.localeCompare(b));
    for (const filePath of results) {
      console.log(filePath);
    }
  } catch {
    throw new Error('FS operation failed');
  }
};

await findByExt();
