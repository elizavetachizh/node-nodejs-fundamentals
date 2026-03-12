import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

const split = async () => {
  const cwd = process.cwd();
  const sourcePath = path.join(cwd, 'source.txt');

  // Разбираем аргумент --lines <number>, по умолчанию 10
  const args = process.argv.slice(2);
  const linesFlagIndex = args.indexOf('--lines');
  let maxLines = 10;

  if (linesFlagIndex !== -1 && args[linesFlagIndex + 1]) {
    const parsed = Number(args[linesFlagIndex + 1]);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxLines = Math.floor(parsed);
    }
  }

  // проверка наличия source.txt
  await fs.access(sourcePath);

  const readStream = createReadStream(sourcePath, { encoding: 'utf8' });

  let leftover = '';
  let currentChunkIndex = 1;
  let currentLineCount = 0;
  let currentWriteStream = null;

  const openNewChunk = () => {
    if (currentWriteStream) {
      currentWriteStream.end();
    }
    const chunkPath = path.join(cwd, `chunk_${currentChunkIndex}.txt`);
    currentWriteStream = createWriteStream(chunkPath, { encoding: 'utf8' });
    currentChunkIndex += 1;
    currentLineCount = 0;
  };

  openNewChunk();

  await new Promise((resolve, reject) => {
    readStream.on('error', (err) => {
      if (currentWriteStream) {
        currentWriteStream.end();
      }
      reject(err);
    });

    readStream.on('data', (chunk) => {
      const data = leftover + chunk;
      const lines = data.split(/\r?\n/);
      leftover = lines.pop() ?? '';

      for (const line of lines) {
        if (currentLineCount >= maxLines) {
          openNewChunk();
        }

        currentWriteStream.write(line + '\n');
        currentLineCount += 1;
      }
    });

    readStream.on('end', () => {
      if (leftover !== '') {
        if (currentLineCount >= maxLines) {
          openNewChunk();
        }
        currentWriteStream.write(leftover + '\n');
      }

      if (currentWriteStream) {
        currentWriteStream.end();
      }

      resolve();
    });
  });
};

await split();
