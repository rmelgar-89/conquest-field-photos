const express = require('express');
const multer = require('multer');
const exifParser = require('exif-parser');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('.')); // Serve static files
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const parser = exifParser.create(fs.readBufferSync(req.file.path));
    const exifData = parser.parse();
    const dateTaken = exifData.tags && exifData.tags.DateTimeOriginal ? exifData.tags.DateTimeOriginal : new Date().toISOString().split('T')[0];

    res.json({ success: true, filename: req.file.filename });
  } catch (error) {
    res.json({ success: true, filename: req.file.filename }); // Fallback if no EXIF data
  }
});

app.post('/rename', (req, res) => {
  const { files } = req.body;
  const output = fs.createWriteStream('output.zip');
  const archive = archiver('zip');

  output.on('close', () => {
    console.log(`${archive.pointer()} total bytes`);
    res.json({ success: true });
  });

  archive.on('error', (err) => {
    res.status(500).json({ success: false, error: err.message });
  });

  archive.pipe(output);

  files.forEach((file, index) => {
    const oldPath = path.join('uploads', file);
    const newName = `photo_${index + 1}.jpg`; // Default naming (reverts to original behavior)
    const newPath = path.join('uploads', newName);

    fs.renameSync(oldPath, newPath);
    archive.file(newPath, { name: newName });
  });

  archive.finalize();

  // Clean up files after ZIP creation
  res.on('finish', () => {
    fs.readdirSync('uploads/').forEach(file => fs.unlinkSync(path.join('uploads/', file)));
    fs.unlinkSync('output.zip');
  });
});

app.get('/download', (req, res) => {
  res.download('output.zip', 'renamed_photos.zip', (err) => {
    if (err) {
      res.status(500).send('Error downloading ZIP');
    }
    fs.unlinkSync('output.zip'); // Clean up ZIP after download
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
