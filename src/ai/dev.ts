
import { config } from 'dotenv';
config();

import '@/ai/flows/customer-risk-assessment.ts';
import '@/ai/flows/customer-parser-flow.ts';
import '@/ai/flows/daily-record-parser-flow.ts';
import '@/ai/flows/full