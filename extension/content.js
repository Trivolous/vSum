console.log('YouTube Summarizer (v4.9) - Enhanced Transcript View.');

let currentVideoState = {
  videoId: null,
  activeTab: 'short',
  title: '',
  cachedTranscript: null,
  audioUrl: null,
  wordCount: 0,
  short: { stage: 'idle', percent: 0, data: null, message: '' },
  normal: { stage: 'idle', percent: 0, data: null, message: '' },
  transcript: { stage: 'idle', percent: 0, data: null, message: '' },
};

function parseMarkdown(text) {
  if (!text || text === 'Not requested') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[\-\*] (.*$)/gim, '• $1')
    .replace(/\n/g, '<br>');
}

// Global event listeners (attached once)
function attachGlobalListeners() {
  if (window.ytSumListenersAttached) return;

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const panel = document.getElementById('yt-sum-overlay');
      if (panel) panel.style.display = 'none';
    }
  });

  window.addEventListener('mousedown', (e) => {
    const panel = document.getElementById('yt-sum-overlay');
    if (panel && panel.style.display === 'flex' && !panel.contains(e.target)) {
      // Do not close if clicking one of the trigger buttons
      if (!e.target.closest('.yt-sum-btn')) {
        panel.style.display = 'none';
      }
    }
  });

  window.ytSumListenersAttached = true;
}

