import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Não autorizado" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Verify the requesting user is an admin
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser } } = await anonClient.auth.getUser();
    
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Usuário não encontrado" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if requesting user is admin
    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ success: false, message: "Apenas administradores podem criar usuários" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    const { email, password, fullName, role } = await req.json();

    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Email, senha e função são obrigatórios",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    if (!["admin", "editor"].includes(role)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Função inválida. Use 'admin' ou 'editor'",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Create the user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
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
      await adminClient
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", userId);
    }

    // Assign role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error("Falha ao atribuir função ao usuário");
    }

    console.log(`User ${email} created with role ${role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Usuário ${role === 'admin' ? 'administrador' : 'editor'} criado com sucesso!`,
        userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in admin-create-user:", error);
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
