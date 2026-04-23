import { app } from '@azure/functions';
import { TableClient, AzureNamedKeyCredential, odata } from '@azure/data-tables';

const TABLE_NAME      = process.env.TABLE_NAME ?? 'capacityplan';
const CONN_STRING     = process.env.STORAGE_CONNECTION_STRING;
const PARTITION_KEY   = 'main';

function getClient() {
  return TableClient.fromConnectionString(CONN_STRING, TABLE_NAME);
}

/* ── GET /api/records ── return all rows for the shared plan ── */
app.http('records-get', {
  methods: ['GET'],
  route: 'records',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const client = getClient();
      await client.createTable().catch(() => {}); // no-op if table exists

      const rows = [];
      for await (const entity of client.listEntities({ queryOptions: { filter: odata`PartitionKey eq ${PARTITION_KEY}` } })) {
        const [type, ...rest] = entity.rowKey.split(':');
        rows.push({ type, id: rest.join(':'), data: entity.data });
      }

      return { status: 200, jsonBody: rows };
    } catch (err) {
      context.error('GET /api/records failed:', err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

/* ── PUT /api/records/{type}/{id} ── upsert one record ── */
app.http('records-put', {
  methods: ['PUT'],
  route: 'records/{type}/{id}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const { type, id } = request.params;
    try {
      const body = await request.json();
      const client = getClient();
      await client.createTable().catch(() => {});

      await client.upsertEntity({
        partitionKey: PARTITION_KEY,
        rowKey:       `${type}:${id}`,
        data:         JSON.stringify(body.data),
        updatedAt:    new Date().toISOString(),
        updatedBy:    body.updatedBy ?? 'unknown',
      }, 'Replace');

      return { status: 204 };
    } catch (err) {
      context.error(`PUT /api/records/${type}/${id} failed:`, err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});

/* ── DELETE /api/records/{type}/{id} ── delete one record ── */
app.http('records-delete', {
  methods: ['DELETE'],
  route: 'records/{type}/{id}',
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const { type, id } = request.params;
    try {
      const client = getClient();
      await client.deleteEntity(PARTITION_KEY, `${type}:${id}`);
      return { status: 204 };
    } catch (err) {
      if (err.statusCode === 404) return { status: 204 }; // idempotent
      context.error(`DELETE /api/records/${type}/${id} failed:`, err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
