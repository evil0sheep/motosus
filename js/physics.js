import { World, Vec2, Box, Polygon, Circle, PrismaticJoint, DistanceJoint, MouseJoint, RevoluteJoint } from 'planck';
import { triangleVerticesNamed, triangleCentroid, triangleFromVerticesAndEdges, transformPoints } from './geometry.js';
import { applyToPoint, compose, translate, rotate } from 'transformation-matrix';

// Utility function to transform a Planck.js Vec2 using a transformation matrix
function transformVec2(vec2, matrix) {
    const point = applyToPoint(matrix, { x: vec2.x, y: vec2.y });
    return Vec2(point.x, point.y);
}

// Collision categories and masks
const CATEGORIES = {
    FRAME: 0x0001,  // Includes frame, fork, and swingarm
    GROUND: 0x0002,
    WHEEL: 0x0004
};

const MASKS = {
    NONE: 0x0000,
    FRAME: 0x0002,  // Frame (including fork and swingarm) collides with ground
    GROUND: 0x0001 | 0x0004,  // Ground collides with frame and wheels
    WHEEL: 0x0002  // Wheels collide with ground only
};

// Function to initialize Planck.js physics engine and renderer
function initPhysics(canvasContainer, canvasSize) {
    // Initialize Planck.js world
    const world = World({
        gravity: Vec2(0, 9.81)  // Enable gravity (positive y is downward)
    });

    // Create canvas and context
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    canvasContainer.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // Define viewport transform parameters
    const viewportScale = 200; // Scale factor (1 meter = 200 pixels)
    let viewportTranslateX = canvas.width / 2;
    let viewportTranslateY = canvas.height / 2;

    // Create a static body for the mouse joint
    const mouseBody = world.createBody();
    let mouseJoint = null;
    let isRunning = false;  // Add simulation control flag

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = canvasSize.width;
        canvas.height = canvasSize.height;
        // Update viewport translation on resize
        viewportTranslateX = canvas.width / 2;
        viewportTranslateY = canvas.height / 2;
    });

    // Convert screen coordinates to physics world coordinates
    function getWorldPoint(e) {
        const rect = canvas.getBoundingClientRect();
        // Apply inverse viewport transform
        const x = (e.clientX - rect.left - viewportTranslateX) / viewportScale;
        const y = (e.clientY - rect.top - viewportTranslateY) / viewportScale;
        return Vec2(x, y);
    }

    // Mouse event handlers
    canvas.addEventListener('mousedown', (e) => {
        if (mouseJoint) return;

        const worldPoint = getWorldPoint(e);
        
        // Query the world for bodies at the click position using AABB
        let clickedBody = null;
        const clickRadius = 0.05 / viewportScale; // Scale click radius by viewport scale
        const aabb = {
            lowerBound: Vec2(worldPoint.x - clickRadius, worldPoint.y - clickRadius),
            upperBound: Vec2(worldPoint.x + clickRadius, worldPoint.y + clickRadius)
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
                maxForce: 2000.0 * clickedBody.getMass(), // Increased force
                frequencyHz: 2.0, // Lower frequency for smoother movement
                dampingRatio: 0.5, // Lower damping for smoother movement
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
        if (isRunning) {
            world.step(1/60); // Only step physics if simulation is running
        }
        draw(ctx, world, viewportScale, viewportTranslateX, viewportTranslateY);
        animationFrameId = requestAnimationFrame(step);
    }
    step();

    return { 
        world, 
        canvas, 
        ctx,
        setRunning: (running) => { isRunning = running; }  // Add control function
    };
}

// Function to draw the world
function draw(ctx, world, viewportScale, viewportTranslateX, viewportTranslateY) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Center the viewport using passed transform parameters
    ctx.save();
    ctx.translate(viewportTranslateX, viewportTranslateY);
    ctx.scale(viewportScale, viewportScale);
    
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
                // Draw wheel rim
                ctx.arc(0, 0, shape.getRadius(), 0, 2 * Math.PI);
                ctx.strokeStyle = userData.color || '#4CAF50';
                ctx.lineWidth = 0.005;
                ctx.stroke();
                
                // Draw spokes
                const numSpokes = 8;
                const radius = shape.getRadius();
                ctx.beginPath();
                for (let i = 0; i < numSpokes; i++) {
                    const angle = (i * 2 * Math.PI) / numSpokes;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(
                        radius * Math.cos(angle),
                        radius * Math.sin(angle)
                    );
                }
                ctx.strokeStyle = '#666666';
                ctx.lineWidth = 0.003;
                ctx.stroke();
            } else if (shape.getType() === 'polygon') {
                const vertices = shape.m_vertices;
                ctx.moveTo(vertices[0].x, vertices[0].y);
                for (let i = 1; i < vertices.length; i++) {
                    ctx.lineTo(vertices[i].x, vertices[i].y);
                }
                ctx.closePath();
                ctx.strokeStyle = userData.color || '#4CAF50';
                ctx.lineWidth = 0.005;
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }
    
    // Draw joints with enhanced visibility and debugging
    for (let joint = world.getJointList(); joint; joint = joint.getNext()) {
        const type = joint.getType();
        const anchorA = joint.getAnchorA();
        const anchorB = joint.getAnchorB();
        
        // Draw anchor points as visible dots
        ctx.beginPath();
        ctx.fillStyle = '#FF0000';
        ctx.arc(anchorA.x, anchorA.y, 0.01, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.fillStyle = '#0000FF';
        ctx.arc(anchorB.x, anchorB.y, 0.01, 0, 2 * Math.PI);
        ctx.fill();
        
        if (type === 'prismatic-joint') {
            // Draw prismatic joint connection
            ctx.beginPath();
            ctx.strokeStyle = '#FFD700'; // Gold
            ctx.lineWidth = 0.008;
            ctx.moveTo(anchorA.x, anchorA.y);
            ctx.lineTo(anchorB.x, anchorB.y);
            ctx.stroke();
        } else if (type === 'distance-joint') {
            // Draw spring visualization
            const dx = anchorB.x - anchorA.x;
            const dy = anchorB.y - anchorA.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const segments = 12; // More segments for smoother zigzag
            
            // Calculate perpendicular unit vector for zigzag
            const perpScale = 0.0125; // Reduced zigzag amplitude
            const perpX = -dy / distance;
            const perpY = dx / distance;
            
            ctx.beginPath();
            ctx.strokeStyle = '#FF69B4'; // Pink
            ctx.lineWidth = 0.005;
            
            // Start from first anchor
            ctx.moveTo(anchorA.x, anchorA.y);
            
            // Draw zigzag spring pattern
            for (let i = 1; i < segments; i++) {
                const t = i / segments;
                const x = anchorA.x + dx * t;
                const y = anchorA.y + dy * t;
                
                // Alternate between positive and negative offset
                const offset = perpScale * (i % 2 === 0 ? 1 : -1);
                
                ctx.lineTo(
                    x + perpX * offset,
                    y + perpY * offset
                );
            }
            
            // End at second anchor
            ctx.lineTo(anchorB.x, anchorB.y);
            ctx.stroke();
        }
    }
    
    ctx.restore(); // Restore the main context
}

