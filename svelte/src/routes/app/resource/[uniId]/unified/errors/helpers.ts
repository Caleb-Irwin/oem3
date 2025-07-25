import type { CellConfigType, CellError } from '../../../../../../../../server/src/db.schema';
export type { CellConfigType, CellError } from '../../../../../../../../server/src/db.schema';

export function getErrorTitle(confType: CellConfigType) {
	if (confType in ERRORS_CONF) {
		return ERRORS_CONF[confType as CellError].title;
	} else {
		return confType.split(':')[1];
	}
}

type ErrorActions = 'markAsResolved' | 'ignore' | 'approve' | 'reject' | 'keepCustom';

export interface ErrorConfType {
	confType: CellError;
	title: string;
	instructions: string;
	actions: [ErrorActions, ...ErrorActions[]];
}

export const ERRORS_CONF: Record<CellError, ErrorConfType> = {
	// Approval Errors
	'error:needsApproval': {
		confType: 'error:needsApproval',
		title: 'Needs Approval',
		instructions: 'This value needs approval before it can be set.', //TODO
		actions: ['approve', 'reject']
	},
	'error:needsApprovalCustom': {
		confType: 'error:needsApprovalCustom',
		title: 'Custom Value Needs Approval',
		instructions:
			'This custom value needs approval before it can be set. Keep the custom value or set cell setting to auto.',
		actions: ['keepCustom']
	},
	// Value Errors
	'error:missingValue': {
		confType: 'error:missingValue',
		title: 'Missing Value',
		instructions:
			'This value is missing and needs to be set. You can set a custom value setting or ignore the error.',
		actions: ['ignore']
	},
	'error:shouldNotBeNull': {
		confType: 'error:shouldNotBeNull',
		title: 'Should Not Be Null',
		instructions: 'This value should not be null. Add a custom value setting or ignore the error.',
		actions: ['ignore']
	},
	'error:canNotBeSetToNull': {
		confType: 'error:canNotBeSetToNull',
		title: 'Cannot Be Set To Null',
		instructions:
			'This value cannot be set to null. Add a custom value setting or ignore the error.',
		actions: ['ignore']
	},
	'error:canNotBeSetToWrongType': {
		confType: 'error:canNotBeSetToWrongType',
		title: 'Cannot Be Set To Wrong Type',
		instructions:
			'This value cannot be set to the wrong type. Add/modify a custom value setting. You should generally NOT ignore this error.',
		actions: ['ignore']
	},
	'error:invalidDataType': {
		confType: 'error:invalidDataType',
		title: 'Invalid Data Type',
		instructions:
			'This value is of an invalid data type. Add/modify a custom value setting. You should generally NOT ignore this error.',
		actions: ['ignore']
	},
	// Matching Errors
	'error:matchWouldCauseDuplicate': {
		confType: 'error:matchWouldCauseDuplicate',
		title: 'Match Would Cause Duplicate',
		instructions:
			'This value would cause a duplicate match. You can set a custom value setting or ignore the error.', //TODO
		actions: ['markAsResolved']
	},
	'error:multipleOptions': {
		confType: 'error:multipleOptions',
		title: 'Multiple Options',
		instructions:
			'This value has multiple options. You can set a custom value setting or ignore the error.', //TODO
		actions: ['markAsResolved']
	},
	'error:contradictorySources': {
		confType: 'error:contradictorySources',
		title: 'Contradictory Sources',
		instructions:
			'This value has contradictory sources. If the current value is what you want, you can mark it as resolved. Otherwise, set a custom value setting or ignore the error.',
		actions: ['markAsResolved']
	}
};
