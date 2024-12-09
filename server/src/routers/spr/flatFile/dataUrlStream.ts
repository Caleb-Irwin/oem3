import { Writable } from "stream";

export function createDataURLStream(mimeType = "application/octet-stream") {
  const chunks: Uint8Array[] = [];

  const writeStream = new Writable({
    write(chunk, _, callback) {
      chunks.push(chunk);
      callback();
    },
    final(callback) {
      callback();
    },
  });

  return {
    stream: writeStream,
    getDataURL: function () {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    },
  };
}
