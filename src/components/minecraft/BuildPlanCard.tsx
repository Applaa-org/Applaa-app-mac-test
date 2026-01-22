/**
 * BuildPlanCard - Displays Minecraft build plan in chat
 * Shows structure, entities, actions before code generation
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Edit, Sparkles } from 'lucide-react';
import type { BuildPlan } from '@/types/MinecraftBehaviorSchema';

interface BuildPlanCardProps {
    plan: BuildPlan;
    onApprove?: () => void;
    onModify?: () => void;
}

export function BuildPlanCard({ plan, onApprove, onModify }: BuildPlanCardProps) {
    return (
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-teal-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-300">
                    <Sparkles className="w-5 h-5" />
                    {plan.title}
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Structure */}
                <div>
                    <h4 className="font-semibold text-white mb-2">📐 Structure</h4>
                    <p className="text-gray-300 text-sm">{plan.structure.description}</p>
                    {plan.structure.dimensions && (
                        <p className="text-gray-400 text-xs mt-1">Size: {plan.structure.dimensions}</p>
                    )}
                    {plan.structure.materials && plan.structure.materials.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {plan.structure.materials.map((material, i) => (
                                <span key={i} className="text-xs bg-gray-700/50 px-2 py-0.5 rounded">
                                    {material}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Entities */}
                {plan.entities && plan.entities.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-white mb-2">
                            🧟 Entities ({plan.entities.length})
                        </h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="text-left py-1 text-gray-400">Entity</th>
                                        <th className="text-left py-1 text-gray-400">Position</th>
                                        <th className="text-left py-1 text-gray-400">Role</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.entities.map((entity, i) => (
                                        <tr key={i} className="border-b border-gray-800">
                                            <td className="py-1 text-gray-300">{entity.type}</td>
                                            <td className="py-1 text-gray-400 text-xs">
                                                {entity.x}, {entity.y}, {entity.z}
                                            </td>
                                            <td className="py-1 text-gray-300">{entity.role || entity.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {plan.actions && plan.actions.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-white mb-2">
                            🎮 Action Buttons ({plan.actions.length})
                        </h4>
                        <ul className="space-y-1">
                            {plan.actions.map((action, i) => (
                                <li key={i} className="text-sm text-gray-300">
                                    <span className="font-medium">{action.label}</span>
                                    {action.description && (
                                        <span className="text-gray-400"> - {action.description}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Particles */}
                {plan.particles && plan.particles.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-white mb-2">✨ Particles</h4>
                        <ul className="space-y-1">
                            {plan.particles.map((particle, i) => (
                                <li key={i} className="text-sm text-gray-300">
                                    {particle.type} at ({particle.x}, {particle.y}, {particle.z})
                                    {particle.continuous && <span className="text-gray-400"> (continuous)</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Action Buttons */}
                {!plan.approved && (
                    <div className="flex gap-2 pt-2 border-t border-gray-700">
                        <Button
                            onClick={onApprove}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Accept Plan
                        </Button>
                        <Button
                            onClick={onModify}
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Modify
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default BuildPlanCard;
