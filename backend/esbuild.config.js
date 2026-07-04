import esbuild from 'esbuild';

esbuild.build({
	entryPoints: ['src/server.js'],
	bundle: true,
	platform: 'node',
	target: 'node20',
	outfile: 'dist/server.js',
	format: 'esm',
	banner: {
		js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
	},
}).catch(() => process.exit(1));
