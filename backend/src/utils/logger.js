const morgan = require('morgan');

morgan.token('custom', (req) => {
  return `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`;
});

const devLogger = morgan('dev');
const prodLogger = morgan('combined');

const logger =
  process.env.NODE_ENV === 'production'
    ? prodLogger
    : devLogger;

module.exports = logger;