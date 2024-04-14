export const formatPrice = (price: number) =>
	new Intl.NumberFormat('en-CA', {
		style: 'currency',
		currency: 'CAD'
	}).format(price);
