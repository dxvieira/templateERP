
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
  prompt: `You are a production manager assistant that analyzes current production velocity and order details to predict potential delays.

Current production velocity: {{{productionVelocity}}} orders/day.
Today's date: {{{currentDate}}}.

Orders to analyze:
{{#each orders}}
- OS #{{{id}}} | Client: {{{client}}} | Status: {{{status}}} | Deadline: {{{deliveryDate}}}
{{/each}}

Identify orders likely to miss their deadline based on the status and velocity.
Output a JSON array of predicted delayed orders with reasons.`,
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
