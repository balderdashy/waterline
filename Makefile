ROOT=$(shell pwd)

test: test-unit test-integration

test-unit:
	@echo "\nRunning unit tests..."
	@NODE_ENV=test mocha test/integration test/structure test/support test/unit --recursive

test-integration:
	@echo "\nRunning integration tests..."
	rm -rf node_modules/waterline-adapter-tests/node_modules/waterline;
	ln -s $(ROOT) node_modules/waterline-adapter-tests/node_modules/waterline;
	@NODE_ENV=test node test/adapter/runner.js

coverage:
	@echo "\n\nRunning coverage report..."
	rm -rf coverage
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/core ./node_modules/.bin/_mocha \
		test/integration test/structure test/support test/unit -- --recursive
	./node_modules/istanbul/lib/cli.js cover --report none --dir coverage/adapter test/adapter/runner.js
	./node_modules/istanbul/lib/cli.js report


.PHONY: coverage
