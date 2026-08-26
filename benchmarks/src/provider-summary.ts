export type ProviderSummary = {
  readonly event?: string | null;
  readonly requestType?: string | null;
  readonly deploymentStatus?: string | null;
  readonly extract?: boolean | null;
  readonly deleteStaleObjectsOnDeployment?: boolean | null;
  readonly availableMemoryMb?: number | null;
  readonly maxParallelTransfers?: number | null;
  readonly detailedFailureDiagnosticsEnabled?: boolean | null;
  readonly durationMs?: number | null;
  readonly phaseMs?: Record<string, number | null> | null;
  readonly counts?: Record<string, number | null> | null;
  readonly bytes?: Record<string, number | null> | null;
  readonly transfer?: Record<string, number | null> | null;
  readonly markerReplacement?: Record<string, string | number | null> | null;
  readonly catalog?: Record<string, number | null> | null;
  readonly source?: Record<string, number | null> | null;
  readonly putObject?: ProviderPutObjectSummary | null;
  readonly copyObject?: Record<string, number | null> | null;
  readonly deleteObject?: Record<string, number | null> | null;
  readonly callback?: Record<string, number | null> | null;
};

export type DiagnosticRange = {
  readonly min: number;
  readonly max: number;
  readonly total: number;
};

export type PutObjectFailureBody = {
  readonly attemptObserved: boolean;
  readonly replay: boolean;
  readonly producerStage: string;
  readonly finalFrameDelivered: boolean;
  readonly producerCompleted: boolean;
  readonly bodyErrorObserved: boolean;
  readonly receiverDropped: boolean;
  readonly receiverDropAbortedProducer: boolean;
  readonly attemptNumber: DiagnosticRange;
  readonly bytesEmitted: DiagnosticRange;
  readonly remainingBytes: DiagnosticRange;
};

export type PutObjectFailureSource = {
  readonly observed: boolean;
  readonly localWindowBytes: DiagnosticRange;
  readonly localCommittedBytes: DiagnosticRange;
  readonly localResidentBytes: DiagnosticRange;
  readonly localCapacityWaiters: DiagnosticRange;
  readonly globalBudgetBytes: DiagnosticRange;
  readonly globalResidentBytes: DiagnosticRange;
  readonly globalAvailablePermits: DiagnosticRange;
  readonly globalPermitUnitBytes: DiagnosticRange;
  readonly globalPermitWaiters: DiagnosticRange;
  readonly activeFetches: DiagnosticRange;
};

export type PutObjectFailureState = {
  readonly count: number;
  readonly sdkErrorKind: string;
  readonly dispatchFailureKind: string | null;
  readonly serviceCode: string | null;
  readonly elapsedMs: DiagnosticRange;
  readonly body: PutObjectFailureBody;
  readonly source: PutObjectFailureSource;
};

export type ProviderPutObjectSummary = Record<string, unknown> & {
  readonly wireAttempts?: number | null;
  readonly failedAttempts?: number | null;
  readonly retryAttempts?: number | null;
  readonly throttledAttempts?: number | null;
  readonly retryWaitMs?: number | null;
  readonly throttleCooldownWaits?: number | null;
  readonly throttleCooldownWaitMs?: number | null;
  readonly failuresBySdkErrorKind?: Record<string, number>;
  readonly failuresByServiceCode?: Record<string, number>;
  readonly failureStates?: PutObjectFailureState[];
  readonly failureStateOverflowAttempts?: number;
};

const PROVIDER_SUMMARY_SCALARS = {
  event: "string",
  requestType: "string",
  deploymentStatus: "string",
  extract: "boolean",
  deleteStaleObjectsOnDeployment: "boolean",
  availableMemoryMb: "number",
  maxParallelTransfers: "number",
  detailedFailureDiagnosticsEnabled: "boolean",
  durationMs: "number",
} as const;

