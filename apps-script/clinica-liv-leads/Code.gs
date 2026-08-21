const CONFIG = Object.freeze({
  spreadsheetId: "1rZJbqYcNp8FOmQNfzVed7UQOMoRo-Q818RHRyekMuMU",
  sheetName: "Google Ads - Conversões",
  danielSheetName: "Leads Dr. Daniel",
  secretProperty: "LEADS_INGEST_SECRET",
  eventSheetName: "_WHATSAPP_EVENTOS",
  humanTakeoverSheetName: "_WHATSAPP_ATENDIMENTO_HUMANO",
  alertEmailSheetName: "_WHATSAPP_ALERTAS_EMAIL",
  messageSheetName: "_WHATSAPP_MENSAGENS",
  classificationSheetName: "_WHATSAPP_CLASSIFICACAO",
  operationalEventSheetName: "_WHATSAPP_OPERACAO_EVENTOS",
  leadStageEventSheetName: "_LEAD_FASE_EVENTOS",
  googleAdsEventSheetName: "_GOOGLE_ADS_EVENTOS",
  googleAdsImportSheetName: "IMPORT_GOOGLE_ADS",
  googleAdsCustomerId: "9953344486",
  googleAdsTransactionSecretProperty: "GOOGLE_ADS_TRANSACTION_HMAC_SECRET",
  leadIdentitySecretProperty: "LEAD_IDENTITY_HMAC_SECRET",
  leadIdentityKeyVersionProperty: "LEAD_IDENTITY_HMAC_KEY_VERSION",
  attributionSchemaVersionProperty: "ATTRIBUTION_SCHEMA_VERSION",
  nonLeadArchiveSheetName: "_CONTATOS_NAO_LEADS",
  qualifiedConversionName: "Lead qualificado GCLID",
  reviewAlertEmail: "daniel.added@gmail.com",
  timezone: "America/Sao_Paulo",
  appointmentSlotsSheetName: "Datas Consulta",
  appointmentSlotsHeaderRow: 6,
  appointmentSlotsColumns: 7,
  totalColumns: 25,
  classificationDelayMinutes: 10,
  classificationLeaseMinutes: 10,
  classificationMaxAttempts: 8,
});

const EXPECTED_HEADERS = Object.freeze([
  "Data do contato",
  "Referência da campanha",
  "Telefone (E.164)",
  "E-mail",
  "Situação do lead",
  "Data da situação",
  "Enviar ao Google Ads?",
  "Nome da conversão",
  "Valor (R$)",
  "Consentimento para medição",
  "GCLID",
  "GBRAID",
  "WBRAID",
  "Data e hora da conversão",
  "ID da transação",
  "Moeda",
  "Observação administrativa",
  "Planejamento Individual",
  "Origem do evento",
  "Plataforma de aquisição",
  "Campanha",
  "Criativo",
  "CTA",
  "Destino",
  "Referência completa",
]);

const WHATSAPP_EVENT_HEADERS = Object.freeze([
  "Message ID",
  "Event ID",
  "Telefone",
  "Data do evento",
  "Linha do lead",
  "Resultado",
  "Opportunity ID",
  "Profissional",
  "Status de roteamento",
  "Categoria da referência",
  "Motivo do fallback",
  "Referência de origem",
  "Plataforma de aquisição",
  "Origem inicial canônica",
  "Canal inicial",
  "Caminho de conversão",
  "Campanha inicial da jornada",
  "Grupo/conjunto inicial da jornada",
  "Criativo inicial da jornada",
  "Meta Campaign ID",
  "Meta Adset ID",
  "Meta Ad ID",
  "Landing page inicial",
  "Página do CTA",
  "Local do CTA",
  "Primeiro toque em",
  "Origem da conversa atual",
  "Canal da conversa atual",
  "Caminho da conversa atual",
  "Campanha da conversa atual",
  "Grupo/conjunto da conversa atual",
  "Criativo da conversa atual",
  "Meta Campaign ID atual",
  "Meta Adset ID atual",
  "Meta Ad ID atual",
  "Último toque em",
  "Confiança da atribuição",
  "Motivo do fallback da jornada",
  "Status da jornada",
  "Origem informada pelo paciente",
  "Confiança da origem informada",
]);

const WHATSAPP_EVENT_BASE_HEADER_COUNT = 13;

function attributionSchemaEnabled_() {
  try {
    return String(
      PropertiesService.getScriptProperties().getProperty(
        CONFIG.attributionSchemaVersionProperty,
      ) || "",
    ).trim().toLowerCase() === "v1";
  } catch (_error) {
    // Fail closed in tests and during transient configuration failures. Merely
    // deploying code must never mutate the live workbook schema.
    return false;
  }
}

function cabecalhosEventosWhatsAppAtivos_() {
  return attributionSchemaEnabled_()
    ? WHATSAPP_EVENT_HEADERS
    : WHATSAPP_EVENT_HEADERS.slice(0, WHATSAPP_EVENT_BASE_HEADER_COUNT);
}

function habilitarSchemaAtribuicaoV1(input) {
  input = input && typeof input === "object" ? input : {};
  const migration = typeof migrarSchemaAtribuicaoV1 === "function"
    ? migrarSchemaAtribuicaoV1({ apply: false })
    : { ok: false, reason: "attribution_schema_migration_unavailable" };
  if (input.apply !== true) {
    return Object.assign({
      enabled: attributionSchemaEnabled_(),
      mode: "dry_run",
    }, migration);
  }
  if (input.confirmation !== "HABILITAR_SCHEMA_ATRIBUICAO_V1") {
    throw new Error("attribution_schema_confirmation_required");
  }
  if (!migration || migration.ok !== true || migration.blocked === true) {
    throw new Error("attribution_schema_preflight_failed");
  }

  const applied = migrarSchemaAtribuicaoV1({
    apply: true,
    confirmation: "APLICAR_SCHEMA_ATRIBUICAO_V1",
  });
  if (!applied || applied.ok !== true || applied.blocked === true) {
    throw new Error("attribution_schema_migration_failed");
  }
  PropertiesService.getScriptProperties().setProperty(
    CONFIG.attributionSchemaVersionProperty,
    "v1",
  );
  return Object.assign({ enabled: true, mode: "applied" }, applied);
}

/**
 * Entrada administrativa sem parâmetros para a liberação coordenada do schema.
 * A migração interna continua protegida, validada e idempotente.
 */
function aplicarSchemaAtribuicaoV1Autorizado() {
  return habilitarSchemaAtribuicaoV1({
    apply: true,
    confirmation: "HABILITAR_SCHEMA_ATRIBUICAO_V1",
  });
}

function desabilitarSchemaAtribuicaoV1(input) {
  input = input && typeof input === "object" ? input : {};
  if (
    input.apply !== true ||
    input.confirmation !== "DESABILITAR_SCHEMA_ATRIBUICAO_V1"
  ) {
    throw new Error("attribution_schema_disable_confirmation_required");
  }
  PropertiesService.getScriptProperties().deleteProperty(
    CONFIG.attributionSchemaVersionProperty,
  );
  return {
    ok: true,
    enabled: false,
    preservedColumns: true,
    note: "A coleta foi desligada; nenhuma coluna ou dado foi apagado.",
  };
}

