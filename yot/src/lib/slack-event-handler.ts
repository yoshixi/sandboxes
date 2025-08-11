import { GeminiService } from './gemini-service';

interface SlackMessageEvent {
  type: string;
  user: string;
  text: string;
  channel: string;
  ts: string;
  bot_id?: string;
}

export interface SlackEvent {
  type: string;
  event?: SlackMessageEvent;
  challenge?: string;
}

export interface SlackEventHandlerOptions {
  geminiService: GeminiService;
  slackBotToken: string;
}

export class SlackEventHandler {
  private geminiService: GeminiService;
  private slackBotToken: string;

  constructor(options: SlackEventHandlerOptions) {
    this.geminiService = options.geminiService;
    this.slackBotToken = options.slackBotToken;
  }

  async handleEvent(event: SlackEvent): Promise<{ challenge?: string; status?: string; message?: string }> {
    try {
      // Handle URL verification challenge
      if (event.type === 'url_verification') {
        return { challenge: event.challenge };
      }

      // Handle event callbacks
      if (event.type === 'event_callback' && event.event) {
        return await this.handleEventCallback(event.event);
      }

      return { status: 'ignored', message: 'Unsupported event type' };
    } catch (error) {
      console.error('Error handling Slack event:', error);
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async handleEventCallback(event: SlackMessageEvent): Promise<{ status: string; message: string }> {
    // Ignore messages from bots to prevent infinite loops
    if (event.bot_id || event.user === 'USLACKBOT') {
      return { status: 'ignored', message: 'Bot message ignored' };
    }

    // Handle message events
    if (event.type === 'message' && event.text) {
      return await this.handleMessageEvent(event);
    }

    return { status: 'ignored', message: 'Unsupported event callback type' };
  }

  private async handleMessageEvent(event: SlackMessageEvent): Promise<{ status: string; message: string }> {
    const processMessage = async (userMessage: string, channel: string) => {
      const geminiResponse = await this.geminiService.generateResponse(userMessage, true);
      
      if (geminiResponse.error) {
        console.error('Gemini error:', geminiResponse.error);
      }

      const formattedResponse = this.geminiService.formatForSlack(geminiResponse.text);
      await this.postMessage(channel, formattedResponse);
      
      return { status: 'success', message: 'Response sent' };
    };

    const handleError = async (error: unknown, channel: string) => {
      console.error('Error handling message event:', error);
      
      const sendErrorMessage = async () => {
        try {
          await this.postMessage(channel, 'Sorry, I encountered an error processing your message. Please try again later.');
        } catch (postError) {
          console.error('Error posting error message:', postError);
        }
      };

      await sendErrorMessage();

      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    };

    try {
      return await processMessage(event.text, event.channel);
    } catch (error) {
      return await handleError(error, event.channel);
    }
  }

  private async postMessage(channel: string, text: string): Promise<void> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.slackBotToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text,
        mrkdwn: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Failed to post message to Slack: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
    }
  }

  // Helper method to check if bot should respond to this message
  private shouldRespondToMessage(event: SlackMessageEvent): boolean {
    // Don't respond to bot messages
    if (event.bot_id || event.user === 'USLACKBOT') {
      return false;
    }

    // For now, respond to all direct messages and channel messages
    // In the future, you might want to add logic to only respond when mentioned
    return true;
  }
}