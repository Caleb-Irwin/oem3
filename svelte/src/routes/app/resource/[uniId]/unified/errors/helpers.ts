import type { CellConfigType, CellError } from '../../../../../../../../server/src/db.schema';
export type { CellConfigType, CellError } from '../../../../../../../../server/src/db.schema';
import type { ErrorAction } from '../../../../../../../../server/src/unified/cellErrors';

export function getErrorTitle(confType: CellConfigType) {
	if (confType in ERRORS_CONF) {
		return ERRORS_CONF[confType as CellError].title;
	} else {
		return confType.split(':')[1];
	}
}

export type ErrorDisplay =
	| 'none'
	| 'valueOnly'
	| 'multipleOptions'
	| 'approval'
	| 'customApproval'
	| 'contradictorySources';

export type ErrorActions = ErrorAction;

export interface ErrorConfType {
	confType: CellError;
	title: string;
	instructions: string;
	display: ErrorDisplay;
	actions: ErrorActions[];
}

export const ERRORS_CONF: Record<CellError, ErrorConfType> = {
	// Approval Errors
	'error:needsApproval': {
		confType: 'error:needsApproval',
		title: 'Needs Approval',
		instructions: 'This value needs approval before it can be set.',
		display: 'approval',
		actions: ['approve', 'reject']
	},
	'error:needsApprovalCustom': {
		confType: 'error:needsApprovalCustom',
		title: 'Custom Value Needs Approval',
		instructions:
			'The underlying (auto) value has changed. You can keep the custom value, or set it to the new auto (underlying) value by removing the custom value setting.',
		display: 'customApproval',
		actions: ['setAuto', 'keepCustom']
	},
	// Value Errors
	'error:missingValue': {
		confType: 'error:missingValue',
		title: 'Missing Value',
		instructions:
			'This value is missing and needs to be set. You can set a custom value setting or ignore the error.',
		display: 'valueOnly',
		actions: ['ignore']
	},
	'error:shouldNotBeNull': {
		confType: 'error:shouldNotBeNull',
		title: 'Should Not Be Null',
		instructions: 'This value should not be null. Add a custom value setting or ignore the error.',
		display: 'none',
		actions: ['ignore']
	},
	'error:canNotBeSetToNull': {
		confType: 'error:canNotBeSetToNull',
		title: 'Cannot Be Set To Null',
		instructions:
			'This value cannot be set to null. Add a custom value setting or ignore the error.',
		display: 'none',
		actions: ['ignore']
	},
	'error:canNotBeSetToWrongType': {
		confType: 'error:canNotBeSetToWrongType',
		title: 'Cannot Be Set To Wrong Type',
		instructions:
			'This value cannot be set to the wrong type. Add/modify a custom value setting. You should generally NOT ignore this error.',
		display: 'valueOnly',
		actions: ['ignore']
	},
	'error:invalidDataType': {
		confType: 'error:invalidDataType',
		title: 'Invalid Data Type',
		instructions:
			'This value is of an invalid data type. Add/modify a custom value setting. You should generally NOT ignore this error.',
		display: 'valueOnly',
		actions: ['ignore']
	},
	// Matching Errors
	'error:matchWouldCauseDuplicate': {
		confType: 'error:matchWouldCauseDuplicate',
		title: 'Match Would Cause Duplicate',
		instructions:
			'This item is already matched. If used here, it would cause a duplicate match. You can ignore this issue or unmatch the below item from its current unified item. To see its current match, click on the green unified guild/spr/item link below.',
		display: 'valueOnly',
		actions: ['ignore']
	},
	'error:multipleOptions': {
		confType: 'error:multipleOptions',
		title: 'Multiple Options',
		instructions:
			'This value has multiple options. You can keep the current value, or select a custom value.',
		display: 'multipleOptions',
		actions: []
	},
	'error:contradictorySources': {
		confType: 'error:contradictorySources',
		title: 'Contradictory Sources',
		instructions:
			'This value has contradictory sources. Either keep the current value, or set a custom value.',
		display: 'contradictorySources',
		actions: []
	}
};
