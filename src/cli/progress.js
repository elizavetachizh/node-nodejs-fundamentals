// Парсер числовых CLI-опций вида: --duration 5000
// Если значение не задано/не число/меньше 0 — возвращаем defaultValue
const parseNumberOption = (args, name, defaultValue) => {
  const idx = args.indexOf(name);
  if (idx === -1) return defaultValue;
  const raw = args[idx + 1];
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : defaultValue;
};

// Парсер опции цвета --color в формате #RRGGBB
// Если формат неверный — возвращаем null (по условию не бросаем ошибку)
const parseColorOption = (args) => {
  const idx = args.indexOf('--color');
  if (idx === -1) return null;
  const raw = args[idx + 1];
  if (typeof raw !== 'string') return null;

  // проверка на соответствие формату #RRGGBB
  const match = raw.trim().match(/^#([0-9a-fA-F]{6})$/);
  
  if (!match) return null;

  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
};

// Оборачивает текст в ANSI-код 24-bit цвета и сбрасывает стиль в конце
const colorize = (text, rgb) => {
  if (!rgb) return text;
  return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[0m`;
};

const progress = () => {
  // Читаем параметры из командной строки
  const args = process.argv.slice(2);

  // Значения по умолчанию по условию задания
  const duration = parseNumberOption(args, '--duration', 5000);
  const interval = parseNumberOption(args, '--interval', 100) || 100;
  const lengthRaw = parseNumberOption(args, '--length', 30);
  const length = Math.max(1, Math.floor(lengthRaw));
  const rgb = parseColorOption(args); // если невалиден — просто null (без ошибки)

  // Точка отсчёта для вычисления прогресса
  const start = Date.now();

  // Отрисовка прогресс-бара в одну строку (обновление через \r)
  const render = (percent) => {
    const filled = Math.round((percent / 100) * length);
    const empty = length - filled;

    const filledPart = '█'.repeat(filled);
    const emptyPart = ' '.repeat(empty);

    const bar =
      `[${colorize(filledPart, rgb)}${emptyPart}] ${Math.round(percent)}%`;

    // \r возвращает каретку в начало строки — строка перерисовывается "на месте"
    process.stdout.write(`\r${bar}`);
  };

  // Первый рендер (0%)
  render(0);

  // Периодически обновляем прогресс до 100%
  const timer = setInterval(() => {
    const elapsed = Date.now() - start;
    // вычисляем текущий процент по формуле: (elapsed / duration) * 100
    const ratio = duration === 0 ? 1 : Math.min(1, elapsed / duration);
    const percent = ratio * 100;

    render(percent);

    if (ratio >= 1) {
      clearInterval(timer);
      // По завершении печатаем Done! на новой строке
      process.stdout.write('\nDone!\n');
    }
  }, interval);
};

progress();
