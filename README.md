# Conquest Field Photos

A mobile-friendly photo renaming tool for field network engineers by Conquest Technologies.

## Overview

The Conquest Field Photos application allows users to upload photos corresponding to a list of custom photo names. Users can enter a list of names, upload multiple photos for each name, and download the renamed photos in a ZIP file. The app is designed to be flexible, allowing users to skip uploading photos for certain names while still generating the ZIP file with a warning about any missing files.

## Features

- **Custom Photo Names Input**: Users can input a list of photo names, one per line.
- **Multiple Photo Uploads**: For each photo name, users can upload multiple photos and dynamically add additional file inputs.
- **Drag & Drop**: Drag and drop photos directly onto each name's drop zone.
- **Camera Capture**: On mobile devices, take photos directly using the device camera.
- **Image Previews**: Uploaded photos are displayed as thumbnails with remove buttons.
- **ZIP File Generation**: All uploaded photos are renamed according to the provided names and compressed into a date-stamped downloadable ZIP file.
- **Progress Indicator**: Visual progress bar during ZIP generation.
- **Missing File Warning**: Users are warned about any missing photos and can scroll directly to the missing entries.
- **Back Navigation**: Return to edit photo names after advancing to the upload step.
- **PWA Support**: Works offline via service worker caching.
- **Accessible**: ARIA labels, keyboard navigation, and focus management.

## How to Use

1. **Enter Photo Names**: On the main screen, enter a list of photo names, one per line. Click **Next** to generate the file upload form.
2. **Upload Photos**: For each photo name, upload one or more photos via file picker, camera, or drag & drop. Click **Add Photo** to add more slots.
3. **Process Files**: Click **Process**. If some photo names are missing uploaded files, you will receive a warning with options to add missing photos or download anyway.
4. **Download the ZIP File**: The app will generate a ZIP file containing the renamed photos, which you can download.
