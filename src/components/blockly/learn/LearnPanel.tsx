import React, { useState, useEffect } from 'react';
import { LessonManager, Lesson, LessonStep } from '@/managers/LessonManager';
import { CelebrationManager } from '@/managers/CelebrationManager';
import { SAMPLE_PROJECTS, SampleProject } from '@/data/sampleProjects';

interface LearnPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onHighlightCategory?: (categoryId: string | null) => void;
    customLesson?: Lesson;
    /** Load a template into the workspace so kids can copy and build (math, art, science). */
    onUseTemplate?: (project: SampleProject) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
    'category_text': 'Text',
    'category_loops': 'Loops',
    'category_logic': 'Logic',
    'category_math': 'Math',
    'category_variables': 'Variables',
    'category_functions': 'Functions',
    'category_lists': 'Lists',
    'music': 'Music & Art',
    'game': 'Game Mechanics',
    'category_first_code': 'Start Here',
    'category_story': 'Story Time',
    'category_music': 'Music & Art',
    'category_game': 'Arcade Maker',
    // Fallback
    'start': 'Start',
    'events': 'Events'
};

const getCategoryName = (id: string): string => {
    return CATEGORY_NAMES[id] || id;
};

// Icons and display labels for levels (Beginner / Intermediate / Expert)
const DIFF_ICONS = {
    beginner: '🟢',
    intermediate: '🟡',
    advanced: '🔴'
};
const LEVEL_LABELS: Record<string, string> = {
    all: 'All',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Expert'
};

const EXAMPLE_CATEGORIES: SampleProject['category'][] = ['Math', 'Art', 'Science', 'Music', 'Games', 'Tutorials', 'Logic'];

