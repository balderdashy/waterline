
coverage:
	@echo "\n\nRunning coverage report..."
	rm -rf coverage
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/core ./node_modules/.bin/_mocha \
		test/integration test/structure test/support test/unit -- --recursive
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/adapter test/adapter/runner.js
	./node_modules/istanbul/lib/cli.js report


.PHONY: coverage
