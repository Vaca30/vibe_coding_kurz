# From your project root (CC-GOOGLE-CLI)

# Clean up everything the CLI created
rm -rf skills skills-lock.json .claude/skills/gws-* .claude/skills/persona-* .claude/skills/recipe-*

# Clone the repo to a temp location
git clone --depth 1 https://github.com/googleworkspace/cli /tmp/gws-cli

# Copy just the skill folders into your project
mkdir -p .claude/skills
cp -r /tmp/gws-cli/skills/* .claude/skills/

# Clean up
rm -rf /tmp/gws-cli