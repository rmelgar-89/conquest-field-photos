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

// Offline Upload Queue (using local storage for persistence)
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
        await uploadToDrive(file);
      } else if (destination === 'ftp') {
        await uploadToFtp(file);
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

// Drag-and-Drop and File Upload Handling (Native File Picker for Capacitor)
const dropZone = document.querySelector('.drop-zone');
const imagePreviews = document.getElementById('imagePreviews');
const customNameInput = document.getElementById('customName');
const renameButton = document.getElementById('renameButton');
const downloadZipButton = document.getElementById('downloadZip');
const photoListInput = document.getElementById('photoList');
const photoChecklist = document.getElementById('photoChecklist');
const uploadOptions = document.querySelectorAll('input[name="uploadDestination"]');

// Use Capacitor File Picker for native file access
async function pickFiles() {
  try {
    const result = await Filesystem.pickFiles({
      multiple: true,
      types: ['image/*'],
    });
    handleFiles(result.files);
  } catch (error) {
    alert('Error picking files: ' + error.message);
  }
}

dropZone.addEventListener('click', () => {
  if (Capacitor.isNative) {
    pickFiles();
  } else {
    document.getElementById('fileInput').click();
  }
});

// Web fallback for drag-and-drop
if (!Capacitor.isNative) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
}

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

  const customName = customNameInput.value || 'photo';
  const files = Array.from(document.querySelectorAll('.image-preview')).map(preview => preview.dataset.filename);

  fetch('/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files, customName }),
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

// Google Drive Upload (Placeholder, not implemented yet)
document.getElementById('uploadToDrive').addEventListener('click', () => {
  const file = document.querySelector('input[type="file"]').files[0];
  if (file) {
    queueUpload(file, 'google');
  } else {
    alert('Please select a file first.');
  }
});

async function uploadToDrive(file) {
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
  formData.append('file', fileData, file.name);

  try {
    const response = await fetch('/upload-to-drive', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.success) {
      alert('File uploaded to Google Drive successfully!');
    } else {
      alert('Error uploading to Google Drive: ' + data.error);
    }
  } catch (error) {
    alert('Upload failed: ' + error.message);
  }
}

// FTP Upload (Placeholder, not implemented yet)
document.getElementById('uploadToFtp').addEventListener('click', () => {
  const file = document.querySelector('input[type="file"]').files[0];
  if (file) {
    queueUpload(file, 'ftp');
  } else {
    alert('Please select a file first.');
  }
});

async function uploadToFtp(file) {
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
  formData.append('file', fileData, file.name);

  try {
    const response = await fetch('/upload-to-ftp', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (data.success) {
      alert('File uploaded to FTP successfully!');
    } else {
      alert('Error uploading to FTP: ' + data.error);
    }
  } catch (error) {
    alert('Upload failed: ' + error.message);
  }
}

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
