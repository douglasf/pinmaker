import { PIN_CONFIGS } from './core/types.js';
import { calculateLayout, getTotalPages, createImageDistribution } from './core/layout.js';
import { processImageForCircle, extractEdgeColor, renderPinToCanvas } from './lib/image-processing.js';
import { generatePDF } from './lib/pdf-generator.js';

// App state
const state = {
  images: [],
  pinSize: '32mm',
  duplicate: false,
  currentImageIndex: 0,
};

// Touch gesture state for canvas
let touchState = {
  isPanning: false,
  startX: 0,
  startY: 0,
  lastOffsetX: 0,
  lastOffsetY: 0,
};

// DOM elements
const elements = {
  // Sections
  sectionSelect: document.getElementById('section-select'),
  sectionConfig: document.getElementById('section-config'),
  sectionEdit: document.getElementById('section-edit'),
  sectionPreview: document.getElementById('section-preview'),
  
  // Select section
  inputImages: document.getElementById('input-images'),
  imageList: document.getElementById('image-list'),
  btnNextConfig: document.getElementById('btn-next-config'),
  
  // Config section
  selectPinSize: document.getElementById('select-pin-size'),
  checkboxDuplicate: document.getElementById('checkbox-duplicate'),
  btnBackSelect: document.getElementById('btn-back-select'),
  btnNextEdit: document.getElementById('btn-next-edit'),
  
  // Edit section
  btnPrevPin: document.getElementById('btn-prev-pin'),
  btnNextPin: document.getElementById('btn-next-pin'),
  pinCounter: document.getElementById('pin-counter'),
  canvasPreview: document.getElementById('canvas-preview'),
  btnResetTransform: document.getElementById('btn-reset-transform'),
  sliderZoom: document.getElementById('slider-zoom'),
  labelZoom: document.getElementById('label-zoom'),
  checkboxEdgeColor: document.getElementById('checkbox-edge-color'),
  inputBgColor: document.getElementById('input-bg-color'),
  inputBorderColor: document.getElementById('input-border-color'),
  sliderBorderWidth: document.getElementById('slider-border-width'),
  labelBorderWidth: document.getElementById('label-border-width'),
  textLinesContainer: document.getElementById('text-lines-container'),
  btnAddTextLine: document.getElementById('btn-add-text-line'),
  selectTextPosition: document.getElementById('select-text-position'),
  inputTextColor: document.getElementById('input-text-color'),
  inputTextOutline: document.getElementById('input-text-outline'),
  sliderTextOutlineWidth: document.getElementById('slider-text-outline-width'),
  labelTextOutlineWidth: document.getElementById('label-text-outline-width'),
  btnBackConfig: document.getElementById('btn-back-config'),
  btnPreview: document.getElementById('btn-preview'),
  
  // Preview section
  previewContainer: document.getElementById('preview-container'),
  btnBackEdit: document.getElementById('btn-back-edit'),
  
  // Header
  btnExport: document.getElementById('btn-export'),
  
  // Loading
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
};

// Show section
function showSection(sectionId) {
  Object.values(elements).forEach(el => {
    if (el && el.classList && el.classList.contains('section')) {
      el.classList.remove('active');
    }
  });
  document.getElementById(sectionId).classList.add('active');
}

// Show loading
function showLoading(text = 'Processing...') {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.remove('hidden');
}

// Hide loading
function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

// Update image list UI
function updateImageList() {
  elements.imageList.innerHTML = '';
  
  state.images.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    
    const imgEl = document.createElement('img');
    imgEl.src = img.url;
    imgEl.alt = img.file.name;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'image-item-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeImage(index);
    
    item.appendChild(imgEl);
    item.appendChild(removeBtn);
    elements.imageList.appendChild(item);
  });
  
  elements.btnNextConfig.disabled = state.images.length === 0;
}

// Remove image
function removeImage(index) {
  URL.revokeObjectURL(state.images[index].url);
  state.images.splice(index, 1);
  updateImageList();
}

// Handle image selection
elements.inputImages.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const bitmap = await createImageBitmap(file);
    
    state.images.push({
      file,
      url,
      bitmap,
      zoom: 1.0,
      offsetX: 0,
      offsetY: 0,
      fillWithEdgeColor: false,
      backgroundColor: '',
      borderColor: '',
      borderWidth: 0,
      textLines: [],
      textPosition: 'bottom',
      textColor: '#ffffff',
      textOutline: '#000000',
      textOutlineWidth: 2,
    });
  }
  
  updateImageList();
  e.target.value = ''; // Reset input
});

