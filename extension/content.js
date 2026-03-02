async function startSummarize(url, summaryType) {
  const videoId = new URL(url).searchParams.get('v');
  const state = window.currentVideoState;
  state.activeTab = summaryType === 'detailed' ? 'normal' : summaryType;
  state.title = document.title.replace(' - YouTube', '');
  const { yt_summaries = [] } = await chrome.storage.local.get('yt_summaries');
  const existing = yt_summaries.find((s) => s.url.includes(videoId));

  if (existing) {
    state.short = { stage: 'cached', data: existing.short_summary, percent: 100 };
    state.normal = { stage: 'cached', data: existing.normal_summary, percent: 100 };
    state.transcript = { stage: 'cached', data: existing.transcript, percent: 100 };
    state.cachedTranscript = existing.transcript;
    state.audioUrl = existing.audioUrl;
    state.wordCount = existing.transcript ? existing.transcript.split(/\s+/).length : 0;
    window.renderOverlay();
  } else {
    triggerNewAnalysis(summaryType === 'detailed' ? 'normal' : summaryType);
  }
}

async function triggerNewAnalysis(summaryType) {
  const settings = await chrome.storage.local.get(['selected_model']);
  const state = window.currentVideoState;
  if (summaryType === 'short') state.short.stage = 'start';
  if (summaryType === 'normal' || summaryType === 'detailed') state.normal.stage = 'start';
  state.transcript.stage = 'start';
  window.renderOverlay();
  chrome.runtime.sendMessage({
    action: 'summarize',
    url: window.location.href,
    title: document.title.replace(' - YouTube', ''),
    summaryType: summaryType === 'detailed' ? 'normal' : summaryType,
    model: settings.selected_model,
    existingTranscript: state.cachedTranscript,
  });
}

window.startSummarize = startSummarize;
window.triggerNewAnalysis = triggerNewAnalysis;

function injectHeaderButtons() {
  const logoContainer = document.querySelector('ytd-masthead #start');
  if (!logoContainer || document.getElementById('yt-sum-dropdown-container')) return;

  const container = document.createElement('div');
  container.id = 'yt-sum-dropdown-container';
  container.className = 'yt-sum-dropdown-container';

  container.innerHTML = `
        <button class="yt-sum-main-btn" id="yt-sum-main-btn">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: currentColor;"><path d="M19 3H5c-1.1.0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
            Summary
            <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor;"><path d="M7 10l5 5 5-5z"/></svg>
        </button>
        <div class="yt-sum-dropdown-menu" id="yt-sum-dropdown-menu">
            <div class="yt-sum-dropdown-item" data-action="archive">
                <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                Archive
            </div>
            <div class="yt-sum-dropdown-item" data-action="short">
                <svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                Short
            </div>
            <div class="yt-sum-dropdown-item" data-action="normal">
                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                Normal
            </div>
            <div class="yt-sum-dropdown-item" data-action="detailed">
                <svg viewBox="0 0 24 24"><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/></svg>
                Detailed
            </div>
        </div>
    `;

  const logo = logoContainer.querySelector('ytd-topbar-logo-renderer');
  if (logo) {
    logo.parentNode.insertBefore(container, logo.nextSibling);
  } else {
    logoContainer.appendChild(container);
  }

  const btn = document.getElementById('yt-sum-main-btn');
  const menu = document.getElementById('yt-sum-dropdown-menu');

  btn.onclick = () => {
    const isVisible = menu.style.display === 'flex';
    menu.style.display = isVisible ? 'none' : 'flex';
  };

  container.querySelectorAll('.yt-sum-dropdown-item').forEach((item) => {
    item.onclick = () => {
      const action = item.getAttribute('data-action');
      menu.style.display = 'none';

      if (action === 'archive') {
        chrome.runtime.sendMessage({ action: 'open_dashboard' });
      } else {
        startSummarize(window.location.href, action);
      }
    };
  });

  window.attachGlobalListeners();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'status_update') {
    const state = window.currentVideoState;
    if (msg.stage === 'done') {
      state.short.stage = 'done';
      state.short.data = msg.message.short_summary;
      state.normal.stage = 'done';
      state.normal.data = msg.message.normal_summary;
      state.transcript.stage = 'done';
      state.cachedTranscript = msg.message.transcript;
      state.audioUrl = msg.message.audioUrl;
      state.wordCount = msg.message.wordCount || 0;
    } else {
      const target = msg.summaryType === 'normal' ? state.normal : state.short;
      target.stage = msg.stage;
      target.percent = msg.percent;
      target.message = msg.message;
      if (msg.stage === 'error') target.data = msg.message;

      state.transcript.stage = msg.stage;
      state.transcript.percent = msg.percent;
      state.transcript.message = msg.message;
      if (msg.stage === 'error') state.transcript.data = msg.message;
    }
    window.renderOverlay();
  }
});

setInterval(injectHeaderButtons, 2000);
