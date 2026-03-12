import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import path from 'node:path';
import { createBrotliDecompress } from 'node:zlib';

const decompressDir = async () => {
  const cwd = process.cwd();
  const workspacePath = path.join(cwd, 'workspace');
  const compressedDir = path.join(workspacePath, 'compressed');
  const archivePath = path.join(compressedDir, 'archive.br');
  const destRoot = path.join(workspacePath, 'decompressed');

  try {
    // Проверяем, что workspace/compressed/archive.br существует
    const dirStat = await fs.stat(compressedDir);
    if (!dirStat.isDirectory()) {
      throw new Error('FS operation failed');
    }

    const fileStat = await fs.stat(archivePath);
    if (!fileStat.isFile()) {
      throw new Error('FS operation failed');
    }

    await fs.mkdir(destRoot, { recursive: true });

    const sourceStream = createReadStream(archivePath);
    const brotli = createBrotliDecompress();
    sourceStream.pipe(brotli);

    // Состояние парсера потока
    let buffer = Buffer.alloc(0);
    let mode = 'header'; // 'header' | 'file'
    let pendingFile = null; // { remaining, stream }

    const closePendingFileStream = async () => {
      if (!pendingFile?.stream) return;
      await new Promise((resolve) => {
        pendingFile.stream.end(() => resolve());
      });
    };

    const processBuffer = async () => {
      // Обрабатываем buffer, пока можем
      while (true) {
        if (mode === 'header') {
          const newlineIndex = buffer.indexOf(0x0a); // '\n'
          if (newlineIndex === -1) break;

          const lineBuf = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const line = lineBuf.toString('utf8').replace(/\r$/, '');

          if (!line) continue;

          const [type, ...rest] = line.split(' ');

          if (type === 'DIR') {
            const relativePath = rest.join(' ');
            if (relativePath) {
              await fs.mkdir(path.join(destRoot, relativePath), { recursive: true });
            }
          } else if (type === 'FILE') {
            const relativePath = rest.slice(0, -1).join(' ');
            const sizeStr = rest[rest.length - 1];
            const size = Number(sizeStr);

            if (!relativePath || !Number.isFinite(size) || size < 0) {
              throw new Error('FS operation failed');
            }

            const filePath = path.join(destRoot, relativePath);
            await fs.mkdir(path.dirname(filePath), { recursive: true });

            pendingFile = {
              remaining: size,
              stream: createWriteStream(filePath),
            };
            mode = 'file';
          } else {
            throw new Error('FS operation failed');
          }
        } else if (mode === 'file' && pendingFile) {
          if (buffer.length === 0) break;

          const toWrite = Math.min(pendingFile.remaining, buffer.length);
          const chunk = buffer.subarray(0, toWrite);
          buffer = buffer.subarray(toWrite);

          if (toWrite > 0) {
            await new Promise((resolve, reject) => {
              const ok = pendingFile.stream.write(chunk, (err) => {
                if (err) reject(err);
                else resolve();
              });
              if (!ok) {
                pendingFile.stream.once('drain', resolve);
              }
            });
            pendingFile.remaining -= toWrite;
          }

          if (pendingFile.remaining === 0) {
            await new Promise((resolve, reject) => {
              pendingFile.stream.end((err) => (err ? reject(err) : resolve()));
            });
            pendingFile = null;
            mode = 'header';
          }
        } else {
          break;
        }
      }
    };

    // Важно: читаем чанки ПОСЛЕДОВАТЕЛЬНО (без гонок)
    for await (const chunk of brotli) {
      buffer = Buffer.concat([buffer, chunk]);
      await processBuffer();
    }

    // После конца потока дочитываем то, что осталось
    await processBuffer();

    // Если остались недописанные байты файла — это ошибка формата архива
    if (mode === 'file' && pendingFile && pendingFile.remaining !== 0) {
      await closePendingFileStream();
      throw new Error('FS operation failed');
    }
  } catch {
    throw new Error('FS operation failed');
  }
};

await decompressDir();
