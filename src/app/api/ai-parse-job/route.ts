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
      console.log('No HF API key, using pattern matching only')
    }

    console.log('Attempting to parse job with AI...')

    // Try using Hugging Face Inference API if key is available
    if (HF_API_KEY) {
      try {
        const jobData = await parseWithHuggingFace(text, HF_API_KEY)
        return NextResponse.json({ data: jobData })
      } catch (hfError) {
        console.error('Hugging Face parsing failed:', hfError)
        // Continue to fallback
      }
    }

    // Fallback to pattern matching (always works)
    console.log('Using pattern matching for extraction...')
    const jobData = parseWithPatternMatching(text)
    return NextResponse.json({
      data: jobData,
      info: 'Extracted using pattern matching'
    })

  } catch (error) {
    console.error('Error in AI parse job API:', error)
    return NextResponse.json(
      { error: 'Failed to parse job: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

async function parseWithHuggingFace(text: string, apiKey: string): Promise<Record<string, unknown>> {
  // Using HuggingFace Serverless Inference API
  // Try with a well-known, free model
  const models = [
    'facebook/bart-large-cnn',  // Summarization model
    'distilbert-base-uncased',   // General NLP
  ]

  for (const modelId of models) {
    try {
      console.log(`Trying HF model: ${modelId}`)

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${modelId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: text.substring(0, 500), // Limit input size
          }),
        }
      )

      console.log(`HF API Status for ${modelId}:`, response.status)

      if (response.status === 503) {
        // Model is loading
        console.log(`Model ${modelId} is loading...`)
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HF API Error for ${modelId}:`, errorText)
        continue
      }

      await response.json() // Result not used yet, just checking if API works
      console.log(`HF API Success with ${modelId}`)

      // Since we're using summarization, just use pattern matching with the summary
      // The real value is that the API worked - we can upgrade the model later
      throw new Error('Using pattern matching for now - HF models need fine-tuning for this use case')

    } catch (err) {
      console.error(`Error with model ${modelId}:`, err)
      continue
    }
  }

  throw new Error('All Hugging Face models failed or unavailable')
}

interface ParsedJobData {
  client_name?: string
  client_email?: string
  client_company?: string
  type?: string
  source_language?: string
  target_language?: string
  word_count?: number
  rate_per_word?: number
  duration_hours?: number
  rate_per_hour?: number
  deadline?: string
  description?: string
  notes?: string
}

function parseWithPatternMatching(text: string): ParsedJobData {
  console.log('Using pattern matching on text...')

  // Extract information using regex patterns
  const data: ParsedJobData = {}

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

  // Languages - enhanced pattern
  const langMatch = text.match(/(?:from|source)?\s*(English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic|Dutch|Polish|Turkish|Swedish|Danish|Norwegian|Finnish|Greek|Czech|Ukrainian)\s*(?:to|target|into|→|->)\s*(English|Spanish|French|German|Chinese|Japanese|Korean|Portuguese|Italian|Russian|Arabic|Dutch|Polish|Turkish|Swedish|Danish|Norwegian|Finnish|Greek|Czech|Ukrainian)/i)
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

  // Deadline - enhanced patterns
  const deadlineMatch = text.match(/(?:deadline|due|by):\s*(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}-\d{1,2}-\d{4})/i);
  if (deadlineMatch) {
    data.deadline = deadlineMatch[1] || deadlineMatch[2] || deadlineMatch[3]
  }

  // Description - first meaningful sentence or construct from available data
  const sentences = text.split(/[.!?]\s+/)
  const meaningfulSentence = sentences.find(s =>
    s.length > 20 &&
    !/^(client|from|email|name|company)/i.test(s) &&
    !/@/.test(s) &&
    !/^\d/.test(s)
  )

  if (meaningfulSentence) {
    data.description = meaningfulSentence.trim()
  } else {
    // Construct description from available info
    if (data.source_language && data.target_language) {
      data.description = `Translation service from ${data.source_language} to ${data.target_language}`
      if (data.word_count) {
        data.description += ` (${data.word_count} words)`
      }
    } else {
      data.description = text.substring(0, 200).trim()
    }
  }

  return normalizeJobData(data)
}

function normalizeJobData(data: ParsedJobData): Record<string, unknown> {
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
    notes: data.notes || '',
  }
}
