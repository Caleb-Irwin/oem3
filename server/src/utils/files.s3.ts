import { S3Client } from 'bun';
import { db } from '../db';
import { files } from './files.table';
import { eq } from 'drizzle-orm';
import { unzipBufferToDataUrl, zipDataUrlToBuffer } from './filesZipHelpers';

export const s3 = new S3Client({
	accessKeyId: process.env['S3_ACCESS_KEY'],
	secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'],
	bucket: process.env['S3_BUCKET'],
	endpoint: process.env['S3_ENDPOINT']
});

export async function uploadFile(fileId: number, name: string, content: string): Promise<void> {
	const fileName = `${fileId} - ${name.replaceAll('/', ' ')}`;
	return await uploadFileByName(fileName, content);
}

export async function uploadFileByName(fileName: string, contentDataUrl: string): Promise<void> {
	const buff = await zipDataUrlToBuffer(contentDataUrl, fileName);
	await s3.file('files/' + fileName + '.zip').write(buff, { type: 'application/zip' });
}

export async function deleteFile(fileId: number): Promise<void> {
	const row = await db.query.files.findFirst({
		where: eq(files.id, fileId)
	});
	if (!row) return;

	const res = await db.delete(files).where(eq(files.id, fileId)).returning({ name: files.name });
	if (res?.[0].name)
		await s3.file(`files/${fileId} - ${res[0].name.replaceAll('/', ' ')}.zip`).delete();
}

export async function getFileRefById(fileId: number): Promise<Bun.S3File | null> {
	const file = await db.query.files.findFirst({
		where: eq(files.id, fileId)
	});
	if (!file?.content?.startsWith('@')) throw new Error('File not in S3');
	if (!file?.name) return null;
	const fileName = `files/${fileId} - ${file.name.replaceAll('/', ' ')}.zip`;
	return s3.file(fileName);
}

export async function getFileRow(fileId: number) {
	const file = await db.query.files.findFirst({
		where: eq(files.id, fileId)
	});
	if (!file?.content?.startsWith('@')) throw new Error('File not in S3');
	if (!file?.name) return null;
	const innerFileName = `${fileId} - ${file.name.replaceAll('/', ' ')}`;
	const fileName = `files/${innerFileName}.zip`;
	const arrayBuffer = await s3.file(fileName).arrayBuffer();
	return {
		...file,
		content: await unzipBufferToDataUrl(arrayBuffer, innerFileName)
	};
}
