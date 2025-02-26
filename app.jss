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

// Page Navigation and State
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const photoListInput = document.getElementById('photoList');
const processButton = document.getElementById('processButton');
const photoUploads = document.getElementById('photoUploads');
const addAdditionalPhotoButton = document.getElementById('addAdditionalPhoto');
const downloadZipButton = document.getElementById('downloadZip');
const photoChecklist = document.getElementById('photoChecklist');
const uploadOptions = document.querySelectorAll('input[name="uploadDestination"]');

let photoNames = [];
let uploadedFiles = {};

// Process Photo Names
processButton.addEventListener('click', () => {
  const names = photoListInput.value.split('\n').map(line => line.trim()).filter(line => line);
  if (names.length === 0) {
    alert('Please enter at least one photo name.');
    return;
  }
  photoNames = names;
  displayPhotoUploads();
  page1.style.display = 'none';
  page2.style.display = 'block';
});

// Display Photo Uploads
function displayPhotoUploads() {
  photoUploads.innerHTML = '';
  const nameCount = {};

  photoNames.forEach((name, index) => {
    nameCount[name] = (nameCount[name] || 0) + 1;
    const version = nameCount[name] > 1 ? `_${nameCount[name]}` : '';
    const fullName = `${name}${version}`;

    const div = document.createElement('div');
    div.className = 'upload-item';
    div.innerHTML = `
      <span>${fullName}</span>
      <input type="file" class="fileInput" data-name="${fullName}" accept="image/*">
    `;
    photoUploads.appendChild(div);
  });

  // Add event listeners for file inputs
  document.querySelectorAll('.fileInput').forEach(input => {
    input.addEventListener('change', (e) => handleFileUpload(e.target));
  });
}

// Add Additional Photo
addAdditionalPhotoButton.addEventListener('click', () => {
  if (photoNames.length === 0) {
    alert('Please process photo names first.');
    return;
  }
  const lastName = photoNames[photoNames.length - 1];
  const nameCount = photoNames.filter(name => name === lastName).length + 1;
  const version = nameCount > 1 ? `_${nameCount}` : '';
  const newName = `${lastName}${version}`;
  photoNames.push(lastName); // Add the base name for counting
  displayPhotoUploads();
});

// Handle File Upload
async function handleFileUpload(input) {
  const file = input.files[0];
  const name = input.dataset.name;

  if (file && file.type.startsWith('image/')) {
    let fileData;
    if (Capacitor.isNative) {
      fileData = await Filesystem.readFile({
        path: file.path,
        directory: Directory.Data,
      });
    } else {
      fileData = file;
    }

    const formData = new FormData();
    formData.append('file', fileData, name);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        uploadedFiles[name] = data.filename;
        input.disabled = true; // Prevent re-uploading
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

// Photo Checklist with Interactive Popup
function updateChecklist() {
  const requiredNames = photoNames.map(name => {
    const counts = {};
    photoNames.forEach(n => counts[n] = (counts[n] || 0) + 1);
    return Array.from({ length: counts[name] }, (_, i) => `${name}${i > 0 ? `_${i + 1}` : ''}`);
  }).flat();
  photoChecklist.innerHTML = '';

  let hasMissing = false;

  requiredNames.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    if (!uploadedFiles[name]) {
      li.classList.add('missing');
      li.textContent += ' (Missing)';
      hasMissing = true;
    }
    photoChecklist.appendChild(li);
  });

  // Store missing photos for popup
  window.missingPhotos = hasMissing ? requiredNames.filter(name => !uploadedFiles[name]) : [];
}

downloadZipButton.addEventListener('click', () => {
  if (window.missingPhotos && window.missingPhotos.length > 0) {
    const confirmProceed = confirm(`The following photos are missing: ${window.missingPhotos.join(', ')}\nProceed anyway or go back to fix?`);
    if (!confirmProceed) {
      return; // Go back to fix missing photos
    }
  } else {
    alert('All pictures renamed successfully!');
  }

  const files = Object.values(uploadedFiles);
  if (files.length > 0) {
    fetch('/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        downloadZipButton.style.display = 'none'; // Hide after download
        window.location.href = '/download';
      } else {
        alert('Error renaming files: ' + data.error);
      }
    })
    .catch(error => alert('Download failed: ' + error.message));
  } else {
    alert('No files uploaded to rename.');
  }
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
      downloadZipButton.style.display = 'block';
      document.getElementById('uploadToDrive').style.display = 'none';
      document.getElementById('uploadToFtp').style.display = 'none';
    } else if (destination === 'google') {
      downloadZipButton.style.display = 'none';
      document.getElementById('uploadToDrive').style.display = 'block';
      document.getElementById('uploadToFtp').style.display = 'none';
    } else if (destination === 'ftp') {
      downloadZipButton.style.display = 'none';
      document.getElementById('uploadToDrive').style.display = 'none';
      document.getElementById('uploadToFtp').style.display = 'block';
    }
  });
});
