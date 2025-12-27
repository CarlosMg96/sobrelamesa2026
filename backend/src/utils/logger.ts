import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const getLogFilePath = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return path.join(LOG_DIR, `logs-${day}-${month}-${year}.txt`);
};

export const initLogger = () => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const logToFile = (message: string) => {
        const logFile = getLogFilePath();
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;

        fs.appendFile(logFile, logMessage, (err) => {
            if (err) {
                originalError('Failed to write to log file:', err);
            }
        });
    };

    const util = require('util');

    console.log = (...args: any[]) => {
        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            return util.inspect(arg, { showHidden: false, depth: null, colors: false });
        }).join(' ');
        originalLog.apply(console, args);
        logToFile(`[INFO] ${message}`);
    };

    console.error = (...args: any[]) => {
        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            return util.inspect(arg, { showHidden: false, depth: null, colors: false });
        }).join(' ');
        originalError.apply(console, args);
        logToFile(`[ERROR] ${message}`);
    };

    console.warn = (...args: any[]) => {
        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            return util.inspect(arg, { showHidden: false, depth: null, colors: false });
        }).join(' ');
        originalWarn.apply(console, args);
        logToFile(`[WARN] ${message}`);
    };

    console.log('Logger initialized to write to:', getLogFilePath());
};
