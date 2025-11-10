
// Fix: Implement Gemini API service functions.
import { GoogleGenAI, Type, Content } from "@google/genai";
import type { AnalysisResult, ChatMessage, FilterLevel, Niche, ContentPlanResult, VideoIdea } from '../types';

/**
 * Creates a GoogleGenAI instance with a specific API key.
 * This overrides the guideline to use process.env.API_KEY exclusively,
 * as per the user's request for multi-key management UI.
 */
const getGenAI = (apiKey: string) => new GoogleGenAI({ apiKey });

interface AnalysisFilters {
    interest?: FilterLevel;
    monetization?: FilterLevel;
    competition?: FilterLevel;
    sustainability?: FilterLevel;
}

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        niches: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    niche_name: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            translated: { type: Type.STRING }
                        },
                        required: ["original", "translated"]
                    },
                    description: { type: Type.STRING },
                    audience_demographics: { type: Type.STRING },
                    analysis: {
                        type: Type.OBJECT,
                        properties: {
                             interest_level: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER, description: "Score from 1-100 for interest level." },
                                    explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
                                },
                                required: ["score", "explanation"]
                            },
                            monetization_potential: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER, description: "Score from 1-100 for monetization potential." },
                                    rpm_estimate: { type: Type.STRING, description: "Estimated RPM range, e.g., '$1 - $5'." },
                                    explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
                                },
                                required: ["score", "rpm_estimate", "explanation"]
                            },
                            competition_level: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER, description: "Score from 1-100 for competition level. Lower is better." },
                                    explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
                                },
                                required: ["score", "explanation"]
                            },
                            sustainability: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER, description: "Score from 1-100 for sustainability." },
                                    explanation: { type: Type.STRING, description: "Explanation in Vietnamese." }
                                },
                                required: ["score", "explanation"]
                            }
                        },
                        required: ["interest_level", "monetization_potential", "competition_level", "sustainability"]
                    },
                    content_strategy: { type: Type.STRING },
                },
                required: ["niche_name", "description", "audience_demographics", "analysis", "content_strategy"]
            }
        }
    },
    required: ["niches"]
};

const analysisSystemInstruction = (countToGenerate: number, existingNichesToAvoid: string[], filters: AnalysisFilters) => {
    let instruction = `You are a YouTube Niche Analysis AI. Your goal is to provide a detailed, data-driven analysis of a user-provided niche idea.
IMPORTANT: All explanatory and descriptive text (description, demographics, explanations, strategy, etc.) MUST be in VIETNAMESE.

Analyze the user's idea and generate exactly ${countToGenerate} distinct sub-niches or angles related to it.
For each niche, provide all the fields in the specified JSON structure. DO NOT generate 'video_ideas'.

- niche_name: An object with two fields: "original" (a catchy name in the target market's native language) and "translated" (the Vietnamese translation).
- description: A short paragraph in VIETNAMESE explaining what the niche is about.
- audience_demographics: Describe the target audience in VIETNAMESE (age, gender, interests, etc.).
- analysis: A detailed breakdown with scores from 1-100.
    - interest_level: Score how high the search volume/interest is. Higher is better. Provide a brief VIETNAMESE explanation.
    - monetization_potential: Score the potential for making money. Higher is better. Provide an estimated RPM range (e.g., "$1 - $5") and a VIETNAMESE explanation of monetization methods (AdSense, affiliates, etc.).
    - competition_level: Score the level of competition. A LOWER score is better (less competition is good). Provide a VIETNAMESE explanation.
    - sustainability: Score the long-term potential and evergreen nature of the niche. Higher is better. Provide a VIETNAMESE explanation.
- content_strategy: Suggest a content strategy in VIETNAMESE (e.g., tutorials, reviews, vlogs) and posting frequency.`;

    const filterInstructions: string[] = [];
    const scoreMap = {
        low: "1-33",
        medium: "34-66",
        high: "67-100"
    };

    if (filters.interest && filters.interest !== 'all') {
        filterInstructions.push(`- **Interest Level**: The 'interest_level.score' must be in the range ${scoreMap[filters.interest]}.`);
    }
    if (filters.monetization && filters.monetization !== 'all') {
        filterInstructions.push(`- **Monetization Potential**: The 'monetization_potential.score' must be in the range ${scoreMap[filters.monetization]}.`);
    }
    if (filters.sustainability && filters.sustainability !== 'all') {
        filterInstructions.push(`- **Sustainability**: The 'sustainability.score' must be in the range ${scoreMap[filters.sustainability]}.`);
    }
    if (filters.competition && filters.competition !== 'all') {
        filterInstructions.push(`- **Competition Level**: The 'competition_level.score' must be in the range ${scoreMap[filters.competition]}. Remember for competition, a lower score is better.`);
    }

    if (filterInstructions.length > 0) {
        instruction += `\n\nCRITICAL FILTERING REQUIREMENTS: You MUST adhere to the following constraints for every niche you generate:\n${filterInstructions.join('\n')}`;
    }
    
    if (existingNichesToAvoid.length > 0) {
        instruction += `\n\nIMPORTANT: You have already suggested the following niches. DO NOT suggest them again or anything too similar. Be creative and find new angles. Niches to avoid: ${existingNichesToAvoid.join(', ')}.`;
    }
    
    return instruction;
};

