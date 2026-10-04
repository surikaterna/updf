import { fragmentProof, geometrySummary } from "./fragment-regions.js";

const proof = fragmentProof(process.argv.includes("--two-regions"));
console.log(JSON.stringify({ geometry: geometrySummary(proof.placements), counts: proof.counts }, null, 2));
