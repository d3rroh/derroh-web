#!/bin/sh
# Runs the contact server (as the unprivileged `contact` user) next to
# nginx. If either process dies the container exits, so the orchestrator
# restarts it instead of leaving nginx up with a dead /api/contact.
set -u

su-exec contact /usr/local/bin/contact-server &
contact_pid=$!

"$@" &
main_pid=$!

# Forward stop signals: nginx gets the one we received (SIGQUIT, the nginx
# image's STOPSIGNAL, means graceful shutdown); the Go server gets SIGTERM.
stopping=
stop() {
  stopping=1
  kill -"$1" "$main_pid" 2>/dev/null
  kill -TERM "$contact_pid" 2>/dev/null
}
trap 'stop TERM' TERM
trap 'stop INT' INT
trap 'stop QUIT' QUIT

while [ -z "$stopping" ] && kill -0 "$main_pid" 2>/dev/null && kill -0 "$contact_pid" 2>/dev/null; do
  sleep 2
done

status=0
if [ -z "$stopping" ]; then
  echo "entrypoint: a process exited unexpectedly, stopping container" >&2
  kill -TERM "$main_pid" "$contact_pid" 2>/dev/null
  status=1
fi
wait "$main_pid" 2>/dev/null
wait "$contact_pid" 2>/dev/null
exit "$status"