function doGet(e) {
  const view = String(
    e && e.parameter && e.parameter.view
      ? e.parameter.view
      : "",
  ).trim();

  if (
    view === "cancelar_retomadas" &&
    typeof renderCancelamentoRetomadas_ === "function"
  ) {
    return renderCancelamentoRetomadas_(
      e && e.parameter ? e.parameter : {},
    );
  }

  if (
    view === "aprovar_retomada_bot" &&
    typeof renderAprovacaoRetomadaBot_ === "function"
  ) {
    return renderAprovacaoRetomadaBot_(
      e && e.parameter ? e.parameter : {},
    );
  }

  if (
    view === "salas" &&
    typeof renderFormularioReservaSalas_ === "function"
  ) {
    return renderFormularioReservaSalas_(
      e && e.parameter ? e.parameter.key : "",
    );
  }

  return json_({
    ok: true,
    service: "clinica-liv-leads",
    deduplication: "one_open_opportunity_per_contact_and_professional",
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let stage = "parse_body";

  try {
    const body = parseBody_(e);
    const expectedSecret = PropertiesService
      .getScriptProperties()
      .getProperty(CONFIG.secretProperty);

    if (!expectedSecret || body.secret !== expectedSecret) {
      return json_({ ok: false, error: "unauthorized" });
    }

    if (
      body.action !== "append_lead" &&
      body.action !== "mark_human_takeover" &&
      body.action !== "upsert_appointment" &&
      body.action !== "touch_appointment" &&
      body.action !== "update_appointment_status" &&
      body.action !== "get_available_slots" &&
      body.action !== "get_appointment" &&
      body.action !== "reserve_appointment_slot" &&
      body.action !== "record_pending_appointment_selection" &&
      body.action !== "send_review_alert_email" &&
      body.action !== "claim_due_classifications" &&
      body.action !== "hydrate_classification_jobs" &&
      body.action !== "complete_classification" &&
      body.action !== "fail_classification" &&
      body.action !== "get_patient_relationship" &&
      body.action !== "record_patient_commitment" &&
      body.action !== "resolve_patient_commitments" &&
      body.action !== "record_external_professional_contact" &&
      body.action !== "remove_external_professional_contact" &&
      body.action !== "get_bot_knowledge_context" &&
      body.action !== "record_bot_unknown_question" &&
      body.action !== "record_human_learning_answer" &&
      body.action !== "record_bot_knowledge_usage" &&
      body.action !== "archive_nonlead_contact" &&
      body.action !== "record_operational_event" &&
      body.action !== "record_conversation_turn" &&
      body.action !== "get_conversation_context" &&
      body.action !== "apply_audited_lead_classifications" &&
      body.action !== "run_synthetic_health_check"
    ) {
      return json_({ ok: false, error: "unsupported_action" });
    }

    if (body.action === "get_conversation_context") {
      stage = "get_conversation_context";
      const conversationContext = obterContextoConversa_(
        body.conversation || {},
      );
      return json_({
        ...conversationContext,
        ok: conversationContext.ok === true,
      });
    }

    if (body.action === "record_conversation_turn") {
      stage = "record_conversation_turn";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const conversationTurn = registrarTurnoConversa_(
        body.conversation || {},
      );
      return json_({
        ...conversationTurn,
        ok: conversationTurn.ok === true,
      });
    }

    if (body.action === "record_operational_event") {
      stage = "record_operational_event";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const operationalResult = registrarEventoOperacional_(
        body.event || {},
      );
      return json_({ ok: operationalResult.ok === true, ...operationalResult });
    }

    if (body.action === "apply_audited_lead_classifications") {
      stage = "apply_audited_lead_classifications";
      if (!lock.tryLock(30000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const auditResult = aplicarCorrecoesClassificacaoAuditadas_(
        body.audit || {},
      );
      return json_({ ok: auditResult.ok === true, ...auditResult });
    }

    if (body.action === "run_synthetic_health_check") {
      stage = "run_synthetic_health_check";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const healthResult = executarTesteSinteticoIntegracoes_(
        body.attributionProbe || {},
      );
      return json_({ ok: healthResult.ok === true, ...healthResult });
    }

    if (body.action === "archive_nonlead_contact") {
      stage = "archive_nonlead_contact";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const archiveResult = arquivarContatoNaoLead_(
        SpreadsheetApp.openById(CONFIG.spreadsheetId),
        body.contact || {},
      );
      return json_({ ok: true, ...archiveResult });
    }

    if (body.action === "claim_due_classifications") {
      stage = "claim_due_classifications";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const claimResult = claimDueLeadClassifications_(body.limit);
      return json_({ ok: true, ...claimResult });
    }

    if (body.action === "hydrate_classification_jobs") {
      stage = "hydrate_classification_jobs";
      const hydrationResult = hydrateLeadClassificationJobs_(
        body.jobs || [],
      );
      return json_({ ok: true, ...hydrationResult });
    }

    if (body.action === "complete_classification") {
      stage = "complete_classification";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const completionResult = completeLeadClassification_(
        body.job || {},
        body.classification || {},
      );
      return json_({ ok: true, ...completionResult });
    }

    if (body.action === "fail_classification") {
      stage = "fail_classification";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const failureResult = failLeadClassification_(body.job || {});
      return json_({ ok: true, ...failureResult });
    }

    if (body.action === "mark_human_takeover") {
      stage = "mark_human_takeover";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const takeoverResult = registrarAtendimentoHumano_(
        body.takeover || {},
      );

      return json_({
        ...takeoverResult,
        ok: takeoverResult.ok === true,
      });
    }

    if (body.action === "get_available_slots") {
      stage = "get_available_slots";
      const slotsResult = getAvailableAppointmentSlots_({
        professional: body.professional,
        limit: body.limit,
      });

      return json_({
        ok: true,
        slots: slotsResult,
      });
    }

    if (body.action === "reserve_appointment_slot") {
      stage = "reserve_appointment_slot";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const reservationResult =
        reservarHorarioEAgendarConsulta_(
          body.appointment || {},
        );

      return json_({
        ...reservationResult,
        ok: reservationResult.ok === true,
      });
    }

    if (body.action === "upsert_appointment") {
      stage = "normalize_appointment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      stage = "upsert_appointment";
      const appointmentResult = upsertConsultaRecebida_(
        body.appointment || {},
      );

      return json_({
        ok: appointmentResult.ok === true,
        ...appointmentResult,
      });
    }

    if (body.action === "touch_appointment") {
      stage = "touch_appointment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const touchResult = registrarInteracaoHumanaDaConsulta_(
        body.appointment || {},
      );

      return json_({
        ok: touchResult.ok === true,
        ...touchResult,
      });
    }

    if (body.action === "update_appointment_status") {
      stage = "update_appointment_status";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const statusResult = registrarRespostaPacienteDaConsulta_(
        body.appointment || {},
      );

      return json_({
        ok: statusResult.ok === true,
        ...statusResult,
      });
    }

    if (body.action === "send_review_alert_email") {
      stage = "send_review_alert_email";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const emailResult = sendReviewAlertEmail_(
        body.alert || {},
      );

      return json_({
        ok: emailResult.ok === true,
        ...emailResult,
      });
    }

    if (body.action === "get_patient_relationship") {
      stage = "get_patient_relationship";
      const relationshipResult =
        obterRelacionamentoPaciente_(
          body.patient || {},
        );

      return json_({
        ok: true,
        relationship: relationshipResult,
      });
    }

    if (body.action === "record_patient_commitment") {
      stage = "record_patient_commitment";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const commitmentResult =
        registrarCompromissoPaciente_(
          body.commitment || {},
        );

      return json_({
        ok: commitmentResult.ok === true,
        ...commitmentResult,
      });
    }

    if (body.action === "resolve_patient_commitments") {
      stage = "resolve_patient_commitments";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const resolutionResult =
        resolverCompromissosPaciente_(
          body.resolution || {},
        );

      return json_({
        ok: resolutionResult.ok === true,
        ...resolutionResult,
      });
    }

    if (body.action === "get_appointment") {
      stage = "get_appointment";
      const appointmentResult = obterConsultaPorId_(
        body.appointment || {},
      );

      return json_({
        ...appointmentResult,
        ok: appointmentResult.ok === true,
      });
    }

    if (body.action === "record_pending_appointment_selection") {
      stage = "record_pending_appointment_selection";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const pendingResult = registrarSelecaoPendenteAgendamento_(
        body.appointment || {},
      );
      return json_({
        ...pendingResult,
        ok: pendingResult.ok === true,
      });
    }

    if (body.action === "get_bot_knowledge_context") {
      stage = "get_bot_knowledge_context";
      const knowledgeResult = obterContextoConhecimentoBot_(
        body.knowledge || {},
      );
      return json_({ ok: true, ...knowledgeResult });
    }

    if (body.action === "record_bot_unknown_question") {
      stage = "record_bot_unknown_question";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const learningResult = registrarDuvidaBot_(
        body.learning || {},
      );
      return json_({
        ...learningResult,
        ok: learningResult.ok === true,
      });
    }

    if (body.action === "record_human_learning_answer") {
      stage = "record_human_learning_answer";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const answerResult = registrarRespostaHumanaAprendizado_(
        body.learning || {},
      );
      return json_({
        ...answerResult,
        ok: answerResult.ok === true,
      });
    }

    if (body.action === "record_bot_knowledge_usage") {
      stage = "record_bot_knowledge_usage";
      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }
      const usageResult = registrarUsoConhecimentoBot_(
        body.usage || {},
      );
      return json_({
        ...usageResult,
        ok: usageResult.ok === true,
      });
    }

    if (
      body.action === "record_external_professional_contact" ||
      body.action === "remove_external_professional_contact"
    ) {
      stage = "record_external_professional_contact";

      if (!lock.tryLock(5000)) {
        return json_({ ok: false, error: "busy_retry" });
      }

      const cleanupResult = registrarContatoProfissionalExterno_(
        body.contact || {},
      );

      return json_({
        ok: cleanupResult.ok === true,
        ...cleanupResult,
      });
    }

    stage = "normalize_lead";
    const lead = normalizeLead_(body.lead || {});
    stage = "open_spreadsheet_context";
    const spreadsheet = SpreadsheetApp.openById(
      CONFIG.spreadsheetId,
    );
    const route = typeof resolverRotaLeadComContexto_ === "function"
      ? resolverRotaLeadComContexto_(spreadsheet, lead)
      : typeof resolverRotaLead_ === "function"
        ? resolverRotaLead_(lead)
      : {
          professional: lead.professional || "unknown",
          routeStatus: lead.professional ? "resolved" : "pending",
          sheetName: lead.professional === "daniel"
            ? CONFIG.danielSheetName
            : lead.professional === "amanda"
              ? CONFIG.sheetName
              : "",
        };
    if (route.opportunityId && !lead.opportunityId) {
      lead.opportunityId = route.opportunityId;
    }
    lead.professional = route.professional;
    lead.routeStatus = route.routeStatus;
    lead.leadSheetName = route.sheetName || "";

    stage = "get_patient_relationship";
    const patientRelationship =
      typeof obterRelacionamentoPaciente_ === "function" &&
      (route.professional === "amanda" || route.professional === "daniel")
        ? obterRelacionamentoPaciente_({
            phone: lead.phone,
            professional: route.professional,
          }, spreadsheet)
        : {
            found: false,
            relationshipState: "unknown",
          };

    stage = "acquire_lock";

    if (!lock.tryLock(5000)) {
      return json_({ ok: false, error: "busy_retry" });
    }

    stage = "open_spreadsheet";

    stage = "event_sheet";
    const eventSheet = getOrCreateEventSheet_(spreadsheet);
    const humanTakeoverToday =
      houveAtendimentoHumanoNoDia_(
        spreadsheet,
        lead.phone,
        lead.contactAt,
      );

    stage = "duplicate_check";
    const processedEvent = findProcessedEvent_(
      eventSheet,
      [lead.messageId, lead.eventId],
    );

    if (
      processedEvent &&
      processedEvent.result === "route_pending" &&
      route.sheetName
    ) {
      stage = "recover_pending_route";
      const recoveredSheet = spreadsheet.getSheetByName(route.sheetName);
      if (!recoveredSheet) {
        throw new Error("Aba de recuperação não encontrada.");
      }
      if (route.professional === "amanda") {
        assertHeaders_(recoveredSheet);
      }
      if (typeof garantirEstruturaIntegradaLead_ === "function") {
        garantirEstruturaIntegradaLead_(recoveredSheet);
      }

      const recoveredLeadResolution =
        typeof resolverLinhaLeadCanonica_ === "function"
          ? resolverLinhaLeadCanonica_(
              recoveredSheet,
              lead.opportunityId,
              lead.phone,
            )
          : { ok: true, row: findLeadRowByPhone_(recoveredSheet, lead.phone) };
      if (resolucaoLeadBloqueiaInsercao_(recoveredLeadResolution)) {
        return json_({
          ok: false,
          inserted: false,
          error: "lead_identity_ambiguous",
          reason: recoveredLeadResolution.reason,
        });
      }
      let recoveredLeadRow = recoveredLeadResolution.ok
        ? recoveredLeadResolution.row
        : null;
      let insertedDuringRecovery = false;
      if (!recoveredLeadRow) {
        recoveredLeadRow = findFirstAvailableRow_(recoveredSheet);
        writeRoutedLead_(
          recoveredSheet,
          recoveredLeadRow,
          lead,
          route.professional,
          function setRecoveryStage(nextStage) {
            stage = nextStage;
          },
        );
        insertedDuringRecovery = true;
      }

      const recoveredOpportunity = garantirOportunidadeLead_(
        spreadsheet,
        lead,
        recoveredSheet,
        recoveredLeadRow,
      );
      lead.opportunityId = recoveredOpportunity.opportunityId;
      lead.leadSheetName = route.sheetName;
      resolvePendingProcessedEvent_(
        eventSheet,
        processedEvent.eventRow,
        recoveredLeadRow,
        lead.opportunityId,
        route.professional,
        route.routeStatus,
      );
      recordLeadMessageAndQueue_(
        spreadsheet,
        recoveredLeadRow,
        lead,
        "IN",
      );

      return json_({
        ok: true,
        inserted: insertedDuringRecovery,
        updated: !insertedDuringRecovery,
        duplicate: true,
        duplicateReason: "route_pending_recovered",
        routed: true,
        row: recoveredLeadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        opportunityId: lead.opportunityId,
        professional: route.professional,
        routeStatus: route.routeStatus,
      });
    }

    if (processedEvent) {
      const duplicateRouted =
        processedEvent.result !== "route_pending" &&
        processedEvent.routeStatus !== "pending";
      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        routed: duplicateRouted,
        row: processedEvent.leadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        opportunityId: processedEvent.opportunityId,
        professional:
          processedEvent.professional || route.professional,
        routeStatus:
          processedEvent.routeStatus || route.routeStatus,
      });
    }

    if (!route.sheetName) {
      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        "",
        route.routeStatus === "pending"
          ? "route_pending"
          : "nonlead",
        "",
        route.professional,
        route.routeStatus,
      );
      if (route.routeStatus === "pending") {
        recordLeadMessageOnly_(spreadsheet, "", lead, "IN");
      }
      return json_({
        ok: true,
        inserted: false,
        updated: false,
        routed: false,
        row: null,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        professional: route.professional,
        routeStatus: route.routeStatus,
      });
    }

    stage = "find_sheet";
    const sheet = spreadsheet.getSheetByName(route.sheetName);

    if (!sheet) {
      throw new Error("Aba configurada não encontrada.");
    }

    stage = "assert_headers";
    if (route.professional === "amanda") assertHeaders_(sheet);
    if (typeof garantirEstruturaIntegradaLead_ === "function") {
      garantirEstruturaIntegradaLead_(sheet);
    }

    const legacyDuplicateRow = route.professional === "amanda"
      ? findExactDuplicateRow_(
          sheet,
          [lead.messageId, lead.eventId],
        )
      : null;

    if (legacyDuplicateRow) {
      stage = "record_event";
      const existingOpportunity = garantirOportunidadeLead_(
        spreadsheet,
        lead,
        sheet,
        legacyDuplicateRow,
      );
      lead.opportunityId = existingOpportunity.opportunityId;
      recordProcessedEvent_(
        eventSheet,
        lead,
        legacyDuplicateRow,
        "message_id_backfill",
        lead.opportunityId,
        route.professional,
        route.routeStatus,
      );

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "message_id",
        row: legacyDuplicateRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        opportunityId: lead.opportunityId,
        professional: route.professional,
        routeStatus: route.routeStatus,
      });
    }

    stage = "phone_identity_check";
    const leadResolution = typeof resolverLinhaLeadCanonica_ === "function"
      ? resolverLinhaLeadCanonica_(
          sheet,
          lead.opportunityId,
          lead.phone,
        )
      : { ok: true, row: findLeadRowByPhone_(sheet, lead.phone) };
    if (resolucaoLeadBloqueiaInsercao_(leadResolution)) {
      return json_({
        ok: false,
        inserted: false,
        error: "lead_identity_ambiguous",
        reason: leadResolution.reason,
      });
    }
    const existingLeadRow = leadResolution.ok ? leadResolution.row : null;

    if (existingLeadRow) {
      if (!isKnownPatientRelationship_(patientRelationship)) {
        stage = "merge_existing_lead";
        mergeRoutedLeadIntoExistingRow_(
          sheet,
          existingLeadRow,
          lead,
          route.professional,
        );
      }

      const existingOpportunity = garantirOportunidadeLead_(
        spreadsheet,
        lead,
        sheet,
        existingLeadRow,
      );
      lead.opportunityId = existingOpportunity.opportunityId;
      lead.leadSheetName = route.sheetName;

      stage = "record_event";
      recordProcessedEvent_(
        eventSheet,
        lead,
        existingLeadRow,
        "phone_identity",
        lead.opportunityId,
        route.professional,
        route.routeStatus,
      );

      stage = "queue_classification";
      // Uma paciente conhecida ainda pode avançar nesta oportunidade.
      // Se já existe uma linha de lead, toda mensagem volta ao classificador.
      recordLeadMessageAndQueue_(
        spreadsheet,
        existingLeadRow,
        lead,
        "IN",
      );

      return json_({
        ok: true,
        inserted: false,
        duplicate: true,
        duplicateReason: "phone_identity",
        updated: true,
        row: existingLeadRow,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        knownPatient: isKnownPatientRelationship_(patientRelationship),
        opportunityId: lead.opportunityId,
        professional: route.professional,
        routeStatus: route.routeStatus,
      });
    }

    if (isKnownPatientRelationship_(patientRelationship)) {
      stage = "known_patient_no_lead";
      recordProcessedEvent_(
        eventSheet,
        lead,
        "",
        "known_patient",
        "",
        route.professional,
        route.routeStatus,
      );
      recordLeadMessageOnly_(spreadsheet, "", lead, "IN");

      return json_({
        ok: true,
        inserted: false,
        duplicate: false,
        duplicateReason: null,
        updated: false,
        row: null,
        eventId: lead.eventId,
        messageId: lead.messageId,
        humanTakeoverToday,
        patientRelationship,
        knownPatient: true,
        professional: route.professional,
        routeStatus: route.routeStatus,
      });
    }

    stage = "find_row";
    const row = findFirstAvailableRow_(sheet);

    writeRoutedLead_(sheet, row, lead, route.professional, function setStage(nextStage) {
      stage = nextStage;
    });

    const opportunity = garantirOportunidadeLead_(
      spreadsheet,
      lead,
      sheet,
      row,
    );
    lead.opportunityId = opportunity.opportunityId;
    lead.leadSheetName = route.sheetName;

    stage = "record_event";
    recordProcessedEvent_(
      eventSheet,
      lead,
      row,
      "inserted",
      lead.opportunityId,
      route.professional,
      route.routeStatus,
    );

    stage = "queue_classification";
    recordLeadMessageAndQueue_(spreadsheet, row, lead, "IN");

    return json_({
      ok: true,
      inserted: true,
      duplicate: false,
      duplicateReason: null,
      row,
      eventId: lead.eventId,
      messageId: lead.messageId,
      humanTakeoverToday,
      patientRelationship,
      opportunityId: lead.opportunityId,
      professional: route.professional,
      routeStatus: route.routeStatus,
    });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);

    const allowedStages = new Set([
      "parse_body",
      "normalize_lead",
      "normalize_appointment",
      "mark_human_takeover",
      "acquire_lock",
      "open_spreadsheet_context",
      "open_spreadsheet",
      "find_sheet",
      "assert_headers",
      "event_sheet",
      "duplicate_check",
      "recover_pending_route",
      "phone_identity_check",
      "merge_existing_lead",
      "known_patient_no_lead",
      "queue_classification",
      "claim_due_classifications",
      "hydrate_classification_jobs",
      "complete_classification",
      "fail_classification",
      "find_row",
      "write_identity",
      "write_contact",
      "write_status",
      "write_primary_consent",
      "write_click_id",
      "write_origin",
      "write_destination",
      "flush",
      "record_event",
      "upsert_appointment",
      "touch_appointment",
      "update_appointment_status",
      "get_available_slots",
      "get_appointment",
      "reserve_appointment_slot",
      "record_pending_appointment_selection",
      "send_review_alert_email",
      "get_bot_knowledge_context",
      "record_bot_unknown_question",
      "record_human_learning_answer",
      "record_bot_knowledge_usage",
      "record_external_professional_contact",
      "archive_nonlead_contact",
      "record_operational_event",
      "record_conversation_turn",
      "get_conversation_context",
      "run_synthetic_health_check",
    ]);

    const safeStage = allowedStages.has(stage) ? stage : "unknown";

    return json_({
      ok: false,
      error: `internal_error_${safeStage}`,
    });
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function registrarContatoProfissionalExterno_(input) {
  const phone = normalizePhone_(input && input.phone);
  if (!phone) {
    return { ok: false, error: "invalid_phone" };
  }

  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const sheetName = "_WHATSAPP_ROTAS_EXTERNAS";
  const headers = [
    "Event ID",
    "Message ID",
    "Telefone",
    "Profissional",
    "Data e hora",
    "Estado",
  ];
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  const eventId = safeText_(input && input.eventId, 200);
  const messageId = safeText_(input && input.messageId, 500);
  const duplicate = sheet.getLastRow() >= 2 && (eventId || messageId)
    ? sheet
        .getRange(2, 1, sheet.getLastRow() - 1, 2)
        .getDisplayValues()
        .some(function sameEvent(row) {
          return (
            (eventId && String(row[0] || "") === eventId) ||
            (messageId && String(row[1] || "") === messageId)
          );
        })
    : false;
  if (!duplicate) {
    sheet.appendRow([
      eventId,
      messageId,
      phone,
      safeText_(input && input.professional, 120) || "Outro profissional",
      new Date(input && input.at || Date.now()),
      "Encaminhar ao humano — sem criar lead",
    ]);
  }

  const archive = input && input.opportunityId
    ? arquivarContatoNaoLead_(spreadsheet, {
        phone: phone,
        opportunityId: input.opportunityId,
        professional: "external",
        reason: safeText_(input && input.professional, 120) ||
          "Outro profissional",
        eventId: eventId,
        at: input && input.at,
      })
    : { archivedLeadRows: 0 };

  return {
    ok: true,
    professional:
      String(input && input.professional || "").trim() ||
      "Dr. Henrique Lane Staniak",
    preserved: true,
    archivedLeadRows: archive.archivedLeadRows,
    created: !duplicate,
    duplicate,
  };
}

