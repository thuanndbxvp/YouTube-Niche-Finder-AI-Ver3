


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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Hello'
        });
        return !!response.text;
    } catch (error) {
        console.error(`API Key validation failed for key ending in ...${apiKey.slice(-4)}`, error);
        return false;
    }
};

const directAnalysisSystemInstruction = () => {
    let instruction = `You are a YouTube Niche Analysis AI. Your goal is to provide a detailed, data-driven analysis of the single user-provided niche idea.
IMPORTANT: All explanatory and descriptive text (description, demographics, explanations, strategy, etc.) MUST be in VIETNAMESE.

Analyze the user's idea as a single niche. DO NOT generate sub-niches.
Provide all the fields in the specified JSON structure. The final output must be a JSON object with a "niches" key containing an array with EXACTLY ONE element representing your analysis.

- niche_name: For "original", use the user's input. For "translated", provide the Vietnamese translation.
- description: A detailed paragraph in VIETNAMESE explaining what this specific niche is about.
- audience_demographics: Describe the target audience for this niche in VIETNAMESE.
- analysis: A detailed breakdown with scores from 1-100.
    - interest_level: Score how high the search volume/interest is. Higher is better. Provide a brief VIETNAMESE explanation.
    - monetization_potential: Score the potential for making money. Higher is better. Provide an estimated RPM range (e.g., "$1 - $5") and a VIETNAMESE explanation of monetization methods.
    - competition_level: Score the level of competition. A LOWER score is better. Provide a VIETNAMESE explanation.
    - sustainability: Score the long-term potential and evergreen nature of the niche. Higher is better. Provide a VIETNAMESE explanation.
- content_strategy: Suggest a content strategy in VIETNAMESE for this specific niche.`;
    return instruction;
};

export const analyzeKeywordDirectly = async (
  idea: string,
  market: string,
  apiKeys: string[],
  trainingHistory: ChatMessage[],
  onKeyFailure: (index: number) => void
): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => {
    const modelName = 'gemini-2.5-pro';
    const userPrompt = `Analyze this specific YouTube niche idea in detail: "${idea}". Target market: ${market}.`;
    
    const contents: Content[] = [
        ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: directAnalysisSystemInstruction(),
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        const text = response.text;
        try {
            return JSON.parse(text) as AnalysisResult;
        } catch (e) {
            console.error("Failed to parse JSON response for direct analysis:", text);
            throw new Error("The response from the AI was not valid JSON.");
        }
    };
    
    return await executeWithRetry(apiKeys, action, onKeyFailure);
};

// --- Channel Plan Generation ---

const userChannelPlanInstruction = `Hãy đọc kỹ nội dung trong thẻ kết quả này (this niche card), bao gồm cả các ý tưởng video (nếu có), và tạo **kế hoạch phát triển kênh YouTube chi tiết**, bao gồm các phần sau:\n\n1. **Tóm tắt kênh** – Mô tả ngắn gọn chủ đề, mục tiêu, giá trị nổi bật của kênh.\n2. **Đối tượng mục tiêu** – Phân tích độ tuổi, giới tính, khu vực, sở thích và hành vi xem của khán giả lý tưởng.\n3. **Cấu trúc nội dung / series** – Gợi ý các nhóm chủ đề hoặc chuỗi nội dung chính (series), nêu ví dụ tiêu biểu.\n4. **Lịch đăng video** – Đề xuất kế hoạch đăng bài cho tuần đầu, 1 tháng, 3 tháng, 6 tháng, và ưu tiên thứ tự 5 video nên làm đầu tiên (top 5 video).\n5. **Chiến lược SEO và tăng trưởng** – Đề xuất bộ từ khóa, tiêu đề, cách tối ưu thumbnail, mô tả và tương tác để phát triển kênh.\n6. **Thương hiệu, giọng điệu, phong cách hình ảnh** – Mô tả phong cách kể chuyện, màu sắc thương hiệu, font chữ, không khí hình ảnh và phong cách dựng.\n7. **Kế hoạch kiếm tiền** – Đưa ra các hướng kiếm tiền khả thi (AdSense, tài trợ, affiliate, Patreon, sản phẩm số, v.v.).\n8. **Định hướng phát triển dài hạn** – Gợi ý hướng mở rộng thương hiệu kênh sau 1 năm (ví dụ: podcast, hợp tác, spin-off, nội dung chuyên sâu).\n9. **Gợi ý 5 bộ tên kênh** – Mỗi bộ gồm:\n   - Tên kênh\n   - Mô tả kênh\n   - Hashtag chủ đạo\n   - Prompt gợi ý tạo thumbnail\n   - Prompt gợi ý tạo logo\n   → Các phần này nên được viết bằng **ngôn ngữ mà tôi đã sử dụng khi tìm kiếm niche**, đồng thời có phần chú thích tiếng Việt bên dưới để tôi dễ hiểu.\n\nHãy trình bày kết quả bằng **tiếng Việt**, chia thành từng mục rõ ràng (## tiêu đề), trình bày dễ đọc, có thể hành động được.`;

