function loadSummaries() {
  const list = document.getElementById('summary-list');
  chrome.storage.local.get('yt_summaries', (result) => {
    const summaries = result.yt_summaries || [];
    if (summaries.length === 0) {
      list.innerHTML = '<p>No summaries available yet.</p>';
      return;
    }

    list.innerHTML = '';
    summaries.forEach((sum) => {
      const card = document.createElement('div');
      card.className = 'summary-card';
      card.innerHTML = `
        <button class="delete" data-id="${sum.id}">Delete</button>
        <img class="thumbnail" src="${sum.thumbnail}" alt="thumbnail">
        <div class="details">
          <div class="title"><a href="${sum.url}" target="_blank">${sum.title}</a></div>
          <div class="timestamp">${new Date(sum.timestamp).toLocaleString()}</div>
          <div class="short">
            <strong>Short Key Points:</strong><br>
            ${sum.short_summary}
          </div>
          <div class="normal">
            <strong>Detailed Key Points:</strong><br>
            ${sum.normal_summary}
          </div>
          <div class="transcript">
             <strong>Full Transcript:</strong><br>
             ${sum.transcript}
          </div>
        </div>
        <div class="clear-fix"></div>
      `;
      list.appendChild(card);
    });

    // Add delete listeners
    document.querySelectorAll('.delete').forEach((btn) => {
      btn.onclick = (e) => {
        const id = parseInt(e.target.getAttribute('data-id'));
        deleteSummary(id);
      };
    });
  });
}

function deleteSummary(id) {
  chrome.storage.local.get('yt_summaries', (result) => {
    const summaries = result.yt_summaries || [];
    const filtered = summaries.filter((s) => s.id !== id);
    chrome.storage.local.set({ yt_summaries: filtered }, () => {
      loadSummaries();
    });
  });
}

loadSummaries();
