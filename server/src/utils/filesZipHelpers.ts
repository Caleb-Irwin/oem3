import JSZip from "jszip";

/**
 * Zips the content of a single data URL into a Buffer.
 * The filename inside the zip will be inferred from the data URL's mediatype (if possible)
 * or default to "data_url_content".
 *
 * @param dataUrl The data URL string (e.g., "data:image/png;base64,iVBORw0KGgo...")
 * @returns A Promise that resolves to a Buffer containing the zipped data.
 */
export async function zipDataUrlToBuffer(dataUrl: string, filename: string): Promise<Buffer> {
    if (!dataUrl.startsWith("data:")) {
        throw new Error("Invalid Data URL: Must start with 'data:'");
    }

    const parts = dataUrl.split(",");
    if (parts.length < 2) {
        throw new Error("Invalid Data URL format: Missing data part.");
    }

    const metadata = parts[0].substring(5); // Remove "data:" prefix
    const base64Content = parts[1];

    let mediaType = "application/octet-stream"; // Default content type

    // Parse metadata for media type and potential filename
    if (metadata) {
        const metaParts = metadata.split(";");
        for (const part of metaParts) {
            if (part.startsWith("base64")) {
                // This part just indicates base64 encoding, not media type
                continue;
            }
            // Assuming the first non-base64 part is the media type
            mediaType = part;
            break;
        }
    }

    const zip = new JSZip();

    // Add the decoded content to the zip file
    // JSZip can take a Buffer directly
    zip.file(filename, base64Content, {
        base64: true
    });

    // Generate the zip file as a Node.js Buffer (compatible with Bun's Buffer)
    const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
            level: 9, // Max compression
        },
        // Optional: metadata about the entire zip file
        // comment: `Zip generated from data URL: ${dataUrl.substring(0, 50)}...`,
    });

    return zipBuffer;
}