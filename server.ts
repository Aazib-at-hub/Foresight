import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper to get Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in the AI Studio Secrets panel.");
  }
  return new GoogleGenAI({ apiKey });
}

// Helper to strip non-JSON wrapper elements and fix trailing commas/comments
function cleanJson(text: string): string {
  let cleaned = text.trim();
  
  // 1. Strip markdown code block wrappers if they exist
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
  const genericBlockRegex = /```\s*([\s\S]*?)\s*```/;
  
  let match = cleaned.match(jsonBlockRegex);
  if (match) {
    cleaned = match[1].trim();
  } else {
    match = cleaned.match(genericBlockRegex);
    if (match) {
      cleaned = match[1].trim();
    }
  }

  // 2. Extract only the portion between the first '{' or '[' and the last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }
  
  if (startIdx !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    const lastBracket = cleaned.lastIndexOf(']');
    const endIdx = Math.max(lastBrace, lastBracket);
    if (endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  // 3. Strip Javascript-style comments (single line // and multi-line /* */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned
    .split("\n")
    .map(line => {
      const idx = line.indexOf("//");
      if (idx !== -1) {
        const before = line.substring(0, idx);
        if (!/https?:$/i.test(before)) {
          return before;
        }
      }
      return line;
    })
    .join("\n");

  // 4. Remove trailing commas in objects or arrays
  cleaned = cleaned.replace(/,\s*}/g, "}");
  cleaned = cleaned.replace(/,\s*\]/g, "]");

  return cleaned.trim();
}

