export async function kit(PORT: string, DEV: boolean) {
  if (DEV) return devKit();
  process.env["ORIGIN"] = process.env["RAILWAY_PUBLIC_DOMAIN"]
    ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
    : `http://localhost:${PORT}`;
  return (await import("../svelte/build/handler")).handler;
}

async function devKit() {
  const { createProxyMiddleware } = await import("http-proxy-middleware");

  return createProxyMiddleware({
    target: "http://localhost:5173",
  });
}
