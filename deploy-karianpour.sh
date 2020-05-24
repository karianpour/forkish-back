#!/bin/bash
set -e

echo 'deploying TEST forkish on karianpour server'

echo 'building back'
npm run build
rm -f dist.tar.gz
tar -czf dist.tar.gz ./dist
echo 'done :D'

prod_server=karianpour
now=`(date +%F_%H-%M-%S)`

echo 'copy back dist to server'
ssh kayvan@${prod_server} "rm -rf apps/forkish/back/dist_new && mkdir apps/forkish/back/dist_new"
scp  -r ./dist.tar.gz kayvan@${prod_server}:apps/forkish/back/dist_new/
scp  -r ./package.json kayvan@${prod_server}:apps/forkish/back/dist_new/
scp  -r ./package-lock.json kayvan@${prod_server}:apps/forkish/back/dist_new/
ssh kayvan@${prod_server} "tar -xzf apps/forkish/back/dist_new/dist.tar.gz -C apps/forkish/back/dist_new --strip-components=2 && rm apps/forkish/back/dist_new/dist.tar.gz"
echo 'done :D'

echo 'install dependencies for back on server'
ssh kayvan@${prod_server} "cp apps/forkish/back/dist_new/package.json apps/forkish/back/"
ssh kayvan@${prod_server} "cp apps/forkish/back/dist_new/package-lock.json apps/forkish/back/"
ssh kayvan@${prod_server} "cd apps/forkish/back/ && npm i --only=prod"
echo 'done :D'

echo 'run new forkish on server'
echo 'change back files'
ssh kayvan@${prod_server} "mv apps/forkish/back/dist apps/forkish/back/dist_old_$now"
ssh kayvan@${prod_server} "mv apps/forkish/back/dist_new apps/forkish/back/dist"

echo 'restart back on pm2'
ssh kayvan@${prod_server} "pm2 restart forkish-back"
echo 'done :D'


echo 'the deployment went well, enjoy the new version ;)'
