import type { CellConfigType } from '../../../../../../../../server/src/db.schema';

export function getErrorTitle(confType: CellConfigType) {
	const errorType = confType.split(':')[1];
	switch (errorType) {
		case 'multipleOptions':
			return 'Multiple Options';
		case 'missingValue':
			return 'Missing Value';
		case 'needsApproval':
			return 'Needs Approval';
		case 'needsApprovalCustom':
			return 'Custom Value Needs Approval';
		case 'matchWouldCauseDuplicate':
			return 'Match Would Cause Duplicate';
		case 'shouldNotBeNull':
			return 'Should Not Be Null';
		case 'invalidDataType':
			return 'Invalid Data Type';
		case 'contradictorySources':
			return 'Contradictory Sources';
		case 'canNotBeSetToNull':
			return 'Cannot Be Set To Null';
		case 'canNotBeSetToWrongType':
			return 'Cannot Be Set To Wrong Type';
		default:
			return errorType;
	}
}
