ROOT=$(shell pwd)

test: test-unit test-integration

test-unit:
	@echo "\nRunning unit tests..."
	@NODE_ENV=test mocha test/integration test/structure test/support test/unit --recursive

test-integration:
	@echo "\nRunning integration tests..."
	rm -rf node_modules/waterline-adapter-tests/node_modules/waterline;
	ln -s "$(ROOT)" node_modules/waterline-adapter-tests/node_modules/waterline;
	@NODE_ENV=test node test/adapter/runner.js


