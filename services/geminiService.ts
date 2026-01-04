
// Fix: Implement Gemini API service functions following the latest guidelines with manual key management.
import { GoogleGenAI, Type, Content, GenerateContentResponse } from "@google/genai";
import type { AnalysisResult, ChatMessage, FilterLevel, Niche, ContentPlanResult, VideoIdea, ProductionType } from '../types';

/**
 * Gets a random API key from the provided list.
 */
const getRandomKey = (keys: string[]) => keys[Math.floor(Math.random() * keys.length)];

/**
 * Retries a Gemini API call with exponential backoff and key rotation.
 */
async function callGeminiWithRetry(
    apiKeys: string[],
    action: (ai: GoogleGenAI) => Promise<GenerateContentResponse>,
    retries = 3,
    delay = 1000
): Promise<GenerateContentResponse> {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error("Vui lòng nhập API Key trong phần Cấu hình để sử dụng tính năng này.");
    }
    
    // Pick a key. If retrying, we might pick a different one next time or filter out bad ones in a more complex implementation.
    // For now, random selection offers basic load balancing.
    const apiKey = getRandomKey(apiKeys);
    
    // Clean the key string to remove potential whitespace or newlines from copy-paste
    const cleanKey = apiKey.trim();
    const ai = new GoogleGenAI({ apiKey: cleanKey });

    try {
        return await action(ai);
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        if (retries > 0 && (error.status === 429 || error.status >= 500)) {
            await new Promise(resolve => setTimeout(resolve, delay));
            // Try with a different key if available by filtering out the one that just failed?
            // Simple approach: just pass the whole list again, probability suggests we might pick a different one.
            // Better approach:
            const remainingKeys = apiKeys.length > 1 ? apiKeys.filter(k => k !== apiKey) : apiKeys;
            return callGeminiWithRetry(remainingKeys, action, retries - 1, delay * 2);
        }
        throw error;
    }
}

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey || !apiKey.trim()) return false;
    try {
        const cleanKey = apiKey.trim();
        const ai = new GoogleGenAI({ apiKey: cleanKey });
        // Upgrade: Use gemini-3-flash-preview for fast and cost-effective validation
        await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: { parts: [{ text: 'test' }] },
        });
        return true;
    } catch (error) {
        console.warn("API Key validation failed for key ending in ...", apiKey.slice(-4), error);
        return false;
    }
};

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
                                    score: { type: Type.INTEGER },
                                    explanation: { type: Type.STRING }
                                },
                                required: ["score", "explanation"]
                            },
                            monetization_potential: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER },
                                    rpm_estimate: { type: Type.STRING },
                                    explanation: { type: Type.STRING }
                                },
                                required: ["score", "rpm_estimate", "explanation"]
                            },
                            competition_level: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER },
                                    explanation: { type: Type.STRING }
                                },
                                required: ["score", "explanation"]
                            },
                            sustainability: {
                                type: Type.OBJECT,
                                properties: {
                                    score: { type: Type.INTEGER },
                                    explanation: { type: Type.STRING }
                                },
                                required: ["score", "explanation"]
                            }
                        },
                        required: ["interest_level", "monetization_potential", "competition_level", "sustainability"]
                    },
                    production_analysis: {
                        type: Type.OBJECT,
                        properties: {
                            suitability_score: { type: Type.INTEGER, description: "Độ phù hợp cho mô hình sản xuất đã chọn (1-100)." },
                            reasoning: { type: Type.STRING, description: "Lập luận chi tiết vì sao mô hình này phù hợp hoặc không phù hợp với ngách." },
                            scalability: { type: Type.STRING, description: "Phân tích khả năng nhân rộng, đóng gói quy trình và phát triển hệ thống." }
                        },
                        required: ["suitability_score", "reasoning", "scalability"]
                    },
                    content_strategy: { type: Type.STRING },
                    target_keywords: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Tối thiểu 5 từ khóa mà khán giả thường tìm kiếm trong ngách này."
                    },
                    content_sources: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Danh sách các nguồn tư liệu (báo, blog, website) có thể lấy nội dung."
                    }
                },
                required: ["niche_name", "description", "audience_demographics", "analysis", "production_analysis", "content_strategy", "target_keywords", "content_sources"]
            }
        }
    },
    required: ["niches"]
};

