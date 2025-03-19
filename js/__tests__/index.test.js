import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

describe('index.html', () => {
  beforeEach(() => {
    // Set up the document body
    document.body.innerHTML = fs.readFileSync(
      path.resolve(projectRoot, 'index.html'),
      'utf8'
    );

    // Create and mock canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    // Mock canvas context methods
    const mockCtx = {
      canvas: canvas,
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    };

    // Mock getContext to return our mock context
    canvas.getContext = () => mockCtx;

    // Add canvas to the container
    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(canvas);
    }

    // Load and execute the bundle
    const bundlePath = path.resolve(projectRoot, 'dist/bundle.js');
    if (fs.existsSync(bundlePath)) {
      const script = document.createElement('script');
      script.textContent = fs.readFileSync(bundlePath, 'utf8');
      document.body.appendChild(script);
    } else {
      throw new Error('bundle.js not found. Please run `npm run build` first.');
    }
  });

  test('loads without unhandled exceptions', (done) => {
    const errors = [];
    
    // Capture any errors
    window.addEventListener('error', (event) => {
      event.preventDefault();
      errors.push(event.error || event.message);
    });

    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      errors.push(event.reason);
    });

    // Give more time for initialization and async operations
    setTimeout(() => {
      if (errors.length > 0) {
        console.error('Errors encountered:', errors);
      }
      expect(errors).toHaveLength(0);
      done();
    }, 1000);
  }, 10000); // Increase timeout to 10 seconds
}); 