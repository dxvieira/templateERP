
'use server';

/**
 * @fileOverview This file defines a Genkit flow for predicting potential delays in order fulfillment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema for the flow
const PredictDelayWarningsInputSchema = z.object({
  currentDate: z.string().describe('The current date in YYYY-MM-DD format.'),
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

// Define the prompt for predicting delay warnings
const predictDelayWarningsPrompt = ai.definePrompt({
  name: 'predictDelayWarningsPrompt',
  input: {schema: PredictDelayWarningsInputSchema},
  output: {schema: PredictDelayWarningsOutputSchema},
  prompt: `You are a production manager assistant that analyzes current production velocity and order details to predict potential delays for orders currently on track. Orders that are already delayed should not be included in the output.

The current production velocity is {{productionVelocity}} orders per day.

Here is the current date: {{currentDate}}

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
 */
export async function predictDelayWarnings(input: Omit<PredictDelayWarningsInput, 'currentDate'>): Promise<PredictDelayWarningsOutput> {
  const today = new Date().toISOString().split('T')[0];
  return predictDelayWarningsFlow({ ...input, currentDate: today });
}
