/**
 * Stub PrismaService for e2e tests that do not require a database.
 * Batch A (auth/session/rbac) e2e tests use in-memory repositories and do not hit Prisma.
 * This stub allows the app to bootstrap without a real database connection.
 */
import { Injectable } from "@nestjs/common";

function createModelStub() {
  return {
    findMany: () => Promise.resolve([]),
    findUnique: () => Promise.resolve(null),
    findFirst: () => Promise.resolve(null),
    create: () => Promise.resolve({}),
    update: () => Promise.resolve({}),
    upsert: () => Promise.resolve({}),
    delete: () => Promise.resolve({}),
    count: () => Promise.resolve(0),
    createMany: () => Promise.resolve({ count: 0 }),
    updateMany: () => Promise.resolve({ count: 0 }),
    deleteMany: () => Promise.resolve({ count: 0 }),
  };
}

@Injectable()
export class PrismaE2eStub {
  material = createModelStub();
  materialCategory = createModelStub();
  customer = createModelStub();
  supplier = createModelStub();
  personnel = createModelStub();
  workshop = createModelStub();
  inventoryBalance = createModelStub();
  inventoryLog = createModelStub();
  inventorySourceUsage = createModelStub();
  factoryNumberReservation = createModelStub();
  workflowAuditDocument = createModelStub();
  stockInOrder = createModelStub();
  stockInOrderLine = createModelStub();
  customerStockOrder = createModelStub();
  customerStockOrderLine = createModelStub();
  workshopMaterialOrder = createModelStub();
  workshopMaterialOrderLine = createModelStub();
  project = createModelStub();
  projectMaterialLine = createModelStub();
  documentRelation = createModelStub();
  documentLineRelation = createModelStub();

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
  async $transaction<R>(handler: (tx: unknown) => Promise<R>): Promise<R> {
    return handler(this);
  }

  async runInTransaction<R>(handler: (tx: unknown) => Promise<R>): Promise<R> {
    return handler(this);
  }
}
