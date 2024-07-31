export class WordWidth {
	private wordMap = new Map<string, number>();
	private spaceRefLen: number = 0;
	private wordQue: { word: string; res: (len: number) => unknown }[] = [
		{
			word: '|',
			res: (len) => {
				this.wordMap.set(' ', this.spaceRefLen - len * 2);
			}
		},
		{
			word: '| |',
			res: (len) => {
				this.spaceRefLen = len;
			}
		}
	];
	private measureWord: (word: string) => Promise<number>;
	constructor(measure: (word: string) => Promise<number>) {
		this.measureWord = measure;
	}
	async get(word: string) {
		const prom = new Promise<number>((res) => this.wordQue.push({ word, res }));
		this.processQue();
		return prom;
	}
	private processing = false;
	private async processQue(): Promise<void> {
		if (this.processing || this.wordQue.length === 0) return;
		this.processing = true;
		const { word, res } = this.wordQue.pop() as { word: string; res: (len: number) => unknown };
		let len = this.wordMap.get(word);
		if (!len) {
			len = await this.measureWord(word);
			this.wordMap.set(word, len);
		}
		res(len);
		this.processing = false;
		return await this.processQue();
	}
}
