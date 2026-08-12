-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cjLastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "cjOrderId" TEXT,
ADD COLUMN     "cjOrderStatus" TEXT,
ADD COLUMN     "cjShippingCarrier" TEXT,
ADD COLUMN     "cjSyncError" TEXT,
ADD COLUMN     "cjTrackingNumber" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cjStatus" TEXT,
ADD COLUMN     "lastSyncError" TEXT,
ADD COLUMN     "lastSyncStatus" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3);
