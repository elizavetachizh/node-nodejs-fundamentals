import fs from 'node:fs/promises';
import path from 'node:path';

const merge = async () => {
  const cwd = process.cwd();
  const workspacePath = path.join(cwd, 'workspace');
  const partsPath = path.join(workspacePath, 'parts');
  const outputFile = path.join(workspacePath, 'merged.txt');

  // Parse CLI argument: --files filename1,filename2,...
  const args = process.argv.slice(2);
  const filesFlagIndex = args.indexOf('--files');
  let filesFromCli = null;

  if (filesFlagIndex !== -1) {
    const value = args[filesFlagIndex + 1];
    if (!value) {
      throw new Error('FS operation failed');
    }

    filesFromCli = value
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    if (filesFromCli.length === 0) {
      throw new Error('FS operation failed');
    }
  }

  try {
    const partsStats = await fs.stat(partsPath);
    if (!partsStats.isDirectory()) {
      throw new Error('FS operation failed');
    }

    let filesToMerge = [];

    if (filesFromCli) {
      // Use only files listed in --files, in given order
      filesToMerge = filesFromCli.map((name) => ({
        name,
        fullPath: path.join(partsPath, name),
      }));

      // Ensure all requested files exist and are files
      for (const file of filesToMerge) {
        const stat = await fs.stat(file.fullPath).catch(() => null);
        if (!stat || !stat.isFile()) {
          throw new Error('FS operation failed');
        }
      }
    } else {
      // Default: all .txt files from workspace/parts in alphabetical order
      const dirEntries = await fs.readdir(partsPath, { withFileTypes: true });
      const txtFiles = dirEntries
        .filter((dirent) => dirent.isFile() && path.extname(dirent.name) === '.txt')
        .map((dirent) => dirent.name)
        .sort((a, b) => a.localeCompare(b));

      if (txtFiles.length === 0) {
        throw new Error('FS operation failed');
      }

      filesToMerge = txtFiles.map((name) => ({
        name,
        fullPath: path.join(partsPath, name),
      }));
    }

    let mergedContent = '';

    for (const file of filesToMerge) {
      const content = await fs.readFile(file.fullPath, 'utf8');
      mergedContent += content;
    }

    // Ensure workspace directory exists before writing
    await fs.mkdir(workspacePath, { recursive: true });
    await fs.writeFile(outputFile, mergedContent, 'utf8');
  } catch {
    throw new Error('FS operation failed');
  }
};

await merge();
