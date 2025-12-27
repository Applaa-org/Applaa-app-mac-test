import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root';
import { PromptToProjectScreen } from '@/components/creator/PromptToProjectScreen';

import { z } from 'zod';

const promptSearchSchema = z.object({
    type: z.enum(['arcade', 'microbit', 'minecraft', 'blockly']).optional(),
});

export const promptToProjectRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/create-with-prompt',
    validateSearch: (search) => promptSearchSchema.parse(search),
    component: PromptToProjectScreen,
});
