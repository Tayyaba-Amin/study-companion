import "jsr:@supabase/functions-js/edge-runtime.d.ts"

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const names = [
    "AI_ML_API_KEY",
    "AIML_API_KEY",
    "AIMLAPI_API_KEY",
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_URL",
  ]

  const result: Record<string, boolean> = {}
  for (const n of names) {
    result[n] = !!Deno.env.get(n)
  }

  return new Response(JSON.stringify(result, null, 2), {
    headers: { "Content-Type": "application/json" },
  })
})