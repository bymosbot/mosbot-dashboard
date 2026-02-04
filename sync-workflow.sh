#!/bin/bash
# sync-workflow.sh
# AI Coding Workflow Synchronization Script
#
# This script synchronizes AI coding workflow files from the central repository
# to your project, ensuring you have the latest prompts, commands, and rules.
#
# Usage: ./sync-workflow.sh <workflow-repo-path> [environment]
# Arguments:
#   workflow-repo-path: Path to your local copy of the ai-coding-workflow repository
#   environment: dev (default) or qa

# Check if workflow repository path is provided
if [ $# -lt 1 ]; then
  echo "❌ Error: Workflow repository path is required"
  echo ""
  echo "Usage: $0 <workflow-repo-path> [environment]"
  echo ""
  echo "Arguments:"
  echo "  workflow-repo-path: Path to your local copy of the ai-coding-workflow repository"
  echo "  environment: dev (default) or qa"
  echo ""
  echo "Examples:"
  echo "  $0 /Users/username/ai-coding-workflow"
  echo "  $0 /Users/username/ai-coding-workflow qa"
  echo "  $0 \"/path/to/ai-coding-workflow\" dev"
  exit 1
fi

# Set the path to your AI coding workflow repository from first argument
WORKFLOW_REPO_PATH="$1"

# Get environment from second argument or default to dev
ENVIRONMENT="${2:-dev}"

# Validate environment
if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "qa" ]]; then
  echo "❌ Error: Environment must be 'dev' or 'qa'"
  echo "Usage: $0 <workflow-repo-path> [dev|qa]"
  exit 1
fi

# Check if workflow repository path exists
if [ ! -d "$WORKFLOW_REPO_PATH" ]; then
  echo "❌ Error: Workflow repository path not found: $WORKFLOW_REPO_PATH"
  echo ""
  echo "Please provide the correct path to your local copy of the ai-coding-workflow repository."
  echo "Example: $0 \"/Users/username/ai-coding-workflow\""
  exit 1
fi

echo "🔄 Syncing AI Coding Workflow..."
echo "Environment: $ENVIRONMENT"
echo "Source: $WORKFLOW_REPO_PATH/$ENVIRONMENT"
echo ""

# Sync .cursor directory
if [ -d "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.cursor" ]; then
  echo "📁 Syncing .cursor configuration..."
  cp -r "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.cursor" ./
  echo "✅ .cursor configuration synced"
else
  echo "❌ .cursor directory not found in $WORKFLOW_REPO_PATH/$ENVIRONMENT/"
  exit 1
fi

# Sync .claude directory
if [ -d "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.claude" ]; then
  echo "📁 Syncing .claude configuration..."
  cp -r "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.claude" ./
  echo "✅ .claude configuration synced"
else
  echo "❌ .claude directory not found in $WORKFLOW_REPO_PATH/$ENVIRONMENT/"
  exit 1
fi

# Sync .github directory
if [ -d "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.github" ]; then
  echo "📁 Syncing .github configuration..."
  cp -r "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.github" ./
  echo "✅ .github configuration synced"
else
  echo "❌ .github directory not found in $WORKFLOW_REPO_PATH/$ENVIRONMENT/"
  exit 1
fi

# Sync .cursorignore file if it doesn't already exist in destination
if [ -f "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.cursorignore" ]; then
  if [ -f ".cursorignore" ]; then
    echo "💾 .cursorignore already exists, preserving existing file..."
  else
    echo "📄 Syncing .cursorignore..."
    cp "$WORKFLOW_REPO_PATH/$ENVIRONMENT/.cursorignore" ./
    echo "✅ .cursorignore synced"
  fi
fi

echo ""
echo "🎉 AI Coding Workflow synced successfully!"
echo ""
echo "Environment: $ENVIRONMENT"
echo "Synced files:"
echo "  - .cursor/commands/ (AI command definitions)"
echo "  - .cursor/rules/ (Project rules and standards)"
echo "  - .claude/commands/ (Claude AI command definitions)"
echo "  - .claude/rules/ (Claude AI rules and standards)"
echo "  - .github/prompts/ (AI prompt templates)"
echo "  - .github/instructions/ (Workflow instructions)"
echo ""
echo "Next steps:"
echo "1. Review the synced configuration files"
echo "2. Customize rules in .cursor/rules/ for your project"
echo "3. Test the AI commands in your IDE"
echo "4. Read the 4-Step AI Coding Workflow documentation:"
echo "   https://reflexmedia.atlassian.net/wiki/spaces/~sufiyan/pages/1162182695/4-Step+AI+Coding+Workflow"
