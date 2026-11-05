require('esbuild').buildSync({
    entryPoints: ['ui/gradient.tsx'], outfile: 'public/generated/gradient.js',
    bundle: true, minify: true, platform: 'browser', target: ['es2020'],
    jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'linked'
});
console.log('Gradiente Spell UI compilado.');
