//Dont add the Matter.js module aliases here because we are referencing them through the Matter object for consistency across files

// Import physics functions
import { initPhysics, createWorld, updateBodies } from './physics.js';

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

// Initialize the world with default values in millimeters
createWorld(
    {
        swingArmPivotToHeadTubeTopCenter: 800,
        swingArmPivotToHeadTubeBottomCenter: 800,
        headTubeLength: 200,
        frontForkLength: 500
    },
    world,
    Matter,
    render,
    canvasSize,
    worldBodies
);

// UI Event Handlers
// Handle slider changes
const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById(`${e.target.id}Value`).textContent = value;
        
        const frameParams = {
            swingArmPivotToHeadTubeTopCenter: parseInt(document.getElementById('swingArmPivotToHeadTubeTopCenter').value),
            swingArmPivotToHeadTubeBottomCenter: parseInt(document.getElementById('swingArmPivotToHeadTubeBottomCenter').value),
            headTubeLength: parseInt(document.getElementById('headTubeLength').value),
            frontForkLength: parseInt(document.getElementById('frontForkLength').value)
        };
        
        updateBodies(frameParams, worldBodies, Matter, canvasSize);
    });
});

// Handle reset button click
document.getElementById('resetButton').addEventListener('click', () => {
    const frameParams = {
        swingArmPivotToHeadTubeTopCenter: parseInt(document.getElementById('swingArmPivotToHeadTubeTopCenter').value),
        swingArmPivotToHeadTubeBottomCenter: parseInt(document.getElementById('swingArmPivotToHeadTubeBottomCenter').value),
        headTubeLength: parseInt(document.getElementById('headTubeLength').value),
        frontForkLength: parseInt(document.getElementById('frontForkLength').value)
    };
    
    createWorld(
        frameParams,
        world,
        Matter,
        render,
        canvasSize,
        worldBodies
    );
}); 