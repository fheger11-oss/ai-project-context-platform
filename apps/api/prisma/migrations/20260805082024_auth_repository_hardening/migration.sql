-- AlterTable
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "github_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "github_id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "access_token_iv" TEXT NOT NULL,
    "access_token_auth_tag" TEXT NOT NULL,
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "github_accounts_user_id_key" ON "github_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "github_accounts_github_id_key" ON "github_accounts"("github_id");

-- CreateIndex
CREATE INDEX "github_accounts_login_idx" ON "github_accounts"("login");

-- AddForeignKey
ALTER TABLE "github_accounts" ADD CONSTRAINT "github_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
