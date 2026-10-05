import { Inject, Injectable } from "@nestjs/common";

import { ANALYSIS_ENGINE_VERSION } from "../../analysis/application/analysis-engine-version.js";
import { CONTEXT_ENGINE_VERSION } from "../../context/application/context-engine-version.js";
import type { ArchitectureFindingEvidence } from "../domain/architecture-finding-evidence.js";
import { measureArchitectureModules } from "../domain/architecture-module-measurements.js";
import {
  detectCircularDependencies,
  type CircularDependencyFinding
} from "../domain/circular-dependency-detector.js";
import { projectArchitectureGraph } from "../domain/project-architecture-graph.js";
import {
  ARCHITECTURE_PROCESSING_INPUT_READER,
  type ArchitectureProcessingInputReader
} from "../domain/contracts/architecture-processing-input-reader.contract.js";
import {
  ARCHITECTURE_PROCESSING_OUTPUT_WRITER,
  type ArchitectureProcessingOutputWriter
} from "../domain/contracts/architecture-processing-output-writer.contract.js";
import type { ArchitectureProcessingRequestRecord } from "../domain/contracts/architecture-processing-request-repository.contract.js";
import type {
  ArchitectureProcessingOutcome,
  ArchitectureProcessingRequestProcessor
} from "./architecture-processing-request-processor.contract.js";
import { ARCHITECTURE_PROCESSOR_VERSION } from "./architecture-processor-version.js";

@Injectable()
export class DeterministicArchitectureProcessingService implements ArchitectureProcessingRequestProcessor {
  constructor(
    @Inject(ARCHITECTURE_PROCESSING_INPUT_READER)
    private readonly inputReader: ArchitectureProcessingInputReader,
    @Inject(ARCHITECTURE_PROCESSING_OUTPUT_WRITER)
    private readonly outputWriter: ArchitectureProcessingOutputWriter
  ) {}

  async process(
    request: ArchitectureProcessingRequestRecord
  ): Promise<ArchitectureProcessingOutcome> {
    const input = await this.inputReader.read(request);
    if (
      request.processorVersion !== ARCHITECTURE_PROCESSOR_VERSION ||
      input.contextVersion !== CONTEXT_ENGINE_VERSION ||
      input.analyzerVersion !== ANALYSIS_ENGINE_VERSION
    ) {
      return "INCOMPATIBLE";
    }

    const graph = projectArchitectureGraph(input);
    const measurements = measureArchitectureModules(graph).map((measurement) => ({
      ...measurement,
      repositoryId: request.repositoryId,
      projectContextId: request.projectContextId,
      processingRequestId: request.id
    }));
    const nodesById = new Map(graph.nodes.map((node) => [node.moduleId, node]));
    const findings = detectCircularDependencies(graph).map((finding) => ({
      repositoryId: request.repositoryId,
      projectContextId: request.projectContextId,
      processingRequestId: request.id,
      fingerprint: finding.fingerprint,
      ruleId: finding.ruleId,
      ruleVersion: finding.ruleVersion,
      confidence: finding.confidence,
      subject: { kind: "CYCLE" as const, moduleIds: finding.moduleIds },
      evidence: findingEvidence(finding, nodesById)
    }));

    await this.outputWriter.persist({ findings, measurements });
    return "COMPLETED";
  }
}

function findingEvidence(
  finding: CircularDependencyFinding,
  nodesById: ReadonlyMap<string, { moduleId: string; confidence: "HIGH" | "MEDIUM" | "LOW" }>
): ArchitectureFindingEvidence[] {
  return [
    ...finding.moduleIds.map((moduleId) => {
      const node = nodesById.get(moduleId);
      if (!node) throw new Error(`Architecture graph node ${moduleId} was not found.`);
      return { kind: "MODULE" as const, moduleId, confidence: node.confidence };
    }),
    ...finding.edges.flatMap((edge): ArchitectureFindingEvidence[] => [
      {
        kind: "MODULE_RELATIONSHIP",
        sourceModuleId: edge.sourceModuleId,
        targetModuleId: edge.targetModuleId,
        relationshipCount: edge.relationshipCount,
        confidence: edge.confidence
      },
      ...edge.evidence.map((evidence) => ({
        kind: "ANALYSIS_RELATIONSHIP" as const,
        sourceModuleId: edge.sourceModuleId,
        targetModuleId: edge.targetModuleId,
        sourcePath: evidence.sourcePath,
        targetPath: evidence.targetPath,
        relationshipKind: evidence.relationshipKind,
        specifier: evidence.specifier,
        ...(evidence.location ? { location: evidence.location } : {})
      }))
    ])
  ];
}
