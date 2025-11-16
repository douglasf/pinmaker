import { PIN_CONFIGS } from './core/types.js';
import { calculateLayout, getTotalPages, createImageDistribution } from './core/layout.js';
import { processImageForCircle, extractEdgeColor, renderPinToCanvas } from './lib/image-processing.js';
import { generatePDF } from './lib/pdf-generator.js';

// App state
const state = {
  images: [], // Unique images only
  imageDistribution: [], // Maps circle index to unique image index
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
  isPinching: false,
  initialDistance: 0,
  initialZoom: 1.0,
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
  
  // Header elements
  headerTitle: document.getElementById('header-title'),
  headerPinNavigator: document.getElementById('header-pin-navigator'),
  btnPrevPinHeader: document.getElementById('btn-prev-pin-header'),
  btnNextPinHeader: document.getElementById('btn-next-pin-header'),
  pinCounterHeader: document.getElementById('pin-counter-header'),
  
  // Edit section
  canvasPreview: document.getElementById('canvas-preview'),
  btnResetTransform: document.getElementById('btn-reset-transform'),
  btnResetBackground: document.getElementById('btn-reset-background'),
  btnResetBorder: document.getElementById('btn-reset-border'),
  btnResetText: document.getElementById('btn-reset-text'),
  sliderZoom: document.getElementById('slider-zoom'),
  labelZoom: document.getElementById('label-zoom'),
  checkboxEdgeColor: document.getElementById('checkbox-edge-color'),
  inputBgColor: document.getElementById('input-bg-color'),
  labelBgColor: document.getElementById('label-bg-color'),
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
  
  // Preview section
  previewContainer: document.getElementById('preview-container'),
  
  // Header
  btnHeaderBack: document.getElementById('btn-header-back'),
  btnHeaderPreview: document.getElementById('btn-header-preview'),
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
  
  // Update header buttons based on current section
  updateHeaderButtons(sectionId);
  
  // Initialize canvas touch behavior when entering edit section
  if (sectionId === 'section-edit') {
    const canvasContainer = document.querySelector('.canvas-container');
    const zoomTab = document.querySelector('.tab-content[data-tab="zoom"]');
    if (canvasContainer) {
      // Set touch-action based on whether zoom tab is active
      canvasContainer.style.touchAction = (zoomTab && zoomTab.classList.contains('active')) ? 'none' : 'auto';
    }
  }
}

// Update header buttons visibility
function updateHeaderButtons(sectionId) {
  // Hide all header buttons by default
  elements.btnHeaderBack.style.display = 'none';
  elements.btnHeaderPreview.style.display = 'none';
  elements.btnExport.style.display = 'none';
  
  if (sectionId === 'section-edit') {
    // Edit section: show Back and Preview All, swap title for pin navigator
    elements.btnHeaderBack.style.display = 'inline-flex';
    elements.btnHeaderPreview.style.display = 'inline-flex';
    elements.headerTitle.style.display = 'none';
    elements.headerPinNavigator.style.display = 'flex';
  } else if (sectionId === 'section-preview') {
    // Preview section: show Back and Export PDF
    elements.btnHeaderBack.style.display = 'inline-flex';
    elements.btnExport.style.display = 'inline-flex';
    elements.headerTitle.style.display = 'block';
    elements.headerPinNavigator.style.display = 'none';
  } else {
    // Other sections: show title
    elements.headerTitle.style.display = 'block';
    elements.headerPinNavigator.style.display = 'none';
  }
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
  
  // Calculate total circles needed
  const config = PIN_CONFIGS[state.pinSize];
  const totalCircles = state.duplicate 
    ? Math.max(state.images.length, config.circlesPerPage)
    : state.images.length;
  
  // Create distribution array (maps circle index to unique image index)
  if (state.duplicate && totalCircles > state.images.length) {
    state.imageDistribution = createImageDistribution(state.images.length, totalCircles);
  } else {
    // No duplication: 1-to-1 mapping
    state.imageDistribution = state.images.map((_, idx) => idx);
  }
  
  updatePinEditor();
  showSection('section-edit');
});

// Header navigation buttons
elements.btnHeaderBack.addEventListener('click', () => {
  // Determine where to go back based on current section
  const currentSection = document.querySelector('.section.active');
  if (currentSection.id === 'section-edit') {
    showSection('section-config');
  } else if (currentSection.id === 'section-preview') {
    showSection('section-edit');
  }
});

elements.btnHeaderPreview.addEventListener('click', async () => {
  await generatePreview();
  showSection('section-preview');
});

