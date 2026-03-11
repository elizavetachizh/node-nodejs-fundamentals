import fs from 'node:fs/promises';
import path from 'node:path';

const findByExt = async () => {
  const workspacePath = path.join(process.cwd(), 'workspace');

  // Разбираем аргументы CLI: --ext <extension>
  const args = process.argv.slice(2);
  const extFlagIndex = args.indexOf('--ext');
  let ext = '.txt';

  if (extFlagIndex !== -1 && args[extFlagIndex + 1]) {
    const rawExt = args[extFlagIndex + 1];
    ext = rawExt.startsWith('.') ? rawExt : `.${rawExt}`;
  }

  try {
    // Проверяем, что workspace существует и это директория
    const stats = await fs.stat(workspacePath);
    if (!stats.isDirectory()) {
      throw new Error('FS operation failed');
    }

    // Сюда собираем все найденные файлы с нужным расширением
    const results = [];

    // Рекурсивный обход директории workspace
    const walk = async (dir) => {
      const dirEntries = await fs.readdir(dir, { withFileTypes: true });

      for (const dirent of dirEntries) {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path
          .relative(workspacePath, fullPath)
          .replace(/\\/g, '/');

        if (dirent.isDirectory()) {
          // Если это директория — спускаемся глубже
          await walk(fullPath);
        } else if (dirent.isFile()) {
          // Если это файл и расширение совпадает — добавляем в результаты
          if (path.extname(dirent.name) === ext) {
            results.push(relativePath);
          }
        }
      }
    };

    await walk(workspacePath);

    // Сортируем пути по алфавиту и выводим по одному в строке
    results.sort((a, b) => a.localeCompare(b));
    for (const filePath of results) {
      console.log(filePath);
    }
  } catch {
    throw new Error('FS operation failed');
  }
};

await findByExt();
