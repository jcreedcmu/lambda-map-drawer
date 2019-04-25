watch:
	npm run watch

build:
	npm run build
	git add public/js/bundle.js
	git commit -m "Build new bundle for github pages."

test:
	npm run test
