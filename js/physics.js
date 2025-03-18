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
function createBodies(geometry, params, Matter) {
    const bodies = {};

    // Create ground
    bodies['ground'] = Matter.Bodies.rectangle(
        geometry.groundGeometry.x,
        geometry.groundGeometry.y,
        params.simulation.groundWidth.value,
        params.simulation.groundHeight.value,
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
                    y: -params.frame.frontForkLength.value/2
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
                    y: params.frame.headTubeLength.value - params.frame.frontForkLength.value/2
                },
                stiffness: 1,
                length: 0
            })
        ]
    });

    Matter.Composite.translate(bodies.motorcycle, {
        x: 0,
        y: -1000
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

    // Create a scene composite containing everything except the origin marker
    bodies['scene'] = Matter.Composite.create({
        bodies: [bodies.ground],
        composites: [bodies.motorcycle]
    });

    return bodies;
}

// Function to update motorcycle geometry without recreating bodies
function updateBodies(params, worldBodies, Matter) {
    if (!worldBodies.motorcycle) return;  // Don't update if motorcycle doesn't exist yet

    const geometry = generateGeometry(params.frame, params.simulation);

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
    topConstraint.pointB.y = -params.frame.frontForkLength.value/2;

    bottomConstraint.pointA.x = geometry.headTubeBottom.x - geometry.frameCentroid.x;
    bottomConstraint.pointA.y = geometry.headTubeBottom.y - geometry.frameCentroid.y;
    bottomConstraint.pointB.x = 0;
    bottomConstraint.pointB.y = params.frame.headTubeLength.value - params.frame.frontForkLength.value/2;
}

// Function to create the world and motorcycle
function createWorld(params, world, Matter, render, worldBodies) {
    // Clear existing bodies and constraints
    if (worldBodies.motorcycle) {
        Matter.World.remove(world, worldBodies.motorcycle);
    }
    Matter.World.remove(world, Object.values(worldBodies));
    
    // Clear the worldBodies object by removing all properties
    Object.keys(worldBodies).forEach(key => {
        delete worldBodies[key];
    });

    const geometry = generateGeometry(params.frame, params.simulation);
    const newBodies = createBodies(geometry, params, Matter);
    
    // Copy all properties from newBodies to worldBodies
    Object.assign(worldBodies, newBodies);

    // Add scene and origin marker to the world
    Matter.World.add(world, worldBodies.scene);
    Matter.World.add(world, worldBodies.originMarker);
    
    const padding = 50;
    const sceneBounds = Matter.Composite.bounds(worldBodies.scene);
    const paddedBounds = {
        min: {
            x: sceneBounds.min.x - padding,
            y: sceneBounds.min.y - padding,
        },
        max: {
            x: sceneBounds.max.x + padding,
            y: sceneBounds.max.y + padding,
        },
    };

    Matter.Render.lookAt(render, paddedBounds);
}

export { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS }; 