/**
 * Model Registry for Connection Pool
 *
 * Provides tenant-specific models using pooled connections.
 * Models are registered per-connection, enabling true multi-tenant concurrency.
 */

import mongoose from 'mongoose';
import { getPooledConnection } from './connection-pool';
import {
  HomeTemplateSchema,
  type HomeTemplateDocument,
} from './models/home-template';
import {
  ProductTemplateSchema,
  type ProductTemplateDocument,
} from './models/product-template';
import {
  ProductTemplateSchema as ProductTemplateSimpleSchema,
  type ProductTemplateDocument as ProductTemplateSimpleDocument,
} from './models/product-template-simple';

// Model name to schema mapping
const MODEL_SCHEMAS: Record<string, mongoose.Schema> = {
  HomeTemplate: HomeTemplateSchema,
  ProductTemplate: ProductTemplateSchema,
  ProductTemplateSimple: ProductTemplateSimpleSchema,
};

/**
 * Get a model for a specific tenant database from the connection pool.
 * Models are cached per connection.
 *
 * @param dbName - Tenant database name (e.g., "vinc-tenant-id")
 * @param modelName - Model name (e.g., "HomeTemplate")
 * @returns Mongoose model bound to the tenant's connection
 */
export async function getModel<T extends mongoose.Document>(
  dbName: string,
  modelName: string,
): Promise<mongoose.Model<T>> {
  console.log(`[ModelRegistry] Getting model ${modelName} for db: ${dbName}`);
  const connection = await getPooledConnection(dbName);
  console.log(`[ModelRegistry] Connection db name: ${connection.name}`);

  // Return existing model if already registered
  if (connection.models[modelName]) {
    console.log(`[ModelRegistry] Using cached model ${modelName}`);
    return connection.models[modelName] as mongoose.Model<T>;
  }

  // Get schema and register model
  const schema = MODEL_SCHEMAS[modelName];
  if (!schema) {
    throw new Error(
      `Unknown model: ${modelName}. Add it to MODEL_SCHEMAS in model-registry.ts`,
    );
  }

  console.log(
    `[ModelRegistry] Registering new model ${modelName} on db: ${connection.name}`,
  );
  return connection.model<T>(modelName, schema);
}

/**
 * Get HomeTemplate model for a specific tenant database
 */
export async function getHomeTemplateModelForDb(dbName: string) {
  return getModel<HomeTemplateDocument>(dbName, 'HomeTemplate');
}

/**
 * Get ProductTemplate model for a specific tenant database
 */
export async function getProductTemplateModelForDb(dbName: string) {
  return getModel<ProductTemplateDocument>(dbName, 'ProductTemplate');
}

/**
 * Get ProductTemplateSimple model for a specific tenant database
 * Used by product-templates-simple.ts for product detail page blocks
 */
export async function getProductTemplateSimpleModelForDb(dbName: string) {
  return getModel<ProductTemplateSimpleDocument>(
    dbName,
    'ProductTemplateSimple',
  );
}
