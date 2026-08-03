import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
	downloadEtilizeFile,
	getEtilizeCredentials,
	type EtilizeCredentials
} from '../etilizeLftp';

const SPR_FLAT_FILE_REMOTE_PATH = '/Extras/Flat_File_Export/EN_CA/EN_CA_SPRC.csv';

export async function downloadSprFlatFile(
	credentials: EtilizeCredentials = getEtilizeCredentials(),
	executable = 'lftp'
): Promise<string> {
	const tempDirectory = mkdtempSync(join(tmpdir(), 'oem3-spr-flat-file-'));
	const localPath = join(tempDirectory, 'EN_CA_SPRC.csv');

	try {
		await downloadEtilizeFile(credentials, SPR_FLAT_FILE_REMOTE_PATH, localPath, executable);
		const contents = await Bun.file(localPath).arrayBuffer();
		return `data:text/csv;base64,${Buffer.from(contents).toString('base64')}`;
	} finally {
		rmSync(tempDirectory, { recursive: true, force: true });
	}
}
