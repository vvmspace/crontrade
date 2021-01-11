#!/bin/bash

npm run build && rm -rf ./prod
cp -r ./dist ./prod
kill-port 6789
pm2 stop main
pm2 delete main
pm2 start -f ./prod/main.js