// Pin navigation (header buttons)
elements.btnPrevPinHeader.addEventListener('click', () => {
  if (state.currentImageIndex > 0) {
    saveCurrentPinSettings();
    state.currentImageIndex--;
    updatePinEditor();
  }
});

elements.btnNextPinHeader.addEventListener('click', () => {
  if (state.currentImageIndex < state.images.length - 1) {
    saveCurrentPinSettings();
    state.currentImageIndex++;
    updatePinEditor();
  }
});

// Save current pin settings
function saveCurrentPinSettings() {
  const img = state.images[state.currentImageIndex];
  // Convert slider value (-100 to 300) to zoom, where 0% = 1x
  // Clamp minimum to 0.1x to avoid zero/negative values
  img.zoom = Math.max(0.1, 1 + (parseFloat(elements.sliderZoom.value) / 100));
  img.fillWithEdgeColor = elements.checkboxEdgeColor.checked;
  
  // Only save backgroundColor if edge color is NOT checked
  if (img.fillWithEdgeColor) {
    img.backgroundColor = '';
  } else {
    img.backgroundColor = elements.inputBgColor.value;
  }
  
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
  
  // Update header navigation
  elements.pinCounterHeader.textContent = `${state.currentImageIndex + 1} of ${state.images.length}`;
  elements.btnPrevPinHeader.disabled = state.currentImageIndex === 0;
  elements.btnNextPinHeader.disabled = state.currentImageIndex === state.images.length - 1;
  
  // Update controls
  // Convert zoom to slider percentage value (-100 to 300), where 1x = 0%
  elements.sliderZoom.value = (img.zoom - 1) * 100;
  elements.labelZoom.textContent = Math.round((img.zoom - 1) * 100);
  elements.checkboxEdgeColor.checked = img.fillWithEdgeColor;
  elements.inputBgColor.value = img.backgroundColor || '#ffffff';
  elements.inputBgColor.disabled = img.fillWithEdgeColor; // Disable when edge color is used
  elements.labelBgColor.style.opacity = img.fillWithEdgeColor ? '0.5' : '1'; // Grey out label
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
  // Display the percentage value directly
  const percentage = parseFloat(e.target.value);
  elements.labelZoom.textContent = Math.round(percentage);
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

elements.checkboxEdgeColor.addEventListener('change', () => {
  // Disable/enable background color input based on edge color checkbox
  elements.inputBgColor.disabled = elements.checkboxEdgeColor.checked;
  elements.labelBgColor.style.opacity = elements.checkboxEdgeColor.checked ? '0.5' : '1';
  renderPinPreview();
});
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
  elements.sliderZoom.value = 0; // 0% = 1.0x (middle)
  elements.labelZoom.textContent = '0';
  renderPinPreview();
});

elements.btnResetBackground.addEventListener('click', () => {
  const img = state.images[state.currentImageIndex];
  img.fillWithEdgeColor = false;
  img.backgroundColor = '#ffffff';
  elements.checkboxEdgeColor.checked = false;
  elements.inputBgColor.value = '#ffffff';
  elements.inputBgColor.disabled = false;
  elements.labelBgColor.style.opacity = '1';
  renderPinPreview();
});

elements.btnResetBorder.addEventListener('click', () => {
  const img = state.images[state.currentImageIndex];
  img.borderColor = '#000000';
  img.borderWidth = 0;
  elements.inputBorderColor.value = '#000000';
  elements.sliderBorderWidth.value = 0;
  elements.labelBorderWidth.textContent = '0.0';
  renderPinPreview();
});

elements.btnResetText.addEventListener('click', () => {
  const img = state.images[state.currentImageIndex];
  img.textLines = [];
  img.textPosition = 'bottom';
  img.textColor = '#ffffff';
  img.textOutline = '#000000';
  img.textOutlineWidth = 2;
  elements.textLinesContainer.innerHTML = '';
  elements.selectTextPosition.value = 'bottom';
  elements.inputTextColor.value = '#ffffff';
  elements.inputTextOutline.value = '#000000';
  elements.sliderTextOutlineWidth.value = 2;
  elements.labelTextOutlineWidth.textContent = '2.0';
  renderPinPreview();
});

