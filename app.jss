// Listen for submission of the photo names form
document.getElementById('photo-names-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const names = document
    .getElementById('photo-names')
    .value.split('\n')
    .filter(Boolean);
  generatePhotoUploadForm(names);
});

// Generate the photo upload form based on the provided photo names
function generatePhotoUploadForm(names) {
  const form = document.getElementById('photo-upload-form');
  form.innerHTML = ''; // Clear existing content
  names.forEach((name) => {
    const div = document.createElement('div');
    div.classList.add('photo-group');
    div.setAttribute('data-name', name.trim()); // Add data-name for easier identification
    div.innerHTML = `
      <label>${name}</label>
      <div class="file-inputs">
        <div class="file-input">
          <input type="file" accept="image/*" data-name="${name.trim()}" />
        </div>
      </div>
      <button type="button" class="add-photo-btn" data-name="${name.trim()}">Add Photo</button>
    `;
    form.appendChild(div);
  });
  document.getElementById('photo-names-section').style.display = 'none';
  document.getElementById('photo-upload-section').style.display = 'block';
}

// Handle adding additional photo inputs for each name
document.getElementById('photo-upload-form').addEventListener('click', (event) => {
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

// Handle image previews when a file is selected
document.getElementById('photo-upload-form').addEventListener('change', (event) => {
  if (event.target && event.target.matches('input[type="file"]')) {
    handleFileSelect(event);
  }
});

function handleFileSelect(event) {
  const file = event.target.files[0];

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
  }
}

// Function to generate ZIP file (moved out for reuse)
function generateZip(photoGroups) {
  const zip = new JSZip();
  let filesAdded = false;

  for (const group of photoGroups) {
    const name = group.querySelector('label').textContent.trim();
    const inputs = group.querySelectorAll('input[type="file"]');
    let fileIndex = 1;

    for (const input of inputs) {
      const file = input.files[0];
      if (file) {
        filesAdded = true;
        const data = file.arrayBuffer(); // Note: This returns a Promise, handled below
        const extension = file.name.split('.').pop();
        let fileName = `${name}.${extension}`;

        if (fileIndex > 1) {
          fileName = `${name}_${fileIndex}.${extension}`;
        }

        zip.file(fileName, data);
        fileIndex++;
      }
    }
  }

  return { zip, filesAdded };
}

// Handle processing of the uploaded photos
document.getElementById('process-button').addEventListener('click', async () => {
  const photoGroups = document.querySelectorAll('.photo-group');
  let missingPhotos = []; // To store names with missing photos

  // Reset any previous "missing" highlights
  photoGroups.forEach(group => group.classList.remove('missing'));

  // Check for missing photos
  for (const group of photoGroups) {
    const name = group.querySelector('label').textContent.trim();
    const inputs = group.querySelectorAll('input[type="file"]');
    let filesSelected = false;

    for (const input of inputs) {
      if (input.files[0]) {
        filesSelected = true;
        break;
      }
    }

    if (!filesSelected) {
      missingPhotos.push(name);
    }
  }

  if (missingPhotos.length > 0) {
    // Create a custom popup instead of alert for better control
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = `
      <div class="popup-content">
        <p>Warning: No files were uploaded for the following names:</p>
        <ul>${missingPhotos.map(name => `<li>${name}</li>`).join('')}</ul>
        <button id="add-missing-btn">Add Missing Photos</button>
        <button id="download-anyway-btn">Download Anyway</button>
      </div>
    `;
    document.body.appendChild(popup);

    // Add event listeners for popup buttons
    document.getElementById('add-missing-btn').addEventListener('click', () => {
      document.body.removeChild(popup);
      // Highlight missing photo groups in red
      photoGroups.forEach(group => {
        const name = group.getAttribute('data-name');
        if (missingPhotos.includes(name)) {
          group.classList.add('missing');
        }
      });
    });

    document.getElementById('download-anyway-btn').addEventListener('click', async () => {
      document.body.removeChild(popup);
      const { zip, filesAdded } = generateZip(photoGroups);
      if (filesAdded) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'renamed-photos.zip');
      } else {
        alert('No files were uploaded. Please upload at least one file to generate the ZIP.');
      }
    });
  } else {
    // No missing photos, proceed directly to download
    const { zip, filesAdded } = generateZip(photoGroups);
    if (filesAdded) {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'renamed-photos.zip');
    } else {
      alert('No files were uploaded. Please upload at least one file to generate the ZIP.');
    }
  }
});
