import { generateGeometry } from './geometry.js';

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

// Function to initialize Matter.js physics engine and renderer
function initPhysics(Matter, canvasContainer, canvasSize) {
    // Initialize Matter.js engine and world
    const engine = Matter.Engine.create();
    engine.world.gravity.y = 1; // Enable gravity
    const world = engine.world;

    // Initialize renderer
    const render = Matter.Render.create({
        element: canvasContainer,
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

    // Start the simulation
    Matter.Runner.run(engine);
    Matter.Render.run(render);

    return { engine, world, render };
}

// Function to create all bodies for the simulation
function createBodies(geometry, frameParams, Matter) {
    const bodies = {};

    // Create ground
    bodies['ground'] = Matter.Bodies.rectangle(
        geometry.groundGeometry.x,
        geometry.groundGeometry.y,
        geometry.groundGeometry.width,
        geometry.groundGeometry.height,
        {
            isStatic: true,
            render: {
                fillStyle: '#888888'
            },
            collisionFilter: {
                category: CATEGORIES.GROUND,
                mask: MASKS.GROUND
            }
        }
    );

    // Create frame as a rigid body
    bodies['frame'] = Matter.Bodies.fromVertices(
        0,
        0,
        [geometry.frameVertices],
        {
            isStatic: false,
            render: { fillStyle: '#4CAF50' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.FRAME
            }
        }
    );

    // Create fork tube as a rigid body
    bodies['fork'] = Matter.Bodies.fromVertices(
        0,
        0,
        [geometry.forkVertices],
        {
            isStatic: false,
            render: { fillStyle: '#FF4444' },
            collisionFilter: {
                category: CATEGORIES.FRAME,
                mask: MASKS.FRAME
            }
        }
    );
    
    // Create a composite of the frame and fork
    bodies['motorcycle'] = Matter.Composite.create({
        bodies: [bodies.frame, bodies.fork],
        constraints: [
            // Add pivot constraint at head tube top
            Matter.Constraint.create({
                bodyA: bodies.frame,
                pointA: {
                    x: geometry.headTubeTop.x - geometry.frameCentroid.x,
                    y: geometry.headTubeTop.y - geometry.frameCentroid.y
                },
                bodyB: bodies.fork,
                pointB: {
                    x: 0,
                    y: -frameParams.frontForkLength/2
                },
                stiffness: 1,
                length: 0
            }),
            // Add pivot constraint at head tube bottom
            Matter.Constraint.create({
                bodyA: bodies.frame,
                pointA: {
                    x: geometry.headTubeBottom.x - geometry.frameCentroid.x,
                    y: geometry.headTubeBottom.y - geometry.frameCentroid.y
                },
                bodyB: bodies.fork,
                pointB: {
                    x: 0,
                    y: frameParams.headTubeLength - frameParams.frontForkLength/2
                },
                stiffness: 1,
                length: 0
            })
        ]
    });

    // Create origin marker (small red circle)
    bodies['originMarker'] = Matter.Bodies.circle(0, 0, 5, {
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

    return bodies;
}

// Function to update motorcycle geometry without recreating bodies
function updateBodies(frameParams, worldBodies, Matter, canvasSize) {
    if (!worldBodies.motorcycle) return;  // Don't update if motorcycle doesn't exist yet

    const geometry = generateGeometry(frameParams, canvasSize);

    // Update frame vertices
    const frameBody = worldBodies.motorcycle.bodies[0];
    Matter.Body.setVertices(frameBody, geometry.frameVertices);

    // Update fork geometry
    const forkBody = worldBodies.motorcycle.bodies[1];
    Matter.Body.setVertices(forkBody, geometry.forkVertices);

    // Update constraints
    const topConstraint = worldBodies.motorcycle.constraints[0];
    const bottomConstraint = worldBodies.motorcycle.constraints[1];

    // Update constraint attachment points
    topConstraint.pointA.x = geometry.headTubeTop.x - geometry.frameCentroid.x;
    topConstraint.pointA.y = geometry.headTubeTop.y - geometry.frameCentroid.y;
    topConstraint.pointB.x = 0;
    topConstraint.pointB.y = -frameParams.frontForkLength/2;

    bottomConstraint.pointA.x = geometry.headTubeBottom.x - geometry.frameCentroid.x;
    bottomConstraint.pointA.y = geometry.headTubeBottom.y - geometry.frameCentroid.y;
    bottomConstraint.pointB.x = 0;
    bottomConstraint.pointB.y = frameParams.headTubeLength - frameParams.frontForkLength/2;
}

// Function to create the world and motorcycle
function createWorld(frameParams, world, Matter, render, canvasSize, worldBodies) {
    // Clear existing bodies and constraints
    if (worldBodies.motorcycle) {
        Matter.World.remove(world, worldBodies.motorcycle);
    }
    Matter.World.remove(world, Object.values(worldBodies));
    
    // Clear the worldBodies object by removing all properties
    Object.keys(worldBodies).forEach(key => {
        delete worldBodies[key];
    });

    const geometry = generateGeometry(frameParams, canvasSize);
    const newBodies = createBodies(geometry, frameParams, Matter);
    
    // Copy all properties from newBodies to worldBodies
    Object.assign(worldBodies, newBodies);

    // Add all bodies to the world
    Matter.World.add(world, worldBodies.originMarker);
    Matter.World.add(world, worldBodies.motorcycle);
    Matter.World.add(world, worldBodies.ground);
    
    // Get the bounds of the motorcycle
    const motorcycleBounds = Matter.Composite.bounds(worldBodies.motorcycle);
    
    // Calculate ground bounds from its known position and dimensions
    const groundBounds = {
        min: {
            x: -canvasSize.width,
            y: canvasSize.height - 120
        },
        max: {
            x: canvasSize.width,
            y: canvasSize.height
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

    const padding = 50;
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

    Matter.Render.lookAt(render, paddedBounds);
}

export { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS }; 