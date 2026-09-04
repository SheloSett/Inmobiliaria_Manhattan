-- displayOrder (03/09/2026): orden manual de las propiedades, definido arrastrandolas en
-- el panel admin. Hasta ahora el orden era fijo (createdAt desc) y no se podia elegir.
--
-- El default 0 alcanzaria para no romper nada, pero se BACKFILLEA a proposito con el
-- orden que las propiedades tienen HOY en pantalla (createdAt desc). Motivo: si todas
-- quedaran en 0, la primera vez que el admin arrastre una sola fila el frontend
-- guardaria posiciones 0..N-1 para TODAS y el resto del listado podria reacomodarse de
-- golpe. Backfilleando, el estado inicial ya es explicito y arrastrar una fila mueve
-- solo esa.
ALTER TABLE "Property" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

WITH ordenadas AS (
  SELECT "id", (ROW_NUMBER() OVER (ORDER BY "createdAt" DESC, "id" DESC) - 1) AS pos
  FROM "Property"
)
UPDATE "Property" p
SET "displayOrder" = o.pos
FROM ordenadas o
WHERE p."id" = o."id";
