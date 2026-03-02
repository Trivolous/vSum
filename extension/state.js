let currentVideoState = {
  videoId: null,
  activeTab: 'short',
  title: '',
  cachedTranscript: null,
  audioUrl: null,
  wordCount: 0,
  short: { stage: 'idle', percent: 0, data: null, message: '' },
  normal: { stage: 'idle', percent: 0, data: null, message: '' },
  detailed: { stage: 'idle', percent: 0, data: null, message: '' },
  transcript: { stage: 'idle', percent: 0, data: null, message: '' },
};

window.currentVideoState = currentVideoState;
