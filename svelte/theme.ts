import type { CustomThemeConfig } from '@skeletonlabs/tw-plugin';

export const greenTheme: CustomThemeConfig = {
	name: 'green-theme',
	properties: {
		// =~= Theme Properties =~=
		'--theme-font-family-base': `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
		'--theme-font-family-heading': `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
		'--theme-font-color-base': '0 0 0',
		'--theme-font-color-dark': '255 255 255',
		'--theme-rounded-base': '9999px',
		'--theme-rounded-container': '4px',
		'--theme-border-base': '1px',
		// =~= Theme On-X Colors =~=
		'--on-primary': '0 0 0',
		'--on-secondary': '0 0 0',
		'--on-tertiary': '0 0 0',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '0 0 0',
		'--on-surface': '255 255 255',
		// =~= Theme Colors  =~=
		// primary | #55b382
		'--color-primary-50': '230 244 236', // #e6f4ec
		'--color-primary-100': '221 240 230', // #ddf0e6
		'--color-primary-200': '213 236 224', // #d5ece0
		'--color-primary-300': '187 225 205', // #bbe1cd
		'--color-primary-400': '136 202 168', // #88caa8
		'--color-primary-500': '85 179 130', // #55b382
		'--color-primary-600': '77 161 117', // #4da175
		'--color-primary-700': '64 134 98', // #408662
		'--color-primary-800': '51 107 78', // #336b4e
		'--color-primary-900': '42 88 64', // #2a5840
		// secondary | #43976A
		'--color-secondary-50': '227 239 233', // #e3efe9
		'--color-secondary-100': '217 234 225', // #d9eae1
		'--color-secondary-200': '208 229 218', // #d0e5da
		'--color-secondary-300': '180 213 195', // #b4d5c3
		'--color-secondary-400': '123 182 151', // #7bb697
		'--color-secondary-500': '67 151 106', // #43976A
		'--color-secondary-600': '60 136 95', // #3c885f
		'--color-secondary-700': '50 113 80', // #327150
		'--color-secondary-800': '40 91 64', // #285b40
		'--color-secondary-900': '33 74 52', // #214a34
		// tertiary | #7183b7
		'--color-tertiary-50': '234 236 244', // #eaecf4
		'--color-tertiary-100': '227 230 241', // #e3e6f1
		'--color-tertiary-200': '220 224 237', // #dce0ed
		'--color-tertiary-300': '198 205 226', // #c6cde2
		'--color-tertiary-400': '156 168 205', // #9ca8cd
		'--color-tertiary-500': '113 131 183', // #7183b7
		'--color-tertiary-600': '102 118 165', // #6676a5
		'--color-tertiary-700': '85 98 137', // #556289
		'--color-tertiary-800': '68 79 110', // #444f6e
		'--color-tertiary-900': '55 64 90', // #37405a
		// success | #69dc7d
		'--color-success-50': '233 250 236', // #e9faec
		'--color-success-100': '225 248 229', // #e1f8e5
		'--color-success-200': '218 246 223', // #daf6df
		'--color-success-300': '195 241 203', // #c3f1cb
		'--color-success-400': '150 231 164', // #96e7a4
		'--color-success-500': '105 220 125', // #69dc7d
		'--color-success-600': '95 198 113', // #5fc671
		'--color-success-700': '79 165 94', // #4fa55e
		'--color-success-800': '63 132 75', // #3f844b
		'--color-success-900': '51 108 61', // #336c3d
		// warning | #f4da8a
		'--color-warning-50': '253 249 237', // #fdf9ed
		'--color-warning-100': '253 248 232', // #fdf8e8
		'--color-warning-200': '252 246 226', // #fcf6e2
		'--color-warning-300': '251 240 208', // #fbf0d0
		'--color-warning-400': '247 229 173', // #f7e5ad
		'--color-warning-500': '244 218 138', // #f4da8a
		'--color-warning-600': '220 196 124', // #dcc47c
		'--color-warning-700': '183 164 104', // #b7a468
		'--color-warning-800': '146 131 83', // #928353
		'--color-warning-900': '120 107 68', // #786b44
		// error | #f48abf
		'--color-error-50': '253 237 245', // #fdedf5
		'--color-error-100': '253 232 242', // #fde8f2
		'--color-error-200': '252 226 239', // #fce2ef
		'--color-error-300': '251 208 229', // #fbd0e5
		'--color-error-400': '247 173 210', // #f7add2
		'--color-error-500': '244 138 191', // #f48abf
		'--color-error-600': '220 124 172', // #dc7cac
		'--color-error-700': '183 104 143', // #b7688f
		'--color-error-800': '146 83 115', // #925373
		'--color-error-900': '120 68 94', // #78445e
		// surface | #141414
		'--color-surface-50': '220 220 220', // #dcdcdc
		'--color-surface-100': '208 208 208', // #d0d0d0
		'--color-surface-200': '196 196 196', // #c4c4c4
		'--color-surface-300': '161 161 161', // #a1a1a1
		'--color-surface-400': '91 91 91', // #5b5b5b
		'--color-surface-500': '20 20 20', // #141414
		'--color-surface-600': '18 18 18', // #121212
		'--color-surface-700': '15 15 15', // #0f0f0f
		'--color-surface-800': '12 12 12', // #0c0c0c
		'--color-surface-900': '10 10 10' // #0a0a0a
	}
};
