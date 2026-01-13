import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Configuração incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { fileUrl, fileName, fileType, knowledgeBaseId } = await req.json();

    if (!fileUrl || !knowledgeBaseId) {
      return new Response(JSON.stringify({ error: "fileUrl e knowledgeBaseId são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing file: ${fileName}, type: ${fileType}`);

    // Extract file path from URL - format: .../storage/v1/object/public/bucket/path
    const urlParts = fileUrl.split('/');
    const bucketIndex = urlParts.findIndex((p: string) => p === 'object') + 2;
    const bucket = urlParts[bucketIndex];
    const filePath = urlParts.slice(bucketIndex + 1).join('/').split('?')[0];
    
    console.log(`Downloading from bucket: ${bucket}, path: ${filePath}`);
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);
    
    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }

    const fileBuffer = await fileData.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);

    let extractedText = "";

    // Extract text based on file type
    if (fileType === "text/csv") {
      // CSV - direct text
      extractedText = new TextDecoder().decode(fileBytes);
    } else if (fileType === "application/pdf") {
      // For PDF, use AI to extract/summarize content
      extractedText = await extractWithAI(fileBytes, fileName, "PDF", LOVABLE_API_KEY);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // DOCX - extract using AI
      extractedText = await extractWithAI(fileBytes, fileName, "DOCX", LOVABLE_API_KEY);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      // XLSX - extract using AI
      extractedText = await extractWithAI(fileBytes, fileName, "XLSX/Excel", LOVABLE_API_KEY);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      // PPTX - extract using AI  
      extractedText = await extractWithAI(fileBytes, fileName, "PPTX/PowerPoint", LOVABLE_API_KEY);
    } else {
      // Try generic extraction
      try {
        extractedText = new TextDecoder().decode(fileBytes);
      } catch {
        extractedText = `Arquivo binário: ${fileName}. Conteúdo não pode ser extraído diretamente.`;
      }
    }

    // Limit text size (max ~15000 chars for context)
    const maxLength = 15000;
    if (extractedText.length > maxLength) {
      extractedText = extractedText.substring(0, maxLength) + "\n\n[... conteúdo truncado por limite de tamanho ...]";
    }

    // Update knowledge base entry with extracted text
    const { error: updateError } = await supabase
      .from("ai_knowledge_base")
      .update({
        content_text: extractedText,
        metadata: {
          processed: true,
          processed_at: new Date().toISOString(),
          original_file: fileName,
          file_type: fileType,
          text_length: extractedText.length,
        },
      })
      .eq("id", knowledgeBaseId);

    if (updateError) {
      console.error("Error updating knowledge base:", updateError);
      throw updateError;
    }

    console.log(`Successfully processed ${fileName}, extracted ${extractedText.length} chars`);

    return new Response(
      JSON.stringify({
        success: true,
        textLength: extractedText.length,
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? "..." : ""),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Parse document error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao processar documento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractWithAI(
  fileBytes: Uint8Array,
  fileName: string,
  fileTypeLabel: string,
  apiKey: string | undefined
): Promise<string> {
  if (!apiKey) {
    return `Arquivo ${fileTypeLabel}: ${fileName}. Extração automática requer configuração de API.`;
  }

  // Convert to base64 for sending to AI
  const base64Content = btoa(String.fromCharCode(...fileBytes.slice(0, 50000))); // Limit size

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um extrator de texto. Analise o conteúdo do arquivo ${fileTypeLabel} e extraia todo o texto relevante de forma estruturada. 
Mantenha a estrutura do documento (títulos, listas, tabelas como texto).
Se for uma planilha, converta os dados em formato tabular legível.
Se for uma apresentação, extraia o texto de cada slide.
Responda APENAS com o conteúdo extraído, sem comentários adicionais.`,
          },
          {
            role: "user",
            content: `Extraia o texto do arquivo "${fileName}" (${fileTypeLabel}). Conteúdo em base64 (primeiros bytes): ${base64Content.substring(0, 1000)}...

Se não conseguir ler o conteúdo binário diretamente, descreva que é um arquivo ${fileTypeLabel} chamado "${fileName}" e que o conteúdo precisa ser analisado manualmente ou o arquivo precisa ser convertido para texto.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`AI extraction failed: ${response.status}`);
      return `Arquivo ${fileTypeLabel}: ${fileName}. Não foi possível extrair o conteúdo automaticamente. Por favor, adicione uma descrição manual do conteúdo.`;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || `Arquivo ${fileTypeLabel}: ${fileName}`;
  } catch (error) {
    console.error("AI extraction error:", error);
    return `Arquivo ${fileTypeLabel}: ${fileName}. Erro na extração automática.`;
  }
}
