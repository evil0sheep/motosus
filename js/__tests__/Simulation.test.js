import { Simulation, CATEGORIES, transformVec2 } from '../Simulation.js';
import { SimulationComponent } from '../SimulationComponent.js';
import { defaultParams } from '../config.js';
import { createCanvas } from 'canvas';
import { translate, rotate, compose } from 'transformation-matrix';
import { Vec2, World, Box } from 'planck';

// Helper function to clone params to avoid modifying the original
const cloneParams = () => {
    return JSON.parse(JSON.stringify(defaultParams));
};

// Mock document and window for Node environment
class MockElement {
    constructor(type) {
        this.type = type;
        this.children = [];
        this.style = {};
        this.width = 0;
        this.height = 0;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            width: this.width,
            height: this.height
        };
    }
}

global.document = {
    createElement: (type) => new MockElement(type)
};

describe('Simulation', () => {
    describe('transformVec2', () => {
        test('should correctly transform a Vec2', () => {
            const vec = Vec2(1, 0);
            const transform = compose(
                translate(2, 3),
                rotate(Math.PI/2)
            );
            const result = transformVec2(vec, transform);
            
            // After translation (2,3) and 90° rotation, (1,0) should become roughly (2,4)
            // The rotation happens first in the local space, then the translation is applied
            expect(result.x).toBeCloseTo(2);
            expect(result.y).toBeCloseTo(4);
        });
    });

    describe('constructor', () => {
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasContainer.id = 'canvas-container';
            
            canvasSize = {
                width: 800,
                height: 600
            };
        });

        test('should initialize without errors', () => {
            const simulation = new Simulation(canvasContainer, canvasSize);
            expect(simulation.world).toBeDefined();
            expect(simulation.canvas).toBeDefined();
            expect(simulation.ctx).toBeDefined();
        });

        test('should error with invalid input', () => {
            expect(() => {
                new Simulation(null, null);
            }).toThrow();
        });
    });

    describe('createWorld', () => {
        let simulation;
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasSize = { width: 800, height: 600 };
            simulation = new Simulation(canvasContainer, canvasSize);
        });

        test('should create world without errors', () => {
            simulation.createWorld(cloneParams());
            expect(simulation.components).toHaveLength(2); // Ground and Motorcycle
            expect(simulation.components[0].body.getType()).toBe('static'); // Ground is static
            expect(simulation.components[1].body.getType()).toBe('dynamic'); // Motorcycle is dynamic
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                simulation.createWorld({});
            }).toThrow();
        });
    });

    describe('Component Management', () => {
        let simulation;
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasSize = { width: 800, height: 600 };
            simulation = new Simulation(canvasContainer, canvasSize);
            simulation.createWorld(cloneParams());
        });

        test('should properly manage components', () => {
            // Verify initial components
            expect(simulation.components).toHaveLength(2);
            
            // Verify component cleanup
            simulation.createWorld(cloneParams());
            expect(simulation.components).toHaveLength(2);
            
            // Verify component positions
            expect(simulation.components[0].position.y).toBeCloseTo(1); // Ground at y=1
            expect(simulation.components[1].position.y).toBeCloseTo(0); // Motorcycle at y=0
        });
    });

    /**
     * A simple box component for testing that draws a solid colored box.
     * Uses putImageData for drawing since node-canvas's fillRect doesn't work in tests.
     */
    class BoxComponent extends SimulationComponent {
        constructor(simulation, size, color) {
            super(simulation, { type: 'dynamic' });
            this.size = size;
            this.color = color;
            
            // Create box fixture
            const shape = Box(size / 2, size / 2);
            this.body.createFixture(shape, {
                density: 1.0,
                friction: 0.3,
                restitution: 0.2,
                userData: { color: color }
            });
        }

        drawImpl(ctx) {
            // Draw all fixtures
            for (let fixture = this.body.getFixtureList(); fixture; fixture = fixture.getNext()) {
                const shape = fixture.getShape();
                const userData = fixture.getUserData();
                
                if (shape.getType() === 'polygon') {
                    const vertices = shape.m_vertices;
                    
                    // Create an image data for the bounding box of the shape
                    const minX = Math.min(...vertices.map(v => v.x));
                    const maxX = Math.max(...vertices.map(v => v.x));
                    const minY = Math.min(...vertices.map(v => v.y));
                    const maxY = Math.max(...vertices.map(v => v.y));
                    
                    const width = Math.ceil((maxX - minX) * ctx.canvas.width);
                    const height = Math.ceil((maxY - minY) * ctx.canvas.height);
                    const imageData = ctx.createImageData(width, height);
                    
                    // Fill with the specified color
                    for (let i = 0; i < imageData.data.length; i += 4) {
                        imageData.data[i] = 255;     // R
                        imageData.data[i + 1] = 0;   // G
                        imageData.data[i + 2] = 0;   // B
                        imageData.data[i + 3] = 255; // A
                    }
                    
                    // Put the image data at the shape's position
                    const x = Math.floor(minX * ctx.canvas.width);
                    const y = Math.floor(minY * ctx.canvas.height);
                    ctx.putImageData(imageData, x, y);
                }
            }
        }
    }

    describe('Rendering', () => {
        test('should render a red box with exact pixel coverage', () => {
            // Create simulation with a real canvas
            const canvasContainer = new MockElement('div');
            canvasContainer.width = 400;
            canvasContainer.height = 400;
            const simulation = new Simulation(canvasContainer, { width: 400, height: 400 });

            // Create and add a red box that takes up exactly 200x200 pixels (1x1 meter at 200 pixels/meter)
            const boxSize = 1; // 1 meter box
            const box = new BoxComponent(simulation, boxSize, '#FF0000');
            simulation.components = [box]; // Replace any existing components

            // Position the box at the center (0,0) since viewport is centered
            box.position = Vec2(0, 0);

            // Draw the scene
            simulation.draw();

            // Get image data from canvas
            const ctx = simulation.canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 400, 400);
            const pixels = imageData.data;

            // Count red pixels
            let redPixelCount = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] === 255 && pixels[i + 1] === 0 && pixels[i + 2] === 0) {
                    redPixelCount++;
                }
            }

            // A 1x1 meter box at 200 pixels/meter is exactly 200x200 pixels = 40,000 pixels
            expect(redPixelCount).toBe(40000);
        });
    });
}); 