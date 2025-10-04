import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text content is required' },
        { status: 400 }
      )
    }

    // Check if Hugging Face API key is configured
    const HF_API_KEY = process.env.HUGGING_FACE_API_KEY
    if (!HF_API_KEY) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured. Please add HUGGING_FACE_API_KEY to your .env.local file' },
        { status: 500 }
      )
    }

    console.log('Attempting to parse job with AI...')
    console.log('API Key present:', !!HF_API_KEY, 'Length:', HF_API_KEY.length)

    // Try using Hugging Face Inference API
    try {
      const jobData = await parseWithHuggingFace(text, HF_API_KEY)
      return NextResponse.json({ data: jobData })
    } catch (hfError) {
      console.error('Hugging Face parsing failed:', hfError)

      // Fallback to pattern matching
      console.log('Falling back to pattern matching...')
      const jobData = parseWithPatternMatching(text)
      return NextResponse.json({
        data: jobData,
        warning: 'AI parsing unavailable. Used pattern matching instead. Please review all fields carefully.'
      })
    }

  } catch (error) {
    console.error('Error in AI parse job API:', error)
    return NextResponse.json(
      { error: 'Failed to parse job: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

async function parseWithHuggingFace(text: string, apiKey: string): Promise<any> {
  // Using a simpler, more reliable model
  const model = 'google/flan-t5-base'  // Smaller, faster, more reliable

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: createSimplePrompt(text),
        parameters: {
          max_new_tokens: 512,
          temperature: 0.1,
        },
      }),
    }
  )

  console.log('HF API Status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('HF API Error:', errorText)
    throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  console.log('HF API Response:', JSON.stringify(result).substring(0, 200))

  // Parse the response
  let generatedText = ''
  if (Array.isArray(result) && result.length > 0) {
    generatedText = result[0].generated_text || result[0].summary_text || ''
  } else if (result.generated_text) {
    generatedText = result.generated_text
  }

  if (!generatedText) {
    throw new Error('No text generated from AI')
  }

  // Try to extract JSON from the response
  const parsedData = extractJSON(generatedText)
  return normalizeJobData(parsedData)
}

function createSimplePrompt(text: string): string {
  return `Extract client name, email, company, job type (translation/interpreting), languages, word count, rate, and deadline from this text. Return as JSON:\n\n${text.substring(0, 1000)}`
}

function parseWithPatternMatching(text: string): any {
  console.log('Using pattern matching on text...')

  // Extract information using regex patterns
  const data: any = {}

  // Client name patterns
  const namePatterns = [
    /(?:client|from|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s*(?:from|at|@))/,
  ]
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && !data.client_name) {
      data.client_name = match[1].trim()
      break
    }
  }

  // Email pattern
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    data.client_email = emailMatch[1]
  }

  // Company pattern
  const companyPatterns = [
    /(?:company|corporation|corp|inc|llc):\s*([A-Z][\w\s&]+(?:Corporation|Corp|Inc|LLC|Company)?)/i,
    /([A-Z][\w\s&]+(?:Corporation|Corp|Inc|LLC|Company))/,
  ]
  for (const pattern of companyPatterns) {
    const match = text.match(pattern)
    if (match && !data.client_company) {
      data.client_company = match[1].trim()
      break
    }
  }

  // Job type
  if (/translation|translate/i.test(text)) {
    data.type = 'translation'
  } else if (/interpret/i.test(text)) {
    data.type = 'interpreting'
  } else {
    data.type = 'translation'  // default
  }

  // Languages
  const langMatch = text.match(/(?:from|source)?\s*(English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic)\s*(?:to|target|into)\s*(English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic)/i)
  if (langMatch) {
    data.source_language = langMatch[1]
    data.target_language = langMatch[2]
  }

  // Word count
  const wordCountMatch = text.match(/(\d+[\d,]*)\s*(?:words?|wc)/i)
  if (wordCountMatch) {
    data.word_count = parseInt(wordCountMatch[1].replace(/,/g, ''))
  }

  // Rate per word
  const rateWordMatch = text.match(/\$?\s*(\d+\.?\d*)\s*(?:per word|\/word|pw)/i)
  if (rateWordMatch) {
    data.rate_per_word = parseFloat(rateWordMatch[1])
  }

  // Duration (hours)
  const hoursMatch = text.match(/(\d+\.?\d*)\s*(?:hours?|hrs?)/i)
  if (hoursMatch) {
    data.duration_hours = parseFloat(hoursMatch[1])
  }

  // Rate per hour
  const rateHourMatch = text.match(/\$?\s*(\d+\.?\d*)\s*(?:per hour|\/hour|hourly)/i)
  if (rateHourMatch) {
    data.rate_per_hour = parseFloat(rateHourMatch[1])
  }

  // Deadline
  const deadlineMatch = text.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (deadlineMatch) {
    data.deadline = deadlineMatch[1] || deadlineMatch[2]
  }

  // Description - first meaningful sentence or construct from available data
  const sentences = text.split(/[.!?]\s+/)
  data.description = sentences.find(s => s.length > 20 && !/^(client|from|email)/i.test(s))?.trim() || text.substring(0, 200)

  return normalizeJobData(data)
}

function extractJSON(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to parse JSON, using empty object')
    return {}
  }
}

function normalizeJobData(data: any): any {
  return {
    client_name: data.client_name || 'Unknown Client',
    client_email: data.client_email || '',
    client_company: data.client_company || '',
    type: data.type === 'interpreting' ? 'interpreting' : 'translation',
    description: data.description || '',
    source_language: data.source_language || '',
    target_language: data.target_language || '',
    word_count: typeof data.word_count === 'number' ? data.word_count : undefined,
    rate_per_word: typeof data.rate_per_word === 'number' ? data.rate_per_word : undefined,
    duration_hours: typeof data.duration_hours === 'number' ? data.duration_hours : undefined,
    rate_per_hour: typeof data.rate_per_hour === 'number' ? data.rate_per_hour : undefined,
    deadline: data.deadline || '',
    notes: data.notes || 'Please review and update all fields',
  }
}
