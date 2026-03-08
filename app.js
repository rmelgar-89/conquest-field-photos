// Utility: safely escape HTML to prevent XSS
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// Listen for DOM content loaded to ensure textarea starts empty
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('photo-names');
  textarea.value = ''; // Explicitly clear any default value
});

// Listen for submission of the photo names form
document.getElementById('photo-names-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const textarea = document.getElementById('photo-names');
  textarea.value = textarea.value.trim();
  const names = textarea.value.split('\n').filter(Boolean);
  generatePhotoUploadForm(names);
});

// Handle "Back" button to return to names input
document.getElementById('back-button').addEventListener('click', () => {
  document.getElementById('photo-upload-section').style.display = 'none';
  document.getElementById('photo-names-section').style.display = 'block';
});

// Generate the photo upload form based on the provided photo names
function generatePhotoUploadForm(names) {
  const form = document.getElementById('photo-upload-form');
  form.innerHTML = '';
  names.forEach((rawName, index) => {
    const name = rawName.trim();
    const safeId = `photo-group-${index}`;
    const div = document.createElement('div');
    div.classList.add('photo-group');
    div.setAttribute('data-name', name);
    div.id = safeId;

    const label = document.createElement('label');
    label.textContent = name;
    label.setAttribute('for', `file-input-${index}-0`);
    div.appendChild(label);

    const fileInputsDiv = document.createElement('div');
    fileInputsDiv.classList.add('file-inputs');

    const dropZone = document.createElement('div');
    dropZone.classList.add('drop-zone');
    dropZone.setAttribute('role', 'region');
    dropZone.setAttribute('aria-label', `Drop zone for ${name}`);
    dropZone.textContent = 'Drag & drop photos here, or use the file picker below';

    const fileInputDiv = document.createElement('div');
    fileInputDiv.classList.add('file-input');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.setAttribute('data-name', name);
    input.id = `file-input-${index}-0`;
    input.setAttribute('aria-label', `Upload photo for ${name}`);
    fileInputDiv.appendChild(input);

    fileInputsDiv.appendChild(dropZone);
    fileInputsDiv.appendChild(fileInputDiv);
    div.appendChild(fileInputsDiv);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.classList.add('add-photo-btn');
    addBtn.setAttribute('data-name', name);
    addBtn.setAttribute('data-index', String(index));
    addBtn.textContent = 'Add Photo';
    div.appendChild(addBtn);

    form.appendChild(div);
  });
  document.getElementById('photo-names-section').style.display = 'none';
  document.getElementById('photo-upload-section').style.display = 'block';
}

// Track file input counter per group for unique IDs
const fileInputCounters = {};

// Handle adding additional photo inputs for each name
document.getElementById('photo-upload-form').addEventListener('click', (event) => {
  if (event.target && event.target.classList.contains('add-photo-btn')) {
    const name = event.target.getAttribute('data-name');
    const groupIndex = event.target.getAttribute('data-index');
    const photoGroup = event.target.parentNode;
    const fileInputsDiv = photoGroup.querySelector('.file-inputs');

    if (!fileInputCounters[groupIndex]) fileInputCounters[groupIndex] = 1;
    fileInputCounters[groupIndex]++;
    const counter = fileInputCounters[groupIndex];

    const newFileInputDiv = document.createElement('div');
    newFileInputDiv.classList.add('file-input');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.setAttribute('data-name', name);
    input.id = `file-input-${groupIndex}-${counter}`;
    input.setAttribute('aria-label', `Upload additional photo for ${name}`);
    newFileInputDiv.appendChild(input);

    fileInputsDiv.appendChild(newFileInputDiv);
  }
});

// Handle image previews when a file is selected
document.getElementById('photo-upload-form').addEventListener('change', (event) => {
  if (event.target && event.target.matches('input[type="file"]')) {
    handleFileSelect(event);
  }
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  const parent = event.target.parentNode;

  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      let previewContainer = parent.querySelector('.preview-container');
      if (!previewContainer) {
        previewContainer = document.createElement('div');
        previewContainer.classList.add('preview-container');
        parent.appendChild(previewContainer);
      }
      previewContainer.innerHTML = '';

      const img = document.createElement('img');
      img.src = e.target.result;
      img.alt = `Preview of ${file.name}`;
      previewContainer.appendChild(img);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.classList.add('remove-photo-btn');
      removeBtn.textContent = 'Remove';
      removeBtn.setAttribute('aria-label', `Remove photo ${file.name}`);
      removeBtn.addEventListener('click', () => {
        event.target.value = '';
        previewContainer.remove();
      });
      previewContainer.appendChild(removeBtn);
    };
    reader.readAsDataURL(file);
  }
}

// Drag and drop support
document.getElementById('photo-upload-form').addEventListener('dragover', (e) => {
  const dropZone = e.target.closest('.drop-zone');
  if (dropZone) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  }
});

document.getElementById('photo-upload-form').addEventListener('dragleave', (e) => {
  const dropZone = e.target.closest('.drop-zone');
  if (dropZone) {
    dropZone.classList.remove('drag-over');
  }
});

