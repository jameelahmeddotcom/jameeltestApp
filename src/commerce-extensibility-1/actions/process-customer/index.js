const requiredFields = ['email', 'firstname', 'lastname'];

/** @param {Record<string, unknown>} params */
export async function main(params) {
  try {
    const value = /** @type {Record<string, unknown> | undefined} */ (/** @type {any} */ (params)?.data?.value);
    const customer = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const missingFields = requiredFields.filter((field) =>
      typeof customer[field] !== 'string' || !customer[field].trim()
    );

    if (missingFields.length > 0) {
      console.warn({ operation: 'process-customer', reason: 'validation_failed', missingFields, processed: false });
      console.log('Processed: false');
      return { statusCode: 400, body: { processed: false, error: 'validation_failed', missingFields } };
    }

    const id = customer.id;
    const customerId = (typeof id === 'number' || (typeof id === 'string' && id.trim() !== '')) &&
      Number.isSafeInteger(Number(id)) && Number(id) >= 0 ? Number(id) : null;
    const processedCustomer = {
      customerId,
      fullName: `${/** @type {string} */ (customer.firstname).trim()} ${/** @type {string} */ (customer.lastname).trim()}`,
      email: /** @type {string} */ (customer.email).trim(),
      processed: true,
    };

    console.log('Commerce customer event received');
    console.log(`Customer ID: ${processedCustomer.customerId}`);
    console.log(`Full Name: ${processedCustomer.fullName}`);
    console.log(`Email: ${processedCustomer.email}`);
    console.log('Processed: true');
    return { statusCode: 200, body: processedCustomer };
  } catch (error) {
    console.error({ operation: 'process-customer', reason: 'processing_failure', errorType: error instanceof Error ? error.name : 'UnknownError', processed: false });
    return { statusCode: 500, body: { processed: false, error: 'processing_failure' } };
  }
}