function removerContatoProfissionalExterno_(input) {
  return registrarContatoProfissionalExterno_(input);
}

function obterOuCriarArquivoNaoLeads_(spreadsheet) {
  const headers = [
    "Data do arquivamento",
    "Motivo",
    "Profissional detectado",
    "Aba de origem",
    "Linha de origem",
    "Opportunity ID",
    "Telefone (E.164)",
    "Event ID",
    "Dados administrativos originais (JSON)",
  ];
  let sheet = spreadsheet.getSheetByName(CONFIG.nonLeadArchiveSheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.nonLeadArchiveSheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  return sheet;
}

function atualizarLinhasVisiveisAposExclusao_(
  spreadsheet,
  sheetName,
  deletedRow,
) {
  const crm = spreadsheet.getSheetByName("_CRM_OPORTUNIDADES");
  if (!crm || crm.getLastRow() < 2) return;
  const columns = mapaCabecalhosOportunidade_(crm);
  const values = crm
    .getRange(2, 1, crm.getLastRow() - 1, crm.getLastColumn())
    .getDisplayValues();
  values.forEach(function updateVisibleRow(row, index) {
    if (String(row[(columns["Aba visível"] || 0) - 1] || "") !== sheetName) {
      return;
    }
    const currentRow = Number(
      row[(columns["Linha visível"] || 0) - 1] || 0,
    );
    if (currentRow > deletedRow) {
      crm
        .getRange(index + 2, columns["Linha visível"])
        .setValue(currentRow - 1);
    }
  });
}

function arquivarContatoNaoLead_(spreadsheet, input) {
  const phone = normalizePhone_(input && input.phone);
  if (!phone) return { archivedLeadRows: 0 };
  const archive = obterOuCriarArquivoNaoLeads_(spreadsheet);
  const leadSheets = [CONFIG.sheetName, CONFIG.danielSheetName];
  let archivedLeadRows = 0;

  leadSheets.forEach(function archiveFromLeadSheet(sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return;
    const columns = mapaCabecalhosOportunidade_(sheet);
    const phoneColumn = columns["Telefone (E.164)"] || 3;
    const opportunityColumn = columns["Opportunity ID"] || 0;
    const values = sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getDisplayValues();
    for (let index = values.length - 1; index >= 0; index -= 1) {
      const row = values[index];
      if (normalizePhone_(row[phoneColumn - 1]) !== phone) continue;
      const opportunityId = String(
        row[opportunityColumn - 1] || "",
      );
      if (
        input && input.opportunityId &&
        opportunityId !== String(input.opportunityId)
      ) {
        continue;
      }
      archive.appendRow([
        new Date(input && input.at || Date.now()),
        safeText_(input && input.reason, 200),
        safeText_(input && input.professional, 80),
        sheetName,
        index + 2,
        opportunityId,
        phone,
        safeText_(input && input.eventId, 200),
        safeText_(JSON.stringify(row), 20000),
      ]);
      if (opportunityId && typeof encerrarOportunidadeNaoLead_ === "function") {
        if (
          typeof invalidarConversoesGoogleAdsOportunidade_ === "function"
        ) {
          invalidarConversoesGoogleAdsOportunidade_(
            spreadsheet,
            opportunityId,
          );
        }
        encerrarOportunidadeNaoLead_(spreadsheet, {
          opportunityId: opportunityId,
          professional: input && input.professional,
          archiveSheetName: CONFIG.nonLeadArchiveSheetName,
          archiveRow: archive.getLastRow(),
          reason: input && input.reason,
        });
      }
      {
        const queue = spreadsheet.getSheetByName(CONFIG.classificationSheetName);
        if (queue && queue.getLastRow() >= 2) {
          const queueValues = queue
            .getRange(2, 1, queue.getLastRow() - 1, 17)
            .getDisplayValues();
          queueValues.forEach(function excludeQueueRow(queueRow, queueIndex) {
            const matchesOpportunity = opportunityId &&
              String(queueRow[16] || "") === opportunityId;
            const matchesLegacyPhone = !opportunityId &&
              normalizePhone_(queueRow[0]) === phone;
            if (!matchesOpportunity && !matchesLegacyPhone) return;
            queue.getRange(queueIndex + 2, 5, 1, 2).setValues([[
              "excluded",
              "",
            ]]);
            queue.getRange(queueIndex + 2, 14, 1, 3).setValues([[
              "archived_nonlead",
              0,
              "",
            ]]);
            queue.getRange(queueIndex + 2, 18, 1, 2).setValues([[
              safeText_(input && input.professional, 80),
              CONFIG.nonLeadArchiveSheetName,
            ]]);
          });
        }
      }
      const deletedRow = index + 2;
      sheet.deleteRow(deletedRow);
      atualizarLinhasVisiveisAposExclusao_(
        spreadsheet,
        sheetName,
        deletedRow,
      );
      archivedLeadRows += 1;
    }
  });
  return { archivedLeadRows: archivedLeadRows };
}

function removerLinhasPorTelefone_(sheet, phone) {
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const lastColumn = sheet.getLastColumn();
  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    });
  const phoneColumn = headers.findIndex(function (header) {
    return header === "telefone" || header.indexOf("telefone (") === 0;
  });

  if (phoneColumn < 0) return 0;

  const values = sheet
    .getRange(2, phoneColumn + 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues();
  let removed = 0;

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (normalizePhone_(values[index][0]) !== phone) continue;
    sheet.deleteRow(index + 2);
    removed += 1;
  }

  return removed;
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Corpo da solicitação ausente.");
  }

  return JSON.parse(e.postData.contents);
}

