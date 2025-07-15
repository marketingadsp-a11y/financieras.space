
// This file is used to declare modules that don't have types.

declare module "file-saver" {
  export function saveAs(data: Blob, filename: string, options?: any): void;
}
