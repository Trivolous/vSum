document.addEventListener('DOMContentLoaded', async () => {
  const {
    backend_url = 'http://localhost:5000',
    gemini_key = '',
    aai_key = '',
    gemini_model = 'gemini-3.1-pro',
    aai_model = 'universal-3-pro',
    custom_model_name = '',
  } = await chrome.storage.local.get([
    'backend_url',
    'gemini_key',
    'aai_key',
    'gemini_model',
    'aai_model',
    'custom_model_name',
  ]);

  document.getElementById('backend_url').value = backend_url;
  document.getElementById('gemini_key').value = gemini_key;
  document.getElementById('aai_key').value = aai_key;
  document.getElementById('gemini_model').value = gemini_model;
  document.getElementById('aai_model').value = aai_model;
  document.getElementById('custom_model_name').value = custom_model_name;

  if (gemini_model === 'custom') {
    document.getElementById('custom_model_wrapper').style.display = 'flex';
  }

  document.getElementById('gemini_model').addEventListener('change', (e) => {
    document.getElementById('custom_model_wrapper').style.display =
      e.target.value === 'custom' ? 'flex' : 'none';
  });

  document.getElementById('save').addEventListener('click', async () => {
    const data = {
      backend_url: document.getElementById('backend_url').value,
      gemini_key: document.getElementById('gemini_key').value,
      aai_key: document.getElementById('aai_key').value,
      gemini_model: document.getElementById('gemini_model').value,
      aai_model: document.getElementById('aai_model').value,
      custom_model_name: document.getElementById('custom_model_name').value,
    };
    await chrome.storage.local.set(data);
    const btn = document.getElementById('save');
    btn.innerText = 'Gespeichert!';
    btn.style.backgroundColor = '#2ba640';
    setTimeout(() => {
      btn.innerText = 'Speichern';
      btn.style.backgroundColor = '#cc0000';
    }, 2000);
  });

  document.getElementById('open_dashboard').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'open_dashboard' });
  });
});
