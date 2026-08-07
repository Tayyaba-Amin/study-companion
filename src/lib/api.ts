import { supabase } from "./supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";

/**
 * Invoke a Supabase Edge Function with the user's session token attached.
 * Extracts a friendly error message from the function's JSON error body.
 */
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {},
  });

  if (error) {
    let message = "Something went wrong on our end. Please try again.";
    if (error instanceof FunctionsHttpError) {
      try {
        const errBody = await error.context.json();
        if (errBody?.error) message = errBody.error;
      } catch {
        // fall through to default message
      }
    } else {
      message = error.message || message;
    }
    throw new Error(message);
  }

  return data as T;
}
