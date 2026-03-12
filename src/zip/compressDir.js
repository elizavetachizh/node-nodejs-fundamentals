import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { createBrotliCompress } from 'node:zlib';

const compressDir = async () => {
  const cwd = process.cwd();
  const workspacePath = path.join(cwd, 'workspace');
  const srcRoot = path.join(workspacePath, 'toCompress');
  const destDir = path.join(workspacePath, 'compressed');
  const archivePath = path.join(destDir, 'archive.br');

  try {
    const stat = await fs.stat(srcRoot);
    if (!stat.isDirectory()) {
      throw new Error('FS operation failed');
    }
  } catch {
    // Если директория toCompress не существует или недоступна
    throw new Error('FS operation failed');
  }

  await fs.mkdir(destDir, { recursive: true });

  // Поток сжатия Brotli, в который будем писать структуру архива
  const brotli = createBrotliCompress();
  const outStream = createWriteStream(archivePath);

  brotli.pipe(outStream);

  const write = (data) =>
    new Promise((resolve, reject) => {
      if (!brotli.write(data)) {
        brotli.once('drain', resolve);
      } else {
        resolve();
      }
      brotli.once('error', reject);
    });

  const writeFileToArchive = async (fullPath, relativePath) => {
    const fileStat = await fs.stat(fullPath);

    // Заголовок файла: FILE <relativePath> <size>\n
    const header = `FILE ${relativePath} ${fileStat.size}\n`;
    await write(Buffer.from(header, 'utf8'));

    // Содержимое файла пишем потоком напрямую в Brotli
    await new Promise((resolve, reject) => {
      const rs = createReadStream(fullPath);

      rs.on('error', reject);
      brotli.once('error', reject);

      rs.on('end', resolve);
      rs.pipe(brotli, { end: false });
    });
  };

  const writeDirToArchive = async (relativePath) => {
    // Заголовок директории: DIR <relativePath>\n
    const header = `DIR ${relativePath}\n`;
    await write(Buffer.from(header, 'utf8'));
  };

  const walk = async (dir) => {
    const dirEntries = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of dirEntries) {
      const fullPath = path.join(dir, dirent.name);
      const relativePath = path
        .relative(srcRoot, fullPath)
        .replace(/\\/g, '/');

      if (dirent.isDirectory()) {
        await writeDirToArchive(relativePath);
        await walk(fullPath);
      } else if (dirent.isFile()) {
        await writeFileToArchive(fullPath, relativePath);
      }
    }
  };

  try {
    await walk(srcRoot);
  } finally {
    // Завершаем поток сжатия и дожидаемся закрытия файла
    await new Promise((resolve, reject) => {
      brotli.end();
      outStream.on('finish', resolve);
      outStream.on('error', reject);
      brotli.on('error', reject);
    });
  }
};

await compressDir();