interface AnalysisOptions {
  existingNichesToAvoid?: string[];
  countToGenerate?: number;
  filters?: AnalysisFilters;
}

const executeWithRetry = async <T>(
    apiKeys: string[], 
    action: (ai: GoogleGenAI) => Promise<T>,
    onKeyFailure: (index: number) => void
): Promise<{ result: T; successfulKeyIndex: number }> => {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error("Vui lòng cung cấp ít nhất một API Key.");
    }
    
    let lastError: Error | null = null;

    for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        if (!key.trim()) continue; // Skip empty keys
        try {
            const ai = getGenAI(key);
            const result = await action(ai);
            return { result, successfulKeyIndex: i };
        } catch (err) {
            console.error(`API Key bắt đầu bằng "${key.substring(0, 4)}..." đã thất bại. Đang thử key tiếp theo.`, err);
            onKeyFailure(i);
            lastError = err as Error;
        }
    }

    throw new Error(`Tất cả API key đều thất bại. Lỗi cuối cùng: ${lastError?.message || 'Không có key hợp lệ.'}`);
}


export const analyzeNicheIdea = async (
  idea: string,
  market: string,
  apiKeys: string[],
  trainingHistory: ChatMessage[],
  options: AnalysisOptions = {},
  onKeyFailure: (index: number) => void
): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => {
    const { existingNichesToAvoid = [], countToGenerate = 10, filters = {} } = options;
    const modelName = 'gemini-2.5-pro';

    const userPrompt = `Analyze the YouTube niche idea: "${idea}". Target market: ${market}.`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data }};
                }
                return { text: p.text || '' };
            })
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: analysisSystemInstruction(countToGenerate, existingNichesToAvoid, filters),
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        const text = response.text;
        try {
            const parsedResult = JSON.parse(text);
            if (!parsedResult.niches) {
                return { niches: [] };
            }
            return parsedResult as AnalysisResult;
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
            throw new Error("The response from the AI was not valid JSON.");
        }
    };
    
    const { result, successfulKeyIndex } = await executeWithRetry(apiKeys, action, onKeyFailure);
    return { result, successfulKeyIndex };
};

export const getTrainingResponse = async (
    history: ChatMessage[],
    apiKeys: string[],
    onKeyFailure: (index: number) => void
): Promise<{ result: string, successfulKeyIndex: number }> => {
    const modelName = 'gemini-2.5-flash';

    const contents: Content[] = history.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => {
            if (p.inlineData) {
                return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data }};
            }
            return { text: p.text || '' };
        })
    }));

    const systemInstruction = `You are a helpful AI assistant for a YouTube Niche Finder tool. The user is providing you with training data or asking questions about your capabilities. Respond conversationally and helpfully. Acknowledge that you have learned the information provided.`;

    const action = async (ai: GoogleGenAI) => {
         const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction
            }
        });
        return response.text;
    };

    const { result, successfulKeyIndex } = await executeWithRetry(apiKeys, action, onKeyFailure);
    return { result, successfulKeyIndex };
};