const PROVIDER_SUMMARY_SECTIONS = {
  phaseMs: {
    plan: "number",
    planSourceHeads: "number",
    planCatalog: "number",
    planDirectory: "number",
    planEntries: "number",
    planValidation: "number",
    destinationList: "number",
    transfer: "number",
    transferTaskTotal: "number",
    transferPrepare: "number",
    transferPutWait: "number",
    transferPrepareSourceWait: "number",
    transferPutSourceWait: "number",
    delete: "number",
    cloudfront: "number",
    oldPrefixDelete: "number",
    callback: "number",
  },
  counts: {
    sourceArchives: "number",
    plannedEntries: "number",
    filteredEntries: "number",
    markerEntries: "number",
    destinationObjects: "number",
    destinationMetadataRetained: "number",
    destinationPageObjectsHighWater: "number",
    deleteObjects: "number",
    deleteBatches: "number",
    uploadedObjects: "number",
    skippedObjects: "number",
    conditionalConflicts: "number",
    copiedObjects: "number",
    md5HashAttempts: "number",
    md5Skips: "number",
    catalogSkips: "number",
  },
  bytes: {
    sourceZip: "number",
    uploaded: "number",
    copied: "number",
  },
  transfer: {
    scheduledObjects: "number",
    completedObjects: "number",
    failedObjects: "number",
    cancelledObjects: "number",
    panickedObjects: "number",
    inFlightHighWater: "number",
  },
  markerReplacement: {
    strategy: "string",
    semantics: "string",
    plannedPassesPerUpload: "number",
    planningPasses: "number",
    uploadPasses: "number",
    spooledUploads: "number",
  },
  catalog: {
    trustedArchives: "number",
    untrustedArchives: "number",
    trustedEntries: "number",
    fallbackHashAttempts: "number",
    sparseSkips: "number",
  },
  source: {
    plannedBlocks: "number",
    plannedBytes: "number",
    fetchedBlocks: "number",
    fetchedBytes: "number",
    getAttempts: "number",
    getRetries: "number",
    getThrottledAttempts: "number",
    getRetryableErrors: "number",
    getPermanentErrors: "number",
    getRequestErrors: "number",
    getBodyErrors: "number",
    getShortBodyErrors: "number",
    getErrors: "number",
    blockHits: "number",
    blockMisses: "number",
    blockRefetches: "number",
    blockWaits: "number",
    blockWaitsFetching: "number",
    blockWaitsCapacity: "number",
    replayClaims: "number",
    replayClaimsAfterRelease: "number",
    replayClaimsAfterFailure: "number",
    bodyAttempts: "number",
    bodyReplays: "number",
    activeGetsHighWater: "number",
    activeReadersHighWater: "number",
    residentBytesHighWater: "number",
    globalBudgetBytes: "number",
    globalResidentBytesCurrent: "number",
    globalResidentBytesHighWater: "number",
    globalReleaseAnomalies: "number",
  },
  putObject: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    throttledAttempts: "number",
    retryWaitMs: "number",
    throttleCooldownWaits: "number",
    throttleCooldownWaitMs: "number",
  },
  deleteObject: {
    sdkCalls: "number",
    failedCalls: "number",
    requestedObjects: "number",
    inferredDeletedObjects: "number",
    unconfirmedObjects: "number",
    noSuchBucketRequestedIdentifiers: "number",
    retryAttempts: "number",
    throttledAttempts: "number",
    throttleCooldownWaits: "number",
    throttleCooldownWaitMs: "number",
  },
  callback: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    confirmedResponses: "number",
  },
} as const;

/**
 * The `copyObject` section carries the CopyObject retry and throttle counters that
 * direct-copy (`extract:false`) deployments produce. It is validated by its own stage
 * rather than through `PROVIDER_SUMMARY_SECTIONS`, which drives the base shape loop.
 */
const PROVIDER_SUMMARY_COPY_SECTIONS = {
  copyObject: {
    wireAttempts: "number",
    failedAttempts: "number",
    retryAttempts: "number",
    throttledAttempts: "number",
    retryWaitMs: "number",
    throttleCooldownWaits: "number",
    throttleCooldownWaitMs: "number",
  },
} as const;

