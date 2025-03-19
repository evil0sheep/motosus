import { World, Vec2, Box, Polygon, PrismaticJoint, DistanceJoint, MouseJoint } from 'planck';
import { generateGeometry } from './geometry.js';


// Collision categories and masks
const CATEGORIES = {
    FRAME: 0x0001,
    GROUND: 0x0002,
    FORK: 0x0004,
};

const MASKS = {
    NONE: 0x0000,
    FRAME: 0x0002,  // Frame collides with ground
    GROUND: 0x0001 | 0x0004,  // Ground collides with frame and fork
    FORK: 0x0002  // Fork collides with ground
};

// Function to initialize Planck.js physics engine and renderer
function initPhysics(canvasContainer, canvasSize) {
    // Initialize Planck.js world
    const world = World({
        gravity: Vec2(0, 9.81) 
    });

    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Create a static body for the mouse joint
    const mouseBody = world.createBody();
    let mouseJoint = null;

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
    });

    // Convert screen coordinates to physics world coordinates
    function getWorldPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvas.width / 2) / 400;
        const y = (e.clientY - rect.top - canvas.height) / 400;
        return Vec2(x, y);
    }

    // Mouse event handlers
    canvas.addEventListener('mousedown', (e) => {
        if (mouseJoint) return;

        const worldPoint = getWorldPoint(e);
        
        // Query the world for bodies at the click position using AABB
        let clickedBody = null;
        const aabb = {
            lowerBound: Vec2(worldPoint.x - 0.01, worldPoint.y - 0.01),
            upperBound: Vec2(worldPoint.x + 0.01, worldPoint.y + 0.01)
        };

        world.queryAABB(aabb, (fixture) => {
            const body = fixture.getBody();
            if (body.isDynamic()) {
                clickedBody = body;
                return false; // Stop querying
            }
            return true; // Continue querying
        });

        if (clickedBody) {
            mouseJoint = world.createJoint(MouseJoint({
                maxForce: 1000.0 * clickedBody.getMass(),
                frequencyHz: 5.0,
                dampingRatio: 0.7,
                target: worldPoint,
            }, mouseBody, clickedBody, worldPoint));
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (mouseJoint) {
            mouseJoint.setTarget(getWorldPoint(e));
        }
    });

    canvas.addEventListener('mouseup', () => {
        if (mouseJoint) {
            world.destroyJoint(mouseJoint);
            mouseJoint = null;
        }
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
        ctx.translate(pos.x, pos.y);
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
            
            ctx.strokeStyle = userData.color || '#4CAF50';
            ctx.lineWidth = 0.005; // Slightly thicker lines for better visibility
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    ctx.restore();
}

// Function to create all bodies for the simulation
function createBodies(geometry, params, world) {
    const bodies = {};

    // Create ground
    const groundBody = world.createBody({
        type: 'static',
        position: Vec2(0, 0)
    });
    
    const groundShape = Box(
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
        position: Vec2(0, -1), 
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Convert frame vertices to Planck.js format (in meters)
    const frameVertices = geometry.frameVertices.map(v => 
        Vec2(v.x, v.y)
    );
    
    const frameShape = Polygon(frameVertices);
    frameBody.createFixture(frameShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#4CAF50' }
    });

    // Add top fork as a second fixture to the frame body
    const forkTopVertices = geometry.forkTopVertices.map(v => 
        Vec2(v.x, v.y)
    );
    
    const forkTopShape = Polygon(forkTopVertices);
    frameBody.createFixture(forkTopShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#FF4444' }
    });
    
    bodies['frame'] = frameBody;

    // Create bottom fork tube as a separate dynamic body
    const bottomForkBody = world.createBody({
        type: 'dynamic',
        position: Vec2(0, -1),
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    const forkBottomVertices = geometry.forkBottomVertices.map(v => 
        Vec2(v.x, v.y)
    );

    const forkBottomShape = Polygon(forkBottomVertices);
    bottomForkBody.createFixture(forkBottomShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FORK,
        filterMaskBits: MASKS.FORK,
        userData: { color: '#FF8888' }
    });

    bodies['bottomFork'] = bottomForkBody;

    // Create prismatic joint to constrain motion along the fork axis
    const forkAxis = Vec2(0, 1); // Vertical axis
    const anchor = Vec2(geometry.headTubeBottom.x, geometry.headTubeBottom.y);
    
    const prismaticJoint = PrismaticJoint({
        enableLimit: true,
        lowerTranslation: -0.15, // 15cm compression
        upperTranslation: 0.0,   // No extension
        enableMotor: false
    }, frameBody, bottomForkBody, anchor, forkAxis);
    
    world.createJoint(prismaticJoint);

    // Create distance joint to act as a spring
    // Position the bottom fork tube so its top aligns with the bottom of the top tube
    const topAnchor = Vec2(geometry.headTubeBottom.x, geometry.headTubeBottom.y);
    const bottomAnchor = Vec2(geometry.headTubeBottom.x, geometry.headTubeBottom.y - params.frame.bottomForkTubeLength.value);
    
    const distanceJoint = DistanceJoint({
        frequencyHz: params.simulation.forkSpringFrequency.value,
        dampingRatio: params.simulation.forkSpringDamping.value,
        length: params.frame.bottomForkTubeLength.value // Rest length matches the fork tube length
    }, frameBody, bottomForkBody, topAnchor, bottomAnchor);
    
    world.createJoint(distanceJoint);

    return bodies;
}

// Function to update motorcycle geometry without recreating bodies
function updateBodies(params, worldBodies) {
    if (!worldBodies.frame) return;

    const geometry = generateGeometry(params.frame, params.simulation);

    // Update frame vertices
    const frameBody = worldBodies.frame;
    const bottomForkBody = worldBodies.bottomFork;
    
    // Get the list of fixtures
    const frameFixtures = [];
    for (let fixture = frameBody.getFixtureList(); fixture; fixture = fixture.getNext()) {
        frameFixtures.push(fixture);
    }
    
    // Destroy all fixtures
    frameFixtures.forEach(fixture => frameBody.destroyFixture(fixture));

    // Create new frame fixture
    const frameVertices = geometry.frameVertices.map(v => 
        Vec2(v.x, v.y)
    );
    const frameShape = Polygon(frameVertices);
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
        Vec2(v.x, v.y)
    );
    const forkTopShape = Polygon(forkTopVertices);
    frameBody.createFixture(forkTopShape, {
        density: 1.0,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#FF4444' }
    });

    // Update bottom fork tube
    if (bottomForkBody) {
        const bottomForkFixtures = [];
        for (let fixture = bottomForkBody.getFixtureList(); fixture; fixture = fixture.getNext()) {
            bottomForkFixtures.push(fixture);
        }
        bottomForkFixtures.forEach(fixture => bottomForkBody.destroyFixture(fixture));

        const forkBottomVertices = geometry.forkBottomVertices.map(v => 
            Vec2(v.x, v.y)
        );
        const forkBottomShape = Polygon(forkBottomVertices);
        bottomForkBody.createFixture(forkBottomShape, {
            density: 1.0,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FORK,
            filterMaskBits: MASKS.FORK,
            userData: { color: '#FF8888' }
        });
    }
}

// Function to create the world and motorcycle
function createWorld(params, world, render, worldBodies) {
    // Clear existing bodies
    for (let body = world.getBodyList(); body; body = body.getNext()) {
        world.destroyBody(body);
    }
    
    // Clear the worldBodies object
    Object.keys(worldBodies).forEach(key => {
        delete worldBodies[key];
    });

    const geometry = generateGeometry(params.frame, params.simulation);
    const newBodies = createBodies(geometry, params, world);
    
    // Copy all properties from newBodies to worldBodies
    Object.assign(worldBodies, newBodies);
}

export { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS }; 