const contentPlanResponseSchema = {
    type: Type.OBJECT,
    properties: {
        content_ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            translated: { type: Type.STRING }
                        },
                        required: ["original", "translated"]
                    },
                    hook: { type: Type.STRING, description: "An engaging opening hook (1-2 sentences) for the video. In VIETNAMESE." },
                    main_points: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "A list of 3-5 key talking points or scenes for the video. In VIETNAMESE."
                    },
                    call_to_action: { type: Type.STRING, description: "A suggested call to action for the end of the video. In VIETNAMESE." },
                    visual_suggestions: { type: Type.STRING, description: "Suggestions for b-roll, graphics, or on-screen text. In VIETNAMESE." }
                },
                required: ["title", "hook", "main_points", "call_to_action", "visual_suggestions"]
            }
        }
    },
    required: ["content_ideas"]
};

const contentPlanSystemInstruction = (nicheName: string, nicheDescription: string, countToGenerate: number, existingIdeasToAvoid: string[]) => {
    let instruction = `You are an expert YouTube Content Strategist and Scriptwriter. Your task is to generate ${countToGenerate} highly detailed and engaging video content plans for the given niche.
The user will provide you with a niche name and description.
IMPORTANT: All explanatory text (hook, main_points, call_to_action, visual_suggestions) MUST be in VIETNAMESE.

For each of the ${countToGenerate} content plans, you MUST provide all the fields in the specified JSON structure.

- Niche context:
  - Name: ${nicheName}
  - Description: ${nicheDescription}

- Your output must follow this structure for each idea:
  - title: An object with "original" (a viral, catchy title in the target market's native language) and "translated" (the Vietnamese translation).
  - hook: A powerful, attention-grabbing opening for the video (1-2 sentences) in VIETNAMESE.
  - main_points: An array of 3-5 bullet points outlining the core content, scenes, or talking points of the video. In VIETNAMESE.
  - call_to_action: A clear and effective call to action for the end of the video (e.g., subscribe, comment, check out a link). In VIETNAMESE.
  - visual_suggestions: Creative ideas for B-roll footage, on-screen graphics, animations, or filming styles to make the video more engaging. In VIETNAMESE.
  
Generate exactly ${countToGenerate} distinct and creative video plans.`;
    
    if (existingIdeasToAvoid.length > 0) {
        instruction += `\n\nIMPORTANT: You have already suggested the following video ideas. DO NOT suggest them again or anything too similar. Be creative and find new angles. Ideas to avoid: ${existingIdeasToAvoid.join(', ')}.`;
    }

    return instruction;
};

interface ContentPlanOptions {
  existingIdeasToAvoid?: string[];
  countToGenerate?: number;
}

export const generateContentPlan = async (
  niche: Niche,
  apiKeys: string[],
  trainingHistory: ChatMessage[],
  options: ContentPlanOptions = {},
  onKeyFailure: (index: number) => void
): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => {
    const { existingIdeasToAvoid = [], countToGenerate = 5 } = options;
    const modelName = 'gemini-2.5-pro'; 
    const userPrompt = `Dựa trên ngách sau đây, hãy tạo một kế hoạch nội dung chi tiết.\n\nTên ngách: ${niche.niche_name.original} (${niche.niche_name.translated})\nMô tả: ${niche.description}\nĐối tượng: ${niche.audience_demographics}`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data }};
                }
                return { text: p.text || '' };
            })
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: contentPlanSystemInstruction(niche.niche_name.original, niche.description, countToGenerate, existingIdeasToAvoid),
                responseMimeType: "application/json",
                responseSchema: contentPlanResponseSchema
            }
        });

        const text = response.text;
        try {
            const parsedResult = JSON.parse(text);
            return parsedResult as ContentPlanResult;
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
            throw new Error("The response from the AI was not valid JSON.");
        }
    };
    
    const { result, successfulKeyIndex } = await executeWithRetry(apiKeys, action, onKeyFailure);
    return { result, successfulKeyIndex };
};

