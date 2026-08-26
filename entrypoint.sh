#!/bin/sh
set -e
/usr/local/bin/contact-server &
exec "$@"
