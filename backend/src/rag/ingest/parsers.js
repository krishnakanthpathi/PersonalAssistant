/**
 * File extractors (TXT, Markdown, PDF, JSON)
 */
export const parsers = {
	txt: (content) => content,
	markdown: (content) => content,
	json: (content) => JSON.parse(content),
	pdf: async (buffer) => {
		// PDF extraction logic
		return '';
	}
};
