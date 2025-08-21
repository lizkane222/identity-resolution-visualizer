import html2canvas from 'html2canvas';

export const exportVisualizerAsImage = async (elementId = 'visualizer-timeline', filename = 'identity-resolution-visualizer') => {
  try {
    // Find the visualizer container element
    const element = document.getElementById(elementId) || document.querySelector('.diagram-timeline2');
    
    if (!element) {
      console.error('Visualizer element not found for export');
      alert('Unable to find visualizer content to export. Please make sure the visualizer is loaded.');
      return;
    }

    // Configure html2canvas options for high quality
    const options = {
      allowTaint: true,
      useCORS: true,
      scale: 2, // Higher resolution (2x)
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: null, // Transparent background
      onclone: (clonedDoc) => {
        // Ensure all elements are visible in the cloned document
        const clonedElement = clonedDoc.getElementById(elementId) || clonedDoc.querySelector('.diagram-timeline2');
        if (clonedElement) {
          // Make sure all content is visible
          clonedElement.style.overflow = 'visible';
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          
          // Ensure all child elements are also visible
          const hiddenElements = clonedElement.querySelectorAll('[style*="display: none"], .hidden');
          hiddenElements.forEach(el => {
            if (el.classList.contains('diagram-node2')) {
              // Keep diagram nodes visible for export
              el.style.display = 'block';
              el.style.visibility = 'visible';
            }
          });
        }
      }
    };

    // Show loading indicator
    const originalCursor = document.body.style.cursor;
    document.body.style.cursor = 'wait';

    // Capture the element as canvas
    const canvas = await html2canvas(element, options);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Restore cursor
    document.body.style.cursor = originalCursor;
    
    console.log('Image export completed successfully');
    
  } catch (error) {
    console.error('Error exporting image:', error);
    alert('Error exporting image. Please try again.');
    document.body.style.cursor = 'default';
  }
};
