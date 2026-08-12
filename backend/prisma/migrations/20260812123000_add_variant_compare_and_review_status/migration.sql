-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable: add status to reviews
ALTER TABLE "reviews" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'pending';

-- AlterTable: add comparePrice to variants
ALTER TABLE "variants" ADD COLUMN "comparePrice" DECIMAL(10,2);
