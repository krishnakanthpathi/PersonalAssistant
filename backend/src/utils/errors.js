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
			let successMessage = 'Operation succeeded';
			if (typeof result === 'string') {
				successMessage = result;
			} else if (errorPrefix) {
				// Strip off "Failed to" or "failed" prefixes to construct a clean success message
				const cleanAction = errorPrefix
					.replace(/^Failed to\s+/i, '')
					.replace(/\s+failed$/i, '');
				successMessage = `${cleanAction.charAt(0).toUpperCase() + cleanAction.slice(1)} succeeded`;
			}
			logger.info(successMessage);
			return result;
		} catch (error) {
			const errorMessage = errorPrefix ? `${errorPrefix}: ${error.message}` : error.message;
			logger.error(errorMessage);
			// Log the full stack trace for debugging
			if (error.stack) {
				logger.error(`Stack trace: ${error.stack}`);
			}
			// Log axios-specific details if available
			if (error.response) {
				logger.error(`HTTP response status: ${error.response.status} ${error.response.statusText}`);
				logger.error(`HTTP response body: ${JSON.stringify(error.response.data).substring(0, 2000)}`);
			}
			throw new Error(errorMessage);
		}
	};
}



