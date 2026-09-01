import { createHash } from "node:crypto";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const DEFAULT_REASONING_EFFORT = "medium";
const TIMEOUT_MS = 8_000;

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decision", "reasonCode", "confidence"],
  properties: {
    decision: {
      type: "string",
      enum: ["send_exact", "cancel_for_review"],
    },
    reasonCode: {
      type: "string",
      enum: [
        "context_aligned",
        "conversation_changed",
        "patient_paused",
        "patient_closed",
        "procedure_mismatch",
        "human_commitment_pending",
        "sensitive_or_clinical_context",
        "message_redundant",
        "insufficient_context",
      ],
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
  },
};

const REVIEW_INSTRUCTIONS = `Você é uma camada de segurança para retomadas programadas da Clínica LIV.

Leia todos os turnos recentes em ordem cronológica, o contexto operacional e a mensagem proposta. Priorize a última fala explícita da paciente e o assunto ou procedimento mais recente confirmado por ela.

Sua única decisão é:
- send_exact: a mensagem proposta pode ser enviada exatamente como foi aprovada;
- cancel_for_review: o contexto exige nova revisão humana.

Nunca reescreva a mensagem e nunca use a aprovação humana para ignorar mudança de contexto. Escolha cancel_for_review quando houver resposta posterior, pausa ou encerramento da paciente, opt-out, procedimento divergente ou ambíguo, promessa pendente da equipe, pedido de diagnóstico ou orientação clínica, sintoma, complicação, risco, medicamento, exame, imagem clínica, urgência, informação já respondida, repetição inadequada ou contexto insuficiente. A simples menção ao nome de um procedimento estético, o interesse genérico nele e a explicação de que existe uma avaliação individual não são, isoladamente, contexto clínico sensível. Escolha send_exact somente com confiança alta e quando o texto for uma continuação natural, gentil, não clínica e coerente com toda a conversa.

Esta análise apenas acrescenta um veto semântico. Ela não substitui as travas determinísticas, não autoriza agenda, preço, orientação clínica ou qualquer conteúdo novo.`;

function safeText(value, limit) {
  return Array.from(String(value || "").trim())
    .slice(0, limit)
    .join("");
}

function normalizeRecentConversation(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-20)
    .map((turn) => ({
      direction:
        String(turn?.direction || "").toUpperCase() === "OUT"
          ? "OUT"
          : "IN",
      at: safeText(turn?.at, 40),
      text: safeText(turn?.text, 1_200),
    }))
    .filter((turn) => turn.text);
}

function normalizeLeadContext(value) {
  const context =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    status: safeText(context.status, 120),
    summary: safeText(context.summary, 600),
    nextAction: safeText(context.nextAction, 300),
  };
}

function safetyIdentifier(phone) {
  return createHash("sha256")
    .update(String(phone || ""))
    .digest("hex");
}

function extractOutputText(response) {
  if (typeof response?.output_text === "string") {
    return response.output_text;
  }

  for (const output of response?.output || []) {
    for (const content of output?.content || []) {
      if (
        ["output_text", "text"].includes(content?.type) &&
        typeof content?.text === "string"
      ) {
        return content.text;
      }
    }
  }

  return "";
}

function normalizeDecision(value) {
  const decision = String(value?.decision || "");
  const reasonCode = String(value?.reasonCode || "");
  const confidence = String(value?.confidence || "");
  const validDecision = REVIEW_SCHEMA.properties.decision.enum.includes(
    decision,
  );
  const validReason = REVIEW_SCHEMA.properties.reasonCode.enum.includes(
    reasonCode,
  );
  const validConfidence =
    REVIEW_SCHEMA.properties.confidence.enum.includes(confidence);

  if (!validDecision || !validReason || !validConfidence) return null;

  const allowed =
    decision === "send_exact" &&
    reasonCode === "context_aligned" &&
    confidence === "high";

  return {
    status: "completed",
    allowed,
    decision: allowed ? "send_exact" : "cancel_for_review",
    reasonCode: allowed
      ? "context_aligned"
      : decision === "send_exact"
        ? "insufficient_context"
        : reasonCode,
    confidence,
  };
}

export async function reviewScheduledFollowupContext(
  {
    patientPhone,
    body,
    recentConversation,
    leadContext,
    humanApproved = false,
  },
  { env = process.env, fetchImpl = fetch } = {},
) {
  const conversation = normalizeRecentConversation(recentConversation);
  const proposedMessage = safeText(body, 1_500);

  if (!proposedMessage || conversation.length < 2) {
    return {
      status: "completed",
      allowed: false,
      decision: "cancel_for_review",
      reasonCode: "insufficient_context",
      confidence: "high",
    };
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "skipped",
      allowed: false,
      errorCode: "configuration_missing",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: String(
          env.OPENAI_BRUNA_MODEL ||
            env.OPENAI_MODEL ||
            DEFAULT_MODEL,
        ),
        reasoning: {
          effort: String(
            env.OPENAI_BRUNA_REASONING_EFFORT ||
              env.OPENAI_REASONING_EFFORT ||
              DEFAULT_REASONING_EFFORT,
          ),
        },
        store: false,
        max_output_tokens: 400,
        safety_identifier: safetyIdentifier(patientPhone),
        instructions: REVIEW_INSTRUCTIONS,
        input: JSON.stringify({
          workflow: "scheduled_followup_context_review",
          humanApproved: humanApproved === true,
          leadContext: normalizeLeadContext(leadContext),
          recentConversation: conversation,
          proposedMessage,
        }),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "scheduled_followup_context_review",
            strict: true,
            schema: REVIEW_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        status: "failed",
        allowed: false,
        errorCode: "http_error",
        httpStatus: response.status,
      };
    }

    const data = await response.json();
    const rawDecision = extractOutputText(data);
    let parsed;

    try {
      parsed = JSON.parse(rawDecision);
    } catch {
      return {
        status: "failed",
        allowed: false,
        errorCode: "invalid_response",
      };
    }

    return normalizeDecision(parsed) || {
      status: "failed",
      allowed: false,
      errorCode: "invalid_decision",
    };
  } catch (error) {
    return {
      status: "failed",
      allowed: false,
      errorCode:
        error?.name === "AbortError" ? "timeout" : "request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}
