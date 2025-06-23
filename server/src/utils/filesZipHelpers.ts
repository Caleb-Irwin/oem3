import JSZip from 'jszip';

/**
 * Zips the content of a single data URL into a Buffer.
 * The filename inside the zip will be inferred from the data URL's mediatype (if possible)
 * or default to "data_url_content".
 *
 * @param dataUrl The data URL string (e.g., "data:image/png;base64,iVBORw0KGgo...")
 * @returns A Promise that resolves to a Buffer containing the zipped data.
 */
export async function zipDataUrlToBuffer(dataUrl: string, filename: string): Promise<Buffer> {
	if (!dataUrl.startsWith('data:')) {
		throw new Error("Invalid Data URL: Must start with 'data:'");
	}

	const parts = dataUrl.split(',');
	if (parts.length < 2) {
		throw new Error('Invalid Data URL format: Missing data part.');
	}

	const base64Content = parts[1];

	const zip = new JSZip();

	// Add the decoded content to the zip file
	// JSZip can take a Buffer directly
	zip.file(filename, base64Content, {
		base64: true
	});

	// Generate the zip file as a Node.js Buffer (compatible with Bun's Buffer)
	const zipBuffer = await zip.generateAsync({
		type: 'nodebuffer',
		compression: 'DEFLATE',
		compressionOptions: {
			level: 9 // Max compression
		}
		// Optional: metadata about the entire zip file
		// comment: `Zip generated from data URL: ${dataUrl.substring(0, 50)}...`,
	});

	return zipBuffer;
}

/**
 * Extracts a specified file from a zip Buffer and converts its content
 * into a data URL.
 *
 * @param zipBuffer A Buffer containing the zip file data.
 * @param filenameInZip The exact name/path of the file inside the zip to extract.
 * @returns A Promise that resolves to the data URL string (e.g., "data:image/png;base64,...").
 * @throws An Error if the zipBuffer is invalid or the file is not found.
 */
export async function unzipBufferToDataUrl(
	zipBuffer: ArrayBuffer,
	filenameInZip: string
): Promise<string> {
	if (!(zipBuffer instanceof ArrayBuffer)) {
		throw new Error('Invalid input: zipBuffer must be a Buffer.');
	}

	const zip = new JSZip();

	// Load the zip file from the Buffer
	try {
		await zip.loadAsync(zipBuffer);
	} catch (error) {
		throw new Error(`Failed to load zip file from buffer: ${error}`);
	}

	const fileEntry = zip.file(filenameInZip);

	if (!fileEntry) {
		throw new Error(`File '${filenameInZip}' not found in the zip archive.`);
	}

	// Determine media type based on file extension
	let mediaType = 'application/octet-stream';
	const parts = filenameInZip.split('.');
	const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

	switch (extension.toLowerCase()) {
		case 'json':
			mediaType = 'application/json';
			break;
		case 'jsonl':
			mediaType = 'application/jsonl';
			break;
		case 'csv':
			mediaType = 'text/csv';
			break;
		case 'xlsx':
			mediaType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
			break;
	}

	// Get the file content as a base64 string
	const base64Content = await fileEntry.async('base64');

	// Construct the data URL
	return `data:${mediaType};base64,${base64Content}`;
}
