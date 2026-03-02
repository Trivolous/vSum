console.log('YouTube Summarizer (v4.9) - Enhanced Transcript View.');

let currentVideoState = {
  videoId: null,
  activeTab: 'short',
  title: '',
  cachedTranscript: null,
  audioUrl: null,
  wordCount: 0,
  short: { stage: 'idle', percent: 0, data: null },
  normal: { stage: 'idle', percent: 0, data: null },
  transcript: { stage: 'idle', percent: 0, data: null },
};

function parseMarkdown(text) {
  if (!text || text === 'Nicht angefordert') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.*$)/gim, '• $1')
    .replace(/\n/g, '<br>');
}

function renderOverlay() {
  let panel = document.getElementById('yt-sum-overlay');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'yt-sum-overlay';
    document.body.appendChild(panel);

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') panel.style.display = 'none';
    });

    // Close on click outside
    window.addEventListener('mousedown', (e) => {
      if (panel.style.display === 'block' && !panel.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

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
        panel.style.transition = 'none'; // Disable transition while dragging
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
  panel.style.display = 'block';

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
                    Kurz
                </button>
                <button class="tab-btn ${active === 'normal' ? 'active' : ''}" id="tab-normal-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/></svg>
                    Normal
                </button>
                <button class="tab-btn ${active === 'transcript' ? 'active' : ''}" id="tab-transcript-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                    Transkript
                </button>
            </div>

            <div id="tab-content" class="task-section ${currentTask.stage}">
                ${
                  active === 'transcript' && currentVideoState.audioUrl
                    ? `
                    <div class="audio-player-container">
                        <audio controls style="width: 100%; height: 32px;"><source src="${currentVideoState.audioUrl}" type="audio/mpeg"></audio>
                    </div>
                `
                    : ''
                }

                <div class="content-scrollbox">
                    ${renderTaskContent(currentTask, active)}
                </div>
            </div>

            <div class="sum-footer">
                ${(currentTask.stage === 'done' || currentTask.stage === 'cached') && active !== 'transcript' ? `<button class="action-btn" id="regen-active-btn">🔄 Neu generieren</button>` : ''}
                <button class="action-btn" id="yt-sum-btn-full-reset">🔥 Audio-Reset</button>
                <button class="action-btn" id="yt-sum-btn-archive">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                    Archiv
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
  document.getElementById('yt-sum-btn-full-reset').onclick = () => {
    if (confirm('Löschen?')) {
      chrome.runtime.sendMessage({ action: 'delete_summary', url: window.location.href });
      panel.style.display = 'none';
    }
  };
  if (document.getElementById('regen-active-btn'))
    document.getElementById('regen-active-btn').onclick = () => triggerNewAnalysis(active);
}

function renderTaskContent(task, active) {
  if (task.stage === 'done' || task.stage === 'cached') {
    const text = active === 'transcript' ? currentVideoState.cachedTranscript : task.data;
    if (!text) return `<p class="idle-msg">Keine Daten vorhanden.</p>`;
    return `<div class="result-text">${active === 'transcript' ? text : parseMarkdown(text)}</div>`;
  }
  if (task.stage === 'idle') return `<p class="idle-msg">Bereit.</p>`;
  if (task.stage === 'error') return `<p class="error-msg">❌ ${task.data}</p>`;
  return `
        <div class="status-row"><span>Lädt...</span><span>${task.percent}%</span></div>
        <div class="progress-container mini"><div class="progress-bar" style="width: ${task.percent}%"></div></div>
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
      currentVideoState.transcript.stage = msg.stage;
      currentVideoState.transcript.percent = msg.percent;
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
        Archiv
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
            Kurz
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
