document.getElementById('save').addEventListener('click', () => {
  const key = document.getElementById('api-key').value;
  chrome.storage.local.set({ gemini_key: key }, () => {
    document.getElementById('status').innerText = 'Gespeichert!';
    setTimeout(() => {
      document.getElementById('status').innerText = '';
    }, 2000);
  });
});

chrome.storage.local.get('gemini_key', (data) => {
  if (data.gemini_key) {
    document.getElementById('api-key').value = data.gemini_key;
  }
});
