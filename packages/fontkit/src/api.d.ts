/** Fontkit2 create accepts Uint8Array (restructure uses DataView), not only Buffer.
 * Keep results unknown until the adapter checks its used public API.
 */
declare module "fontkit" {
  export function create(bytes: Uint8Array): unknown;
}