const PROVIDER_SUMMARY_ALL_SECTIONS = {
  ...PROVIDER_SUMMARY_SECTIONS,
  ...PROVIDER_SUMMARY_COPY_SECTIONS,
} as const;

const PROVIDER_SUMMARY_FIELDS = new Set([
  ...Object.keys(PROVIDER_SUMMARY_SCALARS),
  ...Object.keys(PROVIDER_SUMMARY_ALL_SECTIONS),
]);
const MAX_FAILURE_DIAGNOSTIC_LABELS = 32;
const MAX_FAILURE_DIAGNOSTIC_GROUPS = 32;
const DIAGNOSTIC_LABEL = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const SDK_ERROR_KINDS = new Set([
  "ConstructionFailure",
  "TimeoutError",
  "DispatchFailure",
  "ResponseError",
  "ServiceError",
  "SdkError",
]);
const DISPATCH_FAILURE_KINDS = new Set(["timeout", "io", "user", "other"]);
const PRODUCER_STAGES = new Set([
  "awaiting-first-poll",
  "reading-source",
  "final-frame-ready",
  "complete",
  "receiver-closed",
  "body-error",
  "not-observed",
]);

export function sanitizeProviderSummary(value: unknown): ProviderSummary {
  if (!isObject(value)) throw new Error("Provider summary must be an object.");
  for (const name of Object.keys(value)) {
    if (!PROVIDER_SUMMARY_FIELDS.has(name)) {
      throw new Error(`Provider summary contains unexpected field ${name}.`);
    }
  }

  const sanitized: Record<string, unknown> = {};
  for (const [name, kind] of Object.entries(PROVIDER_SUMMARY_SCALARS)) {
    if (!Object.hasOwn(value, name)) continue;
    sanitized[name] = sanitizedValue(value[name], kind, `providerSummary.${name}`);
  }
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_ALL_SECTIONS)) {
    if (!Object.hasOwn(value, sectionName)) continue;
    const section = value[sectionName];
    if (section === null) {
      sanitized[sectionName] = null;
      continue;
    }
    if (!isObject(section)) throw new Error(`providerSummary.${sectionName} must be an object.`);
    const allowed = new Set(Object.keys(fields));
    if (sectionName === "putObject") {
      for (const name of [
        "failuresBySdkErrorKind",
        "failuresByServiceCode",
        "failureStates",
        "failureStateOverflowAttempts",
      ]) {
        allowed.add(name);
      }
    }
    for (const name of Object.keys(section)) {
      if (!allowed.has(name)) {
        throw new Error(`providerSummary.${sectionName} contains unexpected field ${name}.`);
      }
    }
    const sanitizedSection = Object.fromEntries(
      Object.entries(fields)
        .filter(([name]) => Object.hasOwn(section, name))
        .map(([name, kind]) => [
          name,
          sanitizedValue(section[name], kind, `providerSummary.${sectionName}.${name}`),
        ]),
    ) as Record<string, unknown>;
    if (sectionName === "putObject") {
      sanitizedSection.failuresBySdkErrorKind = sanitizeDiagnosticCountMap(
        section.failuresBySdkErrorKind,
        "providerSummary.putObject.failuresBySdkErrorKind",
        SDK_ERROR_KINDS,
      );
      sanitizedSection.failuresByServiceCode = sanitizeDiagnosticCountMap(
        section.failuresByServiceCode,
        "providerSummary.putObject.failuresByServiceCode",
      );
      sanitizedSection.failureStates = sanitizeFailureStates(
        section.failureStates,
        "providerSummary.putObject.failureStates",
      );
      sanitizedSection.failureStateOverflowAttempts = requiredNonnegativeInteger(
        section.failureStateOverflowAttempts,
        "providerSummary.putObject.failureStateOverflowAttempts",
      );
    }
    sanitized[sectionName] = sanitizedSection;
  }
  return sanitized as ProviderSummary;
}

