import sharp from "sharp";
import { getImageRefBySourceURL, uploadImage } from "./files.s3";

export async function uploadImageAndThumb(
    conf: {
        filePath: string,
        content: ArrayBuffer | Buffer,
        sourceURL?: string,
        sourceType?: "venxia" | "shopofficeonline",
        productId?: string
    }) {
    await uploadImage(conf);
    let thumbContent: Buffer | null = null;

    if (conf.filePath.toLowerCase().endsWith(".jpg") || conf.filePath.toLowerCase().endsWith(".jpeg")) {
        thumbContent = await sharp(conf.content)
            .resize(256, 256)
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();
    }
    else if (conf.filePath.toLowerCase().endsWith(".png")) {
        thumbContent = await sharp(conf.content)
            .resize(256, 256)
            .toFormat('png', { quality: 80 })
            .toBuffer();
    } else {
        throw new Error("Unsupported image type for thumbnail");
    }

    await uploadImage({ ...conf, content: thumbContent as Buffer, filePath: `/thumbnail/${conf.filePath}`, isThumb: true });
}

export async function getAccessURLBySourceURL(
    sourceURL: string,
    thumbnail: boolean = false
): Promise<string | null> {
    const image = await getImageRefBySourceURL(sourceURL, thumbnail);
    if (!image) return null;
    return image.presign({
        expiresIn: 60 * 60,
        method: "GET",
        acl: "public-read",
    });
}

export async function backFillGuildImage(gid: string) {
    const res = await fetch(`https://shopofficeonline.com/ProductImages/${gid}.jpg`);
    if (!res.ok) return null;
    const resBuffer = await res.arrayBuffer();
    await uploadImageAndThumb({
        filePath: `/guild/${gid}.jpg`,
        content: resBuffer,
        sourceURL: `https://shopofficeonline.com/ProductImages/${gid}.jpg`,
        sourceType: "shopofficeonline",
        productId: gid,
    });

}