function normalizeScheduleText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseScheduleDateTime_(dateValue, timeValue) {
  const dateMatch = String(dateValue || "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = String(timeValue || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})$/);

  if (!dateMatch || !timeMatch) return null;

  const dateTime = new Date(
    Number(dateMatch[3]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[1]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    0,
    0,
  );

  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
}

function findScheduleColumn_(headers, expectedName) {
  const normalizedExpected = normalizeScheduleText_(expectedName);

  for (let index = 0; index < headers.length; index += 1) {
    if (
      normalizeScheduleText_(headers[index]) === normalizedExpected
    ) {
      return index;
    }
  }

  return -1;
}

function getAvailableAppointmentSlots_(input) {
  const professional = normalizeScheduleText_(
    input && input.professional,
  );
  const requestedLimit = Number(input && input.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(100, Math.floor(requestedLimit)))
    : 50;
  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = spreadsheet.getSheetByName(
    CONFIG.appointmentSlotsSheetName,
  );

  if (!sheet) {
    throw new Error("Aba Datas Consulta não encontrada.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.appointmentSlotsHeaderRow) return [];

  const values = sheet.getRange(
    CONFIG.appointmentSlotsHeaderRow,
    1,
    lastRow - CONFIG.appointmentSlotsHeaderRow + 1,
    CONFIG.appointmentSlotsColumns,
  ).getDisplayValues();
  const headers = values[0] || [];
  const columns = {
    date: findScheduleColumn_(headers, "Data"),
    day: findScheduleColumn_(headers, "Dia"),
    time: findScheduleColumn_(headers, "Horário"),
    status: findScheduleColumn_(headers, "Status"),
    professional: findScheduleColumn_(headers, "Profissional"),
  };

  if (Object.keys(columns).some(function missingColumn(key) {
    return columns[key] < 0;
  })) {
    throw new Error("Estrutura inesperada na aba Datas Consulta.");
  }

  const now = new Date();
  const slots = [];
  const expiredRows = [];

  for (let index = 1; index < values.length; index += 1) {
    const row = values[index];
    const status = normalizeScheduleText_(row[columns.status]);
    const rowProfessional = normalizeScheduleText_(
      row[columns.professional],
    );
    const dateTime = parseScheduleDateTime_(
      row[columns.date],
      row[columns.time],
    );

    if (
      status === "disponivel" &&
      dateTime &&
      dateTime.getTime() <= now.getTime()
    ) {
      expiredRows.push(CONFIG.appointmentSlotsHeaderRow + index);
      continue;
    }

    if (status !== "disponivel" || !dateTime) {
      continue;
    }

    if (
      professional &&
      !rowProfessional.includes(professional)
    ) {
      continue;
    }

    let room = "";
    if (
      typeof escolherSalaDisponivelConsulta_ === "function"
    ) {
      const roomSelection = escolherSalaDisponivelConsulta_({
        professional:
          String(row[columns.professional] || "").trim(),
        consultationType: "Consulta presencial",
        location: "Clínica LIV Faria Lima",
        scheduledDate: String(row[columns.date] || "").trim(),
        scheduledTime: String(row[columns.time] || "").trim(),
      });
      if (!roomSelection.ok) continue;
      room = roomSelection.room || "";
    }

    slots.push({
      date: String(row[columns.date] || "").trim(),
      day: String(row[columns.day] || "").trim(),
      time: String(row[columns.time] || "").trim().padStart(5, "0"),
      professional:
        String(row[columns.professional] || "").trim(),
      room,
      timestamp: dateTime.getTime(),
    });
  }

  slots.sort(function chronologicalOrder(left, right) {
    return left.timestamp - right.timestamp;
  });

  expiredRows.forEach(function expirePastSlot(row) {
    sheet.getRange(row, columns.status + 1).setValue("Indisponível");
  });
  if (expiredRows.length) SpreadsheetApp.flush();

  return slots.slice(0, limit).map(function publicSlot(slot) {
    const publicResult = {
      date: slot.date,
      day: slot.day,
      time: slot.time,
      professional: slot.professional,
    };
    if (slot.room) publicResult.room = slot.room;
    return publicResult;
  });
}

function diagnosticarHorariosDisponiveis() {
  const amanda = getAvailableAppointmentSlots_({
    professional: "amanda",
    limit: 50,
  });
  const daniel = getAvailableAppointmentSlots_({
    professional: "daniel",
    limit: 50,
  });
  const result = {
    ok: true,
    amanda: amanda.length,
    daniel: daniel.length,
    primeiraOpcaoAmanda: amanda[0] || null,
    primeiraOpcaoDaniel: daniel[0] || null,
  };

  console.log(JSON.stringify(result));
  return result;
}

function normalizeLead_(input) {
  const eventId = safeText_(input.eventId, 200);
  const messageId = safeText_(input.messageId || eventId, 500);
  const phone = normalizePhone_(input.phone);
  const contactAt = new Date(input.contactAt || Date.now());

  if (!eventId) {
    throw new Error("Event ID ausente.");
  }

  if (!messageId) {
    throw new Error("Message ID ausente.");
  }

  if (!phone) {
    throw new Error("Telefone ausente.");
  }

  if (Number.isNaN(contactAt.getTime())) {
    throw new Error("Data do contato inválida.");
  }

  const allowedPlatforms = new Set([
    "Google",
    "Meta",
    "Orgânico/Conteúdo",
    "WhatsApp direto",
    "Não identificada",
  ]);

  const platform = allowedPlatforms.has(input.platform)
    ? input.platform
    : "Não identificada";

  const allowedReferenceCategories = new Set([
    "meta_coded",
    "meta_ad_id",
    "meta_uncoded",
    "google_coded",
    "google_click_id",
    "site_page",
    "site_cta",
    "site_uncoded",
    "whatsapp_uncoded",
  ]);
  const referenceCategory = allowedReferenceCategories.has(
    String(input.referenceCategory || "").trim(),
  )
    ? String(input.referenceCategory).trim()
    : "unknown";
  const allowedFallbackReasons = new Set([
    "meta_referral_without_mapped_code",
    "meta_ad_id_without_campaign_mapping",
    "google_click_without_campaign_code",
    "site_source_without_campaign_code",
    "direct_or_unknown_without_code",
  ]);
  const attributionFallbackReason = allowedFallbackReasons.has(
    String(input.attributionFallbackReason || "").trim(),
  )
    ? String(input.attributionFallbackReason).trim()
    : "";

  const gclid = safeText_(input.gclid, 500);
  const gbraid = gclid ? "" : safeText_(input.gbraid, 500);
  const wbraid = gclid || gbraid
    ? ""
    : safeText_(input.wbraid, 500);
  const attribution = normalizeAttributionContext_(input.attribution || {});

  return {
    eventId,
    messageId,
    phone,
    contactAt,
    reference: safeText_(
      input.reference || "Não informada",
      200,
    ),
    platform,
    referenceCategory,
    attributionFallbackReason,
    gclid,
    gbraid,
    wbraid,
    professional: safeText_(input.professional, 80),
    opportunityId: safeText_(input.opportunityId, 120),
    name: safeText_(input.name, 120),
    text: safeText_(input.text, 4000),
    templateId:
      String(input.templateId || "").trim().toLowerCase() ===
      "procedure_evaluation_v1"
        ? "procedure_evaluation_v1"
        : "",
    attribution,
  };
}

function normalizeAttributionContext_(input) {
  input = input && typeof input === "object" ? input : {};
  const allowedOrigins = new Set([
    "Google Ads",
    "Meta Ads",
    "Google orgânico",
    "Bing orgânico",
    "ChatGPT",
    "Copilot",
    "Perplexity",
    "Gemini",
    "Instagram orgânico",
    "Indicação",
    "Retorno de paciente",
    "Acesso direto",
    "Desconhecida",
  ]);
  const allowedChannels = new Set([
    "google_ads",
    "meta_ads",
    "organic_search",
    "ai_referral",
    "social_organic",
    "referral",
    "returning_patient",
    "direct",
    "unknown",
  ]);
  const allowedPaths = new Set([
    "meta_whatsapp_direct",
    "meta_site_whatsapp",
    "meta_site_return_whatsapp",
    "google_site_whatsapp",
    "organic_site_whatsapp",
    "ai_site_whatsapp",
    "direct_whatsapp",
    "unknown",
  ]);
  const allowedConfidence = new Set([
    "observed",
    "partial",
    "inferred",
    "unknown",
  ]);
  const allowedReportedOrigins = Object.freeze({
    indicacao: "Indicação",
    instagram: "Instagram",
    google: "Google",
    ia: "IA",
    retorno: "Retorno",
    outro: "Outro",
    "nao sabe": "Não sabe",
  });
  const allowedJourneyStatus = new Set([
    "resolved",
    "not_found",
    "unavailable",
    "absent",
  ]);
  function enumOrFallback(value, allowed, fallback) {
    const normalized = String(value || "").trim();
    return allowed.has(normalized) ? normalized : fallback;
  }
  function code(value) {
    const normalized = String(value || "").trim();
    return /^[A-Za-z0-9_-]{1,80}$/.test(normalized)
      ? normalized
      : "";
  }
  function metaId(value) {
    const normalized = String(value || "").trim();
    return /^\d{5,30}$/.test(normalized) ? normalized : "";
  }
  function pagePath(value) {
    const normalized = String(value || "").trim();
    return /^\/[A-Za-z0-9%\/_~.-]{0,180}$/.test(normalized)
      ? normalized
      : "";
  }
  function isoTimestamp(value) {
    const normalized = String(value || "").trim();
    const timestamp = new Date(normalized).getTime();
    return normalized && !Number.isNaN(timestamp)
      ? new Date(timestamp).toISOString()
      : "";
  }
  function reportedOrigin(value) {
    const normalized = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    return allowedReportedOrigins[normalized] || "";
  }

  const normalizedReportedOrigin = reportedOrigin(input.reportedOrigin);

  return {
    resolved: input.resolved === true,
    journeyStatus: enumOrFallback(
      input.journeyStatus,
      allowedJourneyStatus,
      "absent",
    ),
    initialOrigin: enumOrFallback(
      input.initialOrigin,
      allowedOrigins,
      "Desconhecida",
    ),
    initialChannel: enumOrFallback(
      input.initialChannel,
      allowedChannels,
      "unknown",
    ),
    currentOrigin: enumOrFallback(
      input.currentOrigin,
      allowedOrigins,
      "Desconhecida",
    ),
    currentChannel: enumOrFallback(
      input.currentChannel,
      allowedChannels,
      "unknown",
    ),
    conversionPath: enumOrFallback(
      input.conversionPath,
      allowedPaths,
      "unknown",
    ),
    campaignCode: code(input.initialCampaignCode || input.campaignCode).toUpperCase(),
    adgroupCode: code(input.initialAdgroupCode || input.adgroupCode).toUpperCase(),
    creativeCode: code(input.initialCreativeCode || input.creativeCode).toUpperCase(),
    metaCampaignId: metaId(input.initialMetaCampaignId || input.metaCampaignId),
    metaAdsetId: metaId(input.initialMetaAdsetId || input.metaAdsetId),
    metaAdId: metaId(input.initialMetaAdId || input.metaAdId),
    initialCampaignCode: code(
      input.initialCampaignCode || input.campaignCode,
    ).toUpperCase(),
    initialAdgroupCode: code(
      input.initialAdgroupCode || input.adgroupCode,
    ).toUpperCase(),
    initialCreativeCode: code(
      input.initialCreativeCode || input.creativeCode,
    ).toUpperCase(),
    initialMetaCampaignId: metaId(
      input.initialMetaCampaignId || input.metaCampaignId,
    ),
    initialMetaAdsetId: metaId(
      input.initialMetaAdsetId || input.metaAdsetId,
    ),
    initialMetaAdId: metaId(input.initialMetaAdId || input.metaAdId),
    currentCampaignCode: code(input.currentCampaignCode).toUpperCase(),
    currentAdgroupCode: code(input.currentAdgroupCode).toUpperCase(),
    currentCreativeCode: code(input.currentCreativeCode).toUpperCase(),
    currentMetaCampaignId: metaId(input.currentMetaCampaignId),
    currentMetaAdsetId: metaId(input.currentMetaAdsetId),
    currentMetaAdId: metaId(input.currentMetaAdId),
    landingPage: pagePath(input.landingPage),
    ctaPage: pagePath(input.ctaPage),
    ctaLocation: code(input.ctaLocation).toLowerCase(),
    firstTouchAt: isoTimestamp(input.firstTouchAt),
    lastTouchAt: isoTimestamp(input.lastTouchAt),
    confidence: enumOrFallback(
      input.confidence,
      allowedConfidence,
      "unknown",
    ),
    fallbackReason: code(input.fallbackReason).toLowerCase(),
    reportedOrigin: normalizedReportedOrigin,
    reportedOriginConfidence: normalizedReportedOrigin
      ? "patient_reported"
      : "",
  };
}

function decomporReferenciaAquisicao_(value) {
  const reference = boundedText_(value, 200);
  const result = {
    campaign: "",
    creative: "",
    cta: "",
    reference: reference,
  };
  if (!reference) return result;

  const campaignMatch = reference.match(
    /^(M26[A-Z]\d{2}[A-Z]|G26[A-Z0-9]{2,16})(?:-(.+))?$/i,
  );
  if (campaignMatch) {
    result.campaign = campaignMatch[1].toUpperCase();
    const suffix = String(campaignMatch[2] || "").trim();
    if (!suffix) return result;

    const explicitCreative = suffix.match(
      /^(C\d{2}(?:H\d{2})?)(?:-(.+))?$/i,
    );
    if (explicitCreative) {
      result.creative = explicitCreative[1].toUpperCase();
      result.cta = String(explicitCreative[2] || "").trim();
      return result;
    }

    const explicitCta = suffix.match(/^(.+)-((?:AF|OT)\d{2})$/i);
    if (explicitCta) {
      result.creative = explicitCta[1];
      result.cta = explicitCta[2].toUpperCase();
      return result;
    }

    result.cta = suffix;
    return result;
  }

  const organicMatch = reference.match(/^SITE-(.+)$/i);
  if (organicMatch) result.cta = organicMatch[1];
  return result;
}

function plataformaPorReferenciaAquisicao_(value) {
  const reference = boundedText_(value, 200);
  if (/^M26[A-Z]\d{2}[A-Z](?:-|$)/i.test(reference)) return "Meta";
  if (/^G26[A-Z0-9]{2,16}(?:-|$)/i.test(reference)) return "Google";
  if (/^SITE(?:-|$)/i.test(reference)) return "Orgânico/Conteúdo";
  // Legacy page codes (for example LF01) do not prove a paid source by
  // themselves. Leave the platform unknown instead of borrowing it from a
  // later conversation.
  return "";
}

function normalizePhone_(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function isKnownPatientRelationship_(value) {
  return Boolean(value && value.found === true);
}

function safeText_(value, maximumLength) {
  const text = boundedText_(value, maximumLength);

  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function boundedText_(value, maximumLength) {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
}

function sendReviewAlertEmail_(input) {
  const eventId = boundedText_(input.eventId, 200);

  if (!eventId) {
    throw new Error("Event ID do alerta ausente.");
  }

  const patientName =
    boundedText_(input.patientName, 120) || "Não informado";
  const patientPhone =
    normalizePhone_(input.patientPhone) || "Não informado";
  const messageText =
    boundedText_(input.messageText, 1024) || "Mensagem sem texto.";
  const recipient = CONFIG.reviewAlertEmail;
  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = getOrCreateAlertEmailSheet_(spreadsheet);
  const existingRow = findAlertEmailEvent_(
    sheet,
    eventId,
    recipient,
  );

  if (existingRow) {
    return {
      ok: true,
      sent: false,
      duplicate: true,
    };
  }

  MailApp.sendEmail({
    to: recipient,
    subject: "[Clínica LIV] Alerta para revisão",
    body: [
      "ALERTA DA CLÍNICA LIV",
      "",
      `Paciente: ${patientName}`,
      `WhatsApp: ${patientPhone}`,
      "",
      messageText,
    ].join("\n"),
    name: "Clínica LIV",
  });

  sheet.appendRow([
    safeText_(eventId, 200),
    recipient,
    new Date(),
    safeText_(patientName, 120),
    patientPhone,
  ]);

  return {
    ok: true,
    sent: true,
    duplicate: false,
  };
}

function getOrCreateAlertEmailSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    CONFIG.alertEmailSheetName,
  );

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(CONFIG.alertEmailSheetName);
  sheet.getRange(1, 1, 1, 5).setValues([[
    "Event ID",
    "Destinatário",
    "Data do envio",
    "Paciente",
    "WhatsApp",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function findAlertEmailEvent_(sheet, eventId, recipient) {
  if (sheet.getLastRow() < 2) return null;

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 2)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (
      String(values[index][0] || "").trim() === eventId &&
      String(values[index][1] || "").trim() === recipient
    ) {
      return index + 2;
    }
  }

  return null;
}

function assertHeaders_(sheet) {
  const headers = sheet
    .getRange(1, 1, 1, CONFIG.totalColumns)
    .getDisplayValues()[0];

  for (
    let index = 0;
    index < EXPECTED_HEADERS.length;
    index += 1
  ) {
    if (headers[index] !== EXPECTED_HEADERS[index]) {
      throw new Error(
        `Estrutura inesperada na coluna ${index + 1}: ` +
          `${headers[index]}`,
      );
    }
  }
}

function getOrCreateEventSheet_(spreadsheet) {
  const activeHeaders = cabecalhosEventosWhatsAppAtivos_();
  let sheet = spreadsheet.getSheetByName(CONFIG.eventSheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.eventSheetName);
    sheet.setFrozenRows(1);
    sheet.hideSheet();
  }
  if (sheet.getMaxColumns() < activeHeaders.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      activeHeaders.length - sheet.getMaxColumns(),
    );
  }
  if (typeof garantirCabecalhosAditivos_ === "function") {
    garantirCabecalhosAditivos_(sheet, activeHeaders);
  } else {
    sheet
      .getRange(1, 1, 1, activeHeaders.length)
      .setValues([activeHeaders]);
  }

  return sheet;
}

function getOrCreateHumanTakeoverSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(
    CONFIG.humanTakeoverSheetName,
  );

  if (sheet) return sheet;

  sheet = spreadsheet.insertSheet(
    CONFIG.humanTakeoverSheetName,
  );
  sheet.getRange(1, 1, 1, 6).setValues([[
    "Event ID",
    "Message ID",
    "Telefone",
    "Data e hora",
    "Data local",
    "Mensagem",
  ]]);
  sheet.setFrozenRows(1);
  sheet.hideSheet();

  return sheet;
}

function registrarAtendimentoHumano_(input) {
  const eventId = boundedText_(input.eventId, 200);
  const messageId = boundedText_(
    input.messageId || eventId,
    500,
  );
  const phone = normalizePhone_(input.phone);
  const takenAt = new Date(input.takenAt || Date.now());

  if (!eventId || !messageId || !phone) {
    return { ok: false, error: "invalid_takeover" };
  }
  if (Number.isNaN(takenAt.getTime())) {
    return { ok: false, error: "invalid_takeover_date" };
  }

  const spreadsheet = SpreadsheetApp.openById(
    CONFIG.spreadsheetId,
  );
  const sheet = getOrCreateHumanTakeoverSheet_(spreadsheet);
  const existing = sheet.getLastRow() >= 2
    ? sheet
        .getRange(2, 1, sheet.getLastRow() - 1, 2)
        .getDisplayValues()
        .some(function sameTakeover(row) {
          return (
            String(row[0] || "").trim() === eventId ||
            String(row[1] || "").trim() === messageId
          );
        })
    : false;

  if (existing) {
    return {
      ok: true,
      marked: true,
      created: false,
      duplicate: true,
    };
  }

  sheet.appendRow([
    safeText_(eventId, 200),
    safeText_(messageId, 500),
    phone,
    takenAt,
    Utilities.formatDate(
      takenAt,
      CONFIG.timezone,
      "yyyy-MM-dd",
    ),
    safeText_(input.text, 4000),
  ]);

  const opportunity =
    typeof localizarOportunidadeMaisRecentePorTelefone_ === "function"
      ? localizarOportunidadeMaisRecentePorTelefone_(spreadsheet, phone)
      : null;
  const leadsSheet = opportunity
    ? spreadsheet.getSheetByName(opportunity.sheetName)
    : null;
  const leadRow = opportunity && opportunity.leadRow
    ? opportunity.leadRow
    : leadsSheet
      ? localizarLeadPorOportunidadeOuTelefone_(
          leadsSheet,
          opportunity && opportunity.opportunityId,
          phone,
        )
      : null;

  if (leadRow) {
    recordLeadMessageAndQueue_(
      spreadsheet,
      leadRow,
      {
        phone,
        contactAt: takenAt,
        messageId,
        eventId,
        text: safeText_(input.text, 4000),
        opportunityId: opportunity && opportunity.opportunityId,
        professional: opportunity && opportunity.professional,
        leadSheetName: opportunity && opportunity.sheetName,
        source: "human",
      },
      "OUT",
    );
  }

  if (
    opportunity &&
    opportunity.opportunityId &&
    typeof registrarEventoOperacionalInterno_ === "function" &&
    typeof encontrarUltimoEventoEntradaOportunidade_ === "function"
  ) {
    registrarEventoOperacionalInterno_(spreadsheet, {
      eventId: eventId,
      parentEventId: encontrarUltimoEventoEntradaOportunidade_(
        spreadsheet,
        opportunity.opportunityId,
        takenAt,
      ),
      opportunityId: opportunity.opportunityId,
      type: "human_reply_sent",
      source: "equipe_humana",
      at: takenAt,
      outcome: "recorded",
    });
    registrarEventoOperacionalInterno_(spreadsheet, {
      eventId: eventId + ":pause",
      parentEventId: eventId,
      opportunityId: opportunity.opportunityId,
      type: "automation_paused",
      source: "equipe_humana",
      at: takenAt,
      outcome: "human_takeover",
    });
  }

  return {
    ok: true,
    marked: true,
    created: true,
    duplicate: false,
  };
}

function houveAtendimentoHumanoNoDia_(
  spreadsheet,
  phoneValue,
  referenceDate,
) {
  const phone = normalizePhone_(phoneValue);
  const sheet = spreadsheet.getSheetByName(
    CONFIG.humanTakeoverSheetName,
  );

  if (!phone || !sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const localDate = Utilities.formatDate(
    referenceDate instanceof Date
      ? referenceDate
      : new Date(referenceDate || Date.now()),
    CONFIG.timezone,
    "yyyy-MM-dd",
  );
  const values = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 3)
    .getDisplayValues();

  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (
      normalizePhone_(values[index][0]) === phone &&
      String(values[index][2] || "").trim() === localDate
    ) {
      return true;
    }
  }

  return false;
}

function findProcessedEvent_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length || sheet.getLastRow() < 2) {
    return null;
  }

  const range = sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    2,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (!match) continue;

    const eventValues = sheet
      .getRange(match.getRow(), 5, 1, 5)
      .getDisplayValues()[0];
    const leadRow = Number(eventValues[0]);

    return {
      eventRow: match.getRow(),
      leadRow: Number.isFinite(leadRow) && leadRow > 0
        ? leadRow
        : null,
      result: String(eventValues[1] || ""),
      opportunityId: String(eventValues[2] || ""),
      professional: String(eventValues[3] || ""),
      routeStatus: String(eventValues[4] || ""),
    };
  }

  return null;
}

