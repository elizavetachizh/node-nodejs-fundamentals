import { spawn } from 'node:child_process';

const execCommand = () => {
  const command = process.argv[2];

  if (!command) {
    process.exit(1);
  }

  const child = spawn(command, {
    // stdin/stdout/stderr дочернего процесса направляем напрямую в текущий терминал
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  // Завершаем родительский процесс с тем же кодом, что и дочерний
  child.on('close', (code) => {
    process.exit(code ?? 1);
  });
};

execCommand();
