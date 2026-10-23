import { defineConfig } from "@adobe/aio-commerce-lib-app/config";

export default defineConfig({
  metadata: {
    id: "customer-save-logger",
    displayName: "Customer Save Logger",
    description: "Processes Adobe Commerce customer save events and logs the processed customer details for verification.",
    version: "1.0.0",
  },
  eventing: {
    commerce: [
      {
        provider: {
          label: "Commerce Customer Events",
          description: "Receives committed customer saves for processing.",
        },
        events: [
          {
            name: "observer.customer_save_commit_after",
            label: "Customer Save Committed",
            description: "Processes a customer after its save commits in Adobe Commerce.",
            fields: [
              { name: "id" },
              { name: "email" },
              { name: "firstname" },
              { name: "lastname" },
            ],
            runtimeActions: ["my-app/process-customer"],
          },
        ],
      },
    ],
  },
});