const developIdeasSystemInstruction = (nicheName: string, nicheDescription: string) => {
    return `You are an expert YouTube Content Strategist and Scriptwriter. Your task is to take a provided list of video ideas (each with a title and draft content) and develop them into detailed content plans.
IMPORTANT: All explanatory text (hook, main_points, call_to_action, visual_suggestions) MUST be in VIETNAMESE. DO NOT generate new ideas, only expand the ones provided by the user.

- Niche context:
  - Name: ${nicheName}
  - Description: ${nicheDescription}

For EACH idea provided by the user, you MUST develop it into the specified JSON structure:
- title: Use the EXACT "original" and "translated" titles provided by the user for the idea.
- hook: Create a powerful, attention-grabbing opening for the video (1-2 sentences) in VIETNAMESE.
- main_points: Use the user-provided "draft_content" as the primary source and expand it into an array of 3-5 bullet points outlining the core content. In VIETNAMESE.
- call_to_action: A clear and effective call to action for the end of the video. In VIETNAMESE.
- visual_suggestions: Creative ideas for B-roll footage, on-screen graphics, or filming styles. In VIETNAMESE.

Your output must be an array of these developed ideas, matching the order of the input.
`;
};

export const developVideoIdeas = async (
  niche: Niche,
  apiKeys: string[],
  trainingHistory: ChatMessage[],
  onKeyFailure: (index: number) => void
): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => {
    const modelName = 'gemini-2.5-pro';
    
    const ideasToDevelop = (niche.video_ideas || []).map(idea => 
        `- Title (Original): ${idea.title.original}\n  Title (Translated): ${idea.title.translated}\n  Draft Content: ${idea.draft_content}`
    ).join('\n\n');

    const userPrompt = `Dựa trên ngách sau đây và danh sách ý tưởng phác thảo này, hãy phát triển chúng thành kế hoạch nội dung chi tiết. Chỉ phát triển các ý tưởng được cung cấp, không tạo ý tưởng mới.\n\n**Ngách:** ${niche.niche_name.original}\n\n**Các ý tưởng cần phát triển:**\n${ideasToDevelop}`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data }};
                }
                return { text: p.text || '' };
            })
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: developIdeasSystemInstruction(niche.niche_name.original, niche.description),
                responseMimeType: "application/json",
                responseSchema: contentPlanResponseSchema
            }
        });

        const text = response.text;
        try {
            const parsedResult = JSON.parse(text);
            return parsedResult as ContentPlanResult;
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
            throw new Error("The response from the AI was not valid JSON.");
        }
    };
    
    const { result, successfulKeyIndex } = await executeWithRetry(apiKeys, action, onKeyFailure);
    return { result, successfulKeyIndex };
};

const videoIdeasResponseSchema = {
    type: Type.OBJECT,
    properties: {
        video_ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.OBJECT,
                        properties: {
                            original: { type: Type.STRING },
                            translated: { type: Type.STRING }
                        },
                        required: ["original", "translated"]
                    },
                    draft_content: { type: Type.STRING, description: "A short (1-2 sentences) draft/outline of the video content, in VIETNAMESE." }
                },
                required: ["title", "draft_content"]
            }
        }
    },
    required: ["video_ideas"]
};

const videoIdeasSystemInstruction = (nicheName: string, existingIdeasToAvoid: string[]) => {
    let instruction = `You are an expert YouTube Content Strategist. Your task is to generate 5 creative and engaging video ideas for the provided niche.
The niche is defined by its name, which is in the target market's language (likely English).
Base your video ideas solely on this original niche name.

IMPORTANT: For your output, follow these rules:
1.  The "draft_content" for each idea MUST be in VIETNAMESE.
2.  The "title.original" MUST be a viral, catchy title in the same language as the provided niche name.
3.  The "title.translated" MUST be the Vietnamese translation of the original title.

- Niche context to focus on:
  - Name: ${nicheName}
  
Generate exactly 5 distinct and creative video ideas.`;

    if (existingIdeasToAvoid.length > 0) {
        instruction += `\n\nIMPORTANT: You have already suggested the following video ideas. DO NOT suggest them again or anything too similar. Be creative and find new angles. Ideas to avoid: ${existingIdeasToAvoid.join(', ')}.`;
    }

    return instruction;
};

