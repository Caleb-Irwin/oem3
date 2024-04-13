import jsPDF from 'jspdf';
import { Canvg } from 'canvg';

export const genPDF = (c: HTMLCanvasElement) => {
	let doc = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
	const ctx = c.getContext('2d') as CanvasRenderingContext2D;
	let firstPage = true;
	return {
		addPage: async (svg: string) => {
			const v = Canvg.fromString(ctx, svg);
			await v.render();
			if (!firstPage) {
				doc.addPage();
			}
			firstPage = false;
			doc.addImage(c.toDataURL('image/jpeg').toString(), 'png', 0, 0, 8.5, 11);
		},
		save: (title: string) => {
			doc.save(title + '.pdf');
			doc = null as unknown as jsPDF;
		}
	};
};