function recordProcessedEvent_(
  sheet,
  lead,
  leadRow,
  result,
  opportunityId,
  professional,
  routeStatus,
) {
  const processedAt = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm:ss",
  );

  const attribution = lead.attribution || {};
  const values = {
    "Message ID": lead.messageId,
    "Event ID": lead.eventId,
    "Telefone": lead.phone,
    "Data do evento": processedAt,
    "Linha do lead": leadRow,
    "Resultado": result,
    "Opportunity ID": opportunityId || lead.opportunityId || "",
    "Profissional": professional || lead.professional || "unknown",
    "Status de roteamento": routeStatus || lead.routeStatus || "pending",
    "Categoria da referência": lead.referenceCategory || "unknown",
    "Motivo do fallback": lead.attributionFallbackReason || "",
    "Referência de origem": lead.reference || "",
    "Plataforma de aquisição": lead.platform || "Não identificada",
    "Origem inicial canônica": attribution.initialOrigin || "Desconhecida",
    "Canal inicial": attribution.initialChannel || "unknown",
    "Caminho de conversão": attribution.conversionPath || "unknown",
    "Campanha inicial da jornada": attribution.initialCampaignCode ||
      attribution.campaignCode || "",
    "Grupo/conjunto inicial da jornada": attribution.initialAdgroupCode ||
      attribution.adgroupCode || "",
    "Criativo inicial da jornada": attribution.initialCreativeCode ||
      attribution.creativeCode || "",
    "Meta Campaign ID": attribution.metaCampaignId || "",
    "Meta Adset ID": attribution.metaAdsetId || "",
    "Meta Ad ID": attribution.metaAdId || "",
    "Landing page inicial": attribution.landingPage || "",
    "Página do CTA": attribution.ctaPage || "",
    "Local do CTA": attribution.ctaLocation || "",
    "Primeiro toque em": attribution.firstTouchAt || "",
    "Origem da conversa atual": attribution.currentOrigin || "Desconhecida",
    "Canal da conversa atual": attribution.currentChannel || "unknown",
    "Caminho da conversa atual": attribution.conversionPath || "unknown",
    "Campanha da conversa atual": attribution.currentCampaignCode || "",
    "Grupo/conjunto da conversa atual": attribution.currentAdgroupCode || "",
    "Criativo da conversa atual": attribution.currentCreativeCode || "",
    "Meta Campaign ID atual": attribution.currentMetaCampaignId || "",
    "Meta Adset ID atual": attribution.currentMetaAdsetId || "",
    "Meta Ad ID atual": attribution.currentMetaAdId || "",
    "Último toque em": attribution.lastTouchAt || "",
    "Confiança da atribuição": attribution.confidence || "unknown",
    "Motivo do fallback da jornada": attribution.fallbackReason || "",
    "Status da jornada": attribution.journeyStatus || "absent",
    "Origem informada pelo paciente": attribution.reportedOrigin || "",
    "Confiança da origem informada":
      attribution.reportedOriginConfidence || "",
  };
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0]
    .map(function trimHeader(value) { return String(value || "").trim(); });
  const activeHeaders = new Set(cabecalhosEventosWhatsAppAtivos_());
  sheet.appendRow(headers.map(function mapEventValue(header) {
    return activeHeaders.has(header) &&
      Object.prototype.hasOwnProperty.call(values, header)
      ? values[header]
      : "";
  }));
}

