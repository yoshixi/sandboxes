import { Hono } from "hono";
import { handle } from "hono/vercel";
import { verifySlackRequest, extractSlackHeaders } from "../../../lib/slack-verification";
import { GeminiService } from "../../../lib/gemini-service";
import { SlackEventHandler } from "../../../lib/slack-event-handler";
import { 
  createErrorResponse, 
  logError, 
  SlackVerificationError,
  ConfigurationError
} from "../../../lib/error-handler";

export const runtime = "edge";

const app = new Hono().basePath("/api");

// Validate environment variables
function validateEnvironment() {
  const required = ['GOOGLE_GENERATIVE_AI_API_KEY', 'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new ConfigurationError(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Initialize services with error handling using functional approach
const initializeServices = () => {
  try {
    validateEnvironment();
    const geminiService = new GeminiService(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const slackEventHandler = new SlackEventHandler({
      geminiService,
      slackBotToken: process.env.SLACK_BOT_TOKEN!,
    });
    return { geminiService, slackEventHandler, error: null };
  } catch (error) {
    logError('Service initialization', error instanceof Error ? error : String(error));
    return { geminiService: null, slackEventHandler: null, error };
  }
};

const services = initializeServices();

app.get("/hello", (c) => {
  return c.json({
    message: "Hello from Hono!",
  });
});

// Slack Events API endpoint
app.post("/v1/slack/events", async (c) => {
  try {
    // Check if services are properly initialized
    if (!services.geminiService || !services.slackEventHandler) {
      const { response } = createErrorResponse(
        new ConfigurationError('Services not properly initialized. Check environment variables.')
      );
      return c.json(response, 500);
    }

    // Extract headers
    const { timestamp, signature } = extractSlackHeaders(c.req.header());
    
    if (!timestamp || !signature) {
      const { response } = createErrorResponse(
        'Missing required Slack headers (x-slack-request-timestamp or x-slack-signature)', 
        400
      );
      return c.json(response, 400);
    }

    // Get raw body for verification
    const body = await c.req.text();
    
    // Verify Slack request
    const signingSecret = process.env.SLACK_SIGNING_SECRET!;
    const verification = await verifySlackRequest(body, timestamp, signature, signingSecret);
    
    if (!verification.isValid) {
      logError('Slack verification', verification.error || 'Unknown verification error', {
        timestamp,
        bodyLength: body.length
      });
      
      const { response } = createErrorResponse(
        new SlackVerificationError('Request verification failed', verification.error)
      );
      return c.json(response, 401);
    }

    // Parse the event using functional approach
    const parseEvent = (body: string) => {
      try {
        return { event: JSON.parse(body), error: null };
      } catch (parseError) {
        logError('Event parsing', parseError instanceof Error ? parseError : String(parseError), { bodyPreview: body.substring(0, 200) });
        return { event: null, error: parseError };
      }
    };

    const { event, error: parseError } = parseEvent(body);
    
    if (parseError || !event) {
      const { response } = createErrorResponse('Invalid JSON in request body', 400);
      return c.json(response, 400);
    }

    // Handle the event
    const result = await services.slackEventHandler.handleEvent(event);
    
    // For URL verification, return the challenge
    if (result.challenge) {
      return c.text(result.challenge);
    }

    // Log successful processing (but not for every message to avoid spam)
    if (result.status === 'success') {
      console.log('Successfully processed Slack event:', result.message);
    }

    // Return success response
    return c.json({ status: "ok" });
    
  } catch (error) {
    logError('Slack events endpoint', error instanceof Error ? error : String(error), { 
      url: c.req.url,
      method: c.req.method 
    });
    
    const { response } = createErrorResponse(error instanceof Error ? error : String(error));
    return c.json(response, 500);
  }
});

export const GET = handle(app);
export const POST = handle(app);
