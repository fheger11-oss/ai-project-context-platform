import { describe, expect, it, vi } from "vitest";

import type { ProjectContext } from "../../context/domain/project-context.js";
import type { DocumentGenerator } from "../domain/contracts/document-generator.contract.js";
import type { DocumentGenerationInput } from "../domain/contracts/document-generation-input.contract.js";
import { InvalidDocumentTypeError } from "../domain/errors/invalid-document-type.error.js";
import { DocumentGeneratorRouter } from "./document-generator.router.js";

const projectContext = {
  contextId: "context_1"
} as ProjectContext;

function input(documentType: DocumentGenerationInput["documentType"]): DocumentGenerationInput {
  return {
    projectContext,
    documentType,
    format: "MARKDOWN",
    generatorVersion: "document-generator@1"
  };
}

function generator(content: string): DocumentGenerator {
  return {
    generate: vi.fn(async (generationInput: DocumentGenerationInput) => ({
      contextId: generationInput.projectContext.contextId,
      documentType: generationInput.documentType,
      format: generationInput.format,
      generatorVersion: generationInput.generatorVersion,
      content
    }))
  };
}

function router(
  projectOverviewGenerator = generator("# Project Overview"),
  technicalDocumentationGenerator = generator("# Technical Documentation"),
  architectureDocumentationGenerator = generator("# Architecture Documentation"),
  moduleDocumentationGenerator = generator("# Module Documentation")
): DocumentGeneratorRouter {
  return new DocumentGeneratorRouter(
    projectOverviewGenerator,
    technicalDocumentationGenerator,
    architectureDocumentationGenerator,
    moduleDocumentationGenerator
  );
}

describe("DocumentGeneratorRouter", () => {
  it("routes Project Overview requests to the Project Overview generator", async () => {
    const projectOverviewGenerator = generator("# Project Overview");
    const technicalDocumentationGenerator = generator("# Technical Documentation");
    const architectureDocumentationGenerator = generator("# Architecture Documentation");
    const moduleDocumentationGenerator = generator("# Module Documentation");
    const documentGeneratorRouter = router(
      projectOverviewGenerator,
      technicalDocumentationGenerator,
      architectureDocumentationGenerator,
      moduleDocumentationGenerator
    );

    await expect(
      documentGeneratorRouter.generate(input("PROJECT_OVERVIEW"))
    ).resolves.toMatchObject({
      documentType: "PROJECT_OVERVIEW",
      content: "# Project Overview"
    });
    expect(projectOverviewGenerator.generate).toHaveBeenCalledTimes(1);
    expect(technicalDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(architectureDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(moduleDocumentationGenerator.generate).not.toHaveBeenCalled();
  });

  it("routes Technical Documentation requests to the Technical Documentation generator", async () => {
    const projectOverviewGenerator = generator("# Project Overview");
    const technicalDocumentationGenerator = generator("# Technical Documentation");
    const architectureDocumentationGenerator = generator("# Architecture Documentation");
    const moduleDocumentationGenerator = generator("# Module Documentation");
    const documentGeneratorRouter = router(
      projectOverviewGenerator,
      technicalDocumentationGenerator,
      architectureDocumentationGenerator,
      moduleDocumentationGenerator
    );

    await expect(
      documentGeneratorRouter.generate(input("TECHNICAL_DOCUMENTATION"))
    ).resolves.toMatchObject({
      documentType: "TECHNICAL_DOCUMENTATION",
      content: "# Technical Documentation"
    });
    expect(projectOverviewGenerator.generate).not.toHaveBeenCalled();
    expect(technicalDocumentationGenerator.generate).toHaveBeenCalledTimes(1);
    expect(architectureDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(moduleDocumentationGenerator.generate).not.toHaveBeenCalled();
  });

  it("routes Architecture Documentation requests to the Architecture Documentation generator", async () => {
    const projectOverviewGenerator = generator("# Project Overview");
    const technicalDocumentationGenerator = generator("# Technical Documentation");
    const architectureDocumentationGenerator = generator("# Architecture Documentation");
    const moduleDocumentationGenerator = generator("# Module Documentation");
    const documentGeneratorRouter = router(
      projectOverviewGenerator,
      technicalDocumentationGenerator,
      architectureDocumentationGenerator,
      moduleDocumentationGenerator
    );

    await expect(
      documentGeneratorRouter.generate(input("ARCHITECTURE_DOCUMENT"))
    ).resolves.toMatchObject({
      documentType: "ARCHITECTURE_DOCUMENT",
      content: "# Architecture Documentation"
    });
    expect(projectOverviewGenerator.generate).not.toHaveBeenCalled();
    expect(technicalDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(architectureDocumentationGenerator.generate).toHaveBeenCalledTimes(1);
    expect(moduleDocumentationGenerator.generate).not.toHaveBeenCalled();
  });

  it("routes Module Documentation requests to the Module Documentation generator", async () => {
    const projectOverviewGenerator = generator("# Project Overview");
    const technicalDocumentationGenerator = generator("# Technical Documentation");
    const architectureDocumentationGenerator = generator("# Architecture Documentation");
    const moduleDocumentationGenerator = generator("# Module Documentation");
    const documentGeneratorRouter = router(
      projectOverviewGenerator,
      technicalDocumentationGenerator,
      architectureDocumentationGenerator,
      moduleDocumentationGenerator
    );

    await expect(
      documentGeneratorRouter.generate(input("MODULE_DOCUMENTATION"))
    ).resolves.toMatchObject({
      documentType: "MODULE_DOCUMENTATION",
      content: "# Module Documentation"
    });
    expect(projectOverviewGenerator.generate).not.toHaveBeenCalled();
    expect(technicalDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(architectureDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(moduleDocumentationGenerator.generate).toHaveBeenCalledTimes(1);
  });

  it("rejects unsupported document types without selecting a generator", async () => {
    const projectOverviewGenerator = generator("# Project Overview");
    const technicalDocumentationGenerator = generator("# Technical Documentation");
    const architectureDocumentationGenerator = generator("# Architecture Documentation");
    const moduleDocumentationGenerator = generator("# Module Documentation");
    const documentGeneratorRouter = router(
      projectOverviewGenerator,
      technicalDocumentationGenerator,
      architectureDocumentationGenerator,
      moduleDocumentationGenerator
    );

    await expect(
      documentGeneratorRouter.generate(input("README" as DocumentGenerationInput["documentType"]))
    ).rejects.toThrow(InvalidDocumentTypeError);
    expect(projectOverviewGenerator.generate).not.toHaveBeenCalled();
    expect(technicalDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(architectureDocumentationGenerator.generate).not.toHaveBeenCalled();
    expect(moduleDocumentationGenerator.generate).not.toHaveBeenCalled();
  });
});
