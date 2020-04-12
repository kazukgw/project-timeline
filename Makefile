.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

login: ## clasp login
	npx clasp login --no-localhost

push: ## clasp push
	cp src/*.html dist/
	cp src/*.ts dist/
	cp src/moment.min.js dist/
	cp src/js.js dist/js.html
	cp src/js_models.js dist/js_models.html
	cp src/js_ui.js dist/js_ui.html
	npx clasp push
