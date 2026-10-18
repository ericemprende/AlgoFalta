// Renderiza las ilustraciones de imagenes.json a landing/blog/img/<slug>-<n>.jpg
// Uso: node render.mjs   (desde docs/blog/ilustraciones)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = path.resolve("../../../landing/blog/img");
mkdirSync(OUT, { recursive: true });
const imagenes = JSON.parse(readFileSync("imagenes.json", "utf8"));
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });

for (const [slug, lista] of Object.entries(imagenes)) {
  for (const [n, props] of lista.entries()) {
    const composition = await selectComposition({ serveUrl, id: "Ilustracion", inputProps: props });
    await renderStill({ serveUrl, composition, inputProps: props, imageFormat: "jpeg", jpegQuality: 85, output: `${OUT}/${slug}-${n + 1}.jpg` });
  }
  console.log("ok", slug);
}
