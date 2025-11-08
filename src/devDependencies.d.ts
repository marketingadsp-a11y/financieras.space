
// This file is used to declare modules that don't have types.

declare module "file-saver" {
  export function saveAs(data: Blob, filename: string, options?: any): void;
}

declare module 'jsqr' {
  function jsqr(data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' }): {
    binaryData: number[];
    data: string;
    chunks: any[];
    version: number;
    location: {
      topRightCorner: { x: number, y: number };
      topLeftCorner: { x: number, y: number };
      bottomRightCorner: { x: number, y: number };
      bottomLeftCorner: { x: number, y: number };
      topRightFinderPattern: { x: number, y: number };
      topLeftFinderPattern: { x: number, y: number };
      bottomLeftFinderPattern: { x: number, y: number };
    };
  } | null;
  export = jsqr;
}
