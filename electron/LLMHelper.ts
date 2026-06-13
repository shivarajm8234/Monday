import { GoogleGenerativeAI } from "@google/generative-ai"
import fs from "fs"
import path from "path"
import axios from "axios"
import FormData from "form-data"
import dotenv from "dotenv"

// Load env variables
dotenv.config()

const GROQ_KEY = process.env.GROQ_API_KEY || ""
const GEMINI_KEY = process.env.GEMINI_API_KEY || ""
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || ""

export class LLMHelper {
  private readonly systemPrompt = `You are Wingman AI, a helpful, proactive assistant for any kind of problem or situation (not just coding). For any user input, analyze the situation, provide a clear problem statement, relevant context, and suggest several possible responses or actions the user could take next. Always explain your reasoning. Present your suggestions as a list of options or next steps. When providing coding solutions, ALWAYS follow the EXACT format specified in the prompt - do not deviate from the structure.`
  
  // Gemini Clients
  private geminiProModel: any
  private geminiFlashModel: any

  constructor(apiKey: string) {
    // Initialize Google Generative AI
    const useKey = apiKey || GEMINI_KEY
    const genAI = new GoogleGenerativeAI(useKey)
    this.geminiProModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
    this.geminiFlashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  }

  // --- HELPER WRAPPERS ---

