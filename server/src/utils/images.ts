import sharp from "sharp";
import { s3 } from "./files.s3";
import { db } from "../db";
import { images } from "./files.table";
import { and, eq } from "drizzle-orm";

async function uploadImage(
    {
        filePath,
        content,
        isThumb = false,
        sourceURL,
        sourceType,
        productId
    }: {
        filePath: string,
        content: string | ArrayBuffer | Blob | Buffer,
        isThumb?: boolean,
        sourceURL?: string,
        sourceHash?: string,
        sourceType?: "venxia" | "shopofficeonline",
        productId?: string
    }
) {
    await s3.file(filePath).write(content);
    await db.insert(images).values({
        filePath,
        isThumbnail: isThumb,
        sourceURL,
        sourceHash: Bun.hash(content).toString(),
        sourceType,
        productId,
        uploadedTime: Date.now(),
    });
}

async function getImageRefBySourceURL(
    sourceURL: string,
    thumbnail: boolean = false
): Promise<Bun.S3File | null> {
    const image = await db
        .query.images.findFirst({
            where: and(eq(images.sourceURL, sourceURL), eq(images.isThumbnail, thumbnail)),
        });
    if (!image) return null;
    return s3.file(image.filePath);
}

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

export async function addOrSmartUpdateImage(url: string, productId: string, sourceType: "venxia" | "shopofficeonline", forceCreate: boolean = false) {
    const img = forceCreate ? null : await db.query.images.findFirst({
        where: and(eq(images.sourceURL, url), eq(images.isThumbnail, false)),
    });
    if (!img) {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch image");
        const resBuffer = await res.arrayBuffer();
        await uploadImageAndThumb({
            filePath: `guild/${url.split("/").pop()}`,
            content: resBuffer,
            sourceURL: url,
            sourceType,
            productId,
        });
    } else {
        return;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch image");
        const resBuffer = await res.arrayBuffer();
        if (Bun.hash(resBuffer).toString() !== img.sourceHash) {
            await uploadImageAndThumb({
                filePath: `guild/${url.split("/").pop()}`,
                content: resBuffer,
                sourceURL: url,
                sourceType,
                productId,
            });
        }
    }
}