document.getElementById('photo-upload-form').addEventListener('drop', (e) => {
  const dropZone = e.target.closest('.drop-zone');
  if (!dropZone) return;
  e.preventDefault();
  dropZone.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  if (files.length === 0) return;

  const photoGroup = dropZone.closest('.photo-group');
  const fileInputsDiv = photoGroup.querySelector('.file-inputs');
  const emptyInputs = Array.from(fileInputsDiv.querySelectorAll('input[type="file"]'))
    .filter(input => input.files.length === 0);

  files.forEach((file, i) => {
    let input;
    if (i < emptyInputs.length) {
      input = emptyInputs[i];
    } else {
      const newDiv = document.createElement('div');
      newDiv.classList.add('file-input');
      input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.setAttribute('data-name', photoGroup.getAttribute('data-name'));
      input.setAttribute('aria-label', `Upload additional photo for ${photoGroup.getAttribute('data-name')}`);
      newDiv.appendChild(input);
      fileInputsDiv.appendChild(newDiv);
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
});

// Generate and save ZIP file
async function generateAndSaveZip(zip, filename) {
  const progressBar = document.getElementById('progress-bar');
  const progressContainer = document.getElementById('progress-container');
  progressContainer.style.display = 'block';

  try {
    const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
      progressBar.style.width = `${metadata.percent.toFixed(0)}%`;
      progressBar.textContent = `${metadata.percent.toFixed(0)}%`;
      progressBar.setAttribute('aria-valuenow', metadata.percent.toFixed(0));
    });
    saveAs(content, filename);
  } catch (err) {
    alert(`Error generating ZIP file: ${err.message}`);
  } finally {
    progressContainer.style.display = 'none';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';
  }
}

// Build a date-stamped ZIP filename
function buildZipFilename() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  return `photos-${dateStr}.zip`;
}

// Handle processing of the uploaded photos
document.getElementById('process-button').addEventListener('click', async () => {
  const photoGroups = document.querySelectorAll('.photo-group');
  const zip = new JSZip();
  const missingPhotos = [];
  let filesAdded = false;

  // Reset any previous "missing" highlights
  photoGroups.forEach(group => group.classList.remove('missing'));

  for (const group of photoGroups) {
    const name = group.querySelector('label').textContent.trim();
    const inputs = group.querySelectorAll('input[type="file"]');
    let fileIndex = 1;
    let filesSelected = false;

    for (const input of inputs) {
      const file = input.files[0];
      if (file) {
        filesSelected = true;
        filesAdded = true;
        try {
          const data = await file.arrayBuffer();
          const extension = file.name.split('.').pop();
          const fileName = fileIndex > 1 ? `${name}_${fileIndex}.${extension}` : `${name}.${extension}`;
          zip.file(fileName, data);
          fileIndex++;
        } catch (err) {
          alert(`Error reading file for "${name}": ${err.message}`);
          return;
        }
      }
    }

    if (!filesSelected) {
      missingPhotos.push(name);
    }
  }

  if (missingPhotos.length > 0) {
    showMissingPhotosPopup(missingPhotos, photoGroups, filesAdded, zip);
  } else if (filesAdded) {
    await generateAndSaveZip(zip, buildZipFilename());
  } else {
    alert('No files were uploaded. Please upload at least one file to generate the ZIP.');
  }
});

function showMissingPhotosPopup(missingPhotos, photoGroups, filesAdded, zip) {
  const popup = document.createElement('div');
  popup.classList.add('popup');
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-label', 'Missing photos warning');

  const content = document.createElement('div');
  content.classList.add('popup-content');

  const message = document.createElement('p');
  message.textContent = 'Warning: No files were uploaded for the following names:';
  content.appendChild(message);

  const list = document.createElement('ul');
  missingPhotos.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    list.appendChild(li);
  });
  content.appendChild(list);

  const addMissingBtn = document.createElement('button');
  addMissingBtn.id = 'add-missing-btn';
  addMissingBtn.textContent = 'Add Missing Photos';
  addMissingBtn.addEventListener('click', () => {
    document.body.removeChild(popup);
    photoGroups.forEach(group => {
      const groupName = group.getAttribute('data-name');
      if (missingPhotos.includes(groupName)) {
        group.classList.add('missing');
      }
    });
    // Scroll to the first missing group
    const firstMissing = document.querySelector('.photo-group.missing');
    if (firstMissing) firstMissing.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  content.appendChild(addMissingBtn);

  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-anyway-btn';
  downloadBtn.textContent = 'Download Anyway';
  downloadBtn.addEventListener('click', async () => {
    document.body.removeChild(popup);
    if (filesAdded) {
      await generateAndSaveZip(zip, buildZipFilename());
    } else {
      alert('No files were uploaded. Please upload at least one file to generate the ZIP.');
    }
  });
  content.appendChild(downloadBtn);

  popup.appendChild(content);
  document.body.appendChild(popup);

  // Focus the first button for keyboard accessibility
  addMissingBtn.focus();

  // Close popup on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape' && document.body.contains(popup)) {
      document.body.removeChild(popup);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}
