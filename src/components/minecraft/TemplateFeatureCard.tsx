/**
 * TemplateFeatureCard - Shows template features when loaded from Template Hub
 * Displays in chat as first message
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, Zap, Users } from 'lucide-react';

interface TemplateFeature {
    structure: string;
    entities?: string[];
    actions?: string[];
    size?: string;
}

interface TemplateFeatureCardProps {
    templateName: string;
    features: TemplateFeature;
}

export function TemplateFeatureCard({ templateName, features }: TemplateFeatureCardProps) {
    return (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-teal-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-300">
                    <Box className="w-5 h-5" />
                    {templateName} Template Loaded
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Structure */}
                <div>
                    <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
                        <span>📐</span> Structure
                    </h4>
                    <p className="text-gray-300 text-sm">{features.structure}</p>
                    {features.size && (
                        <p className="text-gray-400 text-xs mt-1">Size: {features.size}</p>
                    )}
                </div>

                {/* Entities */}
                {features.entities && features.entities.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Entities ({features.entities.length})
                        </h4>
                        <ul className="space-y-0.5">
                            {features.entities.map((entity, i) => (
                                <li key={i} className="text-gray-300 text-sm">• {entity}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Actions */}
                {features.actions && features.actions.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-white text-sm mb-1 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Actions ({features.actions.length})
                        </h4>
                        <ul className="space-y-0.5">
                            {features.actions.map((action, i) => (
                                <li key={i} className="text-gray-300 text-sm">• {action}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Helper text */}
                <div className="pt-2 border-t border-gray-700">
                    <p className="text-gray-400 text-xs">
                        💬 Ask me to modify this template! Try: "Add more guards" or "Make it bigger"
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}

export default TemplateFeatureCard;