export const generateVideoIdeasForNiche = async (
    niche: Niche,
    apiKeys: string[],
    trainingHistory: ChatMessage[],
    options: { existingIdeasToAvoid?: string[] } = {},
    onKeyFailure: (index: number) => void
): Promise<{ result: { video_ideas: VideoIdea[] }, successfulKeyIndex: number }> => {
    const { existingIdeasToAvoid = [] } = options;
    const modelName = 'gemini-2.5-flash';
    const userPrompt = `Please generate 5 video ideas for the YouTube niche: "${niche.niche_name.original}".`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => {
                if (p.inlineData) {
                    return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data }};
                }
                return { text: p.text || '' };
            })
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: videoIdeasSystemInstruction(niche.niche_name.original, existingIdeasToAvoid),
                responseMimeType: "application/json",
                responseSchema: videoIdeasResponseSchema
            }
        });

        const text = response.text;
        try {
            return JSON.parse(text) as { video_ideas: VideoIdea[] };
        } catch (e) {
            console.error("Failed to parse JSON for video ideas:", text);
            throw new Error("The response from the AI for video ideas was not valid JSON.");
        }
    };

    const { result, successfulKeyIndex } = await executeWithRetry(apiKeys, action, onKeyFailure);
    return { result, successfulKeyIndex };
};


export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        const ai = getGenAI(apiKey);
        // Use a simple, non-costly call to check validity.
        // This confirms the key is authenticated and has the correct permissions.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello'
        });
        // Ensure we got some kind of response text
        return !!response.text;
    } catch (error) {
        console.error(`API Key validation failed for key ending in ...${apiKey.slice(-4)}`, error);
        return false;
    }
};


// --- OpenAI Service ---

