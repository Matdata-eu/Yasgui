#!/bin/sh

# Set default value if the environment variable is not set
: ${YASGUI_DEFAULT_ENDPOINT:="https://dbpedia.org/sparql"}

# Replace the default endpoint in the bundle.js file
echo "Switching YASGUI default endpoint to: $YASGUI_DEFAULT_ENDPOINT"
sed -i "s|https://change.to.default.endpoint/sparql|$YASGUI_DEFAULT_ENDPOINT|g" /usr/share/nginx/html/*.js

# Execute the command passed to the entrypoint
exec "$@"

# Execute the original Docker entrypoint script
exec /docker-entrypoint.sh