import { triangleVertices, triangleCentroid, generateGeometry } from '../geometry.js';

describe('triangle geometry', () => {
    test('centroid should be inside triangle', () => {
        // Create a triangle with sides 1, 2, 3
        const vertices = triangleVertices(1, 2, 3);
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
}); 

describe('generateGeometry', () => {
    test('should generate valid geometry for reasonable input parameters', () => {
        const frameParams = {
            headTubeLength: {
                defaultValue: 100,
            },
            swingArmPivotToHeadTubeTopCenter: {
                defaultValue: 500,
            },
            swingArmPivotToHeadTubeBottomCenter: {
                defaultValue: 500,
            },
            frontForkLength: {
                defaultValue: 300,
            }
        };

        const simulationParams = {
            groundWidth: {
                defaultValue: 2000,
            },
            groundHeight: {
                defaultValue: 100,
            }
        };

        const geometry = generateGeometry(frameParams, simulationParams);

        // Check that all expected properties exist
        expect(geometry).toHaveProperty('frameVertices');
        expect(geometry).toHaveProperty('forkVertices');
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

        // Check that forkVertices is an array of 4 points
        expect(Array.isArray(geometry.forkVertices)).toBe(true);
        expect(geometry.forkVertices).toHaveLength(4);
        geometry.forkVertices.forEach(vertex => {
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