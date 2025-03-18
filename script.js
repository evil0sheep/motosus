// Matter.js module aliases
const { Engine, Render, World, Bodies, Body, Composite, Constraint, Mouse, MouseConstraint, Events, Vertices } = Matter;

// Collision categories and masks
const CATEGORIES = {
    FRAME: 0x0001,
};

const MASKS = {
    NONE: 0x0000,
    FRAME: 0x0001
};

// Create engine and world
const engine = Engine.create();
engine.world.gravity.y = 0; // Disable gravity
const world = engine.world;

// Canvas dimensions
let CANVAS_WIDTH = window.innerWidth - 300; // Subtract controls width
let CANVAS_HEIGHT = window.innerHeight;
const CANVAS_MARGIN = 50; // Margin from edges

// Create renderer
const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: true,
        pixelRatio: 1,
    }
});

window.addEventListener('resize', () => { 
    render.bounds.max.x = CANVAS_WIDTH;
    render.bounds.max.y = CANVAS_HEIGHT;
    render.options.width = CANVAS_WIDTH;
    render.options.height = CANVAS_HEIGHT;
    render.canvas.width = CANVAS_WIDTH;
    render.canvas.height = CANVAS_HEIGHT;
});

// Create frame points for the motorcycle
let framePoints = [];
let frameConstraints = [];
let bodies = {};

function triangleVertices(a, b, c) {
    // Triangle inequality theorem: the sum of any two sides must be greater
    // than the third side.
    if (!(a + b > c && a + c > b && b + c > a)) {
      return null; // Invalid triangle
    }
  
    // Place vertex C at the origin (0, 0).
    const C = { x: 0, y: 0 };
  
    // Place vertex B at (c, 0).
    const B = { x: c, y: 0 };
  
    // Use the law of cosines to find the angle at vertex C.
    const cosC = (a * a - b * b - c * c) / (-2 * b * c);
    const angleC = Math.acos(cosC);
  
    // Calculate the coordinates of vertex A using trigonometry.
    const A = { x: b * Math.cos(angleC), y: b * Math.sin(angleC) };
  
    return [A, B, C];
  }

// Function to create the motorcycle frame
function createFrame(swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter, headTubeLength, frontForkLength) {
    // Clear existing bodies and constraints
    World.remove(world, [...Object.values(bodies), ...frameConstraints]);
    bodies = {};
    frameConstraints = [];

    // Calculate initial positions for the frame points
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const radius = Math.min(swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter) * 0.4;


    const frameVertices = triangleVertices(headTubeLength, swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter);

    // Create frame as a rigid body
    const frameBody = Bodies.fromVertices(
        centerX,
        centerY,
        [frameVertices],
        {
            isStatic: false,
            render: { fillStyle: '#4CAF50' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.NONE
            }
        }
    );
    bodies['frame'] = frameBody;

    // Calculate fork tube vertices (rectangle)
    const forkWidth = 20; // 20mm wide
    const forkVertices = [
        { x: -forkWidth/2, y: 0 }, // Center the fork at its connection point
        { x: forkWidth/2, y: 0 },
        { x: forkWidth/2, y: frontForkLength },
        { x: -forkWidth/2, y: frontForkLength }
    ];

    // Create fork tube as a rigid body
    const forkBody = Bodies.fromVertices(
        centerX,
        centerY,
        [forkVertices],
        {
            isStatic: false,
            render: { fillStyle: '#FF4444' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.NONE
            }
        }
    );

    // Position and rotate the fork
    Body.setPosition(forkBody, {
        x: centerX,
        y: centerY
    });
    Body.setAngle(forkBody, Math.PI/3); // Match head tube angle

    bodies['fork'] = forkBody;

    // Create a composite of the frame and fork
    const motorcycle = Composite.create({
        bodies: [frameBody, forkBody],
        constraints: [] // No constraints needed
    });

    // Add the composite to the world
    World.add(world, motorcycle);

    // Store the composite in our bodies object for future reference
    bodies['motorcycle'] = motorcycle;
    // Get the bounds of the composite body
    const bounds = Composite.bounds(motorcycle);

    // Add a small padding to the bounds
    const padding = 50; // Adjust as needed
    const paddedBounds = {
        min: {
            x: bounds.min.x - padding,
            y: bounds.min.y - padding,
        },
        max: {
            x: bounds.max.x + padding,
            y: bounds.max.y + padding,
        },
    };

    // Use Render.lookAt to fit the composite body within the viewport
    Render.lookAt(render, paddedBounds);
}

// Initialize the frame with default values in millimeters
createFrame(800, 800, 200, 500);

// Add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});

World.add(world, mouseConstraint);
render.mouse = mouse;

// Start the engine and renderer
Engine.run(engine);
Render.run(render);

// Handle slider changes
const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById(`${e.target.id}Value`).textContent = value;
        
        const swingArmPivotToHeadTubeTopCenter = parseInt(document.getElementById('swingArmPivotToHeadTubeTopCenter').value);
        const swingArmPivotToHeadTubeBottomCenter = parseInt(document.getElementById('swingArmPivotToHeadTubeBottomCenter').value);
        const headTubeLength = parseInt(document.getElementById('headTubeLength').value);
        const frontForkLength = parseInt(document.getElementById('frontForkLength').value);
        
        createFrame(swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter, headTubeLength, frontForkLength);
    });
}); 