function renderOverlay() {
  attachGlobalListeners();
  let panel = document.getElementById('yt-sum-overlay');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'yt-sum-overlay';
    document.body.appendChild(panel);

    // Dragging Logic
    let isDragging = false;
    let offset = { x: 0, y: 0 };

    panel.addEventListener('mousedown', (e) => {
      if (e.target.closest('.yt-sum-drag-handle')) {
        isDragging = true;
        offset = {
          x: e.clientX - panel.offsetLeft,
          y: e.clientY - panel.offsetTop,
        };
        panel.style.transition = 'none';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) {
        panel.style.left = `${e.clientX - offset.x}px`;
        panel.style.top = `${e.clientY - offset.y}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  panel.style.display = 'flex';

  const active = currentVideoState.activeTab;
  let currentTask =
    active === 'short'
      ? currentVideoState.short
      : active === 'normal'
        ? currentVideoState.normal
        : currentVideoState.transcript;

  panel.innerHTML = `
        <div class="yt-sum-drag-handle">
            <h3 class="yt-sum-title">${currentVideoState.title}</h3>
            <button class="close-btn" id="yt-sum-close-x">
                <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
        </div>
        <div class="yt-sum-panel-content">
            <div class="tab-bar">
                <button class="tab-btn ${active === 'short' ? 'active' : ''}" id="tab-short-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                    Short
                </button>
                <button class="tab-btn ${active === 'normal' ? 'active' : ''}" id="tab-normal-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                    Normal
                </button>
                <button class="tab-btn ${active === 'transcript' ? 'active' : ''}" id="tab-transcript-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                    Transcript
                </button>
            </div>

            <div id="tab-content" class="task-section ${currentTask.stage}">
                ${
                  active === 'transcript' && currentVideoState.audioUrl
                    ? `
                    <div class="audio-player-container">
                        <audio controls style="width: 100%; height: 32px;"><source src="${currentVideoState.audioUrl}"></audio>
                    </div>
                `
                    : ''
                }

                <div class="content-scrollbox">
                    ${renderTaskContent(currentTask, active)}
                </div>
            </div>

            <div class="sum-footer">
                ${
                  (currentTask.stage === 'done' || currentTask.stage === 'cached') &&
                  active !== 'transcript'
                    ? `<button class="action-btn" id="regen-active-btn">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                    Regenerate
                   </button>`
                    : ''
                }
                <button class="action-btn" id="yt-sum-btn-purge-file" title="Delete backend audio file">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6l-1 1H2v2h12V5z"/></svg>
                    Purge File
                </button>
                <button class="action-btn" id="yt-sum-btn-full-reset" title="Clear local cache">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    Reset Data
                </button>
                <button class="action-btn" id="yt-sum-btn-archive">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                    Archive
                </button>
            </div>
        </div>
    `;

  document.getElementById('yt-sum-close-x').onclick = () => (panel.style.display = 'none');
  document.getElementById('tab-short-btn').onclick = () => {
    currentVideoState.activeTab = 'short';
    renderOverlay();
  };
  document.getElementById('tab-normal-btn').onclick = () => {
    currentVideoState.activeTab = 'normal';
    renderOverlay();
  };
  document.getElementById('tab-transcript-btn').onclick = () => {
    currentVideoState.activeTab = 'transcript';
    renderOverlay();
  };
  document.getElementById('yt-sum-btn-archive').onclick = () =>
    chrome.runtime.sendMessage({ action: 'open_dashboard' });

  document.getElementById('yt-sum-btn-purge-file').onclick = () => {
    if (confirm('Delete backend audio file? This forces a redownload on next analysis.')) {
      const videoId = new URL(window.location.href).searchParams.get('v');
      chrome.runtime.sendMessage({ action: 'delete_audio', videoId: videoId });

      // Update local state to reflect audio is gone (optional but good UI)
      currentVideoState.audioUrl = null;
      renderOverlay();
    }
  };

  document.getElementById('yt-sum-btn-full-reset').onclick = () => {
    if (confirm('Delete?')) {
      const videoId = new URL(window.location.href).searchParams.get('v');
      chrome.runtime.sendMessage({ action: 'delete_summary', videoId: videoId });

      // Reset local state
      currentVideoState = {
        videoId: videoId,
        activeTab: currentVideoState.activeTab,
        title: currentVideoState.title,
        cachedTranscript: null,
        audioUrl: null,
        wordCount: 0,
        short: { stage: 'idle', percent: 0, data: null, message: '' },
        normal: { stage: 'idle', percent: 0, data: null, message: '' },
        transcript: { stage: 'idle', percent: 0, data: null, message: '' },
      };

      panel.style.display = 'none';
    }
  };
  if (document.getElementById('regen-active-btn'))
    document.getElementById('regen-active-btn').onclick = () => triggerNewAnalysis(active);
}

function renderTaskContent(task, active) {
  if (task.stage === 'done' || task.stage === 'cached') {
    const text = active === 'transcript' ? currentVideoState.cachedTranscript : task.data;
    if (!text) return `<p class="idle-msg">No data available.</p>`;
    return `<div class="result-text">${active === 'transcript' ? text : parseMarkdown(text)}</div>`;
  }
  if (task.stage === 'idle') return `<p class="idle-msg">Ready.</p>`;
  if (task.stage === 'error') return `<p class="error-msg">❌ ${task.data || task.message}</p>`;

  const statusMessage = task.message || 'Processing...';

  return `
        <div class="status-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #606060;">
            <span style="font-weight: 500;">${statusMessage}</span>
            <span style="font-weight: 500;">${task.percent || 0}%</span>
        </div>
        <div class="progress-container mini" style="height: 4px; background: rgba(0,0,0,0.1); border-radius: 2px; overflow: hidden;">
            <div class="progress-bar" style="width: ${task.percent || 0}%; height: 100%; background: #f00; transition: width 0.3s ease;"></div>
        </div>
    `;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'status_update') {
    if (msg.stage === 'done') {
      currentVideoState.short.stage = 'done';
      currentVideoState.short.data = msg.message.short_summary;
      currentVideoState.normal.stage = 'done';
      currentVideoState.normal.data = msg.message.normal_summary;
      currentVideoState.transcript.stage = 'done';
      currentVideoState.cachedTranscript = msg.message.transcript;
      currentVideoState.audioUrl = msg.message.audioUrl;
      currentVideoState.wordCount = msg.message.wordCount || 0;
    } else {
      const target =
        msg.summaryType === 'normal' ? currentVideoState.normal : currentVideoState.short;
      target.stage = msg.stage;
      target.percent = msg.percent;
      target.message = msg.message;
      if (msg.stage === 'error') target.data = msg.message;

      currentVideoState.transcript.stage = msg.stage;
      currentVideoState.transcript.percent = msg.percent;
      currentVideoState.transcript.message = msg.message;
      if (msg.stage === 'error') currentVideoState.transcript.data = msg.message;
    }
    renderOverlay();
  }
});

async function startSummarize(url, summaryType) {
  const videoId = new URL(url).searchParams.get('v');
  currentVideoState.activeTab = summaryType;
  currentVideoState.title = document.title.replace(' - YouTube', '');
  const { yt_summaries = [] } = await chrome.storage.local.get('yt_summaries');
  const existing = yt_summaries.find((s) => s.url.includes(videoId));

  if (existing) {
    currentVideoState.short = { stage: 'cached', data: existing.short_summary, percent: 100 };
    currentVideoState.normal = { stage: 'cached', data: existing.normal_summary, percent: 100 };
    currentVideoState.transcript = { stage: 'cached', data: existing.transcript, percent: 100 };
    currentVideoState.cachedTranscript = existing.transcript;
    currentVideoState.audioUrl = existing.audioUrl;
    currentVideoState.wordCount = existing.transcript ? existing.transcript.split(/\s+/).length : 0;
    renderOverlay();
  } else {
    triggerNewAnalysis(summaryType);
  }
}

async function triggerNewAnalysis(summaryType) {
  const settings = await chrome.storage.local.get(['selected_model']);
  if (summaryType === 'short') currentVideoState.short.stage = 'start';
  if (summaryType === 'normal') currentVideoState.normal.stage = 'start';
  currentVideoState.transcript.stage = 'start';
  renderOverlay();
  chrome.runtime.sendMessage({
    action: 'summarize',
    url: window.location.href,
    title: document.title.replace(' - YouTube', ''),
    summaryType: summaryType,
    model: settings.selected_model,
    existingTranscript: currentVideoState.cachedTranscript,
  });
}

function injectHeaderButtons() {
  const endContainer = document.querySelector('#end.style-scope.ytd-masthead #buttons');
  if (!endContainer || document.getElementById('yt-sum-header-group')) return;

  const group = document.createElement('div');
  group.id = 'yt-sum-header-group';
  group.style.display = 'flex';
  group.style.alignItems = 'center';
  group.style.marginRight = '12px';

  const dashBtn = document.createElement('button');
  dashBtn.className = 'yt-sum-btn dash';
  dashBtn.innerHTML = `
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; margin-right: 6px; fill: currentColor;">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/>
        </svg>
        Archive
    `;
  dashBtn.onclick = () => chrome.runtime.sendMessage({ action: 'open_dashboard' });
  group.appendChild(dashBtn);

  if (window.location.pathname === '/watch') {
    const sBtn = document.createElement('button');
    sBtn.className = 'yt-sum-btn short';
    sBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; margin-right: 6px; fill: currentColor;">
                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
            Short
        `;
    sBtn.onclick = () => startSummarize(window.location.href, 'short');

    const nBtn = document.createElement('button');
    nBtn.className = 'yt-sum-btn norm';
    nBtn.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; margin-right: 6px; fill: currentColor;">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            </svg>
            Normal
        `;
    nBtn.onclick = () => startSummarize(window.location.href, 'normal');

    group.appendChild(sBtn);
    group.appendChild(nBtn);
  }

  // Inject before the user profile/buttons group in the header
  endContainer.parentNode.insertBefore(group, endContainer);
}
setInterval(injectHeaderButtons, 2000);
