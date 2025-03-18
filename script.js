// Matter.js module aliases
const { Engine, Render, World, Bodies, Body, Composite, Constraint, Mouse, MouseConstraint, Events, Vertices } = Matter;

// Collision categories and masks
const CATEGORIES = {
    FRAME: 0x0001,
    GROUND: 0x0002,
};

const MASKS = {
    NONE: 0x0000,
    FRAME: 0x0002,  // Frame collides with ground
    GROUND: 0x0001  // Ground collides with frame
};

// Create engine and world
const engine = Engine.create();
engine.world.gravity.y = 1; // Enable gravity
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
    // Place vertex C at the origin (0, 0).
    const C = { x: 0, y: 0 };
  
    // Place vertex B at (c, 0).
    const B = { x: -c, y: 0 };
  
    // Use the law of cosines to find the angle at vertex C.
    const cosC = (a * a - b * b - c * c) / (-2 * b * c);
    const angleC = Math.acos(cosC);
  
    // Calculate the coordinates of vertex A using trigonometry.
    const A = { x: -b * Math.cos(angleC), y: -b * Math.sin(angleC) };
  
    return [C, B, A];
  }

function triangleCentroid(vertices) {
    const x = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
    const y = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
    return { x, y };
}

// Function to create the motorcycle frame
function createFrame(swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter, headTubeLength, frontForkLength) {
    // Clear existing bodies and constraints
    World.remove(world, [...Object.values(bodies), ...frameConstraints]);
    bodies = {};
    frameConstraints = [];

    // Create ground
    const ground = Bodies.rectangle(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH * 2, 120, {
        isStatic: true,
        render: {
            fillStyle: '#888888'
        },
        collisionFilter: {
            category: CATEGORIES.GROUND,
            mask: MASKS.GROUND
        }
    });
    bodies['ground'] = ground;
    World.add(world, ground);

    // Calculate initial positions for the frame points
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;


    const frameVertices = triangleVertices(headTubeLength, swingArmPivotToHeadTubeTopCenter, swingArmPivotToHeadTubeBottomCenter);
    const swingArmPivot = frameVertices[0];
    const headTubeBottom = frameVertices[1];
    const headTubeTop = frameVertices[2];

    // Create frame as a rigid body
    const frameBody = Bodies.fromVertices(
        0,
        0,
        [frameVertices],
        {
            isStatic: false,
            render: { fillStyle: '#4CAF50' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.FRAME
            }
        }
    );
    bodies['frame'] = frameBody;

    // Calculate fork tube vertices (rectangle)
    const forkWidth = 20; // 20mm wide
    const forkVertices = [
        { x: -forkWidth/2, y: -frontForkLength }, // Start from top, pointing down
        { x: forkWidth/2, y: -frontForkLength },
        { x: forkWidth/2, y: 0 },
        { x: -forkWidth/2, y: 0 }
    ];

    // Calculate head tube angle relative to vertical
    const headTubeAngle = Math.atan2(
        headTubeBottom.x - headTubeTop.x,
        headTubeBottom.y - headTubeTop.y
    );



    // Create fork tube as a rigid body - initially at origin
    const forkBody = Bodies.fromVertices(
        0,
        0,
        [forkVertices],
        {
            isStatic: false,
            render: { fillStyle: '#FF4444' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.FRAME
            }
        }
    );




    const frameCentroid = triangleCentroid(frameVertices);


    // Create a composite of the frame and fork
    const motorcycle = Composite.create({
        bodies: [frameBody, forkBody],
        constraints: [
            // Add pivot constraint at head tube top
            Constraint.create({
                bodyA: frameBody,
                pointA: {
                    x: headTubeTop.x - frameCentroid.x,
                    y: headTubeTop.y - frameCentroid.y
                },
                bodyB: forkBody,
                pointB: {
                    x: 0,
                    y: -frontForkLength/2
                },
                stiffness: 1,
                length: 0
            }),
            // Add pivot constraint at head tube bottom
            Constraint.create({
                bodyA: frameBody,
                pointA: {
                    x: headTubeBottom.x - frameCentroid.x,
                    y: headTubeBottom.y - frameCentroid.y
                },
                bodyB: forkBody,
                pointB: {
                    x: 0,
                    y: headTubeLength - frontForkLength/2
                },
                stiffness: 1,
                length: 0
            })
        ]
    });

    // Create origin marker (small red circle)
    const originMarker = Bodies.circle(0, 0, 5, {
        isStatic: true,
        render: {
            fillStyle: '#FF0000',
            strokeStyle: '#FF0000',
            lineWidth: 1
        },
        collisionFilter: {
            category: CATEGORIES.FRAME,
            mask: MASKS.NONE
        }
    });
    
    // Add the origin marker to the composite
    World.add(world, originMarker);

    // Add the composite to the world
    World.add(world, motorcycle);

    // Store the composite in our bodies object for future reference
    bodies['motorcycle'] = motorcycle;
    
    // Get the bounds of the motorcycle
    const motorcycleBounds = Composite.bounds(motorcycle);
    
    // Calculate ground bounds from its known position and dimensions
    const groundBounds = {
        min: {
            x: -CANVAS_WIDTH,  // ground center (0) - width
            y: CANVAS_HEIGHT - 120              // ground y - height
        },
        max: {
            x: CANVAS_WIDTH,  // ground center (0) + width
            y: CANVAS_HEIGHT                    // ground y
        }
    };
    
    // Calculate combined bounds
    const bounds = {
        min: {
            x: Math.min(motorcycleBounds.min.x, groundBounds.min.x),
            y: Math.min(motorcycleBounds.min.y, groundBounds.min.y)
        },
        max: {
            x: Math.max(motorcycleBounds.max.x, groundBounds.max.x),
            y: Math.max(motorcycleBounds.max.y, groundBounds.max.y)
        }
    };

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

    // Use Render.lookAt to fit everything within the viewport
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
Matter.Runner.run(engine)
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