const callOpenAI = async (apiKey: string, model: string, messages: {role: string, content: string}[], jsonSchema: object, onKeyFailure: () => void) => {
    if (!apiKey || !apiKey.trim()) {
        throw new Error("Vui lòng cung cấp OpenAI API Key.");
    }

    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
        systemMessage.content += `\n\nALWAYS respond with a JSON object that strictly adheres to the following schema. Do not include any text, markdown, or explanation outside of the single JSON object. JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
    }
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            onKeyFailure();
            throw new Error(`Lỗi OpenAI API: ${errorData.error.message} (Status: ${response.status})`);
        }

        const data = await response.json();
        const text = data.choices[0].message.content;
        return JSON.parse(text);
    } catch (e: any) {
        if (e.name !== 'AbortError') { // Don't trigger failure on deliberate cancellation
            onKeyFailure();
        }
        console.error("Lỗi khi gọi OpenAI hoặc phân tích JSON:", e);
        // Re-throw a more user-friendly error
        if (e instanceof SyntaxError) {
             throw new Error("Phản hồi từ OpenAI không phải là JSON hợp lệ.");
        }
        throw e;
    }
};

const convertToOpenAIMessages = (history: ChatMessage[], systemInstruction: string, userPrompt: string): {role: string, content: string}[] => {
    const messages = history.map(msg => {
        // OpenAI doesn't support multi-part messages with text and images in the same way for standard chat models.
        // We will only take the text parts for OpenAI.
        const content = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
        return {
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: content
        };
    });

    return [
        { role: 'system', content: systemInstruction },
        ...messages.filter(m => m.content.trim()), // filter out empty messages
        { role: 'user', content: userPrompt }
    ];
};

export const analyzeNicheIdeaWithOpenAI = async (
  idea: string,
  market: string,
  apiKey: string,
  model: string,
  trainingHistory: ChatMessage[],
  options: AnalysisOptions = {},
  onKeyFailure: () => void
): Promise<AnalysisResult> => {
    const { existingNichesToAvoid = [], countToGenerate = 10, filters = {} } = options;
    const systemInstruction = analysisSystemInstruction(countToGenerate, existingNichesToAvoid, filters);
    const userPrompt = `Analyze the YouTube niche idea: "${idea}". Target market: ${market}.`;
    
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);
    
    const parsedResult = await callOpenAI(apiKey, model, messages, responseSchema.properties, onKeyFailure);

    if (!parsedResult.niches) {
        return { niches: [] };
    }
    return parsedResult as AnalysisResult;
};

export const generateVideoIdeasForNicheWithOpenAI = async (
    niche: Niche,
    apiKey: string,
    model: string,
    trainingHistory: ChatMessage[],
    options: { existingIdeasToAvoid?: string[] } = {},
    onKeyFailure: () => void
): Promise<{ video_ideas: VideoIdea[] }> => {
    const { existingIdeasToAvoid = [] } = options;
    const userPrompt = `Please generate 5 video ideas for the YouTube niche: "${niche.niche_name.original}".`;
    const systemInstruction = videoIdeasSystemInstruction(niche.niche_name.original, existingIdeasToAvoid);
    
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);
    
    const result = await callOpenAI(apiKey, model, messages, videoIdeasResponseSchema.properties, onKeyFailure);
    return result as { video_ideas: VideoIdea[] };
};

export const developVideoIdeasWithOpenAI = async (
  niche: Niche,
  apiKey: string,
  model: string,
  trainingHistory: ChatMessage[],
  onKeyFailure: () => void
): Promise<ContentPlanResult> => {
    const ideasToDevelop = (niche.video_ideas || []).map(idea => 
        `- Title (Original): ${idea.title.original}\n  Title (Translated): ${idea.title.translated}\n  Draft Content: ${idea.draft_content}`
    ).join('\n\n');
    const userPrompt = `Dựa trên ngách sau đây và danh sách ý tưởng phác thảo này, hãy phát triển chúng thành kế hoạch nội dung chi tiết. Chỉ phát triển các ý tưởng được cung cấp, không tạo ý tưởng mới.\n\n**Ngách:** ${niche.niche_name.original}\n\n**Các ý tưởng cần phát triển:**\n${ideasToDevelop}`;
    const systemInstruction = developIdeasSystemInstruction(niche.niche_name.original, niche.description);

    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);

    const result = await callOpenAI(apiKey, model, messages, contentPlanResponseSchema.properties, onKeyFailure);
    return result as ContentPlanResult;
};


export const generateContentPlanWithOpenAI = async (
  niche: Niche,
  apiKey: string,
  model: string,
  trainingHistory: ChatMessage[],
  options: ContentPlanOptions = {},
  onKeyFailure: () => void
): Promise<ContentPlanResult> => {
    const { existingIdeasToAvoid = [], countToGenerate = 5 } = options;
    const userPrompt = `Dựa trên ngách sau đây, hãy tạo một kế hoạch nội dung chi tiết.\n\nTên ngách: ${niche.niche_name.original} (${niche.niche_name.translated})\nMô tả: ${niche.description}\nĐối tượng: ${niche.audience_demographics}`;
    const systemInstruction = contentPlanSystemInstruction(niche.niche_name.original, niche.description, countToGenerate, existingIdeasToAvoid);
    
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);

    const result = await callOpenAI(apiKey, model, messages, contentPlanResponseSchema.properties, onKeyFailure);
    return result as ContentPlanResult;
};


export const getTrainingResponseWithOpenAI = async (
    history: ChatMessage[],
    apiKey: string,
    model: string,
    onKeyFailure: () => void
): Promise<string> => {
    const systemInstruction = `You are a helpful AI assistant for a YouTube Niche Finder tool. The user is providing you with training data or asking questions about your capabilities. Respond conversationally and helpfully. Acknowledge that you have learned the information provided.`;
    
    // Convert all but the last message for history, then add the last message as the new user prompt
    const historyWithoutLast = history.slice(0, -1);
    const lastMessage = history[history.length - 1];
    const userPrompt = lastMessage.parts.filter(p => p.text).map(p => p.text).join('\n\n');
    
    const messages = convertToOpenAIMessages(historyWithoutLast, systemInstruction, userPrompt);

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            onKeyFailure();
            throw new Error(`Lỗi OpenAI API: ${errorData.error.message} (Status: ${response.status})`);
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (e: any) {
        onKeyFailure();
        console.error("Lỗi khi gọi OpenAI:", e);
        throw e;
    }
};


export const validateOpenAiApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey.trim()) return false;
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error(`OpenAI API Key validation failed for key ending in ...${apiKey.slice(-4)}`, error);
        return false;
    }
};
