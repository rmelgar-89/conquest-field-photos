// Conquest Field Photos - Frontend Logic for Photo Renaming Tool

document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('fileInput');
  const imagePreviews = document.getElementById('imagePreviews');
  const renameButton = document.getElementById('renameButton');
  const downloadZipButton = document.getElementById('downloadZip');

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
  });

  function handleFiles(files) {
    imagePreviews.innerHTML = ''; // Clear previous previews
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
          method: 'POST',
          body: formData,
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            displayImage(data.filename, file.name);
          } else {
            alert('Error uploading file: ' + data.error);
          }
        })
        .catch(error => alert('Upload failed: ' + error.message));
      } else {
        alert('Only image files are allowed.');
      }
    });
  }

  function displayImage(filename, name) {
    const preview = document.createElement('div');
    preview.className = 'image-preview';
    preview.dataset.filename = filename;

    const img = document.createElement('img');
    img.src = `/uploads/${filename}`;
    img.alt = name;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name;

    preview.appendChild(img);
    preview.appendChild(nameSpan);
    imagePreviews.appendChild(preview);
  }

  renameButton.addEventListener('click', () => {
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
});