function resolvePendingProcessedEvent_(
  sheet,
  eventRow,
  leadRow,
  opportunityId,
  professional,
  routeStatus,
) {
  if (!sheet || !eventRow) return;
  sheet.getRange(eventRow, 5, 1, 5).setValues([[
    leadRow || "",
    "route_recovered",
    opportunityId || "",
    professional || "unknown",
    routeStatus || "resolved",
  ]]);
}

function findExactDuplicateRow_(sheet, identifiers) {
  const uniqueIdentifiers = Array.from(
    new Set(
      identifiers
        .map(function normalizeIdentifier(value) {
          return String(value || "").trim();
        })
        .filter(Boolean),
    ),
  );

  if (!uniqueIdentifiers.length) return null;

  const range = sheet.getRange(
    2,
    15,
    Math.max(sheet.getMaxRows() - 1, 1),
    1,
  );

  for (let index = 0; index < uniqueIdentifiers.length; index += 1) {
    const match = range
      .createTextFinder(uniqueIdentifiers[index])
      .matchEntireCell(true)
      .findNext();

    if (match) return match.getRow();
  }

  return null;
}

function resolucaoLeadBloqueiaInsercao_(resolution) {
  if (!resolution || resolution.ok) return false;
  return ![
    "lead_sheet_empty",
    "phone_not_found",
  ].includes(String(resolution.reason || ""));
}

