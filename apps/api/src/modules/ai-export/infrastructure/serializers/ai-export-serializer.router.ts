import type { CanonicalAiExport } from "../../domain/canonical-ai-export.js";
import type { AiExportFormat } from "../../domain/ai-export-format.js";
import type { AiExportResult } from "../../domain/ai-export-result.js";
import type { AiExportSerializer } from "../../domain/contracts/ai-export-serializer.contract.js";
import { InvalidAiExportFormatError } from "../../domain/errors/invalid-ai-export-format.error.js";

export class AiExportSerializerRouter {
  private readonly serializersByFormat: ReadonlyMap<AiExportFormat, AiExportSerializer>;

  constructor(serializers: readonly AiExportSerializer[]) {
    this.serializersByFormat = new Map(
      serializers.map((serializer) => [serializer.format, serializer])
    );
  }

  serialize(input: CanonicalAiExport, format: AiExportFormat): AiExportResult {
    const serializer = this.serializersByFormat.get(format);

    if (!serializer) {
      throw new InvalidAiExportFormatError(format);
    }

    return serializer.serialize(input);
  }
}
