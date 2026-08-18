import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { AppModule } from "../app/app.module.js";
import { ContextModule } from "../context/context.module.js";
import type { ProjectContextReader } from "../context/domain/contracts/project-context-reader.contract.js";
import { PROJECT_CONTEXT_READER } from "../context/domain/contracts/project-context-reader.contract.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { GenerateDocumentUseCase } from "./application/generate-document.use-case.js";
import { ProjectOverviewDocumentGenerator } from "./application/project-overview-document.generator.js";
import { DocumentGenerationModule } from "./document-generation.module.js";
import {
  DOCUMENT_GENERATOR,
  type DocumentGenerator
} from "./domain/contracts/document-generator.contract.js";
import { DOCUMENT_RENDERER } from "./domain/contracts/document-renderer.contract.js";
import {
  DOCUMENT_REPOSITORY,
  type DocumentRepository
} from "./domain/contracts/document-repository.contract.js";
import { MarkdownDocumentRenderer } from "./infrastructure/markdown-document.renderer.js";
import { PrismaDocumentRepository } from "./infrastructure/prisma-document.repository.js";
import { DocumentController } from "./presentation/document.controller.js";

const MODULE_IMPORTS_METADATA = "imports";
const MODULE_CONTROLLERS_METADATA = "controllers";
const MODULE_PROVIDERS_METADATA = "providers";
const MODULE_EXPORTS_METADATA = "exports";

describe("DocumentGenerationModule", () => {
  it("registers the Document Generation API, generator, renderer, and persistence boundaries", () => {
    expect(Reflect.getMetadata(MODULE_IMPORTS_METADATA, DocumentGenerationModule) ?? []).toEqual([
      ContextModule,
      PrismaModule
    ]);
    expect(
      Reflect.getMetadata(MODULE_CONTROLLERS_METADATA, DocumentGenerationModule) ?? []
    ).toEqual([DocumentController]);
    expect(Reflect.getMetadata(MODULE_PROVIDERS_METADATA, DocumentGenerationModule) ?? []).toEqual([
      {
        provide: DOCUMENT_RENDERER,
        useFactory: expect.any(Function)
      },
      {
        provide: DOCUMENT_GENERATOR,
        useFactory: expect.any(Function),
        inject: [DOCUMENT_RENDERER]
      },
      {
        provide: DOCUMENT_REPOSITORY,
        useClass: PrismaDocumentRepository
      },
      {
        provide: GenerateDocumentUseCase,
        useFactory: expect.any(Function),
        inject: [PROJECT_CONTEXT_READER, DOCUMENT_GENERATOR, DOCUMENT_REPOSITORY]
      }
    ]);
    expect(Reflect.getMetadata(MODULE_EXPORTS_METADATA, DocumentGenerationModule) ?? []).toEqual([
      GenerateDocumentUseCase,
      DOCUMENT_GENERATOR,
      DOCUMENT_RENDERER,
      DOCUMENT_REPOSITORY
    ]);
  });

  it("wires factory providers to the existing deterministic implementation classes", () => {
    const providers = Reflect.getMetadata(
      MODULE_PROVIDERS_METADATA,
      DocumentGenerationModule
    ) as Array<{ provide: unknown; useFactory?: (...args: unknown[]) => unknown }>;
    const rendererProvider = providers.find((provider) => provider.provide === DOCUMENT_RENDERER);
    const generatorProvider = providers.find((provider) => provider.provide === DOCUMENT_GENERATOR);

    const renderer = rendererProvider?.useFactory?.();
    const generator = generatorProvider?.useFactory?.(renderer);

    expect(renderer).toBeInstanceOf(MarkdownDocumentRenderer);
    expect(generator).toBeInstanceOf(ProjectOverviewDocumentGenerator);
  });

  it("resolves the use case provider from the registered contract dependencies", () => {
    const providers = Reflect.getMetadata(
      MODULE_PROVIDERS_METADATA,
      DocumentGenerationModule
    ) as Array<{ provide: unknown; useFactory?: (...args: unknown[]) => unknown }>;
    const useCaseProvider = providers.find(
      (provider) => provider.provide === GenerateDocumentUseCase
    );
    const projectContextReader = {} as ProjectContextReader;
    const documentGenerator = {} as DocumentGenerator;
    const documentRepository = {} as DocumentRepository;

    const useCase = useCaseProvider?.useFactory?.(
      projectContextReader,
      documentGenerator,
      documentRepository
    );

    expect(useCase).toBeInstanceOf(GenerateDocumentUseCase);
  });

  it("is registered with the application module", () => {
    const imports = Reflect.getMetadata(MODULE_IMPORTS_METADATA, AppModule) as unknown[];

    expect(imports).toContain(DocumentGenerationModule);
  });
});