// Canvas touch handling
elements.canvasPreview.addEventListener('touchstart', (e) => {
  // Only allow touch interaction on zoom tab
  const zoomTab = document.querySelector('.tab-content[data-tab="zoom"]');
  if (!zoomTab || !zoomTab.classList.contains('active')) {
    return;
  }
  
  if (e.touches.length === 1) {
    // Single touch - panning
    e.preventDefault();
    touchState.isPanning = true;
    touchState.isPinching = false;
    touchState.startX = e.touches[0].clientX;
    touchState.startY = e.touches[0].clientY;
  } else if (e.touches.length === 2) {
    // Two touches - pinch zoom
    e.preventDefault();
    touchState.isPanning = false;
    touchState.isPinching = true;
    
    // Calculate initial distance between two fingers
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchState.initialDistance = Math.sqrt(dx * dx + dy * dy);
    
    const img = state.images[state.currentImageIndex];
    touchState.initialZoom = img.zoom;
  }
});

elements.canvasPreview.addEventListener('touchmove', (e) => {
  // Only allow touch interaction on zoom tab
  const zoomTab = document.querySelector('.tab-content[data-tab="zoom"]');
  if (!zoomTab || !zoomTab.classList.contains('active')) {
    return;
  }
  
  if (touchState.isPanning && e.touches.length === 1) {
    // Single touch - panning
    e.preventDefault();
    const deltaX = e.touches[0].clientX - touchState.startX;
    const deltaY = e.touches[0].clientY - touchState.startY;
    
    const img = state.images[state.currentImageIndex];
    img.offsetX = touchState.lastOffsetX + deltaX * 0.5; // Scale factor for sensitivity
    img.offsetY = touchState.lastOffsetY + deltaY * 0.5;
    
    renderPinPreview();
  } else if (touchState.isPinching && e.touches.length === 2) {
    // Two touches - pinch zoom
    e.preventDefault();
    
    // Calculate current distance between two fingers
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const currentDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate zoom scale (how much the distance changed)
    const scale = currentDistance / touchState.initialDistance;
    
    const img = state.images[state.currentImageIndex];
    // Apply zoom with clamping (0.1x to 4x)
    img.zoom = Math.max(0.1, Math.min(4, touchState.initialZoom * scale));
    
    // Update slider and label
    elements.sliderZoom.value = (img.zoom - 1) * 100;
    elements.labelZoom.textContent = Math.round((img.zoom - 1) * 100);
    
    renderPinPreview();
  }
});

elements.canvasPreview.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    // All fingers lifted
    if (touchState.isPanning) {
      touchState.isPanning = false;
      const img = state.images[state.currentImageIndex];
      touchState.lastOffsetX = img.offsetX;
      touchState.lastOffsetY = img.offsetY;
    }
    if (touchState.isPinching) {
      touchState.isPinching = false;
    }
  } else if (e.touches.length === 1 && touchState.isPinching) {
    // One finger lifted during pinch, switch to panning
    touchState.isPinching = false;
    touchState.isPanning = true;
    touchState.startX = e.touches[0].clientX;
    touchState.startY = e.touches[0].clientY;
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
  
  // Extract edge color from ORIGINAL image if needed (before processing)
  let edgeColor;
  if (img.fillWithEdgeColor) {
    edgeColor = await extractEdgeColor(img.bitmap);
  }
  
  // Process image
  const processedBitmap = await processImageForCircle(
    img.bitmap,
    config.pinSizePt,
    config.circleSizePt,
    img.zoom,
    img.offsetX,
    img.offsetY
  );
  
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
    const totalCircles = state.imageDistribution.length;
    const positions = calculateLayout(totalCircles, config);
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
        const uniqueImageIdx = state.imageDistribution[circleIdx];
        const img = state.images[uniqueImageIdx];
        
        if (!img.bitmap) {
          img.bitmap = await createImageBitmap(img.file);
        }
        
        // Extract edge color from original image if needed (before processing)
        let edgeColor;
        if (img.fillWithEdgeColor) {
          edgeColor = await extractEdgeColor(img.bitmap);
        }
        
        const processedBitmap = await processImageForCircle(
          img.bitmap,
          config.pinSizePt,
          config.circleSizePt,
          img.zoom,
          img.offsetX,
          img.offsetY
        );
        
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

// Tab navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const targetTab = button.dataset.tab;
    
    // Update active tab button
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Update active tab content
    tabContents.forEach(content => {
      if (content.dataset.tab === targetTab) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
    
    // Update canvas touch-action based on active tab
    const canvasContainer = document.querySelector('.canvas-container');
    if (targetTab === 'zoom') {
      // Allow canvas interaction on zoom tab
      canvasContainer.style.touchAction = 'none';
    } else {
      // Allow page scrolling on other tabs
      canvasContainer.style.touchAction = 'auto';
    }
  });
});