const getProductionTypeDefinition = (type: ProductionType) => {
    switch (type) {
        case 'faceless':
            return `MÔ HÌNH: Faceless Channel (Kênh ẩn mặt).
            - Đặc điểm: Voice-over + stock footage, Screen recording (hướng dẫn phần mềm/AI), Animation đơn giản, hoặc Text-on-screen.
            - Workflow chuẩn: Chọn ngách hẹp (narrow), Script giá trị 60-80% (Hook 5-10s, 3-5 ý chính), Thu âm + B-roll/caption.
            - Tần suất gợi ý: 1-2 video dài/tuần + 3-7 shorts/tuần.
            - Lưu ý: Cần nội dung gốc để tránh "Reused Content".`;
        case 'personal':
            return `MÔ HÌNH: Personal Brand (Thương hiệu cá nhân/Lộ mặt).
            - Đặc điểm: Content Creator truyền thống. Xây dựng niềm tin cao, phù hợp bán dịch vụ/khóa học/affiliate.
            - Điểm mạnh: Nội dung dựa trên "Opinion + Trải nghiệm cá nhân" - thứ AI khó copy.
            - Tần suất gợi ý: 1 video dài/tuần + 5-10 shorts cắt từ video dài. Series theo chủ đề (30 ngày học X...).`;
        case 'factory':
            return `MÔ HÌNH: Content Factory (Xưởng nội dung).
            - Đặc điểm: Xây dựng quy trình hệ thống để ra video số lượng lớn.
            - Cấu trúc team: Researcher/Writer, Editor, Voice talent, Publisher (SEO/Thumbnail).
            - Ưu điểm: Scale (nhân rộng) cực nhanh. Cần quản trị chất lượng để giữ chất riêng.`;
        default:
            return '';
    }
};

const analysisSystemInstruction = (countToGenerate: number, existingNichesToAvoid: string[], filters: AnalysisFilters, productionType: ProductionType) => {
    const productionDef = getProductionTypeDefinition(productionType);
    
    return `You are a world-class YouTube Niche Analysis AI (Gemini 3). Your goal is to analyze a niche idea specifically optimized for the user's chosen production style.

--- CHOSEN PRODUCTION STYLE ---
${productionDef}

--- MANDATORY TASKS ---
1. Analyze the user's idea and generate exactly ${countToGenerate} distinct sub-niches/angles.
2. For each niche, provide a 'production_analysis' in VIETNAMESE evaluated against the chosen style ("${productionType}").
3. IMPORTANT: Provide a list of at least 5 HIGH-VOLUME SEARCH KEYWORDS (target_keywords) relevant to this niche in the target market's language.
4. IMPORTANT: List specific types of content sources (content_sources) like blogs, specific media sites, or government portals where data can be retrieved.
5. Evaluating suitability (1-100), reasoning (why it fits this model), and scalability (how to systemize/replicate).
6. All descriptive text MUST be in VIETNAMESE.
7. Return 'video_ideas' as an empty array [].`;
};

interface AnalysisOptions {
  existingNichesToAvoid?: string[];
  countToGenerate?: number;
  filters?: AnalysisFilters;
  productionType?: ProductionType;
}

export const analyzeNicheIdea = async (
  idea: string,
  market: string,
  apiKeys: string[],
  modelName: string, // Updated to accept model name dynamically
  trainingHistory: ChatMessage[],
  options: AnalysisOptions = {}
): Promise<AnalysisResult> => {
    const { existingNichesToAvoid = [], countToGenerate = 10, filters = {}, productionType = 'faceless' } = options;
    const userPrompt = `Analyze the YouTube niche idea: "${idea}". Market: ${market}. Model: ${productionType}.`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => (p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' }))
        })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName, // Uses the model selected in App.tsx (gemini-3-pro-preview or gemini-3-flash-preview)
            contents: contents,
            config: {
                systemInstruction: analysisSystemInstruction(countToGenerate, existingNichesToAvoid, filters, productionType),
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
    });
    return JSON.parse(response.text) as AnalysisResult;
};

