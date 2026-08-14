import { Inject, Injectable } from "@nestjs/common";

import type { AnalysisInput } from "../domain/contracts/analysis-input.contract.js";
import { SourceRelationshipAnalyzer } from "../domain/relationships/source-relationship-analyzer.js";
import type { RelationshipAnalysisResult } from "../domain/relationships/source-relationship.js";
import type { ProjectProfile } from "../domain/project-detection/project-profile.js";
import type { SourceFileStructure } from "../domain/source-structure/source-file-structure.js";
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

    return this.analyzeRelationshipsFromResults({
      sourceStructures,
      projectProfile
    });
  }

  analyzeRelationshipsFromResults(input: {
    sourceStructures: readonly SourceFileStructure[];
    projectProfile: ProjectProfile;
  }): RelationshipAnalysisResult {
    return this.relationshipAnalyzer.analyze({
      sourceStructures: input.sourceStructures,
      projectProfile: input.projectProfile
    });
  }
}
