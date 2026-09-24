import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
	downloadEtilizeFile,
	getEtilizeCredentials,
	type EtilizeCredentials
} from '../etilizeLftp';

export type FlatFileLocale = 'EN_CA' | 'FR_CA';

const flatFileRemotePath = (locale: FlatFileLocale) =>
	`/Extras/Flat_File_Export/${locale}/${locale}_SPRC.csv`;

export async function downloadSprFlatFile(
	credentials: EtilizeCredentials = getEtilizeCredentials(),
	executable = 'lftp',
	locale: FlatFileLocale = 'EN_CA'
): Promise<string> {
	const tempDirectory = mkdtempSync(join(tmpdir(), 'oem3-spr-flat-file-'));
	const localPath = join(tempDirectory, `${locale}_SPRC.csv`);

	try {
		await downloadEtilizeFile(credentials, flatFileRemotePath(locale), localPath, executable);
		const contents = await Bun.file(localPath).arrayBuffer();
		return `data:text/csv;base64,${Buffer.from(contents).toString('base64')}`;
	} finally {
		rmSync(tempDirectory, { recursive: true, force: true });
	}
}
