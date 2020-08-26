#!/bin/bash

set -eu

git pull --ff-only
curl --remote-name https://gist.githubusercontent.com/HiroshiOkada/5a2ac826530cc851a897f739f36618f7/raw/sec_to_edinet.json

change=$(git status --porcelain)
if [ -n "$change" ]; then
  echo "$change"
  git add sec_to_edinet.json
  git commit -m 'Update sec to edinet infomation'
  git push origin master
  npm version patch
  npm publish
  git push origin master
fi
