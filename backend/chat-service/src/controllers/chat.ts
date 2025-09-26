import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import axios from 'axios';
import { logger } from '@smart-home/shared';
import { ProviderFactory } from '../providers/ProviderFactory';
import { ChatMessage } from '../providers/types';
import { getDefaultProviderConfig } from '../config/providers';

// Configuration
const TELEMETRY_SERVICE_URL = process.env.NODE_ENV === 'production'
  ? process.env.PROD_TELEMETRY_SERVICE_URL
  : process.env.TELEMETRY_SERVICE_URL || `http://telemetry-service:${process.env.TELEMETRY_SERVICE_PORT || 3002}`;

// Types
type MessageRole = 'user' | 'assistant' | 'system';

interface Message {
  role: MessageRole;
  content: string;
  created_at?: Date;
}

interface ChatRequest extends Request {
  user: {
    id: string;
    email: string;
  };
  body: {
    message: string;
    sessionId?: string;
    model?: string;
    provider?: string;
  };
  headers: {
    authorization?: string;
  };
}

// Initialize Provider Factory with validated configuration
const providerConfig = getDefaultProviderConfig();
const providerFactory = new ProviderFactory(providerConfig);

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are an AI assistant for a smart home energy monitoring system. 
You help users understand their energy consumption patterns and provide insights.
When users ask about energy usage, you should request specific details like device type and time period.
Be concise, helpful, and focus on energy-related queries.

