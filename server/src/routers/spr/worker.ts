import { work } from '../../utils/workerBase';
import { sprUnifier } from './sprUnifier';

work({
	process: async ({ progress, utils: { customMessage } }) => {
		await sprUnifier.updateUnifiedTable({
			progress,
			onUpdateCallback: (uniId) => customMessage(uniId.toString())
		});
	}
});
