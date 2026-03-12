import readline from 'node:readline';

const interactive = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  let goodbyePrinted = false;

  const printGoodbyeAndExit = () => {
    if (goodbyePrinted) return;
    goodbyePrinted = true;
    console.log('Goodbye!');
    rl.close();
  };

  // Ctrl+C (SIGINT) должен завершать программу с Goodbye!
  rl.on('SIGINT', () => {
    printGoodbyeAndExit();
  });

  rl.on('close', () => {
    // close вызывается и при EOF (Ctrl+D), и после rl.close()
    if (!goodbyePrinted) {
      console.log('Goodbye!');
      goodbyePrinted = true;
    }
    process.exit(0);
  });

  // Асинхронный цикл чтения строк: предпочтение async API
  (async () => {
    rl.prompt();

    for await (const input of rl) {
      const command = input.trim();

      switch (command) {
        case 'uptime':
          console.log(`Uptime: ${process.uptime().toFixed(2)}s`);
          break;
        case 'cwd':
          console.log(process.cwd());
          break;
        case 'date':
          console.log(new Date().toISOString());
          break;
        case 'exit':
          printGoodbyeAndExit();
          return;
        case '':
          break;
        default:
          console.log('Unknown command');
          break;
      }

      rl.prompt();
    }
  })();
};

interactive();
