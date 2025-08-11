import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export interface GeminiResponse {
  text: string;
  error?: string;
}

export class GeminiService {
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey: string) {
    this.google = createGoogleGenerativeAI({ apiKey });
  }

  async generateResponse(userMessage: string, useGrounding: boolean = true): Promise<GeminiResponse> {
    const createGenerationConfig = (useGrounding: boolean) => ({
      model: this.google('gemini-2.0-flash-exp'),
      prompt: userMessage,
      tools: useGrounding ? { googleSearchRetrieval: {} } : undefined,
      temperature: 0.7,
    });

    const handleSuccess = (result: { text: string }) => 
      result.text 
        ? { text: result.text }
        : { 
            text: 'Sorry, I was unable to generate a response to your message.',
            error: 'Empty response from Gemini'
          };

    const handleError = (error: unknown): GeminiResponse => {
      console.error('Gemini API error:', error);
      return {
        text: 'Sorry, I encountered an error while processing your request. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    };

    try {
      const config = createGenerationConfig(useGrounding);
      const result = await generateText(config);
      return handleSuccess(result);
    } catch (error) {
      return handleError(error);
    }
  }

  async generateResponseWithContext(
    userMessage: string, 
    context?: string,
    useGrounding: boolean = true
  ): Promise<GeminiResponse> {
    const createContextualPrompt = (userMessage: string, context?: string) => 
      context 
        ? `Context: ${context}\n\nUser question: ${userMessage}\n\nPlease provide a helpful response based on the context and question.`
        : userMessage;

    const handleContextError = (error: unknown): GeminiResponse => {
      console.error('Gemini API error with context:', error);
      return {
        text: 'Sorry, I encountered an error while processing your request with context. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    };

    try {
      const prompt = createContextualPrompt(userMessage, context);
      return await this.generateResponse(prompt, useGrounding);
    } catch (error) {
      return handleContextError(error);
    }
  }

  formatForSlack(text: string): string {
    // Basic formatting for Slack - can be enhanced later
    return text
      .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert **bold** to *bold*
      .replace(/\*(.*?)\*/g, '_$1_')     // Convert *italic* to _italic_
      .trim();
  }
}