export async function modifyError({}: {}) {
	console.log('TODO - modifyError called');
}

export const ErrorActionValues = [
	'markAsResolved',
	'ignore',
	'approve',
	'reject',
	'keepCustom',
	'setAuto',
	'keepValue'
] as const;

export type ErrorAction = (typeof ErrorActionValues)[number];