// Function to update motorcycle geometry without recreating bodies
function updateBodies(params, worldBodies, world) {
    if (!worldBodies.frame) return;

    // Get body references
    const frameBody = worldBodies.frame;
    const bottomForkBody = worldBodies.bottomFork;
    const frontWheelBody = worldBodies.frontWheel;
    const swingarmBody = worldBodies.swingarm;
    const rearWheelBody = worldBodies.rearWheel;
    const groundBody = worldBodies.ground;
    
    // Clear all existing fixtures and joints
    [frameBody, bottomForkBody, frontWheelBody, swingarmBody, rearWheelBody, groundBody].forEach(body => {
        if (!body) return;
        const fixtures = [];
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            fixtures.push(fixture);
        }
        fixtures.forEach(fixture => body.destroyFixture(fixture));
    });
    for (let joint = world.getJointList(); joint; joint = joint.getNext()) {
        world.destroyJoint(joint);
    }

    // Create ground fixture
    const groundShape = Box(
        params.simulation.groundWidth.value / 2,
        params.simulation.groundHeight.value / 2
    );
    groundBody.createFixture(groundShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.GROUND,
        filterMaskBits: MASKS.GROUND,
        userData: { color: '#333333' }
    });

    //----------------------------------------
    // Frame and Top Fork Tube
    //----------------------------------------
    
    // Generate frame geometry
    const frameVertices = triangleVerticesNamed(
        params.frame.headTubeLength,
        params.frame.swingArmPivotToHeadTubeTopCenter,
        params.frame.swingArmPivotToHeadTubeBottomCenter
    );
    const swingArmPivot = frameVertices[0];
    const headTubeBottom = frameVertices[1];
    const headTubeTop = frameVertices[2];
    const frameCentroid = triangleCentroid(frameVertices);

    // Calculate rear shock upper pivot point
    const rearShockUpperPivot = triangleFromVerticesAndEdges(
        headTubeTop,
        swingArmPivot,
        params.frame.rearShockUpperPivotToHeadTubeTop.value,
        params.frame.rearShockUpperPivotToFramePivot.value
    );

    // Create shock frame vertices in clockwise order
    const shockFrameVertices = [
        swingArmPivot,
        headTubeTop,
        rearShockUpperPivot
    ];

    // Create frame fixtures in local coordinates (relative to swingarm pivot)
    const frameVerticesLocal = frameVertices.map(v => Vec2(
        v.x - swingArmPivot.x,
        v.y - swingArmPivot.y
    ));
    const frameShape = Polygon(frameVerticesLocal);
    frameBody.createFixture(frameShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#333333' }
    });

    // Create shock frame fixture in local coordinates
    const shockFrameVerticesLocal = shockFrameVertices.map(v => Vec2(
        v.x - swingArmPivot.x,
        v.y - swingArmPivot.y
    ));
    const shockFrameShape = Polygon(shockFrameVerticesLocal);
    frameBody.createFixture(shockFrameShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#666666' } // Slightly lighter color to distinguish it
    });

    // Calculate fork angle and create top fork tube
    const forkAxis = Vec2(
        headTubeTop.x - headTubeBottom.x,
        headTubeTop.y - headTubeBottom.y
    );
    forkAxis.normalize();
    const forkAngle = Math.atan2(forkAxis.y, forkAxis.x) - Math.PI/2;

    // Generate top fork tube vertices in frame space
    const forkTopWidth = params.frame.topForkTubeLength.value * 0.2;
    const forkTopVertices = [
        Vec2(-forkTopWidth/2, -params.frame.topForkTubeLength.value),
        Vec2(forkTopWidth/2, -params.frame.topForkTubeLength.value),
        Vec2(forkTopWidth/2, 0),
        Vec2(-forkTopWidth/2, 0)
    ];

    // Transform and create top fork tube fixture in frame space
    const topForkTransform = compose(
        translate(headTubeTop.x - swingArmPivot.x, headTubeTop.y - swingArmPivot.y),
        rotate(forkAngle)
    );

    const forkTopVerticesTransformed = transformPoints(forkTopVertices, topForkTransform);

    const forkTopShape = Polygon(forkTopVerticesTransformed);
    frameBody.createFixture(forkTopShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#4169E1' } // Royal Blue for top fork tube
    });

    //----------------------------------------
    // Front Suspension Assembly
    //----------------------------------------

    // Generate bottom fork tube vertices
    const forkBottomWidth = params.frame.bottomForkTubeLength.value * 0.2;
    const forkBottomVertices = [
        Vec2(-forkBottomWidth/2, -params.frame.bottomForkTubeLength.value),
        Vec2(forkBottomWidth/2, -params.frame.bottomForkTubeLength.value),
        Vec2(forkBottomWidth/2, 0),
        Vec2(-forkBottomWidth/2, 0)
    ];

    // Create bottom fork fixture
    const forkBottomShape = Polygon(forkBottomVertices.map(v => Vec2(v.x, v.y)));
    bottomForkBody.createFixture(forkBottomShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#3CB371' } // Medium Sea Green for bottom fork tube
    });

    // Create front wheel fixture
    const wheelRadius = params.frame.frontWheelDiameter.value / 2;
    const wheelShape = Circle(wheelRadius);
    frontWheelBody.createFixture(wheelShape, {
        density: params.simulation.density.value,
        friction: 0.7,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.WHEEL,
        filterMaskBits: MASKS.WHEEL,
        userData: { color: '#333333' }
    });

    // Position front suspension components
    const bottomForkPos = Vec2(
        headTubeTop.x - forkAxis.x * params.frame.topForkTubeLength.value,
        headTubeTop.y - forkAxis.y * params.frame.topForkTubeLength.value
    );
    bottomForkBody.setPosition(bottomForkPos);
    bottomForkBody.setAngle(forkAngle);

    const frontWheelPos = Vec2(
        bottomForkPos.x - forkAxis.x * params.frame.bottomForkTubeLength.value,
        bottomForkPos.y - forkAxis.y * params.frame.bottomForkTubeLength.value
    );
    frontWheelBody.setPosition(frontWheelPos);

    // Create front suspension joints
    const prismaticJoint = PrismaticJoint({
        enableLimit: true,
        lowerTranslation: 0,
        upperTranslation: 0.15,
        enableMotor: false,
        localAxisA: forkAxis,
        localAnchorA: Vec2(
            headTubeTop.x - forkAxis.x * params.frame.topForkTubeLength.value - swingArmPivot.x,
            headTubeTop.y - forkAxis.y * params.frame.topForkTubeLength.value - swingArmPivot.y
        ),
        localAnchorB: Vec2(0, 0) // At the top of bottom fork tube
    }, frameBody, bottomForkBody);
    world.createJoint(prismaticJoint);

    const springRestLength = params.frame.bottomForkTubeLength.value
     + params.frame.topForkTubeLength.value 
     - params.frame.headTubeLength.value;
    
    const distanceJoint = DistanceJoint({
        frequencyHz: params.simulation.forkSpringFrequency.value,
        dampingRatio: params.simulation.forkSpringDamping.value,
        length: springRestLength,
        localAnchorA: Vec2(
            headTubeBottom.x - swingArmPivot.x,
            headTubeBottom.y - swingArmPivot.y
        ),
        localAnchorB: Vec2(0, -params.frame.bottomForkTubeLength.value) // Bottom of bottom fork tube
    }, frameBody, bottomForkBody);
    world.createJoint(distanceJoint);

    const frontWheelJoint = RevoluteJoint({
        enableMotor: false,
        maxMotorTorque: 0,
        motorSpeed: 0,
        localAnchorA: Vec2(0, -params.frame.bottomForkTubeLength.value), // Bottom of bottom fork tube
        localAnchorB: Vec2(0, 0) // Center of wheel
    }, bottomForkBody, frontWheelBody);
    world.createJoint(frontWheelJoint);

    //----------------------------------------
    // Rear Suspension Assembly
    //----------------------------------------

    // Create swingarm fixture
    const swingarmLength = params.frame.swingarmLength.value;
    const swingarmWidth = swingarmLength * 0.1;
    const swingarmVertices = [
        Vec2(0, swingarmWidth/2),
        Vec2(swingarmLength, swingarmWidth/2),
        Vec2(swingarmLength, -swingarmWidth/2),
        Vec2(0, -swingarmWidth/2)
    ];
    const swingarmShape = Polygon(swingarmVertices);
    swingarmBody.createFixture(swingarmShape, {
        density: params.simulation.density.value,
        friction: 0.3,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.FRAME,
        filterMaskBits: MASKS.FRAME,
        userData: { color: '#333333' }
    });

    // Create rear wheel fixture
    const rearWheelRadius = params.frame.rearWheelDiameter.value / 2;
    const rearWheelShape = Circle(rearWheelRadius);
    rearWheelBody.createFixture(rearWheelShape, {
        density: params.simulation.density.value,
        friction: 0.7,
        restitution: 0.2,
        filterCategoryBits: CATEGORIES.WHEEL,
        filterMaskBits: MASKS.WHEEL,
        userData: { color: '#333333' }
    });

    // Create rear suspension joints
    const swingarmPivotJoint = RevoluteJoint({
        enableMotor: false,
        maxMotorTorque: 0,
        motorSpeed: 0,
        localAnchorA: Vec2(0, 0), // At swingarm pivot (frame origin)
        localAnchorB: Vec2(0, 0) // At swingarm origin
    }, frameBody, swingarmBody);
    world.createJoint(swingarmPivotJoint);

    const rearWheelJoint = RevoluteJoint({
        enableMotor: false,
        maxMotorTorque: 0,
        motorSpeed: 0,
        localAnchorA: Vec2(swingarmLength, 0), // End of swingarm
        localAnchorB: Vec2(0, 0) // Center of wheel
    }, swingarmBody, rearWheelBody);
    world.createJoint(rearWheelJoint);
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

    // Create bodies
    const bodies = {};

    // Create ground
    bodies['ground'] = world.createBody({
        type: 'static',
        position: Vec2(0, 1)
    });

    // Create frame as a rigid body at swingarm pivot
    bodies['frame'] = world.createBody({
        type: 'dynamic',
        position: Vec2(0, 0),
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Create bottom fork tube as a separate dynamic body
    bodies['bottomFork'] = world.createBody({
        type: 'dynamic',
        position: Vec2(0, 0),
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Create front wheel
    bodies['frontWheel'] = world.createBody({
        type: 'dynamic',
        position: Vec2(0, 0),
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Create swingarm as a dynamic body, with origin at pivot point
    bodies['swingarm'] = world.createBody({
        type: 'dynamic',
        position: Vec2(0, 0),
        linearDamping: 0.1,
        angularDamping: 0.1,
        angle: 0  // Initialize horizontal
    });

    // Create rear wheel at end of swingarm
    bodies['rearWheel'] = world.createBody({
        type: 'dynamic',
        position: Vec2(params.frame.swingarmLength.value, 0),
        linearDamping: 0.1,
        angularDamping: 0.1
    });

    // Copy all properties from bodies to worldBodies
    Object.assign(worldBodies, bodies);

    // Update fixtures and joints
    updateBodies(params, worldBodies, world);
}

export { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS, transformVec2 }; 