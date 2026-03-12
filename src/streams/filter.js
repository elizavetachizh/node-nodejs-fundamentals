import { Transform, pipeline } from 'node:stream';
import { EOL } from 'node:os';

const filter = () => {
  const args = process.argv.slice(2);

  // Ищем --pattern и берём строку сразу после него
  const patternIndex = args.indexOf('--pattern');
  const pattern = patternIndex !== -1 ? args[patternIndex + 1] ?? '' : '';

  let leftover = '';

  // Transform Stream, который принимает данные чанками,
  // разбивает их на строки и пропускает только те, что содержат pattern
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      // Пришедший чанк может начинаться с середины строки,
      // поэтому добавляем к нему остаток с прошлого раза
      const data = leftover + chunk.toString();

      // Делим на строки по \n или \r\n
      const lines = data.split(/\r?\n/);

      // Последний элемент может быть "обрывком строки" без \n,
      // поэтому сохраняем его в leftover на следующий чанк
      leftover = lines.pop() ?? '';

      // Оставляем только строки, где встречается искомый паттерн
      const matched = lines.filter((line) =>
        pattern === '' ? false : line.includes(pattern),
      );

      // Если нашлись подходящие строки — отправляем их дальше,
      // соединяя системным переводом строки
      if (matched.length > 0) {
        this.push(matched.join(EOL) + EOL);
      }

      // Сообщаем, что обработка чанка закончена
      callback();
    },
    flush(callback) {
      // Когда поток закончился, но в leftover осталась строка без \n,
      // тоже проверяем её на соответствие паттерну
      if (leftover && pattern && leftover.includes(pattern)) {
        this.push(`${leftover}${EOL}`);
      }
      callback();
    },
  });

  // Соединяем stdin -> transform -> stdout через pipeline
  // и обрабатываем возможные ошибки
  pipeline(process.stdin, transform, process.stdout, (err) => {
    if (err) {
      process.stderr.write(`Error: ${err.message}${EOL}`);
      process.exitCode = 1;
    }
  });
};

filter();
