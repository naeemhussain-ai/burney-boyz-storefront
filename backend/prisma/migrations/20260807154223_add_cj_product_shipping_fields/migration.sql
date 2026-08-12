-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "listedNum" INTEGER,
ADD COLUMN     "packagingWeight" TEXT,
ADD COLUMN     "shippingCountries" JSONB,
ADD COLUMN     "shippingMethods" JSONB,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "video" TEXT,
ADD COLUMN     "weight" TEXT;

-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "barcode2" TEXT,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "inventoryDetail" JSONB,
ADD COLUMN     "length" INTEGER,
ADD COLUMN     "standard" TEXT,
ADD COLUMN     "weight" DECIMAL(10,2),
ADD COLUMN     "width" INTEGER;
