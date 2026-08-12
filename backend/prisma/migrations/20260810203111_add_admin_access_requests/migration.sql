-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminDecidedAt" TIMESTAMP(3),
ADD COLUMN     "adminRequestStatus" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "adminRequestedAt" TIMESTAMP(3);
