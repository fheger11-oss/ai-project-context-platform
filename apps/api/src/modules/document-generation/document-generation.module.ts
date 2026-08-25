import { Module } from "@nestjs/common";

import { PROJECT_CONTEXT_READER } from "../context/domain/contracts/project-context-reader.contract.js";
import { ContextModule } from "../context/context.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { ArchitectureDocumentationGenerator } from "./application/architecture-documentation.generator.js";
import { GenerateDocumentUseCase } from "./application/generate-document.use-case.js";
import { GetDocumentUseCase } from "./application/get-document.use-case.js";
import { ListDocumentHistoryUseCase } from "./application/list-document-history.use-case.js";
import { DocumentGeneratorRouter } from "./application/document-generator.router.js";
import { ModuleDocumentationGenerator } from "./application/module-documentation.generator.js";
import { ProjectOverviewDocumentGenerator } from "./application/project-overview-document.generator.js";
import { RegenerateDocumentUseCase } from "./application/regenerate-document.use-case.js";
import { TechnicalDocumentationGenerator } from "./application/technical-documentation.generator.js";
import {
  DOCUMENT_GENERATOR,
  type DocumentGenerator
} from "./domain/contracts/document-generator.contract.js";
import {
  DOCUMENT_RENDERER,
  type DocumentRenderer
} from "./domain/contracts/document-renderer.contract.js";
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository
} from "./domain/contracts/document-repository.contract.js";
import type { DocumentModel } from "./domain/document-model.js";
import { MarkdownDocumentRenderer } from "./infrastructure/markdown-document.renderer.js";
import { PrismaDocumentRepository } from "./infrastructure/prisma-document.repository.js";
import { DocumentController } from "./presentation/document.controller.js";

@Module({
  imports: [ContextModule, PrismaModule],
  controllers: [DocumentController],
  providers: [
    {
      provide: DOCUMENT_RENDERER,
      useFactory: () => new MarkdownDocumentRenderer()
    },
    {
      provide: DOCUMENT_GENERATOR,
      useFactory: (renderer: DocumentRenderer<DocumentModel>) =>
        new DocumentGeneratorRouter(
          new ProjectOverviewDocumentGenerator(renderer),
          new TechnicalDocumentationGenerator(renderer),
          new ArchitectureDocumentationGenerator(renderer),
          new ModuleDocumentationGenerator(renderer)
        ),
      inject: [DOCUMENT_RENDERER]
    },
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: PrismaDocumentRepository
    },
    {
      provide: GenerateDocumentUseCase,
      useFactory: (
        projectContextReader: ConstructorParameters<typeof GenerateDocumentUseCase>[0],
        documentGenerator: DocumentGenerator,
        documentRepository: DocumentRepository
      ) =>
        createGenerateDocumentUseCase(projectContextReader, documentGenerator, documentRepository),
      inject: [PROJECT_CONTEXT_READER, DOCUMENT_GENERATOR, DOCUMENT_REPOSITORY]
    },
    {
      provide: GetDocumentUseCase,
      useFactory: (
        projectContextReader: ConstructorParameters<typeof GetDocumentUseCase>[0],
        documentRepository: DocumentRepository
      ) => new GetDocumentUseCase(projectContextReader, documentRepository),
      inject: [PROJECT_CONTEXT_READER, DOCUMENT_REPOSITORY]
    },
    {
      provide: ListDocumentHistoryUseCase,
      useFactory: (
        projectContextReader: ConstructorParameters<typeof ListDocumentHistoryUseCase>[0],
        documentRepository: DocumentRepository
      ) => new ListDocumentHistoryUseCase(projectContextReader, documentRepository),
      inject: [PROJECT_CONTEXT_READER, DOCUMENT_REPOSITORY]
    },
    {
      provide: RegenerateDocumentUseCase,
      useFactory: (
        projectContextReader: ConstructorParameters<typeof RegenerateDocumentUseCase>[0],
        documentGenerator: DocumentGenerator,
        documentRepository: DocumentRepository
      ) =>
        new RegenerateDocumentUseCase(projectContextReader, documentGenerator, documentRepository),
      inject: [PROJECT_CONTEXT_READER, DOCUMENT_GENERATOR, DOCUMENT_REPOSITORY]
    }
  ],
  exports: [
    GenerateDocumentUseCase,
    GetDocumentUseCase,
    ListDocumentHistoryUseCase,
    RegenerateDocumentUseCase,
    DOCUMENT_GENERATOR,
    DOCUMENT_RENDERER,
    DOCUMENT_REPOSITORY
  ]
})
export class DocumentGenerationModule {}

function createGenerateDocumentUseCase(
  projectContextReader: ConstructorParameters<typeof GenerateDocumentUseCase>[0],
  documentGenerator: DocumentGenerator,
  documentRepository: DocumentRepository
): GenerateDocumentUseCase {
  return new GenerateDocumentUseCase(projectContextReader, documentGenerator, documentRepository);
}
