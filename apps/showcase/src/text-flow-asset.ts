import { preparePng } from "@updf/png";

export const eeveeUrl =
  "https://cdn.iconscout.com/icon/free/png-512/free-eevee-eievui-pokemon-dessin-anime-jeu-video-pokemongo-32216.png";
export const referenceUrl = "https://codepen.io/theosoti/pen/ogjjged";
export const wrappingNotice =
  "Authored path wrapping; automatic transparency extraction pending. Straight closed paths, outer-side only; holes not used for text.";

export async function loadEevee(signal?: AbortSignal) {
  try {
    const timeout = AbortSignal.timeout(20_000);
    const active = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await fetch(eeveeUrl, {
      mode: "cors",
      credentials: "omit",
      signal: active,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = await normalizePng(await response.blob());
    return await preparePng(bytes, { signal: active });
  } catch (error) {
    throw new Error("External Eevee PNG could not be loaded/validated. Check network/CORS and retry Generate PDF.", {
      cause: error,
    });
  }
}

// The reference CDN serves 16-bit PNG; the provider deliberately admits only 8-bit.
// Browser-native decoding/re-encoding preserves alpha without adding a PNG decoder.
async function normalizePng(blob: Blob): Promise<Uint8Array> {
  const image = await createImageBitmap(blob);
  try {
    if (image.width !== 512 || image.height !== 512) throw new Error("Reference image dimensions changed");
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image preparation needs a 2D canvas");
    context.drawImage(image, 0, 0);
    const normalized = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("PNG conversion failed"))), "image/png");
    });
    return new Uint8Array(await normalized.arrayBuffer());
  } finally {
    image.close();
  }
}
