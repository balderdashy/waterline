require('browserify')()
	.add('../../lib/waterline.js')
	.add('./main.js')
	.bundle()
	.pipe(process.stdout);