function findLeadRowByPhone_(sheet, phone) {
  const lastRow = Math.max(sheet.getLastRow(), 2);

  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues();

  const normalizedPhone = normalizePhone_(phone);
  for (let index = 0; index < values.length; index += 1) {
    const rowPhone = normalizePhone_(values[index][0]);

    if (rowPhone && rowPhone === normalizedPhone) return index + 2;
  }

  return null;
}

function findRecentLeadRow_(sheet, phone) {
  return findLeadRowByPhone_(sheet, phone);
}

function mergeLeadIntoExistingRow_(sheet, row, lead) {
  const values = sheet.getRange(row, 1, 1, CONFIG.totalColumns).getDisplayValues()[0];
  const frozenReference = String(values[24] || values[1] || "").trim();
  const sourceReference = frozenReference || String(lead.reference || "").trim();
  const attribution = decomporReferenciaAquisicao_(sourceReference);

  // Fill each missing first-touch field independently. A later conversation
  // never rewrites any non-empty acquisition field in the legacy 25 columns.
  if (!String(values[1] || "").trim() && sourceReference) {
    sheet.getRange(row, 2).setValue(sourceReference);
  }
  if (!String(values[19] || "").trim()) {
    const platformFromFrozenReference = frozenReference
      ? plataformaPorReferenciaAquisicao_(frozenReference)
      : "";
    const safePlatform = platformFromFrozenReference || (
      !frozenReference ? String(lead.platform || "").trim() : ""
    );
    if (safePlatform) sheet.getRange(row, 20).setValue(safePlatform);
  }
  if (!String(values[20] || "").trim() && attribution.campaign) {
    sheet.getRange(row, 21).setValue(attribution.campaign);
  }
  if (!String(values[21] || "").trim() && attribution.creative) {
    sheet.getRange(row, 22).setValue(attribution.creative);
  }
  if (!String(values[22] || "").trim() && attribution.cta) {
    sheet.getRange(row, 23).setValue(attribution.cta);
  }
  if (!String(values[23] || "").trim()) {
    sheet.getRange(row, 24).setValue("WhatsApp");
  }
  if (!String(values[24] || "").trim() && sourceReference) {
    sheet.getRange(row, 25).setValue(sourceReference);
  }

  if (!values[10] && !values[11] && !values[12]) {
    if (lead.gclid) sheet.getRange(row, 11).setValue(lead.gclid);
    else if (lead.gbraid) sheet.getRange(row, 12).setValue(lead.gbraid);
    else if (lead.wbraid) sheet.getRange(row, 13).setValue(lead.wbraid);
  }

  SpreadsheetApp.flush();
}

