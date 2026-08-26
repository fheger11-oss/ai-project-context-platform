import { Module } from "@nestjs/common";

import { ContextModule } from "../context/context.module.js";
import { PROJECT_CONTEXT_READER } from "../context/domain/contracts/project-context-reader.contract.js";
import { GenerateAiExportUseCase } from "./application/generate-ai-export.use-case.js";
import { ProjectContextAiExportProjector } from "./application/project-context-ai-export.projector.js";
import {
  AI_EXPORT_PROJECTOR,
  type AiExportProjector
} from "./domain/contracts/ai-export-projector.contract.js";
import { AiContextSerializer } from "./infrastructure/serializers/ai-context.serializer.js";
import { AiExportSerializerRouter } from "./infrastructure/serializers/ai-export-serializer.router.js";
import { MarkdownAiExportSerializer } from "./infrastructure/serializers/markdown-ai-export.serializer.js";
import { PlainTextAiExportSerializer } from "./infrastructure/serializers/plain-text-ai-export.serializer.js";
import { AiExportController } from "./presentation/ai-export.controller.js";

@Module({
  imports: [ContextModule],
  controllers: [AiExportController],
  providers: [
    {
      provide: AI_EXPORT_PROJECTOR,
      useClass: ProjectContextAiExportProjector
    },
    {
      provide: AiExportSerializerRouter,
      useFactory: () =>
        new AiExportSerializerRouter([
          new AiContextSerializer(),
          new MarkdownAiExportSerializer(),
          new PlainTextAiExportSerializer()
        ])
    },
    {
      provide: GenerateAiExportUseCase,
      useFactory: (
        projectContextReader: ConstructorParameters<typeof GenerateAiExportUseCase>[0],
        aiExportProjector: AiExportProjector,
        serializerRouter: AiExportSerializerRouter
      ) => new GenerateAiExportUseCase(projectContextReader, aiExportProjector, serializerRouter),
      inject: [PROJECT_CONTEXT_READER, AI_EXPORT_PROJECTOR, AiExportSerializerRouter]
    }
  ],
  exports: [GenerateAiExportUseCase, AI_EXPORT_PROJECTOR, AiExportSerializerRouter]
})
export class AiExportModule {}
