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
		'--theme-rounded-container': '8px',
		'--theme-border-base': '1px',
		// =~= Theme On-X Colors =~=
		'--on-primary': '255 255 255',
		'--on-secondary': '0 0 0',
		'--on-tertiary': '0 0 0',
		'--on-success': '0 0 0',
		'--on-warning': '0 0 0',
		'--on-error': '255 255 255',
		'--on-surface': '255 255 255',
		// =~= Theme Colors  =~=
		// primary | #1b7b3c
		'--color-primary-50': '221 235 226', // #ddebe2
		'--color-primary-100': '209 229 216', // #d1e5d8
		'--color-primary-200': '198 222 206', // #c6dece
		'--color-primary-300': '164 202 177', // #a4cab1
		'--color-primary-400': '95 163 119', // #5fa377
		'--color-primary-500': '27 123 60', // #1b7b3c
		'--color-primary-600': '24 111 54', // #186f36
		'--color-primary-700': '20 92 45', // #145c2d
		'--color-primary-800': '16 74 36', // #104a24
		'--color-primary-900': '13 60 29', // #0d3c1d
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
		// error | #b33434
		'--color-error-50': '244 225 225', // #f4e1e1
		'--color-error-100': '240 214 214', // #f0d6d6
		'--color-error-200': '236 204 204', // #eccccc
		'--color-error-300': '225 174 174', // #e1aeae
		'--color-error-400': '202 113 113', // #ca7171
		'--color-error-500': '179 52 52', // #b33434
		'--color-error-600': '161 47 47', // #a12f2f
		'--color-error-700': '134 39 39', // #862727
		'--color-error-800': '107 31 31', // #6b1f1f
		'--color-error-900': '88 25 25', // #581919
		// surface | #141414
		// 50-400 form the light theme ramp (page, cards, fills, borders, muted text).
		// 500-900 stay near-black for the dark theme.
		'--color-surface-50': '246 248 247', // #f6f8f7 — light page background
		'--color-surface-100': '255 255 255', // #ffffff — light cards / app bar
		'--color-surface-200': '232 237 235', // #e8edeb — light fills, inputs, tracks
		'--color-surface-300': '195 204 201', // #c3ccc9 — light borders / dark muted text
		'--color-surface-400': '115 125 122', // #737d7a — muted text and icons
		'--color-surface-500': '20 20 20', // #141414
		'--color-surface-600': '18 18 18', // #121212
		'--color-surface-700': '15 15 15', // #0f0f0f
		'--color-surface-800': '12 12 12', // #0c0c0c
		'--color-surface-900': '10 10 10' // #0a0a0a
	}
};
