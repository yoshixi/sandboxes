# Slack Bot Environment Variables

This document outlines the environment variables required for the Slack bot implementation.

## Required Environment Variables

1. `SLACK_SIGNING_SECRET` - Slack signing secret for verifying requests
2. `SLACK_BOT_TOKEN` - Slack bot token for API authentication
3. `GOOGLE_GENERATIVE_AI_API_KEY` - API key for Google's Generative AI (Gemini)
4. `GOOGLE_SEARCH_API_KEY` - API key for Google Search (optional, for web search functionality)
5. `GOOGLE_SEARCH_ENGINE_ID` - Search engine ID for Google Search (optional, for web search functionality)

## Example .env.local file

```env
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
GOOGLE_GENERATIVE_AI_API_KEY=your-google-generative-ai-api-key
GOOGLE_SEARCH_API_KEY=your-google-search-api-key
GOOGLE_SEARCH_ENGINE_ID=your-google-search-engine-id
```

## Security Notes

- Never commit these values to version control
- The `.env.local` file should be added to `.gitignore` (already configured)
- In production, set these values in your deployment platform's environment variables