/**
 * Validates a provider summary against the current diagnostics contract. Validation runs
 * in three stages -- copy section, detailed PutObject invariants, then the base shape --
 * which is a factoring of one schema, not support for older ones.
 */
export function providerSummaryErrors(summary: ProviderSummary): string[] {
  return summaryCopyErrors(summary);
}

function summaryCopyErrors(summary: ProviderSummary): string[] {
  const errors: string[] = [];
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
  const copyObject = summary.copyObject;
  if (!isObject(copyObject)) {
    errors.push("summary section copyObject must be an object");
  } else {
    const fields = PROVIDER_SUMMARY_COPY_SECTIONS.copyObject;
    for (const name of Object.keys(fields)) {
      if (!Object.hasOwn(copyObject, name)) {
        errors.push(`summary is missing copyObject.${name}`);
      } else if (copyObject[name] === null) {
        errors.push(`summary field copyObject.${name} must not be null`);
      } else if (typeof copyObject[name] !== "number" || !Number.isSafeInteger(copyObject[name])) {
        // Safe integers, matching the scalar and section checks. Plain
        // `Number.isInteger` would accept values above 2^53 that have already lost
        // precision in JSON, letting lossy counters into committed evidence.
        errors.push(`summary field copyObject.${name} must be a safe integer`);
      }
    }
    for (const name of Object.keys(copyObject)) {
      if (!Object.hasOwn(fields, name)) {
        errors.push(`summary contains unexpected field copyObject.${name}`);
      }
    }

    // The same internal consistency required of `putObject`.
    // Without these the collector accepts impossible copy telemetry.
    const counter = (name: string): number => {
      const value = copyObject[name];
      return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
    };
    if (counter("failedAttempts") > counter("wireAttempts")) {
      errors.push("summary CopyObject failedAttempts exceeds wireAttempts");
    }
    if (counter("retryAttempts") > counter("wireAttempts")) {
      errors.push("summary CopyObject retryAttempts exceeds wireAttempts");
    }
    if (counter("throttledAttempts") > counter("failedAttempts")) {
      errors.push("summary CopyObject throttledAttempts exceeds failedAttempts");
    }
  }

  errors.push(...summaryShapeErrors(summary));
  return errors;
}

