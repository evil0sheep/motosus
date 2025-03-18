//Dont add the Matter.js module aliases here because we are referencing them through the Matter object for consistency across files

// Import physics functions and configuration
import { initPhysics, createWorld, updateBodies } from './physics.js';
import { defaultParams } from './config.js';

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
const getDefaultParams = () => {
    return defaultParams;
};

// Get current parameters from UI sliders
const getCurrentParams = () => {
    const currentParams = JSON.parse(JSON.stringify(defaultParams));
    Object.keys(defaultParams.frame).forEach(key => {
        currentParams.frame[key].value = parseInt(document.getElementById(key).value);
    });
    return currentParams;
};

// Initialize the world with default values
createWorld(getDefaultParams(), world, Matter, render, worldBodies);

// Create UI controls
const slidersContainer = document.getElementById('sliders-container');
Object.entries(defaultParams.frame).forEach(([key, config]) => {
    const container = document.createElement('div');
    container.className = 'slider-container';
    
    const label = document.createElement('label');
    label.htmlFor = key;
    label.textContent = `${config.displayName} (${config.unit})`;
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = key;
    slider.min = Math.round(config.value * 0.5); // 50% of default
    slider.max = Math.round(config.value * 1.5); // 150% of default
    slider.value = config.value;
    
    const valueDisplay = document.createElement('span');
    valueDisplay.id = `${key}Value`;
    valueDisplay.className = 'value-display';
    valueDisplay.textContent = config.value;
    
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
        
        const currentParams = getCurrentParams();
        try {
            updateBodies(currentParams, worldBodies, Matter, canvasSize);
        } catch (error) {
            // Revert the slider to its previous value
            e.target.value = e.target.defaultValue;
            document.getElementById(`${e.target.id}Value`).textContent = e.target.defaultValue;
            alert(error.message);
        }
    });
});

// Handle reset button click
document.getElementById('resetButton').addEventListener('click', () => {
    const currentParams = getCurrentParams();
    
    try {
        createWorld(
            currentParams,
            world,
            Matter,
            render,
            worldBodies
        );
    } catch (error) {
        alert(error.message);
    }
}); 