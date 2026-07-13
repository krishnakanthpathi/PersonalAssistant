export function parseAgentResponse(rawContent) {
	const speechMatch = rawContent.match(/<speech>([\s\S]*?)<\/speech>/i);
	const actionMatch = rawContent.match(/<action>([\s\S]*?)<\/action>/i);

	let speech = '';
	let action = '';

	if (speechMatch) {
		speech = speechMatch[1].trim();
	}
	if (actionMatch) {
		action = actionMatch[1].trim();
	}

	// Fallbacks if tags are missing
	if (!speechMatch && !actionMatch) {
		// If no tags at all, treat the entire thing as the action, and speech is a simplified summary
		action = rawContent.trim();
		speech = cleanTextForSpeech(action);
	} else if (speechMatch && !actionMatch) {
		// If only speech tag is present, treat the rest of the text as action
		action = rawContent.replace(/<speech>[\s\S]*?<\/speech>/gi, '').trim();
	} else if (!speechMatch && actionMatch) {
		// If only action tag is present
		action = actionMatch[1].trim();
		speech = cleanTextForSpeech(action);
	}

	return { speech, content: action };
}

export function cleanTextForSpeech(text) {
	let clean = text
		.replace(/```[\s\S]*?```/g, '') // remove code blocks
		.replace(/`([^`]+)`/g, '$1') // remove inline code backticks
		.replace(/[#*_\-]/g, '') // remove markdown symbols
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links, keep text
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0)
		.join('. ');

	// Limit speech to first 2 sentences for clean voice output
	const sentences = clean.split(/[.!?]+/);
	return sentences.slice(0, 2).join('. ').trim();
}
