/**
 * Local file logging for tracking errors
 */
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const logger = winston.createLogger({
	level: 'info',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
				winston.format.printf(({ timestamp, level, message }) => {
					return `${timestamp} [${level}]: ${message}`;
				})
			)
		}),
		new winston.transports.File({
			filename: path.join(__dirname, '../../data/logs/error.log'),
			level: 'error'
		}),
		new winston.transports.File({
			filename: path.join(__dirname, '../../data/logs/combined.log')
		})
	]
});