// Helper to perform a Gemini API call with exponential backoff on retryable errors (429/503)
async function generateWithRetry(
  ai: ReturnType<typeof getGeminiClient>,
  model: string,
  contents: any,
  config: any,
  maxRetries = 3
): Promise<any> {
  let attempt = 0;
  let delay = 1000; // start with 1000ms delay

  while (true) {
    try {
      attempt++;
      return await ai.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (error: any) {
      const errorMessage = error.message || "";
      const status = error.status || 
        (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE") ? 503 : 
        (errorMessage.includes("429") || errorMessage.includes("RESOURCE_EXHAUSTED") ? 429 : null));
      
      const isRetryable = status === 429 || status === 503 || 
                          errorMessage.includes("RESOURCE_EXHAUSTED") || 
                          errorMessage.includes("UNAVAILABLE") ||
                          errorMessage.includes("high demand") ||
                          errorMessage.includes("quota");

      if (attempt >= maxRetries || !isRetryable) {
        throw error;
      }

      console.warn(`[Gemini API] Call failed (attempt ${attempt}/${maxRetries}) on model ${model}: ${errorMessage}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
}

// Helper to call Gemini and parse JSON safely
async function generateJson(prompt: string, fallback: any, schema?: any): Promise<any> {
  const ai = getGeminiClient();
  const config: any = {
    responseMimeType: "application/json",
  };
  if (schema) {
    config.responseSchema = schema;
  }

  // Helper to attempt generation with a specific model and schema configuration
  const attemptGeneration = async (modelName: string, configObj: any, maxRetries = 3): Promise<string> => {
    const response = await generateWithRetry(ai, modelName, prompt, configObj, maxRetries);
    return response.text || "";
  };

  try {
    // 1. Try with primary model: gemini-3.5-flash
    const text = await attemptGeneration("gemini-3.5-flash", config);
    if (!text.trim()) {
      return fallback;
    }
    
    try {
      return JSON.parse(cleanJson(text));
    } catch (parseError) {
      console.warn("JSON.parse failed on cleanJson text, trying fallback without cleaning:", parseError);
      return JSON.parse(text);
    }
  } catch (error: any) {
    console.warn(`[Gemini API] Primary model (gemini-3.5-flash) failed: ${error.message}. Attempting fallback to gemini-3.1-flash-lite...`);
    
    try {
      // 2. Try with fallback model: gemini-3.1-flash-lite
      const text = await attemptGeneration("gemini-3.1-flash-lite", config);
      if (!text.trim()) {
        return fallback;
      }
      
      try {
        return JSON.parse(cleanJson(text));
      } catch (parseError) {
        return JSON.parse(text);
      }
    } catch (fallbackError: any) {
      console.warn(`[Gemini API] Fallback model (gemini-3.1-flash-lite) also failed: ${fallbackError.message}. Trying schema-free generation...`);
      
      // 3. Try standard generation without schema as ultimate fallback (in case schema parsing was the root issue or has separate rate limits)
      try {
        const noSchemaConfig: any = {
          responseMimeType: "application/json"
        };
        const rawText = await attemptGeneration(
          "gemini-3.1-flash-lite",
          noSchemaConfig,
          2 // fewer retries for the last-ditch effort
        );
        const cleaned = cleanJson(rawText);
        return JSON.parse(cleaned);
      } catch (innerError: any) {
        console.error("[Gemini API] All generation attempts exhausted. Gracefully reverting to static fallback data:", innerError.message);
        return fallback;
      }
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // FR-2: Parse natural language commitment
  app.post("/api/commitments/parse", async (req, res) => {
    try {
      const { text, currentDate } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const today = currentDate || new Date().toISOString().split("T")[0];
      const prompt = `
        You are the Planner Agent of "Foresight", an AI commitment forecasting platform.
        Your task is to parse a user's natural language commitment into a structured commitment object.
        Today's date is: ${today}.
        
        Analyze the input: "${text}"
        Extract:
        1. "title": A concise, clear, professional title of the commitment (e.g. "Prepare for AI Interview").
        2. "deadline": Calculate the calendar date (YYYY-MM-DD) based on relative references like "by Friday", "next week", "in 3 days", "tomorrow". If no deadline is specified, suggest a reasonable one within the next 3 days.
        3. "priority": "High", "Medium", or "Low" based on the phrasing and urgency.
        
        Respond with ONLY a JSON object of this structure:
        {
          "title": "string",
          "deadline": "YYYY-MM-DD",
          "priority": "High" | "Medium" | "Low"
        }
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          deadline: { type: Type.STRING },
          priority: { type: Type.STRING }
        },
        required: ["title", "deadline", "priority"]
      };

      const result = await generateJson(prompt, {
        title: text,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        priority: "Medium"
      }, schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FR-4: Planner Agent - Decompose commitment into smaller actionable tasks
  app.post("/api/commitments/decompose", async (req, res) => {
    try {
      const { title, deadline, priority } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const prompt = `
        You are the Planner Agent of "Foresight".
        Decompose the following commitment into 4 to 6 smaller, logical, actionable subtasks/milestones:
        Commitment: "${title}"
        Deadline: ${deadline}
        Priority: ${priority}
        
        For each subtask, provide:
        1. "title": A clear milestone title (e.g., "Drafting outline", "Coding frontend").
        2. "estimatedHours": A realistic estimate of hours needed to complete this subtask (e.g. 2, 4, 1.5).
        3. "status": Must be "Pending".
        
        Respond with ONLY a JSON array of this structure:
        [
          {
            "title": "string",
            "estimatedHours": number,
            "status": "Pending"
          }
        ]
      `;

      const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            estimatedHours: { type: Type.NUMBER },
            status: { type: Type.STRING }
          },
          required: ["title", "estimatedHours", "status"]
        }
      };

      const result = await generateJson(prompt, [
        { title: "Initial Planning & Setup", estimatedHours: 2, status: "Pending" },
        { title: "Core Implementation", estimatedHours: 5, status: "Pending" },
        { title: "Testing & Review", estimatedHours: 2, status: "Pending" }
      ], schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FR-7 & FR-9: Risk Assessment & Intervention Agents
  app.post("/api/commitments/analyze-risk", async (req, res) => {
    try {
      const { commitment, allCommitments, currentDate } = req.body;
      if (!commitment) {
        return res.status(400).json({ error: "Commitment is required" });
      }

      const today = currentDate || new Date().toISOString().split("T")[0];
      const prompt = `
        You are the Risk and Intervention Agents of "Foresight".
        Your task is to analyze a user's commitment feasibility and risk.
        
        Current date is: ${today}.
        Target Commitment:
        - Title: "${commitment.title}"
        - Deadline: "${commitment.deadline}"
        - Priority: "${commitment.priority}"
        - Subtasks: ${JSON.stringify(commitment.subtasks || [])}
        
        Existing Active Commitments (representing user's concurrent workload):
        ${JSON.stringify(allCommitments || [])}
        
        Calculate:
        1. "successProbability": A number between 0 and 100 representing the likelihood of success.
        2. "riskScore": A number between 0 and 100 (inverse of success probability, adjusted for priority and workload conflict).
        3. "riskLevel": One of "Low", "Medium", "High", "Critical".
           - Low: Success Probability >= 80%
           - Medium: Success Probability 60-79%
           - High: Success Probability 40-59%
           - Critical: Success Probability < 40% (or very tight deadlines with high workload)
        4. "explanation": A 2-sentence empathetic analysis of why this risk level was calculated (citing workload conflicts, subtask size, and time remaining).
        5. "interventions": Generate EXACTLY 3 highly tactical, actionable recommendations to improve this commitment's success.
           Each intervention should have:
           - "recommendation": Concrete action (e.g., "Dedicate 2 hours tonight strictly for UI mockups to unblock coding", "Reduce scope of extra features", "Request an extension from your stakeholder").
           - "impact": A positive text showing the impact (e.g., "+15% success rate by spreading work early").
           - "expectedSuccessProbability": What the overall success probability will be if this specific action is applied (e.g. 78).
        
        Respond with ONLY a JSON object of this structure:
        {
          "successProbability": number,
          "riskScore": number,
          "riskLevel": "Low" | "Medium" | "High" | "Critical",
          "explanation": "string",
          "interventions": [
            {
              "recommendation": "string",
              "impact": "string",
              "expectedSuccessProbability": number
            }
          ]
        }
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          successProbability: { type: Type.NUMBER },
          riskScore: { type: Type.NUMBER },
          riskLevel: { type: Type.STRING },
          explanation: { type: Type.STRING },
          interventions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                recommendation: { type: Type.STRING },
                impact: { type: Type.STRING },
                expectedSuccessProbability: { type: Type.NUMBER }
              },
              required: ["recommendation", "impact", "expectedSuccessProbability"]
            }
          }
        },
        required: ["successProbability", "riskScore", "riskLevel", "explanation", "interventions"]
      };

      const result = await generateJson(prompt, {
        successProbability: 75,
        riskScore: 25,
        riskLevel: "Medium",
        explanation: "The commitment is achievable, but concurrent project deadlines may cause scheduling strain over the weekend.",
        interventions: [
          { recommendation: "Start the core implementation today instead of tomorrow", impact: "+15% Success Rate", expectedSuccessProbability: 90 },
          { recommendation: "Delegate minor styling subtasks or use simpler components", impact: "+8% Success Rate", expectedSuccessProbability: 83 },
          { recommendation: "Schedule a 1-hour focused timeblock tomorrow morning", impact: "+10% Success Rate", expectedSuccessProbability: 85 }
        ]
      }, schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FR-10: Recovery Mode Plan Generator (triggers when commitment risk is Critical / High)
  app.post("/api/commitments/recovery-plan", async (req, res) => {
    try {
      const { commitment, currentDate } = req.body;
      if (!commitment) {
        return res.status(400).json({ error: "Commitment is required" });
      }

      const today = currentDate || new Date().toISOString().split("T")[0];
      const prompt = `
        You are the Recovery Agent of "Foresight".
        This commitment is in CRITICAL/HIGH risk. You need to provide a tactical recovery plan.
        
        Commitment: "${commitment.title}"
        Deadline: "${commitment.deadline}"
        Priority: "${commitment.priority}"
        Current Success Probability: ${commitment.successProbability}%
        Subtasks: ${JSON.stringify(commitment.subtasks || [])}
        Today's Date: ${today}
        
        Generate:
        1. "scheduleRebuilding": A list of 3 specific day-by-day focused time blocks (e.g. "Wednesday Evening (7-9 PM): Rapid prototype and base structure").
        2. "scopeOptimization": A list of 2 concrete suggestions on what non-essential parts of this commitment can be deferred or cut (e.g., "Skip custom animations, implement simple fades").
        3. "prioritizedSteps": A list of the 3 most critical subtasks that MUST be completed first to avoid failure.
        
        Respond with ONLY a JSON object of this structure:
        {
          "scheduleRebuilding": ["string"],
          "scopeOptimization": ["string"],
          "prioritizedSteps": ["string"]
        }
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          scheduleRebuilding: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          scopeOptimization: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          prioritizedSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["scheduleRebuilding", "scopeOptimization", "prioritizedSteps"]
      };

      const result = await generateJson(prompt, {
        scheduleRebuilding: [
          "Phase 1 (Tonight, 8-10 PM): Implement raw core features and skeleton draft.",
          "Phase 2 (Tomorrow, 7-9 PM): Complete critical functional workflows and basic testing."
        ],
        scopeOptimization: [
          "Defer advanced styling options or custom database enhancements.",
          "Limit initial presentation to essential user journeys only."
        ],
        prioritizedSteps: [
          "Establish core functionality first.",
          "Conduct a baseline integration check."
        ]
      }, schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FR-11: Negotiation Agent - Generate communication drafts
  app.post("/api/commitments/negotiation-draft", async (req, res) => {
    try {
      const { commitment, type, reason } = req.body;
      if (!commitment) {
        return res.status(400).json({ error: "Commitment is required" });
      }

      const prompt = `
        You are the Negotiation Agent of "Foresight".
        Generate an elegant, professional, empathetic, and persuasive communication draft asking for a deadline extension or rescheduling.
        
        Commitment: "${commitment.title}"
        Current Deadline: "${commitment.deadline}"
        Recipient Type / Channel: "${type}" (e.g. "email", "slack", "client")
        Reason for request: "${reason || "heavy workload / high risk of failure due to scheduling conflicts"}"
        
        Draft instructions:
        - Maintain a highly professional, polite, and accountable tone.
        - State progress made so far to show commitment.
        - Propose a specific, realistic new date (suggest exactly 3 days after the original deadline).
        - Include placeholders like [Name] where appropriate.
        - The text should be ready to copy and paste.
        
        Respond with ONLY a JSON object of this structure:
        {
          "draft": "string"
        }
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          draft: { type: Type.STRING }
        },
        required: ["draft"]
      };

      const result = await generateJson(prompt, {
        draft: `Dear [Name],\n\nI am writing to update you on my progress with "${commitment.title}". I am fully committed to delivering high-quality results, but due to unexpected schedule overlaps, I would appreciate a slight extension to [New Date].\n\nThank you for your understanding.\n\nBest regards,\n[Your Name]`
      }, schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // FR-12: Daily Commitment Audit
  app.post("/api/commitments/daily-audit", async (req, res) => {
    try {
      const { commitments, currentDate } = req.body;
      const today = currentDate || new Date().toISOString().split("T")[0];

      const prompt = `
        You are the Auditing Agent of "Foresight".
        You are conducting a Daily Commitment Audit.
        Today's Date: ${today}.
        
        User's Active Commitments:
        ${JSON.stringify(commitments || [])}
        
        Generate a comprehensive, strategic daily report:
        1. "healthScore": A calculated general percentage (0-100) of overall commitment health based on active tasks and success probabilities.
        2. "summary": A 3-sentence high-level overview of where the user stands today. Be encouraging but direct about bottleneck areas.
        3. "riskHighlights": A list of 2-3 specific insights highlighting why certain tasks are at risk.
        4. "urgentActions": A list of 3 high-priority concrete steps the user should take TODAY to secure their commitments.
        
        Respond with ONLY a JSON object of this structure:
        {
          "healthScore": number,
          "summary": "string",
          "riskHighlights": ["string"],
          "urgentActions": ["string"]
        }
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          healthScore: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          riskHighlights: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          urgentActions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["healthScore", "summary", "riskHighlights", "urgentActions"]
      };

      const result = await generateJson(prompt, {
        healthScore: 70,
        summary: "Your commitment landscape is moderately balanced today. While most tasks are moving forward smoothly, a couple of high-priority milestones require direct attention before the weekend. Focus on resolving bottleneck subtasks early.",
        riskHighlights: [
          "High risk of overlap between upcoming deadlines on Friday.",
          "Estimated efforts for complex tasks are exceeding your typical weekly bandwidth."
        ],
        urgentActions: [
          "Complete the initial blueprinting of your primary project today.",
          "Block out 90 minutes this afternoon for uninterrupted focus on high-priority items.",
          "Check feasibility of minor deadlines and adjust dates if needed."
        ]
      }, schema);

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
