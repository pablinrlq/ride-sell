import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      console.error("Error checking existing admins:", checkError);
      throw new Error("Failed to check existing admins");
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Um administrador já existe. Use o painel admin para criar novos usuários.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email e senha são obrigatórios",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error creating user:", authError);
      throw new Error(authError.message);
    }

    const userId = authData.user.id;

    // Update profile with full name
    if (fullName) {
      await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", userId);
    }

    // Assign admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });

    if (roleError) {
      console.error("Error assigning admin role:", roleError);
      // Cleanup: delete the created user if role assignment fails
      await supabase.auth.admin.deleteUser(userId);
      throw new Error("Failed to assign admin role");
    }

    console.log("First admin created successfully:", email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Primeiro administrador criado com sucesso!",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in create-first-admin:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Erro interno do servidor",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
