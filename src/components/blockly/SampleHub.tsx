import React, { useState } from 'react';
import { SAMPLE_PROJECTS, SampleProject } from '../../data/sampleProjects';

interface SampleHubProps {
    onLoadSample: (project: SampleProject) => void;
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
}

const HUB_LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'] as const;
type HubLevel = (typeof HUB_LEVELS)[number];

export function SampleHub({ onLoadSample, isOpen, onClose, initialCategory = 'All' }: SampleHubProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
    const [selectedLevel, setSelectedLevel] = useState<HubLevel>('All');
    const [confirmProject, setConfirmProject] = useState<SampleProject | null>(null);

    // Update selected category when initialCategory changes and hub opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);

    // Get unique categories
    const categories = ['All', ...Array.from(new Set(SAMPLE_PROJECTS.map(p => p.category)))];

    // Filter by category and level
    const filteredProjects = SAMPLE_PROJECTS.filter(p => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
        if (selectedLevel !== 'All' && p.difficulty !== selectedLevel) return false;
        return true;
    });

    const handleProjectClick = (project: SampleProject) => {
        setConfirmProject(project);
    };

    const handleConfirmLoad = () => {
        if (confirmProject) {
            onLoadSample(confirmProject);
            setConfirmProject(null);
            onClose();
        }
    };

    const handleCancelLoad = () => {
        setConfirmProject(null);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '340px',
            maxWidth: '90vw',
            backgroundColor: '#fafafa',
            boxShadow: '2px 0 16px rgba(0,0,0,0.12)',
            zIndex: 1100,
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'white'
            }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🚀 Project Hub
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Try samples by category and level</p>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#6b7280',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        padding: 0,
                        lineHeight: 1
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                        e.currentTarget.style.color = '#111';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                    }}
                    title="Close Hub"
                >
                    ×
                </button>
            </div>

            {/* Level filter: Beginner / Intermediate / Advanced */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: 'white'
            }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Level</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {HUB_LEVELS.map(level => (
                        <button
                            key={level}
                            onClick={() => setSelectedLevel(level)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '20px',
                                border: '2px solid ' + (selectedLevel === level ? '#6366f1' : '#e5e7eb'),
                                backgroundColor: selectedLevel === level ? '#6366f1' : '#f9fafb',
                                color: selectedLevel === level ? 'white' : '#374151',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category tabs */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                alignItems: 'center',
                backgroundColor: 'white',
                flexShrink: 0
            }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '20px',
                            border: '1px solid ' + (selectedCategory === cat ? '#6366f1' : '#e5e7eb'),
                            backgroundColor: selectedCategory === cat ? '#eef2ff' : '#f9fafb',
                            color: selectedCategory === cat ? '#4f46e5' : '#4b5563',
                            fontSize: '13px',
                            fontWeight: selectedCategory === cat ? '600' : '500',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Project list */}
            <div style={{
                padding: '16px',
                flex: 1,
                overflowY: 'auto'
            }}>
                {filteredProjects.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af', fontSize: '14px' }}>
                        No projects match this filter. Try another level or category.
                    </div>
                ) : (
                    filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => handleProjectClick(project)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && handleProjectClick(project)}
                            style={{
                                padding: '14px',
                                marginBottom: '12px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827', lineHeight: '1.3' }}>
                                    {project.title}
                                </h3>
                                <span style={{
                                    fontSize: '10px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: getDifficultyColor(project.difficulty),
                                    color: 'white',
                                    fontWeight: '600',
                                    flexShrink: 0
                                }}>
                                    {project.difficulty}
                                </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: '1.45' }}>
                                {project.description}
                            </p>
                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af' }}>
                                {project.category}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* In-app confirm dialog (replaces browser confirm) */}
            {confirmProject && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        zIndex: 1200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={handleCancelLoad}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '360px',
                            width: '100%',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                            Load this project?
                        </h3>
                        <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                            <strong>{confirmProject.title}</strong>
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
                            Your current blocks will be replaced. You can always open the Hub again to try another.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleCancelLoad}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: '1px solid #e5e7eb',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmLoad}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    backgroundColor: '#6366f1',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Load project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function getDifficultyColor(diff: string) {
    switch (diff) {
        case 'Beginner': return '#4CAF50';
        case 'Intermediate': return '#FF9800';
        case 'Advanced': return '#F44336';
        default: return '#999';
    }
}
