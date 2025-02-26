// Conquest Field Photos - Frontend Logic for Photo Renaming Tool (Capacitor Wrapper)

// Import Capacitor plugins
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { Storage } from '@capacitor/storage';

// PWA Service Worker Registration (for web fallback)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed:', err));
  });
}

// Offline Upload Queue (using local storage for persistence, placeholder for future Google/FTP)
let uploadQueue = [];

async function loadQueue() {
  const { value } = await Storage.get({ key: 'uploadQueue' });
  uploadQueue = value ? JSON.parse(value) : [];
  if (Capacitor.isNative && navigator.onLine) {
    processQueue();
  }
}

async function saveQueue() {
  await Storage.set({ key: 'uploadQueue', value: JSON.stringify(uploadQueue) });
}

function queueUpload(file, destination) {
  uploadQueue.push({ file, destination });
  saveQueue();
  if (Capacitor.isNative && navigator.onLine) {
    processQueue();
  }
}

async function processQueue() {
  const networkStatus = await Network.getStatus();
  if (networkStatus.connected) {
    while (uploadQueue.length > 0) {
      const { file, destination } = uploadQueue.shift();
      if (destination === 'google') {
        alert('Upload to Google Drive is coming soon.');
      } else if (destination === 'ftp') {
        alert('Upload to FTP is coming soon.');
      }
    }
    await saveQueue();
  }
}

Network.addListener('networkStatusChange', status => {
  if (status.connected) {
    processQueue();
  }
});

// Load queue on app start
loadQueue();

// File Upload Handling (Using File Input Only)
const fileInput = document.getElementById('fileInput');
const imagePreviews = document.getElementById('imagePreviews');
const renameButton = document.getElementById('renameButton');
const downloadZipButton = document.getElementById('downloadZip');
const photoListInput = document.getElementById('photoList');
const photoChecklist = document.getElementById('photoChecklist');
const uploadOptions = document.querySelectorAll('input[name="uploadDestination"]');

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
});

async function handleFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      let fileData;
      if (Capacitor.isNative) {
        // Read native file
        fileData = await Filesystem.readFile({
          path: file.path,
          directory: Directory.Data,
        });
      } else {
        // Web file handling
        fileData = file;
      }

      const formData = new FormData();
      formData.append('file', fileData, file.name);

      try {
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.success) {
          displayImage(data.filename, file.name);
          updateChecklist();
        } else {
          alert('Error uploading file: ' + data.error);
        }
      } catch (error) {
        alert('Upload failed: ' + error.message);
      }
    } else {
      alert('Only image files are allowed.');
    }
  }
}

function displayImage(filename, name) {
  const preview = document.createElement('div');
  preview.className = 'image-preview';
  preview.dataset.filename = filename;

  const img = document.createElement('img');
  img.src = Capacitor.isNative ? `data:image/jpeg;base64,${filename}` : `/uploads/${filename}`;
  img.alt = name;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = name;

  preview.appendChild(img);
  preview.appendChild(nameSpan);
  imagePreviews.appendChild(preview);
}

// Photo Checklist with Interactive Popup
function updateChecklist() {
  const list = photoListInput.value.split('\n').map(line => line.trim()).filter(line => line);
  const uploadedFiles = Array.from(document.querySelectorAll('.image-preview')).map(img => img.dataset.filename);
  photoChecklist.innerHTML = '';

  let hasMissing = false;

  list.forEach(photo => {
    const li = document.createElement('li');
    li.textContent = photo;
    if (!uploadedFiles.includes(photo)) {
      li.classList.add('missing');
      li.textContent += ' (Missing)';
      hasMissing = true;
    }
    photoChecklist.appendChild(li);
  });

  // Store missing photos for popup
  window.missingPhotos = hasMissing ? list.filter(photo => !uploadedFiles.includes(photo)) : [];
}

photoListInput.addEventListener('input', updateChecklist);

// Check for missing photos before renaming
renameButton.addEventListener('click', () => {
  if (window.missingPhotos && window.missingPhotos.length > 0) {
    const confirmProceed = confirm(`The following photos are missing: ${window.missingPhotos.join(', ')}\nProceed anyway or go back to fix?`);
    if (!confirmProceed) {
      return; // Go back to fix missing photos
    }
  }

  const files = Array.from(document.querySelectorAll('.image-preview')).map(preview => preview.dataset.filename);

  fetch('/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      alert('Files renamed successfully!');
      downloadZipButton.style.display = 'block';
    } else {
      alert('Error renaming files: ' + data.error);
    }
  })
  .catch(error => alert('Rename failed: ' + error.message));
});

downloadZipButton.addEventListener('click', () => {
  window.location.href = '/download';
});

// Google Drive Upload (Disabled, Coming Soon)
document.getElementById('uploadToDrive').addEventListener('click', () => {
  alert('Upload to Google Drive is coming soon.');
});

// FTP Upload (Disabled, Coming Soon)
document.getElementById('uploadToFtp').addEventListener('click', () => {
  alert('Upload to FTP is coming soon.');
});

// Handle Upload Destination Selection
uploadOptions.forEach(option => {
  option.addEventListener('change', (e) => {
    const destination = e.target.value;
    if (destination === 'local') {
      renameButton.style.display = 'block';
      downloadZipButton.style.display = 'none';
      document.getElementById('uploadToDrive').style.display = 'none';
      document.getElementById('uploadToFtp').style.display = 'none';
    } else if (destination === 'google') {
      renameButton.style.display = 'none';
      downloadZipButton.style.display = 'none';
      document.getElementById('uploadToDrive').style.display = 'block';
      document.getElementById('uploadToFtp').style.display = 'none';
    } else if (destination === 'ftp') {
      renameButton.style.display = 'none';
      downloadZipButton.style.display = 'none';
      document.getElementById('uploadToDrive').style.display = 'none';
      document.getElementById('uploadToFtp').style.display = 'block';
    }
  });
});
