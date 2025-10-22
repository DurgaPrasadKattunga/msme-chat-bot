import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  sessionId: string;
  query: string;
  language: 'english' | 'telugu';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { sessionId, query, language }: ChatRequest = await req.json();

    if (!sessionId || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content: query,
        language: language,
      });

    const session = new Supabase.ai.Session('gte-small');
    const queryEmbedding = await session.run(query, { mean_pool: true, normalize: true });

    const { data: relevantChunks, error: searchError } = await supabase.rpc(
      'match_documents',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 5,
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
    }

    let context = '';
    const sources = [];
    
    if (relevantChunks && relevantChunks.length > 0) {
      context = relevantChunks.map((chunk: any) => chunk.chunk_text).join('\n\n');
      sources.push(...relevantChunks.map((chunk: any) => ({
        documentId: chunk.document_id,
        chunkId: chunk.id,
        pageNumber: chunk.page_number,
        similarity: chunk.similarity,
      })));
    }

    const systemPrompt = language === 'telugu'
      ? 'మీరు MSME (సూక్ష్మ, చిన్న మరియు మధ్యతరహా సంస్థలు) వెబ్‌సైట్ కొరకు సహాయక చాట్‌బాట్. దయచేసి తెలుగులో స్పష్టమైన మరియు సహాయకరమైన సమాధానాలు అందించండి.'
      : 'You are a helpful chatbot for an MSME (Micro, Small, and Medium Enterprises) website. Provide clear and helpful answers in English.';

    const userPrompt = context
      ? `Context from knowledge base:\n${context}\n\nUser question: ${query}\n\nPlease answer based on the context provided. If the answer is not in the context, politely say you don't have that information.`
      : `User question: ${query}\n\nI don't have specific information about this in my knowledge base. Please provide a helpful general response or ask for clarification.`;

    const aiSession = new Supabase.ai.Session('meta-llama/Meta-Llama-3.1-8B-Instruct');
    const response = await aiSession.run([{
      role: 'system',
      content: systemPrompt,
    }, {
      role: 'user',
      content: userPrompt,
    }]);

    const assistantMessage = response.message?.content || 'I apologize, but I could not generate a response.';

    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: assistantMessage,
        language: language,
        sources: sources,
      });

    await supabase
      .from('chat_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({
        success: true,
        response: assistantMessage,
        sources: sources,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing chat query:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});