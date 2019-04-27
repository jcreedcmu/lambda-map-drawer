watch:
	npm run watch

build:
	npm run build
	git add public/js/bundle.js
	git commit -m "Build new bundle for github pages."
# Then need to manually do:
# git push
# cd ~/proj/jcreedcmu.github.io
# git submodule update --init --remote -- demo/lambda-map-drawer
# git add demo/lambda-map-drawer
# git commit -m 'Bump lambda-map-drawer version.'
# git push
test:
	npm run test
