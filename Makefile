.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

login: ## clasp login
	npx clasp login --no-localhost

push: ## clasp push
	cp src/*.html dist/
	cp src/*.ts dist/
	cp src/moment.min.js dist/
	cp src/_js_entrypoint.js dist/_js_entrypoint.html
	cp src/_js_models.js dist/_js_models.html
	cp src/_js_rpc.js dist/_js_rpc.html
	cp src/_js_ui.js dist/_js_ui.html
	npx clasp push