function summaryShapeErrors(summary: ProviderSummary): string[] {
  const errors: string[] = [];
  try {
    sanitizeProviderSummary(summary);
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }

  const expectedTopLevel = new Set([
    ...Object.keys(PROVIDER_SUMMARY_SCALARS),
    ...Object.keys(PROVIDER_SUMMARY_SECTIONS),
  ]);
  for (const name of Object.keys(summary)) {
    if (!expectedTopLevel.has(name) && name !== "copyObject") {
      errors.push(`summary contains unexpected field ${name}`);
    }
  }
  for (const name of expectedTopLevel) {
    if (!Object.hasOwn(summary, name)) errors.push(`summary is missing ${name}`);
    else if (summary[name as keyof ProviderSummary] === null) {
      errors.push(`summary field ${name} must not be null`);
    }
  }

  if (summary.event !== "shin_deployment_summary") errors.push("summary event is invalid");
  if (!(["Create", "Update", "Delete"] as const).includes(summary.requestType as never))
    errors.push("summary requestType is invalid");
  if (summary.deploymentStatus !== "success")
    errors.push("summary deploymentStatus must be success");
  if (typeof summary.detailedFailureDiagnosticsEnabled !== "boolean")
    errors.push("summary detailedFailureDiagnosticsEnabled must be boolean");
  if (summary.availableMemoryMb === null || (summary.availableMemoryMb ?? 0) <= 0)
    errors.push("summary availableMemoryMb must be positive");
  if (summary.maxParallelTransfers === null || (summary.maxParallelTransfers ?? 0) <= 0)
    errors.push("summary maxParallelTransfers must be positive");
  if (summary.markerReplacement?.strategy !== "planning-plus-retryable-stream")
    errors.push("summary markerReplacement.strategy is invalid");
  if (summary.markerReplacement?.semantics !== "leftmost-longest-non-recursive")
    errors.push("summary markerReplacement.semantics is invalid");
  if (summary.markerReplacement?.plannedPassesPerUpload !== 2)
    errors.push("summary markerReplacement.plannedPassesPerUpload must be 2");

  for (const [name, kind] of Object.entries(PROVIDER_SUMMARY_SCALARS)) {
    const value = summary[name as keyof ProviderSummary];
    if (kind === "number" && typeof value === "number" && !Number.isSafeInteger(value)) {
      errors.push(`summary field ${name} must be a safe integer`);
    }
  }
  for (const [sectionName, fields] of Object.entries(PROVIDER_SUMMARY_SECTIONS)) {
    const section = summary[sectionName as keyof ProviderSummary];
    if (!isObject(section)) {
      errors.push(`summary section ${sectionName} must be an object`);
      continue;
    }
    for (const name of Object.keys(fields)) {
      if (!Object.hasOwn(section, name)) {
        errors.push(`summary is missing ${sectionName}.${name}`);
      } else if (section[name] === null) {
        errors.push(`summary field ${sectionName}.${name} must not be null`);
      } else if (typeof section[name] === "number" && !Number.isSafeInteger(section[name])) {
        errors.push(`summary field ${sectionName}.${name} must be a safe integer`);
      }
    }
  }

  // Both values are legitimate: `copy-archives` deploys with `extract:false`. The record
  // level cross-checks the value against the profile, which the summary alone cannot.
  if (typeof summary.extract !== "boolean") errors.push("summary extract must be boolean");
  if (summary.deleteStaleObjectsOnDeployment !== true)
    errors.push("summary deleteStaleObjectsOnDeployment must be true");
  if (summary.transfer?.failedObjects !== 0)
    errors.push("summary transfer failedObjects must be zero");
  if (summary.transfer?.cancelledObjects !== 0)
    errors.push("summary transfer cancelledObjects must be zero");
  if (summary.transfer?.panickedObjects !== 0)
    errors.push("summary transfer panickedObjects must be zero");
  if (summary.transfer?.scheduledObjects !== summary.transfer?.completedObjects)
    errors.push("summary transfer scheduledObjects must equal completedObjects");
  if ((summary.transfer?.inFlightHighWater ?? 0) > (summary.maxParallelTransfers ?? 0))
    errors.push("summary transfer inFlightHighWater exceeds maxParallelTransfers");
  if (summary.source?.globalResidentBytesCurrent !== 0)
    errors.push("summary source globalResidentBytesCurrent must be zero");
  if (summary.source?.globalReleaseAnomalies !== 0)
    errors.push("summary source globalReleaseAnomalies must be zero");

  const put = isObject(summary.putObject) ? summary.putObject : {};
  const states = Array.isArray(put.failureStates) ? put.failureStates : [];
  const represented = states.reduce(
    (total, state) => total + safeNonnegativeBigInt(state.count),
    0n,
  );
  const overflow = safeNonnegativeBigInt(put.failureStateOverflowAttempts);
  const failed = safeNonnegativeBigInt(put.failedAttempts);
  const sdkCount = Object.values(put.failuresBySdkErrorKind ?? {}).reduce(
    (total, count) => total + safeNonnegativeBigInt(count),
    0n,
  );
  const serviceCount = Object.values(put.failuresByServiceCode ?? {}).reduce(
    (total, count) => total + safeNonnegativeBigInt(count),
    0n,
  );
  if (summary.detailedFailureDiagnosticsEnabled === true) {
    if (represented + overflow !== failed)
      errors.push("summary PutObject failure-state counts plus overflow must equal failedAttempts");
    if (sdkCount !== failed)
      errors.push("summary PutObject SDK-kind counts must equal failedAttempts");
    if (serviceCount > failed)
      errors.push("summary PutObject service-code counts exceed failedAttempts");
  } else if (sdkCount !== 0n || serviceCount !== 0n || states.length !== 0 || overflow !== 0n) {
    errors.push("summary disabled detailed failure diagnostics must be empty");
  }
  if (safeNonnegativeBigInt(put.failedAttempts) > safeNonnegativeBigInt(put.wireAttempts))
    errors.push("summary PutObject failedAttempts exceeds wireAttempts");
  if (safeNonnegativeBigInt(put.retryAttempts) > safeNonnegativeBigInt(put.wireAttempts))
    errors.push("summary PutObject retryAttempts exceeds wireAttempts");
  if (safeNonnegativeBigInt(put.throttledAttempts) > failed)
    errors.push("summary PutObject throttledAttempts exceeds failedAttempts");

  if ((summary.deleteObject?.failedCalls ?? 0) > (summary.deleteObject?.sdkCalls ?? 0))
    errors.push("summary DeleteObjects failedCalls exceeds sdkCalls");
  if ((summary.deleteObject?.retryAttempts ?? 0) > (summary.deleteObject?.sdkCalls ?? 0))
    errors.push("summary DeleteObjects retryAttempts exceeds sdkCalls");
  if ((summary.deleteObject?.throttledAttempts ?? 0) > (summary.deleteObject?.retryAttempts ?? 0))
    errors.push("summary DeleteObjects throttledAttempts exceeds retryAttempts");
  if (
    (summary.deleteObject?.throttleCooldownWaits ?? 0) >
    (summary.deleteObject?.throttledAttempts ?? 0)
  ) {
    errors.push("summary DeleteObjects throttleCooldownWaits exceeds throttledAttempts");
  }
  if (
    (summary.deleteObject?.inferredDeletedObjects ?? 0) +
      (summary.deleteObject?.unconfirmedObjects ?? 0) +
      (summary.deleteObject?.noSuchBucketRequestedIdentifiers ?? 0) !==
    summary.deleteObject?.requestedObjects
  ) {
    errors.push("summary DeleteObjects outcomes do not equal requestedObjects");
  }
  if (summary.callback?.confirmedResponses !== 1)
    errors.push("summary callback confirmedResponses must be one");
  if ((summary.callback?.wireAttempts ?? 0) < 1)
    errors.push("summary callback wireAttempts must be positive");
  if (
    (summary.callback?.failedAttempts ?? 0) + (summary.callback?.confirmedResponses ?? 0) !==
    summary.callback?.wireAttempts
  ) {
    errors.push("summary callback outcomes do not equal wireAttempts");
  }
  if (summary.callback?.retryAttempts !== (summary.callback?.wireAttempts ?? 0) - 1)
    errors.push("summary callback retryAttempts must equal wireAttempts minus one");
  return errors;
}

