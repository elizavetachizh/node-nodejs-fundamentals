import { Transform, pipeline } from 'node:stream';
import { EOL } from 'node:os';

const lineNumberer = () => {
  let lineCounter = 1;
  let leftover = '';

  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      const data = leftover + chunk.toString();
      const lines = data.split(/\r?\n/);

      // Последняя часть может быть неполной строкой — сохраняем её
      leftover = lines.pop() ?? '';

      const numbered = lines
        .map((line) => `${lineCounter++} | ${line}`)
        .join(EOL);

      if (numbered.length > 0) {
        this.push(numbered + EOL);
      }

      callback();
    },
    flush(callback) {
      // Обрабатываем последнюю строку, если она не заканчивалась переводом строки
      if (leftover !== '') {
        this.push(`${lineCounter++} | ${leftover}${EOL}`);
      }
      callback();
    },
  });

  pipeline(process.stdin, transform, process.stdout, (err) => {
    if (err) {
      process.stderr.write(`Error: ${err.message}${EOL}`);
      process.exitCode = 1;
    }
  });
};

lineNumberer();
