import { PORT, DEV } from "./config";

export async function genKit() {
  if (DEV) return devKit();
  process.env["ORIGIN"] = process.env["RAILWAY_PUBLIC_DOMAIN"]
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : `http://localhost:${PORT}`;
  return (
    //@ts-expect-error no type for sveltekit handler
    (await import("../../svelte/build/handler")).handler
  );
}

async function devKit() {
  const { createProxyMiddleware } = await import("http-proxy-middleware");
  return createProxyMiddleware({
    target: "http://localhost:5173",
    logLevel: "silent",
  });
}

//@ts-expect-error Bun allows this!
export const kit = await genKit();
