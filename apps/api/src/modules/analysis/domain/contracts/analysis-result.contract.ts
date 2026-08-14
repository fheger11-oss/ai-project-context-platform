import type { FileClassification } from "../classification/file-classification.js";
import type {
  ProjectDetectionIssue,
  ProjectProfile
} from "../project-detection/project-profile.js";
import type {
  DependencyEdge,
  RelationshipAnalysisIssue,
  SourceRelationship
} from "../relationships/source-relationship.js";
import type {
  SourceFileStructure,
  SourceParseIssue
} from "../source-structure/source-file-structure.js";

export type AnalysisResultContext = {
  scanId: string;
  repositoryId: string;
  commitSha: string;
};

export type AnalysisComponentResult<T> = AnalysisResultContext & {
  result: T;
};

export type AnalysisIssueStage = "PROJECT_DETECTION" | "SOURCE_STRUCTURE" | "RELATIONSHIP_ANALYSIS";

export type AnalysisIssue =
  | {
      stage: "PROJECT_DETECTION";
      path: string;
      code: ProjectDetectionIssue["code"];
    }
  | {
      stage: "SOURCE_STRUCTURE";
      path: string;
      code: SourceParseIssue["code"];
      message: string;
    }
  | {
      stage: "RELATIONSHIP_ANALYSIS";
      path: string;
      specifier: string;
      code: RelationshipAnalysisIssue["code"];
    };

export type AnalysisResult = {
  analysisId: string;
  scanId: string;
  repositoryId: string;
  commitSha: string;
  analyzerVersion: string;
  generatedAt: Date;
  project: ProjectProfile;
  files: readonly FileClassification[];
  sourceStructures: readonly SourceFileStructure[];
  relationships: readonly SourceRelationship[];
  dependencies: readonly DependencyEdge[];
  issues: readonly AnalysisIssue[];
};
