const apiKey = 'AIzaSyDEWNK7AtvBCSsjyLhqht9bguvwMeAk2_c'; // Replace with your actual API key

function extractPlaylistId(url) {
  if (!url) return '';
  const regex = /[?&]list=([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : url;
}

async function calculateDuration() {
  const urlInput = document.getElementById('playlistUrl');
  const url = urlInput.value.trim();
  const playlistId = extractPlaylistId(url);
  const resultDiv = document.getElementById('result');
  const errorDiv = document.getElementById('error');
  const videoListDiv = document.getElementById('videoList');
  const loadingDiv = document.getElementById('loading');
  const calculateBtn = document.getElementById('calculateBtn');

  // Reset UI
  resultDiv.classList.remove('show');
  errorDiv.classList.remove('show');
  videoListDiv.innerHTML = '';
  errorDiv.innerHTML = '';

  // Input validation
  if (!playlistId) {
    showError('Please enter a valid YouTube Playlist URL or ID.');
    return;
  }

  // Show loading
  loadingDiv.classList.remove('hidden');
  calculateBtn.disabled = true;
  resultDiv.textContent = '';

  try {
    let videoIds = [];
    let nextPageToken = '';

    // Fetch all video IDs
    while (true) {
      const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}&key=${apiKey}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch playlist items. Please check the API key or playlist ID.');
      }
      const data = await response.json();

      if (data.items) {
        videoIds.push(...data.items.map(item => item.contentDetails.videoId));
      }

      if (!data.nextPageToken) break;
      nextPageToken = data.nextPageToken;
    }

    if (videoIds.length === 0) {
      throw new Error('No videos found in the playlist.');
    }

    // Fetch video details
    let totalSeconds = 0;
    videoListDiv.innerHTML = '';

    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50).join(',');
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${batch}&key=${apiKey}`;
      const res = await fetch(detailsUrl);
      if (!res.ok) {
        throw new Error('Failed to fetch video details.');
      }
      const details = await res.json();

      details.items.forEach((video, index) => {
        const duration = video.contentDetails.duration;
        const seconds = parseISODuration(duration);
        totalSeconds += seconds;

        const title = video.snippet.title;
        const thumbnail = video.snippet.thumbnails.default?.url || 'https://via.placeholder.com/120';
        const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

        const videoElement = document.createElement('div');
        videoElement.className = 'video-item';
        videoElement.innerHTML = `
          <a href="${videoUrl}" target="_blank">
            <img src="${thumbnail}" alt="${title} thumbnail">
          </a>
          <div class="video-info">
            <a href="${videoUrl}" target="_blank">${title}</a>
            <p>${formatTime(seconds)}</p>
          </div>
        `;
        videoListDiv.appendChild(videoElement);

        // Animate items
        setTimeout(() => {
          videoElement.classList.add('show');
        }, index * 100);
      });
    }

    resultDiv.textContent = `Total Duration: ${formatTime(totalSeconds)} (${videoIds.length} videos)`;
    resultDiv.classList.add('show');
  } catch (err) {
    showError(err.message || 'Error fetching data. Please check the URL or API key.');
  } finally {
    loadingDiv.classList.add('hidden');
    calculateBtn.disabled = false;
  }
}

function parseISODuration(duration) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const [, hours = 0, minutes = 0, seconds = 0] = duration.match(regex) || [];
  return (+hours * 3600) + (+minutes * 60) + (+seconds);
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  errorDiv.classList.add('show');
}

function resetForm() {
  document.getElementById('playlistUrl').value = '';
  document.getElementById('result').textContent = '';
  document.getElementById('result').classList.remove('show');
  document.getElementById('error').textContent = '';
  document.getElementById('error').classList.remove('show');
  document.getElementById('videoList').innerHTML = '';
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('calculateBtn').disabled = false;
}

// Handle Enter key
document.getElementById('playlistUrl').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    calculateDuration();
  }
});