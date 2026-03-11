import fs from 'node:fs/promises';
import path from 'node:path';

const snapshot = async () => {
  const workspacePath = path.join(process.cwd(), 'workspace');

  try {
    const stats = await fs.stat(workspacePath);

    if (!stats.isDirectory()) {
      throw new Error('FS operation failed');
    }

    const entries = [];

    const walk = async (dir) => {
      const dirEntries = await fs.readdir(dir, { withFileTypes: true });

      for (const dirent of dirEntries) {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path
          .relative(workspacePath, fullPath)
          .replace(/\\/g, '/');

        if (dirent.isDirectory()) {
          entries.push({
            path: relativePath,
            type: 'directory',
          });

          await walk(fullPath);
        } else if (dirent.isFile()) {
          const fileStats = await fs.stat(fullPath);
          const content = await fs.readFile(fullPath, { encoding: 'base64' });

          entries.push({
            path: relativePath,
            type: 'file',
            size: fileStats.size,
            content,
          });
        }
      }
    };

    await walk(workspacePath);

    const snapshotData = {
      rootPath: workspacePath,
      entries,
    };

    const snapshotPath = path.join(process.cwd(), 'snapshot.json');
    await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2));
  } catch {
    throw new Error('FS operation failed');
  }
};

await snapshot();
