import { Inject, Injectable } from "@nestjs/common";

import type { Analysis } from "../domain/analysis.js";
import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import type {
  AnalysisResult,
  AnalysisResultContext
} from "../domain/contracts/analysis-result.contract.js";
import { InvalidAnalysisPipelineContextError } from "./errors/invalid-analysis-pipeline-context.error.js";
import { AnalysisResultAggregationService } from "./analysis-result-aggregation.service.js";
import { FileClassificationService } from "./file-classification.service.js";
import { ProjectDetectionService } from "./project-detection.service.js";
import { RelationshipAnalysisService } from "./relationship-analysis.service.js";
import { SourceStructureAnalysisService } from "./source-structure-analysis.service.js";

export type AnalysisPipelineInput = {
  analysis: Analysis;
  input: AnalysisInput;
  generatedAt: Date;
};

@Injectable()
export class AnalysisPipelineService {
  constructor(
    @Inject(FileClassificationService)
    private readonly fileClassificationService: FileClassificationService,
    @Inject(ProjectDetectionService)
    private readonly projectDetectionService: ProjectDetectionService,
    @Inject(SourceStructureAnalysisService)
    private readonly sourceStructureAnalysisService: SourceStructureAnalysisService,
    @Inject(RelationshipAnalysisService)
    private readonly relationshipAnalysisService: RelationshipAnalysisService,
    @Inject(AnalysisResultAggregationService)
    private readonly analysisResultAggregationService: AnalysisResultAggregationService
  ) {}

  async analyze(input: AnalysisPipelineInput): Promise<AnalysisResult> {
    if (input.analysis.scanId !== input.input.scanId) {
      throw new InvalidAnalysisPipelineContextError(input.analysis.scanId, input.input.scanId);
    }

    const context = this.context(input.input);
    const files = await this.fileClassificationService.classifyFiles(input.input);
    const project = await this.projectDetectionService.detectProject(input.input);
    const sourceStructures = await this.sourceStructureAnalysisService.analyzeSourceStructure(
      input.input
    );
    const relationships = this.relationshipAnalysisService.analyzeRelationshipsFromResults({
      sourceStructures,
      projectProfile: project
    });

    return this.analysisResultAggregationService.aggregate({
      ...context,
      analysisId: input.analysis.id,
      analyzerVersion: input.analysis.analyzerVersion,
      generatedAt: input.generatedAt,
      files: {
        ...context,
        result: files
      },
      project: {
        ...context,
        result: project
      },
      sourceStructures: {
        ...context,
        result: sourceStructures
      },
      relationships: {
        ...context,
        result: relationships
      }
    });
  }

  private context(input: AnalysisInput): AnalysisResultContext {
    return {
      scanId: input.scanId,
      repositoryId: input.repositoryId,
      commitSha: input.commitSha
    };
  }
}
