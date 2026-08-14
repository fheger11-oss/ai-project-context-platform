import { Inject, Injectable } from "@nestjs/common";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import { SourceRelationshipAnalyzer } from "../domain/relationships/source-relationship-analyzer.js";
import type { RelationshipAnalysisResult } from "../domain/relationships/source-relationship.js";
import { ProjectDetectionService } from "./project-detection.service.js";
import { SourceStructureAnalysisService } from "./source-structure-analysis.service.js";

@Injectable()
export class RelationshipAnalysisService {
  private readonly relationshipAnalyzer = new SourceRelationshipAnalyzer();

  constructor(
    @Inject(SourceStructureAnalysisService)
    private readonly sourceStructureAnalysisService: SourceStructureAnalysisService,
    @Inject(ProjectDetectionService)
    private readonly projectDetectionService: ProjectDetectionService
  ) {}

  async analyzeRelationships(input: AnalysisInput): Promise<RelationshipAnalysisResult> {
    const sourceStructures =
      await this.sourceStructureAnalysisService.analyzeSourceStructure(input);
    const projectProfile = await this.projectDetectionService.detectProject(input);

    return this.relationshipAnalyzer.analyze({
      sourceStructures,
      projectProfile
    });
  }
}
