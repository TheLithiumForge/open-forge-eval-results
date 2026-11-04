export declare const PALETTE: readonly [{
    readonly name: "cyan";
    readonly color: "#63E7FF";
}, {
    readonly name: "magenta";
    readonly color: "#FF71D6";
}, {
    readonly name: "green";
    readonly color: "#8BEA7D";
}, {
    readonly name: "yellow";
    readonly color: "#FFE082";
}, {
    readonly name: "orange";
    readonly color: "#FFB064";
}, {
    readonly name: "violet";
    readonly color: "#B49AFF";
}, {
    readonly name: "rose";
    readonly color: "#FF8296";
}, {
    readonly name: "ice";
    readonly color: "#D9F3FF";
}];
export declare const SHAPES: readonly ["circle", "square", "triangle", "diamond", "star", "hexagon", "plus", "chevron"];
export declare const MARKERS: readonly ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"];
export type ShapeName = (typeof SHAPES)[number];
export type MarkerName = (typeof MARKERS)[number];
export type FillName = "solid" | "outline";
export interface Face {
    readonly id: number;
    readonly color: string;
    readonly colorName: string;
    readonly fill: FillName;
    readonly shape: ShapeName;
    readonly marker: MarkerName;
    readonly name: string;
}
export declare function describeFace(id: number): Face | null;
