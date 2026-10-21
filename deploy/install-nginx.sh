#!/bin/sh
set -e
DIR=/srv/araqandkahraman/frontend/deploy/nginx
DEST=/etc/nginx/sites-available/araqandkahramanauctions.qa.conf
CERT=/etc/letsencrypt/live/araqandkahramanauctions.qa/fullchain.pem
KEY=/etc/letsencrypt/live/araqandkahramanauctions.qa/privkey.pem

if test -f "$CERT" && test -f "$KEY"; then
  SRC="$DIR/araqandkahramanauctions.qa.conf"
else
  SRC="$DIR/araqandkahramanauctions.qa.http.conf"
fi

test -f "$SRC"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cp "$SRC" "$DEST"
ln -sfn "$DEST" /etc/nginx/sites-enabled/araqandkahramanauctions.qa.conf
nginx -t
systemctl reload nginx
