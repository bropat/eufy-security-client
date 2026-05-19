#!/usr/bin/env bash
# ==========================================
# GENERATE CHANGELOG
# Extracts merged PRs since a given PR number
# and formats them for the README changelog.
# ==========================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <start_pr_number>"
    echo "Example: $0 791"
    echo ""
    echo "Generates changelog entries for all PRs merged after the given PR number."
    exit 1
fi

START_PR=$1

if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is required but not installed."
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed."
    exit 1
fi

REPO_URL=$(gh repo view --json url -q '.url')

# Fetch all merged PRs with number > START_PR
PRS=$(gh pr list --state merged --limit 100 --json number,title,author,body \
    | jq --argjson start "$START_PR" '[.[] | select(.number > $start)] | sort_by(.number)')

if [ "$(echo "$PRS" | jq 'length')" -eq 0 ]; then
    echo "No merged PRs found after #${START_PR}."
    exit 0
fi

FEATURES=""
FIXES=""
CHORES=""

while IFS= read -r pr; do
    number=$(echo "$pr" | jq -r '.number')
    title=$(echo "$pr" | jq -r '.title')
    author=$(echo "$pr" | jq -r '.author.login')
    lower_title=$(echo "$title" | tr '[:upper:]' '[:lower:]')

    # Skip merge/sync PRs
    if echo "$lower_title" | grep -qE '^(develop|master|develop > master|master > develop)'; then
        continue
    fi

    # Skip release PRs
    if echo "$lower_title" | grep -qiE '^release'; then
        continue
    fi

    # Clean up the title: remove conventional commit prefixes
    clean_title=$(echo "$title" | sed -E 's/^(feat|fix|chore|refactor|docs|test|ci|build|perf|style)(\(.+\))?[!]?:\s*//i')
    # Capitalize first letter
    clean_title="$(echo "${clean_title:0:1}" | tr '[:lower:]' '[:upper:]')${clean_title:1}"

    url="${REPO_URL}/pull/${number}"

    # Categorize based on title prefix or content
    if echo "$lower_title" | grep -qiE '^fix|fix:'; then
        FIXES="${FIXES}* Fix: ${clean_title} by @${author} in ${url}\n"
    elif echo "$lower_title" | grep -qiE '^(chore|bump|upgrade|refactor|test|ci|build)'; then
        CHORES="${CHORES}* Chore: ${clean_title} by @${author} in ${url}\n"
    elif echo "$lower_title" | grep -qiE '(add support|add device|new device|feat)'; then
        FEATURES="${FEATURES}* Feature: ${clean_title} by @${author} in ${url}\n"
    elif echo "$lower_title" | grep -qiE '(add|adding|new|support)'; then
        FEATURES="${FEATURES}* Feature: ${clean_title} by @${author} in ${url}\n"
    elif echo "$lower_title" | grep -qiE 'fix'; then
        FIXES="${FIXES}* Fix: ${clean_title} by @${author} in ${url}\n"
    else
        FEATURES="${FEATURES}* Feature: ${clean_title} by @${author} in ${url}\n"
    fi
done < <(echo "$PRS" | jq -c '.[]')

# Print results
if [ -n "$FEATURES" ]; then
    echo -e "$FEATURES" | sed '/^$/d'
fi
if [ -n "$FIXES" ]; then
    echo -e "$FIXES" | sed '/^$/d'
fi
if [ -n "$CHORES" ]; then
    echo -e "$CHORES" | sed '/^$/d'
fi