function sanitizedValue(
  value: unknown,
  kind: "boolean" | "number" | "string",
  path: string,
): boolean | number | string | null {
  if (value === null) return null;
  if (typeof value !== kind || (kind === "number" && !Number.isFinite(value))) {
    throw new Error(`${path} must be ${kind} or null.`);
  }
  if (typeof value === "number" && value < 0) throw new Error(`${path} must not be negative.`);
  return value as boolean | number | string;
}

function sanitizeDiagnosticCountMap(
  value: unknown,
  path: string,
  allowedLabels?: ReadonlySet<string>,
): Record<string, number> {
  if (!isObject(value)) throw new Error(`${path} must be an object.`);
  const entries = Object.entries(value);
  if (entries.length > MAX_FAILURE_DIAGNOSTIC_LABELS) {
    throw new Error(`${path} exceeds ${MAX_FAILURE_DIAGNOSTIC_LABELS} labels.`);
  }
  return Object.fromEntries(
    entries.map(([label, count]) => {
      if (
        !DIAGNOSTIC_LABEL.test(label) ||
        (allowedLabels !== undefined && label !== "Other" && !allowedLabels.has(label))
      ) {
        throw new Error(`${path} contains an invalid label.`);
      }
      return [label, requiredNonnegativeInteger(count, `${path}.${label}`)];
    }),
  );
}