export const getTrainingResponse = async (history: ChatMessage[], apiKeys: string[]): Promise<string> => {
    // Upgraded to Gemini 3 Flash for quick, conversational responses
    const modelName = 'gemini-3-flash-preview';
    const contents: Content[] = history.map(msg => ({ role: msg.role, parts: msg.parts.map(p => (p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' })) }));
    const systemInstruction = `You are a helpful AI assistant. Respond conversationally.`;
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
         return await ai.models.generateContent({ model: modelName, contents: contents, config: { systemInstruction } });
    });
    return response.text || '';
};

export const generateContentPlan = async (niche: Niche, apiKeys: string[], trainingHistory: ChatMessage[], options: { existingIdeasToAvoid?: string[], countToGenerate?: number } = {}): Promise<ContentPlanResult> => {
    const { countToGenerate = 5 } = options;
    // Keep high-value tasks on Gemini 3 Pro for best reasoning
    const modelName = 'gemini-3-pro-preview'; 
    const contents: Content[] = [ ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts.map(p => (p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' })) })), { role: 'user', parts: [{ text: `Tạo kế hoạch nội dung cho: ${niche.niche_name.original}.` }] } ];
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: `Generate ${countToGenerate} viral video plans in VIETNAMESE. Include hook, points, CTA, visuals. JSON format.`,
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { content_ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, translated: { type: Type.STRING } }, required: ["original", "translated"] }, hook: { type: Type.STRING }, main_points: { type: Type.ARRAY, items: { type: Type.STRING } }, call_to_action: { type: Type.STRING }, visual_suggestions: { type: Type.STRING } }, required: ["title", "hook", "main_points", "call_to_action", "visual_suggestions"] } } }, required: ["content_ideas"] }
            }
        });
    });
    return JSON.parse(response.text) as ContentPlanResult;
};

export const developVideoIdeas = async (niche: Niche, apiKeys: string[], trainingHistory: ChatMessage[]): Promise<ContentPlanResult> => {
    // Keep high-value tasks on Gemini 3 Pro for best reasoning
    const modelName = 'gemini-3-pro-preview';
    const ideas = (niche.video_ideas || []).map(i => `- ${i.title.original}: ${i.draft_content}`).join('\n');
    const contents: Content[] = [ ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts.map(p => (p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' })) })), { role: 'user', parts: [{ text: `Expand these ideas:\n${ideas}` }] } ];
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: `Expand ideas into detailed VIETNAMESE scripts. JSON format.`,
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { content_ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, translated: { type: Type.STRING } }, required: ["original", "translated"] }, hook: { type: Type.STRING }, main_points: { type: Type.ARRAY, items: { type: Type.STRING } }, call_to_action: { type: Type.STRING }, visual_suggestions: { type: Type.STRING } }, required: ["title", "hook", "main_points", "call_to_action", "visual_suggestions"] } } }, required: ["content_ideas"] }
            }
        });
    });
    return JSON.parse(response.text) as ContentPlanResult;
};

export const generateVideoIdeasForNiche = async (niche: Niche, apiKeys: string[], trainingHistory: ChatMessage[], options: { existingIdeasToAvoid?: string[] } = {}): Promise<{ video_ideas: VideoIdea[] }> => {
    // Use Gemini 3 Flash for speed on idea generation
    const modelName = 'gemini-3-flash-preview';
    const contents: Content[] = [ ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts.map(p => (p.inlineData ? { inlineData: p.inlineData } : { text: p.text || '' })) })), { role: 'user', parts: [{ text: `Generate 5 viral ideas for "${niche.niche_name.original}".` }] } ];
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: `Generate 5 viral ideas in VIETNAMESE. Format as JSON.`,
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { video_ideas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.OBJECT, properties: { original: { type: Type.STRING }, translated: { type: Type.STRING } }, required: ["original", "translated"] }, draft_content: { type: Type.STRING } }, required: ["title", "draft_content"] } } }, required: ["video_ideas"] }
            }
        });
    });
    return JSON.parse(response.text);
};

