import { triangleVertices, triangleCentroid } from '../geometry.js';

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