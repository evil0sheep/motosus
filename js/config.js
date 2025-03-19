// Default parameters are specified in meters for physics simulation
// but UI sliders and display values are in millimeters
export const defaultParams = {
    frame: {
        swingArmPivotToHeadTubeTopCenter: {
            displayName: "Swing Arm Pivot to Head Tube Top Center",
            value: 0.8,  
            unit: "m"
        },
        swingArmPivotToHeadTubeBottomCenter: {
            displayName: "Swing Arm Pivot to Head Tube Bottom Center",
            value: 0.8,  
            unit: "m"
        },
        headTubeLength: {
            displayName: "Head Tube Length",
            value: 0.1,  
            unit: "m"
        },
        topForkTubeLength: {
            displayName: "Top Fork Tube Length",
            value: 0.3,  
            unit: "m"
        },
        bottomForkTubeLength: {
            displayName: "Bottom Fork Tube Length",
            value: 0.3,  
            unit: "m"
        }
    },
    simulation: {
        groundHeight: {
            displayName: "Ground Height",
            value: 0.1,  
            unit: "m"
        },
        groundWidth: {
            displayName: "Ground Width",
            value: 2.0,  
            unit: "m"
        },
        forkSpringFrequency: {
            displayName: "Fork Spring Frequency",
            value: 4.0,
            unit: "Hz"
        },
        forkSpringDamping: {
            displayName: "Fork Spring Damping",
            value: 0.7,
            unit: ""
        }
    }
}; 