// Navigation
elements.btnNextConfig.addEventListener('click', () => {
  showSection('section-config');
});

elements.btnBackSelect.addEventListener('click', () => {
  showSection('section-select');
});

elements.btnNextEdit.addEventListener('click', () => {
  state.pinSize = elements.selectPinSize.value;
  state.duplicate = elements.checkboxDuplicate.checked;
  state.currentImageIndex = 0;
  
  // Calculate total circles
  const config = PIN_CONFIGS[state.pinSize];
  const totalCircles = state.duplicate 
    ? Math.max(state.images.length, config.circlesPerPage)
    : state.images.length;
  
  // Expand state.images array to match totalCircles if duplicating
  if (state.duplicate && totalCircles > state.images.length) {
    const distribution = createImageDistribution(state.images.length, totalCircles);
    const expandedImages = distribution.map(idx => {
      const original = state.images[idx];
      return {
        file: original.file,
        url: original.url,
        bitmap: original.bitmap,
        zoom: original.zoom,
        offsetX: original.offsetX,
        offsetY: original.offsetY,
        fillWithEdgeColor: original.fillWithEdgeColor,
        backgroundColor: original.backgroundColor,
        borderColor: original.borderColor,
        borderWidth: original.borderWidth,
        textLines: [...original.textLines],
        textPosition: original.textPosition,
        textColor: original.textColor,
        textOutline: original.textOutline,
        textOutlineWidth: original.textOutlineWidth,
      };
    });
    state.images = expandedImages;
  }
  
  updatePinEditor();
  showSection('section-edit');
});

elements.btnBackConfig.addEventListener('click', () => {
  showSection('section-config');
});

elements.btnPreview.addEventListener('click', async () => {
  await generatePreview();
  showSection('section-preview');
});

elements.btnBackEdit.addEventListener('click', () => {
  showSection('section-edit');
});

// Pin navigation
elements.btnPrevPin.addEventListener('click', () => {
  if (state.currentImageIndex > 0) {
    saveCurrentPinSettings();
    state.currentImageIndex--;
    updatePinEditor();
  }
});

elements.btnNextPin.addEventListener('click', () => {
  if (state.currentImageIndex < state.images.length - 1) {
    saveCurrentPinSettings();
    state.currentImageIndex++;
    updatePinEditor();
  }
});

// Save current pin settings
function saveCurrentPinSettings() {
  const img = state.images[state.currentImageIndex];
  img.zoom = parseFloat(elements.sliderZoom.value);
  img.fillWithEdgeColor = elements.checkboxEdgeColor.checked;
  img.backgroundColor = elements.inputBgColor.value;
  img.borderColor = elements.inputBorderColor.value;
  img.borderWidth = parseFloat(elements.sliderBorderWidth.value);
  img.textPosition = elements.selectTextPosition.value;
  img.textColor = elements.inputTextColor.value;
  img.textOutline = elements.inputTextOutline.value;
  img.textOutlineWidth = parseFloat(elements.sliderTextOutlineWidth.value);
  
  // Save text lines
  img.textLines = Array.from(elements.textLinesContainer.querySelectorAll('.text-line-group')).map(group => {
    const textInput = group.querySelector('.text-line-input');
    const sizeInput = group.querySelector('.text-line-size');
    return {
      text: textInput.value,
      size: sizeInput.value ? parseFloat(sizeInput.value) : undefined,
    };
  }).filter(line => line.text.trim() !== '');
}

// Update pin editor UI
function updatePinEditor() {
  const img = state.images[state.currentImageIndex];
  
  // Update navigation
  elements.pinCounter.textContent = `Pin ${state.currentImageIndex + 1} of ${state.images.length}`;
  elements.btnPrevPin.disabled = state.currentImageIndex === 0;
  elements.btnNextPin.disabled = state.currentImageIndex === state.images.length - 1;
  
  // Update controls
  elements.sliderZoom.value = img.zoom;
  elements.labelZoom.textContent = img.zoom.toFixed(1);
  elements.checkboxEdgeColor.checked = img.fillWithEdgeColor;
  elements.inputBgColor.value = img.backgroundColor || '#ffffff';
  elements.inputBorderColor.value = img.borderColor || '#000000';
  elements.sliderBorderWidth.value = img.borderWidth;
  elements.labelBorderWidth.textContent = img.borderWidth.toFixed(1);
  elements.selectTextPosition.value = img.textPosition;
  elements.inputTextColor.value = img.textColor;
  elements.inputTextOutline.value = img.textOutline;
  elements.sliderTextOutlineWidth.value = img.textOutlineWidth;
  elements.labelTextOutlineWidth.textContent = img.textOutlineWidth.toFixed(1);
  
  // Update text lines
  elements.textLinesContainer.innerHTML = '';
  img.textLines.forEach((line) => {
    addTextLineUI(line.text, line.size);
  });
  
  // Reset touch state
  touchState.lastOffsetX = img.offsetX;
  touchState.lastOffsetY = img.offsetY;
  
  // Render preview
  renderPinPreview();
}