  private cleanJsonResponse(text: string): string {
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '')
    return text.trim()
  }

  // --- GROQ API CALLS ---

  private async callGroqChat(messages: any[], model: string = "llama-3.3-70b-versatile"): Promise<string> {
    const response = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model,
      messages,
      temperature: 0.1
    }, {
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      }
    })
    return response.data.choices[0].message.content
  }

  private async runGroqVision(imagePaths: string[], prompt: string): Promise<string> {
    const imageContents = await Promise.all(imagePaths.map(async (p) => {
      const data = await fs.promises.readFile(p)
      return {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${data.toString("base64")}`
        }
      }
    }))

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageContents
        ]
      }
    ]

    try {
      return await this.callGroqChat(messages, "llama-3.2-90b-vision-preview")
    } catch (err) {
      console.warn("Groq 90B vision failed, trying 11B vision:", err)
      return await this.callGroqChat(messages, "llama-3.2-11b-vision-preview")
    }
  }

  private async runGroqText(prompt: string): Promise<string> {
    return await this.callGroqChat([
      { role: "user", content: prompt }
    ], "llama-3.3-70b-versatile")
  }

  private async transcribeGroq(audioBuffer: Buffer, filename: string): Promise<string> {
    const form = new FormData()
    form.append("file", audioBuffer, { filename })
    form.append("model", "whisper-large-v3")

    const response = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", form, {
      headers: {
        ...form.getHeaders(),
        "Authorization": `Bearer ${GROQ_KEY}`
      }
    })
    return response.data.text
  }

  private async runGroqAudioPipeline(audioBuffer: Buffer, filename: string, prompt: string): Promise<string> {
    const transcript = await this.transcribeGroq(audioBuffer, filename)
    return await this.runGroqText(`${prompt}\n\nAudio Transcript:\n"${transcript}"`)
  }

  // --- NVIDIA API CALLS ---

  private async callNvidiaChat(messages: any[], model: string = "meta/llama-3.3-70b-instruct"): Promise<string> {
    const response = await axios.post("https://integrate.api.nvidia.com/v1/chat/completions", {
      model,
      messages,
      temperature: 0.1
    }, {
      headers: {
        "Authorization": `Bearer ${NVIDIA_KEY}`,
        "Content-Type": "application/json"
      }
    })
    return response.data.choices[0].message.content
  }

  private async runNvidiaVision(imagePaths: string[], prompt: string): Promise<string> {
    const imageContents = await Promise.all(imagePaths.map(async (p) => {
      const data = await fs.promises.readFile(p)
      return {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${data.toString("base64")}`
        }
      }
    }))

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageContents
        ]
      }
    ]

    return await this.callNvidiaChat(messages, "meta/llama-3.2-11b-vision-instruct")
  }

  private async runNvidiaText(prompt: string): Promise<string> {
    return await this.callNvidiaChat([
      { role: "user", content: prompt }
    ], "meta/llama-3.3-70b-instruct")
  }

  // --- GEMINI API CALLS ---

  private async runGeminiVision(imagePaths: string[], prompt: string): Promise<string> {
    const imageParts = await Promise.all(imagePaths.map(async (p) => {
      const data = await fs.promises.readFile(p)
      return {
        inlineData: {
          data: data.toString("base64"),
          mimeType: "image/png"
        }
      }
    }))
    const result = await this.geminiFlashModel.generateContent([prompt, ...imageParts])
    const response = await result.response
    return response.text()
  }

  private async runGeminiText(prompt: string): Promise<string> {
    const result = await this.geminiProModel.generateContent(prompt)
    const response = await result.response
    return response.text()
  }

  private async runGeminiAudio(audioBuffer: Buffer, mimeType: string, prompt: string): Promise<string> {
    const audioPart = {
      inlineData: {
        data: audioBuffer.toString("base64"),
        mimeType
      }
    }
    const result = await this.geminiProModel.generateContent([prompt, audioPart])
    const response = await result.response
    return response.text()
  }

  // --- EXPOSED LLM HELPER INTERFACES ---

  public async extractProblemFromImages(imagePaths: string[]): Promise<any> {
    const ocrPrompt = "Extract all text, questions, code, and details from these images."
    const getFinalPrompt = (extractedText: string) => `${this.systemPrompt}\n\nGiven the extracted text from screen captures:\n${extractedText}\n\nPlease analyze it and extract the following information in JSON format:\n{
      "problem_statement": "A clear statement of the problem or situation depicted.",
      "context": "Relevant background or context.",
      "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
      "reasoning": "Explanation of why these suggestions are appropriate."
    }\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks.`

    // Try Groq
    try {
      console.log("[LLMHelper] extractProblemFromImages: Trying Groq")
      const extractedText = await this.runGroqVision(imagePaths, ocrPrompt)
      const jsonText = await this.runGroqText(getFinalPrompt(extractedText))
      return JSON.parse(this.cleanJsonResponse(jsonText))
    } catch (err) {
      console.error("[LLMHelper] Groq failed in extractProblemFromImages, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] extractProblemFromImages: Trying Gemini")
        const extractedText = await this.runGeminiVision(imagePaths, ocrPrompt)
        const jsonText = await this.runGeminiText(getFinalPrompt(extractedText))
        return JSON.parse(this.cleanJsonResponse(jsonText))
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in extractProblemFromImages, falling back to Nvidia:", errGemini)

        // Try Nvidia
        try {
          console.log("[LLMHelper] extractProblemFromImages: Trying Nvidia")
          const extractedText = await this.runNvidiaVision(imagePaths, ocrPrompt)
          const jsonText = await this.runNvidiaText(getFinalPrompt(extractedText))
          return JSON.parse(this.cleanJsonResponse(jsonText))
        } catch (errNvidia) {
          console.error("[LLMHelper] Nvidia failed in extractProblemFromImages. All providers failed.", errNvidia)
          throw errNvidia
        }
      }
    }
  }

  public async generateSolution(problemInfo: any): Promise<any> {
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
    }\n\n3. For THEORETICAL QUESTIONS:\n{
      "solution": {
        "code": "=== ANSWER ===\\n**Answer:** [ONLY the direct answer]\\n\\n=== EXPLANATION ===\\n**Explanation:** [ONLY the detailed explanation]",
        "problem_statement": "Restate the question.",
        "context": "Question context.",
        "suggested_responses": ["Direct answer"],
        "reasoning": "Detailed explanation."
      }
    }\n\nCRITICAL: Return ONLY the JSON object. Follow the EXACT format - do not add any text before or after the specified sections.`

    // Try Groq
    try {
      console.log("[LLMHelper] generateSolution: Trying Groq")
      const jsonText = await this.runGroqText(prompt)
      return JSON.parse(this.cleanJsonResponse(jsonText))
    } catch (err) {
      console.error("[LLMHelper] Groq failed in generateSolution, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] generateSolution: Trying Gemini")
        const jsonText = await this.runGeminiText(prompt)
        return JSON.parse(this.cleanJsonResponse(jsonText))
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in generateSolution, falling back to Nvidia:", errGemini)

        // Try Nvidia
        try {
          console.log("[LLMHelper] generateSolution: Trying Nvidia")
          const jsonText = await this.runNvidiaText(prompt)
          return JSON.parse(this.cleanJsonResponse(jsonText))
        } catch (errNvidia) {
          console.error("[LLMHelper] Nvidia failed in generateSolution. All providers failed.", errNvidia)
          throw errNvidia
        }
      }
    }
  }

  public async debugSolutionWithImages(problemInfo: any, currentCode: string, debugImagePaths: string[]): Promise<any> {
    const runDebugPipeline = async (ocrFn: (paths: string[], prompt: string) => Promise<string>, textFn: (prompt: string) => Promise<string>) => {
      const extractedText = await ocrFn(debugImagePaths, "Extract all text, compiler error messages, test run failures, or other debug information from these images.")
      const prompt = `${this.systemPrompt}\n\nYou are a wingman. Given:\n1. The original problem or situation: ${JSON.stringify(problemInfo, null, 2)}\n2. The current response or approach: ${currentCode}\n3. The debug information: ${extractedText}\n\nPlease analyze the debug information and provide feedback in this JSON format:\n{
        "solution": {
          "code": "=== PYTHON SOLUTION ===\\n[Corrected/improved Python code here - clean and ready to run]\\n\\n=== EXPLANATION ===\\n**Explanation:** [Brief explanation of fixes/improvements]\\n\\n=== TIME & SPACE COMPLEXITY ===\\n**Time:** O(...)\\n**Space:** O(...)\\n\\n=== ALTERNATIVE APPROACHES ===\\n**Alternative Approaches:** [Other solutions if applicable]",
          "problem_statement": "Restate the problem or situation.",
          "context": "Relevant background/context.",
          "suggested_responses": ["First possible answer or action", "Second possible answer or action", "..."],
          "reasoning": "Explanation of why these suggestions are appropriate."
        }
      }\nImportant: Return ONLY the JSON object, without any markdown formatting or code blocks. Always prioritize Python code in the simplest format.`

      const jsonText = await textFn(prompt)
      return JSON.parse(this.cleanJsonResponse(jsonText))
    }

    // Try Groq
    try {
      console.log("[LLMHelper] debugSolutionWithImages: Trying Groq")
      return await runDebugPipeline(this.runGroqVision.bind(this), this.runGroqText.bind(this))
    } catch (err) {
      console.error("[LLMHelper] Groq failed in debugSolutionWithImages, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] debugSolutionWithImages: Trying Gemini")
        return await runDebugPipeline(this.runGeminiVision.bind(this), this.runGeminiText.bind(this))
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in debugSolutionWithImages, falling back to Nvidia:", errGemini)

        // Try Nvidia
        try {
          console.log("[LLMHelper] debugSolutionWithImages: Trying Nvidia")
          return await runDebugPipeline(this.runNvidiaVision.bind(this), this.runNvidiaText.bind(this))
        } catch (errNvidia) {
          console.error("[LLMHelper] Nvidia failed in debugSolutionWithImages. All providers failed.", errNvidia)
          throw errNvidia
        }
      }
    }
  }

  public async analyzeAudioFile(audioPath: string): Promise<any> {
    const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`

    // Try Groq
    try {
      console.log("[LLMHelper] analyzeAudioFile: Trying Groq")
      const audioBuffer = await fs.promises.readFile(audioPath)
      const text = await this.runGroqAudioPipeline(audioBuffer, path.basename(audioPath), prompt)
      return { text, timestamp: Date.now() }
    } catch (err) {
      console.error("[LLMHelper] Groq failed in analyzeAudioFile, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] analyzeAudioFile: Trying Gemini")
        const audioBuffer = await fs.promises.readFile(audioPath)
        const ext = path.extname(audioPath).replace(".", "")
        const mimeType = ext === "mp3" ? "audio/mp3" : ext === "wav" ? "audio/wav" : "audio/webm"
        const text = await this.runGeminiAudio(audioBuffer, mimeType, prompt)
        return { text, timestamp: Date.now() }
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in analyzeAudioFile. All audio providers failed.", errGemini)
        throw errGemini
      }
    }
  }

  public async analyzeAudioFromBase64(data: string, mimeType: string): Promise<any> {
    const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user and be concise.`

    // Try Groq
    try {
      console.log("[LLMHelper] analyzeAudioFromBase64: Trying Groq")
      const audioBuffer = Buffer.from(data, "base64")
      const text = await this.runGroqAudioPipeline(audioBuffer, "audio.webm", prompt)
      return { text, timestamp: Date.now() }
    } catch (err) {
      console.error("[LLMHelper] Groq failed in analyzeAudioFromBase64, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] analyzeAudioFromBase64: Trying Gemini")
        const audioBuffer = Buffer.from(data, "base64")
        const text = await this.runGeminiAudio(audioBuffer, mimeType, prompt)
        return { text, timestamp: Date.now() }
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in analyzeAudioFromBase64. All audio providers failed.", errGemini)
        throw errGemini
      }
    }
  }

  public async analyzeImageFile(imagePath: string): Promise<any> {
    return this.analyzeMultipleImages([imagePath])
  }

  public async analyzeMultipleImages(imagePaths: string[]): Promise<any> {
    const ocrPrompt = "Extract all text, questions, code, and details from these images."
    const getPrompt = (extractedText: string) => `${this.systemPrompt}\n\nGiven the extracted text from the screen captures:\n${extractedText}\n\nIMPORTANT: First analyze the type of question in this text, then respond accordingly:\n\n1. If it's a CODING PROBLEM (algorithm, data structure, programming challenge):\n=== PYTHON SOLUTION ===\n\`\`\`python\n[Write ONLY the Python code here - clean and ready to run]\n\`\`\`\n\n=== C++ SOLUTION ===\n\`\`\`cpp\n[Write ONLY the C++ code here - clean and ready to run]\n\`\`\`\n\n=== BRIEF EXPLANATION ===\n**Brief Explanation:** [Write ONLY a very brief explanation - 1-2 sentences max]\n\n=== TIME & SPACE COMPLEXITY ===\n**Time:** O(...)\n**Space:** O(...)\n\n2. If it's a MULTIPLE CHOICE QUESTION (MCQ):\n=== CORRECT ANSWER ===\n**Answer:** [Write ONLY the correct option letter and answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY why this is the correct answer]\n\n3. If it's a THEORETICAL QUESTION (concepts, definitions, theory):\n=== ANSWER ===\n**Answer:** [Write ONLY the direct answer]\n\n=== EXPLANATION ===\n**Explanation:** [Write ONLY the detailed explanation]\n\n4. If it's NOT a question/problem, respond with: "This appears to be [brief description]. What would you like me to help you with?"\n\nCRITICAL: Use **bold** markdown formatting for ALL section labels like "Answer:", "Explanation:", "Time:", "Space:", "Brief Explanation:", etc.`

    // Try Groq
    try {
      console.log("[LLMHelper] analyzeMultipleImages: Trying Groq")
      const extractedText = await this.runGroqVision(imagePaths, ocrPrompt)
      const text = await this.runGroqText(getPrompt(extractedText))
      return { text, timestamp: Date.now() }
    } catch (err) {
      console.error("[LLMHelper] Groq failed in analyzeMultipleImages, falling back to Gemini:", err)

      // Try Gemini
      try {
        console.log("[LLMHelper] analyzeMultipleImages: Trying Gemini")
        const extractedText = await this.runGeminiVision(imagePaths, ocrPrompt)
        const text = await this.runGeminiText(getPrompt(extractedText))
        return { text, timestamp: Date.now() }
      } catch (errGemini) {
        console.error("[LLMHelper] Gemini failed in analyzeMultipleImages, falling back to Nvidia:", errGemini)

        // Try Nvidia
        try {
          console.log("[LLMHelper] analyzeMultipleImages: Trying Nvidia")
          const extractedText = await this.runNvidiaVision(imagePaths, ocrPrompt)
          const text = await this.runNvidiaText(getPrompt(extractedText))
          return { text, timestamp: Date.now() }
        } catch (errNvidia) {
          console.error("[LLMHelper] Nvidia failed in analyzeMultipleImages. All providers failed.", errNvidia)
          throw errNvidia
        }
      }
    }
  }
}