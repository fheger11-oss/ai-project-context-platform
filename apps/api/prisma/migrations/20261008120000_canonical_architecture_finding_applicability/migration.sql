CREATE TYPE "ArchitectureApplicability" AS ENUM ('APPLICABLE', 'PARTIALLY_APPLICABLE');

ALTER TABLE "architecture_finding_occurrences"
ADD COLUMN "applicability" "ArchitectureApplicability";
