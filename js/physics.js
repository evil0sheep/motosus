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

// Function to initialize Planck.js physics engine and renderer
function initPhysics(planck, canvasContainer, canvasSize) {
    // Initialize Planck.js world
    const world = planck.World({
        gravity: planck.Vec2(0, 9.81) 
    });

    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
    });

    // Start the simulation loop
    let animationFrameId;
    function step() {
        world.step(1/60); // 60 FPS
        draw(ctx, world);
        animationFrameId = requestAnimationFrame(step);
    }
    step();

    return { world, canvas, ctx };
}

// Function to draw the world
function draw(ctx, world) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Center the viewport
    ctx.save();
    ctx.translate(ctx.canvas.width / 2 , ctx.canvas.height );
    ctx.scale(400, 400);  // Scale up for visibility (1 meter = 400 pixels)
    
    // Draw all bodies
    for (let body = world.getBodyList(); body; body = body.getNext()) {
        const pos = body.getPosition();
        const angle = body.getAngle();
        
        ctx.save();
        ctx.translate(pos.x, pos.y); // No scaling needed
        ctx.rotate(angle);
        
        // Draw fixtures
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            const shape = fixture.getShape();
            const userData = fixture.getUserData();
            
            ctx.beginPath();
            if (shape.getType() === 'circle') {
                ctx.arc(0, 0, shape.getRadius(), 0, 2 * Math.PI);
            } else if (shape.getType() === 'polygon') {
                const vertices = shape.m_vertices;
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.closePath();
            }
            
            ctx.fillStyle = userData.color || '#4CAF50';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.002;
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    ctx.restore();
}

// Function to create all bodies for the simulation
function createBodies(geometry, params, planck, world) {
    const bodies = {};

    // Create ground
    const groundBody = world.createBody({
        type: 'static',
        position: planck.Vec2(0, 0)
    });
    
    const groundShape = planck.Box(
        params.simulation.groundWidth.value / 2, // Half width in meters
        params.simulation.groundHeight.value / 2  // Half height in meters
    );
    
    groundBody.createFixture(groundShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.GROUND,
        filterMaskBits: MASKS.GROUND,
        userData: { color: '#888888' }
    });
    
    bodies['ground'] = groundBody;

    // Create frame as a rigid body
    const frameBody = world.createBody({
        type: 'dynamic',
        position: planck.Vec2(0, -1), 
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Convert frame vertices to Planck.js format (in meters)
    const frameVertices = geometry.frameVertices.map(v => 
        planck.Vec2(v.x, v.y)
    );
    
    const frameShape = planck.Polygon(frameVertices);
    frameBody.createFixture(frameShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#4CAF50' }
    });

    // Add fork as a second fixture to the frame body
    const forkTopVertices = geometry.forkTopVertices.map(v => 
        planck.Vec2(v.x, v.y)
    );
    
    const forkTopShape = planck.Polygon(forkTopVertices);
    frameBody.createFixture(forkTopShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#FF4444' }
    });
    
    bodies['frame'] = frameBody;

    return bodies;
}

// Function to update motorcycle geometry without recreating bodies
function updateBodies(params, worldBodies, planck) {
    if (!worldBodies.frame) return;

    const geometry = generateGeometry(params.frame, params.simulation);

    // Update frame vertices
    const frameBody = worldBodies.frame;
    
    // Get the list of fixtures
    const fixtures = [];
    for (let fixture = frameBody.getFixtureList(); fixture; fixture = fixture.getNext()) {
        fixtures.push(fixture);
    }
    
    // Destroy all fixtures
    fixtures.forEach(fixture => frameBody.destroyFixture(fixture));

    // Create new frame fixture
    const frameVertices = geometry.frameVertices.map(v => 
        planck.Vec2(v.x, v.y)
    );
    const frameShape = planck.Polygon(frameVertices);
    frameBody.createFixture(frameShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#4CAF50' }
    });

    // Create new fork fixture
    const forkTopVertices = geometry.forkTopVertices.map(v => 
        planck.Vec2(v.x, v.y)
    );
    const forkTopShape = planck.Polygon(forkTopVertices);
    frameBody.createFixture(forkTopShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#FF4444' }
    });
}

// Function to create the world and motorcycle
function createWorld(params, world, planck, render, worldBodies) {
    // Clear existing bodies
    for (let body = world.getBodyList(); body; body = body.getNext()) {
        world.destroyBody(body);
    }
    
    // Clear the worldBodies object
    Object.keys(worldBodies).forEach(key => {
        delete worldBodies[key];
    });

    const geometry = generateGeometry(params.frame, params.simulation);
    const newBodies = createBodies(geometry, params, planck, world);
    
    // Copy all properties from newBodies to worldBodies
    Object.assign(worldBodies, newBodies);
}

export { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS }; 