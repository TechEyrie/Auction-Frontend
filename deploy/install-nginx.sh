#!/bin/sh
set -e
SRC=/srv/araqandkahraman/frontend/deploy/nginx/araqandkahramanauctions.qa.conf
DEST=/etc/nginx/sites-available/araqandkahramanauctions.qa.conf
test -f "$SRC"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
cp "$SRC" "$DEST"
ln -sfn "$DEST" /etc/nginx/sites-enabled/araqandkahramanauctions.qa.conf
nginx -t
systemctl reload nginx
