//Dont add the Matter.js module aliases here because we are referencing them through the Matter object for consistency across files

// Import physics functions
import { createWorld, updateBodies } from './physics.js';

// Constants
const CANVAS_MARGIN = 50; // Margin from edges
const canvasSize = {
    width: window.innerWidth - 300, // Subtract controls width
    height: window.innerHeight
};

// Initialize Matter.js engine and world
const engine = Matter.Engine.create();
engine.world.gravity.y = 1; // Enable gravity
const world = engine.world;

// Initialize renderer
const render = Matter.Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width: canvasSize.width,
        height: canvasSize.height,
        wireframes: true,
        pixelRatio: 1,
    }
});

// Handle window resize
window.addEventListener('resize', () => { 
    render.bounds.max.x = canvasSize.width;
    render.bounds.max.y = canvasSize.height;
    render.options.width = canvasSize.width;
    render.options.height = canvasSize.height;
    render.canvas.width = canvasSize.width;
    render.canvas.height = canvasSize.height;
});

// Initialize simulation state
let worldBodies = {};

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

// Start the simulation
Matter.Runner.run(engine);
Matter.Render.run(render);

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