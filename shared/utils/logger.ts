/**
 * Structured logger for Point Game backend
 * Outputs JSON to CloudWatch for easy filtering
 *
 * Usage:
 *   import { logger } from '../shared/logger';
 *
 *   // Basic logging
 *   logger.info('Something happened', { tableID, userID });
 *
 *   // Create a child logger with bound context
 *   const log = logger.child({ tableID, handSeq, street });
 *   log.info('Processing action', { action: 'raise', amount: 100 });
 *   log.error('Action failed', { error: err.message });
 */

type LogLevel = 'debug'|'info'|'warn'|'error';

interface LogContext {
  [key: string]: any;
}

interface Logger {
  debug: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  error: (msg: string, ctx?: LogContext) => void;
  child: (ctx: LogContext) => Logger;
}

function createLogger(baseContext: LogContext = {}): Logger {
  const log = (level: LogLevel, msg: string, ctx: LogContext = {}) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      msg,
      ...baseContext,
      ...ctx,
    };

    // Output as JSON for CloudWatch
    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  };

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    child: (ctx) => createLogger({...baseContext, ...ctx}),
  };
}

export const logger = createLogger();