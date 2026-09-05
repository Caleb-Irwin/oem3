/** Hands the browser a generated file without a round trip through the server. */
export function downloadTextFile(fileName: string, contents: string, type = 'text/csv') {
	const url = URL.createObjectURL(new Blob([contents], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
