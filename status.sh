#!/bin/bash

# Target timestamp: June 26, 2025, at 07:00 AM
TARGET_TIMESTAMP=$(date -d "2025-06-26 07:00:00" +%s)

# End timestamp: June 27, 2025, at 09:45 AM
END_TIMESTAMP=$(date -d "2025-06-27 09:45:00" +%s)

# Current timestamp
CURRENT_TIMESTAMP=$(date +%s)

# Calculate the time difference in seconds
DIFF_SECONDS=$((TARGET_TIMESTAMP - CURRENT_TIMESTAMP))

if [[ $CURRENT_TIMESTAMP -ge $END_TIMESTAMP ]]; then
    MESSAGE="Event ended!"
    X_TAG="trophy"
elif [[ $DIFF_SECONDS -le 0 ]]; then
    MESSAGE="Event in progress..."
    X_TAG="hourglass_flowing_sand"
else
    DAYS_LEFT=$((DIFF_SECONDS / 86400))
    HOURS_LEFT=$(( (DIFF_SECONDS % 86400) / 3600 ))

    if [[ $DAYS_LEFT -gt 0 ]]; then
        MESSAGE="$DAYS_LEFT""d $HOURS_LEFT""h left!"
    else
        MESSAGE="$HOURS_LEFT""h left!"
    fi

    X_TAG="alarm_clock"
fi

# Send data via curl to the UNIX socket with X-Tag header
curl -X PUT --unix-socket ~/node_apps/Discord-Bot/status.sock \
    -H "Content-Type: text/plain" \
    -H "X-Tag: $X_TAG" \
    localhost/status \
    -d "$MESSAGE"