function sanitizeFailureStates(value: unknown, path: string): PutObjectFailureState[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array.`);
  if (value.length > MAX_FAILURE_DIAGNOSTIC_GROUPS) {
    throw new Error(`${path} exceeds ${MAX_FAILURE_DIAGNOSTIC_GROUPS} groups.`);
  }
  return value.map((failure, index) => sanitizeFailureState(failure, `${path}[${index}]`));
}

function sanitizeFailureState(value: unknown, path: string): PutObjectFailureState {
  const fields = [
    "count",
    "sdkErrorKind",
    "dispatchFailureKind",
    "serviceCode",
    "elapsedMs",
    "body",
    "source",
  ];
  assertExactObject(value, fields, path);
  if (!SDK_ERROR_KINDS.has(value.sdkErrorKind as string)) {
    throw new Error(`${path}.sdkErrorKind is invalid.`);
  }
  if (
    value.dispatchFailureKind !== null &&
    !DISPATCH_FAILURE_KINDS.has(value.dispatchFailureKind as string)
  ) {
    throw new Error(`${path}.dispatchFailureKind is invalid.`);
  }
  if (value.serviceCode !== null && !DIAGNOSTIC_LABEL.test(value.serviceCode as string)) {
    throw new Error(`${path}.serviceCode is invalid.`);
  }
  if ((value.sdkErrorKind === "DispatchFailure") !== (value.dispatchFailureKind !== null)) {
    throw new Error(`${path}.dispatchFailureKind must be set only for DispatchFailure.`);
  }
  if (value.sdkErrorKind !== "ServiceError" && value.serviceCode !== null) {
    throw new Error(`${path}.serviceCode must be null unless sdkErrorKind is ServiceError.`);
  }
  const count = requiredPositiveInteger(value.count, `${path}.count`);
  return {
    count,
    sdkErrorKind: value.sdkErrorKind as string,
    dispatchFailureKind: value.dispatchFailureKind as string | null,
    serviceCode: value.serviceCode as string | null,
    elapsedMs: sanitizeRange(value.elapsedMs, `${path}.elapsedMs`, count),
    body: sanitizeFailureBody(value.body, `${path}.body`, count),
    source: sanitizeFailureSource(value.source, `${path}.source`, count),
  };
}

function sanitizeFailureBody(value: unknown, path: string, count: number): PutObjectFailureBody {
  const fields = [
    "attemptObserved",
    "replay",
    "producerStage",
    "finalFrameDelivered",
    "producerCompleted",
    "bodyErrorObserved",
    "receiverDropped",
    "receiverDropAbortedProducer",
    "attemptNumber",
    "bytesEmitted",
    "remainingBytes",
  ];
  assertExactObject(value, fields, path);
  for (const field of fields.slice(0, 8)) {
    if (field === "producerStage") continue;
    if (typeof value[field] !== "boolean") throw new Error(`${path}.${field} must be boolean.`);
  }
  if (!PRODUCER_STAGES.has(value.producerStage as string)) {
    throw new Error(`${path}.producerStage is invalid.`);
  }
  if (value.attemptObserved === false && value.producerStage !== "not-observed") {
    throw new Error(
      `${path}.producerStage must be not-observed when the attempt was not observed.`,
    );
  }
  if (value.producerCompleted !== (value.producerStage === "complete")) {
    throw new Error(`${path}.producerCompleted must match producerStage.`);
  }
  if (value.receiverDropAbortedProducer === true && value.receiverDropped !== true) {
    throw new Error(`${path}.receiverDropAbortedProducer requires receiverDropped.`);
  }
  const sanitized = {
    attemptObserved: value.attemptObserved as boolean,
    replay: value.replay as boolean,
    producerStage: value.producerStage as string,
    finalFrameDelivered: value.finalFrameDelivered as boolean,
    producerCompleted: value.producerCompleted as boolean,
    bodyErrorObserved: value.bodyErrorObserved as boolean,
    receiverDropped: value.receiverDropped as boolean,
    receiverDropAbortedProducer: value.receiverDropAbortedProducer as boolean,
    attemptNumber: sanitizeRange(value.attemptNumber, `${path}.attemptNumber`, count),
    bytesEmitted: sanitizeRange(value.bytesEmitted, `${path}.bytesEmitted`, count),
    remainingBytes: sanitizeRange(value.remainingBytes, `${path}.remainingBytes`, count),
  };
  if (
    !sanitized.attemptObserved &&
    (sanitized.replay ||
      sanitized.finalFrameDelivered ||
      sanitized.producerCompleted ||
      sanitized.bodyErrorObserved ||
      sanitized.receiverDropped ||
      sanitized.receiverDropAbortedProducer ||
      !rangeIsZero(sanitized.attemptNumber) ||
      !rangeIsZero(sanitized.bytesEmitted) ||
      !rangeIsZero(sanitized.remainingBytes))
  ) {
    throw new Error(`${path} contains state for an unobserved attempt.`);
  }
  if (sanitized.attemptObserved && sanitized.attemptNumber.min < 1) {
    throw new Error(`${path}.attemptNumber must be positive for an observed attempt.`);
  }
  return sanitized;
}

function sanitizeFailureSource(
  value: unknown,
  path: string,
  count: number,
): PutObjectFailureSource {
  const ranges = [
    "localWindowBytes",
    "localCommittedBytes",
    "localResidentBytes",
    "localCapacityWaiters",
    "globalBudgetBytes",
    "globalResidentBytes",
    "globalAvailablePermits",
    "globalPermitUnitBytes",
    "globalPermitWaiters",
    "activeFetches",
  ] as const;
  assertExactObject(value, ["observed", ...ranges], path);
  if (typeof value.observed !== "boolean") throw new Error(`${path}.observed must be boolean.`);
  const sanitized = {
    observed: value.observed,
    ...Object.fromEntries(
      ranges.map((field) => [field, sanitizeRange(value[field], `${path}.${field}`, count)]),
    ),
  } as PutObjectFailureSource;
  if (!sanitized.observed && ranges.some((field) => !rangeIsZero(sanitized[field]))) {
    throw new Error(`${path} contains state for an unobserved source.`);
  }
  return sanitized;
}

function sanitizeRange(value: unknown, path: string, count: number): DiagnosticRange {
  assertExactObject(value, ["min", "max", "total"], path);
  const min = requiredNonnegativeInteger(value.min, `${path}.min`);
  const max = requiredNonnegativeInteger(value.max, `${path}.max`);
  const total = requiredNonnegativeInteger(value.total, `${path}.total`);
  if (min > max) throw new Error(`${path}.min exceeds max.`);
  const totalExact = BigInt(total);
  const countExact = BigInt(count);
  if (totalExact < BigInt(min) * countExact || totalExact > BigInt(max) * countExact) {
    throw new Error(`${path}.total is outside the represented range.`);
  }
  return { min, max, total };
}

function rangeIsZero(range: DiagnosticRange): boolean {
  return range.min === 0 && range.max === 0 && range.total === 0;
}

function assertExactObject(
  value: unknown,
  fields: readonly string[],
  path: string,
): asserts value is Record<string, unknown> {
  if (!isObject(value)) throw new Error(`${path} must be an object.`);
  const allowed = new Set(fields);
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) throw new Error(`${path} contains unexpected field ${field}.`);
  }
  for (const field of fields) {
    if (!Object.hasOwn(value, field)) throw new Error(`${path} is missing ${field}.`);
  }
}

function requiredNonnegativeInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${path} must be a nonnegative safe integer.`);
  }
  return value;
}

function requiredPositiveInteger(value: unknown, path: string): number {
  const parsed = requiredNonnegativeInteger(value, path);
  if (parsed === 0) throw new Error(`${path} must be positive.`);
  return parsed;
}

function safeNonnegativeBigInt(value: unknown): bigint {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? BigInt(value)
    : 0n;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
