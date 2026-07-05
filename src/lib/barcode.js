/**
 * Barcode scanning helpers for mobile browsers.
 */

import { findProductByBarcode, normalizeBarcode } from './search.js';

const HTML5_QRCODE_URL = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

export function canUseBarcodeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function canUseCamera() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function loadHtml5Qrcode() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (window.Html5Qrcode) {
    return window.Html5Qrcode;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML5_QRCODE_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load barcode scanner library'));
    document.head.appendChild(script);
  });

  return window.Html5Qrcode ?? null;
}

export function resolveScannedProduct(products, barcode) {
  return findProductByBarcode(products, barcode);
}

function stopMediaStream(stream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export async function startNativeBarcodeScanner(videoElement, onDetect, onError) {
  if (!canUseBarcodeDetector()) {
    throw new Error('Native barcode scanning is not supported on this device');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: 'environment' } },
    audio: false,
  });

  videoElement.srcObject = stream;
  videoElement.setAttribute('playsinline', 'true');
  await videoElement.play();

  const detector = new BarcodeDetector({ formats: BARCODE_FORMATS });
  let active = true;

  const scan = async () => {
    if (!active) {
      return;
    }

    try {
      const results = await detector.detect(videoElement);
      if (results.length > 0) {
        active = false;
        stopMediaStream(stream);
        videoElement.srcObject = null;
        onDetect(normalizeBarcode(results[0].rawValue));
        return;
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Barcode scan failed');
      active = false;
      stopMediaStream(stream);
      videoElement.srcObject = null;
      return;
    }

    requestAnimationFrame(scan);
  };

  scan();

  return () => {
    active = false;
    stopMediaStream(stream);
    videoElement.srcObject = null;
  };
}

export async function startHtml5BarcodeScanner(containerId, onDetect, onError) {
  const Html5Qrcode = await loadHtml5Qrcode();
  if (!Html5Qrcode) {
    throw new Error('Barcode scanner library unavailable');
  }

  const scanner = new Html5Qrcode(containerId);
  let stopped = false;

  await scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.7777778 },
    (decodedText) => {
      if (stopped) {
        return;
      }
      stopped = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .finally(() => onDetect(normalizeBarcode(decodedText)));
    },
    () => {},
  );

  return async () => {
    if (stopped) {
      return;
    }
    stopped = true;
    await scanner.stop();
    scanner.clear();
  };
}

export async function startBarcodeScanner({ videoElement, containerId, onDetect, onError }) {
  if (canUseBarcodeDetector() && videoElement) {
    try {
      return await startNativeBarcodeScanner(videoElement, onDetect, onError);
    } catch (error) {
      if (!containerId) {
        throw error;
      }
    }
  }

  if (containerId) {
    return startHtml5BarcodeScanner(containerId, onDetect, onError);
  }

  throw new Error('No supported barcode scanner available');
}

export function getScannerSupportMessage() {
  if (canUseCamera()) {
    return 'Point your camera at the product barcode. You can also type a barcode or SKU into search.';
  }
  return 'Camera access is unavailable. Type a barcode or SKU into the search box instead.';
}
