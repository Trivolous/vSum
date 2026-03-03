function parseMarkdown(text) {
  if (!text || text === 'Not requested') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\-\*] (.*$)/gim, '• $1')
    .replace(/\n/g, '<br>');
}

window.parseMarkdown = parseMarkdown;