const channelPlanSystemInstruction = `You are a world-class YouTube channel development strategist. Your task is to generate a comprehensive, actionable channel growth plan based on the user's instructions and the provided niche data. The final output must be in VIETNAMESE and formatted clearly with markdown headers (## Title). You must follow all user instructions precisely.`;

const moreDetailedChannelPlanSystemInstruction = `You are a world-class YouTube channel development strategist. A user has requested a more detailed version of a channel plan. Your task is to regenerate the plan to be **more detailed, in-depth, and provide even more actionable steps** than a standard plan. Expand on each section, especially SEO, content strategy, and long-term development. The final output must be in VIETNAMESE and formatted clearly with markdown headers (## Title). You must follow all user instructions precisely.`;


const formatNicheDataForPrompt = (niche: Niche): string => {
    let nicheInfo = `
--- DỮ LIỆU THẺ KẾT QUẢ NICHE (NICHE CARD DATA) ---

**Tên ngách (Original):** ${niche.niche_name.original}
**Tên ngách (Tiếng Việt):** ${niche.niche_name.translated}
**Mô tả:** ${niche.description}
**Đối tượng mục tiêu:** ${niche.audience_demographics}
**Chiến lược nội dung đề xuất:** ${niche.content_strategy}

**Phân tích chi tiết:**
- Mức độ quan tâm: ${niche.analysis.interest_level.score}/100 (${niche.analysis.interest_level.explanation})
- Tiềm năng kiếm tiền: ${niche.analysis.monetization_potential.score}/100 (RPM: ${niche.analysis.monetization_potential.rpm_estimate}) (${niche.analysis.monetization_potential.explanation})
- Mức độ cạnh tranh: ${niche.analysis.competition_level.score}/100 (${niche.analysis.competition_level.explanation})
- Tính bền vững: ${niche.analysis.sustainability.score}/100 (${niche.analysis.sustainability.explanation})
`;
    if (niche.video_ideas && niche.video_ideas.length > 0) {
        nicheInfo += "\n**Các ý tưởng video ban đầu:**\n";
        niche.video_ideas.forEach(idea => {
            nicheInfo += `- ${idea.title.original} (${idea.title.translated}): ${idea.draft_content}\n`;
        });
    }

    nicheInfo += `\n--- KẾT THÚC DỮ LIỆU THẺ ---`;
    return nicheInfo;
};

interface ChannelPlanOptions {
  isMoreDetailed?: boolean;
}

export const generateChannelPlan = async (
    niche: Niche,
    apiKeys: string[],
    trainingHistory: ChatMessage[],
    onKeyFailure: (index: number) => void,
    options: ChannelPlanOptions = {}
): Promise<{ result: string, successfulKeyIndex: number }> => {
    const { isMoreDetailed = false } = options;
    const modelName = 'gemini-2.5-pro';
    
    const formattedNicheData = formatNicheDataForPrompt(niche);
    const userPrompt = `${userChannelPlanInstruction}\n\n${formattedNicheData}`;

    const contents: Content[] = [
        ...trainingHistory.map(msg => ({ role: msg.role, parts: msg.parts })),
        { role: 'user', parts: [{ text: userPrompt }] }
    ];

    const action = async (ai: GoogleGenAI) => {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: isMoreDetailed ? moreDetailedChannelPlanSystemInstruction : channelPlanSystemInstruction
            }
        });
        return response.text;
    };
    
    return await executeWithRetry(apiKeys, action, onKeyFailure);
};


