// src/ai/flows/predictive-delay-warnings.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting potential delays in order fulfillment.
 *
 * The flow takes in current production metrics and order details to predict potential delays for orders currently on track.
 * It exports:
 *   - `predictDelayWarnings`: The main function to trigger the delay prediction flow.
 *   - `PredictDelayWarningsInput`: The TypeScript type definition for the input to the `predictDelayWarnings` function.
 *   - `PredictDelayWarningsOutput`: The TypeScript type definition for the output of the `predictDelayWarnings` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const PredictDelayWarningsInputSchema = z.object({
  productionVelocity: z.number().describe('The current production velocity, measured in orders completed per day.'),
  orders: z.array(
    z.object({
      id: z.string().describe('The unique identifier of the order.'),
      client: z.string().describe('The name of the client.'),
      status: z.string().describe('The current status of the order (e.g., art, printing, finishing).'),
      deliveryDate: z.string().describe('The expected delivery date of the order (YYYY-MM-DD).'),
      value: z.number().describe('The value of the order.'),
    })
  ).describe('A list of orders currently in production.'),
});
export type PredictDelayWarningsInput = z.infer<typeof PredictDelayWarningsInputSchema>;

// Define the output schema for the flow
const PredictDelayWarningsOutputSchema = z.object({
  delayedOrders: z.array(
    z.object({
      id: z.string().describe('The unique identifier of the order.'),
      reason: z.string().describe('The predicted reason for the delay.'),
    })
  ).describe('A list of orders that are predicted to be delayed, along with the reason for the delay.'),
});
export type PredictDelayWarningsOutput = z.infer<typeof PredictDelayWarningsOutputSchema>;

// Define the tool to check the current date.
const checkCurrentDate = ai.defineTool({
  name: 'checkCurrentDate',
  description: 'Returns the current date in YYYY-MM-DD format.',
  inputSchema: z.void(),
  outputSchema: z.string(),
}, async () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Define the prompt for predicting delay warnings
const predictDelayWarningsPrompt = ai.definePrompt({
  name: 'predictDelayWarningsPrompt',
  input: {schema: PredictDelayWarningsInputSchema},
  output: {schema: PredictDelayWarningsOutputSchema},
  tools: [checkCurrentDate],
  prompt: `You are a production manager assistant that analyzes current production velocity and order details to predict potential delays for orders currently on track. Orders that are already delayed should not be included in the output.

The current production velocity is {{productionVelocity}} orders per day.

Here is the current date, according to the checkCurrentDate tool: {{ await checkCurrentDate }}

Analyze the following orders:

{{#each orders}}
  - Order ID: {{id}}
    - Client: {{client}}
    - Status: {{status}}
    - Delivery Date: {{deliveryDate}}
    - Value: {{value}}
{{/each}}

Based on the production velocity and the order details, identify any orders that are likely to be delayed. Include only orders that are currently on track in the prediction. Provide a reason for each predicted delay.

Output a JSON array of delayed orders with their IDs and reasons for the delay. If no orders are predicted to be delayed, return an empty array.

Format your output as a JSON object conforming to the following schema:
${JSON.stringify(PredictDelayWarningsOutputSchema.shape, null, 2)}`,
});

// Define the Genkit flow
const predictDelayWarningsFlow = ai.defineFlow(
  {
    name: 'predictDelayWarningsFlow',
    inputSchema: PredictDelayWarningsInputSchema,
    outputSchema: PredictDelayWarningsOutputSchema,
  },
  async input => {
    const {output} = await predictDelayWarningsPrompt(input);
    return output!;
  }
);

/**
 * Predicts potential delays for orders currently on track.
 * @param input - The input data for the prediction.
 * @returns A promise that resolves to the prediction result.
 */
export async function predictDelayWarnings(input: PredictDelayWarningsInput): Promise<PredictDelayWarningsOutput> {
  return predictDelayWarningsFlow(input);
}
