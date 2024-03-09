process.env["ORIGIN"] = process.env["RAILWAY_PUBLIC_DOMAIN"]
  ? `https://${process.env["RAILWAY_PUBLIC_DOMAIN"]}`
  : "http://localhost:3000";

console.log(`Origin: ${process.env["ORIGIN"]}`);

export const kit = (await import("./kit/build/handler")).handler;