export const analyzeKeywordDirectly = async (
    idea: string, 
    market: string, 
    apiKeys: string[], 
    modelName: string, // Updated to accept model name dynamically
    trainingHistory: ChatMessage[], 
    productionType: ProductionType = 'faceless'
): Promise<AnalysisResult> => {
    const contents: Content[] = [ ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts })), { role: 'user', parts: [{ text: `Analyze: "${idea}". Model: ${productionType}.` }] } ];
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName, // Uses the model selected in App.tsx
            contents: contents,
            config: {
                systemInstruction: analysisSystemInstruction(1, [], {}, productionType) + "\nDO NOT generate sub-niches. Only analyze the user input.",
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
    });
    return JSON.parse(response.text) as AnalysisResult;
};

export const generateChannelPlan = async (niche: Niche, apiKeys: string[], trainingHistory: ChatMessage[], options: { isMoreDetailed?: boolean } = {}): Promise<string> => {
    // Keep high-value tasks on Gemini 3 Pro
    const modelName = 'gemini-3-pro-preview';
    const contents: Content[] = [ ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts })), { role: 'user', parts: [{ text: `Tạo kế hoạch kênh YouTube chi tiết trong VIETNAMESE. Data: ${JSON.stringify(niche)}` }] } ];
    
    const response = await callGeminiWithRetry(apiKeys, async (ai) => {
        return await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: { systemInstruction: `You are a YouTube growth expert. Plan must be in VIETNAMESE with markdown headers.` }
        });
    });
    return response.text || '';
};

// Placeholder for OpenAI functions
export const validateOpenAiApiKey = async (apiKey: string): Promise<boolean> => { if (!apiKey.trim()) return false; try { const response = await fetch("https://api.openai.com/v1/models", { method: "GET", headers: { "Authorization": `Bearer ${apiKey}` } }); return response.ok; } catch (error) { return false; } };
export const analyzeNicheIdeaWithOpenAI = async (idea: string, market: string, apiKeys: string[], model: string, trainingHistory: ChatMessage[], options: AnalysisOptions = {}): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => { throw new Error("OpenAI Update Required"); };
export const analyzeKeywordDirectlyWithOpenAI = async (idea: string, market: string, apiKeys: string[], model: string, trainingHistory: ChatMessage[], productionType: ProductionType = 'faceless'): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => { throw new Error("OpenAI Update Required"); };
export const getTrainingResponseWithOpenAI = async (history: ChatMessage[], apiKeys: string[], model: string): Promise<{ result: string, successfulKeyIndex: number }> => { throw new Error("Not implemented"); };
export const generateVideoIdeasForNicheWithOpenAI = async (niche: Niche, apiKeys: string[], model: string, trainingHistory: ChatMessage[], options: { existingIdeasToAvoid?: string[] } = {}): Promise<{ result: { video_ideas: VideoIdea[] }, successfulKeyIndex: number }> => { throw new Error("Not implemented"); };
export const developVideoIdeasWithOpenAI = async (niche: Niche, apiKeys: string[], model: string, trainingHistory: ChatMessage[]): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => { throw new Error("Not implemented"); };
export const generateContentPlanWithOpenAI = async (niche: Niche, apiKeys: string[], model: string, trainingHistory: ChatMessage[], options: { existingIdeasToAvoid?: string[], countToGenerate?: number } = {}): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => { throw new Error("Not implemented"); };
export const generateChannelPlanWithOpenAI = async (niche: Niche, apiKeys: string[], model: string, trainingHistory: ChatMessage[], options: { isMoreDetailed?: boolean } = {}): Promise<{ result: string, successfulKeyIndex: number }> => { throw new Error("Not implemented"); };
