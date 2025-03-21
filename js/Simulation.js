import { World, Vec2, MouseJoint } from 'planck';
import { transformVec2 } from './geometry.js';
import { GroundComponent } from './GroundComponent.js';
import { MotorcycleComponent } from './MotorcycleComponent.js';

const CATEGORIES = {
    FRAME: 0x0001,
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
        this.components = [];

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
        
        // Draw all components
        this.components.forEach(component => component.draw(this.ctx));
        
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
        // Clear existing components
        this.components.forEach(component => component.destroy());
        this.components = [];

        // Create ground
        const ground = new GroundComponent(this, {
            width: params.simulation.groundWidth.value,
            height: params.simulation.groundHeight.value,
            density: params.simulation.density.value
        });
        ground.position = Vec2(0, 1);
        this.components.push(ground);

        // Create motorcycle
        const motorcycle = new MotorcycleComponent(this, params);
        motorcycle.position = Vec2(0, 0);
        this.components.push(motorcycle);
    }

    setRunning(running) {
        this.isRunning = running;
    }
}

export { Simulation, CATEGORIES, transformVec2 }; 