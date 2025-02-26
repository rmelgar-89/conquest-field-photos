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

// Handle processing of the uploaded photos
document.getElementById('process-button').addEventListener('click', async () => {
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
        const data = await file.arrayBuffer();
        const extension = file.name.split('.').pop();
        let fileName = `${name}.${extension}`;

        if (fileIndex > 1) {
          fileName = `${name}_${fileIndex}.${extension}`;
        }

        zip.file(fileName, data);
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
    alert(`Warning: No files were uploaded for the following names:\n\n${missingPhotos.join('\n')}`);
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
