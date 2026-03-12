import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Worker } from 'node:worker_threads';

// Делим исходный массив на n чанков, распределяя элементы "по кругу",
// чтобы нагрузка между воркерами была более-менее равномерной
const splitIntoChunks = (arr, n) => {
  const chunks = Array.from({ length: n }, () => []);
  for (let i = 0; i < arr.length; i += 1) {
    chunks[i % n].push(arr[i]);
  }
  return chunks;
};

// Сливает несколько отсортированных массивов в один (k-way merge).
// Простая версия без кучи: на каждом шаге берём минимальный из "текущих"
// элементов каждого чанка.
const kWayMerge = (sortedChunks) => {
  const pointers = sortedChunks.map(() => 0);

  const result = [];

  while (true) {
    let minValue = null;
    let minChunkIndex = -1;

    for (let i = 0; i < sortedChunks.length; i += 1) {
      const pointer = pointers[i];
      if (pointer >= sortedChunks[i].length) {
        continue;
      }

      const value = sortedChunks[i][pointer];
      if (minChunkIndex === -1 || value < minValue) {
        minValue = value;
        minChunkIndex = i;
      }
    }

    if (minChunkIndex === -1) {
      break;
    }

    result.push(minValue);
    pointers[minChunkIndex] += 1;
  }

  return result;
};

// Запускает одного worker’а для заданного чанка и
// возвращает промис с результатом и индексом воркера
const runWorker = (chunk, workerIndex) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), {
      type: 'module',
    });

    worker.once('message', (sortedChunk) => {
      resolve({ workerIndex, sortedChunk });
      worker.terminate().catch(() => {});
    });
    worker.once('error', reject);
    worker.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    worker.postMessage(chunk);
  });

const main = async () => {
  // 1. Читаем массив чисел из data.json
  const dataPath = path.join(process.cwd(), 'data.json');
  const raw = await fs.readFile(dataPath, 'utf8');
  const numbers = JSON.parse(raw);

  // 2. Определяем количество логических ядер и делим данные на чанки
  const cpuCount = Math.max(1, os.cpus().length);
  const chunks = splitIntoChunks(numbers, cpuCount);

  // 3. Создаём воркеры в фиксированном порядке и собираем результаты по индексам
  const results = await Promise.all(
    chunks.map((chunk, idx) => runWorker(chunk, idx)),
  );

  // 4. Восстанавливаем порядок чанков в соответствии с индексом воркера
  const sortedChunks = Array.from({ length: cpuCount }, () => []);
  for (const { workerIndex, sortedChunk } of results) {
    sortedChunks[workerIndex] = sortedChunk;
  }

  // 5. Выполняем k-way merge поверх всех отсортированных чанков
  const merged = kWayMerge(sortedChunks);

  // 6. Выводим финальный отсортированный массив
  console.log(merged);
};

await main();
