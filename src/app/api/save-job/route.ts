import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!data.client_name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }

    if (!data.type || !['translation', 'interpreting'].includes(data.type)) {
      return NextResponse.json(
        { error: 'Invalid job type. Must be "translation" or "interpreting"' },
        { status: 400 }
      )
    }

    // Step 1: Find or create client
    let clientId: string

    // First, try to find existing client by name
    const { data: existingClients, error: searchError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', data.client_name)
      .limit(1)

    if (searchError) {
      console.error('Error searching for client:', searchError)
      return NextResponse.json(
        { error: 'Failed to search for client: ' + searchError.message },
        { status: 500 }
      )
    }

    if (existingClients && existingClients.length > 0) {
      // Client exists
      clientId = existingClients[0].id
    } else {
      // Create new client
      const clientData = {
        user_id: user.id,
        name: data.client_name,
        contact_email: data.client_email || null,
        company_name: data.client_company || null,
      }

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([clientData])
        .select('id')
        .single()

      if (clientError || !newClient) {
        console.error('Error creating client:', clientError)
        return NextResponse.json(
          { error: 'Failed to create client: ' + (clientError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      clientId = newClient.id
    }

    // Step 2: Create job
    // Note: Matching the actual database schema (source_lang, target_lang, hours)
    const jobData: Record<string, unknown> = {
      user_id: user.id,
      client_id: clientId,
      type: data.type,
      description: data.description || null,
      deadline: data.deadline || null,
      notes: data.notes || null,
      status: 'draft', // Start as draft for AI-imported jobs
    }

    // Add type-specific fields for translation
    if (data.type === 'translation') {
      jobData.source_lang = data.source_language || null
      jobData.target_lang = data.target_language || null
      jobData.word_count = data.word_count || null
      jobData.rate_per_word = data.rate_per_word || null
    }

    // Add type-specific fields for interpreting
    if (data.type === 'interpreting') {
      jobData.hours = data.duration_hours || null
      jobData.rate_per_hour = data.rate_per_hour || null
    }

    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single()

    if (jobError || !newJob) {
      console.error('Error creating job:', jobError)
      return NextResponse.json(
        { error: 'Failed to create job: ' + (jobError?.message || 'Unknown error') },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      job: newJob,
      message: 'Job created successfully'
    })

  } catch (error) {
    console.error('Error in save job API:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