// Add text line UI
function addTextLineUI(text = '', size = '') {
  const group = document.createElement('div');
  group.className = 'text-line-group';
  
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'text-line-input-wrapper';
  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.className = 'input text-line-input';
  textInput.placeholder = 'Text...';
  textInput.value = text;
  textInput.addEventListener('input', renderPinPreview);
  inputWrapper.appendChild(textInput);
  
  const sizeWrapper = document.createElement('div');
  sizeWrapper.className = 'text-line-size-wrapper';
  const sizeInput = document.createElement('input');
  sizeInput.type = 'number';
  sizeInput.className = 'input text-line-size';
  sizeInput.placeholder = 'Size';
  sizeInput.value = size;
  sizeInput.min = '8';
  sizeInput.max = '72';
  sizeInput.addEventListener('input', renderPinPreview);
  sizeWrapper.appendChild(sizeInput);
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'text-line-remove';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => {
    group.remove();
    renderPinPreview();
  };
  
  group.appendChild(inputWrapper);
  group.appendChild(sizeWrapper);
  group.appendChild(removeBtn);
  elements.textLinesContainer.appendChild(group);
}

elements.btnAddTextLine.addEventListener('click', () => {
  addTextLineUI();
});

// Control listeners
elements.sliderZoom.addEventListener('input', (e) => {
  elements.labelZoom.textContent = parseFloat(e.target.value).toFixed(1);
  renderPinPreview();
});

elements.sliderBorderWidth.addEventListener('input', (e) => {
  elements.labelBorderWidth.textContent = parseFloat(e.target.value).toFixed(1);
  renderPinPreview();
});

elements.sliderTextOutlineWidth.addEventListener('input', (e) => {
  elements.labelTextOutlineWidth.textContent = parseFloat(e.target.value).toFixed(1);
  renderPinPreview();
});

elements.checkboxEdgeColor.addEventListener('change', renderPinPreview);
elements.inputBgColor.addEventListener('input', renderPinPreview);
elements.inputBorderColor.addEventListener('input', renderPinPreview);
elements.selectTextPosition.addEventListener('change', renderPinPreview);
elements.inputTextColor.addEventListener('input', renderPinPreview);
elements.inputTextOutline.addEventListener('input', renderPinPreview);

elements.btnResetTransform.addEventListener('click', () => {
  const img = state.images[state.currentImageIndex];
  img.zoom = 1.0;
  img.offsetX = 0;
  img.offsetY = 0;
  touchState.lastOffsetX = 0;
  touchState.lastOffsetY = 0;
  elements.sliderZoom.value = 1.0;
  elements.labelZoom.textContent = '1.0';
  renderPinPreview();
});

// Canvas touch handling
elements.canvasPreview.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    e.preventDefault();
    touchState.isPanning = true;
    touchState.startX = e.touches[0].clientX;
    touchState.startY = e.touches[0].clientY;
  }
});

elements.canvasPreview.addEventListener('touchmove', (e) => {
  if (touchState.isPanning && e.touches.length === 1) {
    e.preventDefault();
    const deltaX = e.touches[0].clientX - touchState.startX;
    const deltaY = e.touches[0].clientY - touchState.startY;
    
    const img = state.images[state.currentImageIndex];
    img.offsetX = touchState.lastOffsetX + deltaX * 0.5; // Scale factor for sensitivity
    img.offsetY = touchState.lastOffsetY + deltaY * 0.5;
    
    renderPinPreview();
  }
});

elements.canvasPreview.addEventListener('touchend', () => {
  if (touchState.isPanning) {
    touchState.isPanning = false;
    const img = state.images[state.currentImageIndex];
    touchState.lastOffsetX = img.offsetX;
    touchState.lastOffsetY = img.offsetY;
  }
});

// Mouse drag support for desktop
elements.canvasPreview.addEventListener('mousedown', (e) => {
  touchState.isPanning = true;
  touchState.startX = e.clientX;
  touchState.startY = e.clientY;
});

