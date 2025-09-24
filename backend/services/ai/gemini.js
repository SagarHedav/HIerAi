import { GoogleGenerativeAI } from '@google/generative-ai'

function getClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
}

function buildPrompt({ jobText, requirements, resumeText, coverLetter, weights }) {
  return `You are an experienced technical recruiter. Score the candidate against the job.
Return ONLY strict JSON, no prose, matching this schema:
{"score": number (0-100), "strengths": string[], "gaps": string[], "matchedKeywords": string[], "rationale": string}

Scoring guidance:
- Prioritize required skills and seniority. Use weights when provided.
- Penalize large gaps, irrelevant experience, or missing key skills.
- Keep rationale under 1000 chars.

Job Description:\n${jobText}
Requirements: ${Array.isArray(requirements)?requirements.join(', '):requirements}
Weights: ${JSON.stringify(weights||{})}

Resume Text:\n${resumeText}

Cover Letter:\n${coverLetter||''}`
}

function extractJson(text) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('Model did not return JSON')
  return JSON.parse(text.slice(start, end + 1))
}

export async function scoreWithGemini({ jobText, requirements, resumeText, coverLetter, weights }) {
  const model = getClient()
  const prompt = buildPrompt({ jobText, requirements, resumeText, coverLetter, weights })
  const resp = await model.generateContent([{ text: prompt }])
  const raw = resp.response.text()
  const parsed = extractJson(raw)

  // sanitize
  const score = Math.max(0, Math.min(100, Number(parsed.score)||0))
  return {
    score,
    strengths: parsed.strengths||[],
    gaps: parsed.gaps||[],
    matchedKeywords: parsed.matchedKeywords||[],
    rationale: (parsed.rationale||'').slice(0, 1200)
  }
}
