import { triangleVertices, triangleCentroid, generateGeometry, triangleVerticesNamed } from '../geometry.js';
import { distance, transformPoints } from '../geometry.js';
import { scale, rotate, translate, compose } from 'transformation-matrix';

describe('distance', () => {
    test('should calculate correct distance between two points', () => {
        const p1 = { x: 0, y: 0 };
        const p2 = { x: 3, y: 4 };
        // Should be a 3-4-5 triangle, so distance should be 5
        expect(distance(p1, p2)).toBe(5);
    });
});

describe('transformPoints', () => {
    test('should correctly transform array of points', () => {
        const points = [
            { x: 1, y: 0 },
            { x: 0, y: 1 }
        ];
        
        // Create a transform that rotates 90 degrees clockwise around origin
        const transform = rotate(-Math.PI/2);
        
        const transformed = transformPoints(points, transform);
        
        // After 90 degree clockwise rotation:
        // (1,0) should become (0,-1)
        // (0,1) should become (1,0)
        expect(transformed[0].x).toBeCloseTo(0);
        expect(transformed[0].y).toBeCloseTo(-1);
        expect(transformed[1].x).toBeCloseTo(1);
        expect(transformed[1].y).toBeCloseTo(0);
    });
});

describe('triangle geometry', () => {
    test('centroid should be inside triangle', () => {
        // Create a triangle with sides 3, 4, 5 (valid right triangle)
        const vertices = triangleVertices(3, 4, 5);
        const centroid = triangleCentroid(vertices);

        // Function to calculate the area of a triangle given three points
        function triangleArea(p1, p2, p3) {
            return Math.abs(
                (p1.x * (p2.y - p3.y) + 
                 p2.x * (p3.y - p1.y) + 
                 p3.x * (p1.y - p2.y)) / 2
            );
        }

        // Calculate the total area of the triangle
        const totalArea = triangleArea(vertices[0], vertices[1], vertices[2]);

        // Calculate areas of three triangles formed by the centroid and two vertices
        const area1 = triangleArea(centroid, vertices[0], vertices[1]);
        const area2 = triangleArea(centroid, vertices[1], vertices[2]);
        const area3 = triangleArea(centroid, vertices[2], vertices[0]);

        // The sum of the three areas should equal the total area if the point is inside
        const sumOfAreas = area1 + area2 + area3;
        
        // Allow for small floating point differences
        expect(Math.abs(totalArea - sumOfAreas)).toBeLessThan(1e-10);
    });

    describe('triangle inequality validation', () => {
        test('should accept valid triangles', () => {
            // Test with valid triangle sides
            expect(() => triangleVertices(3, 4, 5)).not.toThrow();
            expect(() => triangleVertices(1, 1, 1)).not.toThrow();
            expect(() => triangleVertices(2, 3, 4)).not.toThrow();
        });

        test('should reject invalid triangles', () => {
            // Test with invalid triangle sides where one side equals sum of others
            expect(() => triangleVertices(3, 4, 7)).toThrow('Invalid triangle: each side must be less than the sum of the other two sides');
            expect(() => triangleVertices(1, 1, 2)).toThrow('Invalid triangle: each side must be less than the sum of the other two sides');
            
            // Test with invalid triangle sides where one side is greater than sum of others
            expect(() => triangleVertices(3, 4, 8)).toThrow('Invalid triangle: each side must be less than the sum of the other two sides');
            expect(() => triangleVertices(1, 1, 3)).toThrow('Invalid triangle: each side must be less than the sum of the other two sides');
        });

        test('should handle edge cases', () => {
            // Test with very small numbers
            expect(() => triangleVertices(0.1, 0.2, 0.3)).not.toThrow();
            
            // Test with very large numbers
            expect(() => triangleVertices(1000, 1000, 1000)).not.toThrow();
            
            // Test with equal sides
            expect(() => triangleVertices(5, 5, 5)).not.toThrow();
        });
    });
});

