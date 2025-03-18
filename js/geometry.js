// Geometry utility functions
export function triangleVertices(a, b, c) {  
    // Place vertex C at the origin (0, 0).
    const C = { x: 0, y: 0 };
  
    // Place vertex B at (c, 0).
    const B = { x: -c, y: 0 };
  
    // Use the law of cosines to find the angle at vertex C.
    const cosC = (a * a - b * b - c * c) / (-2 * b * c);
    const angleC = Math.acos(cosC);
  
    // Calculate the coordinates of vertex A using trigonometry.
    const A = { x: -b * Math.cos(angleC), y: -b * Math.sin(angleC) };
  
    return [C, B, A];
}

export function triangleCentroid(vertices) {
    const x = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
    const y = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
    return { x, y };
}

// Function to generate motorcycle geometry
export function generateGeometry(frameParams, canvasSize) {
    const frameVertices = triangleVertices(
        frameParams.headTubeLength,
        frameParams.swingArmPivotToHeadTubeTopCenter,
        frameParams.swingArmPivotToHeadTubeBottomCenter
    );
    const swingArmPivot = frameVertices[0];
    const headTubeBottom = frameVertices[1];
    const headTubeTop = frameVertices[2];
    const frameCentroid = triangleCentroid(frameVertices);

    const forkWidth = 20;
    const forkVertices = [
        { x: -forkWidth/2, y: -frameParams.frontForkLength },
        { x: forkWidth/2, y: -frameParams.frontForkLength },
        { x: forkWidth/2, y: 0 },
        { x: -forkWidth/2, y: 0 }
    ];

    // Create ground geometry
    const groundGeometry = {
        x: 0,
        y: canvasSize.height - 60,
        width: canvasSize.width * 2,
        height: 120
    };

    return {
        frameVertices,
        forkVertices,
        swingArmPivot,
        headTubeBottom,
        headTubeTop,
        frameCentroid,
        groundGeometry
    };
} 