import fs from 'node:fs/promises';
import path from 'node:path';

const restore = async () => {
  const cwd = process.cwd();
  const snapshotPath = path.join(cwd, 'snapshot.json');
  const restoredRoot = path.join(cwd, 'workspace_restored');

  try {
    // Проверяем, что snapshot.json существует
    await fs.access(snapshotPath);

    // Если workspace_restored уже существует (файл или директория) - выбрасываем ошибку
    try {
      await fs.stat(restoredRoot);
      // Если stat отработал успешно, путь существует - это ошибка по условию
      throw new Error('FS operation failed');
    } catch (error) {
      // Если ошибка не "файл/папка не существует", пробрасываем её дальше
      if (error && error.code !== 'ENOENT') {
        throw error;
      }
    }

    const raw = await fs.readFile(snapshotPath, 'utf8');
    const snapshot = JSON.parse(raw);
    const entries = Array.isArray(snapshot.entries) ? snapshot.entries : [];

    // Сначала создаём все директории
    const dirEntries = entries.filter((entry) => entry.type === 'directory');
    for (const dirEntry of dirEntries) {
      const dirPath = path.join(restoredRoot, dirEntry.path);
      await fs.mkdir(dirPath, { recursive: true });
    }

    // Затем создаём файлы с декодированным содержимым
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
