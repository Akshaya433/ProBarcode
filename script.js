document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('barcode-form');
    const valueInput = document.getElementById('barcode-value');
    const typeSelect = document.getElementById('barcode-type');
    const colorInput = document.getElementById('barcode-color');
    const widthInput = document.getElementById('barcode-width');
    const heightInput = document.getElementById('barcode-height');
    const displayWrapper = document.getElementById('barcode-display-wrapper');
    const display = document.getElementById('barcode-display');
    const actionButtons = document.getElementById('action-buttons');
    const downloadBtn = document.getElementById('download-btn');
    const shareBtn = document.getElementById('share-btn');
    const errorMsg = document.getElementById('error-message');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const toast = document.getElementById('toast');

    let qrCodeInstance = null;
    const HISTORY_KEY = 'barcodeHistory';

    // --- Core Function: Generate Barcode ---
    const generateBarcode = (e) => {
        if (e) e.preventDefault();
        
        const value = valueInput.value.trim();
        const type = typeSelect.value;
        
        if (!value) {
            showToast('Please enter a value or link.', 'error');
            return;
        }

        clearDisplay();

        try {
            if (type === 'qrcode') {
                generateQRCode(value);
            } else {
                generateLinearBarcode(value, type);
            }
            showToast('Barcode generated successfully!', 'success');
            actionButtons.classList.remove('hidden');
            errorMsg.classList.add('hidden');
            saveToHistory({ value, type });
        } catch (err) {
            displayError(`Error: ${err.message}. Please check your input for the selected barcode type.`);
        }
    };

    // --- Barcode Generation Helpers ---
    const generateQRCode = (value) => {
        qrCodeInstance = new QRCode(display, {
            text: value,
            width: 256,
            height: 256,
            colorDark: colorInput.value,
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    };


    const generateLinearBarcode = (value, type) => {
        const canvas = document.createElement('canvas');
        display.appendChild(canvas);
        JsBarcode(canvas, value, {
            format: type,
            lineColor: colorInput.value,
            width: parseFloat(widthInput.value),
            height: parseInt(heightInput.value),
            displayValue: true
        });
    };
    
    // --- UI and Display Functions ---
    const clearDisplay = () => {
        display.innerHTML = '';
        qrCodeInstance = null;
        actionButtons.classList.add('hidden');
    };

    const displayError = (message) => {
        clearDisplay();
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
        showToast(message, 'error');
    };

    const showToast = (message, type = 'success') => {
        toast.textContent = message;
        toast.className = 'show';
        toast.classList.add(type);

        setTimeout(() => {
            toast.className = toast.className.replace('show', '');
        }, 3000);
    };

    // --- Action Button Handlers ---
    const downloadBarcode = () => {
        const canvas = display.querySelector('canvas');
        const img = display.querySelector('img');
        
        let dataUrl;
        if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
        } else if (img) {
            // For QR Code, we need to create a temporary canvas to get a clean download
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            dataUrl = tempCanvas.toDataURL('image/png');
        } else {
            showToast('No barcode to download.', 'error');
            return;
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${typeSelect.value.toLowerCase()}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const shareBarcode = async () => {
        const canvas = display.querySelector('canvas');
        const img = display.querySelector('img');
        
        if (!navigator.share || !navigator.canShare) {
            showToast('Share API is not supported on your browser.', 'error');
            return;
        }
        
        try {
            let blob;
            if (canvas) {
                blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            } else if (img) {
                blob = await fetch(img.src).then(res => res.blob());
            } else {
                 showToast('No barcode to share.', 'error');
                 return;
            }
            
            const file = new File([blob], 'barcode.png', { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'My Barcode',
                    text: 'Check out this barcode I generated!',
                });
                showToast('Shared successfully!', 'success');
            } else {
                showToast("Your browser can't share this file.", 'error');
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                showToast(`Share failed: ${error.message}`, 'error');
            }
        }
    };


    // --- History Management ---
    const getHistory = () => JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

    const saveToHistory = (item) => {
        let history = getHistory();
        // Remove existing item to move it to the top, preventing duplicates
        history = history.filter(h => !(h.value === item.value && h.type === item.type));
        history.unshift(item); // Add to the beginning
        if (history.length > 15) { // Limit history size
            history.pop();
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    };

    const renderHistory = () => {
        const history = getHistory();
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li>No history yet.</li>';
            clearHistoryBtn.classList.add('hidden');
            return;
        }
        clearHistoryBtn.classList.remove('hidden');
        history.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.type}: ${item.value}`;
            li.dataset.value = item.value;
            li.dataset.type = item.type;
            historyList.appendChild(li);
        });
    };

    const loadFromHistory = (e) => {
        if (e.target.tagName === 'LI' && e.target.dataset.value) {
            valueInput.value = e.target.dataset.value;
            typeSelect.value = e.target.dataset.type;
            generateBarcode();
        }
    };

    const clearHistory = () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistory();
        showToast('History cleared!', 'success');
    };

    // --- Initial Setup and Event Listeners ---
    form.addEventListener('submit', generateBarcode);
    downloadBtn.addEventListener('click', downloadBarcode);
    shareBtn.addEventListener('click', shareBarcode);
    historyList.addEventListener('click', loadFromHistory);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Initial render of history on page load
    renderHistory();
});
