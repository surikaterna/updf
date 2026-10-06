import { mkdir, writeFile } from "node:fs/promises";
import { createNoticeRenderer, sampleNotice } from "../examples/agents/notice.js";

const directory = new URL("../artifacts/agents/", import.meta.url);
await mkdir(directory, { recursive: true });
const output = new URL("notice.pdf", directory);
const renderer = createNoticeRenderer();
await writeFile(output, renderer.render(sampleNotice));
console.log(output.pathname);
