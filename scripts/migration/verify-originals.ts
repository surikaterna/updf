import { verify } from "./preservation.js";

const filename = process.argv[2];
if (!filename) throw new Error("Usage: verify-originals.ts INVENTORY.json");
console.log(`Preserved ${verify(filename)} original files byte-for-byte (including generated lib).`);
