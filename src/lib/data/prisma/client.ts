// The only module permitted to hold the Prisma client. Nothing here is wired yet, and that is
// deliberate.
//
// `prisma/schema.prisma` is a DRAFT awaiting human approval (RULE-09), and no migration has been
// applied. Writing queries against it now would bake unapproved model and field names into the
// implementation, the DTO mapping, and eventually the selectors — exactly the propagation RULE-04
// exists to stop. So each function in this directory carries its final signature and throws.
//
// The signatures are not provisional. `tests/unit/seam-parity.test.ts` holds this directory to the
// same exported names and the same arity as `../mock/`, so filling a body in later cannot change
// the shape a component sees.
//
// TODO(verify): once the schema is approved, this module memoizes a PrismaClient and the entity
// modules map rows onto the DTOs in `../types.ts`. No Prisma type may leave this directory
// (RULE-02). Import of `@prisma/client` is deliberately absent until then: the generated client
// does not exist until `prisma generate` runs, and importing it now would make `pnpm typecheck`
// depend on a generate step that has not been approved to run.

export const SCHEMA_PENDING_APPROVAL =
  "The Prisma-backed seam is not wired: prisma/schema.prisma is a draft awaiting human approval " +
  "(RULE-09) and no migration has been applied. Run with DATA_SOURCE=mock, which is the default.";

export function notWired(fn: string): never {
  throw new Error(`${fn}: ${SCHEMA_PENDING_APPROVAL}`);
}
