import React, { useState } from 'react';
import { SAMPLE_PROJECTS, SampleProject } from '../../data/sampleProjects';

interface SampleHubProps {
    onLoadSample: (project: SampleProject) => void;
    isOpen: boolean;
    onClose: () => void;
    initialCategory?: string;
}

export function SampleHub({ onLoadSample, isOpen, onClose, initialCategory = 'All' }: SampleHubProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

    // Update selected category when initialCategory changes and hub opens
    React.useEffect(() => {
        if (isOpen) {
            setSelectedCategory(initialCategory);
        }
    }, [isOpen, initialCategory]);

    // Get unique categories
    const categories = ['All', ...Array.from(new Set(SAMPLE_PROJECTS.map(p => p.category)))];

    // Filter projects
    const filteredProjects = selectedCategory === 'All'
        ? SAMPLE_PROJECTS
        : SAMPLE_PROJECTS.filter(p => p.category === selectedCategory);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0, // Left side hub
            bottom: 0,
            width: '320px',
            backgroundColor: '#ffffff',
            boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
            zIndex: 1100, // Higher than editor
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8f9fa'
            }}>
                <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🚀 Applaa Hub
                </h2>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        color: '#666',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        padding: '0',
                        lineHeight: '1',
                        margin: '0'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                        e.currentTarget.style.color = '#333';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#666';
                    }}
                    title="Close Hub"
                >
                    ×
                </button>
            </div>

            {/* Category Filter */}
            <div style={{
                padding: '16px',
                display: 'flex',
                gap: '12px',
                overflowX: 'auto',
                borderBottom: '1px solid #eee'
            }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            padding: '12px 20px',
                            borderRadius: '20px',
                            border: '2px solid #ddd',
                            backgroundColor: selectedCategory === cat ? '#4CAF50' : 'white',
                            color: selectedCategory === cat ? 'white' : '#333',
                            fontSize: '14px',
                            fontWeight: selectedCategory === cat ? 'bold' : 'normal',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s',
                            minWidth: '80px'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedCategory !== cat) {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                e.currentTarget.style.borderColor = '#4CAF50';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedCategory !== cat) {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#ddd';
                            }
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Project List */}
            <div style={{
                padding: '16px',
                flex: 1,
                overflowY: 'auto'
            }}>
                {filteredProjects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => {
                            if (confirm(`Load "${project.title}"? This will discard current changes.`)) {
                                onLoadSample(project);
                                onClose();
                            }
                        }}
                        style={{
                            padding: '16px',
                            marginBottom: '16px',
                            border: '2px solid #eee',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                            e.currentTarget.style.borderColor = '#4CAF50';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                            e.currentTarget.style.borderColor = '#eee';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{project.title}</h3>
                            <span style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: getDifficultyColor(project.difficulty),
                                color: 'white',
                                fontWeight: 'bold'
                            }}>
                                {project.difficulty}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                            {project.description}
                        </p>
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#999', fontWeight: '500' }}>
                            📁 {project.category}
                        </div>
                    </div>
                ))}
            </div>
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