Available metrics: power_consumption, voltage, current
Available device types: AC, refrigerator, lights, etc.
For time ranges, use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)`;

// Metric mapping from LLM intent to database columns
const METRIC_MAPPING: Record<string, string> = {
  'energyConsumption': 'power_consumption',
  'powerConsumption': 'power_consumption',
  'energy': 'power_consumption',
  'power': 'power_consumption',
  'voltage': 'voltage',
  'current': 'current'
};

// Function to determine aggregation based on time range
function determineAggregation(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 2) return 'hourly';
  if (diffInDays <= 14) return 'daily';
  if (diffInDays <= 90) return 'weekly';
  return 'monthly';
}

// Function to convert LLM intent to telemetry query parameters
function convertIntentToQueryParams(intent: any): Record<string, any> {
  const params: Record<string, any> = {};

  // Map device info - skip if device is 'all'
  if (intent.device && intent.device.toLowerCase() !== 'all') {
    const deviceLower = intent.device.toLowerCase();
    const deviceMappings: Record<string, string> = {
      'ac': 'air_conditioner',
      'aircon': 'air_conditioner',
      'air con': 'air_conditioner',
      'fridge': 'refrigerator',
      'light': 'lights',
      'fan': 'ceiling_fan',
      'heater': 'space_heater',
      'washing machine': 'washing_machine',
      'washer': 'washing_machine',
      'dryer': 'clothes_dryer'
    };

    // Check if the device is a full name that matches our device types
    const fullDeviceTypes = ['air_conditioner', 'refrigerator', 'lights', 'ceiling_fan', 'space_heater', 'washing_machine', 'clothes_dryer'];
    
    // Check if it's a known abbreviation
    if (deviceMappings[deviceLower]) {
      params.deviceType = deviceMappings[deviceLower];
    } 
    // Check if it's already a full device type
    else if (fullDeviceTypes.includes(deviceLower)) {
      params.deviceType = deviceLower;
    } 
    // If it contains a space (like "living room ac"), keep as is
    else if (intent.device.includes(' ')) {
      params.deviceName = intent.device;
    } 
    // Default to treating as a device name
    else {
      params.deviceName = intent.device;
    }
  }

  // Map time range
  if (intent.timeRange) {
    params.startDate = intent.timeRange.start;
    params.endDate = intent.timeRange.end;
    
    // Only auto-determine aggregation if not specified in the intent
    if (intent.aggregation) {
      params.aggregation = intent.aggregation;
    } else {
      params.aggregation = determineAggregation(intent.timeRange.start, intent.timeRange.end);
    }
  }

  // Map metrics
  if (intent.metrics && Array.isArray(intent.metrics)) {
    params.metrics = (intent.metrics as string[])
      .map((metric: string) => METRIC_MAPPING[metric] || metric)
      .filter((metric: string) => ['power_consumption', 'voltage', 'current'].includes(metric));
  }

  // Default functions
  params.functions = ['avg', 'sum', 'min', 'max'];

  return params;
}

/**
 * Process a chat message, get LLM intent, fetch telemetry if needed, and respond
 */
export const processMessage = async (req: ChatRequest, res: Response, next: NextFunction) => {
  const { message, sessionId, model, provider } = req.body;
  const userId = req.user.id;
  const session = sessionId || uuidv4();

  try {
    // Save user message to database
    await saveMessage(session, 'user', message, userId);

    // Get conversation history
    const history = await getConversationHistory(session);

    // Get AI response using provider pattern
    const aiResponse = await generateAIResponseWithProvider(message, history, userId, req, model, provider);

    // Save AI response to database
    await saveMessage(session, 'assistant', aiResponse, userId);

    // Return response with session ID for new sessions
    if (!sessionId) {
      return res.status(200).json({
        response: aiResponse,
        sessionId: session
      });
    }

    res.status(200).json({ response: aiResponse });
  } catch (error) {
    logger.error('Error processing chat message:', error instanceof Error ? error.message : 'Unknown error');
    next(error);
  }
};

/**
 * Get chat history for the authenticated user
 */
export const getChatHistory = async (req: ChatRequest, res: Response, next: NextFunction) => {
  const { limit = 20, before } = req.query;
  const userId = req.user.id;

  try {
    const query = db('chat_messages')
      .select('id', 'role', 'content', 'created_at')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(Number(limit));

    if (before) {
      query.andWhere('created_at', '<', before);
    }

    const messages = await query;
    
    res.status(200).json({
      messages,
      hasMore: messages.length === Number(limit)
    });
  } catch (error) {
    logger.error('Error fetching chat history:', error instanceof Error ? error.message : 'Unknown error');
    next(error);
  }
};

// Helper Functions

async function saveMessage(sessionId: string, role: MessageRole, content: string, userId: string) {
  await db('chat_messages').insert({
    user_id: userId,
    session_id: sessionId,
    role,
    content
  });
}

async function getConversationHistory(sessionId: string): Promise<Message[]> {
  return db('chat_messages')
    .select('role', 'content', 'created_at')
    .where('session_id', sessionId)
    .orderBy('created_at', 'asc');
}

async function generateAIResponse(message: string, history: Message[], userId: string, req: ChatRequest, requestedModel?: string): Promise<string> {
  // Validate and set the model to use
  const availableModels = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'];
  const modelToUse = requestedModel && availableModels.includes(requestedModel) ? requestedModel : 'gpt-3.5-turbo';
  // Prepare messages for OpenAI including system prompt and history
  const messages: Array<{role: MessageRole; content: string}> = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ];

  try {
    // First, get the intent from the LLM
    const intentPrompt = `Analyze the user's message and determine if it requires telemetry data. 
    
    Available metrics: power_consumption, voltage, current
    Available device types: AC, refrigerator, lights, fan, heater

    Use the following rules for aggregation:
    - If the time range is exactly one day, return daily aggregation by default.
    - If the user explicitly asks for hourly data, use hourly.
    - Weekly or monthly only if user mentions "week" or "month".

    If the query needs telemetry data, respond with a JSON object:
    {
    "needsTelemetry": true,
    "device": "device_name_or_type", 
    "timeRange": {
        "start": "ISO_8601_date",
        "end": "ISO_8601_date"
    },
    "metrics": ["metric1", "metric2"],
    "aggregation": "hourly|daily|weekly|monthly" (optional)
    }

    If not, respond with: {"needsTelemetry": false}

    For relative dates like "last week", calculate the actual dates. Use current date as reference: ${new Date().toISOString()}`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        ...messages,
        { role: 'system', content: intentPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const analysis = JSON.parse(completion.choices[0].message?.content || '{"needsTelemetry": false}');

    if (analysis.needsTelemetry) {
      // Fetch telemetry data using the converted parameters
      const telemetryData = await fetchTelemetryData(userId, analysis, req.headers.authorization);
      
      // Generate response with telemetry data
      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages: [
          ...messages,
          {
            role: 'system',
            content: `Here's the telemetry data for the user's query: ${JSON.stringify(telemetryData)}.

            Provide a concise response with just the key data points from the telemetry data.
            Do not include any recommendations or additional advice.
            Keep the response under 2 sentences if possible.`
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      });

      return response.choices[0].message?.content || 'I found some data for you.';
    }

    // If no telemetry needed, just return a normal chat response
    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0].message?.content || 'I\'m not sure how to respond to that.';
  } catch (error) {
    logger.error('Error generating AI response:', error instanceof Error ? error.message : 'Unknown error');
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

async function fetchTelemetryData(userId: string, intentQuery: any, authHeader?: string) {
  try {
    // Convert LLM intent to query parameters
    const queryParams = convertIntentToQueryParams(intentQuery);
    
    // Call your telemetry query endpoint
    const response = await axios.get(`${TELEMETRY_SERVICE_URL}/api/telemetry/query`, {
      params: queryParams,
      headers: {
        'Authorization': authHeader
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Error fetching telemetry data:', error instanceof Error ? error.message : 'Unknown error');
    
    // If it's an axios error, log more details
    if (axios.isAxiosError(error)) {
      logger.error('Telemetry API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        params: error.config?.params
      });
    }
    
    throw new Error('Failed to fetch telemetry data');
  }
}

async function generateAIResponseWithProvider(
  message: string,
  history: Message[],
  userId: string,
  req: ChatRequest,
  requestedModel?: string,
  requestedProvider?: string
): Promise<string> {
  try {
    // Get the provider (default to openai if not specified)
    const providerName = requestedProvider || 'openai';
    const provider = providerFactory.getProvider(providerName);

    // Check if provider exists and is available
    if (!provider) {
      logger.error(`Provider "${providerName}" not found or disabled`);
      throw new Error('Selected AI provider is not available');
    }

    // Use the requested model or default to first available model for the provider
    const availableModels = await provider.getAvailableModels();
    const modelToUse = requestedModel || availableModels[0]?.id || 'gpt-3.5-turbo';

    // Convert history to the provider's expected format
    const chatHistory: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({
        role: h.role as 'user' | 'assistant' | 'system',
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    // Generate response using the provider
    const response = await provider.chat(chatHistory, {
      model: modelToUse,
      temperature: 0.7,
      maxTokens: 500
    });

    return response.content;
  } catch (error) {
    logger.error('Error generating AI response with provider:', error instanceof Error ? error.message : 'Unknown error');
    return 'Sorry, I encountered an error processing your request. Please try again.';
  }
}

/**
 * Get available models from all providers
 */
export const getAvailableModels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await providerFactory.getAllProviders();

    res.status(200).json({ providers });
  } catch (error) {
    logger.error('Error getting available models:', error instanceof Error ? error.message : 'Unknown error');
    next(error);
  }
};

export const chatController = {
  processMessage,
  getChatHistory,
  getAvailableModels
};