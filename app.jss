// Conquest Field Photos - Frontend Logic for Photo Renaming Tool (Capacitor Wrapper)

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

// DOM Ready Event to Ensure Elements Exist
document.addEventListener('DOMContentLoaded', () => {
  const photoNamesSection = document.getElementById('photo-names-section');
  const photoUploadSection = document.getElementById('photo-upload-section');
  const photoNamesForm = document.getElementById('photo-names-form');
  const photoUploadForm = document.getElementById('photo-upload-form');
  const processButton = document.getElementById('process-button');
  const photoChecklist = document.getElementById('photoChecklist');
  const uploadOptions = document.querySelectorAll('input[name="uploadDestination"]');

  let uploadedFiles = {};

  // Listen for submission of the photo names form
  photoNamesForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const names = document.getElementById('photo-names').value.split('\n').filter(Boolean);
    generatePhotoUploadForm(names);
  });

  // Generate the photo upload form based on the provided photo names
  function generatePhotoUploadForm(names) {
    photoUploadForm.innerHTML = ''; // Clear existing content
    names.forEach((name) => {
      const div = document.createElement('div');
      div.classList.add('photo-group');
      div.innerHTML = `
        <label>${name.trim()}</label>
        <div class="file-inputs">
          <div class="file-input">
            <input type="file" accept="image/*" data-name="${name.trim()}" />
          </div>
        </div>
        <button type="button" class="add-photo-btn" data-name="${name.trim()}">Add Photo</button>
      `;
      photoUploadForm.appendChild(div);
    });
    photoNamesSection.style.display = 'none';
    photoUploadSection.style.display = 'block';
    window.scrollTo(0, 0); // Scroll to top of upload section
    updateChecklist(); // Initialize checklist on page load
  }

  // Handle adding additional photo inputs for each name
  photoUploadForm.addEventListener('click', (event) => {
    if (event.target && event.target.classList.contains('add-photo-btn')) {
      const name = event.target.getAttribute('data-name');
      const photoGroup = event.target.parentNode;
      const fileInputsDiv = photoGroup.querySelector('.file-inputs');

      const newFileInputDiv = document.createElement('div');
      newFileInputDiv.classList.add('file-input');
      newFileInputDiv.innerHTML = `
        <input type="file" accept="image/*" data-name="${name.trim()}" />
      `;
      fileInputsDiv.appendChild(newFileInputDiv);
    }
  });

  // Handle image previews and uploads when a file is selected
  photoUploadForm.addEventListener('change', (event) => {
    if (event.target && event.target.matches('input[type="file"]')) {
      handleFileSelect(event);
    }
  });

  async function handleFileSelect(event) {
    const file = event.target.files[0];
    const name = event.target.dataset.name;

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        let img = event.target.parentNode.querySelector('img');
        if (!img) {
          img = document.createElement('img');
          img.style.maxWidth = '100px';
          img.style.display = 'block';
          event.target.parentNode.appendChild(img);
        }
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);

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
          event.target.disabled = true; // Prevent re-uploading
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
    const photoGroups = document.querySelectorAll('.photo-group');
    const requiredNames = Array.from(photoGroups).map(group => group.querySelector('label').textContent.trim());
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

  // Handle processing of the uploaded photos
  processButton.addEventListener('click', async () => {
    const photoGroups = document.querySelectorAll('.photo-group');
    const zip = new JSZip();
    let missingPhotos = []; // To store names with missing photos
    let filesAdded = false; // To check if at least one file has been uploaded

    for (const group of photoGroups) {
      const name = group.querySelector('label').textContent.trim();
      const inputs = group.querySelectorAll('input[type="file"]');
      let fileIndex = 1;
      let filesSelected = false;

      for (const input of inputs) {
        const file = input.files[0];
        if (file) {
          filesSelected = true;
          filesAdded = true; // At least one file has been uploaded
          let fileData;
          if (Capacitor.isNative) {
            fileData = await Filesystem.readFile({
              path: file.path,
              directory: Directory.Data,
            });
          } else {
            fileData = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsArrayBuffer(file);
            });
          }
          const extension = file.name.split('.').pop();
          let fileName = `${name}.${extension}`;

          if (fileIndex > 1) {
            fileName = `${name}_${fileIndex}.${extension}`;
          }

          zip.file(fileName, fileData);
          fileIndex++;
        }
      }

      if (!filesSelected) {
        // If no files are selected for this photo name, add it to the missingPhotos array
        missingPhotos.push(name);
      }
    }

    if (missingPhotos.length > 0) {
      // Display a warning message about the missing photos
      const confirmProceed = confirm(`Warning: No files were uploaded for the following names:\n\n${missingPhotos.join('\n')}\n\nProceed anyway or go back to fix?`);
      if (!confirmProceed) {
        return; // Go back to fix missing photos
      }
    } else {
      alert('All pictures renamed successfully!');
    }

    if (filesAdded) {
      // Only generate the ZIP file if at least one file has been uploaded
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, 'renamed-photos.zip');
      });
    } else {
      // If no files were uploaded at all, display an error
      alert('No files were uploaded. Please upload at least one file to generate the ZIP.');
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
        processButton.style.display = 'block';
        document.getElementById('uploadToDrive').style.display = 'none';
        document.getElementById('uploadToFtp').style.display = 'none';
      } else if (destination === 'google') {
        processButton.style.display = 'none';
        document.getElementById('uploadToDrive').style.display = 'block';
        document.getElementById('uploadToFtp').style.display = 'none';
      } else if (destination === 'ftp') {
        processButton.style.display = 'none';
        document.getElementById('uploadToDrive').style.display = 'none';
        document.getElementById('uploadToFtp').style.display = 'block';
      }
    });
  });
});
