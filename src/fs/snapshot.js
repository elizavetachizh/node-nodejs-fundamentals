import fs from 'node:fs/promises';
import path from 'node:path';

// Снимает snapshot директории workspace и сохраняет его в snapshot.json
const snapshot = async () => {
  // Абсолютный путь к директории workspace в корне проекта
  const workspacePath = path.join(process.cwd(), 'workspace');

  try {
    // Проверяем, что workspace существует и это директория
    const stats = await fs.stat(workspacePath);

    if (!stats.isDirectory()) {
      throw new Error('FS operation failed');
    }

    // Плоский список записей о файлах и директориях
    const entries = [];

    // Рекурсивный обход дерева каталогов
    const walk = async (dir) => {
      const dirEntries = await fs.readdir(dir, { withFileTypes: true });

      for (const dirent of dirEntries) {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path
          .relative(workspacePath, fullPath)
          .replace(/\\/g, '/'); // нормализуем разделители для Windows

        if (dirent.isDirectory()) {
          // Добавляем директорию в snapshot и спускаемся внутрь
          entries.push({
            path: relativePath,
            type: 'directory',
          });

          await walk(fullPath);
        } else if (dirent.isFile()) {
          // Для файла добавляем размер и содержимое в base64
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

    // Объект снапшота с корневым путём и всеми записями
    const snapshotData = {
      rootPath: workspacePath,
      entries,
    };

    // Записываем результат в snapshot.json в корне проекта
    const snapshotPath = path.join(process.cwd(), 'snapshot.json');
    await fs.writeFile(snapshotPath, JSON.stringify(snapshotData, null, 2));
  } catch {
    // По условию любая ошибка должна приводить к одному сообщению
    throw new Error('FS operation failed');
  }
};

await snapshot();
