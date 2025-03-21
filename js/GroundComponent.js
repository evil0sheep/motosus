import { SimulationComponent } from './SimulationComponent.js';
import { Box } from 'planck';

const CATEGORIES = {
    FRAME: 0x0001,
    GROUND: 0x0002,
    WHEEL: 0x0004
};

class GroundComponent extends SimulationComponent {
    /**
     * @param {Simulation} simulation - The simulation instance
     * @param {Object} params - Ground parameters
     * @param {number} params.width - Width of the ground
     * @param {number} params.height - Height of the ground
     * @param {number} params.density - Density of the ground material
     */
    constructor(simulation, params) {
        super(simulation, { type: 'static' });
        this.params = params;
        this.createFixture();
    }

    createFixture() {
        const groundShape = Box(
            this.params.width / 2,
            this.params.height / 2
        );
        
        this.body.createFixture(groundShape, {
            density: this.params.density,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.GROUND,
            filterMaskBits: CATEGORIES.WHEEL | CATEGORIES.FRAME,
            userData: { color: '#333333' }
        });
    }

    drawImpl(ctx) {
        const width = this.params.width;
        const height = this.params.height;
        
        ctx.beginPath();
        ctx.rect(-width/2, -height/2, width, height);
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 0.005;
        ctx.stroke();
    }
}

export { GroundComponent }; 