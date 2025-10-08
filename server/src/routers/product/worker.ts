import { work } from '../../utils/workerBase';
import { productUnifier } from './productUnifier';

work({
	process: async ({ progress, utils: { customMessage } }) => {
		await productUnifier.updateUnifiedTable({
			progress,
			onUpdateCallback: (uniId) => customMessage(uniId.toString())
		});
	}
});
