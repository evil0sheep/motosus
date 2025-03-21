import { World, Vec2, Box, Polygon, Circle, PrismaticJoint, DistanceJoint, MouseJoint, RevoluteJoint } from 'planck';
import { transformVec2, triangleVerticesNamed, triangleCentroid, triangleFromVerticesAndEdges, transformPoints } from './geometry.js';
import { applyToPoint, compose, translate, rotate } from 'transformation-matrix';

// Collision categories and masks
const CATEGORIES = {
    FRAME: 0x0001,  // Includes frame, fork, and swingarm
    GROUND: 0x0002,
    WHEEL: 0x0004
};

class Simulation {
    constructor(canvasContainer, canvasSize) {
        this.world = null;
        this.canvas = null;
        this.ctx = null;
        this.viewportScale = 200; // Scale factor (1 meter = 200 pixels)
        this.viewportTranslateX = 0;
        this.viewportTranslateY = 0;
        this.mouseBody = null;
        this.mouseJoint = null;
        this.isRunning = false;
        this.animationFrameId = null;
        this.worldBodies = {};

        this.init(canvasContainer, canvasSize);
    }

    init(canvasContainer, canvasSize) {
        // Initialize Planck.js world
        this.world = World({
            gravity: Vec2(0, 9.81)  // Enable gravity (positive y is downward)
        });

        // Create canvas and context
        this.canvas = document.createElement('canvas');
        this.canvas.width = canvasSize.width;
        this.canvas.height = canvasSize.height;
        canvasContainer.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Update viewport translation
        this.viewportTranslateX = this.canvas.width / 2;
        this.viewportTranslateY = this.canvas.height / 2;

        // Create a static body for the mouse joint
        this.mouseBody = this.world.createBody();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = canvasSize.width;
            this.canvas.height = canvasSize.height;
            // Update viewport translation on resize
            this.viewportTranslateX = this.canvas.width / 2;
            this.viewportTranslateY = this.canvas.height / 2;
        });

        // Setup mouse event handlers
        this.setupMouseHandlers();

        // Start the simulation loop
        this.step();
    }

    getWorldPoint(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Apply inverse viewport transform
        const x = (e.clientX - rect.left - this.viewportTranslateX) / this.viewportScale;
        const y = (e.clientY - rect.top - this.viewportTranslateY) / this.viewportScale;
        return Vec2(x, y);
    }

    setupMouseHandlers() {
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.mouseJoint) return;

            const worldPoint = this.getWorldPoint(e);
            
            // Query the world for bodies at the click position using AABB
            let clickedBody = null;
            const clickRadius = 0.05 / this.viewportScale;
            const aabb = {
                lowerBound: Vec2(worldPoint.x - clickRadius, worldPoint.y - clickRadius),
                upperBound: Vec2(worldPoint.x + clickRadius, worldPoint.y + clickRadius)
            };

            this.world.queryAABB(aabb, (fixture) => {
                const body = fixture.getBody();
                if (body.isDynamic()) {
                    clickedBody = body;
                    return false; // Stop querying
                }
                return true; // Continue querying
            });

            if (clickedBody) {
                this.mouseJoint = this.world.createJoint(MouseJoint({
                    maxForce: 2000.0 * clickedBody.getMass(),
                    frequencyHz: 2.0,
                    dampingRatio: 0.5,
                    target: worldPoint,
                }, this.mouseBody, clickedBody, worldPoint));
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.mouseJoint) {
                this.mouseJoint.setTarget(this.getWorldPoint(e));
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.mouseJoint) {
                this.world.destroyJoint(this.mouseJoint);
                this.mouseJoint = null;
            }
        });
    }

    step() {
        if (this.isRunning) {
            this.world.step(1/60);
        }
        this.draw();
        this.animationFrameId = requestAnimationFrame(() => this.step());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Center the viewport
        this.ctx.save();
        this.ctx.translate(this.viewportTranslateX, this.viewportTranslateY);
        this.ctx.scale(this.viewportScale, this.viewportScale);
        
        // Draw all bodies
        for (let body = this.world.getBodyList(); body; body = body.getNext()) {
            const pos = body.getPosition();
            const angle = body.getAngle();
            
            this.ctx.save();
            this.ctx.translate(pos.x, pos.y);
            this.ctx.rotate(angle);
            
            // Draw fixtures
            for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
                const shape = fixture.getShape();
                const userData = fixture.getUserData();
                
                this.ctx.beginPath();
                if (shape.getType() === 'circle') {
                    // Draw wheel rim
                    this.ctx.arc(0, 0, shape.getRadius(), 0, 2 * Math.PI);
                    this.ctx.strokeStyle = userData.color || '#4CAF50';
                    this.ctx.lineWidth = 0.005;
                    this.ctx.stroke();
                    
                    // Draw spokes
                    const numSpokes = 8;
                    const radius = shape.getRadius();
                    this.ctx.beginPath();
                    for (let i = 0; i < numSpokes; i++) {
                        const angle = (i * 2 * Math.PI) / numSpokes;
                        this.ctx.moveTo(0, 0);
                        this.ctx.lineTo(
                            radius * Math.cos(angle),
                            radius * Math.sin(angle)
                        );
                    }
                    this.ctx.strokeStyle = '#666666';
                    this.ctx.lineWidth = 0.003;
                    this.ctx.stroke();
                } else if (shape.getType() === 'polygon') {
                    const vertices = shape.m_vertices;
                    this.ctx.moveTo(vertices[0].x, vertices[0].y);
                    for (let i = 1; i < vertices.length; i++) {
                        this.ctx.lineTo(vertices[i].x, vertices[i].y);
                    }
                    this.ctx.closePath();
                    this.ctx.strokeStyle = userData.color || '#4CAF50';
                    this.ctx.lineWidth = 0.005;
                    this.ctx.stroke();
                }
            }
            
            this.ctx.restore();
        }
        
        // Draw joints
        for (let joint = this.world.getJointList(); joint; joint = joint.getNext()) {
            const type = joint.getType();
            const anchorA = joint.getAnchorA();
            const anchorB = joint.getAnchorB();
            
            // Draw anchor points
            this.ctx.beginPath();
            this.ctx.fillStyle = '#FF0000';
            this.ctx.arc(anchorA.x, anchorA.y, 0.01, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.fillStyle = '#0000FF';
            this.ctx.arc(anchorB.x, anchorB.y, 0.01, 0, 2 * Math.PI);
            this.ctx.fill();
            
            if (type === 'prismatic-joint') {
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 0.008;
                this.ctx.moveTo(anchorA.x, anchorA.y);
                this.ctx.lineTo(anchorB.x, anchorB.y);
                this.ctx.stroke();
            } else if (type === 'distance-joint') {
                const dx = anchorB.x - anchorA.x;
                const dy = anchorB.y - anchorA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const segments = 12;
                
                const perpScale = 0.0125;
                const perpX = -dy / distance;
                const perpY = dx / distance;
                
                this.ctx.beginPath();
                this.ctx.strokeStyle = '#FF69B4';
                this.ctx.lineWidth = 0.005;
                
                this.ctx.moveTo(anchorA.x, anchorA.y);
                
                for (let i = 1; i < segments; i++) {
                    const t = i / segments;
                    const x = anchorA.x + dx * t;
                    const y = anchorA.y + dy * t;
                    
                    const offset = perpScale * (i % 2 === 0 ? 1 : -1);
                    
                    this.ctx.lineTo(
                        x + perpX * offset,
                        y + perpY * offset
                    );
                }
                
                this.ctx.lineTo(anchorB.x, anchorB.y);
                this.ctx.stroke();
            }
        }
        
        this.ctx.restore();
    }

    createWorld(params) {
        // Clear existing bodies
        for (let body = this.world.getBodyList(); body; body = body.getNext()) {
            this.world.destroyBody(body);
        }
        
        // Clear the worldBodies object
        Object.keys(this.worldBodies).forEach(key => {
            delete this.worldBodies[key];
        });

        // Create bodies
        const bodies = {};

        // Create ground
        bodies['ground'] = this.world.createBody({
            type: 'static',
            position: Vec2(0, 1)
        });

        // Create frame as a rigid body at swingarm pivot
        bodies['frame'] = this.world.createBody({
            type: 'dynamic',
            position: Vec2(0, 0),
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        // Create bottom fork tube as a separate dynamic body
        bodies['bottomFork'] = this.world.createBody({
            type: 'dynamic',
            position: Vec2(0, 0),
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        // Create front wheel
        bodies['frontWheel'] = this.world.createBody({
            type: 'dynamic',
            position: Vec2(0, 0),
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        // Create swingarm as a dynamic body
        bodies['swingarm'] = this.world.createBody({
            type: 'dynamic',
            position: Vec2(0, 0),
            linearDamping: 0.1,
            angularDamping: 0.1,
            angle: 0
        });

        // Create rear wheel
        bodies['rearWheel'] = this.world.createBody({
            type: 'dynamic',
            position: Vec2(params.frame.swingarmLength.value, 0),
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        // Copy all properties from bodies to worldBodies
        Object.assign(this.worldBodies, bodies);

        // Update fixtures and joints
        this.updateBodies(params);
    }

    updateBodies(params) {
        if (!this.worldBodies.frame) return;
        if (!params.simulation || !params.frame) return;  // Early return for invalid params

        // Get body references
        const frameBody = this.worldBodies.frame;
        const bottomForkBody = this.worldBodies.bottomFork;
        const frontWheelBody = this.worldBodies.frontWheel;
        const swingarmBody = this.worldBodies.swingarm;
        const rearWheelBody = this.worldBodies.rearWheel;
        const groundBody = this.worldBodies.ground;
        
        // Clear existing fixtures and joints
        [frameBody, bottomForkBody, frontWheelBody, swingarmBody, rearWheelBody, groundBody].forEach(body => {
            if (!body) return;
            const fixtures = [];
            for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
                fixtures.push(fixture);
            }
            fixtures.forEach(fixture => body.destroyFixture(fixture));
        });
        for (let joint = this.world.getJointList(); joint; joint = joint.getNext()) {
            this.world.destroyJoint(joint);
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
            filterMaskBits: CATEGORIES.WHEEL | CATEGORIES.FRAME,
            userData: { color: '#333333' }
        });

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

        // Create shock frame vertices
        const shockFrameVertices = [
            swingArmPivot,
            headTubeTop,
            rearShockUpperPivot
        ];

        // Create frame fixtures in local coordinates
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
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });

        // Create shock frame fixture
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
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#666666' }
        });

        // Calculate fork angle and create top fork tube
        const forkAxis = Vec2(
            headTubeTop.x - headTubeBottom.x,
            headTubeTop.y - headTubeBottom.y
        );
        forkAxis.normalize();
        const forkAngle = Math.atan2(forkAxis.y, forkAxis.x) - Math.PI/2;

        // Generate top fork tube vertices
        const forkTopWidth = params.frame.topForkTubeLength.value * 0.2;
        const forkTopVertices = [
            Vec2(-forkTopWidth/2, -params.frame.topForkTubeLength.value),
            Vec2(forkTopWidth/2, -params.frame.topForkTubeLength.value),
            Vec2(forkTopWidth/2, 0),
            Vec2(-forkTopWidth/2, 0)
        ];

        // Transform and create top fork tube fixture
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
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#4169E1' }
        });

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
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#3CB371' }
        });

        // Create front wheel fixture
        const wheelRadius = params.frame.frontWheelDiameter.value / 2;
        const wheelShape = Circle(wheelRadius);
        frontWheelBody.createFixture(wheelShape, {
            density: params.simulation.density.value,
            friction: 0.7,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.WHEEL,
            filterMaskBits: CATEGORIES.GROUND,
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
            localAnchorB: Vec2(0, 0)
        }, frameBody, bottomForkBody);
        this.world.createJoint(prismaticJoint);

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
            localAnchorB: Vec2(0, -params.frame.bottomForkTubeLength.value)
        }, frameBody, bottomForkBody);
        this.world.createJoint(distanceJoint);

        const frontWheelJoint = RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(0, -params.frame.bottomForkTubeLength.value),
            localAnchorB: Vec2(0, 0)
        }, bottomForkBody, frontWheelBody);
        this.world.createJoint(frontWheelJoint);

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
            filterMaskBits: CATEGORIES.GROUND,
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
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });

        // Create rear suspension joints
        const swingarmPivotJoint = RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(0, 0),
            localAnchorB: Vec2(0, 0)
        }, frameBody, swingarmBody);
        this.world.createJoint(swingarmPivotJoint);

        const rearWheelJoint = RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(swingarmLength, 0),
            localAnchorB: Vec2(0, 0)
        }, swingarmBody, rearWheelBody);
        this.world.createJoint(rearWheelJoint);
    }

    setRunning(running) {
        this.isRunning = running;
    }
}

export { Simulation, CATEGORIES, transformVec2 }; 