elements.canvasPreview.addEventListener('mousemove', (e) => {
  if (touchState.isPanning) {
    const deltaX = e.clientX - touchState.startX;
    const deltaY = e.clientY - touchState.startY;
    
    const img = state.images[state.currentImageIndex];
    img.offsetX = touchState.lastOffsetX + deltaX * 0.5;
    img.offsetY = touchState.lastOffsetY + deltaY * 0.5;
    
    renderPinPreview();
  }
});

elements.canvasPreview.addEventListener('mouseup', () => {
  if (touchState.isPanning) {
    touchState.isPanning = false;
    const img = state.images[state.currentImageIndex];
    touchState.lastOffsetX = img.offsetX;
    touchState.lastOffsetY = img.offsetY;
  }
});

elements.canvasPreview.addEventListener('mouseleave', () => {
  touchState.isPanning = false;
});

// Render pin preview
async function renderPinPreview() {
  saveCurrentPinSettings();
  
  const img = state.images[state.currentImageIndex];
  const config = PIN_CONFIGS[state.pinSize];
  
  // Set canvas size
  const displaySize = 400;
  elements.canvasPreview.width = displaySize;
  elements.canvasPreview.height = displaySize;
  
  const ctx = elements.canvasPreview.getContext('2d');
  if (!ctx) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, displaySize, displaySize);
  
  // Process image
  const processedBitmap = await processImageForCircle(
    img.bitmap,
    config.pinSizePt,
    config.circleSizePt,
    img.zoom,
    img.offsetX,
    img.offsetY
  );
  
  // Extract edge color if needed
  let edgeColor;
  if (img.fillWithEdgeColor) {
    edgeColor = await extractEdgeColor(processedBitmap);
  }
  
  // Scale to display size
  const scale = displaySize / config.circleSizePt;
  ctx.save();
  ctx.scale(scale, scale);
  
  // Render pin
  renderPinToCanvas(
    ctx,
    processedBitmap,
    config.circleSizePt / 2,
    config.circleSizePt / 2,
    config,
    img,
    edgeColor
  );
  
  ctx.restore();
}

// Generate preview
async function generatePreview() {
  showLoading('Generating preview...');
  
  try {
    saveCurrentPinSettings();
    
    const config = PIN_CONFIGS[state.pinSize];
    const positions = calculateLayout(state.images.length, config);
    const totalPages = getTotalPages(positions);
    
    elements.previewContainer.innerHTML = '';
    
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pagePositions = positions.filter(p => p.page === pageIdx);
      
      // Create canvas for this page (A4 size scaled down)
      const scale = 0.5; // Scale factor for preview
      const canvas = document.createElement('canvas');
      canvas.width = 595.28 * scale;
      canvas.height = 841.89 * scale;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(scale, scale);
      
      // Render each pin on this page
      for (const pos of pagePositions) {
        const circleIdx = positions.indexOf(pos);
        const img = state.images[circleIdx];
        
        if (!img.bitmap) {
          img.bitmap = await createImageBitmap(img.file);
        }
        
        const processedBitmap = await processImageForCircle(
          img.bitmap,
          config.pinSizePt,
          config.circleSizePt,
          img.zoom,
          img.offsetX,
          img.offsetY
        );
        
        let edgeColor;
        if (img.fillWithEdgeColor) {
          edgeColor = await extractEdgeColor(processedBitmap);
        }
        
        renderPinToCanvas(ctx, processedBitmap, pos.x, pos.y, config, img, edgeColor);
      }
      
      ctx.restore();
      
      // Add to preview container
      const pageDiv = document.createElement('div');
      pageDiv.className = 'preview-page';
      
      const label = document.createElement('div');
      label.className = 'preview-page-label';
      label.textContent = `Page ${pageIdx + 1} of ${totalPages}`;
      
      pageDiv.appendChild(label);
      pageDiv.appendChild(canvas);
      elements.previewContainer.appendChild(pageDiv);
    }
    
    elements.btnExport.disabled = false;
  } catch (error) {
    console.error('Preview error:', error);
    alert('Failed to generate preview: ' + error.message);
  } finally {
    hideLoading();
  }
}

// Export PDF
elements.btnExport.addEventListener('click', async () => {
  showLoading('Generating PDF...');
  
  try {
    const pdfBytes = await generatePDF(state);
    
    // Download PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pins.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    hideLoading();
    alert('PDF generated successfully!');
  } catch (error) {
    console.error('PDF generation error:', error);
    alert('Failed to generate PDF: ' + error.message);
    hideLoading();
  }
});
