import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha256File = async (filePath) => {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath);

  // Асинхронный перебор чанков потока
  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
};

const verify = async () => {
  const checksumsPath = path.join(process.cwd(), 'checksums.json');

  try {
    const raw = await fs.readFile(checksumsPath, 'utf8');
    const checksums = JSON.parse(raw);

    const entries = Object.entries(checksums);

    for (const [filename, expectedHash] of entries) {
      const filePath = path.join(process.cwd(), filename);
      const actualHash = await sha256File(filePath);

      const ok =
        typeof expectedHash === 'string' &&
        actualHash.toLowerCase() === expectedHash.toLowerCase();

      console.log(`${filename} — ${ok ? 'OK' : 'FAIL'}`);
    }
  } catch {
    throw new Error('FS operation failed');
  }
};

await verify();
