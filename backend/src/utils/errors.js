import { logger } from './logger.js';

/**
 * Higher-order function to wrap async functions with error logging and prefixing.
 * Helps avoid repeating try-catch blocks in tool execution methods.
 */
export function catchErrors(fn, errorPrefix = '') {
	return async function (...args) {
		try {
			const result = await fn(...args);
			// Log success message (use the return value if it is a string, otherwise fallback to a generic message)
			const successMessage = typeof result === 'string' 
				? result 
				: (errorPrefix ? `${errorPrefix} succeeded` : 'Operation succeeded');
			logger.info(successMessage);
			return result;
		} catch (error) {
			const errorMessage = errorPrefix ? `${errorPrefix}: ${error.message}` : error.message;
			logger.error(errorMessage, { error });
			throw new Error(errorMessage);
		}
	};
}



