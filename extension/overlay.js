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
      if (!e.target.closest('.yt-sum-dropdown-container')) {
        panel.style.display = 'none';
      }
    }

    const dropdownMenu = document.getElementById('yt-sum-dropdown-menu');
    const dropdownBtn = document.getElementById('yt-sum-main-btn');
    if (
      dropdownMenu &&
      dropdownMenu.style.display === 'flex' &&
      !dropdownMenu.contains(e.target) &&
      !dropdownBtn.contains(e.target)
    ) {
      dropdownMenu.style.display = 'none';
    }
  });

  window.ytSumListenersAttached = true;
}

function renderOverlay() {
  attachGlobalListeners();
  const state = window.currentVideoState;
  console.log('[vSum] Rendering overlay. Active tab:', state.activeTab);

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

  const active = state.activeTab;
  let currentTask =
    active === 'short'
      ? state.short
      : active === 'normal'
        ? state.normal
        : active === 'detailed'
          ? state.detailed
          : state.transcript;

  panel.innerHTML = `
        <div class="yt-sum-drag-handle">
            <h3 class="yt-sum-title">${state.title}</h3>
            <button class="close-btn" id="yt-sum-close-x">
                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
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
                <button class="tab-btn ${active === 'detailed' ? 'active' : ''}" id="tab-detailed-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M4 14h4v-4H4v4zm0 5h4v-4H4v4zM4 9h4V5H4v4zm5 5h12v-4H9v4zm0 5h12v-4H9v4zM9 5v4h12V5H9z"/></svg>
                    Detailed
                </button>
                <button class="tab-btn ${active === 'transcript' ? 'active' : ''}" id="tab-transcript-btn">
                    <svg viewBox="0 0 24 24" class="tab-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"/></svg>
                    Transcript
                </button>
            </div>

            <div id="tab-content" class="task-section ${currentTask ? currentTask.stage : 'idle'}">
                ${
                  active === 'transcript' && state.audioUrl
                    ? `
                    <div class="audio-player-container">
                        <audio controls style="width: 100%; height: 32px;"><source src="${state.audioUrl}"></audio>
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
                  currentTask &&
                  (currentTask.stage === 'done' || currentTask.stage === 'cached') &&
                  active !== 'transcript'
                    ? `<button class="action-btn" id="regen-active-btn">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                    Regenerate
                   </button>`
                    : ''
                }
                <button class="action-btn" id="yt-sum-btn-purge-file" title="Permanently delete the downloaded audio file from the server.">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6l-1 1H2v2h12V5z"/></svg>
                    Delete Audio
                </button>
                <button class="action-btn" id="yt-sum-btn-full-reset" title="Clear the saved summary and transcript from your browser.">
                    <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; margin-right: 6px; fill: currentColor;"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    Clear Cache
                </button>
            </div>
        </div>
    `;

  // Attach listeners with defensive checks
  const safeSetClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  safeSetClick('yt-sum-close-x', () => (panel.style.display = 'none'));
  safeSetClick('tab-short-btn', () => {
    console.log('[vSum] Tab clicked: short');
    state.activeTab = 'short';
    renderOverlay();
  });
  safeSetClick('tab-normal-btn', () => {
    console.log('[vSum] Tab clicked: normal');
    state.activeTab = 'normal';
    renderOverlay();
  });
  safeSetClick('tab-detailed-btn', () => {
    console.log('[vSum] Tab clicked: detailed');
    state.activeTab = 'detailed';
    renderOverlay();
  });
  safeSetClick('tab-transcript-btn', () => {
    console.log('[vSum] Tab clicked: transcript');
    state.activeTab = 'transcript';
    renderOverlay();
  });

  safeSetClick('yt-sum-btn-purge-file', () => {
    if (confirm('Delete backend audio file? This forces a redownload on next analysis.')) {
      const videoId = new URL(window.location.href).searchParams.get('v');
      chrome.runtime.sendMessage({ action: 'delete_audio', videoId: videoId });
      state.audioUrl = null;
      renderOverlay();
    }
  });

  safeSetClick('yt-sum-btn-full-reset', () => {
    if (confirm('Delete all cached data for this video?')) {
      const videoId = new URL(window.location.href).searchParams.get('v');
      chrome.runtime.sendMessage({ action: 'delete_summary', videoId: videoId });

      window.currentVideoState = {
        videoId: videoId,
        activeTab: state.activeTab,
        title: state.title,
        cachedTranscript: null,
        audioUrl: null,
        wordCount: 0,
        short: { stage: 'idle', percent: 0, data: null, message: '' },
        normal: { stage: 'idle', percent: 0, data: null, message: '' },
        detailed: { stage: 'idle', percent: 0, data: null, message: '' },
        transcript: { stage: 'idle', percent: 0, data: null, message: '' },
      };

      renderOverlay(); // Refresh UI instead of hiding
    }
  });

  if (document.getElementById('regen-active-btn')) {
    document.getElementById('regen-active-btn').onclick = () => window.triggerNewAnalysis(active);
  }
}

function renderTaskContent(task, active) {
  if (!task) return `<p class="idle-msg">Ready.</p>`;

  if (task.stage === 'done' || task.stage === 'cached') {
    const text = active === 'transcript' ? window.currentVideoState.cachedTranscript : task.data;
    if (!text) return `<p class="idle-msg">No data available.</p>`;
    return `<div class="result-text">${active === 'transcript' ? text : window.parseMarkdown(text)}</div>`;
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

window.renderOverlay = renderOverlay;
window.attachGlobalListeners = attachGlobalListeners;
