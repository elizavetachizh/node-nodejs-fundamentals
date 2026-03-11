import fs from 'node:fs/promises';
import path from 'node:path';

const restore = async () => {
  const cwd = process.cwd();
  const snapshotPath = path.join(cwd, 'snapshot.json');
  const restoredRoot = path.join(cwd, 'workspace_restored');

  try {
    // Ensure snapshot.json exists
    await fs.access(snapshotPath);

    // Fail if workspace_restored already exists (file or directory)
    try {
      await fs.stat(restoredRoot);
      // If stat succeeds, path exists -> error as per requirements
      throw new Error('FS operation failed');
    } catch (error) {
      // If error is anything other than "does not exist", rethrow
      if (error && error.code !== 'ENOENT') {
        throw error;
      }
    }

    const raw = await fs.readFile(snapshotPath, 'utf8');
    const snapshot = JSON.parse(raw);
    const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];

    // Create directories first
    const dirEntries = entries.filter((entry) => entry.type === 'directory');
    for (const dirEntry of dirEntries) {
      const dirPath = path.join(restoredRoot, dirEntry.path);
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Then create files with decoded content
    const fileEntries = entries.filter((entry) => entry.type === 'file');
    for (const fileEntry of fileEntries) {
      const filePath = path.join(restoredRoot, fileEntry.path);
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });

      const contentBase64 = fileEntry.content ?? '';
      const buffer = Buffer.from(contentBase64, 'base64');
      await fs.writeFile(filePath, buffer);
    }
  } catch {
    throw new Error('FS operation failed');
  }
};

await restore();