function mergeRoutedLeadIntoExistingRow_(
  sheet,
  row,
  lead,
  professional,
) {
  if (professional === "amanda") {
    return mergeLeadIntoExistingRow_(sheet, row, lead);
  }

  const columns = mapaCabecalhosOportunidade_(sheet);
  const writes = [
    ["Nome", lead.name],
    ["Última mensagem", lead.text],
    ["Atualizado em", lead.contactAt],
  ];
  writes.forEach(function writeIfPresent(entry) {
    if (columns[entry[0]] && entry[1]) {
      sheet.getRange(row, columns[entry[0]]).setValue(entry[1]);
    }
  });
  SpreadsheetApp.flush();
}

function parseSheetContactDate_(value) {
  const text = String(value || "").trim();
  const match = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/,
  );

  if (!match) return null;

  const date = new Date(
    Number(match[3]),
    Number(match[2]) - 1,
    Number(match[1]),
    Number(match[4] || 0),
    Number(match[5] || 0),
    0,
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function findFirstAvailableRow_(sheet) {
  const maximumRows = sheet.getMaxRows();
  const values = sheet
    .getRange(2, 1, maximumRows - 1, 1)
    .getDisplayValues();

  for (let index = 0; index < values.length; index += 1) {
    if (!String(values[index][0] || "").trim()) {
      return index + 2;
    }
  }

  sheet.insertRowsAfter(maximumRows, 100);
  return maximumRows + 1;
}

function writeLead_(sheet, row, lead, setStage) {
  const contactDateTime = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm",
  );

  const statusDate = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy",
  );

  // Message/event deduplication lives in the processed-events ledger.
  // Column 15 is reserved exclusively for the opaque Google Ads
  // transaction ID and must stay empty until a qualified milestone exists.
  setStage("write_identity");
  sheet.getRange(row, 16, 1, 2).setValues([[
    "BRL",
    "Contato inicial recebido automaticamente pelo WhatsApp.",
  ]]);

  setStage("write_contact");
  sheet.getRange(row, 1, 1, 3).setValues([[
    contactDateTime,
    lead.reference,
    lead.phone,
  ]]);

  setStage("write_status");
  sheet.getRange(row, 5, 1, 3).setValues([[
    "Novo",
    statusDate,
    "Não",
  ]]);

  setStage("write_primary_consent");
  sheet.getRange(row, 10).setValue("Não informado");

  setStage("write_click_id");

  if (lead.gclid) {
    sheet.getRange(row, 11).setValue(lead.gclid);
  } else if (lead.gbraid) {
    sheet.getRange(row, 12).setValue(lead.gbraid);
  } else if (lead.wbraid) {
    sheet.getRange(row, 13).setValue(lead.wbraid);
  }

  setStage("write_origin");
  sheet.getRange(row, 19, 1, 2).setValues([[
    "WHATSAPP",
    lead.platform,
  ]]);

  setStage("write_destination");
  const attribution = decomporReferenciaAquisicao_(lead.reference);
  sheet.getRange(row, 21, 1, 5).setValues([[
    attribution.campaign,
    attribution.creative,
    attribution.cta,
    "WhatsApp",
    attribution.reference,
  ]]);

  setStage("flush");
  SpreadsheetApp.flush();
}

function writeDanielLead_(sheet, row, lead, setStage) {
  const columns = mapaCabecalhosOportunidade_(sheet);
  const contactDateTime = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy HH:mm",
  );
  const statusDate = Utilities.formatDate(
    lead.contactAt,
    CONFIG.timezone,
    "dd/MM/yyyy",
  );
  const values = {
    "Data do contato": contactDateTime,
    "Telefone (E.164)": lead.phone,
    "Nome": lead.name,
    "Última mensagem": lead.text,
    "Situação do lead": "Novo",
    "Data da situação": statusDate,
    "Referência de origem": lead.reference,
    "Origem": lead.platform,
    "Atualizado em": lead.contactAt,
  };
  setStage("write_contact");
  Object.keys(values).forEach(function writeValue(header) {
    const column = columns[header];
    if (!column || values[header] === "") return;
    sheet.getRange(row, column).setValue(values[header]);
  });
  setStage("flush");
  SpreadsheetApp.flush();
}

function writeRoutedLead_(sheet, row, lead, professional, setStage) {
  if (professional === "daniel") {
    return writeDanielLead_(sheet, row, lead, setStage);
  }
  return writeLead_(sheet, row, lead, setStage);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
