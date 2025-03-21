import { Vec2 } from 'planck';

/**
 * Base class for all simulation components. Implements a one-way tree structure
 * where each component knows about its children but not its parent.
 */
class SimulationComponent {
    /**
     * @param {Simulation} simulation - The simulation instance this component belongs to
     * @param {Object} options - Configuration options for the component
     * @param {string} [options.type='dynamic'] - Type of body ('static', 'dynamic', 'kinematic')
     */
    constructor(simulation, options = {}) {
        this.simulation = simulation;
        this.children = [];
        
        // Create the physics body for this component
        this.body = simulation.world.createBody({
            type: options.type || 'dynamic',
            linearDamping: 0.1,
            angularDamping: 0.1
        });

        // Store a reference back to this component on the body
        this.body.setUserData(this);
    }

    /**
     * Get the current position of the component
     * @returns {Vec2} The current position
     */
    get position() {
        return this.body.getPosition();
    }

    /**
     * Set the position of the component
     * @param {Vec2} pos - The new position
     */
    set position(pos) {
        this.body.setPosition(pos);
    }

    /**
     * Get the current angle of the component in radians
     * @returns {number} The current angle
     */
    get angle() {
        return this.body.getAngle();
    }

    /**
     * Set the angle of the component in radians
     * @param {number} angle - The new angle
     */
    set angle(angle) {
        this.body.setAngle(angle);
    }

    /**
     * Add a child component to this component's children
     * @param {SimulationComponent} child - The child component to add
     */
    addChild(child) {
        if (child instanceof SimulationComponent) {
            this.children.push(child);
        } else {
            throw new Error('Child must be an instance of SimulationComponent');
        }
    }

    /**
     * Remove a child component from this component's children
     * @param {SimulationComponent} child - The child component to remove
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
        }
    }

    /**
     * Draw this component and all its children
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    draw(ctx) {
        // Save the global transform state
        ctx.save();

        // Apply this component's world-space transform
        const pos = this.position;
        const angle = this.angle;
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        // Draw this component
        this.drawImpl(ctx);

        // Restore to global transform before drawing children
        ctx.restore();

        // Draw all children (each will establish its own world-space transform)
        this.children.forEach(child => child.draw(ctx));
    }

    /**
     * Update this component and all its children
     * @param {Object} params - The simulation parameters
     */
    update(params) {
        // Update this component
        this.updateImpl(params);

        // Update all children
        this.children.forEach(child => child.update(params));
    }

    /**
     * Implementation of component-specific drawing.
     * To be overridden by derived classes.
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
     */
    drawImpl(ctx) {
        // Draw all fixtures
        for (let fixture = this.body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            const shape = fixture.getShape();
            const userData = fixture.getUserData() || { color: '#4CAF50' };
            
            ctx.beginPath();
            if (shape.getType() === 'circle') {
                // Draw wheel rim
                ctx.arc(0, 0, shape.getRadius(), 0, 2 * Math.PI);
                ctx.strokeStyle = userData.color;
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
                ctx.strokeStyle = userData.color;
                ctx.lineWidth = 0.005;
                ctx.stroke();
            }
        }
    }

    /**
     * Implementation of component-specific updating.
     * To be overridden by derived classes.
     * @param {Object} params - The simulation parameters
     */
    updateImpl(params) {
        // Default implementation does nothing
        // Derived classes should override this
    }

    /**
     * Clean up this component and all its children
     */
    destroy() {
        // Destroy all children first
        this.children.forEach(child => child.destroy());
        
        // Clear children array
        this.children = [];

        // Destroy this component's body
        if (this.body) {
            this.simulation.world.destroyBody(this.body);
            this.body = null;
        }
    }
}

export { SimulationComponent }; 