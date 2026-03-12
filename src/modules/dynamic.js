import path from 'node:path';
import { pathToFileURL } from 'node:url';

const dynamic = async () => {
  // Имя плагина ожидается первым аргументом после имени файла:
  // node src/modules/dynamic.js uppercase
  const pluginName = process.argv[2];

  // Если имя не передали, считаем, что плагин не найден
  if (!pluginName) {
    console.log('Plugin not found');
    process.exit(1);
  }

  // путь к файлу плагина: src/modules/plugins/<pluginName>.js
  const pluginPath = path.join(
    process.cwd(),
    'src',
    'modules',
    'plugins',
    `${pluginName}.js`,
  );

  try {
    // Динамически импортируем модуль по пути к файлу
    const pluginModule = await import(pathToFileURL(pluginPath).href);

    // Проверяем, что модуль экспортирует функцию run()
    if (typeof pluginModule.run !== 'function') {
      console.log('Plugin not found');
      process.exit(1);
    }

    // Вызываем run() и печатаем результат
    const result = pluginModule.run();
    console.log(result);
  } catch {
    // Если файл не существует или импорт упал,сообщаем и выходим с кодом 1
    console.log('Plugin not found');
    process.exit(1);
  }
};

await dynamic();