describe('triangleVerticesNamed', () => {
    test('should handle valid triangle with named parameters', () => {
        const sideA = { value: 3, displayName: "Side A" };
        const sideB = { value: 4, displayName: "Side B" };
        const sideC = { value: 5, displayName: "Side C" };

        const vertices = triangleVerticesNamed(sideA, sideB, sideC);
        expect(vertices).toHaveLength(3);
        vertices.forEach(vertex => {
            expect(vertex).toHaveProperty('x');
            expect(vertex).toHaveProperty('y');
            expect(Number.isFinite(vertex.x)).toBe(true);
            expect(Number.isFinite(vertex.y)).toBe(true);
        });
    });

    test('should provide descriptive error for invalid triangle', () => {
        const sideA = { value: 10, displayName: "Head Tube" };
        const sideB = { value: 4, displayName: "Top Bar" };
        const sideC = { value: 3, displayName: "Down Tube" };

        expect(() => triangleVerticesNamed(sideA, sideB, sideC))
            .toThrow('Invalid geometry: "Head Tube" (10mm) is too long to form a valid triangle with "Top Bar" (4mm) and "Down Tube" (3mm)');
    });

    test('should handle edge case with equal sides', () => {
        const sideA = { value: 5, displayName: "Side 1" };
        const sideB = { value: 5, displayName: "Side 2" };
        const sideC = { value: 5, displayName: "Side 3" };

        expect(() => triangleVerticesNamed(sideA, sideB, sideC)).not.toThrow();
    });

    test('should propagate non-triangle-inequality errors', () => {
        const invalidSide = { displayName: "Bad Side" }; // Missing value property
        const sideB = { value: 4, displayName: "Side B" };
        const sideC = { value: 5, displayName: "Side C" };

        expect(() => triangleVerticesNamed(invalidSide, sideB, sideC))
            .toThrow(); // Should throw some kind of error, but not our custom triangle inequality error
    });
});

describe('generateGeometry', () => {
    test('should generate valid geometry for reasonable input parameters', () => {
        const frameParams = {
            headTubeLength: {
                value: 100,
                displayName: "Head Tube Length"
            },
            swingArmPivotToHeadTubeTopCenter: {
                value: 500,
                displayName: "Swing Arm Pivot to Head Tube Top"
            },
            swingArmPivotToHeadTubeBottomCenter: {
                value: 500,
                displayName: "Swing Arm Pivot to Head Tube Bottom"
            },
            topForkTubeLength: {
                value: 300,
                displayName: "Top Fork Tube Length"
            }
        };

        const simulationParams = {
            groundWidth: {
                value: 2000,
            },
            groundHeight: {
                value: 100,
            }
        };

        const geometry = generateGeometry(frameParams, simulationParams);

        // Check that all expected properties exist
        expect(geometry).toHaveProperty('frameVertices');
        expect(geometry).toHaveProperty('forkTopVertices');
        expect(geometry).toHaveProperty('swingArmPivot');
        expect(geometry).toHaveProperty('headTubeBottom');
        expect(geometry).toHaveProperty('headTubeTop');
        expect(geometry).toHaveProperty('frameCentroid');
        expect(geometry).toHaveProperty('groundGeometry');

        // Check that frameVertices is an array of 3 points
        expect(Array.isArray(geometry.frameVertices)).toBe(true);
        expect(geometry.frameVertices).toHaveLength(3);
        geometry.frameVertices.forEach(vertex => {
            expect(Number.isFinite(vertex.x)).toBe(true);
            expect(Number.isFinite(vertex.y)).toBe(true);
        });

        // Check that forkTopVertices is an array of 4 points
        expect(Array.isArray(geometry.forkTopVertices)).toBe(true);
        expect(geometry.forkTopVertices).toHaveLength(4);
        geometry.forkTopVertices.forEach(vertex => {
            expect(Number.isFinite(vertex.x)).toBe(true);
            expect(Number.isFinite(vertex.y)).toBe(true);
        });

        // Check that individual points are valid
        ['swingArmPivot', 'headTubeBottom', 'headTubeTop', 'frameCentroid'].forEach(point => {
            expect(Number.isFinite(geometry[point].x)).toBe(true);
            expect(Number.isFinite(geometry[point].y)).toBe(true);
        });

        // Check that ground geometry has valid dimensions
        expect(Number.isFinite(geometry.groundGeometry.x)).toBe(true);
        expect(Number.isFinite(geometry.groundGeometry.y)).toBe(true);
        expect(Number.isFinite(geometry.groundGeometry.width)).toBe(true);
        expect(Number.isFinite(geometry.groundGeometry.height)).toBe(true);
        expect(geometry.groundGeometry.width).toBeGreaterThan(0);
        expect(geometry.groundGeometry.height).toBeGreaterThan(0);
    });
}); 