// Structured logging utility for the backend.
// All log methods accept a message string + optional metadata object and
// output JSON-lines when NODE_ENV !== 'development' so they can be parsed
// by log aggregators (Datadog, CloudWatch, etc.). In development the logs
// remain human-readable with colour-coded levels.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const COLORS = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m',  // yellow
  info: '\x1b[32m',  // green
  debug: '\x1b[90m', // grey
};
const RESET = '\x1b[0m';

function formatTimestamp() {
  return new Date().toISOString();
}

function formatDev(level, message, meta) {
  const color = COLORS[level] || '';
  const paddedLevel = level.toUpperCase().padEnd(5);
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${color}[${formatTimestamp()}] [${paddedLevel}]${RESET} ${message}${metaStr}`;
}

function formatProd(level, message, meta) {
  const entry = {
    timestamp: formatTimestamp(),
    level: level.toUpperCase(),
    message,
  };
  if (meta) entry.meta = meta;
  return JSON.stringify(entry);
}

function log(level, message, meta = {}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const line = isDev ? formatDev(level, message, meta) : formatProd(level, message, meta);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  error(message, meta) {
    if (LEVELS.error <= LEVELS[process.env.LOG_LEVEL || 'error']) {
      log('error', message, meta);
    }
  },
  warn(message, meta) {
    if (LEVELS.warn <= LEVELS[process.env.LOG_LEVEL || 'error']) {
      log('warn', message, meta);
    }
  },
  info(message, meta) {
    if (LEVELS.info <= LEVELS[process.env.LOG_LEVEL || 'error']) {
      log('info', message, meta);
    }
  },
  debug(message, meta) {
    if (LEVELS.debug <= LEVELS[process.env.LOG_LEVEL || 'debug']) {
      log('debug', message, meta);
    }
  },
};

module.exports = logger;
