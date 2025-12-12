# ==========================================
# CUT RELEASE
# ==========================================

# Check if all arguments are provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 '2.0.0'"
    exit 1
fi

VERSION=$1

# Checkout develop
git checkout develop

# Pull the latest
git pull origin develop

# Make branch for the release
git checkout -b "release/$VERSION" || exit 1

# Update file
sed -i 's/version": .*/version": "$$VERSION",/' package.json

# Add file to the branch and commit
git add package.json
git commit -m "Add new version"

# Push
#git push