// --- OpenAI Service ---
const executeOpenAIWithRetry = async <T>(
    apiKeys: string[],
    action: (apiKey: string) => Promise<T>,
    onKeyFailure: (index: number) => void
): Promise<{ result: T; successfulKeyIndex: number }> => {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error("Vui lòng cung cấp ít nhất một OpenAI API Key.");
    }
    let lastError: Error | null = null;
    for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        if (!key.trim()) continue;
        try {
            const result = await action(key);
            return { result, successfulKeyIndex: i };
        } catch (err) {
            console.error(`OpenAI API Key bắt đầu bằng "${key.substring(0, 4)}..." đã thất bại. Đang thử key tiếp theo.`, err);
            onKeyFailure(i);
            lastError = err as Error;
        }
    }
    throw new Error(`Tất cả OpenAI API key đều thất bại. Lỗi cuối cùng: ${lastError?.message || 'Không có key hợp lệ.'}`);
}

const callOpenAI = async (apiKey: string, model: string, messages: {role: string, content: string}[], jsonSchema?: object) => {
    if (!apiKey || !apiKey.trim()) {
        throw new Error("Vui lòng cung cấp OpenAI API Key.");
    }
    
    const body: any = { model, messages };
    if (jsonSchema) {
        const systemMessage = messages.find(m => m.role === 'system');
        if (systemMessage) {
            systemMessage.content += `\n\nALWAYS respond with a JSON object that strictly adheres to the following schema. Do not include any text, markdown, or explanation outside of the single JSON object. JSON Schema:\n${JSON.stringify(jsonSchema, null, 2)}`;
        }
        body.response_format = { type: "json_object" };
    }
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Lỗi OpenAI API: ${errorData.error.message} (Status: ${response.status})`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
};


const convertToOpenAIMessages = (history: ChatMessage[], systemInstruction: string, userPrompt: string): {role: string, content: string}[] => {
    const messages = history.map(msg => {
        const content = msg.parts.filter(p => p.text).map(p => p.text).join('\n');
        return {
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: content
        };
    });

    return [
        { role: 'system', content: systemInstruction },
        ...messages.filter(m => m.content.trim()), 
        { role: 'user', content: userPrompt }
    ];
};

export const analyzeNicheIdeaWithOpenAI = async (
  idea: string,
  market: string,
  apiKeys: string[],
  model: string,
  trainingHistory: ChatMessage[],
  options: AnalysisOptions = {},
  onKeyFailure: (index: number) => void
): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => {
    const { existingNichesToAvoid = [], countToGenerate = 10, filters = {} } = options;
    const systemInstruction = analysisSystemInstruction(countToGenerate, existingNichesToAvoid, filters);
    const userPrompt = `Analyze the YouTube niche idea: "${idea}". Target market: ${market}.`;
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);
    
    const action = async (key: string) => JSON.parse(await callOpenAI(key, model, messages, responseSchema.properties));
    const { result, successfulKeyIndex } = await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);

    if (!result.niches) {
        return { result: { niches: [] }, successfulKeyIndex };
    }
    return { result: result as AnalysisResult, successfulKeyIndex };
};

export const generateVideoIdeasForNicheWithOpenAI = async (
    niche: Niche,
    apiKeys: string[],
    model: string,
    trainingHistory: ChatMessage[],
    options: { existingIdeasToAvoid?: string[] } = {},
    onKeyFailure: (index: number) => void
): Promise<{ result: { video_ideas: VideoIdea[] }, successfulKeyIndex: number }> => {
    const { existingIdeasToAvoid = [] } = options;
    const userPrompt = `Please generate 5 video ideas for the YouTube niche: "${niche.niche_name.original}".`;
    const systemInstruction = videoIdeasSystemInstruction(niche.niche_name.original, existingIdeasToAvoid);
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);
    
    const action = async (key: string) => JSON.parse(await callOpenAI(key, model, messages, videoIdeasResponseSchema.properties));
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
};

export const developVideoIdeasWithOpenAI = async (
  niche: Niche,
  apiKeys: string[],
  model: string,
  trainingHistory: ChatMessage[],
  onKeyFailure: (index: number) => void
): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => {
    const ideasToDevelop = (niche.video_ideas || []).map(idea => 
        `- Title (Original): ${idea.title.original}\n  Title (Translated): ${idea.title.translated}\n  Draft Content: ${idea.draft_content}`
    ).join('\n\n');
    const userPrompt = `Dựa trên ngách sau đây và danh sách ý tưởng phác thảo này, hãy phát triển chúng thành kế hoạch nội dung chi tiết. Chỉ phát triển các ý tưởng được cung cấp, không tạo ý tưởng mới.\n\n**Ngách:** ${niche.niche_name.original}\n\n**Các ý tưởng cần phát triển:**\n${ideasToDevelop}`;
    const systemInstruction = developIdeasSystemInstruction(niche.niche_name.original, niche.description);
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);

    const action = async (key: string) => JSON.parse(await callOpenAI(key, model, messages, contentPlanResponseSchema.properties));
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
};

export const generateContentPlanWithOpenAI = async (
  niche: Niche,
  apiKeys: string[],
  model: string,
  trainingHistory: ChatMessage[],
  options: ContentPlanOptions = {},
  onKeyFailure: (index: number) => void
): Promise<{ result: ContentPlanResult, successfulKeyIndex: number }> => {
    const { existingIdeasToAvoid = [], countToGenerate = 5 } = options;
    const userPrompt = `Dựa trên ngách sau đây, hãy tạo một kế hoạch nội dung chi tiết.\n\nTên ngách: ${niche.niche_name.original} (${niche.niche_name.translated})\nMô tả: ${niche.description}\nĐối tượng: ${niche.audience_demographics}`;
    const systemInstruction = contentPlanSystemInstruction(niche.niche_name.original, niche.description, countToGenerate, existingIdeasToAvoid);
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);

    const action = async (key: string) => JSON.parse(await callOpenAI(key, model, messages, contentPlanResponseSchema.properties));
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
};


export const getTrainingResponseWithOpenAI = async (
    history: ChatMessage[],
    apiKeys: string[],
    model: string,
    onKeyFailure: (index: number) => void
): Promise<{ result: string, successfulKeyIndex: number }> => {
    const systemInstruction = `You are a helpful AI assistant for a YouTube Niche Finder tool. The user is providing you with training data or asking questions about your capabilities. Respond conversationally and helpfully. Acknowledge that you have learned the information provided.`;
    
    const historyWithoutLast = history.slice(0, -1);
    const lastMessage = history[history.length - 1];
    const userPrompt = lastMessage.parts.filter(p => p.text).map(p => p.text).join('\n\n');
    const messages = convertToOpenAIMessages(historyWithoutLast, systemInstruction, userPrompt);

    const action = (key: string) => callOpenAI(key, model, messages);
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
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

export const analyzeKeywordDirectlyWithOpenAI = async (
  idea: string,
  market: string,
  apiKeys: string[],
  model: string,
  trainingHistory: ChatMessage[],
  onKeyFailure: (index: number) => void
): Promise<{ result: AnalysisResult, successfulKeyIndex: number }> => {
    const systemInstruction = directAnalysisSystemInstruction();
    const userPrompt = `Analyze this specific YouTube niche idea in detail: "${idea}". Target market: ${market}.`;
    const messages = convertToOpenAIMessages(trainingHistory, systemInstruction, userPrompt);

    const action = async (key: string) => JSON.parse(await callOpenAI(key, model, messages, responseSchema.properties));
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
};

export const generateChannelPlanWithOpenAI = async (
    niche: Niche,
    apiKeys: string[],
    model: string,
    trainingHistory: ChatMessage[],
    onKeyFailure: (index: number) => void,
    options: ChannelPlanOptions = {}
): Promise<{ result: string, successfulKeyIndex: number }> => {
    const { isMoreDetailed = false } = options;
    const formattedNicheData = formatNicheDataForPrompt(niche);
    const userPrompt = `${userChannelPlanInstruction}\n\n${formattedNicheData}`;
    
    const messages = convertToOpenAIMessages(trainingHistory, isMoreDetailed ? moreDetailedChannelPlanSystemInstruction : channelPlanSystemInstruction, userPrompt);
    
    const action = async (key: string) => await callOpenAI(key, model, messages);
    return await executeOpenAIWithRetry(apiKeys, action, onKeyFailure);
};