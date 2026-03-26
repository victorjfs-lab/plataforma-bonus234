import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type PortalSignupPayload = {
  fullName?: string;
  email?: string;
  password?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeMessage =
      "message" in error && typeof error.message === "string"
        ? error.message
        : "msg" in error && typeof error.msg === "string"
          ? error.msg
          : null;

    if (maybeMessage) {
      return maybeMessage;
    }

    return JSON.stringify(error);
  }

  return "Erro inesperado.";
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findAuthUserIdByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
) {
  let page = 1;

  while (page <= 10) {
    const result = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (result.error) {
      throw result.error;
    }

    const matched = result.data.users.find((user) => user.email?.toLowerCase() === email);
    if (matched) {
      return matched.id;
    }

    if (result.data.users.length < 100) {
      break;
    }

    page += 1;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo nao permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Variaveis do Supabase nao configuradas na funcao.");
    }

    const payload = (await request.json()) as PortalSignupPayload;

    if (!payload.fullName || !payload.email || !payload.password) {
      return jsonResponse({ error: "Preencha nome, email e senha." }, 400);
    }

    if (payload.password.trim().length < 6) {
      return jsonResponse({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const email = normalizeEmail(payload.email);
    let authUserId: string | null = null;

    const createUserResult = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.fullName,
      },
    });

    if (createUserResult.error) {
      const duplicateUser =
        /already exists|already been registered|registered/i.test(
          getErrorMessage(createUserResult.error),
        );

      if (!duplicateUser) {
        throw new Error(`Falha ao criar o login no Auth: ${getErrorMessage(createUserResult.error)}`);
      }

      authUserId = await findAuthUserIdByEmail(adminClient, email);

      if (!authUserId) {
        throw new Error("Ja existe um usuario com esse email.");
      }
    } else {
      authUserId = createUserResult.data.user?.id ?? null;
    }

    const profileResult = await adminClient
      .from("academy_users")
      .upsert(
        {
          auth_user_id: authUserId,
          email,
          full_name: payload.fullName,
          role: "student",
          headline: "Aluno Smart Flow News",
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    if (profileResult.error) {
      throw new Error(`Falha ao gravar o perfil do aluno: ${getErrorMessage(profileResult.error)}`);
    }

    const portalProfileResult = await adminClient
      .from("portal_student_profiles")
      .upsert(
        {
          student_key: profileResult.data.id,
          academy_user_id: profileResult.data.id,
          student_name: payload.fullName,
          student_email: email,
        },
        { onConflict: "student_key" },
      );

    if (portalProfileResult.error) {
      throw new Error(
        `Falha ao preparar o perfil do portal: ${getErrorMessage(portalProfileResult.error)}`,
      );
    }

    return jsonResponse({
      success: true,
      email,
    });
  } catch (error) {
    return jsonResponse({ error: getErrorMessage(error) }, 400);
  }
});
