#!/bin/sh
# Start Go backend in background
./ipinfo-server &

# Start nginx in foreground
nginx -g 'daemon off;'
