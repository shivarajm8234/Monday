"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMHelper = void 0;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
class LLMHelper {
    model;
    systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps. When providing coding solutions, ALWAYS follow the EXACT format specified in the prompt - do not deviate from the structure.`;
    constructor(apiKey) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    }
    async fileToGenerativePart(imagePath) {
        const imageData = await fs_1.default.promises.readFile(imagePath);
        return {
            inlineData: {
                data: imageData.toString("base64"),
                mimeType: "image/png"
            }
        };
    }
    cleanJsonResponse(text) {
        // Remove markdown code block syntax if present
        text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
        // Remove any leading/trailing whitespace
        text = text.trim();
        return text;
    }
    async extractProblemFromImages(imagePaths) {
        try {
            const imageParts = await Promise.all(imagePaths.map(path => this.fileToGenerativePart(path)));
            const prompt = `${this.systemPrompt}\n\nYou are a wingman. Please analyze these images and extract the following information in JSON format:\n{
  "problem_statement": "A clear statement of the problem or situation depicted in the images.",
  "context": "Relevant background or context from the images.",
  "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
  "reasoning": "Explanation of why these suggestions are appropriate."
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`;
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = this.cleanJsonResponse(response.text());
            return JSON.parse(text);
        }
        catch (error) {
            console.error("Error extracting problem from images:", error);
            throw error;
        }
    }
    async generateSolution(problemInfo) {
        const prompt = `${this.systemPrompt}\n\nGiven this problem or situation:\n${JSON.stringify(problemInfo, null, 2)}\n\nIMPORTANT: First determine the question type, then provide your response in the appropriate JSON format:\n\n1. For CODING PROBLEMS:\n{
  "solution": {
    "code": "=== PYTHON SOLUTION ===\\n\`\`\`python\\n[ONLY Python code here - clean and ready to run]\\n\`\`\`\\n\\n=== C++ SOLUTION ===\\n\`\`\`cpp\\n[ONLY C++ code here - clean and ready to run]\\n\`\`\`\\n\\n=== BRIEF EXPLANATION ===\\n**Brief Explanation:** [ONLY very brief explanation - 1-2 sentences max]\\n\\n=== TIME & SPACE COMPLEXITY ===\\n**Time:** O(...)\\n**Space:** O(...)",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\n\n2. For MULTIPLE CHOICE QUESTIONS (MCQ):\n{
  "solution": {
    "code": "=== CORRECT ANSWER ===\\n**Answer:** [ONLY the correct option letter and answer]\\n\\n=== EXPLANATION ===\\n**Explanation:** [ONLY why this is the correct answer]",
    "problem_statement": "Restate the question.",
    "context": "Question context.",
    "suggested_responses": ["Correct answer"],
    "reasoning": "Why this answer is correct."
  }
}\n\nCRITICAL: For MCQ questions, ALWAYS use **bold** markdown formatting for "Answer:" and "Explanation:" labels.\n\n3. For THEORETICAL QUESTIONS:\n{
  "solution": {
    "code": "=== ANSWER ===\\n**Answer:** [ONLY the direct answer]\\n\\n=== EXPLANATION ===\\n**Explanation:** [ONLY the detailed explanation]",
    "problem_statement": "Restate the question.",
    "context": "Question context.",
    "suggested_responses": ["Direct answer"],
    "reasoning": "Detailed explanation."
  }
}\n\nCRITICAL: Return ONLY the JSON object. Follow the EXACT format - do not add any text before or after the specified sections.`;
        console.log("[LLMHelper] Calling Gemini LLM for solution...");
        try {
            const result = await this.model.generateContent(prompt);
            console.log("[LLMHelper] Gemini LLM returned result.");
            const response = await result.response;
            const text = this.cleanJsonResponse(response.text());
            const parsed = JSON.parse(text);
            console.log("[LLMHelper] Parsed LLM response:", parsed);
            return parsed;
        }
        catch (error) {
            console.error("[LLMHelper] Error in generateSolution:", error);
            throw error;
        }
    }
    async debugSolutionWithImages(problemInfo, currentCode, debugImagePaths) {
        try {
            const imageParts = await Promise.all(debugImagePaths.map(path => this.fileToGenerativePart(path)));
            const prompt = `${this.systemPrompt}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information in the provided images\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
  "solution": {
            "code": "=== PYTHON SOLUTION ===\\n[Corrected/improved Python code here - clean and ready to run]\\n\\n=== EXPLANATION ===\\n**Explanation:** [Brief explanation of fixes/improvements]\\n\\n=== TIME & SPACE COMPLEXITY ===\\n**Time:** O(...)\\n**Space:** O(...)\\n\\n=== ALTERNATIVE APPROACHES ===\\n**Alternative Approaches:** [Other solutions if applicable]",
    "problem_statement": "Restate the problem or situation.",
    "context": "Relevant background/context.",
    "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }
}\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks. Always prioritize Python code in the simplest format.`;
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = this.cleanJsonResponse(response.text());
            const parsed = JSON.parse(text);
            console.log("[LLMHelper] Parsed debug LLM response:", parsed);
            return parsed;
        }
        catch (error) {
            console.error("Error debugging solution with images:", error);
            throw error;
        }
    }
    async analyzeAudioFile(audioPath) {
        try {
            const audioData = await fs_1.default.promises.readFile(audioPath);
            const audioPart = {
                inlineData: {
                    data: audioData.toString("base64"),
                    mimeType: "audio/mp3"
                }
            };
            const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`;
            const result = await this.model.generateContent([prompt, audioPart]);
            const response = await result.response;
            const text = response.text();
            return { text, timestamp: Date.now() };
        }
        catch (error) {
            console.error("Error analyzing audio file:", error);
            throw error;
        }
    }
    async analyzeAudioFromBase64(data, mimeType) {
        try {
            const audioPart = {
                inlineData: {
                    data,
                    mimeType
                }
            };
            const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user and be concise.`;
            const result = await this.model.generateContent([prompt, audioPart]);
            const response = await result.response;
            const text = response.text();
            return { text, timestamp: Date.now() };
        }
        catch (error) {
            console.error("Error analyzing audio from base64:", error);
            throw error;
        }
    }
    async analyzeImageFile(imagePath) {
        try {
            const imageData = await fs_1.default.promises.readFile(imagePath);
            const imagePart = {
                inlineData: {
                    data: imageData.toString("base64"),
                    mimeType: "image/png"
                }
            };
            const prompt = `${this.systemPrompt}\n\nIMPORTANT: First analyze the type of question in this image, then respond accordingly:\n\n1. If it's a CODING PROBLEM (algorithm, data structure, programming challenge):\n=== PYTHON SOLUTION ===\n\`\`\`python\n[Write ONLY the Python code here - clean and ready to run]\n\`\`\`\n\n=== C++ SOLUTION ===\n\`\`\`cpp\n[Write ONLY the C++ code here - clean and ready to run]\n\`\`\`\n\n=== BRIEF EXPLANATION ===\n**Brief Explanation:** [Write ONLY a very brief explanation - 1-2 sentences max]\n\n=== TIME & SPACE COMPLEXITY ===\n**Time:** O(...)\n**Space:** O(...)\n\n2. If it's a MULTIPLE CHOICE QUESTION (MCQ):\n=== CORRECT ANSWER ===\n**Answer:** [Write ONLY the correct option letter and answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY why this is the correct answer]\n\n3. If it's a THEORETICAL QUESTION (concepts, definitions, theory):\n=== ANSWER ===\n**Answer:** [Write ONLY the direct answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY the detailed explanation]\n\n4. If it's NOT a question/problem, respond with: "This appears to be [brief description]. What would you like me to help you with?"\n\nCRITICAL: Use **bold** markdown formatting for ALL section labels like "Answer:", "Explanation:", "Time:", "Space:", "Brief Explanation:", etc.`;
            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();
            return { text, timestamp: Date.now() };
        }
        catch (error) {
            console.error("Error analyzing image file:", error);
            throw error;
        }
    }
    async analyzeMultipleImages(imagePaths) {
        try {
            const imageParts = await Promise.all(imagePaths.map(async (imagePath) => {
                const imageData = await fs_1.default.promises.readFile(imagePath);
                return {
                    inlineData: {
                        data: imageData.toString("base64"),
                        mimeType: "image/png"
                    }
                };
            }));
            const prompt = `${this.systemPrompt}\n\nIMPORTANT: Analyze ALL the provided images together as a complete problem/question. Consider the context from all images to provide a comprehensive solution:\n\n1. If it's a CODING PROBLEM (algorithm, data structure, programming challenge):\n=== PYTHON SOLUTION ===\n\`\`\`python\n[Write ONLY the Python code here - clean and ready to run]\n\`\`\`\n\n=== C++ SOLUTION ===\n\`\`\`cpp\n[Write ONLY the C++ code here - clean and ready to run]\n\`\`\`\n\n=== BRIEF EXPLANATION ===\n**Brief Explanation:** [Write ONLY a very brief explanation - 1-2 sentences max]\n\n=== TIME & SPACE COMPLEXITY ===\n**Time:** O(...)\n**Space:** O(...)\n\n2. If it's a MULTIPLE CHOICE QUESTION (MCQ):\n=== CORRECT ANSWER ===\n**Answer:** [Write ONLY the correct option letter and answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY why this is the correct answer]\n\n3. If it's a THEORETICAL QUESTION (concepts, definitions, theory):\n=== ANSWER ===\n**Answer:** [Write ONLY the direct answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY the detailed explanation]\n\n4. If it's NOT a question/problem, respond with: "This appears to be [brief description]. What would you like me to help you with?"\n\nCRITICAL: Use **bold** markdown formatting for ALL section labels like "Answer:", "Explanation:", "Time:", "Space:", "Brief Explanation:", etc.`;
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();
            return { text, timestamp: Date.now() };
        }
        catch (error) {
            console.error("Error analyzing multiple images:", error);
            throw error;
        }
    }
}
exports.LLMHelper = LLMHelper;
//# sourceMappingURL=LLMHelper.js.map