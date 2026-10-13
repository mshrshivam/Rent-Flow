export function buildInteractionsEndpoint(apiUrl) {
  const endpoint = String(apiUrl || '').replace(/\/+$/, '');
  if (/\/models(?:\/[^/]+(?::generateContent)?)?$/i.test(endpoint)) {
    return endpoint.replace(/\/models(?:\/[^/]+(?::generateContent)?)?$/i, '/interactions');
  }
  return endpoint;
}

export function interactionsOutputText(parsed) {
  if (typeof parsed?.output_text === 'string') return parsed.output_text;
  const steps = Array.isArray(parsed?.steps)
    ? parsed.steps
    : Array.isArray(parsed?.output)
      ? parsed.output
      : [];

  const textParts = [];
  const collectText = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collectText);
    } else if (value && typeof value === 'object') {
      if (value.type === 'text' && typeof value.text === 'string') {
        textParts.push(value.text);
      } else if (Array.isArray(value.content)) {
        collectText(value.content);
      }
    }
  };
  collectText(steps);
  return textParts.join('\n');
}