export const LearnPanel: React.FC<LearnPanelProps> = ({ isOpen, onClose, onHighlightCategory, customLesson, onUseTemplate }) => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Right panel tab: Examples (templates to copy) first for under-10s, then Lessons
    const [rightTab, setRightTab] = useState<'examples' | 'lessons'>('examples');

    // Success feedback when they click "Use this template" — clear and interactive
    const [justLoadedTitle, setJustLoadedTitle] = useState<string | null>(null);

    // Filter State — default to Beginner so new users see easiest lessons first
    const [activeDifficulty, setActiveDifficulty] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('beginner');
    const [activeTag, setActiveTag] = useState<string>('all');

    useEffect(() => {
        setLessons(LessonManager.getLessons());
    }, []);

    // React to custom lesson only when coming from Hub (guide). Examples tab uses onUseTemplate only — no lesson.
    useEffect(() => {
        if (customLesson && isOpen) {
            setActiveLesson(customLesson);
            setCurrentStepIndex(0);
            setRightTab('lessons');
        }
    }, [customLesson, isOpen]);

    // Clear "Loaded!" message after a few seconds
    useEffect(() => {
        if (!justLoadedTitle) return;
        const t = setTimeout(() => setJustLoadedTitle(null), 5000);
        return () => clearTimeout(t);
    }, [justLoadedTitle]);

    // Trigger highlighting when step changes
    useEffect(() => {
        if (!isOpen) return;

        if (activeLesson) {
            const step = activeLesson.steps[currentStepIndex];
            if (step.toolboxHighlight && onHighlightCategory) {
                onHighlightCategory(step.toolboxHighlight);
            } else if (onHighlightCategory) {
                onHighlightCategory(null);
            }
        } else if (onHighlightCategory) {
            onHighlightCategory(null);
        }
    }, [activeLesson, currentStepIndex, onHighlightCategory]);

    const handleStartLesson = (lesson: Lesson) => {
        setActiveLesson(lesson);
        setCurrentStepIndex(0);
    };

    const handleNextStep = () => {
        if (activeLesson && currentStepIndex < activeLesson.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            CelebrationManager.playSound('click');
        } else {
            CelebrationManager.celebrateSuccess();
            setActiveLesson(null);
        }
    };

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    // Filter Logic
    const filteredLessons = lessons.filter(l => {
        if (activeDifficulty !== 'all' && l.difficulty !== activeDifficulty) return false;
        if (activeTag !== 'all' && !l.tags?.includes(activeTag)) return false;
        return true;
    });

    // Unique tags for chips
    const allTags = Array.from(new Set(lessons.flatMap(l => l.tags || []))).sort();

    if (!isOpen) return null;

    // --- Render List View (Examples or Lessons tab) ---
    if (!activeLesson) {
        const panelStyle = {
            position: 'absolute' as const,
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column' as const,
            zIndex: 90
        };

        return (
            <div style={panelStyle}>
                {/* Header: Try & Learn — for under-10s: examples (copy & build) + step-by-step lessons */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#111827', fontWeight: '800' }}>✨ Try & Learn</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>Copy a template and build something cool (math, art, science)</p>
                        </div>
                        <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', color: '#9CA3AF', padding: '4px' }}>✕</button>
                    </div>
                    {/* Tabs: Examples (templates) | Lessons */}
                    <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '10px' }}>
                        <button
                            onClick={() => setRightTab('examples')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: rightTab === 'examples' ? 'white' : 'transparent',
                                color: rightTab === 'examples' ? '#111827' : '#6b7280',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: rightTab === 'examples' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            📋 Examples
                        </button>
                        <button
                            onClick={() => setRightTab('lessons')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: rightTab === 'lessons' ? 'white' : 'transparent',
                                color: rightTab === 'lessons' ? '#111827' : '#6b7280',
                                fontWeight: '600',
                                fontSize: '14px',
                                cursor: 'pointer',
                                boxShadow: rightTab === 'lessons' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            🎓 Lessons
                        </button>
                    </div>
                </div>

                {rightTab === 'examples' ? (
                    /* Examples: templates by category — use one and build/improve. No lessons auto-open. */
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f9fafb' }}>
                        {justLoadedTitle && (
                            <div
                                style={{
                                    marginBottom: '16px',
                                    padding: '14px',
                                    borderRadius: '12px',
                                    backgroundColor: '#dcfce7',
                                    border: '1px solid #86efac',
                                    color: '#166534',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}
                            >
                                ✓ Loaded &quot;{justLoadedTitle}&quot;! Build in the workspace → change blocks and run your code.
                            </div>
                        )}
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280' }}>
                            Pick a project. Click &quot;Use this template&quot; — it loads in the middle. Then change it and make it yours!
                        </p>
                        {EXAMPLE_CATEGORIES.map(cat => {
                            const projects = SAMPLE_PROJECTS.filter(p => p.category === cat);
                            if (projects.length === 0) return null;
                            return (
                                <div key={cat} style={{ marginBottom: '20px' }}>
                                    <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#374151' }}>{cat}</h3>
                                    {projects.map(project => (
                                        <div
                                            key={project.id}
                                            style={{
                                                padding: '14px',
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                                marginBottom: '10px',
                                                backgroundColor: 'white',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>{project.title}</h4>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: project.difficulty === 'Beginner' ? '#dcfce7' : project.difficulty === 'Intermediate' ? '#fef3c7' : '#fee2e2',
                                                    color: project.difficulty === 'Beginner' ? '#166534' : project.difficulty === 'Intermediate' ? '#92400e' : '#991b1b',
                                                    fontWeight: '600'
                                                }}>
                                                    {project.difficulty}
                                                </span>
                                            </div>
                                            <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6b7280', lineHeight: '1.45' }}>{project.description}</p>
                                            {onUseTemplate && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUseTemplate(project);
                                                        setJustLoadedTitle(project.title);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        backgroundColor: '#4f46e5',
                                                        color: 'white',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Use this template
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Lessons: step-by-step by level */
                    <>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#FAFAFA', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', padding: '4px', backgroundColor: '#E5E7EB', borderRadius: '8px' }}>
                                {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setActiveDifficulty(d)}
                                        style={{
                                            flex: 1,
                                            padding: '8px 6px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: activeDifficulty === d ? 'white' : 'transparent',
                                            color: activeDifficulty === d ? '#111' : '#6B7280',
                                            boxShadow: activeDifficulty === d ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            fontSize: '11px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {LEVEL_LABELS[d]}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => setActiveTag('all')}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: '16px',
                                        border: activeTag === 'all' ? '1px solid #4F46E5' : '1px solid #E5E7EB',
                                        backgroundColor: activeTag === 'all' ? '#EEF2FF' : 'white',
                                        color: activeTag === 'all' ? '#4F46E5' : '#4B5563',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        whiteSpace: 'nowrap',
                                        fontWeight: '500'
                                    }}
                                >
                                    All Topics
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(tag)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '16px',
                                            border: activeTag === tag ? '1px solid #4F46E5' : '1px solid #E5E7EB',
                                            backgroundColor: activeTag === tag ? '#EEF2FF' : 'white',
                                            color: activeTag === tag ? '#4F46E5' : '#4B5563',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#F9FAFB' }}>
                            {filteredLessons.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🕵️</div>
                                    <div>No lessons found for this filter.</div>
                                </div>
                            ) : (
                                filteredLessons.map(lesson => (
                                    <div
                                        key={lesson.id}
                                        onClick={() => handleStartLesson(lesson)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            border: '1px solid #E5E7EB',
                                            marginBottom: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            backgroundColor: 'white',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                        }}
                                        className="hover:shadow-md hover:border-indigo-300 hover:transform hover:-translate-y-0.5"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'flex-start' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1F2937' }}>
                                                {lesson.title}
                                            </h3>
                                            <span style={{ fontSize: '14px' }} title={LEVEL_LABELS[lesson.difficulty]}>{DIFF_ICONS[lesson.difficulty]}</span>
                                        </div>
                                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6B7280', lineHeight: '1.5' }}>
                                            {lesson.description}
                                        </p>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {lesson.tags?.map(tag => (
                                                <span key={tag} style={{
                                                    fontSize: '10px',
                                                    padding: '2px 8px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#F3F4F6',
                                                    color: '#4B5563',
                                                    fontWeight: '600',
                                                    border: '1px solid #E5E7EB'
                                                }}>
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // --- Render Lesson Step View (Unchanged logic, just style tweaks) ---
    const step = activeLesson.steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / activeLesson.steps.length) * 100;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '380px',
            backgroundColor: 'white',
            borderLeft: '1px solid #e5e7eb',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 90
        }}>
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#F0F9FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <button
                        onClick={() => setActiveLesson(null)}
                        style={{ border: 'none', background: 'none', fontSize: '13px', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}
                    >
                        ← Back to Lessons
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563EB', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '10px' }}>
                        Step {currentStepIndex + 1}/{activeLesson.steps.length}
                    </span>
                </div>

                {/* Progress Bar */}
                <div style={{ height: '8px', backgroundColor: '#DBEAFE', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, backgroundColor: '#3B82F6', transition: 'width 0.4s ease-out', borderRadius: '4px' }} />
                </div>

                <h3 style={{ margin: '16px 0 0', fontSize: '18px', color: '#1E3A8A', fontWeight: '700' }}>{activeLesson.title}</h3>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ fontSize: '56px', marginBottom: '24px', textAlign: 'center', animation: 'bounce 2s infinite' }}>
                    👇
                </div>

                <h4 style={{ fontSize: '20px', margin: '0 0 16px', color: '#111827', fontWeight: '700', lineHeight: '1.3' }}>
                    {step.instruction}
                </h4>

                <p style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}>
                    {step.description}
                </p>

                {step.image && (
                    <div style={{ margin: '24px 0', textAlign: 'center', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '12px', border: '1px solid #F3F4F6' }}>
                        <img
                            src={step.image}
                            alt="Block example"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '140px',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                )}

                {step.toolboxHighlight && (
                    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '12px', border: '1px solid #FEF3C7', fontSize: '13px', color: '#92400E', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '18px' }}>💡</span>
                        <div>
                            <div style={{ fontWeight: '700', marginBottom: '4px' }}>Hint</div>
                            Look in the <strong>{getCategoryName(step.toolboxHighlight)}</strong> category!
                        </div>
                    </div>
                )}
            </div>

            {/* Footer with Big Buttons */}
            <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', backgroundColor: 'white' }}>
                <button
                    onClick={handlePrevStep}
                    disabled={currentStepIndex === 0}
                    style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        backgroundColor: currentStepIndex === 0 ? '#F3F4F6' : 'white',
                        color: currentStepIndex === 0 ? '#9CA3AF' : '#374151',
                        cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: '600'
                    }}
                >
                    Previous
                </button>
                <button
                    onClick={handleNextStep}
                    style={{
                        flex: 2,
                        padding: '14px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                        transition: 'transform 0.1s'
                    }}
                >
                    {currentStepIndex === activeLesson.steps.length - 1 ? 'Finish! 🎉' : 'Next Step →'}
                </button>
            </div>
        </div>
    );
};
