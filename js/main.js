//Dont add the Matter.js module aliases here because we are referencing them through the Matter object for consistency across files

// Import physics functions and configuration
import { initPhysics, createWorld, updateBodies } from './physics.js';
import { frameParams } from './config.js';

// Constants
const CANVAS_MARGIN = 50; // Margin from edges
const canvasSize = {
    width: window.innerWidth - 300, // Subtract controls width
    height: window.innerHeight
};

// Initialize simulation state
let worldBodies = {};

// Initialize physics engine and get Matter.js objects
const { world, render } = initPhysics(Matter, document.getElementById('canvas-container'), canvasSize);

// Create default frame parameters object
const getDefaultFrameParams = () => {
    const params = {};
    for (const [key, config] of Object.entries(frameParams)) {
        params[key] = config.defaultValue;
    }
    return params;
};

// Initialize the world with default values
createWorld(getDefaultFrameParams(), world, Matter, render, canvasSize, worldBodies);

// Create UI controls
const slidersContainer = document.getElementById('sliders-container');
Object.entries(frameParams).forEach(([key, config]) => {
    const container = document.createElement('div');
    container.className = 'slider-container';
    
    const label = document.createElement('label');
    label.htmlFor = key;
    label.textContent = `${config.displayName} (${config.unit})`;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = key;
    slider.min = Math.round(config.defaultValue * 0.5); // 50% of default
    slider.max = Math.round(config.defaultValue * 1.5); // 150% of default
    slider.value = config.defaultValue;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${key}Value`;
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = config.defaultValue;
    
    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(valueDisplay);
    slidersContainer.appendChild(container);
});

// UI Event Handlers
// Handle slider changes
const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById(`${e.target.id}Value`).textContent = value;
        
        const currentFrameParams = {};
        Object.keys(frameParams).forEach(key => {
            currentFrameParams[key] = parseInt(document.getElementById(key).value);
        });
        
        updateBodies(currentFrameParams, worldBodies, Matter, canvasSize);
    });
});

// Handle reset button click
document.getElementById('resetButton').addEventListener('click', () => {
    const currentFrameParams = {};
    Object.keys(frameParams).forEach(key => {
        currentFrameParams[key] = parseInt(document.getElementById(key).value);
    });
    
    createWorld(
        currentFrameParams,
        world,
        Matter,
        render,
        canvasSize,
        worldBodies
    );
}); 