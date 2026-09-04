-- RenameEnumValue (safe - preserves existing Store rows, no data loss)
ALTER TYPE "StoreStatus" RENAME VALUE 'PENDING_SETUP' TO 'PENDING';
ALTER TYPE "StoreStatus" RENAME VALUE 'ACTIVE' TO 'APPROVED';
ALTER TYPE "StoreStatus" ADD VALUE 'REJECTED';

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "suspendedByUserId" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedReason" TEXT,
ADD COLUMN "rejectedByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenUsedAt" TIMESTAMP(3),
    "fullName" TEXT,
    "phone" TEXT,
    "businessType" TEXT,
    "businessAddress" TEXT,
    "description" TEXT,
    "nidNumber" TEXT,
    "nidDocumentId" TEXT,
    "tradeLicenseNumber" TEXT,
    "tradeLicenseDocumentId" TEXT,
    "supportingDocumentId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_storeId_key" ON "Verification"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_tokenHash_key" ON "Verification"("tokenHash");

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");

-- CreateIndex
CREATE INDEX "Verification_tokenHash_idx" ON "Verification"("tokenHash");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_suspendedByUserId_fkey" FOREIGN KEY ("suspendedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
