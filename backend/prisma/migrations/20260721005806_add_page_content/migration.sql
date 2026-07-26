-- CreateTable
CREATE TABLE "PageContent" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_page_key" ON "PageContent"("page");
