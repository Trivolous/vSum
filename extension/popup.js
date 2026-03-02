const modelSelect = document.getElementById('model-select');
const customContainer = document.getElementById('custom-model-container');
const customInput = document.getElementById('custom-model-input');

modelSelect.addEventListener('change', () => {
  customContainer.style.display = modelSelect.value === 'custom' ? 'block' : 'none';
});

document.getElementById('save-settings').addEventListener('click', () => {
  const backend_url =
    document.getElementById('backend-url').value.trim() || 'http://localhost:5000';
  const gemini_key = document.getElementById('gemini-key').value.trim();
  const aai_key = document.getElementById('aai-key').value.trim();
  const selectedModel = modelSelect.value;
  const customModel = customInput.value.trim();

  const modelToSave = selectedModel === 'custom' ? customModel : selectedModel;

  chrome.storage.local.set(
    {
      backend_url,
      gemini_key,
      aai_key,
      selected_model: modelToSave,
      ui_selected_type: selectedModel,
    },
    () => {
      const status = document.getElementById('status-msg');
      status.style.display = 'block';
      setTimeout(() => {
        status.style.display = 'none';
      }, 2000);
    }
  );
});

document.getElementById('open-archive').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ action: 'open_dashboard' });
});

// Load current settings
chrome.storage.local.get(
  ['backend_url', 'gemini_key', 'aai_key', 'selected_model', 'ui_selected_type'],
  (data) => {
    document.getElementById('backend-url').value = data.backend_url || 'http://localhost:5000';
    if (data.gemini_key) document.getElementById('gemini-key').value = data.gemini_key;
    if (data.aai_key) document.getElementById('aai-key').value = data.aai_key;

    if (data.ui_selected_type) {
      modelSelect.value = data.ui_selected_type;
      if (data.ui_selected_type === 'custom') {
        customContainer.style.display = 'block';
        customInput.value = data.selected_model;
      }
    } else if (data.selected_model) {
      modelSelect.value = data.selected_model;
    }
  }
);
